#!/usr/bin/env node
import cli from "commander";
import {Spritely} from "../lib/Spritely";
import {addGeneralOptions, getSpriteDirs} from "./util";

async function alphalineSprites(){
  addGeneralOptions(cli.description('Spritely: Alphaline'))
    .parse();

  // Get all directories starting in folder
  const spriteDirs = getSpriteDirs(cli);
  for(const spriteDir of spriteDirs){
    try{
      const sprite = new Spritely(spriteDir);
      await sprite.alphaline();
      console.log(`Alphalined sprite "${spriteDir}"`);
    }
    catch(err){
      console.log(`Sprite alphaline failed for "${spriteDir}"`,err?.message);
    }
  }
}

alphalineSprites();