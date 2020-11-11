
import {
  assert
} from "./errors";

type RgbTuple = [r: number, g: number, b: number];
type RgbaTuple = [r: number, g: number, b: number, a:number];

export class Color {
  /** Color as RGB tuple (each color in 0-255 scale) */
  readonly rgba: RgbaTuple;
  /** Hexadecimal representation of color */
  readonly rgbaHex: string;

  constructor(color:string|RgbTuple|RgbaTuple){
    if(typeof color == 'string'){
      // Then assume it's hex
      if(color[0]=='#'){
        // Remove optional leading "#"
        color = color.slice(1);
      }
      assert(color.match(/^[a-f0-9]{6,8}$/i),`Color ${color} is not valid hexadecimal`);
      this.rgbaHex = color.toLowerCase();
      if(this.rgbaHex.length != 8){
        this.rgbaHex = this.rgbaHex.slice(0,6) + 'ff';
      }
      this.rgba = (this.rgbaHex.match(/(\w{2})/g) as [string,string,string,string])
        .map(hex=>parseInt(hex,16)) as RgbaTuple;
    }
    else{
      assert([3,4].includes(color.length),'Color must a an array of 3 or 4 values, or a hex string');
      assert(color.every(value=>value>=0 && value<=255), 'Every color value must be in range 0-255');
      assert(color.every(value=>Math.floor(value)==value), 'Every color value must be an integer');
      color[3] = color[3] ?? 255 ;
      this.rgba = color as RgbaTuple;
      this.rgbaHex = color.map(value=>Number(value).toString(16)).join('');
    }
  }

  get red(){
    return this.rgba[0];
  }

  get green(){
    return this.rgba[1];
  }

  get blue(){
    return this.rgba[2];
  }

  get alpha(){
    return this.rgba[3];
  }

  /** RGB values as 0-255 array */
  get rgb(){
    return this.rgba.slice(0,3) as RgbTuple;
  }

  /** RGB values as a hex string */
  get rgbHex(){
    return this.rgbaHex.slice(0,6);
  }

  get rgbaObject(){
    return {
      red:   this.rgba[0],
      green: this.rgba[1],
      blue:  this.rgba[2],
      alpha: this.rgba[3],
    };
  }

  get rgbObject(): {red:number,green:number,blue:number}{
    const obj = this.rgbaObject;
    Reflect.deleteProperty(obj,'alpha');
    return obj;
  }

  equalsRgb(color:Color){
    return this.rgb.every((value,i)=>color.rgba[i]==value);
  }

  equalsRgba(color:Color){
    return this.rgba.every((value,i)=>color.rgba[i]==value);
  }

  toJSON(){
    return this.rgbaObject;
  }
}
