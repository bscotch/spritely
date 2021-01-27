import cli from "commander";
import {addGeneralOptions, SpritelyCliGeneralOptions,runFixer} from "./util";

async function runCliCommand(){
  addGeneralOptions(cli.description('Spritely: Bleed subimages'))
    .parse();

  await runFixer('bleed',cli.opts() as SpritelyCliGeneralOptions);
}

runCliCommand();
