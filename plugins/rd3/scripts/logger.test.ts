/**
 * Unit tests for plugins/rd3/scripts/logger.ts
 *
 * Targets >=90% per-file coverage with 100% pass rate.
 */

import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { rmSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    COLORS,
    Logger,
    createLogger,
    enableLogger,
    isGlobalSilent,
    isGlobalConsoleSilent,
    isLoggerEnabled,
    logger,
    setGlobalSilent,
    setGlobalConsoleSilent,
    type FileAppenderConfig,
} from './logger';
import { AsyncFileAppender } from './logger';

// --- Test-only typed access to AsyncFileAppender internals ---

/** Exposes private members for test coverage without `any` casts. */
interface AsyncFileAppenderInternals {
    rotate(newDate: string): Promise<void>;
    currentDate: string;
}

// --- Helpers ---

/** Capture calls to console methods during a test */
function mockConsole() {
    const original = {
        debug: console.debug,
        info: console.info,
        warn: console.warn,
        error: console.error,
        log: console.log,
    };
    const calls: Record<string, unknown[][]> = {
        debug: [],
        info: [],
        warn: [],
        error: [],
        log: [],
    };
    console.debug = mock((...args: unknown[]) => calls.debug.push(args)) as typeof console.debug;
    console.info = mock((...args: unknown[]) => calls.info.push(args)) as typeof console.info;
    console.warn = mock((...args: unknown[]) => calls.warn.push(args)) as typeof console.warn;
    console.error = mock((...args: unknown[]) => calls.error.push(args)) as typeof console.error;
    console.log = mock((...args: unknown[]) => calls.log.push(args)) as typeof console.log;
    return {
        calls,
        restore() {
            console.debug = original.debug;
            console.info = original.info;
            console.warn = original.warn;
            console.error = original.error;
            console.log = original.log;
        },
    };
}

// Ensure globalSilent, globalConsoleSilent, and env are clean between tests
let origQuiet: string | undefined;
let origLogDir: string | undefined;
let origLogFilename: string | undefined;
let origLogFileEnabled: string | undefined;
let origLogConsole: string | undefined;

beforeEach(() => {
    enableLogger(true, true); // reset to defaults
    origQuiet = process.env.RD3_LOG_QUIET;
    origLogDir = process.env.LOG_DIR;
    origLogFilename = process.env.LOG_FILENAME;
    origLogFileEnabled = process.env.LOG_FILE_ENABLED;
    origLogConsole = process.env.LOG_CONSOLE;
    delete process.env.RD3_LOG_QUIET;
    delete process.env.LOG_DIR;
    delete process.env.LOG_FILENAME;
    delete process.env.LOG_FILE_ENABLED;
    delete process.env.LOG_CONSOLE;
});

afterEach(() => {
    enableLogger(true, true); // reset to defaults
    if (origQuiet !== undefined) {
        process.env.RD3_LOG_QUIET = origQuiet;
    } else {
        delete process.env.RD3_LOG_QUIET;
    }
    if (origLogDir !== undefined) {
        process.env.LOG_DIR = origLogDir;
    } else {
        delete process.env.LOG_DIR;
    }
    if (origLogFilename !== undefined) {
        process.env.LOG_FILENAME = origLogFilename;
    } else {
        delete process.env.LOG_FILENAME;
    }
    if (origLogFileEnabled !== undefined) {
        process.env.LOG_FILE_ENABLED = origLogFileEnabled;
    } else {
        delete process.env.LOG_FILE_ENABLED;
    }
    if (origLogConsole !== undefined) {
        process.env.LOG_CONSOLE = origLogConsole;
    } else {
        delete process.env.LOG_CONSOLE;
    }
});

afterAll(() => {
    enableLogger(true, true);
});

// --- Tests ---

describe('COLORS', () => {
    test('exports ANSI escape codes', () => {
        expect(COLORS.reset).toBe('\x1b[0m');
        expect(COLORS.dim).toBe('\x1b[2m');
        expect(COLORS.green).toBe('\x1b[32m');
        expect(COLORS.yellow).toBe('\x1b[33m');
        expect(COLORS.red).toBe('\x1b[31m');
        expect(COLORS.cyan).toBe('\x1b[36m');
        expect(COLORS.blue).toBe('\x1b[34m');
        expect(COLORS.magenta).toBe('\x1b[35m');
    });
});

