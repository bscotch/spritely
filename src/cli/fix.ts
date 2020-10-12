import {Spritely} from "../lib/Spritely";
import {getSpriteDirs} from "./util";
import chokidar from "chokidar";
import {toPosixPath} from "@bscotch/utility";
import path from "path";

async function fixSpriteDir(spriteDir:string){
  try{
    const sprite = new Spritely(spriteDir);
    await (await sprite.crop()).alphaline();
    console.log(`Fixed sprite "${spriteDir}"`);
  }
  catch(err){
    console.log(`Sprite fix failed for "${spriteDir}"`,err?.message);
  }
}

async function fixSpriteDirs(spriteDirs:string[]){
  for(const spriteDir of spriteDirs){
    await fixSpriteDir(spriteDir);
  }
}

export interface SpritelyFixOptions {
  folder: string,
  recursive?: boolean,
  watch?: boolean,
}

export async function fixSprites(options: SpritelyFixOptions){
  // Get all directories starting in folder
  const spriteDirs = getSpriteDirs(options.folder,options.recursive);
  await fixSpriteDirs(spriteDirs);

  if(options.watch){
    const glob = toPosixPath(
      options.recursive
        ? path.join(options.folder,'**/*.png')
        : path.join(options.folder,'*.png')
    );
    const rerunOnDir = (filepath:string)=>fixSpriteDir(path.dirname(filepath));
    chokidar
      .watch(glob,{ignoreInitial:true})
      .on("ready",()=>console.log(`Watching for sprite changes matching pattern: ${glob}`))
      .on('add',rerunOnDir)
      .on('change',rerunOnDir);
  }
}