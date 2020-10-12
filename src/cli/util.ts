import { listFilesByExtensionSync, listFoldersSync, oneline, toPosixPath } from "@bscotch/utility";
import commander from "commander";
import { Spritely } from "../lib/Spritely";
import path from "path";
import chokidar from "chokidar";
import fs from "fs-extra";

export interface SpritelyCliGeneralOptions {
  folder: string,
  recursive?: boolean,
  watch?: boolean,
  move?: string,
}


export function addGeneralOptions(cli: typeof commander){
  cli.option("-f --folder <path>", oneline`
      Path to folder of subimages. Only
      immediate PNG children of each folder are treated as subimages.
      Defaults to the current working directory.
    `, process.cwd())
    .option("-r --recursive",oneline`
      Treat --folder, and all folders inside --folder (recursively), as sprites.
      USE WITH CAUTION!
      Each folder with immediate PNG children is treated as a sprite,
      with those children as its subimages.
    `)
    .option("-w --watch",oneline`
      After running once, stay alive and watch for changes in the
      target files. If any change, re-run the operation on them.
      Allows you to run the command once and then have your images
      automatically modified as you create/update them.
    `)
    .option("-m --move <path>",oneline`
      Move images to a different folder after modification.
      Useful for pipelines that use presence/absence
      of images as signals. Maintains relative paths.
      Deletes any existing subimages before copying the new
      ones over.
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
  // Get all directories starting in folder
  const spriteDirs = getSpriteDirs(options.folder,options.recursive);
  await fixSpriteDirs(method,spriteDirs,options.folder,options.move);

  if(options.watch){
    const glob = toPosixPath(
      options.recursive
        ? path.join(options.folder,'**/*.png')
        : path.join(options.folder,'*.png')
    );
    const rerunOnDir = (filepath:string)=>fixSpriteDir(method,path.dirname(filepath),options.folder,options.move);
    chokidar
      .watch(glob,{ignoreInitial:true})
      .on("ready",()=>console.log(`Watching for sprite changes matching pattern: ${glob}`))
      .on('add',rerunOnDir)
      .on('change',rerunOnDir);
  }
}
