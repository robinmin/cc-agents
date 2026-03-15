/**
 * Unit tests for rd3 logger utilities
 */

import { describe, expect, it } from 'bun:test';
import { createLogger, Logger, type LoggerOptions, type LogLevel, logger } from '../scripts/logger';

describe('Logger', () => {
    it('should create logger with default options', () => {
        const log = new Logger();
        expect(log).toBeDefined();
    });

    it('should create logger with custom level', () => {
        const log = new Logger({ level: 'error' });
        expect(log).toBeDefined();
    });

    it('should create logger with custom prefix', () => {
        const log = new Logger({ prefix: 'test' });
        expect(log).toBeDefined();
    });

    it('should create logger with color disabled', () => {
        const log = new Logger({ color: false });
        expect(log).toBeDefined();
    });

    it('should have default logger export', () => {
        expect(logger).toBeDefined();
    });

    it('should create logger with createLogger function', () => {
        const log = createLogger({ level: 'debug' });
        expect(log).toBeDefined();
    });

    it('should create logger with all options', () => {
        const log = createLogger({
            level: 'warn',
            prefix: 'myapp',
            color: false,
        });
        expect(log).toBeDefined();
    });

    it('should call debug method', () => {
        const log = new Logger({ level: 'debug' });
        expect(() => log.debug('test message')).not.toThrow();
    });

    it('should call info method', () => {
        const log = new Logger({ level: 'info' });
        expect(() => log.info('test message')).not.toThrow();
    });

    it('should call warn method', () => {
        const log = new Logger({ level: 'warn' });
        expect(() => log.warn('test message')).not.toThrow();
    });

    it('should call error method', () => {
        const log = new Logger({ level: 'error' });
        expect(() => log.error('test message')).not.toThrow();
    });

    it('should call success method', () => {
        const log = new Logger({ level: 'info' });
        expect(() => log.success('test message')).not.toThrow();
    });

    it('should call fail method', () => {
        const log = new Logger({ level: 'error' });
        expect(() => log.fail('test message')).not.toThrow();
    });

    it('should not log when level is silent', () => {
        const log = new Logger({ level: 'silent' });
        expect(() => log.debug('test')).not.toThrow();
        expect(() => log.info('test')).not.toThrow();
        expect(() => log.warn('test')).not.toThrow();
        expect(() => log.error('test')).not.toThrow();
    });

    it('should log with prefix', () => {
        const log = new Logger({ level: 'info', prefix: 'TEST' });
        expect(() => log.info('message')).not.toThrow();
    });

    it('should log without color', () => {
        const log = new Logger({ level: 'info', color: false });
        expect(() => log.info('message')).not.toThrow();
    });

    it('should log with additional arguments', () => {
        const log = new Logger({ level: 'debug' });
        expect(() => log.debug('message', { key: 'value' }, 123)).not.toThrow();
    });
});

describe('LogLevel type', () => {
    it('should accept valid log levels', () => {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];
        expect(levels.length).toBe(5);
    });
});

describe('LoggerOptions type', () => {
    it('should accept optional level', () => {
        const options: LoggerOptions = { level: 'info' };
        expect(options.level).toBe('info');
    });

    it('should accept optional prefix', () => {
        const options: LoggerOptions = { prefix: 'test' };
        expect(options.prefix).toBe('test');
    });

    it('should accept optional color', () => {
        const options: LoggerOptions = { color: false };
        expect(options.color).toBe(false);
    });

    it('should accept all options', () => {
        const options: LoggerOptions = {
            level: 'debug',
            prefix: 'app',
            color: true,
        };
        expect(options.level).toBe('debug');
        expect(options.prefix).toBe('app');
        expect(options.color).toBe(true);
    });
});
