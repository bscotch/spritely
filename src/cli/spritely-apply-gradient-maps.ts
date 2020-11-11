#!/usr/bin/env node
import cli from "commander";
import {cliOptions, SpritelyCliGeneralOptions,fixSprites} from "./util";

async function runCliCommand(){
  cli.description('Spritely: Apply gradient maps')
    .option(...cliOptions.folder)
    .option(...cliOptions.recursive)
    .option(...cliOptions.mismatch)
    .option(...cliOptions.rootImages)
    .option(...cliOptions.match)
    .option('-d --delete-source','Optionally delete source images after applying gradients.')
    .parse();

  await fixSprites(['applyGradientMaps'],cli as typeof cli & SpritelyCliGeneralOptions);
}

runCliCommand();
