#!/usr/bin/env node
import cli from "commander";
import {Spritely} from "../lib/Spritely";
import {addGeneralOptions, getSpriteDirs} from "./util";
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

async function alphalineSprites(){
  addGeneralOptions(cli.description('Spritely: Fix (run all corrective functions)'))
    .parse();

  // Get all directories starting in folder
  const spriteDirs = getSpriteDirs(cli);
  await fixSpriteDirs(spriteDirs);

  if(cli.watch){
    const glob = toPosixPath(
      cli.recursive
        ? path.join(cli.folder,'**/*.png')
        : path.join(cli.folder,'*.png')
    );
    const rerunOnDir = (filepath:string)=>fixSpriteDir(path.dirname(filepath));
    chokidar
      .watch(glob,{ignoreInitial:true})
      .on("ready",()=>console.log(`Watching for sprite changes matching pattern: ${glob}`))
      .on('add',rerunOnDir)
      .on('change',rerunOnDir);
  }
}

alphalineSprites();