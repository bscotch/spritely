import fs from "fs-extra";
import path from "path";
import {
  assert,
  assertDirectoryExists,
  assertNonEmptyArray,
  assertNumberGreaterThanZero,
} from "./errors";
import {Image} from "image-js";


// The 'image-size' module allows for synchronous operation,
// which is not provided by 'sharp' (the primary image manipulation pipeline),
// but is needed since Typescript constructors are synchronous.
import {imageSize} from "image-size";
import { sha256 } from "./utility";

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

export class Spritely {

  private spriteRoot: string;
  private subimagePaths: string[];
  private subimageWidth: number;
  private subimageHeight: number;

  /**
   * Create a Sprite instance using a folder full of sprite subimages.
   */
  constructor(directory?:string){
    this.spriteRoot = directory || process.cwd();
    assertDirectoryExists(this.spriteRoot);

    this.subimagePaths = Spritely.getSubimages(this.spriteRoot);
    const {width,height} = Spritely.getSubimagesSizeSync(this.subimagePaths);
    this.subimageWidth = width;
    this.subimageHeight = height;
  }

  get width(){ return this.subimageWidth; }
  get height(){ return this.subimageHeight; }
  get paths(){ return [...this.subimagePaths]; }

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
      const subimageBoundingBox = Spritely.getForegroundBounds(img);
      boundingBox.left   = Math.min(boundingBox.left  ,subimageBoundingBox.left  );
      boundingBox.top    = Math.min(boundingBox.top   ,subimageBoundingBox.top   );
      boundingBox.right  = Math.max(boundingBox.right ,subimageBoundingBox.right );
      boundingBox.bottom = Math.max(boundingBox.bottom,subimageBoundingBox.bottom);
    }));
    // Add the additional padding
    boundingBox.top    = Math.max(boundingBox.top    - extraPadding,0);
    boundingBox.left   = Math.max(boundingBox.left   - extraPadding,0);
    boundingBox.right  = Math.min(boundingBox.right  + extraPadding,this.width -1);
    boundingBox.bottom = Math.min(boundingBox.bottom + extraPadding,this.height-1);
    const cropObject = {
      x: boundingBox.left,
      y: boundingBox.top,
      width:  boundingBox.right  - boundingBox.left + 1,
      height: boundingBox.bottom - boundingBox.top + 1
    };
    await Promise.all(this.paths.map(async path=>{
      const img = await Image.load(path) as ImageExt;
      await img.crop(cropObject).save(path);
    }));
    return this;
  }

  /** Correct aliasing issues */
  async alphaline(){
    await Promise.all(this.paths.map(path=>Spritely.alphaline(path)));
    return this;
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
  static getSubimagesSizeSync(path:string|string[]){
    const subimages = Array.isArray(path)
      ? path
      : Spritely.getSubimages(path);
    assertNonEmptyArray(subimages,`No subimages found.`);
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

  /**
   * Postfix a filename with a string
   *
   * @example
   * `postfixFilename("hello/world.png","123") -> "hello/world-123.png"`
   */
  static postfixFilename(sourceFile:string,postfix:string){
    const {dir,name,ext} = path.parse(sourceFile);
    return path.join(dir,`${name}-${postfix}${ext}`);
  }

  static async alphaline(imagePath:string,options?:SpriteEdgeCorrectionOptions){
    const img = await Image.load(imagePath) as ImageExt;
    assert(img.alpha,'Images must have an alpha channel to be corrected.');
    const maxPixelValue = Math.pow(2,img.bitDepth);
    const alphalineMaxValue = Math.ceil(0.02 * maxPixelValue);
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
    const foreground = Spritely.getForegroundMask(img,(alphalineMaxValue+1)/maxPixelValue);
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
                return Math.ceil(Math.min(minAlpha * 0.5,alphalineMaxValue));
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

  /**
   * Check if two images are exactly equal *in pixel values*
   * (ignoring metadata).
   */
  static async imagesAreEqual(imagePath1:string,imagePath2:string){
    const [img1,img2] = await Promise
      .all([imagePath1,imagePath2].map(img=>Image.load(img) as Promise<ImageExt>));
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
  static async pixelsChecksum(imagePath:string){
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
  static getForegroundMask(image:ImageExt,foregroundMinAlphaFraction?:number){
    const threshold = foregroundMinAlphaFraction || 1/Math.pow(2,image.bitDepth);
    return image.getChannel(image.channels-1)
      .mask({threshold}) as ImageExt;
  }

  static getForegroundBounds(image:ImageExt){
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
    return {
      left:   left  ==  Infinity ? 0 : left,
      right:  right == -Infinity ? foreground.width-1 : right,
      top:    top   ==  Infinity ? 0 : top,
      bottom: bottom== -Infinity ? foreground.height-1 : bottom
    };
  }
}