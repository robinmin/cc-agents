#!/usr/bin/env bun

import { afterEach, describe, expect, test } from 'bun:test';
import { Logger, createLogger, isGlobalSilent, setGlobalSilent } from '../scripts/logger';

const originalConsole = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
    log: console.log,
};
const originalQuiet = process.env.RD3_LOG_QUIET;

afterEach(() => {
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.log = originalConsole.log;

    if (originalQuiet === undefined) {
        delete process.env.RD3_LOG_QUIET;
    } else {
        process.env.RD3_LOG_QUIET = originalQuiet;
    }

    setGlobalSilent(false);
});

describe('logger', () => {
    test('tracks global silent mode', () => {
        expect(isGlobalSilent()).toBe(false);
        setGlobalSilent(true);
        expect(isGlobalSilent()).toBe(true);
    });

    test('emits formatted debug, info, warn, and error messages', () => {
        const calls = {
            debug: [] as unknown[][],
            info: [] as unknown[][],
            warn: [] as unknown[][],
            error: [] as unknown[][],
        };

        console.debug = (...args: unknown[]) => {
            calls.debug.push(args);
        };
        console.info = (...args: unknown[]) => {
            calls.info.push(args);
        };
        console.warn = (...args: unknown[]) => {
            calls.warn.push(args);
        };
        console.error = (...args: unknown[]) => {
            calls.error.push(args);
        };

        const colorLogger = new Logger({ level: 'debug', prefix: 'unit' });
        const plainLogger = createLogger({ level: 'debug', prefix: 'plain', color: false });

        colorLogger.debug('debug message', { debug: true });
        plainLogger.info('info message');
        plainLogger.warn('warn message');
        plainLogger.error('error message');

        expect(calls.debug).toHaveLength(1);
        expect(String(calls.debug[0]?.[0])).toContain('DEBUG');
        expect(String(calls.debug[0]?.[0])).toContain('[unit]');
        expect(calls.info).toHaveLength(1);
        expect(String(calls.info[0]?.[0])).toContain('INFO');
        expect(String(calls.info[0]?.[0])).toContain('[plain]');
        expect(calls.warn).toHaveLength(1);
        expect(String(calls.warn[0]?.[0])).toContain('WARN');
        expect(calls.error).toHaveLength(1);
        expect(String(calls.error[0]?.[0])).toContain('ERROR');
    });

    test('emits success, fail, and raw log output', () => {
        const calls = {
            log: [] as unknown[][],
            error: [] as unknown[][],
        };

        console.log = (...args: unknown[]) => {
            calls.log.push(args);
        };
        console.error = (...args: unknown[]) => {
            calls.error.push(args);
        };

        const logger = new Logger({ level: 'debug', color: false });
        logger.success('completed');
        logger.fail('failed');
        logger.log('plain output', 42);

        expect(calls.log).toHaveLength(2);
        expect(String(calls.log[0]?.[0])).toBe('[OK] completed');
        expect(calls.log[1]).toEqual(['plain output', 42]);
        expect(calls.error).toHaveLength(1);
        expect(String(calls.error[0]?.[0])).toBe('[X] failed');
    });

    test('suppresses structured output in quiet mode but still allows raw log', () => {
        const calls = {
            info: [] as unknown[][],
            warn: [] as unknown[][],
            error: [] as unknown[][],
            log: [] as unknown[][],
        };

        process.env.RD3_LOG_QUIET = 'true';
        console.info = (...args: unknown[]) => {
            calls.info.push(args);
        };
        console.warn = (...args: unknown[]) => {
            calls.warn.push(args);
        };
        console.error = (...args: unknown[]) => {
            calls.error.push(args);
        };
        console.log = (...args: unknown[]) => {
            calls.log.push(args);
        };

        const logger = new Logger({ level: 'debug' });
        logger.info('hidden info');
        logger.warn('hidden warn');
        logger.error('hidden error');
        logger.success('hidden success');
        logger.fail('hidden fail');
        logger.log('visible log');

        expect(calls.info).toHaveLength(0);
        expect(calls.warn).toHaveLength(0);
        expect(calls.error).toHaveLength(0);
        expect(calls.log).toEqual([['visible log']]);
    });

    test('suppresses all output when global silent is enabled', () => {
        const calls = {
            debug: 0,
            log: 0,
        };

        console.debug = () => {
            calls.debug += 1;
        };
        console.log = () => {
            calls.log += 1;
        };

        const logger = new Logger({ level: 'debug' });
        setGlobalSilent(true);
        logger.debug('hidden debug');
        logger.log('hidden log');

        expect(calls.debug).toBe(0);
        expect(calls.log).toBe(0);
    });
});
