// Async Pipeline Examples
// Demonstrates various async/await patterns and pipelines in TypeScript

// ============================================
// Sequential Pipeline
// ============================================

interface User {
  id: string;
  name: string;
  email: string;
}

interface Post {
  id: string;
  userId: string;
  title: string;
  content: string;
}

interface Comment {
  id: string;
  postId: string;
  text: string;
}

async function fetchUser(userId: string): Promise<User> {
  // Simulate API call
  return { id: userId, name: 'John', email: 'john@example.com' };
}

async function fetchUserPosts(userId: string): Promise<Post[]> {
  // Simulate API call
  return [
    { id: '1', userId, title: 'First Post', content: 'Hello World' }
  ];
}

async function fetchPostComments(postId: string): Promise<Comment[]> {
  // Simulate API call
  return [
    { id: 'c1', postId, text: 'Great post!' }
  ];
}

// Sequential execution (slow - waits for each step)
async function getUserDataSequential(userId: string) {
  console.log('Sequential pipeline:');

  const start = Date.now();

  const user = await fetchUser(userId);
  console.log(`1. Fetched user: ${user.name}`);

  const posts = await fetchUserPosts(userId);
  console.log(`2. Fetched ${posts.length} posts`);

  const comments = await fetchPostComments(posts[0].id);
  console.log(`3. Fetched ${comments.length} comments`);

  console.log(`Total time: ${Date.now() - start}ms\n`);

  return { user, posts, comments };
}

// ============================================
// Parallel Pipeline
// ============================================

// Parallel execution (fast - all requests run concurrently)
async function getUserDataParallel(userId: string) {
  console.log('Parallel pipeline:');

  const start = Date.now();

  const [user, posts, comments] = await Promise.all([
    fetchUser(userId),
    fetchUserPosts(userId),
    fetchUserPosts(userId).then(p => fetchPostComments(p[0]?.id || ''))
  ]);

  console.log(`1. Fetched user: ${user.name}`);
  console.log(`2. Fetched ${posts.length} posts`);
  console.log(`3. Fetched ${comments.length} comments`);

  console.log(`Total time: ${Date.now() - start}ms\n`);

  return { user, posts, comments };
}

// ============================================
// Pipeline with Error Handling
// ============================================

type PipelineResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function fetchWithErrorHandling<T>(
  fn: () => Promise<T>
): Promise<PipelineResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

async function getUserDataSafe(userId: string) {
  console.log('Safe pipeline with error handling:');

  const userResult = await fetchWithErrorHandling(() => fetchUser(userId));
  if (!userResult.success) {
    console.error('Failed to fetch user:', userResult.error);
    return null;
  }

  const postsResult = await fetchWithErrorHandling(() =>
    fetchUserPosts(userResult.data.id)
  );
  if (!postsResult.success) {
    console.error('Failed to fetch posts:', postsResult.error);
    return null;
  }

  console.log(`Successfully fetched data for ${userResult.data.name}\n`);

  return { user: userResult.data, posts: postsResult.data };
}

// ============================================
// Retry Pipeline
// ============================================

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.log(`Attempt ${attempt} failed, retrying...`);

      if (attempt < maxAttempts) {
        // Exponential backoff
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  throw lastError;
}

async function fetchUserWithRetry(userId: string) {
  console.log('Retry pipeline:');

  const user = await withRetry(() => fetchUser(userId));
  console.log(`Fetched user after retries: ${user.name}\n`);

  return user;
}

// ============================================
// Batch Processing Pipeline
// ============================================

async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize = 5
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(processor)
    );
    results.push(...batchResults);
  }

  return results;
}

async function fetchMultipleUsers(userIds: string[]) {
  console.log('Batch processing pipeline:');

  const users = await processBatch(
    userIds,
    fetchUser,
    3 // Process 3 at a time
  );

  console.log(`Fetched ${users.length} users in batches\n`);

  return users;
}

// ============================================
// Streaming Pipeline
// ============================================

async function* streamUsers(userIds: string[]): AsyncGenerator<User> {
  for (const id of userIds) {
    yield await fetchUser(id);
  }
}

async function processUserStream(userIds: string[]) {
  console.log('Streaming pipeline:');

  let count = 0;
  for await (const user of streamUsers(userIds)) {
    console.log(`Processed: ${user.name}`);
    count++;
  }

  console.log(`Streamed ${count} users\n`);
}

// ============================================
// Pipeline with Timeout
// ============================================

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

async function fetchUserWithTimeout(userId: string) {
  console.log('Timeout pipeline:');

  try {
    const user = await withTimeout(fetchUser(userId), 100);
    console.log(`Fetched user: ${user.name}\n`);
    return user;
  } catch (error) {
    console.error('Fetch timed out\n');
    throw error;
  }
}

// ============================================
// Orchestrated Pipeline
// ============================================

interface EnrichedUserData {
  user: User;
  posts: Post[];
  postCounts: number;
  totalComments: number;
}

async function orchestrateUserData(userId: string): Promise<EnrichedUserData> {
  console.log('Orchestrated pipeline:');

  // Step 1: Fetch user
  const user = await fetchUser(userId);
  console.log(`Step 1: Fetched user ${user.name}`);

  // Step 2: Fetch posts (parallel)
  const posts = await fetchUserPosts(userId);
  console.log(`Step 2: Fetched ${posts.length} posts`);

  // Step 3: Fetch comments for all posts (parallel)
  const commentsArray = await Promise.all(
    posts.map(post => fetchPostComments(post.id))
  );
  const totalComments = commentsArray.reduce((sum, arr) => sum + arr.length, 0);
  console.log(`Step 3: Fetched ${totalComments} total comments`);

  // Step 4: Transform and enrich
  const enriched: EnrichedUserData = {
    user,
    posts,
    postCounts: posts.length,
    totalComments
  };
  console.log(`Step 4: Created enriched data\n`);

  return enriched;
}

// ============================================
// Run Examples
// ============================================

export async function runExamples() {
  console.log('=== Async Pipeline Examples ===\n');

  await getUserDataSequential('user1');
  await getUserDataParallel('user1');
  await getUserDataSafe('user1');
  await fetchUserWithRetry('user1');
  await fetchMultipleUsers(['user1', 'user2', 'user3', 'user4']);
  await processUserStream(['user1', 'user2', 'user3']);
  await fetchUserWithTimeout('user1');
  await orchestrateUserData('user1');

  console.log('=== All Examples Complete ===');
}

// Run if executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}
