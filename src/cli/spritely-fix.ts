#!/usr/bin/env node
import cli from "commander";
import {addGeneralOptions, SpritelyCliGeneralOptions} from "./util";
import { fixSprites } from "./fix";


async function runCliCommand(){
  addGeneralOptions(cli.description('Spritely: Fix (run all corrective functions)'))
    .parse();

  await fixSprites(cli as typeof cli & SpritelyCliGeneralOptions);
}

runCliCommand();
