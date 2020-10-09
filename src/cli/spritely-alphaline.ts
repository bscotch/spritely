#!/usr/bin/env node
import cli from "commander";
import {Spritely} from "../lib/Spritely";
import {addGeneralOptions, getSpriteDirs} from "./util";
import { toPosixPath } from "@bscotch/utility";
import path from "path";
import chokidar from "chokidar";

async function alphalineSpriteDir(spriteDir:string){
  try{
    const sprite = new Spritely(spriteDir);
    await sprite.alphaline();
    console.log(`Alphalined sprite "${spriteDir}"`);
  }
  catch(err){
    console.log(`Sprite alphaline failed for "${spriteDir}"`,err?.message);
  }
}

async function alphalineSprites(){
  addGeneralOptions(cli.description('Spritely: Alphaline'))
    .parse();

  // Get all directories starting in folder
  const spriteDirs = getSpriteDirs(cli);
  for(const spriteDir of spriteDirs){
    await alphalineSpriteDir(spriteDir);
  }

  // watcher
  if(cli.watch){
    const glob = toPosixPath(
      cli.recursive
        ? path.join(cli.folder,'**/*.png')
        : path.join(cli.folder,'*.png')
    );
    const rerunOnDir = (filepath:string)=>alphalineSpriteDir(path.dirname(filepath));
    chokidar
      .watch(glob,{ignoreInitial:true,interval:100})
      .on("ready",()=>console.log(`Watching for sprite changes matching pattern: ${glob}`))
      .on('add',rerunOnDir)
      .on('change',rerunOnDir);
  }
}

alphalineSprites();