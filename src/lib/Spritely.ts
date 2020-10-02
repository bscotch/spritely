import fs from "fs-extra";
import path from "path";
import {
  assert,
  assertDirectoryExists,
  assertNonEmptyArray,
  assertNumberGreaterThanZero,
  SpritelyError,
} from "./errors";
import {default as sharp, Sharp } from "sharp";

// The 'image-size' module allows for synchronous operation,
// which is not provided by 'sharp' (the primary image manipulation pipeline),
// but is needed since Typescript constructors are synchronous.
import {imageSize} from "image-size";

export class Spritely {

  private spriteRoot: string;
  private subimagePaths: string[];
  private subimageWidth: number;
  private subimageHeight: number;
  private subimages: Sharp[];

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
    this.subimages = this.subimagePaths.map(subimagePath=>sharp(subimagePath));
  }

  get width(){
    return this.subimageWidth;
  }

  get height(){
    return this.subimageHeight;
  }

  get paths(){
    return [...this.subimagePaths];
  }

  /** Attempt to reduce the disk size of the subimages. */
  async optimize(){
    // TODO: Resave as PNG with compression options
  }

  /**
   * Remove excess padding around subimages.
   * **WARNING:** this will overwrite your images!
   * @param maxPadding  Number of padding pixels to keep.
   *                    This should be at least 1 if border correction is also needed.
   */
  async setPadding(maxPadding=3){
    // TODO: Run the sharp autocropper on each image to find each bounding box
    await Promise.all(this.subimages.map(async subimage=>{
      await subimage.trim(10);
      // TODO: Get the trim offsets somehow?
    });
    // TODO: Create a collective bounding box that includes all subimage bounding boxes
    // TODO: Add the maxpadding factor
    // TODO: Crop all images with the new bounding box and save.
    throw new SpritelyError('fixPadding is not implemented');
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
}