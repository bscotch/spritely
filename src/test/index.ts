import {expect} from "chai";
import {Spritely} from "../lib/Spritely";
import fs from "fs-extra";
import path from "path";
import { SpritelyError } from "../lib/errors";
import {fixSprites} from "../cli/fix";

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

  beforeEach(function(){
    resetSandbox();
  });

  it("can create a Spritely instance from a folder of subimages", async function(){
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
    expect(()=>new Spritely(sandboxPath('invalid-subimages'))).to.throw(SpritelyError);
  });

  it("can crop a sprite without error", async function(){
    const sprite = new Spritely(sandboxPath('valid-subimages'));
    await sprite.crop();
  });

  it("can correct image edges without error", async function(){
    const spriteNames = ['stick','tile_water','tile_grass'];
    for(const spriteName of spriteNames){
      const sprite = new Spritely(sandboxPath(spriteName));
      await sprite.alphaline();
    }
  });

  it("cropped image matches expected image",async function(){
    const sprite = new Spritely(sandboxPath('reference'));
    const uncroppedEqualsReference = await Spritely.imagesAreEqual(
      sandboxPath(path.join('reference','pearl.png')),
      samplesPath(path.join('cropped','pearl.png'))
    );
    expect(uncroppedEqualsReference,
      'uncropped should not match cropped'
    ).to.be.false;

    await sprite.crop();
    const croppedEqualsReference = await Spritely.imagesAreEqual(
      sandboxPath(path.join('reference','pearl.png')),
      samplesPath(path.join('cropped','pearl.png'))
    );
    expect(croppedEqualsReference,
      'cropped should match reference'
    ).to.be.true;
  });

  it("twice-cropped is the same as once-cropped",async function(){    resetSandbox();
    const sprite = new Spritely(sandboxPath('reference'));
    await sprite.crop();
    await sprite.crop();
    const croppedEqualsReference = await Spritely.imagesAreEqual(
      sandboxPath(path.join('reference','pearl.png')),
      samplesPath(path.join('cropped','pearl.png'))
    );
    expect(croppedEqualsReference,
      'twice-cropped should match reference'
    ).to.be.true;
  });

  it("alphalined image matches expected image",async function(){
    const sprite = new Spritely(sandboxPath('reference'));
    const uncorrectedEqualsReference = await Spritely.imagesAreEqual(
      sandboxPath(path.join('reference','pearl.png')),
      samplesPath(path.join('alphalined','pearl.png'))
    );
    expect(uncorrectedEqualsReference,
      'unalphalined should not match alphalined'
    ).to.be.false;

    await sprite.alphaline();
    const correctedEqualsReference = await Spritely.imagesAreEqual(
      sandboxPath(path.join('reference','pearl.png')),
      samplesPath(path.join('alphalined','pearl.png'))
    );
    expect(correctedEqualsReference,
      'alphalined should match reference'
    ).to.be.true;
  });

  it("twice-alphalined should match once-alphalined",async function(){
    const sprite = new Spritely(sandboxPath('reference'));
    await sprite.alphaline();
    await sprite.alphaline();
    const alphalinedEqualsReference = await Spritely.imagesAreEqual(
      sandboxPath(path.join('reference','pearl.png')),
      samplesPath(path.join('alphalined','pearl.png'))
    );
    expect(alphalinedEqualsReference,
      'twice-alphalined should match reference'
    ).to.be.true;
  });

  it("CLI commands can recurse through nested folders",async function(){
    const getChecksums = ()=>{
      return new Spritely(sandboxPath(path.join('dir','subdir','subsubdir'))).checksums;
    };
    const startingChecksums = await getChecksums();
    expect(startingChecksums.length,'should be starting with two images').to.equal(2);
    await fixSprites({folder: sandboxPath('dir'),recursive:true});
    const endingChecksums = await getChecksums();
    expect(startingChecksums).to.not.eql(endingChecksums);
  });

  it("can move a sprite", async function(){
    expect(()=>new Spritely(sandboxPath(path.join('dir','subdir','subsubdir')))).to.not.throw();
    await fixSprites({
      folder: sandboxPath(path.join('dir')),
      move: sandboxPath('moved'),
      recursive:true
    });
    // Should be able to load the sprite from where it was moved
    new Spritely(sandboxPath(path.join('moved','subdir','subsubdir')));
    // Should get errors when trying to get the original sprite
    expect(()=>new Spritely(sandboxPath(path.join('dir','subdir','subsubdir')))).to.throw();
  });

  // after(function(){
  //   resetSandbox();
  // });
});