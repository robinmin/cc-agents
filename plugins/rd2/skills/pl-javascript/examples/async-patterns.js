/**
 * Async/Await Pattern Examples
 *
 * This file demonstrates various async/await patterns for JavaScript development.
 */

// ============================================================================
// BASIC ASYNC/AWAIT
// ============================================================================

/**
 * Basic async function with error handling
 */
async function fetchUser(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch user ${userId}:`, error);
    return null;
  }
}

/**
 * Multiple sequential async operations
 */
async function fetchUserData(userId) {
  try {
    const user = await fetch(`/api/users/${userId}`).then(r => r.json());
    const posts = await fetch(`/api/users/${userId}/posts`).then(r => r.json());
    const comments = await fetch(`/api/users/${userId}/comments`).then(r => r.json());

    return { user, posts, comments };
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    throw error;
  }
}

// ============================================================================
// PARALLEL EXECUTION
// ============================================================================

/**
 * Parallel execution with Promise.all
 */
async function fetchUserDataParallel(userId) {
  try {
    const [user, posts, comments] = await Promise.all([
      fetch(`/api/users/${userId}`).then(r => r.json()),
      fetch(`/api/users/${userId}/posts`).then(r => r.json()),
      fetch(`/api/users/${userId}/comments`).then(r => r.json())
    ]);

    return { user, posts, comments };
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    throw error;
  }
}

/**
 * Promise.allSettled - wait for all to complete
 */
async function fetchMultiple(urls) {
  const results = await Promise.allSettled(
    urls.map(url => fetch(url).then(r => r.json()))
  );

  const successful = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);

  const failed = results
    .filter(r => r.status === 'rejected')
    .map(r => r.reason);

  return { successful, failed };
}

// Demo: fetchMultiple (commented - requires actual URLs)
// const multipleResults = await fetchMultiple([
//   'https://api.example.com/1',
//   'https://api.example.com/2'
// ]);

// ============================================================================
// RETRY PATTERN
// ============================================================================

/**
 * Retry fetch with exponential backoff
 */
async function fetchWithRetry(url, retries = 3, delay = 1000) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    console.log(`Retrying... (${retries} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, retries - 1, delay * 2);
  }
}

// ============================================================================
// TIMEOUT PATTERN
// ============================================================================

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// CACHING PATTERN
// ============================================================================

/**
 * Simple in-memory cache for fetch requests
 */
const fetchCache = new Map();

async function cachedFetch(url) {
  if (fetchCache.has(url)) {
    return fetchCache.get(url);
  }

  const response = await fetch(url);
  const data = await response.json();
  fetchCache.set(url, data);
  return data;
}

/**
 * Cache with TTL (time-to-live)
 */
class CacheWithTTL {
  constructor() {
    this.cache = new Map();
  }

  set(key, value, ttl = 60000) {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }
}

const cache = new CacheWithTTL();

async function fetchWithCache(url, ttl = 60000) {
  const cached = cache.get(url);
  if (cached) {
    return cached;
  }

  const response = await fetch(url);
  const data = await response.json();
  cache.set(url, data, ttl);
  return data;
}

// ============================================================================
// DEBOUNCE PATTERN
// ============================================================================

/**
 * Debounce function for rate limiting
 */
function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Usage example:
const debouncedSearch = debounce(async (query) => {
  const results = await fetch(`/api/search?q=${query}`).then(r => r.json());
  return results;
}, 300);

// Demo: debouncedSearch (commented - requires actual API)
// debouncedSearch('typescript').then(results => console.log(results));

// Export demo variables for documentation purposes
export const demo_debouncedSearch = debouncedSearch;

// ============================================================================
// THROTTLE PATTERN
// ============================================================================

/**
 * Throttle function for rate limiting
 */
function throttle(fn, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Usage example:
const throttledScroll = throttle(() => {
  console.log('Scroll position:', window.scrollY);
}, 100);

// Demo: throttledScroll (attach to window scroll event)
// window.addEventListener('scroll', throttledScroll);

// Export demo variables for documentation purposes
export const demo_throttledScroll = throttledScroll;

// ============================================================================
// SEQUENTIAL PROCESSING
// ============================================================================

/**
 * Process array items sequentially
 */
async function processSequentially(items, processor) {
  const results = [];
  for (const item of items) {
    const result = await processor(item);
    results.push(result);
  }
  return results;
}

// Usage example:
const users = [1, 2, 3, 4, 5];
// Demo: processSequentially (commented - requires actual API)
// processSequentially(users, async (id) => {
//   return await fetchUser(id);
// }).then(processedUsers => console.log('Processed users:', processedUsers));

// Export demo variables for documentation purposes
export const demo_users = users;

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process array items in batches
 */
async function processBatch(items, batchSize, processor) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => processor(item))
    );
    results.push(...batchResults);
  }

  return results;
}

// Usage example:
const allUsers = Array.from({ length: 100 }, (_, i) => i + 1);
// Demo: processBatch (commented - requires actual API)
// processBatch(allUsers, 10, async (id) => {
//   return await fetchUser(id);
// }).then(batchProcessed => console.log('Batch processed:', batchProcessed.length, 'users'));

// Export demo variables for documentation purposes
export const demo_allUsers = allUsers;

// ============================================================================
// RACE CONDITION PROTECTION
// ============================================================================

/**
 * Prevent race conditions with request deduplication
 */
class RequestDeduplicator {
  constructor() {
    this.pending = new Map();
  }

  async fetch(key, fn) {
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    const promise = fn().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }
}

// Usage example:
const deduplicator = new RequestDeduplicator();
// Demo: RequestDeduplicator (commented - requires actual API)
// deduplicator.fetch('user:1', () => fetchUser(1))
//   .then(user => console.log('User:', user));
// deduplicator.fetch('user:1', () => fetchUser(1))
//   .then(sameUser => console.log('Same user (cached):', sameUser === user));

// Export demo variables for documentation purposes
export const demo_deduplicator = deduplicator;

// ============================================================================
// QUEUE PATTERN
// ============================================================================

/**
 * Async queue for managing concurrent operations
 */
class AsyncQueue {
  constructor(concurrency = 1) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  async run(fn) {
    while (this.running >= this.concurrency) {
      await new Promise(resolve => {
        this.queue.push(resolve);
      });
    }

    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        const resolve = this.queue.shift();
        resolve();
      }
    }
  }
}

// Usage example:
const queue = new AsyncQueue(3);  // Max 3 concurrent operations

// Demo: AsyncQueue (commented - requires actual API)
// Promise.all([
//   queue.run(() => fetchUser(1)),
//   queue.run(() => fetchUser(2)),
//   queue.run(() => fetchUser(3)),
//   queue.run(() => fetchUser(4)),
//   queue.run(() => fetchUser(5)),
// ]).then(results => console.log('Queue results:', results));

// Export demo variables for documentation purposes
export const demo_queue = queue;

export {
  fetchUser,
  fetchUserData,
  fetchUserDataParallel,
  fetchWithRetry,
  fetchWithTimeout,
  cachedFetch,
  fetchWithCache,
  debounce,
  throttle,
  processSequentially,
  processBatch,
  RequestDeduplicator,
  AsyncQueue
};
