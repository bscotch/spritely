import fs from "fs-extra";
import path from "path";
import {
  assert,
  assertDirectoryExists,
  assertNonEmptyArray,
  assertNumberGreaterThanZero,
} from "./errors";
import {Image} from "image-js";
import {removeEmptyDirsSync} from "@bscotch/utility";
import yaml from "yaml";


// The 'image-size' module allows for synchronous operation,
// which is not provided by 'sharp' (the primary image manipulation pipeline),
// but is needed since Typescript constructors are synchronous.
import {imageSize} from "image-size";
import { sha256 } from "./utility";
import { GradientMap } from "./GradientMap";

interface GradientMapsFile {
  skins: {
    [name: string]: {
      [position: number]: string
    }
  },
  groups?:{
    pattern: string,
    skins: string|string[],
    match?: 'sprite'|'subimage'
  }[]
}

export type SpriteCreatedBy = 'inkscape'|'clipstudiopaint';
export interface SpriteEdgeCorrectionOptions {
  /**
   * All art programs have their own quirks. By knowing what program
   * was used to create images we can make corrections specific to that program.
   */
  createdBy?: SpriteCreatedBy
}

interface ImageExt extends Image {
  getChannel(channel:number):ImageExt,
  subtractImage(image:ImageExt,options?:{bitDepth?:number,channels?:number[]}):Image,
}

interface SpritelyOptions {
  /** The location of the folder corresponding to the sprite. */
  spriteDirectory?: string,
  /**
   * By default all sprite images inside `spriteDirectory`
   * must be the same size. This allows the subimages to work
   * out of the gate with GameMaker Studio, and also makes it
   * easy to take all subimages into account for auto-cropping.
   * If you bypass this requirement auto-cropping will be performed
   * on a per-image basis, making relative position changes
   * unpredicatable.
   */
  allowSubimageSizeMismatch?: boolean,
  /**
   * By default, Spritely instances search for a gradmap file
   * inside the sprite's directory. You can instead specify
   * a gradient map file to be used.
   */
  gradientMapsFile?: string,
}

export class Spritely {

  private spriteRoot: string;
  private subimagePaths: string[];
  private subimageWidth: number|undefined;
  private subimageHeight: number|undefined;
  readonly allowSubimageSizeMismatch:boolean = false;
  readonly gradientMapsFile?: string;

  /**
   * Create a Sprite instance using a folder full of sprite subimages.
   * @param options Either the path to the sprite folder, or a SpritelyOptions object
   */
  constructor(options?:string|SpritelyOptions){
    options = typeof options == 'string'
      ? {spriteDirectory: options}
      : options || {};
    this.spriteRoot = options.spriteDirectory || process.cwd();
    assertDirectoryExists(this.spriteRoot);
    this.allowSubimageSizeMismatch = Boolean(options.allowSubimageSizeMismatch);

    this.subimagePaths = Spritely.getSubimages(this.spriteRoot);
    const {width,height} = Spritely.getSubimagesSizeSync(this.subimagePaths,this.allowSubimageSizeMismatch);
    this.subimageWidth = width;
    this.subimageHeight = height;
    this.gradientMapsFile = options.gradientMapsFile;
  }

  /** The name of this sprite (its folder name) */
  get name(){
    return path.basename(this.spriteRoot);
  }
  get width(){ return this.subimageWidth; }
  get height(){ return this.subimageHeight; }

  /** Subimage (frame) paths */
  get paths(){
    assert(this.subimagePaths.length,`Sprite ${this.name} has no subimages`);
    return [...this.subimagePaths];
  }

  /** Sprite (folder) path */
  get path(){
    return this.spriteRoot;
  }

  /**
   * Get the checksum of each subimage, calculated on the pixel values
   * only (metadata excluded). Useful for checking equality or tracking content changes.
   */
  get checksums(): Promise<string[]>{
    return Promise.all(this.paths.map(imagePath=>Spritely.pixelsChecksum(imagePath)));
  }

