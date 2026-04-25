/**
 * Lightweight logger for scripts/ directory
 *
 * Provides console-aware logging that respects a global silent flag
 * for test suppression. Follows the same interface as the rd3 logger.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

let globalSilent = false;

export function setGlobalSilent(silent: boolean): void {
    globalSilent = silent;
}

export function isGlobalSilent(): boolean {
    return globalSilent;
}

const LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    silent: 4,
};

export class Logger {
    private level: number;

    constructor(level: LogLevel = 'info') {
        this.level = LEVELS[level];
    }

    debug(message: string, ...args: unknown[]): void {
        if (this.level > LEVELS.debug || globalSilent) return;
        console.debug(message, ...args);
    }

    info(message: string, ...args: unknown[]): void {
        if (this.level > LEVELS.info || globalSilent) return;
        console.info(message, ...args);
    }

    warn(message: string, ...args: unknown[]): void {
        if (this.level > LEVELS.warn || globalSilent) return;
        console.warn(message, ...args);
    }

    error(message: string, ...args: unknown[]): void {
        if (this.level > LEVELS.error || globalSilent) return;
        console.error(message, ...args);
    }

    log(...args: unknown[]): void {
        if (globalSilent) return;
        console.log(...args);
    }
}

export const logger = new Logger();

export function createLogger(level: LogLevel): Logger {
    return new Logger(level);
}
