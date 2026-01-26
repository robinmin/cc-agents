# Python Async Patterns

Complete guide to async/await patterns in Python for data processing pipelines and concurrent operations.

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Async Fundamentals](#async-fundamentals)
3. [Common Patterns](#common-patterns)
4. [Data Processing Pipelines](#data-processing-pipelines)
5. [Error Handling](#error-handling)
6. [Performance Considerations](#performance-considerations)
7. [Testing Async Code](#testing-async-code)

---

## Core Concepts

### When to Use Async

| Use Case | Async Benefit | Recommendation |
|----------|--------------|----------------|
| **I/O-bound** | Non-blocking waits | Use async |
| **API calls** | Concurrent requests | Use async |
| **Database queries** | Parallel queries | Use async |
| **File operations** | Non-blocking reads | Use async (aiofiles) |
| **CPU-bound** | No benefit | Use multiprocessing |

**Rule of Thumb:** If waiting for external systems, use async. If crunching numbers, use threads/processes.

### Event Loop Basics

```python
import asyncio

async def main():
    """Entry point for async programs."""
    # Event loop runs here
    await asyncio.sleep(1)

if __name__ == "__main__":
    # Modern Python 3.7+
    asyncio.run(main())
```

---

## Async Fundamentals

### Defining Coroutines

```python
import asyncio
from typing import Awaitable

async def fetch_data(url: str) -> dict:
    """Async coroutine - must be awaited."""
    await asyncio.sleep(0.1)  # Simulate I/O
    return {"url": url, "data": "response"}

def sync_function() -> None:
    """Regular function - cannot use await."""
    # Cannot call fetch_data() directly here
    pass

async def async_function():
    """Async function can call other async functions."""
    result = await fetch_data("https://api.example.com")
    print(result)
```

### Running Async Code

```python
import asyncio

async def task():
    await asyncio.sleep(1)
    return "done"

# Method 1: asyncio.run (Python 3.7+)
asyncio.run(task())

# Method 2: Create task and await
async def main():
    result = await asyncio.create_task(task())
    print(result)

asyncio.run(main())
```

---

## Common Patterns

### Pattern 1: Concurrent Execution

**Use `asyncio.gather()` for independent tasks:**

```python
import asyncio

async def fetch_user(user_id: int):
    await asyncio.sleep(0.1)
    return {"id": user_id, "name": f"User{user_id}"}

async def main():
    # Run concurrently - ~0.1s total, not 0.5s
    results = await asyncio.gather(
        fetch_user(1),
        fetch_user(2),
        fetch_user(3),
        fetch_user(4),
        fetch_user(5),
    )
    print(results)

asyncio.run(main())
```

**When to use:** Multiple independent I/O operations.

### Pattern 2: Controlled Concurrency

**Use `asyncio.Semaphore` to limit concurrent operations:**

```python
import asyncio

async def fetch_with_limit(url: str, semaphore: asyncio.Semaphore):
    async with semaphore:  # Limit concurrent requests
        await asyncio.sleep(0.1)
        return f"Fetched: {url}"

async def main():
    # Max 5 concurrent requests
    semaphore = asyncio.Semaphore(5)

    tasks = [
        fetch_with_limit(f"url-{i}", semaphore)
        for i in range(20)
    ]

    results = await asyncio.gather(*tasks)
    print(results)

asyncio.run(main())
```

**When to use:** Rate-limited APIs, resource constraints.

### Pattern 3: Producer-Consumer

**Use `asyncio.Queue` for pipeline processing:**

```python
import asyncio

async def producer(queue: asyncio.Queue, items: list):
    """Put items into the queue."""
    for item in items:
        await queue.put(item)
        print(f"Produced: {item}")

    # Signal end of production
    for _ in range(3):  # Number of consumers
        await queue.put(None)

async def consumer(name: str, queue: asyncio.Queue):
    """Process items from the queue."""
    while True:
        item = await queue.get()

        if item is None:
            print(f"{name}: No more items")
            queue.task_done()
            break

        # Simulate processing
        await asyncio.sleep(0.1)
        print(f"{name}: Consumed {item}")
        queue.task_done()

async def main():
    queue = asyncio.Queue(maxsize=10)

    # Start consumers
    consumers = [
        asyncio.create_task(consumer(f"Worker-{i}", queue))
        for i in range(3)
    ]

    # Start producer
    await producer(queue, range(15))

    # Wait for queue to empty
    await queue.join()

    # Wait for consumers to finish
    await asyncio.gather(*consumers)

asyncio.run(main())
```

**When to use:** Buffering between producers/consumers, rate smoothing.

### Pattern 4: Task Pipelines

**Chain async coroutines with `async for`:**

```python
import asyncio
from typing import AsyncIterator

async def data_source(count: int) -> AsyncIterator[int]:
    """Generate data."""
    for i in range(count):
        await asyncio.sleep(0.05)
        yield i

async def transform(source: AsyncIterator[int]) -> AsyncIterator[str]:
    """Transform data."""
    async for item in source:
        await asyncio.sleep(0.02)
        yield f"processed-{item}"

async def sink(source: AsyncIterator[str]):
    """Consume final data."""
    async for item in source:
        print(f"Received: {item}")

async def main():
    data = data_source(5)
    transformed = transform(data)
    await sink(transformed)

asyncio.run(main())
```

**When to use:** Multi-stage processing pipelines.

---

## Data Processing Pipelines

### Pipeline Pattern: Fetch-Process-Save

```python
import asyncio
from typing import Any

async def fetch(urls: list[str]) -> list[dict]:
    """Fetch data from multiple URLs concurrently."""
    async def fetch_one(url: str):
        await asyncio.sleep(0.1)  # Simulate network I/O
        return {"url": url, "status": 200}

    tasks = [fetch_one(url) for url in urls]
    return await asyncio.gather(*tasks)

async def process(data: list[dict]) -> list[dict]:
    """Process fetched data."""
    async def process_one(item: dict):
        await asyncio.sleep(0.05)  # Simulate processing
        return {**item, "processed": True}

    tasks = [process_one(item) for item in data]
    return await asyncio.gather(*tasks)

async def save(data: list[dict]) -> None:
    """Save processed data."""
    async def save_one(item: dict):
        await asyncio.sleep(0.02)  # Simulate storage I/O
        print(f"Saved: {item['url']}")

    await asyncio.gather(*[save_one(item) for item in data])

async def pipeline(urls: list[str]):
    """Execute the full pipeline."""
    # Stage 1: Fetch
    fetched = await fetch(urls)
    print(f"Fetched {len(fetched)} items")

    # Stage 2: Process (depends on fetch)
    processed = await process(fetched)
    print(f"Processed {len(processed)} items")

    # Stage 3: Save (depends on process)
    await save(processed)
    print("Pipeline complete")

if __name__ == "__main__":
    urls = [f"https://api.example.com/data/{i}" for i in range(10)]
    asyncio.run(pipeline(urls))
```

### Streaming Pipeline (for Large Datasets)

```python
import asyncio
from typing import AsyncIterator

async def fetch_stream(urls: list[str]) -> AsyncIterator[dict]:
    """Stream fetch results as they complete."""
    async def fetch_one(url: str):
        await asyncio.sleep(0.1)
        return {"url": url, "data": "response"}

    for url in urls:
        yield await fetch_one(url)

async def process_stream(source: AsyncIterator[dict]) -> AsyncIterator[dict]:
    """Stream process results."""
    async for item in source:
        await asyncio.sleep(0.05)
        yield {**item, "processed": True}

async def save_stream(source: AsyncIterator[dict]):
    """Stream save results."""
    async for item in source:
        await asyncio.sleep(0.02)
        print(f"Saved: {item['url']}")

async def streaming_pipeline(urls: list[str]):
    """Execute streaming pipeline with backpressure."""
    data = fetch_stream(urls)
    processed = process_stream(data)
    await save_stream(processed)

if __name__ == "__main__":
    urls = [f"https://api.example.com/data/{i}" for i in range(10)]
    asyncio.run(streaming_pipeline(urls))
```

---

## Error Handling

### Handling Exceptions in Gather

```python
import asyncio

async def task(name: str, fail: bool = False):
    await asyncio.sleep(0.1)
    if fail:
        raise ValueError(f"{name} failed")
    return f"{name} succeeded"

async def main():
    # By default, first exception propagates immediately
    try:
        results = await asyncio.gather(
            task("A"),
            task("B", fail=True),  # This will fail
            task("C"),
        )
    except ValueError as e:
        print(f"Failed: {e}")

    # Return exceptions instead of raising
    results = await asyncio.gather(
        task("A"),
        task("B", fail=True),
        task("C"),
        return_exceptions=True
    )
    for result in results:
        if isinstance(result, Exception):
            print(f"Error: {result}")
        else:
            print(f"Success: {result}")

asyncio.run(main())
```

### Retry Pattern

```python
import asyncio
from typing import Callable, TypeVar

T = TypeVar("T")

async def retry(
    func: Callable[..., Awaitable[T]],
    max_retries: int = 3,
    delay: float = 1.0,
    *args,
    **kwargs
) -> T:
    """Retry an async function with exponential backoff."""
    last_exception = None

    for attempt in range(max_retries):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            last_exception = e
            wait_time = delay * (2 ** attempt)
            print(f"Attempt {attempt + 1} failed, retrying in {wait_time}s...")
            await asyncio.sleep(wait_time)

    raise last_exception

async def unreliable_api_call():
    """Simulate unreliable API."""
    import random
    await asyncio.sleep(0.1)
    if random.random() < 0.7:
        raise ConnectionError("API unavailable")
    return {"status": "ok"}

async def main():
    result = await retry(unreliable_api_call, max_retries=5)
    print(result)

asyncio.run(main())
```

---

## Performance Considerations

### Avoid Blocking the Event Loop

```python
import asyncio
import time

async def bad_blocking():
    """Never do this - blocks the entire event loop."""
    time.sleep(1)  # BAD: Blocks all async operations

async def good_nonblocking():
    """Correct way - yields control to event loop."""
    await asyncio.sleep(1)  # GOOD: Non-blocking

# For CPU-bound work, use run_in_executor
async def cpu_bound():
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, lambda: sum(range(10_000_000)))
    return result
```

### Connection Pooling

```python
import aiohttp
import asyncio

async def fetch_with_session(session: aiohttp.ClientSession, url: str):
    async with session.get(url) as response:
        return await response.text()

async def main():
    # Reuse session across requests (connection pooling)
    async with aiohttp.ClientSession() as session:
        urls = [f"https://api.example.com/data/{i}" for i in range(10)]

        tasks = [fetch_with_session(session, url) for url in urls]
        results = await asyncio.gather(*tasks)

        print(f"Fetched {len(results)} URLs")

asyncio.run(main())
```

### Controlling Concurrency

```python
import asyncio

async def task_with_semaphore(semaphore: asyncio.Semaphore, task_id: int):
    async with semaphore:
        print(f"Task {task_id} started")
        await asyncio.sleep(1)
        print(f"Task {task_id} completed")

async def main():
    # Limit to 3 concurrent tasks
    semaphore = asyncio.Semaphore(3)

    tasks = [
        task_with_semaphore(semaphore, i)
        for i in range(10)
    ]

    await asyncio.gather(*tasks)

asyncio.run(main())
```

---

## Testing Async Code

### Using pytest-asyncio

```python
import pytest
import asyncio

@pytest.mark.asyncio
async def test_simple_async():
    """Basic async test."""
    await asyncio.sleep(0.1)
    assert True

@pytest.mark.asyncio
async def test_async_fixture(async_client):
    """Test with async fixture."""
    response = await async_client.get("/api/data")
    assert response.status_code == 200
```

### Async Fixtures

```python
import pytest
import aiohttp

@pytest.fixture
async def async_client():
    """Async fixture - automatically cleaned up."""
    async with aiohttp.ClientSession() as session:
        yield session

@pytest.mark.asyncio
async def test_with_fixture(async_client):
    response = await async_client.get("https://httpbin.org/get")
    assert response.status == 200
```

### Mocking Async Functions

```python
import pytest
from unittest.mock import AsyncMock

@pytest.mark.asyncio
async def test_with_mock():
    """Mock async function."""
    mock_func = AsyncMock(return_value={"data": "test"})

    result = await mock_func()
    assert result == {"data": "test"}
    mock_func.assert_called_once()
```

---

## Quick Reference

### Common Async Libraries

| Library | Purpose | Use Case |
|---------|---------|----------|
| `asyncio` | Standard library | All async operations |
| `aiohttp` | HTTP client/server | Async HTTP requests |
| `aiofiles` | File operations | Async file I/O |
| `asyncpg` | PostgreSQL | Async DB access |
| `motor` | MongoDB | Async MongoDB |
| `aiobotocore` | AWS SDK | Async S3/DynamoDB |

### Anti-Patterns to Avoid

| Anti-Pattern | Why Bad | Solution |
|--------------|---------|----------|
| `time.sleep()` in async | Blocks event loop | Use `asyncio.sleep()` |
| Mixing sync/async without care | Confusing, can block | Use `run_in_executor` |
| Fire-and-forget tasks | Errors are silenced | Always await or track tasks |
| Unbounded concurrency | Resource exhaustion | Use `Semaphore` |

### Common Snippets

```python
# Create task and don't await (fire-and-forget with tracking)
task = asyncio.create_task(coroutine())
all_tasks = asyncio.all_tasks()

# Wait for first to complete
done, pending = await asyncio.wait(
    [task1, task2],
    return_when=asyncio.FIRST_COMPLETED
)

# Timeout
try:
    result = await asyncio.wait_for(coroutine(), timeout=5.0)
except asyncio.TimeoutError:
    print("Operation timed out")
```

---

## References

- [Python asyncio Documentation](https://docs.python.org/3/library/asyncio.html)
- [Real Python Async IO](https://realpython.com/async-io-python/)
- [AIOHTTP Documentation](https://docs.aiohttp.org/)