  /** Check if two sprites are exactly equal (have the same subimages) */
  async equals(otherSprite:Spritely){
    if(this.paths.length != otherSprite.paths.length){
      return false;
    }
    for(let i=0; i<this.paths.length; i++){
      if(! await Spritely.imagesAreEqual(this.paths[i],otherSprite.paths[i])){
        return false;
      }
    }
    return true;
  }

  /**
   * Remove excess padding around subimages. Takes into account all subimages
   * so that all are cropped in exactly the same way.
   * **WARNING:** this will overwrite your images!
   * @param extraPadding  Number of padding pixels to keep.
   *                      This should be at least 1 if border correction is also needed.
   */
  async crop(extraPadding=1){
    const boundingBox = {
      left:   Infinity,
      right: -Infinity,
      top:    Infinity,
      bottom:-Infinity,
    };
    await Promise.all(this.paths.map(async path=>{
      // Create a foreground mask and find its bounds
      const img = await Image.load(path) as ImageExt;
      const subimageBoundingBox = Spritely.getForegroundBounds(img,extraPadding);
      if(this.allowSubimageSizeMismatch){
        // Then only need to crop based on self
        await img.crop(Spritely.cropObjectFromBoundingBox(subimageBoundingBox)).save(path);
        return;
      }
      boundingBox.left   = Math.min(boundingBox.left  ,subimageBoundingBox.left  );
      boundingBox.top    = Math.min(boundingBox.top   ,subimageBoundingBox.top   );
      boundingBox.right  = Math.max(boundingBox.right ,subimageBoundingBox.right );
      boundingBox.bottom = Math.max(boundingBox.bottom,subimageBoundingBox.bottom);
    }));
    if(!this.allowSubimageSizeMismatch){
      // Then crop all images based on the collective bounding box.
      const cropObject = Spritely.cropObjectFromBoundingBox(boundingBox);
      await Promise.all(this.paths.map(path=>Spritely.cropImage(path,cropObject)));
    }
    return this;
  }

  /** Correct aliasing issues */
  async bleed(){
    await Promise.all(this.paths.map(path=>Spritely.bleed(path)));
    return this;
  }

  /**
   * For each gradient map found in `{sprite}/gradmaps.yml`,
   * create a new folder `{sprite}/{gradmapName}/` and fill it
   * with copies of each subimage converted from Grayscale to
   * color using the associated gradMap.
   */
  async applyGradientMaps(deleteSourceImages?:boolean){
    const gradientMaps:[string,...GradientMap[]] = ['none',...this.getGradientMaps()];
    const waits = gradientMaps.map(async gradMap=>{
      const destFolder = path.join(
        this.spriteRoot,
        typeof gradMap=='string'?gradMap:gradMap.name
      );
      await fs.ensureDir(destFolder);
      await fs.emptyDir(destFolder);
      for(const subimagePath of this.paths){
        // Only change if matches pattern
        if(typeof gradMap != 'string' && !gradMap.canApplyToImage(this.name,path.parse(subimagePath).name)){
          continue;
        }
        const destPath = path.join(destFolder,path.basename(subimagePath));
        await fs.copyFile(subimagePath,destPath);
        if(typeof gradMap != 'string'){
          await Spritely.applyGradientMap(destPath,gradMap);
        }
      }
    });
    await Promise.all(waits);
    if(deleteSourceImages){
      this.paths.forEach(p=>fs.removeSync(p));
    }
    return this;
  }

  /**
   * Copy this sprite (folder + subimages) to another location.
   * The sprite can be renamed during the copy operation.
   */
  async copy(destinationFolder:string,options?:{name?:string}){
    const toSpriteFolder = path.join(destinationFolder,options?.name||this.name);
    await fs.ensureDir(toSpriteFolder);
    const newPaths: string[] = [];
    for(const subimagePath of this.paths){
      const newPath = path.join(toSpriteFolder,path.basename(subimagePath));
      newPaths.push(newPath);
      fs.copyFileSync(subimagePath,newPath);
    }
    return this;
  }

