/**
 * Logger utilities for rd3 plugin
 *
 * Provides structured logging with levels, formatting, and file appenders
 */

import { access, mkdir, open, readdir, rm, type FileHandle } from './fs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LoggerOptions {
    /** Minimum log level to output */
    level?: LogLevel;
    /** Prefix for all log messages */
    prefix?: string;
    /** Enable colored output */
    color?: boolean;
    /** File appender configuration */
    file?: boolean | FileAppenderConfig;
}

// ============================================================================
// File Appender Types
// ============================================================================

/** Configuration for file appender */
export interface FileAppenderConfig {
    /** Directory path for log files */
    dir?: string;
    /** Base filename without extension */
    filename?: string;
    /** Daily rotation - create new file each day */
    dailyRotation?: boolean;
    /** Maximum number of rotated log files to retain */
    maxFiles?: number;
    /** Minimum log level to write to file (default: info) */
    level?: LogLevel;
}

/** Interface for log appenders */
export interface FileAppender {
    /** Write a log entry to the appender */
    append(level: LogLevel, message: string, timestamp: Date): Promise<void>;
    /** Flush any buffered writes */
    flush(): Promise<void>;
    /** Close the appender and clean up resources */
    close(): Promise<void>;
}

// ============================================================================
// Log Level Mapping
// ============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    silent: 4,
};

// ============================================================================
// Colors
// ============================================================================

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

// ============================================================================
// Global Logger Enable State
// ============================================================================

/**
 * Unified logger enable state.
 * - console: controls console output (stdout/stderr)
 * - file: controls file appender output
 */
interface LoggerState {
    console: boolean;
    file: boolean;
}

let state: LoggerState = { console: true, file: true };

/**
 * Unified function to enable/disable logger output channels.
 *
 * @param console - Enable console output (true) or suppress it (false)
 * @param file - Enable file output (true) or suppress it (false)
 *
 * @example
 * enableLogger(true, true);   // all on (default)
 * enableLogger(false, false);  // all off
 * enableLogger(true, false);   // console only
 * enableLogger(false, true);   // file only
 */
export function enableLogger(console: boolean, file: boolean): void {
    state = { console, file };
}

/**
 * Check current logger enable state.
 * @returns Current { console, file } state
 */
export function isLoggerEnabled(): LoggerState {
    return { ...state };
}

/**
 * Check if console output is enabled.
 * @deprecated Use isLoggerEnabled().console instead
 */
export function isGlobalSilent(): boolean {
    return !state.console;
}

/**
 * Set global silent mode for all logger instances.
 * Suppresses both console and file output.
 * @deprecated Use enableLogger(false, false) instead
 */
export function setGlobalSilent(silent: boolean): void {
    enableLogger(!silent, !silent);
}

/**
 * Check if global console silent mode is enabled.
 * @deprecated Use isLoggerEnabled().console === false instead
 */
export function isGlobalConsoleSilent(): boolean {
    return !state.console;
}

/**
 * Set global console silent mode for all logger instances.
 * Suppresses console output but file appender still writes.
 * @deprecated Use enableLogger(false, true) to suppress console only,
 *            or enableLogger(true, true) to restore all output.
 */
export function setGlobalConsoleSilent(silent: boolean): void {
    enableLogger(!silent, state.file);
}

// ============================================================================
// Console Quiet Mode
// ============================================================================

function isQuietModeEnabled(): boolean {
    const value = process.env.RD3_LOG_QUIET;
    return value === '1' || value === 'true';
}

function parseBooleanEnv(name: string, defaultValue: boolean): boolean {
    const value = process.env[name];
    if (value === undefined) {
        return defaultValue;
    }
    return value !== '0' && value !== 'false';
}

