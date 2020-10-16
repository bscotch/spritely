#!/usr/bin/env node
import cli from "commander";
import {addGeneralOptions, SpritelyCliGeneralOptions,fixSprites} from "./util";

async function runCliCommand(){
  addGeneralOptions(cli.description('Spritely: Fix (run all corrective functions)'))
    .parse();

  await fixSprites(['crop','bleed'],cli as typeof cli & SpritelyCliGeneralOptions);
}

runCliCommand();