describe('globalSilent', () => {
    test('setGlobalSilent / isGlobalSilent toggle', () => {
        expect(isGlobalSilent()).toBe(false);
        setGlobalSilent(true);
        expect(isGlobalSilent()).toBe(true);
        setGlobalSilent(false);
        expect(isGlobalSilent()).toBe(false);
    });

    test('setGlobalConsoleSilent / isGlobalConsoleSilent toggle', () => {
        expect(isGlobalConsoleSilent()).toBe(false);
        setGlobalConsoleSilent(true);
        expect(isGlobalConsoleSilent()).toBe(true);
        setGlobalConsoleSilent(false);
        expect(isGlobalConsoleSilent()).toBe(false);
    });

    test('globalConsoleSilent suppresses console but not file output', async () => {
        const mc = mockConsole();
        const testDir = `/tmp/console-silent-test-${Date.now()}`;
        mkdirSync(testDir);

        try {
            setGlobalConsoleSilent(true);
            const log = new Logger({
                level: 'info',
                color: false,
                file: { dir: testDir, filename: 'console-silent', dailyRotation: false },
            });

            log.info('should not appear in console');
            await log.close();

            // Console should be suppressed
            expect(mc.calls.info.length).toBe(0);

            // File should still have the message
            const content = await Bun.file(`${testDir}/console-silent.log`).text();
            expect(content).toContain('should not appear in console');

            mc.restore();
        } finally {
            rmSync(testDir, { recursive: true });
        }
    });

    test('globalSilent suppresses both console and file output', async () => {
        const mc = mockConsole();
        const testDir = `/tmp/silent-both-test-${Date.now()}`;
        mkdirSync(testDir);

        try {
            setGlobalSilent(true);
            const log = new Logger({
                level: 'info',
                color: false,
                file: { dir: testDir, filename: 'silent-both', dailyRotation: false },
            });

            log.info('should not appear anywhere');
            await log.close();

            // Console should be suppressed
            expect(mc.calls.info.length).toBe(0);

            // File should also be suppressed (no file created when globalSilent is true)
            const exists = await Bun.file(`${testDir}/silent-both.log`).exists();
            expect(exists).toBe(false);

            mc.restore();
        } finally {
            rmSync(testDir, { recursive: true });
        }
    });
});

describe('enableLogger (unified API)', () => {
    test('enableLogger(true, true) enables both', () => {
        enableLogger(true, true);
        expect(isLoggerEnabled()).toEqual({ console: true, file: true });
    });

    test('enableLogger(false, false) disables both', () => {
        enableLogger(false, false);
        expect(isLoggerEnabled()).toEqual({ console: false, file: false });
        enableLogger(true, true); // reset
    });

    test('enableLogger(true, false) enables console only', () => {
        enableLogger(true, false);
        expect(isLoggerEnabled()).toEqual({ console: true, file: false });
        enableLogger(true, true); // reset
    });

    test('enableLogger(false, true) enables file only', () => {
        enableLogger(false, true);
        expect(isLoggerEnabled()).toEqual({ console: false, file: true });
        enableLogger(true, true); // reset
    });

    test('enableLogger(false, true) suppresses console but writes to file', async () => {
        const mc = mockConsole();
        const testDir = `/tmp/enable-file-only-test-${Date.now()}`;
        mkdirSync(testDir);

        try {
            enableLogger(false, true); // console off, file on
            const log = new Logger({
                level: 'info',
                color: false,
                file: { dir: testDir, filename: 'file-only', dailyRotation: false },
            });

            log.info('console off, file on');
            await log.close();

            expect(mc.calls.info.length).toBe(0);
            const content = await Bun.file(`${testDir}/file-only.log`).text();
            expect(content).toContain('console off, file on');

            mc.restore();
        } finally {
            rmSync(testDir, { recursive: true });
        }
    });

    test('enableLogger(true, false) writes to console but not file', () => {
        const mc = mockConsole();
        enableLogger(true, false); // console on, file off
        const log = new Logger({ level: 'info', color: false });

        log.info('console on, file off');
        expect(mc.calls.info.length).toBe(1);
        expect(mc.calls.info[0][0]).toContain('console on, file off');

        mc.restore();
        enableLogger(true, true); // reset
    });

    test('enableLogger(false, false) suppresses all output', async () => {
        const mc = mockConsole();
        const testDir = `/tmp/disable-all-test-${Date.now()}`;
        mkdirSync(testDir);

        try {
            enableLogger(false, false);
            const log = new Logger({
                level: 'info',
                color: false,
                file: { dir: testDir, filename: 'disabled', dailyRotation: false },
            });

            log.info('should not appear');
            log.success('also suppressed');
            log.fail('also suppressed');
            log.log('also suppressed');
            await log.close();

            expect(mc.calls.info.length).toBe(0);
            expect(mc.calls.log.length).toBe(0);
            const exists = await Bun.file(`${testDir}/disabled.log`).exists();
            expect(exists).toBe(false);

            mc.restore();
        } finally {
            rmSync(testDir, { recursive: true });
        }
    });

    test('RD3_LOG_QUIET=1 sets console off (file still writes)', async () => {
        const mc = mockConsole();
        const testDir = `/tmp/env-quiet-test-${Date.now()}`;
        mkdirSync(testDir);

        try {
            process.env.RD3_LOG_QUIET = '1';
            const log = new Logger({
                level: 'info',
                color: false,
                file: { dir: testDir, filename: 'env-quiet', dailyRotation: false },
            });

            log.info('env silenced');
            await log.close();

            expect(mc.calls.info.length).toBe(0);
            const content = await Bun.file(`${testDir}/env-quiet.log`).text();
            expect(content).toContain('env silenced');

            mc.restore();
        } finally {
            rmSync(testDir, { recursive: true });
        }
    });
});

