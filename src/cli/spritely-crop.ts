import cli from "commander";
import {addGeneralOptions, SpritelyCliGeneralOptions,fixSprites} from "./util";

async function runCliCommand(){
  addGeneralOptions(cli.description('Spritely: Crop subimages'))
    .parse();

  await fixSprites('crop',cli as typeof cli & SpritelyCliGeneralOptions);
}

runCliCommand();
