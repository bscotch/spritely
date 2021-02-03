import {
  listFilesByExtensionSync,
  listFoldersSync,
  listPathsSync,
  oneline,
  removeEmptyDirsSync,
} from "@bscotch/utility";
import commander from "commander";
import { Spritely } from "../lib/Spritely";
import path from "path";
import {fsRetry as fs} from "../lib/utility";
import { assert } from "../lib/errors";
import chokidar from "chokidar";

export interface SpritelyCliGeneralOptions {
  folder: string,
  recursive?: boolean,
  allowSubimageSizeMismatch?: boolean,
  move?: string,
  rootImagesAreSprites?: boolean,
  purgeTopLevelFolders?: boolean,
  ifMatch?: string,
  deleteSource?: boolean,
  gradientMapsFile?: string,
  watch?: boolean,
}

export const cliOptions = {
  folder: [
    "-f --folder <path>",
    oneline`
      Path to folder of subimages. Only
      immediate PNG children of each folder are treated as subimages.
      Defaults to the current working directory.`,
    process.cwd()
  ],
  recursive: [
    "-r --recursive",
    oneline`
      Treat --folder, and all folders inside --folder (recursively), as sprites.
      USE WITH CAUTION!
      Each folder with immediate PNG children is treated as a sprite,
      with those children as its subimages.`
  ],
  watch: [
    "-w --watch",
    oneline`
      Watch the source path for the the appearance of, or changes to,
      PNG files. When those events occur, re-run the fixers.
    `
  ],
  mismatch: [
    "-a --allow-subimage-size-mismatch",
    oneline`
      By default it is required that all subimages of a sprite are
      supposed to have identical dimensions. You can optionally bypass
      this requirement.`
  ],
  move: [
    "-m --move <path>",
    oneline`
      Move images to a different folder after modification.
      Useful for pipelines that use presence/absence
      of images as signals. Maintains relative paths.
      Deletes any existing subimages before copying the new
      ones over.`
  ],
  purge: [
    "--purge-top-level-folders",
    oneline`
      Delete top-level folders (immediate children of --folder)
      prior to moving changed images.`
  ],
  /** Specify root images are sprites */
  rootImages: [
    "-s --root-images-are-sprites",
    oneline`
      Prior to correction, move any immediate PNG children of
      --folder into folders with the same name as those images.
      This allows root-level images to be treated as individual
      sprites.`
  ],
  match:[
    "-p --if-match",
    oneline`
      Only perform the tasks on sprites whose top-level folder
      (relative to --folder) matches this pattern. Case-sensitive,
      converted to a regex pattern using JavaScript's 'new RegExp()'.`
  ]
} as const;

export function addGeneralOptions(cli: typeof commander){
  cli.option(...cliOptions.folder)
    .option(...cliOptions.recursive)
    .option(...cliOptions.watch)
    .option(...cliOptions.mismatch)
    .option(...cliOptions.move)
    .option(...cliOptions.purge)
    .option(...cliOptions.rootImages)
    .option(...cliOptions.match);
  return cli;
}

function getSpriteDirs(folder:string,recursive?:boolean){
  const folders = recursive
    ? [folder,...listFoldersSync(folder,recursive)]
    : [folder];
  folders.reverse();
  return folders;
}

const methodOverrideTagNames = {
  c: 'crop',
  crop: 'crop',
  b: 'bleed',
  bleed: 'bleed'
} as const;

type SpritelyMethodOverrideTag = keyof typeof methodOverrideTagNames;
type SpritelyMethodOverrideName = typeof methodOverrideTagNames[SpritelyMethodOverrideTag];

/**
 * The sprite name may include suffixes to indicate overrides
 * for any CLI-applied adjustments. These can force application
 * of methods as well as prevent them. Suffixes being with `--`
 * and are chained together without separators. Valid suffices:
 * + `--c` or `--crop`: force cropping
 * + `--nc` or `--no-crop`: block cropping
 * + `--b` or `--bleed`: force bleeding
 * + `--nb` or `--no-bleed`: block bleeding
 */
function getMethodOverridesFromName(name:string){
  // Pull off all the method suffixes
  const overrides = {
    name,
    add: [] as SpritelyMethodOverrideName[],
    remove: [] as SpritelyMethodOverrideName[],
  };
  let bareName = name; // suffixes removed
  const suffixRegex = /^(.*)(--(n?[cb]|(no-)?(crop|bleed)))$/;
  while(bareName.match(suffixRegex)){
    const parts = bareName.match(suffixRegex);
    if(!parts){
      break;
    }
    bareName = parts[1];
    const overrideType = parts[2].match(/^--n/) ? "remove" : "add";
    const methodNickname = parts[2].replace(/--(no-|n)?/,'') as SpritelyMethodOverrideTag;
    const method = methodOverrideTagNames[methodNickname];
    assert(method,`${methodNickname} is not a valid method suffix.`);
    overrides[overrideType].push(method);
  }
  overrides.name = bareName;
  return overrides;
}

type SpritelyFixMethod = 'crop'|'bleed'|'applyGradientMaps';