  /**
   * Delete subimages for this sprite. Will cause errors to be thrown
   * for many (but not all) future attempts to do anything with this
   * Spritely instance.
   */
  async delete(){
    for(const subimagePath of this.paths){
      await fs.remove(subimagePath);
    }
    // Attempt to remove the folders (and clean recursively)
    removeEmptyDirsSync(this.spriteRoot);
    this.subimagePaths = [];
    return this;
  }

  /**
   * Shorthand for .copy() followedy by .delete()
   */
  async move(destinationFolder:string){
    await this.copy(destinationFolder);
    await this.delete();
    return this;
  }

  getGradientMaps(){
    const defaultNames = ['gradmaps','gradients','gradmap','skins','skin']
      .map(name=>['yml','yaml','txt'].map(ext=>`${name}.${ext}`))
      .flat(2)
      .map(filename=>path.join(this.spriteRoot,filename));
    const fileNames = this.gradientMapsFile
      ? [this.gradientMapsFile]
      : defaultNames;
    const gradientMaps = [];
    for(const filename of fileNames){
      if(fs.existsSync(filename)){
        gradientMaps.push(...this.getGradientMapsFromFile(filename));
      }
    }
    return gradientMaps;
  }

  /**
   * Given a folder (sprite) of PNG images (subimages), return the paths
   * to all subimages.
   */
  static getSubimages(dir:string){
    const subimagePaths = fs.readdirSync(dir)
      .filter(subimagePath=>subimagePath.endsWith('.png'))
      .map(subimagePath=>path.join(dir,subimagePath));
    assert(subimagePaths.length, `No subimages found`);
    return subimagePaths;
  }

  /**
   * Given a bunch of subimages, return the dimensions of those
   * subimages. Throw an error if any subimage is a different size than the others.
   * @param path A folder containing subimages, or an array of subimage paths
   */
  static getSubimagesSizeSync(path:string|string[],allowSizeMismatch=false){
    const subimages = Array.isArray(path)
      ? path
      : Spritely.getSubimages(path);
    assertNonEmptyArray(subimages,`No subimages found.`);
    if(allowSizeMismatch){
      return {height:undefined,width:undefined};
    }
    const expectedSize = Spritely.getImageSizeSync(subimages[0]);
    subimages.forEach(subimage=>{
      const {width,height} = Spritely.getImageSizeSync(subimage);
      assert(
        width  === expectedSize.width,
        `Subimage '${subimage}' has width ${width}; expected ${expectedSize.width}`
      );
      assert(
        height === expectedSize.height,
        `Subimage '${subimage}' has height ${height}; expected ${expectedSize.height}`
      );
    });
    return expectedSize;
  }

  /** Synchronously get the size of an image */
  static getImageSizeSync(path:string){
    const dims = imageSize(path);
    assertNumberGreaterThanZero(dims.width ,`'${path}' width is not >0`);
    assertNumberGreaterThanZero(dims.height,`'${path}' height is not >0`);
    return {
      width: dims.width as number,
      height: dims.height as number
    };
  }

