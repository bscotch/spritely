#!/usr/bin/env node
import cli from "commander";
import {Spritely} from "../lib/Spritely";
import { addGeneralOptions, getSpriteDirs } from "./util";

async function cropSprites(){
  addGeneralOptions(cli.description('Spritely: Crop'))
    .parse();

  // Get all directories starting in folder
  const spriteDirs = getSpriteDirs(cli);
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