#!/usr/bin/env node
import { oneline } from "@bscotch/utility";
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
    .option('-g --gradient-maps-file <file>',oneline`
      By default, gradient maps are expected to be named 'gradmap.yml' and live
      inside the sprite's folder (so that each sprite can have a separate
      set of mappings). You can optionally override this behavior and point
      to a gradient map file that will be used by *all* sprites.
    `)
    .parse();

  await fixSprites(['applyGradientMaps'],cli as typeof cli & SpritelyCliGeneralOptions);
}

runCliCommand();
