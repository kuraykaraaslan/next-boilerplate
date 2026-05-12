import winston from 'winston';
import { env } from '@/modules/env';

const { combine, timestamp, json, printf } = winston.format;
const timestampFormat = 'MMM-DD-YYYY HH:mm:ss';

function makeTransports(level: string) {
  if (env.NODE_ENV === 'vercel' || env.NODE_ENV === 'development') {
    return [new winston.transports.Console()];
  }
  return [
    new winston.transports.File({
      filename: 'logs/' + new Date().toISOString().split('T')[0] + '.log',
      level,
    }),
  ];
}

function makeLogger(level: string) {
  return winston.createLogger({
    level,
    format: combine(
      timestamp({ format: timestampFormat }),
      json(),
      printf(({ level: l, message, timestamp: ts }) => `[${ts}] [${l}]: ${message}`)
    ),
    transports: makeTransports(level),
  });
}

export default class Logger {
  private static infoLogger = makeLogger('info');
  private static errorLogger = makeLogger('error');
  private static warnLogger = makeLogger('warn');

  private static serialize(...args: any[]): string {
    return args
      .map(a => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a)))
      .join(' ');
  }

  static info(message: string, ...args: any[]) {
    Logger.infoLogger.info(args.length > 0 ? `${message} ${Logger.serialize(...args)}` : message);
  }

  static error(message: string, ...args: any[]) {
    Logger.errorLogger.error(args.length > 0 ? `${message} ${Logger.serialize(...args)}` : message);
  }

  static warn(message: string, ...args: any[]) {
    Logger.warnLogger.warn(args.length > 0 ? `${message} ${Logger.serialize(...args)}` : message);
  }

  static debug(message: string, ...args: any[]) {
    const msg = args.length > 0 ? `[DEBUG] ${message} ${Logger.serialize(...args)}` : `[DEBUG] ${message}`;
    Logger.infoLogger.info(msg);
  }
}
