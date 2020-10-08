#!/usr/bin/env node
import cli from "commander";
import {oneline,listFoldersSync} from "@bscotch/utility";
import {Spritely} from "../lib/Spritely";

async function cropSprites(){
  cli.description('Spritely: Crop')
    .option("-f --folder <path>", oneline`
      Path to folder of subimages. Only
      immediate PNG children of each folder are treated as subimages.
      Defaults to the current working directory.
    `, process.cwd())
    .option("-r --recursive",oneline`
      Treat --folder, and all folders inside --folder (recursively), as sprites.
      Each folder with immediate PNG children is treated as a sprite,
      with those children as its subimages.
    `)
    .parse();

  // Get all directories starting in folder
  const spriteDirs = cli.recursive
    ? [cli.folder,...listFoldersSync(cli.folder)]
    : [cli.folder];
  for(const spriteDir of spriteDirs){
    try{
      const sprite = new Spritely(spriteDir);
      await sprite.crop();
      console.log(`Cropped sprite "${spriteDir}"`);
    }
    catch(err){
      console.log(`Sprite crop failed for "${spriteDir}"`,err?.message);
    }
  }
}

cropSprites();