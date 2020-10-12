import cli from "commander";
import {addGeneralOptions, SpritelyCliGeneralOptions,fixSprites} from "./util";

async function runCliCommand(){
  addGeneralOptions(cli.description('Spritely: Alphaline subimages'))
    .parse();

  await fixSprites('alphaline',cli as typeof cli & SpritelyCliGeneralOptions);
}

runCliCommand();