  static async bleed(imagePath:string,options?:SpriteEdgeCorrectionOptions){
    const img = await Image.load(imagePath) as ImageExt;
    assert(img.alpha,'Images must have an alpha channel to be corrected.');
    const maxPixelValue = Math.pow(2,img.bitDepth);
    const bleedMaxAlpha = Math.ceil(0.02 * maxPixelValue);
    const alphaChannel = img.channels-1;
    const nonAlphaChannels = [...Array(img.channels-1)].map((v,i)=>i);
    const transparentBlackPixel = [...Array(img.channels)].map(()=>0);
    if(options?.createdBy=='inkscape'){
      // Inkscape adds a rgba(255,255,255,1) 1px border around blurs. Remove it!
      for(let pixel=0; pixel<img.size; pixel++){
        const rgba = img.getPixel(pixel);
        if(nonAlphaChannels.every(channel=>rgba[channel]==maxPixelValue) && rgba[alphaChannel]==1){
          img.setPixel(pixel,transparentBlackPixel);
        }
      }
    }
    // Create a mask from the background (alpha zero) and then erode it by a few pixels.
    // Add a mask from the foreground (alpha > 0)
    // Invert to get the background pixels that need to be adjusted
    // Set the color of those pixels to the the color of the nearest foreground, and the alpha
    // to something very low so that it mostly isn't visible but won't be treated as background downstream
    const foreground = Spritely.getForegroundMask(img,(bleedMaxAlpha+1)/maxPixelValue);
    const expandedForeground = foreground
      .dilate({kernel:[ [ 1, 1, 1 ] , [ 1, 1, 1 ] , [ 1, 1, 1 ] ]}) as ImageExt;

    const isInForeground = (x:number,y:number)=>foreground.getBitXY(x,y);
    const isInExpandedForeground = (x:number,y:number)=>expandedForeground.getBitXY(x,y);
    const isInOutline = (x:number,y:number)=>isInExpandedForeground(x,y) && !isInForeground(x,y);

    // There does not seem to be a way to combine masks in image-js,
    // but we don't really need to for the desired outcome.
    // Iterate over all pixels. Those in the expanded foreground but not in the foreground
    // should be set in the original image based on nearby non-background pixels
    for(let x=0; x<img.width; x++){
      for(let y=0; y<img.height; y++){
        if(isInOutline(x,y)){
          const neighbors = [];
          for(let ax=x-1; ax<=x+1; ax++){
            for(let ay=y-1;ay<=y+1; ay++){
              if(ax==x && ay==y){continue;}
              if(isInForeground(ax,ay)){
                neighbors.push(img.getPixelXY(ax,ay));
              }
            }
          }
          if(neighbors.length){
            // average the colors
            const colorSamples:number[][] = transparentBlackPixel.map(()=>[]);
            for(const neighbor of neighbors){
              for(let channel=0;channel<img.channels;channel++){
                colorSamples[channel].push(neighbor[channel]);
              }
            }
            const newColor = colorSamples.map((sample,idx)=>{
              if(idx==img.channels-1){
                // Alpha should be 2% or half the min neighboring alpha
                const minAlpha = sample.reduce((min,value)=>Math.min(min,value),Infinity);
                return Math.ceil(Math.min(minAlpha * 0.5,bleedMaxAlpha));
              }
              else{
                // Use the average color
                return Math.round(sample.reduce((sum,value)=>sum+value,0)/sample.length);
              }
            });
            img.setPixelXY(x,y,newColor);
          }
        }
      }
    }
    await img.save(imagePath);
  }

  private static cropObjectFromBoundingBox(boundingBox:{left:number,top:number,right:number,bottom:number}){
    return {
      x: boundingBox.left,
      y: boundingBox.top,
      width:  boundingBox.right  - boundingBox.left + 1,
      height: boundingBox.bottom - boundingBox.top + 1
    };
  }

  /** Crop an image in-place. */
  private static async cropImage(imagePath:string,cropObject:{x:number,y:number,width:number,height:number}){
    const img = await Image.load(imagePath) as ImageExt;
    await img.crop(cropObject).save(imagePath);
  }

  /**
   * Check if two images are exactly equal *in pixel values*
   * (ignoring metadata).
   */
  static async imagesAreEqual(imagePath1:string,imagePath2:string){
    const img1 = await Image.load(imagePath1) as ImageExt;
    const img2 = await Image.load(imagePath2) as ImageExt;
    // Start with cheap checks, then check value-by-value aborting when one fails.
    return img1.channels == img2.channels &&
      img1.bitDepth  == img2.bitDepth &&
      img1.alpha == img2.alpha &&
      img1.size == img2.size &&
      img1.data.every((value:number,idx:number)=>value==img2.data[idx]);
  }

  /**
   * Compute a checksum based on the pixel values of an image.
   * Remains static even when file metadata changes.
   */
  private static async pixelsChecksum(imagePath:string){
    const values = (await Image.load(imagePath) as Image).data;
    return sha256(Buffer.from(values));
  }

