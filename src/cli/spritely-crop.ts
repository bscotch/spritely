#!/usr/bin/env node
import { toPosixPath } from "@bscotch/utility";
import cli from "commander";
import {Spritely} from "../lib/Spritely";
import { addGeneralOptions, getSpriteDirs } from "./util";
import path from "path";
import chokidar from "chokidar";

async function cropSpriteDir(spriteDir:string){
  try{
    const sprite = new Spritely(spriteDir);
    await sprite.crop();
    console.log(`Cropped sprite "${spriteDir}"`);
  }
  catch(err){
    console.log(`Sprite crop failed for "${spriteDir}"`,err?.message);
  }
}

async function cropSprites(){
  addGeneralOptions(cli.description('Spritely: Crop'))
    .parse();

  // Get all directories starting in folder
  const spriteDirs = getSpriteDirs(cli.folder,cli.recursive);
  for(const spriteDir of spriteDirs){
    await cropSpriteDir(spriteDir);
  }

  // watcher
  if(cli.watch){
    const glob = toPosixPath(
      cli.recursive
        ? path.join(cli.folder,'**/*.png')
        : path.join(cli.folder,'*.png')
    );
    const rerunOnDir = (filepath:string)=>cropSpriteDir(path.dirname(filepath));
    chokidar
      .watch(glob,{ignoreInitial:true})
      .on("ready",()=>console.log(`Watching for sprite changes matching pattern: ${glob}`))
      .on('add',rerunOnDir)
      .on('change',rerunOnDir);
  }
}

cropSprites();