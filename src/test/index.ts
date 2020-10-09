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

function samplesPath(subPath?:string){
  return path.join(samplesRoot,subPath||'');
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

  it("can test if images are equal",async function(){
    const shouldBeEqual = await Spritely.imagesAreEqual(
      sandboxPath(path.join('reference','pearl.png')),
      sandboxPath(path.join('reference','pearl.png'))
    );
    expect(shouldBeEqual,'identical images should show up as equal').to.be.true;
    const shouldBeUnequal = await Spritely.imagesAreEqual(
      sandboxPath(path.join('reference','pearl.png')),
      sandboxPath(path.join('invalid-subimages','subimage-1.png'))
    );
    expect(shouldBeUnequal,'different images should show up as unequal').to.be.false;
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
    const spriteNames = ['stick','tile_water','tile_grass'];
    for(const spriteName of spriteNames){
      const sprite = new Spritely(sandboxPath(spriteName));
      await sprite.alphaline();
    }
  });

  xit("can crop a sprite as expected",async function(){
    resetSandbox();
    const sprite = new Spritely(sandboxPath('reference'));
    await sprite.crop();
    const equalsCroppedReference = await Spritely.imagesAreEqual(
      sandboxPath(path.join('reference','pearl.png')),
      samplesPath(path.join('reference','pearl.png'))
    );
    expect(equalsCroppedReference).to.be.true;
  });

  after(function(){
    resetSandbox();
  });
});