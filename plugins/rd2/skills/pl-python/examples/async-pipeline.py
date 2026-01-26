#!/usr/bin/env python3
"""
Async Data Processing Pipeline Example

Demonstrates a complete async pipeline with:
- Concurrent data fetching
- Controlled concurrency with Semaphore
- Error handling and retries
- Producer-consumer pattern
"""

import asyncio
from typing import AsyncIterator
import random


# ============================================================================
# Example 1: Concurrent Fetching with TaskGroup (Python 3.11+)
# ============================================================================

async def fetch_user(user_id: int) -> dict:
    """Simulate fetching user data from API."""
    await asyncio.sleep(random.uniform(0.1, 0.3))  # Simulate network I/O
    if random.random() < 0.05:  # 5% chance of failure
        raise ValueError(f"Failed to fetch user {user_id}")
    return {"id": user_id, "name": f"User{user_id}"}


async def fetch_all_users_taskgroup(user_ids: list[int]) -> list[dict]:
    """
    Fetch multiple users concurrently using TaskGroup.

    TaskGroup advantages:
    - Cancels remaining tasks on error (no orphaned tasks)
    - Raises ExceptionGroup with all exceptions
    - Structured concurrency (context manager)
    """
    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(fetch_user(uid)) for uid in user_ids]

    # All tasks complete or none do
    return [task.result() for task in tasks]


# ============================================================================
# Example 2: Controlled Concurrency with Semaphore
# ============================================================================

async def fetch_with_semaphore(
    user_id: int,
    semaphore: asyncio.Semaphore
) -> dict:
    """Fetch with concurrency limit."""
    async with semaphore:
        return await fetch_user(user_id)


async def fetch_all_limited(user_ids: list[int], max_concurrent: int = 5) -> list[dict | BaseException]:
    """
    Fetch with controlled concurrency.

    Use when:
    - Rate-limited APIs
    - Resource constraints
    - Need to avoid overwhelming external service
    """
    semaphore = asyncio.Semaphore(max_concurrent)
    tasks = [fetch_with_semaphore(uid, semaphore) for uid in user_ids]
    return await asyncio.gather(*tasks, return_exceptions=True)


# ============================================================================
# Example 3: Producer-Consumer Pattern with Queue
# ============================================================================

async def producer(queue: asyncio.Queue, items: list[int]) -> None:
    """Produce items into queue."""
    for item in items:
        await asyncio.sleep(random.uniform(0.05, 0.1))
        await queue.put(item)
        print(f"Produced: {item}")

    # Signal end of production
    for _ in range(3):  # Number of consumers
        await queue.put(None)


async def consumer(name: str, queue: asyncio.Queue) -> None:
    """Consume items from queue."""
    while True:
        item = await queue.get()

        if item is None:
            print(f"{name}: No more items")
            queue.task_done()
            break

        # Process item
        await asyncio.sleep(random.uniform(0.1, 0.2))
        print(f"{name}: Processed {item}")
        queue.task_done()


async def producer_consumer_pipeline(items: list[int]) -> None:
    """Run producer-consumer pipeline."""
    queue = asyncio.Queue(maxsize=10)

    # Start consumers
    consumers = [
        asyncio.create_task(consumer(f"Worker-{i}", queue))
        for i in range(3)
    ]

    # Start producer
    await producer(queue, items)

    # Wait for queue to empty
    await queue.join()

    # Wait for consumers to finish
    await asyncio.gather(*consumers)


# ============================================================================
# Example 4: Streaming Pipeline with Async Generators
# ============================================================================

async def data_source(count: int) -> AsyncIterator[int]:
    """Generate data with async delays."""
    for i in range(count):
        await asyncio.sleep(0.05)
        yield i


async def transform(source: AsyncIterator[int]) -> AsyncIterator[str]:
    """Transform data in pipeline."""
    async for item in source:
        await asyncio.sleep(0.02)
        yield f"processed-{item}"


async def sink(source: AsyncIterator[str]) -> None:
    """Consume final data."""
    async for item in source:
        print(f"Received: {item}")


async def streaming_pipeline(count: int) -> None:
    """Execute streaming pipeline with backpressure."""
    data = data_source(count)
    processed = transform(data)
    await sink(processed)


# ============================================================================
# Example 5: Retry Pattern with Exponential Backoff
# ============================================================================

async def retry(
    func,
    max_retries: int = 3,
    base_delay: float = 1.0,
    *args,
    **kwargs
):
    """Retry async function with exponential backoff."""
    last_exception = None

    for attempt in range(max_retries):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            last_exception = e
            wait_time = base_delay * (2 ** attempt)
            print(f"Attempt {attempt + 1} failed, retrying in {wait_time:.1f}s...")
            await asyncio.sleep(wait_time)

    # last_exception is guaranteed to be set here since max_retries >= 1
    assert last_exception is not None
    raise last_exception


# ============================================================================
# Example 6: Complete Pipeline with Error Handling
# ============================================================================

async def complete_pipeline() -> None:
    """
    Complete pipeline demonstrating all patterns.
    """
    print("=" * 60)
    print("Async Pipeline Examples")
    print("=" * 60)

    # Example 1: TaskGroup
    print("\n1. TaskGroup (Structured Concurrency):")
    try:
        users = await fetch_all_users_taskgroup([1, 2, 3, 4, 5])
        print(f"   Fetched {len(users)} users")
    except ExceptionGroup as eg:
        print(f"   Errors: {len(eg.exceptions)}")

    # Example 2: Controlled Concurrency
    print("\n2. Controlled Concurrency (Semaphore):")
    results = await fetch_all_limited(list(range(1, 11)), max_concurrent=3)
    successful = [r for r in results if not isinstance(r, Exception)]
    print(f"   Fetched {len(successful)}/{len(results)} users")

    # Example 3: Producer-Consumer
    print("\n3. Producer-Consumer Pipeline:")
    await producer_consumer_pipeline(list(range(10)))

    # Example 4: Streaming
    print("\n4. Streaming Pipeline:")
    await streaming_pipeline(5)

    # Example 5: Retry
    print("\n5. Retry with Backoff:")
    try:
        result = await retry(fetch_user, 3, 999)
        print(f"   Success: {result}")
    except Exception as e:
        print(f"   Failed after retries: {e}")

    print("\n" + "=" * 60)
    print("Pipeline complete!")
    print("=" * 60)


if __name__ == "__main__":
    # Python 3.7+
    asyncio.run(complete_pipeline())
