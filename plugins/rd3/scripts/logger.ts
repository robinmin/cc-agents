/**
 * Logger utilities for rd3 plugin
 *
 * Provides structured logging with levels and formatting
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LoggerOptions {
    /** Minimum log level to output */
    level?: LogLevel;
    /** Prefix for all log messages */
    prefix?: string;
    /** Enable colored output */
    color?: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    silent: 4,
};

export const COLORS = {
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
};

/** Global silent flag - when set to true, all logger output is suppressed */
let globalSilent = false;

function isQuietModeEnabled(): boolean {
    const value = process.env.RD3_LOG_QUIET;
    return value === '1' || value === 'true';
}

/**
 * Set global silent mode for all logger instances.
 * Useful during testing to suppress all output.
 */
export function setGlobalSilent(silent: boolean): void {
    globalSilent = silent;
}

/**
 * Check if global silent mode is enabled
 */
export function isGlobalSilent(): boolean {
    return globalSilent;
}

export class Logger {
    private level: number;
    private prefix: string;
    private color: boolean;

    constructor(options: LoggerOptions = {}) {
        this.level = LOG_LEVELS[options.level ?? 'info'];
        this.prefix = options.prefix ?? '';
        this.color = options.color ?? true;
    }

    private format(level: string, message: string, color: string): string {
        const timestamp = new Date().toISOString();
        const prefix = this.prefix ? `[${this.prefix}] ` : '';

        if (this.color) {
            return `${COLORS.dim}${timestamp}${COLORS.reset} ${color}${level.padEnd(5)}${COLORS.reset} ${prefix}${message}`;
        }

        return `${timestamp} ${level.padEnd(5)} ${prefix}${message}`;
    }

    debug(message: string, ...args: unknown[]): void {
        if (!globalSilent && !isQuietModeEnabled() && this.level <= LOG_LEVELS.debug) {
            console.debug(this.format('DEBUG', message, COLORS.cyan), ...args);
        }
    }

    info(message: string, ...args: unknown[]): void {
        if (!globalSilent && !isQuietModeEnabled() && this.level <= LOG_LEVELS.info) {
            console.info(this.format('INFO', message, COLORS.green), ...args);
        }
    }

    warn(message: string, ...args: unknown[]): void {
        if (!globalSilent && !isQuietModeEnabled() && this.level <= LOG_LEVELS.warn) {
            console.warn(this.format('WARN', message, COLORS.yellow), ...args);
        }
    }

    error(message: string, ...args: unknown[]): void {
        if (!globalSilent && !isQuietModeEnabled() && this.level <= LOG_LEVELS.error) {
            console.error(this.format('ERROR', message, COLORS.red), ...args);
        }
    }

    /** Log a success message with checkmark */
    success(message: string): void {
        if (!globalSilent && !isQuietModeEnabled() && this.level <= LOG_LEVELS.info) {
            const check = this.color ? `${COLORS.green}[OK]${COLORS.reset}` : '[OK]';
            console.log(`${check} ${message}`);
        }
    }

    /** Log an error with X mark */
    fail(message: string): void {
        if (!globalSilent && !isQuietModeEnabled() && this.level <= LOG_LEVELS.error) {
            const x = this.color ? `${COLORS.red}[X]${COLORS.reset}` : '[X]';
            console.error(`${x} ${message}`);
        }
    }

    /**
     * General-purpose log that respects globalSilent.
     * Does not add prefixes or timestamps - outputs exactly what console.log would.
     * Use this for CLI output that should be suppressed during tests.
     */
    log(...args: unknown[]): void {
        if (!globalSilent) {
            console.log(...args);
        }
    }
}

/** Default logger instance */
export const logger = new Logger();

/** Create a new logger with options */
export function createLogger(options: LoggerOptions): Logger {
    return new Logger(options);
}
