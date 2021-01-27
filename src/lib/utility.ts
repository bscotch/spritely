import { wait } from "@bscotch/utility";
import crypto from "crypto";
import fs from "fs-extra";

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

export function sha256 (data: crypto.BinaryLike){
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}

/**
 * Wrap a file function so that it can auto-retry on EBUSY and EPERM errors
 * (these are caused when Dropbox tries to do something on the same files).
 */
function wrapWithRetryOnFileError<
  FileOpFunction extends ((...args:any[])=>any)
>(fileOpFunction:FileOpFunction){
  const retriableFunction = async (...args: Parameters<FileOpFunction>):Promise<ReturnType<FileOpFunction>> =>{
    let fails = 0;
    try{
      return await fileOpFunction(...args);
    }
    catch(err){
      fails++;
      const message = err?.message;
      const isPotentialDropboxError = message?.startsWith("EBUSY") ||
        message?.startsWith("EPERM");
      if(fails<10 && isPotentialDropboxError){
        await wait(100);
        return retriableFunction(...args);
      }
      throw err;
    }
  };
  return retriableFunction;
}

type WriteFileFn = (file:string,data:string|Buffer)=>Promise<void>;

export const writeFile = wrapWithRetryOnFileError<WriteFileFn>(fs.writeFile);

// TODO: Wrap the other file-management functions and use them!