function parseIntegerEnv(name: string, defaultValue: number): number {
    const value = process.env[name];
    if (!value) {
        return defaultValue;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function resolveFileAppenderConfig(file?: boolean | FileAppenderConfig): FileAppenderConfig | null {
    if (file === false || !parseBooleanEnv('LOG_FILE_ENABLED', true)) {
        return null;
    }

    const config = typeof file === 'object' ? file : {};
    const dir = config.dir ?? process.env.LOG_DIR;
    if (!dir) {
        return null;
    }

    const fileLevel = process.env.LOG_FILE_LEVEL as LogLevel | undefined;
    return {
        dir,
        filename: config.filename ?? process.env.LOG_FILENAME ?? 'rd3',
        dailyRotation: config.dailyRotation ?? parseBooleanEnv('LOG_DAILY_ROTATION', true),
        maxFiles: config.maxFiles ?? parseIntegerEnv('LOG_MAX_FILES', 7),
        level: config.level ?? fileLevel ?? 'info',
    };
}

// ============================================================================
// File Appender Implementation
// ============================================================================

/**
 * Async file appender with daily rotation support.
 * Uses Bun's native file system APIs for high-performance async writes.
 */
export class AsyncFileAppender implements FileAppender {
    private dir: string;
    private filename: string;
    private dailyRotation: boolean;
    private maxFiles: number;
    private fileLevel: number;
    private currentDate: string;
    private fd: FileHandle | null = null;
    private buffer: string[] = [];
    private readonly flushInterval: number;
    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private closed = false;

    constructor(config: FileAppenderConfig) {
        this.dir = config.dir ?? process.env.LOG_DIR ?? '.logs';
        this.filename = config.filename ?? process.env.LOG_FILENAME ?? 'rd3';
        this.dailyRotation = config.dailyRotation ?? true;
        this.maxFiles = config.maxFiles ?? 7;
        this.fileLevel = LOG_LEVELS[config.level ?? 'info'];
        this.currentDate = this.getDateString(new Date());
        this.flushInterval = 1000; // Flush every second
    }

    private getDateString(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    private getLogFilePath(date?: string): string {
        if (!this.dailyRotation) {
            return `${this.dir}/${this.filename}.log`;
        }
        const dateStr = date ?? this.currentDate;
        return `${this.dir}/${this.filename}.${dateStr}.log`;
    }

    private async ensureDir(): Promise<void> {
        try {
            await access(this.dir);
        } catch {
            try {
                await mkdir(this.dir, { recursive: true });
            } catch {
                // Ignore errors (might already exist due to race condition)
            }
        }
    }

    private async openFile(): Promise<FileHandle> {
        await this.ensureDir();
        const path = this.getLogFilePath();
        return await open(path, 'a+');
    }

    private async getFd(): Promise<FileHandle> {
        if (this.fd === null) {
            this.fd = await this.openFile();
            this.startFlushTimer();
        }
        return this.fd;
    }

    private startFlushTimer(): void {
        if (this.flushTimer !== null) return;

        this.flushTimer = setInterval(async () => {
            await this.flushInternal();
        }, this.flushInterval);
    }

    private async flushInternal(): Promise<void> {
        if (this.buffer.length === 0) return;

        const lines = this.buffer.splice(0);
        const content = `${lines.join('')}\n`;

        try {
            const fd = await this.getFd();
            await fd.write(content);
        } catch {
            // Failed to write, put lines back in buffer
            this.buffer.unshift(...lines);
            console.error('[AsyncFileAppender] Flush failed');
        }
    }

    async append(level: LogLevel, message: string, timestamp: Date): Promise<void> {
        if (this.closed) return;
        if (LOG_LEVELS[level] < this.fileLevel) return;

        const dateStr = this.getDateString(timestamp);

        // Check for daily rotation
        if (this.dailyRotation && dateStr !== this.currentDate) {
            await this.rotate(dateStr);
        }

        const levelStr = level.toUpperCase().padEnd(5);
        const line = `${timestamp.toISOString()} ${levelStr} ${message}`;
        this.buffer.push(line);
    }

    private async rotate(newDate: string): Promise<void> {
        await this.releaseFileHandle();
        this.currentDate = newDate;
        await this.cleanupOldFiles();
        this.fd = await this.openFile();
        this.startFlushTimer();
    }

    private async cleanupOldFiles(): Promise<void> {
        try {
            const files = await this.listRotatedFiles();

            if (files.length > this.maxFiles) {
                files.sort();
                const toDelete = files.slice(0, files.length - this.maxFiles);
                for (const file of toDelete) {
                    try {
                        await rm(file);
                    } catch {
                        // Ignore deletion errors
                    }
                }
            }
        } catch {
            // Cleanup errors are non-fatal
        }
    }

    private async listRotatedFiles(): Promise<string[]> {
        try {
            const entries = await readdir(this.dir);
            const prefix = `${this.filename}.`;
            return entries
                .filter((entry) => entry.startsWith(prefix) && entry.endsWith('.log'))
                .map((entry) => `${this.dir}/${entry}`);
        } catch {
            return [];
        }
    }

    private async releaseFileHandle(): Promise<void> {
        if (this.flushTimer !== null) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }

        await this.flushInternal();

        if (this.fd !== null) {
            try {
                await this.fd.close();
            } catch {
                // Ignore close errors
            }
            this.fd = null;
        }
    }

    async flush(): Promise<void> {
        await this.flushInternal();
    }

    async close(): Promise<void> {
        if (this.closed) return;
        this.closed = true;
        await this.releaseFileHandle();
    }
}

// ============================================================================
// Logger Class
// ============================================================================

export class Logger {
    private level: number;
    private prefix: string;
    private color: boolean;
    private fileAppender: FileAppender | null = null;

    constructor(options: LoggerOptions = {}) {
        this.level = LOG_LEVELS[options.level ?? 'info'];
        this.prefix = options.prefix ?? '';
        this.color = options.color ?? true;

        const fileConfig = resolveFileAppenderConfig(options.file);
        if (fileConfig) {
            this.fileAppender = new AsyncFileAppender(fileConfig);
        }
    }

    private format(level: string, message: string, color: string): string {
        const timestamp = new Date();
        const prefix = this.prefix ? `[${this.prefix}] ` : '';

        if (this.color) {
            return `${COLORS.dim}${timestamp.toISOString()}${COLORS.reset} ${color}${level.padEnd(5)}${COLORS.reset} ${prefix}${message}`;
        }

        return `${timestamp.toISOString()} ${level.padEnd(5)} ${prefix}${message}`;
    }

    private shouldOutputConsole(): boolean {
        return state.console && parseBooleanEnv('LOG_CONSOLE', true) && !isQuietModeEnabled();
    }

    private shouldOutputFile(): boolean {
        return state.file && parseBooleanEnv('LOG_FILE_ENABLED', true);
    }

    private async writeToFile(level: LogLevel, message: string): Promise<void> {
        if (this.fileAppender) {
            try {
                await this.fileAppender.append(level, message, new Date());
            } catch {
                // File write errors should not break console logging
                console.error('[Logger] File append failed: write failed');
            }
        }
    }

    debug(message: string, ...args: unknown[]): void {
        if (this.level > LOG_LEVELS.debug) return;
        if (this.shouldOutputConsole()) {
            const output = this.format('DEBUG', message, COLORS.cyan);
            console.debug(output, ...args);
        }
        if (this.shouldOutputFile()) {
            this.writeToFile('debug', `${message} ${args.map((a) => JSON.stringify(a)).join(' ')}`.trim());
        }
    }

    info(message: string, ...args: unknown[]): void {
        if (this.level > LOG_LEVELS.info) return;
        if (this.shouldOutputConsole()) {
            const output = this.format('INFO', message, COLORS.green);
            console.info(output, ...args);
        }
        if (this.shouldOutputFile()) {
            this.writeToFile('info', `${message} ${args.map((a) => JSON.stringify(a)).join(' ')}`.trim());
        }
    }

    warn(message: string, ...args: unknown[]): void {
        if (this.level > LOG_LEVELS.warn) return;
        if (this.shouldOutputConsole()) {
            const output = this.format('WARN', message, COLORS.yellow);
            console.warn(output, ...args);
        }
        if (this.shouldOutputFile()) {
            this.writeToFile('warn', `${message} ${args.map((a) => JSON.stringify(a)).join(' ')}`.trim());
        }
    }

    error(message: string, ...args: unknown[]): void {
        if (this.level > LOG_LEVELS.error) return;
        if (this.shouldOutputConsole()) {
            const output = this.format('ERROR', message, COLORS.red);
            console.error(output, ...args);
        }
        if (this.shouldOutputFile()) {
            this.writeToFile('error', `${message} ${args.map((a) => JSON.stringify(a)).join(' ')}`.trim());
        }
    }

    /** Log a success message with checkmark */
    success(message: string): void {
        if (this.level > LOG_LEVELS.info) return;
        if (this.shouldOutputConsole()) {
            const check = this.color ? `${COLORS.green}[OK]${COLORS.reset}` : '[OK]';
            console.log(`${check} ${message}`);
        }
        if (this.shouldOutputFile()) {
            this.writeToFile('info', `[OK] ${message}`);
        }
    }

    /** Log an error with X mark */
    fail(message: string): void {
        if (this.level > LOG_LEVELS.error) return;
        if (this.shouldOutputConsole()) {
            const x = this.color ? `${COLORS.red}[X]${COLORS.reset}` : '[X]';
            console.error(`${x} ${message}`);
        }
        if (this.shouldOutputFile()) {
            this.writeToFile('error', `[X] ${message}`);
        }
    }

    /**
     * General-purpose log that respects global silent state.
     * Does not add prefixes or timestamps - outputs exactly what console.log would.
     * Use this for CLI output that should be suppressed during tests.
     */
    log(...args: unknown[]): void {
        if (!state.console || isQuietModeEnabled()) return;
        console.log(...args);
    }

    /** Flush file appender buffer */
    async flush(): Promise<void> {
        if (this.fileAppender) {
            await this.fileAppender.flush();
        }
    }

    /** Close file appender and clean up resources */
    async close(): Promise<void> {
        if (this.fileAppender) {
            await this.fileAppender.close();
            this.fileAppender = null;
        }
    }
}

// ============================================================================
// Exports
// ============================================================================

/** Default logger instance */
export const logger = new Logger();

/** Create a new logger with options */
export function createLogger(options: LoggerOptions): Logger {
    return new Logger(options);
}
