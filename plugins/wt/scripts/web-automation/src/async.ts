/**
 * Async utilities with cancellation support
 *
 * Provides AbortController integration and timeout handling
 * for long-running async operations in WT publishing skills.
 */

import { TimeoutError } from './errors.js';
import { DEFAULT_NETWORK_TIMEOUT } from './constants.js';

// ============================================================================
// AbortController Integration
// ============================================================================

/**
 * Options for cancellable operations
 */
export interface CancellableOptions {
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Timeout in milliseconds (deprecated, use withTimeout instead) */
  timeout?: number;
}

/**
 * Create timeout with abort support
 *
 * Creates a promise that rejects after specified milliseconds,
 * optionally aborted by AbortSignal.
 *
 * @param ms - Timeout in milliseconds
 * @param signal - Optional abort signal
 * @returns Promise that rejects on timeout or abort
 * @throws {TimeoutError} When timeout occurs
 * @throws {Error} When operation is aborted
 *
 * @example
 * ```typescript
 * const result = await Promise.race([
 *   myOperation(),
 *   createTimeout(5000, signal)
 * ]);
 * ```
 */
export function createTimeout(
  ms: number,
  signal?: AbortSignal
): Promise<never> {
  return new Promise((_, reject) => {
    const timeout = setTimeout(() => {
      reject(new TimeoutError(`Operation timed out after ${ms}ms`, ms));
    }, ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('Operation was aborted'));
    }, { once: true });
  });
}

/**
 * Race with timeout and abort
 *
 * Wraps a promise with timeout and cancellation support.
 *
 * @param promise - The promise to race
 * @param options - Timeout and abort options
 * @returns The promise result or throws timeout/abort error
 * @throws {TimeoutError} When timeout occurs
 * @throws {Error} When operation is aborted
 *
 * @example
 * ```typescript
 * await withTimeout(fetch(url), { timeout: 30000, signal });
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  options: CancellableOptions = {}
): Promise<T> {
  const { signal, timeout = DEFAULT_NETWORK_TIMEOUT } = options;

  if (signal?.aborted) {
    throw new Error('Operation was aborted');
  }

  return Promise.race([
    promise,
    createTimeout(timeout, signal),
  ]);
}

// ============================================================================
// Retry Utilities
// ============================================================================

/**
 * Options for retry operations
 */
export interface RetryOptions extends CancellableOptions {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Delay between retries in milliseconds */
  delayMs?: number;
  /** Backoff multiplier for exponential backoff */
  backoffMultiplier?: number;
  /** Function to determine if error is retryable */
  shouldRetry?: (error: unknown) => boolean;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Function to retry
 * @param options - Retry options
 * @returns Result of function
 * @throws Last error if all retries fail
 *
 * @example
 * ```typescript
 * await retry(
 *   () => fetch(url),
 *   { maxAttempts: 3, delayMs: 1000, verbose: true }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    signal,
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
    verbose = false,
  } = options;

  if (signal?.aborted) {
    throw new Error('Operation was aborted');
  }

  let lastError: unknown;
  let delay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt < maxAttempts && shouldRetry(error)) {
        if (verbose) {
          console.log(`[retry] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`);
        }

        // Wait for delay or abort
        try {
          await Promise.race([
            new Promise(resolve => setTimeout(resolve, delay)),
            signal ? createTimeout(delay, signal) : new Promise(() => {}),
          ]);
        } catch {
          throw new Error('aborted');
        }

        delay *= backoffMultiplier;
      } else {
        // No more retries
        if (verbose && attempt === maxAttempts) {
          console.log(`[retry] All ${maxAttempts} attempts failed`);
        }
        break;
      }
    }
  }

  throw lastError;
}

// ============================================================================
// Delay Utilities
// ============================================================================

/**
 * Sleep for specified milliseconds
 *
 * @param ms - Milliseconds to sleep
 * @param signal - Optional abort signal
 * @returns Promise that resolves after delay
 * @throws {Error} When aborted during sleep
 *
 * @example
 * ```typescript
 * await sleep(1000); // Sleep for 1 second
 * await sleep(5000, signal); // Sleep with abort support
 * ```
 */
export async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw new Error('Operation was aborted');
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => resolve(), ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('Sleep was aborted'));
    }, { once: true });
  });
}

// ============================================================================
// Batch/Parallel Operations
// ============================================================================

/**
 * Process items in batches with concurrency limit
 *
 * @param items - Items to process
 * @param processor - Function to process each item
 * @param options - Batch options
 * @returns Array of results
 *
 * @example
 * ```typescript
 * const results = await batch(
 *   urls,
 *   (url) => fetch(url),
 *   { concurrency: 5 }
 * );
 * ```
 */
export async function batch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: {
    concurrency?: number;
    signal?: AbortSignal;
  } = {}
): Promise<R[]> {
  const { concurrency = 5, signal } = options;

  if (signal?.aborted) {
    throw new Error('Operation was aborted');
  }

  const results: R[] = [];
  const errors: Array<{ index: number; error: unknown }> = [];
  let index = 0;

  const processNext = async (): Promise<void> => {
    if (signal?.aborted) {
      throw new Error('Operation was aborted');
    }

    const currentIndex = index++;
    if (currentIndex >= items.length) return;

    const item = items[currentIndex]!;

    try {
      const result = await processor(item, currentIndex);
      results[currentIndex] = result;
    } catch (error) {
      errors.push({ index: currentIndex, error });
    }

    // Process next item
    await processNext();
  };

  // Start initial batch
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => processNext());
  await Promise.all(workers);

  // Handle errors
  if (errors.length > 0) {
    const errorSummary = errors.map(({ index, error }) => `[${index}]: ${error}`).join(', ');
    throw new Error(`Batch processing failed for ${errors.length} items: ${errorSummary}`);
  }

  return results;
}

// ============================================================================
// Polling Utilities
// ============================================================================

/**
 * Poll until condition is met
 *
 * @param condition - Function that returns true when condition is met
 * @param options - Polling options
 * @returns Promise that resolves when condition is met
 * @throws {TimeoutError} When timeout occurs
 *
 * @example
 * ```typescript
 * await poll(
 *   () => document.querySelector('#my-element') !== null,
 *   { intervalMs: 100, timeoutMs: 5000 }
 * );
 * ```
 */
export async function poll(
  condition: () => boolean | Promise<boolean>,
  options: {
    intervalMs?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
  } = {}
): Promise<void> {
  const { intervalMs = 100, timeoutMs = 30000, signal } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (signal?.aborted) {
      throw new Error('Polling was aborted');
    }

    if (await condition()) {
      return;
    }

    await sleep(Math.min(intervalMs, timeoutMs - (Date.now() - startTime)), signal);
  }

  throw new TimeoutError(`Polling timed out after ${timeoutMs}ms`, timeoutMs);
}
