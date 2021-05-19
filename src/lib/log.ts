import chalk from 'chalk';

const logLevelColors = {
  debug: 'bgGray',
  info: 'bgGreen',
  warning: 'bgYellow',
  error: 'bgRed',
} as const;

type LogLevel = keyof typeof logLevelColors;

function getTimestamp() {
  const now = new Date();
  const hour = `${now.getHours()}`.padStart(2, '0');
  const minute = `${now.getMinutes()}`.padStart(2, '0');
  const seconds = `${now.getSeconds()}`.padStart(2, '0');
  return `${hour}:${minute}:${seconds}`;
}

function log(level: LogLevel, ...stuff: any[]) {
  const message = stuff.reduce((msg, item) => {
    const itemAsString =
      typeof item == 'object' ? JSON.stringify(item) : `${item}`;
    if (!itemAsString) {
      return msg;
    }
    if (!msg) {
      return itemAsString;
    }
    return `${msg} ${itemAsString}`;
  }, '');
  const prefix = ` ${level.toUpperCase()} `;
  const colorer = chalk.black[logLevelColors[level]];
  const prettyMessage = `${colorer(prefix)}${chalk.gray(
    getTimestamp(),
  )} ${message} ${colorer('>')}`;
  console.log(prettyMessage);
  return prettyMessage;
}

export function debug(...stuff: any[]) {
  if (process.env.DEBUG == 'true') {
    return log('debug', ...stuff);
  }
}

export function info(...stuff: any[]) {
  return log('info', ...stuff);
}

export function error(...stuff: any[]) {
  return log('error', ...stuff);
}

export function warning(...stuff: any[]) {
  return log('warning', ...stuff);
}