async function fixSpriteDir(method:SpritelyFixMethod|SpritelyFixMethod[],spriteDir:string,options:SpritelyCliGeneralOptions){
  try{
    const spriteOptions = {
      spriteDirectory: spriteDir,
      allowSubimageSizeMismatch: options.allowSubimageSizeMismatch,
      gradientMapsFile: options.gradientMapsFile
    };
    let sprite = new Spritely(spriteOptions);
    const methodOverrides = getMethodOverridesFromName(sprite.name);
    // Combine methods provided by the CLI and by the name suffixes,
    // and then filter out those blocked by name suffixes.
    const methods = [...new Set(
      (typeof method == 'string' ? [method] : method)
        .concat(methodOverrides.add)
        .filter(method=>!methodOverrides.remove.includes(method as SpritelyMethodOverrideName))
    )];
    // If the sprite uses suffixes, should nuke that folder and replace
    // it with one that doesn't have the suffixes.
    if(sprite.name != methodOverrides.name){
      const spriteParent = path.dirname(sprite.path);
      const newSpritePath = path.join(spriteParent,methodOverrides.name);
      await fs.remove(newSpritePath); // make sure the dest gets clobbered
      await sprite.copy(spriteParent,{name:methodOverrides.name});
      await fs.remove(sprite.path);
      spriteDir = newSpritePath;
      sprite = new Spritely({...spriteOptions,spriteDirectory:spriteDir});
    }

    for(const spriteMethod of methods){
      // @ts-expect-error
      await sprite[spriteMethod](spriteMethod=='applyGradientMaps' ? options.deleteSource : undefined);
    }
    if(options.move){
      const movedSpritePath = path.join(options.move, path.relative(options.folder,spriteDir));
      // Clear any existing images in the target directory
      try{
        const waits = listFilesByExtensionSync(movedSpritePath,'png')
          .map(existingSubimage=>fs.remove(existingSubimage));
        await Promise.allSettled(waits);
      }
      catch{}
      await sprite.move(path.dirname(movedSpritePath));
    }
    console.log(`Cleaned sprite "${spriteDir}".`);
  }
  catch(err){
    if(!options.recursive || err.message != 'No subimages found'){
      console.log(`Sprite clean failed for "${spriteDir}".`,err?.message);
      console.log(err);
    }
  }
}

async function fixSpriteDirs(method:SpritelyFixMethod|SpritelyFixMethod[],spriteDirs:string[],options: SpritelyCliGeneralOptions){
  for(const spriteDir of spriteDirs){
    await fixSpriteDir(method,spriteDir,options);
  }
}

function rootDir(fullpath:string,relativeTo='.'){
  return path.relative(relativeTo,fullpath).split(/[\\/]/g)[0];
}

async function fixSprites (method:SpritelyFixMethod|SpritelyFixMethod[],options: SpritelyCliGeneralOptions){
  if(options.rootImagesAreSprites){
    // Find any root-level PNGs and move them into a folder by the same name
    const rootImages = listFilesByExtensionSync(options.folder,'png',false);
    for(const rootImage of rootImages){
      const name = path.parse(rootImage).name;
      const newFolder = path.join(options.folder,name);
      const newPath = path.join(newFolder,`${name}.png`);
      await fs.ensureDir(newFolder);
      await fs.move(rootImage,newPath);
    }
  }
  const ifMatch = options.ifMatch ? new RegExp(options.ifMatch) : null;
  const spriteDirs = getSpriteDirs(options.folder,options.recursive)
    .filter(spriteDir=>{
      if(options.purgeTopLevelFolders || options.ifMatch){
        // Then make sure everything *has* a top-level folder
        const topLevelDir = rootDir(spriteDir,options.folder);
        if(!topLevelDir){ return false; }
        if(!ifMatch){ return true; }
        return topLevelDir.match(ifMatch);
      }
      return true;
    });
  if(options.purgeTopLevelFolders && options.move){
    const topLevelDirs = [
      ...new Set(spriteDirs.map(spriteDir=>rootDir(spriteDir,options.folder)))
    ].filter(x=>x);
    for(const topLevelDir of topLevelDirs){
      const moveDir = path.join(options.move,topLevelDir);
      const exists = await fs.pathExists(moveDir);
      if(! exists ){
        continue;
      }
      const childrenAreImagesOrFoldersChecks = listPathsSync(moveDir,true)
        .map(async child=>child.endsWith('.png') || (await fs.stat(child)).isDirectory());
      const childrenAreImagesOrFolders = (await Promise.all(childrenAreImagesOrFoldersChecks))
        .every(yep=>yep);
      if(!childrenAreImagesOrFolders){
        continue;
      }
      await fs.emptyDir(moveDir);
      await fs.rmdir(moveDir);
    }
  }
  await fixSpriteDirs(method,spriteDirs,options);
  if(options.move){
    await removeEmptyDirsSync(options.folder,{excludeRoot:true});
  }
}

/** Prepare and run sprite fixers, include setting up watchers if needed. */
export async function runFixer(method:SpritelyFixMethod|SpritelyFixMethod[],options: SpritelyCliGeneralOptions){
  let debounceTimeout:NodeJS.Timeout|null = null;
  let running = false;
  const run = async ()=>{
    // Prevent overlapping runs
    if(running){ return; }
    running = true;
    try{
      await fixSprites(method,options);
    }
    catch(err){
      console.log(err);
    }
    running = false;
  };
  await run();
  if( ! options.watch){
    return;
  }
  const debouncedRun = async ()=>{
    if(debounceTimeout){
      clearTimeout(debounceTimeout);
    }
    debounceTimeout = setTimeout(run,2000);
  };
  // Set up the watcher
  // Glob patterns need to have posix separators
  const pattern = path.join(options.folder,"**","*.png")
    .split(path.sep).join(path.posix.sep);
  const watcher = chokidar.watch(pattern,{
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  });
  watcher
    .on('add', debouncedRun)
    .on('change', debouncedRun);
}
