import crypto from "crypto";

/**
 * From Lodash {@link https://github.com/lodash/lodash/blob/master/clamp.js}
 */
export function clamp(number:number, lower:number, upper:number) {
  number = +number;
  lower = +lower;
  upper = +upper;
  lower = lower === lower ? lower : 0;
  upper = upper === upper ? upper : 0;
  if (number === number) {
    number = number <= upper ? number : upper;
    number = number >= lower ? number : lower;
  }
  return number;
}

export function randomHex (bytes=8): Promise<string>{
  return new Promise((resolve,reject)=>{
    crypto.randomBytes(bytes,(err,buffer)=>{
      if(err){
        return reject(err);
      }
      return resolve( buffer.toString('hex'));
    });
  });
}
