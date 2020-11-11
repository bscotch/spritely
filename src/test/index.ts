import {expect} from "chai";
import {Spritely} from "../lib/Spritely";
import fs from "fs-extra";
import path from "path";
import { SpritelyError } from "../lib/errors";
import {fixSprites} from "../cli/util";
import { SpritelyBatch } from "../lib/SpritelyBatch";
import { Color } from "../lib/Color";
import { GradientMap } from "../lib/GradientMap";

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

function samplesPath(...subPathParts:string[]){
  return path.join(samplesRoot,...(subPathParts||[]));
}

function sandboxPath(...subPathParts:string[]){
  return path.join(sandboxRoot,...(subPathParts||[]));
}

describe("Spritely", function(){

  beforeEach(function(){
    resetSandbox();
  });

  it("can create Color instances",function(){
    expect(()=>new Color('meh')).to.throw();
    expect(()=>new Color([1,2333,0,1])).to.throw();
    expect(new Color('FFFFFF').rgba).to.eql([255,255,255,255]);
    const color = new Color('AD29E105');
    expect(color.rgba).to.eql([173,41,225,5]);
    expect(color.rgb).to.eql([173,41,225]);
    expect(color.rgbHex).to.eql('AD29E1'.toLowerCase());
    expect(new Color('AaBBFf00').equalsRgb(new Color('aabbff33'))).to.be.true;
    expect(new Color('AaBBFf00').equalsRgba(new Color('aabbff33'))).to.be.false;
    expect(new Color('AaBBF000').equalsRgba(new Color('aabbff33'))).to.be.false;
    expect(JSON.stringify(new Color('000000'))).to.equal('{"red":0,"green":0,"blue":0,"alpha":255}');
  });

  it.only("can create a GradientMap", function(){
    const grad = new GradientMap();
    const startColor = 'eeeeee';
    const startPos = 11;
    const intermediateColor = '090909';
    const intermediatePos = 22;
    const endColor = '222222';
    const endPos = 99;
    const computedPos = 44;
    const expectedComputedPosColorValue = Math.floor(
      (
        (computedPos-intermediatePos)/(endPos-intermediatePos) *
        (parseInt('22',16)-parseInt('09',16))
      ) + parseInt('09',16)
    );
    grad.addPosition(intermediatePos,intermediateColor);
    grad.addPosition(startPos,startColor);
    grad.addPosition(endPos,endColor);
    expect(()=>grad.addPosition(101,'000000')).to.throw();
    expect(()=>grad.addPosition(33,'22')).to.throw();
    expect(grad.getPositions().map(pos=>pos.position),
      'value should be properly sorted'
    ).to.eql([startPos,intermediatePos,endPos]);
    // Should be able to get back the values originally put in
    expect(grad.getColorAtPosition(0).rgbHex).to.equal(startColor);
    expect(grad.getColorAtPosition(startPos).rgbHex).to.equal(startColor);
    expect(grad.getColorAtPosition(100).rgbHex).to.equal(endColor);
    expect(grad.getColorAtPosition(endPos).rgbHex).to.equal(endColor);
    expect(grad.getColorAtPosition(intermediatePos).rgbHex).to.equal(intermediateColor);
    // Should be able to get correct intermediate values
    expect(grad.getColorAtPosition(computedPos).rgba).to.eql([
      expectedComputedPosColorValue,
      expectedComputedPosColorValue,
      expectedComputedPosColorValue,
      255
    ]);
  });

  it.only("can load gradient maps from file", function(){
    const sprite = new Spritely({
      spriteDirectory: sandboxPath('gradmap'),
      allowSubimageSizeMismatch: true
    });
    const grads = sprite.getGradientMaps();
    expect(grads.length).to.equal(2);
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
      sandboxPath('reference','pearl.png'),
      sandboxPath('reference','pearl.png')
    );
    expect(shouldBeEqual,'identical images should show up as equal').to.be.true;
    const shouldBeUnequal = await Spritely.imagesAreEqual(
      sandboxPath('reference','pearl.png'),
      sandboxPath('invalid-subimages','subimage-1.png')
    );
    expect(shouldBeUnequal,'different images should show up as unequal').to.be.false;
  });

  it("fails to create a Spritely instance when subimages mismatch in size", async function(){
    expect(()=>new Spritely(sandboxPath('invalid-subimages'))).to.throw(SpritelyError);
  });

  it("can create a Spritely instance with mismatched subimage sizes if forced", async function(){
    const sprite = new Spritely({
      spriteDirectory: sandboxPath('invalid-subimages'),
      allowSubimageSizeMismatch: true
    }); // would otherwise throw an error
    expect(sprite.paths.length).to.equal(2);
  });

  it("can crop a sprite without error", async function(){
    const sprite = new Spritely(sandboxPath('valid-subimages'));
    await sprite.crop();
  });

  it("can correct image edges without error", async function(){
    const spriteNames = ['stick','tile_water','tile_grass'];
    for(const spriteName of spriteNames){
      const sprite = new Spritely(sandboxPath(spriteName));
      await sprite.bleed();
    }
  });

  it("cropped image matches expected image",async function(){
    const sprite = new Spritely(sandboxPath('reference'));
    const uncroppedEqualsReference = await Spritely.imagesAreEqual(
      sandboxPath('reference','pearl.png'),
      samplesPath('cropped','pearl.png')
    );
    expect(uncroppedEqualsReference,
      'uncropped should not match cropped'
    ).to.be.false;

    await sprite.crop();
    const croppedEqualsReference = await Spritely.imagesAreEqual(
      sandboxPath('reference','pearl.png'),
      samplesPath('cropped','pearl.png')
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
      sandboxPath('reference','pearl.png'),
      samplesPath('cropped','pearl.png')
    );
    expect(croppedEqualsReference,
      'twice-cropped should match reference'
    ).to.be.true;
  });

  it("bled image matches expected image",async function(){
    const sprite = new Spritely(sandboxPath('reference'));
    const uncorrectedEqualsReference = await Spritely.imagesAreEqual(
      sandboxPath('reference','pearl.png'),
      samplesPath('bled','pearl.png')
    );
    expect(uncorrectedEqualsReference,
      'unbled should not match bled'
    ).to.be.false;

    await sprite.bleed();
    const correctedEqualsReference = await Spritely.imagesAreEqual(
      sandboxPath('reference','pearl.png'),
      samplesPath('bled','pearl.png')
    );
    expect(correctedEqualsReference,
      'bled should match reference'
    ).to.be.true;
  });

  it("twice-bled should match once-bled",async function(){
    const sprite = new Spritely(sandboxPath('reference'));
    await sprite.bleed();
    await sprite.bleed();
    const bledEqualsReference = await Spritely.imagesAreEqual(
      sandboxPath('reference','pearl.png'),
      samplesPath('bled','pearl.png')
    );
    expect(bledEqualsReference,
      'twice-bled should match reference'
    ).to.be.true;
  });

  it("CLI commands can recurse through nested folders",async function(){
    const getChecksums = ()=>{
      return new Spritely(sandboxPath('dir','subdir','subsubdir')).checksums;
    };
    const startingChecksums = await getChecksums();
    expect(startingChecksums.length,'should be starting with two images').to.equal(2);
    await fixSprites('crop',{folder: sandboxPath('dir'),recursive:true});
    const endingChecksums = await getChecksums();
    expect(startingChecksums).to.not.eql(endingChecksums);
  });

  it("CLI commands can move root images into sprite folders",async function(){
    const folder = sandboxPath('dir');
    await fixSprites('crop',{folder,recursive:true,rootImagesAreSprites:true});
    expect(fs.existsSync(path.join(folder,'invalid-1.png')),
      'root images should no longer exist'
    ).to.be.false;
    expect(fs.existsSync(path.join(folder,'invalid-1','invalid-1.png')),
      'root images be moved into subfolder'
    ).to.be.true;
    expect(fs.existsSync(path.join(folder,'subdir','subsubdir','subimage-1.png')),
      'non-root images should be handled normally'
    ).to.be.true;
  });

  it("can move a sprite", async function(){
    expect(()=>new Spritely(sandboxPath('dir','subdir','subsubdir'))).to.not.throw();
    const options = {
      folder: sandboxPath('dir'),
      move: sandboxPath('moved'),
      recursive: true,
      purgeTopLevelFolders: true,
    };
    await fixSprites(['crop','bleed'],options);
    // Should be able to load the sprite from where it was moved
    new Spritely(sandboxPath('moved','subdir','subsubdir'));
    // Should get errors when trying to get the original sprite
    expect(()=>new Spritely(sandboxPath('dir','subdir','subsubdir'))).to.throw();
  });

  it("can crop sprites with differently-sized subimages", async function(){
    await fixSprites(['crop'],{
      folder: sandboxPath('invalid-subimages'),
      allowSubimageSizeMismatch: true
    });
    for(let i=1;i<=2;i++){
      expect(await Spritely.imagesAreEqual(
        sandboxPath('invalid-subimages',`subimage-${i}.png`),
        sandboxPath('invalid-subimages-cropped',`subimage-${i}.png`),
      ),`cropped subimage ${i} should match reference`).to.be.true;
    }
  });

  it("can filter which sprites are modified", async function(){
    const options = {
      folder: sandboxPath(),
      move: sandboxPath('filtered'),
      recursive: true,
      ifMatch: "(cropped|tile_)"
    };
    await fixSprites('crop',options);
    for(const shouldBeFixed of ['cropped','tile_grass','tile_water']){
      expect(fs.existsSync(sandboxPath('filtered',shouldBeFixed)),
        'folders matching patterns should be moved'
      ).to.be.true;
    }
    for(const shouldNotBeFixed of ['bled','reference','stick','valid-subimages']){
      expect(fs.existsSync(sandboxPath('filtered',shouldNotBeFixed)),
        'folders not matching patterns should not be moved'
      ).to.be.false;
    }
  });

  it("can create a SpritelyBatch instance",function(){
    const spritelyBatch = new SpritelyBatch(sandboxPath());
    expect(spritelyBatch.sprites.find(sprite=>sprite.name=='subsubdir'),
      'should be able to discover nested sprites'
    ).to.exist;
    expect(spritelyBatch.sprites.length,
      'should be able to find all sprites'
    ).to.be.greaterThan(7);
  });

  after(function(){
    resetSandbox();
  });
});