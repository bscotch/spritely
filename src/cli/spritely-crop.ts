import cli from "commander";
import {addGeneralOptions, SpritelyCliGeneralOptions,runFixer} from "./util";

async function runCliCommand(){
  addGeneralOptions(cli.description('Spritely: Crop subimages'))
    .parse();

  await runFixer('crop',cli.opts() as SpritelyCliGeneralOptions);
}

runCliCommand();
