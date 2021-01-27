#!/usr/bin/env node
import cli from "commander";
import {addGeneralOptions, SpritelyCliGeneralOptions,runFixer} from "./util";

async function runCliCommand(){
  addGeneralOptions(cli.description('Spritely: Fix (run all corrective functions)'))
    .parse();
  await runFixer(['crop','bleed'],cli.opts() as SpritelyCliGeneralOptions);
}

runCliCommand();
