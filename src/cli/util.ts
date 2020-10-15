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
  move?: string,
  rootImagesAreSprites?: boolean,
  purgeTopLevelFolders?: boolean,
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
    `);
  return cli;
}

export function getSpriteDirs(folder:string,recursive?:boolean){
  const folders = recursive
    ? [folder,...listFoldersSync(folder,recursive)]
    : [folder];
  folders.reverse();
  return folders;
}

type SpritelyFixMethod = 'crop'|'alphaline';

async function fixSpriteDir(method:SpritelyFixMethod|SpritelyFixMethod[],spriteDir:string,sourceRoot:string,moveRoot?:string){
  const methods = typeof method == 'string' ? [method] : method;
  try{
    const sprite = new Spritely(spriteDir);
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
      removeEmptyDirsSync(spriteDir);
    }
    console.log(`Cleaned sprite "${spriteDir}"`);
  }
  catch(err){
    console.log(`Sprite clean failed for "${spriteDir}"`,err?.message);
  }
}

async function fixSpriteDirs(method:SpritelyFixMethod|SpritelyFixMethod[],spriteDirs:string[],sourceRoot:string,moveRoot?:string){
  for(const spriteDir of spriteDirs){
    await fixSpriteDir(method,spriteDir,sourceRoot,moveRoot);
  }
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
  const spriteDirs = getSpriteDirs(options.folder,options.recursive);
  if(options.purgeTopLevelFolders && options.move){
    const topLevelDirs = [...new Set(spriteDirs.map(spriteDir=>{
      return path.relative(options.folder,spriteDir).split(/[\\/]/g)[0];
    }))].filter(x=>x);
    for(const topLevelDir of topLevelDirs){
      const moveDir = path.join(options.move,topLevelDir);
      const childrenAreImagesOrFolders = listPathsSync(moveDir,true)
        .every(child=>child.endsWith('.png') || fs.statSync(child).isDirectory());
      if(!childrenAreImagesOrFolders){
        continue;
      }
      fs.emptyDirSync(moveDir);
      fs.rmdirSync(moveDir);
    }
  }
  await fixSpriteDirs(method,spriteDirs,options.folder,options.move);
  if(options.move){
    removeEmptyDirsSync(options.folder);
  }
}
