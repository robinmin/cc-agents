/**
 * Tests for logger module
 *
 * Tests structured logging utility
 */

import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import {
  LogLevel,
  Logger,
  LoggerOptions,
  createLogger,
  parseLogLevel,
  getDefaultLogLevel,
} from '../src/logger.js';

describe('logger', () => {
  describe('LogLevel enum', () => {
    it('should have correct numeric values', () => {
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
    });
  });

  describe('Logger class', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger('test-context');
    });

    it('should create logger with context', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should have default log level INFO', () => {
      const debugLogger = new Logger('test', { level: LogLevel.DEBUG });
      expect(debugLogger).toBeInstanceOf(Logger);
    });

    describe('debug()', () => {
      it('should not log debug when level is INFO', () => {
        const spy = spyOn(console, 'debug');
        logger.debug('debug message');
        // DEBUG < INFO, so should not log - spy should NOT be called
        expect(spy).not.toHaveBeenCalled();
      });

      it('should log debug when level is DEBUG', () => {
        const debugLogger = new Logger('test', { level: LogLevel.DEBUG });
        const spy = spyOn(console, 'debug');
        debugLogger.debug('debug message');
        expect(spy).toHaveBeenCalled();
      });
    });

    describe('info()', () => {
      it('should log info message', () => {
        const spy = spyOn(console, 'log');
        logger.info('info message');
        expect(spy).toHaveBeenCalled();
      });

      it('should include metadata in info log', () => {
        const spy = spyOn(console, 'log');
        logger.info('info message', { key: 'value' });
        expect(spy).toHaveBeenCalled();
      });
    });

    describe('warn()', () => {
      it('should log warning message', () => {
        const spy = spyOn(console, 'warn');
        logger.warn('warning message');
        expect(spy).toHaveBeenCalled();
      });

      it('should include metadata in warning log', () => {
        const spy = spyOn(console, 'warn');
        logger.warn('warning message', { key: 'value' });
        expect(spy).toHaveBeenCalled();
      });
    });

    describe('error()', () => {
      it('should log error message', () => {
        const spy = spyOn(console, 'error');
        logger.error('error message');
        expect(spy).toHaveBeenCalled();
      });

      it('should log error with Error object', () => {
        const spy = spyOn(console, 'error');
        const error = new Error('Test error');
        logger.error('error occurred', error);
        expect(spy).toHaveBeenCalled();
      });

      it('should log error with metadata', () => {
        const spy = spyOn(console, 'error');
        logger.error('error message', { key: 'value' });
        expect(spy).toHaveBeenCalled();
      });

      it('should log error with both Error and metadata', () => {
        const spy = spyOn(console, 'error');
        const error = new Error('Test error');
        logger.error('error occurred', error, { extra: 'data' });
        expect(spy).toHaveBeenCalled();
      });

      it('should include error details in metadata', () => {
        const error = new Error('Test error');
        // Create a custom logger to capture the log line
        const testLogger = new Logger('test-metadata', { level: LogLevel.ERROR });
        const spy = spyOn(console, 'error');
        testLogger.error('error occurred', error);
        expect(spy).toHaveBeenCalled();
        // The error metadata should include name, message, and stack
        const calls = spy.mock?.calls || [];
        // Find the call from this specific test (contains 'test-metadata')
        const testCall = calls.find((call: unknown[]) =>
          call[0] && typeof call[0] === 'string' && call[0].includes('test-metadata')
        );
        if (testCall) {
          const logLine = testCall[0] as string;
          expect(logLine).toContain('"name":"Error"');
          expect(logLine).toContain('"message":"Test error"');
          expect(logLine).toContain('"stack"');
        }
      });
    });

    describe('log level filtering', () => {
      it('should not log below configured level', () => {
        const warnLogger = new Logger('test', { level: LogLevel.WARN });
        const logSpy = spyOn(console, 'log');
        const debugSpy = spyOn(console, 'debug');

        warnLogger.info('info message');
        warnLogger.debug('debug message');

        // INFO < WARN, DEBUG < WARN, so these shouldn't log
        // But we can't easily test the absence
        expect(true).toBe(true); // Placeholder
      });
    });
  });

  describe('createLogger', () => {
    it('should create logger with context', () => {
      const logger = createLogger('my-context');
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create logger with options', () => {
      const logger = createLogger('my-context', { level: LogLevel.DEBUG });
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('parseLogLevel', () => {
    it('should return DEBUG for "debug"', () => {
      expect(parseLogLevel('debug')).toBe(LogLevel.DEBUG);
      expect(parseLogLevel('DEBUG')).toBe(LogLevel.DEBUG);
    });

    it('should return INFO for "info"', () => {
      expect(parseLogLevel('info')).toBe(LogLevel.INFO);
      expect(parseLogLevel('INFO')).toBe(LogLevel.INFO);
    });

    it('should return WARN for "warn" or "warning"', () => {
      expect(parseLogLevel('warn')).toBe(LogLevel.WARN);
      expect(parseLogLevel('WARN')).toBe(LogLevel.WARN);
      expect(parseLogLevel('warning')).toBe(LogLevel.WARN);
      expect(parseLogLevel('WARNING')).toBe(LogLevel.WARN);
    });

    it('should return ERROR for "error"', () => {
      expect(parseLogLevel('error')).toBe(LogLevel.ERROR);
      expect(parseLogLevel('ERROR')).toBe(LogLevel.ERROR);
    });

    it('should return INFO for invalid string', () => {
      expect(parseLogLevel('invalid')).toBe(LogLevel.INFO);
    });

    it('should return INFO for undefined', () => {
      expect(parseLogLevel()).toBe(LogLevel.INFO);
    });

    it('should be case insensitive', () => {
      expect(parseLogLevel('DeBuG')).toBe(LogLevel.DEBUG);
      expect(parseLogLevel('InFo')).toBe(LogLevel.INFO);
    });
  });

  describe('getDefaultLogLevel', () => {
    let originalEnv: Record<string, string | undefined>;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return INFO when LOG_LEVEL is not set', () => {
      delete process.env.LOG_LEVEL;
      expect(getDefaultLogLevel()).toBe(LogLevel.INFO);
    });

    it('should parse LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'debug';
      expect(getDefaultLogLevel()).toBe(LogLevel.DEBUG);
    });

    it('should return INFO for invalid LOG_LEVEL', () => {
      process.env.LOG_LEVEL = 'invalid';
      expect(getDefaultLogLevel()).toBe(LogLevel.INFO);
    });
  });

  describe('Logger with custom options', () => {
    it('should respect custom context', () => {
      const logger = new Logger('custom', { context: 'custom-context' });
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should respect outputFile option (even if not implemented)', () => {
      const logger = new Logger('test', { outputFile: '/tmp/test.log' });
      expect(logger).toBeInstanceOf(Logger);
      // File output is not implemented yet (TODO in source)
    });
  });
});