  /**
   * Get the foreground mask (a binary imae) of an image from
   * thresholding based on the alpha channel.
   * @param foregroundMinAlphaFraction The minimum alpha value of the foreground.
   * Any alpha >= than this is considered foreground. On a 0-1 scale.
   * Defaults to 1/bitDepth (i.e. any alpha besides 0 is foreground)
   */
  private static getForegroundMask(image:ImageExt,foregroundMinAlphaFraction?:number){
    const threshold = foregroundMinAlphaFraction || 1/Math.pow(2,image.bitDepth);
    return image.getChannel(image.channels-1)
      .mask({threshold}) as ImageExt;
  }

  private static getForegroundBounds(image:ImageExt,padding=0){
    const foreground = Spritely.getForegroundMask(image);
    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;
    for(let x=0; x<foreground.width; x++){
      for(let y=0; y<foreground.height; y++){
        if(foreground.getBitXY(x,y)){
          left = Math.min(left,x);
          right = Math.max(right,x);
          top = Math.min(top,y);
          bottom = Math.max(bottom,y);
        }
      }
    }
    padding = Math.round(padding);
    if(padding>0){
      top    = Math.max(top    - padding,0);
      left   = Math.max(left   - padding,0);
      right  = Math.min(right  + padding,foreground.width -1);
      bottom = Math.min(bottom + padding,foreground.height-1);
    }
    return {
      left:   left  ==  Infinity ? 0 : left,
      right:  right == -Infinity ? foreground.width-1 : right,
      top:    top   ==  Infinity ? 0 : top,
      bottom: bottom== -Infinity ? foreground.height-1 : bottom
    };
  }

  /**
   * Get a list of GradientMaps from a file, with expected format (per line):
   * `gradient-name: position1, colorHex1; position2, colorHex2`
   * Where there can be extra space padding, 'gradient-name' should be forced
   * to kebab case, 'positions' are numbers from 0-100 representing position
   * along the grayscale pallette, and 'colorHex' are RGB colors in hex format.
   */
  private getGradientMapsFromFile(filepath:string){
    assert(fs.existsSync(filepath),`GradientMap file '${filepath}' does not exist.`);
    const skinInfo = yaml.parse(fs.readFileSync(filepath,'utf8')) as GradientMapsFile;
    const skins = Object.keys(skinInfo.skins);
    return skins.map(skin=>{
      const colorMap = skinInfo.skins[skin];
      const patterns = !skinInfo.groups || !skinInfo.groups.length
        ? true
        : skinInfo.groups
          .filter(group=>group.skins.includes(skin))
          .map(group=>{
            return {
              pattern: new RegExp(group.pattern,'i'),
              match: group.match || 'subimage'
            };
          });
      if(Array.isArray(patterns) && !patterns.length){
        return false;
      }
      return new GradientMap(skin,colorMap,patterns===true?[]:patterns);
    }).filter(x=>x) as GradientMap[];
  }

  private static async applyGradientMap(path:string,gradient:GradientMap){
    const image = await Image.load(path) as ImageExt;
    const isRgb = (image.alpha && image.channels==4) || (!image.alpha && image.channels==3);
    for(let x=0; x<image.width; x++){
      for(let y=0; y<image.height; y++){
        const currentColor = image.getPixelXY(x,y);
        const getRelativeIntensity = (value:number)=>value/Math.pow(2,image.bitDepth);
        if(!image.alpha || currentColor[image.channels-1]>0){
          let relativeIntensity = getRelativeIntensity(currentColor[0]);
          const pixelIsGray = currentColor.every((value,i)=>{
            const isAlphaChannel = image.alpha && i==image.channels-1;
            if(isAlphaChannel){ return true; }
            return value == currentColor[0];
          });
          // (assumed to be grayscale, so that all values are the same)
          if(!pixelIsGray){
            assert(isRgb,`Images must be in grayscale or RGB(A) color.`);
            // Then this pixel isn't grayscale, so compute intensity
            relativeIntensity = getRelativeIntensity(0.2126*currentColor[0] + 0.7152*currentColor[1] + 0.0722*currentColor[2]);
          }
          const newPosition = Math.floor(relativeIntensity*100);
          const newColor = gradient.getColorAtPosition(newPosition);
          image.setPixelXY(x,y,newColor.rgb);
        }
      }
    }
    await image.save(path);
  }
}