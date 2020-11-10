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
import fs from "fs-extra";

export interface SpritelyCliGeneralOptions {
  folder: string,
  recursive?: boolean,
  allowSubimageSizeMismatch?: boolean,
  move?: string,
  rootImagesAreSprites?: boolean,
  purgeTopLevelFolders?: boolean,
  ifMatch?: string,
}

export function addGeneralOptions(cli: typeof commander){
  cli.option("-f --folder <path>", oneline`
      Path to folder of subimages. Only
      immediate PNG children of each folder are treated as subimages.
      Defaults to the current working directory.
    `, process.cwd())
    .option("-r --recursive", oneline`
      Treat --folder, and all folders inside --folder (recursively), as sprites.
      USE WITH CAUTION!
      Each folder with immediate PNG children is treated as a sprite,
      with those children as its subimages.
    `)
    .option("-a --allow-subimage-size-mismatch", oneline`
      By default it is required that all subimages of a sprite are
      supposed to have identical dimensions. You can optionally bypass
      this requirement.
    `)
    .option("-m --move <path>", oneline`
      Move images to a different folder after modification.
      Useful for pipelines that use presence/absence
      of images as signals. Maintains relative paths.
      Deletes any existing subimages before copying the new
      ones over.
    `)
    .option("--purge-top-level-folders", oneline`
      Delete top-level folders (immediate children of --folder)
      prior to moving changed images.
    `)
    .option("-s --root-images-are-sprites", oneline`
      Prior to correction, move any immediate PNG children of
      --folder into folders with the same name as those images.
      This allows root-level images to be treated as individual
      sprites.
    `)
    .option("-p --if-match", oneline`
      Only perform the tasks on sprites whose top-level folder
      (relative to --folder) matches this pattern. Case-sensitive,
      converted to a regex pattern using JavaScript's 'new RegExp()'.
    `);
  return cli;
}

function getSpriteDirs(folder:string,recursive?:boolean){
  const folders = recursive
    ? [folder,...listFoldersSync(folder,recursive)]
    : [folder];
  folders.reverse();
  return folders;
}

type SpritelyFixMethod = 'crop'|'bleed';

async function fixSpriteDir(method:SpritelyFixMethod|SpritelyFixMethod[],spriteDir:string,sourceRoot:string,moveRoot?:string,allowSubimageSizeMismatch?:boolean){
  const methods = typeof method == 'string' ? [method] : method;
  try{
    const sprite = new Spritely({spriteDirectory:spriteDir,allowSubimageSizeMismatch});
    for(const spriteMethod of methods){
      await sprite[spriteMethod]();
    }
    if(moveRoot){
      const movedSpritePath = path.join(moveRoot, path.relative(sourceRoot,spriteDir));
      // Clear any existing images in the target directory
      try{
        listFilesByExtensionSync(movedSpritePath,'png')
          .forEach(existingSubimage=>fs.removeSync(existingSubimage));
      }
      catch{}
      await sprite.move(path.dirname(movedSpritePath));
    }
    console.log(`Cleaned sprite "${spriteDir}".`);
  }
  catch(err){
    console.log(`Sprite clean failed for "${spriteDir}".`,err?.message);
  }
}

async function fixSpriteDirs(method:SpritelyFixMethod|SpritelyFixMethod[],spriteDirs:string[],sourceRoot:string,moveRoot?:string,allowSubimageSizeMismatch?:boolean){
  for(const spriteDir of spriteDirs){
    await fixSpriteDir(method,spriteDir,sourceRoot,moveRoot,allowSubimageSizeMismatch);
  }
}

function rootDir(fullpath:string,relativeTo='.'){
  return path.relative(relativeTo,fullpath).split(/[\\/]/g)[0];
}


export async function fixSprites(method:SpritelyFixMethod|SpritelyFixMethod[],options: SpritelyCliGeneralOptions){
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
      if(! await fs.existsSync(moveDir)){
        continue;
      }
      const childrenAreImagesOrFolders = listPathsSync(moveDir,true)
        .every(child=>child.endsWith('.png') || fs.statSync(child).isDirectory());
      if(!childrenAreImagesOrFolders){
        continue;
      }
      fs.emptyDirSync(moveDir);
      fs.rmdirSync(moveDir);
    }
  }
  await fixSpriteDirs(method,spriteDirs,options.folder,options.move,options.allowSubimageSizeMismatch);
  if(options.move){
    removeEmptyDirsSync(options.folder);
  }
}
