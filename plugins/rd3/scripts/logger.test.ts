/**
 * Unit tests for plugins/rd3/scripts/logger.ts
 *
 * Targets >=90% per-file coverage with 100% pass rate.
 */

import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { COLORS, Logger, createLogger, isGlobalSilent, logger, setGlobalSilent } from './logger';

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

// Ensure globalSilent and env are clean between tests
let origQuiet: string | undefined;

beforeEach(() => {
    setGlobalSilent(false);
    origQuiet = process.env.RD3_LOG_QUIET;
    delete process.env.RD3_LOG_QUIET;
});

afterEach(() => {
    if (origQuiet !== undefined) {
        process.env.RD3_LOG_QUIET = origQuiet;
    } else {
        delete process.env.RD3_LOG_QUIET;
    }
});

afterAll(() => {
    setGlobalSilent(false);
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
