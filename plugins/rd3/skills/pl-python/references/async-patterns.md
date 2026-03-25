---
name: async-patterns
description: "Complete async/await patterns for Python data pipelines and concurrent operations"
see_also:
  - rd3:pl-python
  - rd3:sys-developing
---

# Python Async Patterns

Complete guide to async/await patterns in Python for data processing pipelines and concurrent operations.

## Core Concepts

### When to Use Async

| Use Case | Async Benefit | Recommendation |
|----------|--------------|----------------|
| **I/O-bound** | Non-blocking waits | Use async |
| **API calls** | Concurrent requests | Use async |
| **Database queries** | Parallel queries | Use async (asyncpg, SQLAlchemy 2.0) |
| **File operations** | Non-blocking reads | Use async (aiofiles) |
| **CPU-bound** | No benefit | Use `multiprocessing` |

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

### Pattern 1: Concurrent Execution with gather()

Use `asyncio.gather()` for independent tasks:

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

### Pattern 2: Structured Concurrency with TaskGroup (3.11+)

Use `asyncio.TaskGroup` for structured concurrency with automatic error handling:

```python
import asyncio

async def fetch_all(urls: list[str]) -> list[dict]:
    """Structured concurrency - all tasks complete or none do."""
    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(fetch(url)) for url in urls]

    # All tasks complete, errors handled as group
    return [task.result() for task in tasks]
```

**TaskGroup vs gather():**

| Feature | `asyncio.gather()` | `asyncio.TaskGroup` |
|---------|-------------------|---------------------|
| Cancellation on error | No | Yes (cancels all) |
| Exception handling | First exception or all | ExceptionGroup |
| Orphaned tasks | Possible | Impossible |
| Scope | Unstructured | Structured (context manager) |

**When to use:** Prefer TaskGroup for 3.11+ projects.

### Pattern 3: Controlled Concurrency with Semaphore

Use `asyncio.Semaphore` to limit concurrent operations:

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

### Pattern 4: Producer-Consumer with Queue

Use `asyncio.Queue` for pipeline processing:

```python
import asyncio
from typing import Any

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

### Pattern 5: Task Pipelines with Async Generators

Chain async coroutines with `async for`:

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

### Handling Exceptions in TaskGroup (3.11+)

```python
import asyncio

async def run_all():
    try:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(task("A"))
            tg.create_task(task("B"))
            tg.create_task(task("C"))
    except* ExceptionGroup as eg:
        # Handle multiple exceptions
        for exc in eg.exceptions:
            print(f"Error: {exc}")

asyncio.run(run_all())
```

### Retry Pattern

```python
import asyncio
from typing import Callable, TypeVar

T = TypeVar("T")

async def retry(
    func: Callable[..., asyncio.Task[T]],
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

## Timeout Handling (3.11+)

### asyncio.timeout() — Preferred

```python
import asyncio

async def fetch_with_timeout(url: str):
    try:
        async with asyncio.timeout(10.0):  # 10 second deadline
            return await fetch(url)
    except TimeoutError:
        print(f"Timeout fetching {url}")
        return None
```

### asyncio.timeout() vs asyncio.wait_for()

| Feature | `asyncio.wait_for()` | `asyncio.timeout()` |
|---------|---------------------|---------------------|
| CancelledError on timeout | Yes | No (raises TimeoutError) |
| Cleanup in finally | May not run | Guaranteed |
| 3.11+ | Yes | Yes (preferred) |

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
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, lambda: sum(range(10_000_000)))
    return result
```

### Connection Pooling with httpx

```python
import httpx
import asyncio

async def fetch_with_session(client: httpx.AsyncClient, url: str):
    response = await client.get(url)
    return response.text()

async def main():
    # Reuse session across requests (connection pooling)
    async with httpx.AsyncClient() as client:
        urls = [f"https://api.example.com/data/{i}" for i in range(10)]

        tasks = [fetch_with_session(client, url) for url in urls]
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
import httpx

@pytest.fixture
async def async_client():
    """Async fixture - automatically cleaned up."""
    async with httpx.AsyncClient() as client:
        yield client

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

## Common Async Libraries

| Library | Purpose | Use Case |
|---------|---------|----------|
| `asyncio` | Standard library | All async operations |
| `httpx` | HTTP client/server | Async HTTP requests (drop-in for requests) |
| `aiohttp` | HTTP client/server | Async HTTP (older, still widely used) |
| `aiofiles` | File operations | Async file I/O |
| `asyncpg` | PostgreSQL | Native async DB access |
| `motor` | MongoDB | Async MongoDB driver |
| `aiomysql` | MySQL | Async MySQL driver |
| `aiosqlite` | SQLite | Async SQLite |
| `redis.asyncio` | Redis | Async Redis client |
| `sqlalchemy[asyncio]` | ORM | SQLAlchemy with async support |

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why Bad | Solution |
|--------------|---------|----------|
| `time.sleep()` in async | Blocks event loop | Use `await asyncio.sleep()` |
| Mixing sync/async without care | Confusing, can block | Use `run_in_executor` |
| Fire-and-forget tasks | Errors are silenced | Always await or track tasks |
| Unbounded concurrency | Resource exhaustion | Use `Semaphore` |
| `asyncio.run()` in async | RuntimeError | Just `await` the coroutine |
| Not handling `CancelledError` | Cleanup may not run | Handle in `finally` block |

---

## Quick Reference

```python
# Create task and don't await (fire-and-forget with tracking)
task = asyncio.create_task(coroutine())
all_tasks = asyncio.all_tasks()

# Wait for first to complete
done, pending = await asyncio.wait(
    [task1, task2],
    return_when=asyncio.FIRST_COMPLETED
)

# Timeout (3.11+)
async with asyncio.timeout(10):
    result = await coroutine()

# Retry with backoff
async def retry(coro, max_retries=3, delay=1.0):
    for attempt in range(max_retries):
        try:
            return await coro
        except Exception:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(delay * (2 ** attempt))
```
