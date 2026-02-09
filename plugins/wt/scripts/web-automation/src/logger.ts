/**
 * Structured logging utility for WT publishing scripts
 *
 * Provides consistent logging with levels, timestamps, and context.
 * Replaces scattered console.error/console.log calls.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LoggerOptions {
  level?: LogLevel;
  context?: string;
  outputFile?: string;
}

export interface ErrorMetadata {
  name?: string;
  message?: string;
  stack?: string;
}

export class Logger {
  private readonly context: string;
  private readonly options: Required<LoggerOptions>;

  constructor(
    context: string,
    options: LoggerOptions = {}
  ) {
    this.context = context;
    this.options = {
      level: options.level ?? LogLevel.INFO,
      context: options.context ?? context,
      outputFile: options.outputFile ?? '',
    };
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const errorMeta: Record<string, unknown> = { ...meta };

    if (error instanceof Error) {
      errorMeta.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } as ErrorMetadata;
    } else if (error) {
      errorMeta.error = error;
    }

    this.log(LogLevel.ERROR, message, errorMeta);
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (level < this.options.level) return;

    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    const prefix = `[${timestamp}] [${levelStr}] [${this.context}]`;

    const logLine = meta
      ? `${prefix} ${message} ${JSON.stringify(meta)}`
      : `${prefix} ${message}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(logLine);
        break;
      case LogLevel.WARN:
        console.warn(logLine);
        break;
      case LogLevel.DEBUG:
        console.debug(logLine);
        break;
      default:
        console.log(logLine);
    }

    // TODO: Add file output if outputFile is specified
    // if (this.options.outputFile) { ... }
  }
}

export function createLogger(context: string, options?: LoggerOptions): Logger {
  return new Logger(context, options);
}

/**
 * Get log level from environment variable or string
 */
export function parseLogLevel(levelStr?: string): LogLevel {
  if (!levelStr) return LogLevel.INFO;

  const upper = levelStr.toUpperCase();
  switch (upper) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
    case 'WARNING':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    default:
      return LogLevel.INFO;
  }
}

/**
 * Get default log level from environment variable
 */
export function getDefaultLogLevel(): LogLevel {
  return parseLogLevel(process.env.LOG_LEVEL);
}
