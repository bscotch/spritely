import {Spritely} from "../lib/Spritely";
import {getSpriteDirs,SpritelyCliGeneralOptions} from "./util";
import chokidar from "chokidar";
import {toPosixPath} from "@bscotch/utility";
import path from "path";

async function fixSpriteDir(spriteDir:string,sourceRoot:string,moveRoot?:string){
  try{
    const sprite = new Spritely(spriteDir);
    await (await sprite.crop()).alphaline();
    if(moveRoot){
      const moveTo = path.join(moveRoot, path.relative(sourceRoot,path.dirname(spriteDir)));
      await sprite.move(moveTo);
    }
    console.log(`Fixed sprite "${spriteDir}"`);
  }
  catch(err){
    console.log(`Sprite fix failed for "${spriteDir}"`,err?.message);
  }
}

async function fixSpriteDirs(spriteDirs:string[],sourceRoot:string,moveRoot?:string){
  for(const spriteDir of spriteDirs){
    await fixSpriteDir(spriteDir,sourceRoot,moveRoot);
  }
}


export async function fixSprites(options: SpritelyCliGeneralOptions){
  // Get all directories starting in folder
  const spriteDirs = getSpriteDirs(options.folder,options.recursive);
  await fixSpriteDirs(spriteDirs,options.folder,options.move);

  if(options.watch){
    const glob = toPosixPath(
      options.recursive
        ? path.join(options.folder,'**/*.png')
        : path.join(options.folder,'*.png')
    );
    const rerunOnDir = (filepath:string)=>fixSpriteDir(path.dirname(filepath),options.folder,options.move);
    chokidar
      .watch(glob,{ignoreInitial:true})
      .on("ready",()=>console.log(`Watching for sprite changes matching pattern: ${glob}`))
      .on('add',rerunOnDir)
      .on('change',rerunOnDir);
  }
}