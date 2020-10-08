#!/usr/bin/env node
import cli from "commander";
import {Spritely} from "../lib/Spritely";
import {addGeneralOptions, getSpriteDirs} from "./util";

async function alphalineSprites(){
  addGeneralOptions(cli.description('Spritely: Fix (run all corrective functions)'))
    .parse();

  // Get all directories starting in folder
  const spriteDirs = getSpriteDirs(cli);
  for(const spriteDir of spriteDirs){
    try{
      const sprite = new Spritely(spriteDir);
      await (await sprite.crop()).alphaline();
      console.log(`Fixed sprite "${spriteDir}"`);
    }
    catch(err){
      console.log(`Sprite fix failed for "${spriteDir}"`,err?.message);
    }
  }
}

alphalineSprites();