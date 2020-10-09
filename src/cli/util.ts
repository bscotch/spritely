import { listFoldersSync, oneline } from "@bscotch/utility";
import commander from "commander";

export function addGeneralOptions(cli: typeof commander){
  cli.option("-f --folder <path>", oneline`
      Path to folder of subimages. Only
      immediate PNG children of each folder are treated as subimages.
      Defaults to the current working directory.
    `, process.cwd())
    .option("-r --recursive",oneline`
      Treat --folder, and all folders inside --folder (recursively), as sprites.
      USE WITH CAUTION!
      Each folder with immediate PNG children is treated as a sprite,
      with those children as its subimages.
    `)
    .option("-w --watch",oneline`
      After running once, stay alive and watch for changes in the
      target files. If any change, re-run the operation on them.
      Allows you to run the command once and then have your images
      automatically modified as you create/update them.
    `);
  return cli;
}

export function getSpriteDirs(cli:typeof commander){
  return cli.recursive
    ? [cli.folder,...listFoldersSync(cli.folder)]
    : [cli.folder];
}

