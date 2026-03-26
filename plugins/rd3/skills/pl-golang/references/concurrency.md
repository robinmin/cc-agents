---
name: golang-concurrency
description: "Go concurrency patterns: goroutines, channels, select, sync package, worker pools, and pipelines."
see_also:
  - rd3:pl-golang
  - rd3:pl-golang:patterns
  - rd3:pl-golang:error-handling
---

# Go Concurrency Patterns

This reference covers goroutines, channels, select statements, and common concurrency patterns in Go.

## Table of Contents

1. [Goroutines](#goroutines)
2. [Channels](#channels)
3. [Select](#select)
4. [Sync Package](#sync-package)
5. [Common Patterns](#common-patterns)
6. [Best Practices](#best-practices)
7. [Common Pitfalls](#common-pitfalls)

## Goroutines

### Basic Usage

```go
// Launch a goroutine
go func() {
    fmt.Println("running in background")
}()

// Launch with arguments
go func(msg string) {
    fmt.Println(msg)
}("hello")

// Launch a function
func worker() {
    fmt.Println("working")
}
go worker()
```

### Goroutine Lifecycle

```go
// Always have a way to wait for goroutines to finish
func main() {
    var wg sync.WaitGroup
    wg.Add(1)

    go func() {
        defer wg.Done()
        // Do work
    }()

    wg.Wait() // Wait for all goroutines
}
```

### Context for Cancellation

```go
func worker(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            fmt.Println("worker cancelled:", ctx.Err())
            return
        default:
            // Do work
            time.Sleep(100 * time.Millisecond)
        }
    }
}

func main() {
    ctx, cancel := context.WithCancel(context.Background())
    go worker(ctx)

    time.Sleep(time.Second)
    cancel() // Cancel all goroutines using ctx
}
```

## Channels

### Creating and Using Channels

```go
// Unbuffered channel (synchronous)
ch := make(chan int)

// Buffered channel (asynchronous)
ch := make(chan int, 10)

// Send
ch <- 42

// Receive
val := <-ch

// Receive with check
val, ok := <-ch // ok is false if channel is closed

// Close (only sender should close)
close(ch)
```

### Channel Directions

```go
// Send-only channel
func sender(ch chan<- int) {
    ch <- 42
}

// Receive-only channel
func receiver(ch <-chan int) {
    val := <-ch
}

// Bidirectional (can be passed as either)
func bidirectional(ch chan int) {
    ch <- 42
    val := <-ch
}
```

### Range Over Channels

```go
ch := make(chan int, 10)

// Producer
go func() {
    for i := 0; i < 10; i++ {
        ch <- i
    }
    close(ch) // Signal no more values
}()

// Consumer
for val := range ch {
    fmt.Println(val) // Automatically stops when ch is closed
}
```

## Select

### Basic Select

```go
select {
case val := <-ch1:
    fmt.Println("from ch1:", val)
case val := <-ch2:
    fmt.Println("from ch2:", val)
case ch3 <- 42:
    fmt.Println("sent to ch3")
default:
    fmt.Println("no channel ready")
}
```

### Select with Timeout

```go
select {
case result := <-ch:
    fmt.Println("result:", result)
case <-time.After(5 * time.Second):
    fmt.Println("timeout")
}

// Better: use context with deadline
select {
case result := <-ch:
    return result
case <-ctx.Done():
    return nil, ctx.Err()
}
```

### Non-blocking Operations

```go
select {
case val := <-ch:
    fmt.Println("received:", val)
default:
    fmt.Println("no value available")
}
```

## Sync Package

### WaitGroup

```go
var wg sync.WaitGroup

for i := 0; i < 10; i++ {
    wg.Add(1)
    go func(i int) {
        defer wg.Done()
        fmt.Println(i)
    }(i)
}

wg.Wait()
```

### Mutex

```go
var (
    mu   sync.Mutex
    data map[string]int
)

func write(key string, value int) {
    mu.Lock()
    defer mu.Unlock()
    data[key] = value
}

func read(key string) int {
    mu.Lock()
    defer mu.Unlock()
    return data[key]
}
```

### RWMutex

```go
var (
    mu   sync.RWMutex
    data map[string]int
)

func read(key string) int {
    mu.RLock()
    defer mu.RUnlock()
    return data[key]
}

func write(key string, value int) {
    mu.Lock()
    defer mu.Unlock()
    data[key] = value
}
```

### Once (Singleton Pattern)

```go
var once sync.Once
var instance *Database

func getInstance() *Database {
    once.Do(func() {
        instance = &Database{}
    })
    return instance
}
```

### ErrGroup (Structured Concurrency)

```go
import "golang.org/x/sync/errgroup"

g, ctx := errgroup.WithContext(context.Background())

for i := 0; i < 10; i++ {
    i := i
    g.Go(func() error {
        return doWork(ctx, i)
    })
}

if err := g.Wait(); err != nil {
    log.Fatal(err)
}
```

## Common Patterns

### Worker Pool

```go
func worker(id int, jobs <-chan int, results chan<- int) {
    for j := range jobs {
        fmt.Printf("worker %d processing job %d\n", id, j)
        results <- j * 2
    }
}

func main() {
    jobs := make(chan int, 100)
    results := make(chan int, 100)

    // Start workers
    for w := 1; w <= 3; w++ {
        go worker(w, jobs, results)
    }

    // Send jobs
    for j := 1; j <= 9; j++ {
        jobs <- j
    }
    close(jobs)

    // Collect results
    for a := 1; a <= 9; a++ {
        <-results
    }
}
```

### Pipeline (Fan-out, Fan-in)

```go
// Stage 1: Generator
func generator(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        for _, n := range nums {
            out <- n
        }
        close(out)
    }()
    return out
}

// Stage 2: Square (fan-out)
func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- n * n
        }
        close(out)
    }()
    return out
}

// Stage 3: Merge (fan-in)
func merge(cs ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    out := make(chan int)

    output := func(c <-chan int) {
        for n := range c {
            out <- n
        }
        wg.Done()
    }

    wg.Add(len(cs))
    for _, c := range cs {
        go output(c)
    }

    go func() {
        wg.Wait()
        close(out)
    }()
    return out
}

// Usage
in := generator(1, 2, 3, 4)
c1 := square(in)
c2 := square(in)

for n := range merge(c1, c2) {
    fmt.Println(n)
}
```

### Bounded Concurrency with Semaphore

```go
const maxConcurrent = 10

sem := make(chan struct{}, maxConcurrent)

for _, item := range items {
    sem <- struct{}{} // Acquire
    go func(item Item) {
        defer func() { <-sem }() // Release
        process(item)
    }(item)
}
```

### Heartbeat Pattern

```go
func doWorkWithHeartbeat(done <-chan struct{}) <-chan struct{} {
    heartbeat := make(chan struct{}, 1)

    go func() {
        defer close(heartbeat)
        for {
            select {
            case <-done:
                return
            default:
                // Do work
                time.Sleep(100 * time.Millisecond)

                // Send heartbeat
                select {
                case heartbeat <- struct{}{}:
                default: // Don't block if not being read
                }
            }
        }
    }()

    return heartbeat
}
```

## Best Practices

1. **Prefer channels over shared memory** - "Don't communicate by sharing memory; share memory by communicating"
2. **Always close channels from the sender side**
3. **Use `range` over channels** instead of manually checking `ok`
4. **Use `select` for timeouts and cancellation**
5. **Use `sync.WaitGroup` or `errgroup` to wait for goroutines**
6. **Use buffered channels when you know the capacity**
7. **Use `context.Context` for cancellation and deadlines**
8. **Run with `-race` flag** to detect data races: `go test -race`

## Common Pitfalls

### Goroutine Leaks

```go
// WRONG: Goroutine never exits
func leak() {
    ch := make(chan int)
    go func() {
        val := <-ch // Will block forever
        fmt.Println(val)
    }()
    // ch is never sent to or closed!
}

// RIGHT: Use context or explicit cancellation
func noLeak() {
    ch := make(chan int)
    done := make(chan struct{})

    go func() {
        select {
        case val := <-ch:
            fmt.Println(val)
        case <-done:
            return
        }
    }()

    close(done)
}
```

### Closing Channels Multiple Times

```go
// WRONG: Panic!
close(ch)
close(ch) // Panic: close of closed channel

// RIGHT: Only close once
defer close(ch)
```

### Sending to Closed Channel

```go
// WRONG: Panic!
close(ch)
ch <- 42 // Panic: send on closed channel

// RIGHT: Check if closed before sending
select {
case ch <- 42:
    // Sent successfully
default:
    // Channel closed or full
}
```

### Race Conditions

```go
// WRONG: Data race
var counter int
for i := 0; i < 1000; i++ {
    go func() {
        counter++ // Race condition!
    }()
}

// RIGHT: Use mutex
var (
    mu      sync.Mutex
    counter int
)
for i := 0; i < 1000; i++ {
    go func() {
        mu.Lock()
        counter++
        mu.Unlock()
    }()
}
```

## Further Reading

- [Go Concurrency Patterns](https://go.dev/blog/pipelines) - Blog post on pipelines
- [Share Memory By Communicating](https://go.dev/doc/effective_go#sharing)
- [Go by Example: Goroutines](https://gobyexample.com/goroutines)
- [Go by Example: Channels](https://gobyexample.com/channels)
