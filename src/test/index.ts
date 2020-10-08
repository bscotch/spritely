import {expect} from "chai";
import {Spritely} from "../lib/Spritely";
import fs from "fs-extra";
import path from "path";
import { SpritelyError } from "../lib/errors";

const sandboxRoot = "./sandbox";
const samplesRoot = "./samples";

function resetSandbox() {
  fs.ensureDirSync(sandboxRoot);
  try {
    fs.emptyDirSync(sandboxRoot);
  }
  catch (err) {
    console.log(err);
  }
  fs.copySync(samplesRoot, sandboxRoot);
}

function sandboxPath(subPath?:string){
  return path.join(sandboxRoot,subPath||'');
}

describe("Spritely", function(){

  it("can create a Spritely instance from a folder of subimages", async function(){
    resetSandbox();
    const validSubimagesFolder = sandboxPath('valid-subimages');
    const subimageCount = fs.readdirSync(validSubimagesFolder).length;
    expect(subimageCount,'sample subimages must exist').to.be.greaterThan(0);
    const sprite = new Spritely(validSubimagesFolder);
    expect(sprite.height, 'detected height must be non-zero').to.be.greaterThan(0);
    expect(sprite.width,  'detected width must be non-zero' ).to.be.greaterThan(0);
    expect(sprite.paths.length, 'detected subimages must match actual count').to.equal(subimageCount);
  });

  it("fails to create a Spritely instance when subimages mismatch in size", async function(){
    resetSandbox();
    expect(()=>new Spritely(sandboxPath('invalid-subimages'))).to.throw(SpritelyError);
  });

  it("can crop a sprite without error", async function(){
    resetSandbox();
    const sprite = new Spritely(sandboxPath('valid-subimages'));
    await sprite.crop();
  });

  it("can correct image edges without error", async function(){
    resetSandbox();
    const spriteNames = ['pearl','stick','tile_water','tile_grass'];
    for(const spriteName of spriteNames){
      const sprite = new Spritely(sandboxPath(spriteName));
      await sprite.alphaline();
    }
  });
});