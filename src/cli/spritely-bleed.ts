import cli from "commander";
import {addGeneralOptions, SpritelyCliGeneralOptions,fixSprites} from "./util";

async function runCliCommand(){
  addGeneralOptions(cli.description('Spritely: Bleed subimages'))
    .parse();

  await fixSprites('bleed',cli.opts() as SpritelyCliGeneralOptions);
}

runCliCommand();
