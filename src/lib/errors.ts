import fs from "fs-extra";

function logThrownError(error:Error|SpritelyError){
  fs.appendFileSync('node.error.log',error?.stack||error.message);
  throw error;
}

process.on('unhandledRejection', logThrownError);
process.on('uncaughtException', logThrownError);

export class SpritelyError extends Error {
  constructor(message:string){
    super(message);
    this.name = 'SpritelyError';
  }
}

/** Throw an error if `claim` is falsey */
export function assert(claim:any,messageIfFalsey:string){
  if(!claim){
    throw new SpritelyError(messageIfFalsey);
  }
}

export function assertDirectoryExists(directory:string){
  assert(
    fs.existsSync(directory),
    `${directory} does not exist`
  );
  assert(
    fs.statSync(directory).isDirectory(),
    `${directory} is not a folder`
  );
}

export function assertNonEmptyArray(something:any,message="Expected non-empty array."){
  assert(Array.isArray(something) && something.length, message);
}

export function assertNumberGreaterThanZero(something:any,message="Expected number greater than zero."){
  assert(typeof something == 'number' && something>0, message);
}
