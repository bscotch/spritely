#!/usr/bin/env node
import cli from "commander";
import {oneline} from "@bscotch/utility";

// Kick it off
cli.description('Spritely: Image correction and cleanup for 2D game sprites')
  // .command("fix", "Perform all correction/cleanup tasks (including cropping and alphalining).")
  .command("alphaline", oneline`
    Add a single-pixel low-alpha outline around foreground
    objects to improve aliasing.
  `)
  .command("crop",  oneline`
    Autocrop the subimages of a sprite while maintaining relative positions.
  `)
  .parse();
