#!/usr/bin/env node
import cli from "commander";
import {oneline} from "@bscotch/utility";

// Kick it off
cli.description('Spritely: Image correction and cleanup for 2D game sprites')
  // .command("fix", "Crop and alphaline sprites.")
  // .command("alphaline", oneline`
  //   Add a single-pixel low-alpha outline around foreground
  //   objects to improve aliasing.
  // `)
  .command("crop",  oneline`
    Autocrop the subimages of a sprite while maintaining relative positions.
  `)
  .parse();