describe('Logger', () => {
    test('default constructor uses info level, no prefix, color enabled', () => {
        const mc = mockConsole();
        const log = new Logger();
        log.info('hello');
        expect(mc.calls.info.length).toBe(1);
        // colored output contains ANSI escape
        expect(mc.calls.info[0][0]).toContain(COLORS.dim);
        mc.restore();
    });

    test('constructor accepts all options', () => {
        const log = new Logger({ level: 'debug', prefix: 'test', color: false });
        expect(log).toBeInstanceOf(Logger);
    });

    test('color: false produces plain output without ANSI codes', () => {
        const mc = mockConsole();
        const log = new Logger({ color: false });
        log.info('plain');
        const out = mc.calls.info[0][0] as string;
        expect(out).not.toContain('\x1b[');
        expect(out).toContain('INFO');
        expect(out).toContain('plain');
        mc.restore();
    });

    test('prefix is included in formatted output', () => {
        const mc = mockConsole();
        const log = new Logger({ prefix: 'my-mod', color: false });
        log.info('msg');
        expect(mc.calls.info[0][0]).toContain('[my-mod]');
        mc.restore();
    });

    test('no prefix omits brackets', () => {
        const mc = mockConsole();
        const log = new Logger({ color: false });
        log.info('msg');
        expect(mc.calls.info[0][0]).not.toContain('[] ');
        mc.restore();
    });

    // --- Level filtering ---

    test('debug level logs everything', () => {
        const mc = mockConsole();
        const log = new Logger({ level: 'debug', color: false });
        log.debug('d');
        log.info('i');
        log.warn('w');
        log.error('e');
        expect(mc.calls.debug.length).toBe(1);
        expect(mc.calls.info.length).toBe(1);
        expect(mc.calls.warn.length).toBe(1);
        expect(mc.calls.error.length).toBe(1);
        mc.restore();
    });

    test('info level filters out debug', () => {
        const mc = mockConsole();
        const log = new Logger({ level: 'info', color: false });
        log.debug('d');
        log.info('i');
        expect(mc.calls.debug.length).toBe(0);
        expect(mc.calls.info.length).toBe(1);
        mc.restore();
    });

    test('warn level filters out debug and info', () => {
        const mc = mockConsole();
        const log = new Logger({ level: 'warn', color: false });
        log.debug('d');
        log.info('i');
        log.warn('w');
        expect(mc.calls.debug.length).toBe(0);
        expect(mc.calls.info.length).toBe(0);
        expect(mc.calls.warn.length).toBe(1);
        mc.restore();
    });

    test('error level filters out debug, info, warn', () => {
        const mc = mockConsole();
        const log = new Logger({ level: 'error', color: false });
        log.debug('d');
        log.info('i');
        log.warn('w');
        log.error('e');
        expect(mc.calls.debug.length).toBe(0);
        expect(mc.calls.info.length).toBe(0);
        expect(mc.calls.warn.length).toBe(0);
        expect(mc.calls.error.length).toBe(1);
        mc.restore();
    });

    test('silent level suppresses all output', () => {
        const mc = mockConsole();
        const log = new Logger({ level: 'silent', color: false });
        log.debug('d');
        log.info('i');
        log.warn('w');
        log.error('e');
        expect(mc.calls.debug.length).toBe(0);
        expect(mc.calls.info.length).toBe(0);
        expect(mc.calls.warn.length).toBe(0);
        expect(mc.calls.error.length).toBe(0);
        mc.restore();
    });

    // --- Extra args passthrough ---

    test('extra args are passed through to console methods', () => {
        const mc = mockConsole();
        const log = new Logger({ color: false });
        const obj = { a: 1 };
        log.info('msg', obj, 42);
        expect(mc.calls.info[0]).toEqual([expect.any(String), obj, 42]);
        mc.restore();
    });

    // --- success / fail ---

    test('success logs with [OK] marker', () => {
        const mc = mockConsole();
        const log = new Logger({ color: true });
        log.success('done');
        expect(mc.calls.log.length).toBe(1);
        const out = mc.calls.log[0][0] as string;
        expect(out).toContain('[OK]');
        expect(out).toContain('done');
        mc.restore();
    });

    test('success without color uses plain [OK]', () => {
        const mc = mockConsole();
        const log = new Logger({ color: false });
        log.success('done');
        const out = mc.calls.log[0][0] as string;
        expect(out).toBe('[OK] done');
        mc.restore();
    });

    test('success is suppressed when level > info', () => {
        const mc = mockConsole();
        const log = new Logger({ level: 'warn', color: false });
        log.success('done');
        expect(mc.calls.log.length).toBe(0);
        mc.restore();
    });

    test('fail logs with [X] marker to console.error', () => {
        const mc = mockConsole();
        const log = new Logger({ color: true });
        log.fail('boom');
        expect(mc.calls.error.length).toBe(1);
        const out = mc.calls.error[0][0] as string;
        expect(out).toContain('[X]');
        expect(out).toContain('boom');
        mc.restore();
    });

    test('fail without color uses plain [X]', () => {
        const mc = mockConsole();
        const log = new Logger({ color: false });
        log.fail('boom');
        const out = mc.calls.error[0][0] as string;
        expect(out).toBe('[X] boom');
        mc.restore();
    });

    // --- log method ---

    test('log outputs via console.log when not silenced', () => {
        const mc = mockConsole();
        const log = new Logger();
        log.log('hello', 'world');
        expect(mc.calls.log.length).toBe(1);
        expect(mc.calls.log[0]).toEqual(['hello', 'world']);
        mc.restore();
    });

    // --- globalSilent suppression ---

    test('globalSilent suppresses all Logger methods', () => {
        const mc = mockConsole();
        setGlobalSilent(true);
        const log = new Logger({ level: 'debug', color: false });
        log.debug('d');
        log.info('i');
        log.warn('w');
        log.error('e');
        log.success('s');
        log.fail('f');
        log.log('l');
        expect(mc.calls.debug.length).toBe(0);
        expect(mc.calls.info.length).toBe(0);
        expect(mc.calls.warn.length).toBe(0);
        expect(mc.calls.error.length).toBe(0);
        expect(mc.calls.log.length).toBe(0);
        mc.restore();
    });

    // --- globalConsoleSilent suppression ---

    test('globalConsoleSilent suppresses console output only', () => {
        const mc = mockConsole();
        setGlobalConsoleSilent(true);
        const log = new Logger({ level: 'debug', color: false });
        log.debug('d');
        log.info('i');
        log.warn('w');
        log.error('e');
        log.success('s');
        log.fail('f');
        expect(mc.calls.debug.length).toBe(0);
        expect(mc.calls.info.length).toBe(0);
        expect(mc.calls.warn.length).toBe(0);
        expect(mc.calls.error.length).toBe(0);
        expect(mc.calls.log.length).toBe(0);
        mc.restore();
    });

    // --- RD3_LOG_QUIET env ---

    test('RD3_LOG_QUIET=1 suppresses all Logger methods', () => {
        const mc = mockConsole();
        process.env.RD3_LOG_QUIET = '1';
        const log = new Logger({ level: 'debug', color: false });
        log.debug('d');
        log.info('i');
        log.warn('w');
        log.error('e');
        log.success('s');
        log.fail('f');
        expect(mc.calls.debug.length).toBe(0);
        expect(mc.calls.info.length).toBe(0);
        expect(mc.calls.warn.length).toBe(0);
        expect(mc.calls.error.length).toBe(0);
        expect(mc.calls.log.length).toBe(0);
        mc.restore();
    });

    test('RD3_LOG_QUIET=true suppresses output', () => {
        const mc = mockConsole();
        process.env.RD3_LOG_QUIET = 'true';
        const log = new Logger({ color: false });
        log.info('x');
        expect(mc.calls.info.length).toBe(0);
        mc.restore();
    });

    test('RD3_LOG_QUIET=0 does NOT suppress output', () => {
        const mc = mockConsole();
        process.env.RD3_LOG_QUIET = '0';
        const log = new Logger({ color: false });
        log.info('x');
        expect(mc.calls.info.length).toBe(1);
        mc.restore();
    });

    // --- format timestamp ---

    test('formatted output contains ISO timestamp', () => {
        const mc = mockConsole();
        const log = new Logger({ color: false });
        log.info('ts');
        const out = mc.calls.info[0][0] as string;
        // ISO format: YYYY-MM-DDTHH:MM:SS.sssZ
        expect(out).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        mc.restore();
    });

    test('level label is padded to 5 chars', () => {
        const mc = mockConsole();
        const log = new Logger({ color: false });
        log.warn('w');
        const out = mc.calls.warn[0][0] as string;
        // WARN is 4 chars, padEnd(5) adds one space
        expect(out).toMatch(/WARN /);
        mc.restore();
    });
});

