/**
 * Supplementary logger coverage for the tasks test suite.
 *
 * The canonical logger tests live at plugins/rd3/tests/logger.test.ts (100% coverage).
 * This file exercises the paths that remain uncovered when running the tasks
 * test subset in isolation: isQuietModeEnabled(), format() color branches,
 * debug(), and fail().
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { Logger, setGlobalSilent } from '../../../scripts/logger';

function mockConsole() {
    const original = {
        debug: console.debug,
        info: console.info,
        error: console.error,
        log: console.log,
    };
    const calls: Record<string, unknown[][]> = {
        debug: [],
        info: [],
        error: [],
        log: [],
    };
    console.debug = mock((...args: unknown[]) => calls.debug.push(args)) as typeof console.debug;
    console.info = mock((...args: unknown[]) => calls.info.push(args)) as typeof console.info;
    console.error = mock((...args: unknown[]) => calls.error.push(args)) as typeof console.error;
    console.log = mock((...args: unknown[]) => calls.log.push(args)) as typeof console.log;
    return {
        calls,
        restore() {
            console.debug = original.debug;
            console.info = original.info;
            console.error = original.error;
            console.log = original.log;
        },
    };
}

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
    setGlobalSilent(false);
});

describe('logger (tasks-local coverage)', () => {
    test('debug() outputs when level is debug', () => {
        const mc = mockConsole();
        const log = new Logger({ level: 'debug', color: false });
        log.debug('trace-msg');
        expect(mc.calls.debug.length).toBe(1);
        expect(mc.calls.debug[0][0]).toContain('trace-msg');
        mc.restore();
    });

    test('debug() includes colored format', () => {
        const mc = mockConsole();
        const log = new Logger({ level: 'debug', color: true });
        log.debug('colored');
        const out = mc.calls.debug[0][0] as string;
        expect(out).toContain('\x1b[');
        expect(out).toContain('colored');
        mc.restore();
    });

    test('format() without color omits ANSI codes', () => {
        const mc = mockConsole();
        const log = new Logger({ level: 'debug', color: false, prefix: 'pfx' });
        log.debug('plain');
        const out = mc.calls.debug[0][0] as string;
        expect(out).not.toContain('\x1b[');
        expect(out).toContain('[pfx]');
        expect(out).toContain('DEBUG');
        mc.restore();
    });

    test('fail() outputs [X] marker to stderr', () => {
        const mc = mockConsole();
        const log = new Logger({ color: true });
        log.fail('broken');
        expect(mc.calls.error.length).toBe(1);
        const out = mc.calls.error[0][0] as string;
        expect(out).toContain('[X]');
        expect(out).toContain('broken');
        mc.restore();
    });

    test('fail() without color uses plain [X]', () => {
        const mc = mockConsole();
        const log = new Logger({ color: false });
        log.fail('broken');
        expect(mc.calls.error[0][0]).toBe('[X] broken');
        mc.restore();
    });

    test('fail() is suppressed at level above error', () => {
        const mc = mockConsole();
        const log = new Logger({ level: 'silent' });
        log.fail('nope');
        expect(mc.calls.error.length).toBe(0);
        mc.restore();
    });

    test('RD3_LOG_QUIET=1 suppresses debug and fail', () => {
        const mc = mockConsole();
        process.env.RD3_LOG_QUIET = '1';
        const log = new Logger({ level: 'debug' });
        log.debug('d');
        log.fail('f');
        expect(mc.calls.debug.length).toBe(0);
        expect(mc.calls.error.length).toBe(0);
        mc.restore();
    });

    test('RD3_LOG_QUIET=true suppresses debug and fail', () => {
        const mc = mockConsole();
        process.env.RD3_LOG_QUIET = 'true';
        const log = new Logger({ level: 'debug' });
        log.debug('d');
        log.fail('f');
        expect(mc.calls.debug.length).toBe(0);
        expect(mc.calls.error.length).toBe(0);
        mc.restore();
    });
});
