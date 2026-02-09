/**
 * Tests for async module
 *
 * Tests async utilities with cancellation support and retry logic
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  createTimeout,
  withTimeout,
  retry,
  sleep,
  batch,
  poll,
  CancellableOptions,
  RetryOptions,
} from '../src/async.js';
import { TimeoutError as WtTimeoutError } from '../src/errors.js';

describe('async', () => {
  describe('createTimeout', () => {
    it('should reject after specified milliseconds', async () => {
      const start = Date.now();
      const timeout = createTimeout(100);
      await expect(timeout).rejects.toThrow();
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(150);
    });

    it('should reject with TimeoutError', async () => {
      await expect(createTimeout(50)).rejects.toThrow(WtTimeoutError);
    });

    it('should include timeout in error message', async () => {
      try {
        await createTimeout(50);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(WtTimeoutError);
        if (error instanceof WtTimeoutError) {
          expect(error.message).toContain('50ms');
        }
      }
    });

    it('should clear timeout on abort', async () => {
      const controller = new AbortController();
      const timeout = createTimeout(5000, controller.signal);

      // Abort immediately
      controller.abort();

      await expect(timeout).rejects.toThrow('aborted');
    });

    it('should handle abort before timeout', async () => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 50);

      const start = Date.now();
      await expect(createTimeout(5000, controller.signal)).rejects.toThrow();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('withTimeout', () => {
    it('should return promise result when it resolves first', async () => {
      const result = await withTimeout(Promise.resolve('success'), { timeout: 1000 });
      expect(result).toBe('success');
    });

    it('should throw timeout when promise takes too long', async () => {
      const slowPromise = new Promise(() => {}); // Never resolves
      await expect(withTimeout(slowPromise, { timeout: 50 })).rejects.toThrow(WtTimeoutError);
    });

    it('should throw error when promise rejects', async () => {
      const error = new Error('Promise failed');
      await expect(withTimeout(Promise.reject(error), { timeout: 1000 })).rejects.toThrow('Promise failed');
    });

    it('should use default timeout when not specified', async () => {
      const result = await withTimeout(Promise.resolve('quick'));
      expect(result).toBe('quick');
    });

    it('should throw on abort signal', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(withTimeout(Promise.resolve('never'), { signal: controller.signal }))
        .rejects.toThrow('aborted');
    });

    it('should handle already aborted signal', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(withTimeout(Promise.resolve('test'), { signal: controller.signal }))
        .rejects.toThrow('aborted');
    });
  });

  describe('retry', () => {
    it('should return result on first success', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        return 'success';
      };

      const result = await retry(fn, { maxAttempts: 3 });
      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Failed');
        }
        return 'success';
      };

      const result = await retry(fn, { maxAttempts: 3, delayMs: 10 });
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw after max attempts', async () => {
      const fn = async () => {
        throw new Error('Always fails');
      };

      await expect(retry(fn, { maxAttempts: 2, delayMs: 10 }))
        .rejects.toThrow('Always fails');
    });

    it('should respect custom delay', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 2) throw new Error('Failed');
        return 'success';
      };

      const start = Date.now();
      await retry(fn, { maxAttempts: 3, delayMs: 100 });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
    });

    it('should use exponential backoff', async () => {
      let attempts = 0;
      const delays: number[] = [];
      const fn = async () => {
        attempts++;
        if (attempts < 4) throw new Error('Failed');
        return 'success';
      };

      const start = Date.now();
      await retry(fn, {
        maxAttempts: 4,
        delayMs: 50,
        backoffMultiplier: 2,
      });
      const elapsed = Date.now() - start;

      // Delays should be: 50, 100, 200 = 350ms minimum
      expect(elapsed).toBeGreaterThanOrEqual(300);
    });

    it('should use shouldRetry predicate', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        const error = new Error('Failed');
        (error as any).retryable = attempts < 2;
        throw error;
      };

      const shouldRetry = (error: unknown) => (error as any).retryable === true;

      await expect(retry(fn, { maxAttempts: 5, shouldRetry }))
        .rejects.toThrow('Failed');
      expect(attempts).toBe(2);
    });

    it('should abort during retry delay', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Error('Failed');
      };

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 30);

      await expect(retry(fn, {
        maxAttempts: 10,
        delayMs: 100,
        signal: controller.signal,
      })).rejects.toThrow('aborted');
    });

    it('should handle already aborted signal', async () => {
      const controller = new AbortController();
      controller.abort();

      const fn = async () => 'success';

      await expect(retry(fn, { signal: controller.signal }))
        .rejects.toThrow('aborted');
    });

    it('should log when verbose is true', async () => {
      const fn = async () => {
        throw new Error('Failed');
      };

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));

      try {
        await expect(retry(fn, {
          maxAttempts: 2,
          delayMs: 10,
          verbose: true,
        })).rejects.toThrow();

        expect(logs.length).toBeGreaterThan(0);
        expect(logs.some(log => log.includes('[retry]'))).toBe(true);
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('sleep', () => {
    it('should resolve after specified milliseconds', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45);
      expect(elapsed).toBeLessThan(100);
    });

    it('should resolve with undefined', async () => {
      const result = await sleep(10);
      expect(result).toBeUndefined();
    });

    it('should abort during sleep', async () => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 20);

      const start = Date.now();
      await expect(sleep(1000, controller.signal)).rejects.toThrow('aborted');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    it('should handle already aborted signal', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(sleep(100, controller.signal)).rejects.toThrow('aborted');
    });
  });

  describe('batch', () => {
    it('should process all items', async () => {
      const items = [1, 2, 3, 4, 5];
      const results = await batch(items, async (x) => x * 2);

      expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    it('should process with concurrency limit', async () => {
      const items = [1, 2, 3, 4, 5];
      let activeCount = 0;
      let maxActiveCount = 0;

      const results = await batch(items, async (x) => {
        activeCount++;
        maxActiveCount = Math.max(maxActiveCount, activeCount);

        await sleep(20);

        activeCount--;
        return x * 2;
      }, { concurrency: 2 });

      expect(results).toEqual([2, 4, 6, 8, 10]);
      expect(maxActiveCount).toBeLessThanOrEqual(2);
    });

    it('should preserve order of results', async () => {
      const items = [10, 20, 30, 40, 50];
      const delays = [50, 10, 30, 20, 40];

      const results = await batch(items, async (x, index) => {
        await sleep(delays[index]!);
        return x;
      }, { concurrency: 3 });

      expect(results).toEqual(items);
    });

    it('should throw on processing error', async () => {
      const items = [1, 2, 3, 4, 5];

      await expect(batch(items, async (x) => {
        if (x === 3) throw new Error('Failed at 3');
        return x;
      })).rejects.toThrow('Failed at 3');
    });

    it('should abort processing', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const controller = new AbortController();

      setTimeout(() => controller.abort(), 30);

      await expect(batch(items, async (x) => {
        await sleep(20);
        return x;
      }, { signal: controller.signal, concurrency: 2 })).rejects.toThrow('aborted');
    });

    it('should handle empty items array', async () => {
      const results = await batch([], async (x) => x * 2);
      expect(results).toEqual([]);
    });

    it('should handle single item', async () => {
      const results = await batch([5], async (x) => x * 2);
      expect(results).toEqual([10]);
    });
  });

  describe('poll', () => {
    it('should resolve when condition is met', async () => {
      let counter = 0;
      const condition = () => {
        counter++;
        return counter >= 3;
      };

      await poll(condition, { intervalMs: 10, timeoutMs: 100 });
      expect(counter).toBe(3);
    });

    it('should resolve immediately for true condition', async () => {
      let calls = 0;
      const condition = () => {
        calls++;
        return true;
      };

      await poll(condition, { intervalMs: 10, timeoutMs: 100 });
      expect(calls).toBe(1);
    });

    it('should timeout when condition is never met', async () => {
      const condition = () => false;

      await expect(poll(condition, { intervalMs: 10, timeoutMs: 50 }))
        .rejects.toThrow(WtTimeoutError);
    });

    it('should handle async conditions', async () => {
      let counter = 0;
      const condition = async () => {
        await sleep(5);
        counter++;
        return counter >= 2;
      };

      await poll(condition, { intervalMs: 10, timeoutMs: 100 });
      expect(counter).toBeGreaterThanOrEqual(2);
    });

    it('should abort during polling', async () => {
      const controller = new AbortController();
      let counter = 0;

      setTimeout(() => controller.abort(), 30);

      await expect(poll(() => {
        counter++;
        return false;
      }, { intervalMs: 10, timeoutMs: 1000, signal: controller.signal }))
        .rejects.toThrow('aborted');
    });

    it('should use default interval and timeout', async () => {
      let calls = 0;
      const condition = () => {
        calls++;
        return true;
      };

      await poll(condition);
      expect(calls).toBe(1);
    });

    it('should respect custom interval', async () => {
      let calls = 0;
      const start = Date.now();

      await poll(() => {
        calls++;
        return calls >= 3;
      }, { intervalMs: 30, timeoutMs: 200 });

      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(50); // At least 2 intervals of 30ms
    });
  });

  describe('edge cases', () => {
    it('should handle zero timeout in createTimeout', async () => {
      await expect(createTimeout(0)).rejects.toThrow();
    });

    it('should handle retry with maxAttempts of 1', async () => {
      const fn = async () => {
        throw new Error('Failed');
      };

      await expect(retry(fn, { maxAttempts: 1 }))
        .rejects.toThrow('Failed');
    });

    it('should handle retry with zero delay', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) throw new Error('Failed');
        return 'success';
      };

      const result = await retry(fn, { maxAttempts: 3, delayMs: 0 });
      expect(result).toBe('success');
    });

    it('should handle batch with concurrency higher than item count', async () => {
      const items = [1, 2];
      const results = await batch(items, async (x) => x * 2, { concurrency: 10 });
      expect(results).toEqual([2, 4]);
    });
  });
});