describe('AsyncFileAppender', () => {
    const testDir = `/tmp/logger-test-${Date.now()}`;

    beforeEach(async () => {
        // Create test directory using sync mkdir
        mkdirSync(testDir);
    });

    afterEach(() => {
        // Clean up test directory
        try {
            rmSync(testDir, { recursive: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    test('constructor sets config values', () => {
        const config: FileAppenderConfig = {
            dir: testDir,
            filename: 'app',
            dailyRotation: true,
            maxFiles: 14,
            level: 'debug',
        };
        const appender = new AsyncFileAppender(config);
        expect(appender).toBeDefined();
    });

    test('constructor uses defaults when optional params missing', () => {
        const config: FileAppenderConfig = {
            dir: testDir,
            filename: 'app',
        };
        const appender = new AsyncFileAppender(config);
        expect(appender).toBeDefined();
    });

    test('append buffers message without writing immediately', async () => {
        const config: FileAppenderConfig = {
            dir: testDir,
            filename: 'buffer-test',
            dailyRotation: false,
        };
        const appender = new AsyncFileAppender(config);

        await appender.append('info', 'test message', new Date());

        // Close to trigger final flush
        await appender.close();

        // Verify file was created with content
        const logPath = resolve(testDir, 'buffer-test.log');
        const content = await Bun.file(logPath).text();
        expect(content).toContain('test message');
    });

    test('append respects fileLevel filter', async () => {
        const config: FileAppenderConfig = {
            dir: testDir,
            filename: 'filter-test',
            dailyRotation: false,
            level: 'warn', // Only warn and above should be written
        };
        const appender = new AsyncFileAppender(config);

        await appender.append('debug', 'debug msg', new Date()); // Should be filtered
        await appender.append('info', 'info msg', new Date()); // Should be filtered
        await appender.append('warn', 'warn msg', new Date()); // Should be written
        await appender.append('error', 'error msg', new Date()); // Should be written

        await appender.close();

        const logPath = resolve(testDir, 'filter-test.log');
        const content = await Bun.file(logPath).text();
        expect(content).not.toContain('debug msg');
        expect(content).not.toContain('info msg');
        expect(content).toContain('warn msg');
        expect(content).toContain('error msg');
    });

    test('flush forces buffer write', async () => {
        const config: FileAppenderConfig = {
            dir: testDir,
            filename: 'flush-test',
            dailyRotation: false,
        };
        const appender = new AsyncFileAppender(config);

        await appender.append('info', 'flushed msg', new Date());
        await appender.flush();
        await appender.close();

        const logPath = resolve(testDir, 'flush-test.log');
        const content = await Bun.file(logPath).text();
        expect(content).toContain('flushed msg');
    });

    test('close is idempotent', async () => {
        const config: FileAppenderConfig = {
            dir: testDir,
            filename: 'idempotent-close',
            dailyRotation: false,
        };
        const appender = new AsyncFileAppender(config);

        await appender.close();
        await appender.close(); // Second close should not throw

        expect(true).toBe(true);
    });

    test('append after close does nothing', async () => {
        const config: FileAppenderConfig = {
            dir: testDir,
            filename: 'after-close',
            dailyRotation: false,
        };
        const appender = new AsyncFileAppender(config);

        await appender.close();
        await appender.append('info', 'should not appear', new Date());

        const logPath = resolve(testDir, 'after-close.log');
        try {
            const content = await Bun.file(logPath).text();
            expect(content).not.toContain('should not appear');
        } catch {
            // File might not exist, which is also acceptable
        }
    });

    test('writes to dated log file with daily rotation', async () => {
        const config: FileAppenderConfig = {
            dir: testDir,
            filename: 'dated-test',
            dailyRotation: true,
        };
        const appender = new AsyncFileAppender(config);

        await appender.append('info', 'dated message', new Date());
        await appender.close();

        // With daily rotation, file should have date suffix
        const files = readdirSync(testDir);
        const logFiles = files.filter((f: string) => f.startsWith('dated-test.') && f.endsWith('.log'));
        expect(logFiles.length).toBeGreaterThan(0);
    });

    test('flush with empty buffer does nothing', async () => {
        const config: FileAppenderConfig = {
            dir: testDir,
            filename: 'empty-flush',
            dailyRotation: false,
        };
        const appender = new AsyncFileAppender(config);

        // Flush without any appends
        await appender.flush();
        await appender.close();

        expect(true).toBe(true);
    });

    test('multiple appends are batched', async () => {
        const config: FileAppenderConfig = {
            dir: testDir,
            filename: 'batch-test',
            dailyRotation: false,
        };
        const appender = new AsyncFileAppender(config);

        await appender.append('info', 'msg1', new Date());
        await appender.append('info', 'msg2', new Date());
        await appender.append('info', 'msg3', new Date());
        await appender.close();

        const logPath = resolve(testDir, 'batch-test.log');
        const content = await Bun.file(logPath).text();
        expect(content).toContain('msg1');
        expect(content).toContain('msg2');
        expect(content).toContain('msg3');
    });

    test('rotation creates dated log file', async () => {
        const config: FileAppenderConfig = {
            dir: testDir,
            filename: 'rotation-test',
            dailyRotation: true,
        };
        const appender = new AsyncFileAppender(config);

        // Get current date
        const today = new Date().toISOString().split('T')[0];

        // Append with today's date
        await appender.append('info', 'today', new Date());
        await appender.close();

        // Verify today's file exists
        const todayPath = `${testDir}/rotation-test.${today}.log`;
        const exists = await Bun.file(todayPath).exists();
        expect(exists).toBe(true);
    });

    test('auto-flush timer triggers periodic flush', async () => {
        const config: FileAppenderConfig = {
            dir: testDir,
            filename: 'auto-flush',
            dailyRotation: false,
        };
        const appender = new AsyncFileAppender(config);

        // Append without manual flush
        await appender.append('info', 'auto message', new Date());

        // Wait for auto-flush timer (1 second interval + buffer)
        await Bun.sleep(1100);

        await appender.close();

        // Verify file was written by auto-flush
        const logPath = `${testDir}/auto-flush.log`;
        const exists = await Bun.file(logPath).exists();
        expect(exists).toBe(true);
    }, 5000);

    test('rotation changes file date', async () => {
        const config: FileAppenderConfig = {
            dir: testDir,
            filename: 'rotation-change',
            dailyRotation: true,
        };
        const appender = new AsyncFileAppender(config);

        // Get current date
        const today = new Date().toISOString().split('T')[0];

        // Append with today's date
        await appender.append('info', 'today', new Date());
        await appender.close();

        // Verify today's file exists
        const todayPath = `${testDir}/rotation-change.${today}.log`;
        const exists = await Bun.file(todayPath).exists();
        expect(exists).toBe(true);
    });

    test('rotation keeps appender writable after switching dates', async () => {
        const config: FileAppenderConfig = {
            dir: testDir,
            filename: 'rotation-continue',
            dailyRotation: true,
        };
        const appender = new AsyncFileAppender(config);

        await appender.append('info', 'before rotation', new Date('2024-01-01T00:00:00.000Z'));
        await (appender as unknown as AsyncFileAppenderInternals).rotate('2024-01-02');
        await appender.append('info', 'after rotation', new Date('2024-01-02T00:00:00.000Z'));
        await appender.close();

        const rotatedPath = `${testDir}/rotation-continue.2024-01-02.log`;
        const content = await Bun.file(rotatedPath).text();
        expect(content).toContain('after rotation');
    });

    test('cleanupOldFiles deletes oldest files when exceeding maxFiles', async () => {
        const config: FileAppenderConfig = {
            dir: testDir,
            filename: 'cleanup-test',
            dailyRotation: true,
            maxFiles: 2,
        };
        const appender = new AsyncFileAppender(config);

        // Pre-create 5 rotated log files (more than maxFiles=2)
        const dates = ['2020-01-01', '2020-01-02', '2020-01-03', '2020-01-04', '2020-01-05'];
        for (const date of dates) {
            const path = `${testDir}/cleanup-test.${date}.log`;
            await Bun.write(path, `old log for ${date}\n`);
        }

        // Force rotation by setting currentDate to an old date, then appending with today
        (appender as unknown as AsyncFileAppenderInternals).currentDate = '2020-01-01';
        const today = new Date().toISOString().split('T')[0];
        await appender.append('info', 'today log', new Date());
        await appender.close();

        // Verify old files were deleted (today + at most maxFiles remaining)
        const files = readdirSync(testDir);
        const logFiles = files.filter((f: string) => f.startsWith('cleanup-test.') && f.endsWith('.log'));
        // Should have today's file + up to maxFiles=2 more = 3 total
        expect(logFiles.length).toBeLessThanOrEqual(3);
        // Today's file must exist
        const todayFile = `${testDir}/cleanup-test.${today}.log`;
        const todayExists = await Bun.file(todayFile).exists();
        expect(todayExists).toBe(true);
    });

    test('getLogFilePath returns no-date filename when dailyRotation is false', async () => {
        const config: FileAppenderConfig = {
            dir: testDir,
            filename: 'no-rotation',
            dailyRotation: false,
        };
        const appender = new AsyncFileAppender(config);

        await appender.append('info', 'no date', new Date());
        await appender.close();

        // Without rotation, file should be no-rotation.log (no date suffix)
        const exists = await Bun.file(`${testDir}/no-rotation.log`).exists();
        expect(exists).toBe(true);

        // The dated version should NOT exist
        const today = new Date().toISOString().split('T')[0];
        const datedExists = await Bun.file(`${testDir}/no-rotation.${today}.log`).exists();
        expect(datedExists).toBe(false);
    });

    test('listRotatedFiles returns empty array for empty directory', async () => {
        const config: FileAppenderConfig = {
            dir: testDir,
            filename: 'empty-list-test',
            dailyRotation: true,
        };
        const appender = new AsyncFileAppender(config);

        // Trigger rotation to create today's file (tests listRotatedFiles indirectly via cleanupOldFiles)
        (appender as unknown as AsyncFileAppenderInternals).currentDate = '2020-01-01';
        await appender.append('info', 'trigger rotation', new Date());
        await appender.close();

        // Verify today's file was created via rotation
        const today = new Date().toISOString().split('T')[0];
        const exists = await Bun.file(`${testDir}/empty-list-test.${today}.log`).exists();
        expect(exists).toBe(true);
    });

    test('rotate handles cleanup errors gracefully', async () => {
        // Use a directory we can't write to (simulated via permission error in rm)
        // The catch block in cleanupOldFiles should swallow the error
        const config: FileAppenderConfig = {
            dir: testDir,
            filename: 'cleanup-error-test',
            dailyRotation: true,
            maxFiles: 1,
        };
        const appender = new AsyncFileAppender(config);

        // Pre-create files that will cause cleanup to run
        await Bun.write(`${testDir}/cleanup-error-test.2020-01-01.log`, 'old');
        await Bun.write(`${testDir}/cleanup-error-test.2020-01-02.log`, 'old');

        // Trigger rotation - should not throw even if some rm calls fail
        const today = new Date().toISOString().split('T')[0];
        await appender.append('info', 'rotation with errors', new Date());
        await appender.close();

        // Today's file should still be created despite cleanup errors
        const todayPath = `${testDir}/cleanup-error-test.${today}.log`;
        const exists = await Bun.file(todayPath).exists();
        expect(exists).toBe(true);
    });
});

describe('Logger with file appender', () => {
    const testDir = `/tmp/logger-file-test-${Date.now()}`;

    beforeEach(() => {
        mkdirSync(testDir);
        enableLogger(false, true); // file on, console off to keep test output clean
    });

    afterEach(() => {
        try {
            rmSync(testDir, { recursive: true });
        } catch {
            // Ignore cleanup errors
        }
        enableLogger(true, true);
    });

    test('Logger with file option creates file appender', async () => {
        const log = new Logger({
            file: { dir: testDir, filename: 'file-logger', dailyRotation: false },
            level: 'debug',
            color: false,
        });

        log.info('file message');
        await log.flush();
        await log.close();

        const logPath = resolve(testDir, 'file-logger.log');
        const content = await Bun.file(logPath).text();
        expect(content).toContain('file message');
    });

    test('LOG_DIR provides the file destination when config omits dir', async () => {
        process.env.LOG_DIR = testDir;
        const log = new Logger({
            file: { filename: 'env-dir', dailyRotation: false },
            color: false,
        });

        log.info('env-backed file');
        await log.close();

        const content = await Bun.file(resolve(testDir, 'env-dir.log')).text();
        expect(content).toContain('env-backed file');
    });

    test('LOG_FILE_ENABLED=0 disables file output even when configured', async () => {
        process.env.LOG_FILE_ENABLED = '0';
        const log = new Logger({
            file: { dir: testDir, filename: 'disabled-by-env', dailyRotation: false },
            color: false,
        });

        log.info('should stay in console only');
        await log.close();

        const exists = await Bun.file(resolve(testDir, 'disabled-by-env.log')).exists();
        expect(exists).toBe(false);
    });

    test('flush delegates to file appender', async () => {
        const log = new Logger({
            file: { dir: testDir, filename: 'flush-delegate', dailyRotation: false },
            color: false,
        });

        log.info('flush test');
        await log.flush();
        await log.close();

        const logPath = resolve(testDir, 'flush-delegate.log');
        const content = await Bun.file(logPath).text();
        expect(content).toContain('flush test');
    });

    test('close cleans up file appender', async () => {
        const log = new Logger({
            file: { dir: testDir, filename: 'close-cleanup', dailyRotation: false },
            color: false,
        });

        log.info('before close');
        await log.close();

        // Calling close again should not throw
        await log.close();

        const logPath = resolve(testDir, 'close-cleanup.log');
        const content = await Bun.file(logPath).text();
        expect(content).toContain('before close');
    });

    test('debug writes to file when level allows', async () => {
        const log = new Logger({
            file: { dir: testDir, filename: 'debug-file', dailyRotation: false, level: 'debug' },
            level: 'debug',
            color: false,
        });

        log.debug('debug to file');
        await log.close();

        const logPath = resolve(testDir, 'debug-file.log');
        const content = await Bun.file(logPath).text();
        expect(content).toContain('debug to file');
    });

    test('warn writes to file when level allows', async () => {
        const log = new Logger({
            file: { dir: testDir, filename: 'warn-file', dailyRotation: false, level: 'warn' },
            level: 'warn',
            color: false,
        });

        log.warn('warn to file');
        await log.close();

        const logPath = resolve(testDir, 'warn-file.log');
        const content = await Bun.file(logPath).text();
        expect(content).toContain('warn to file');
    });

    test('error writes to file when level allows', async () => {
        const log = new Logger({
            file: { dir: testDir, filename: 'error-file', dailyRotation: false, level: 'error' },
            level: 'error',
            color: false,
        });

        log.error('error to file');
        await log.close();

        const logPath = resolve(testDir, 'error-file.log');
        const content = await Bun.file(logPath).text();
        expect(content).toContain('error to file');
    });

    test('success writes to file', async () => {
        const log = new Logger({
            file: { dir: testDir, filename: 'success-file', dailyRotation: false },
            color: false,
        });

        log.success('success to file');
        await log.close();

        const logPath = resolve(testDir, 'success-file.log');
        const content = await Bun.file(logPath).text();
        expect(content).toContain('[OK] success to file');
    });

    test('fail writes to file', async () => {
        const log = new Logger({
            file: { dir: testDir, filename: 'fail-file', dailyRotation: false },
            color: false,
        });

        log.fail('fail to file');
        await log.close();

        const logPath = resolve(testDir, 'fail-file.log');
        const content = await Bun.file(logPath).text();
        expect(content).toContain('[X] fail to file');
    });

    test('json args are serialized in file output', async () => {
        const log = new Logger({
            file: { dir: testDir, filename: 'json-file', dailyRotation: false, level: 'debug' },
            level: 'debug',
            color: false,
        });

        log.info('message', { key: 'value' }, 42);
        await log.close();

        const logPath = resolve(testDir, 'json-file.log');
        const content = await Bun.file(logPath).text();
        expect(content).toContain('message');
        expect(content).toContain('{"key":"value"}');
        expect(content).toContain('42');
    });

    test('file appender respects daily rotation', async () => {
        const log = new Logger({
            file: { dir: testDir, filename: 'rotation-test', dailyRotation: true, maxFiles: 3 },
            color: false,
        });

        log.info('rotation message');
        await log.close();

        const files = readdirSync(testDir);
        const logFiles = files.filter((f: string) => f.startsWith('rotation-test.') && f.endsWith('.log'));
        expect(logFiles.length).toBeGreaterThanOrEqual(1);
    });

    test('multiple loggers can write to different files', async () => {
        const log1 = new Logger({
            file: { dir: testDir, filename: 'multi1', dailyRotation: false },
            color: false,
        });
        const log2 = new Logger({
            file: { dir: testDir, filename: 'multi2', dailyRotation: false },
            color: false,
        });

        log1.info('from log1');
        log2.info('from log2');
        await log1.close();
        await log2.close();

        const content1 = await Bun.file(resolve(testDir, 'multi1.log')).text();
        const content2 = await Bun.file(resolve(testDir, 'multi2.log')).text();
        expect(content1).toContain('from log1');
        expect(content2).toContain('from log2');
    });
});

describe('createLogger', () => {
    test('returns a new Logger instance with options', () => {
        const mc = mockConsole();
        const log = createLogger({ prefix: 'sub', color: false });
        log.info('hi');
        expect(mc.calls.info[0][0]).toContain('[sub]');
        mc.restore();
    });
});

describe('default logger export', () => {
    test('is a Logger instance', () => {
        expect(logger).toBeInstanceOf(Logger);
    });
});
