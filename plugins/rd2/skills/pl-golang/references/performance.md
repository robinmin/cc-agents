# Go Performance Optimization

This reference covers performance profiling, optimization techniques, and best practices for Go applications.

## Table of Contents

1. [Profiling](#profiling)
2. [Memory Allocation](#memory-allocation)
3. [Concurrency](#concurrency)
4. [String Operations](#string-operations)
5. [Slice Operations](#slice-operations)
6. [I/O Performance](#io-performance)
7. [Common Optimizations](#common-optimizations)
8. [Benchmarking](#benchmarking)

## Profiling

### CPU Profiling

```go
import (
    "os"
    "runtime/pprof"
)

func main() {
    // Start CPU profiling
    f, _ := os.Create("cpu.prof")
    pprof.StartCPUProfile(f)
    defer pprof.StopCPUProfile()

    // Run code to profile
    doWork()
}
```

### CPU Profiling with HTTP

```go
import (
    _ "net/http/pprof"
    "net/http"
)

func main() {
    // pprof endpoints available at:
    // /debug/pprof/
    // /debug/pprof/profile?seconds=30
    // /debug/pprof/goroutine
    // /debug/pprof/heap
    // /debug/pprof/allocs
    // /debug/pprof/block
    http.ListenAndServe(":8080", nil)
}
```

### Memory Profiling

```go
import (
    "os"
    "runtime/pprof"
)

func main() {
    doWork()

    // Write memory profile
    f, _ := os.Create("mem.prof")
    pprof.WriteHeapProfile(f)
    f.Close()
}
```

### Analyzing Profiles

```bash
# CPU profile
go tool pprof cpu.prof
# Commands: top, list <function>, web (requires graphviz)

# Memory profile
go tool pprof mem.prof

# HTTP profile
go tool pprof http://localhost:8080/debug/pprof/profile?seconds=30

# Visualize
go tool pprof -http=:8080 cpu.prof
```

## Memory Allocation

### Reduce Allocations

```go
// BAD: Repeated allocations
func concatBad(strs []string) string {
    result := ""
    for _, s := range strs {
        result += s  // New allocation each time
    }
    return result
}

// GOOD: Single allocation with strings.Builder
func concatGood(strs []string) string {
    var builder strings.Builder
    builder.Grow(100)  // Pre-allocate if size is known
    for _, s := range strs {
        builder.WriteString(s)
    }
    return builder.String()
}
```

### Reuse Buffers

```go
// BAD: New buffer each time
func process(data []byte) []byte {
    buf := make([]byte, 1024)  // New allocation
    // Process...
    return buf
}

// GOOD: Reuse buffer with sync.Pool
var bufPool = sync.Pool{
    New: func() interface{} {
        return make([]byte, 1024)
    },
}

func process(data []byte) []byte {
    buf := bufPool.Get().([]byte)
    defer bufPool.Put(buf)

    // Process...
    return buf
}
```

### Pointer vs Value

```go
// For small structs, pass by value (faster, no allocation)
type Point struct {
    X, Y int
}

func distance(p1, p2 Point) int {
    // Value copy is cheap
    // No heap allocation
}

// For large structs, use pointer
type LargeStruct struct {
    data [1024]int
}

func process(l *LargeStruct) {
    // Avoid copying large struct
}
```

## Concurrency

### Worker Pool Size

```go
// CPU-bound tasks: runtime.NumCPU() workers
workers := runtime.NumCPU()

// I/O-bound tasks: More workers
workers := runtime.NumCPU() * 2

// Dynamic adjustment based on load
```

### Channel Buffering

```go
// Unbuffered (synchronous)
ch := make(chan int)
// Sender blocks until receiver ready

// Buffered (asynchronous)
ch := make(chan int, 100)
// Sender can continue until buffer full

// Choose buffer size carefully:
// - Too small: sender blocks
// - Too large: memory waste
```

### Avoid Goroutine Leaks

```go
// BAD: Goroutine never exits
func leak() {
    ch := make(chan int)
    go func() {
        val := <-ch  // Blocks forever
        fmt.Println(val)
    }()
}

// GOOD: Use context for cancellation
func noLeak(ctx context.Context) {
    ch := make(chan int)
    go func() {
        select {
        case val := <-ch:
            fmt.Println(val)
        case <-ctx.Done():
            return  // Cleanup
        }
    }()
}
```

## String Operations

### String Concatenation

```go
// BAD: + operator (O(n^2))
func buildStringBad(n int) string {
    s := ""
    for i := 0; i < n; i++ {
        s += "text"
    }
    return s
}

// GOOD: strings.Builder (O(n))
func buildStringGood(n int) string {
    var b strings.Builder
    b.Grow(len("text") * n)
    for i := 0; i < n; i++ {
        b.WriteString("text")
    }
    return b.String()
}
```

### String vs []byte

```go
// String is immutable, safe to share
// []byte is mutable, must copy

// String to []byte (creates copy)
b := []byte(s)

// []byte to string (creates copy)
s := string(b)

// Zero-copy conversion (unsafe, use carefully)
import "unsafe"
b := unsafe.Slice(unsafe.StringData(s), len(s))
s := unsafe.String(&b[0], len(b))
```

### Substring Operations

```go
// Strings are immutable in Go
// Substring operation is O(1) - creates a new string header pointing to same bytes

s := "hello world"
substr := s[0:5]  // "hello" - O(1) operation

// But prevents original string from being GC'd
// For large strings, consider copying if keeping substring long-term
substr := string([]byte(s[0:5]))
```

## Slice Operations

### Pre-allocate Capacity

```go
// BAD: No pre-allocation (multiple allocations)
var result []int
for i := 0; i < 1000; i++ {
    result = append(result, i)
}

// GOOD: Pre-allocate (single allocation)
result := make([]int, 0, 1000)
for i := 0; i < 1000; i++ {
    result = append(result, i)
}
```

### Delete from Slice

```go
// BAD: O(n) for each delete
func remove(slice []int, i int) []int {
    return append(slice[:i], slice[i+1:]...)
}

// GOOD: O(1) but doesn't preserve order
func removeUnordered(slice []int, i int) []int {
    slice[i] = slice[len(slice)-1]
    return slice[:len(slice)-1]
}

// GOOD: O(n) but more efficient than append
func removeOrdered(slice []int, i int) []int {
    copy(slice[i:], slice[i+1:])
    return slice[:len(slice)-1]
}
```

### Slice Filtering

```go
// Filter in-place (no new allocation)
func filterInPlace(data []int) []int {
    n := 0
    for _, v := range data {
        if v%2 == 0 {  // Keep evens
            data[n] = v
            n++
        }
    }
    return data[:n]
}
```

## I/O Performance

### Buffer I/O

```go
// Use buffered I/O for better performance
import "bufio"

reader := bufio.NewReader(file)
writer := bufio.NewWriter(file)
defer writer.Flush()

// Read line
line, _ := reader.ReadString('\n')

// Read bytes
buf := make([]byte, 4096)
n, _ := reader.Read(buf)
```

### Batch Operations

```go
// BAD: One operation at a time
for _, item := range items {
    db.Save(item)  // N database calls
}

// GOOD: Batch operations
db.SaveAll(items)  // 1 database call
```

### Connection Pooling

```go
// Database connection pool
db.SetMaxOpenConns(25)
db.SetMaxIdleConns(25)
db.SetConnMaxLifetime(5 * time.Minute)

// HTTP client with connection pooling
client := &http.Client{
    Transport: &http.Transport{
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 100,
        IdleConnTimeout:     90 * time.Second,
    },
}
```

## Common Optimizations

### Use Inline Closures for Small Functions

```go
// BAD: Function call overhead
func apply(slice []int, f func(int) int) []int {
    result := make([]int, len(slice))
    for i, v := range slice {
        result[i] = f(v)
    }
    return result
}

// GOOD: Inline for simple operations
func double(slice []int) []int {
    result := make([]int, len(slice))
    for i, v := range slice {
        result[i] = v * 2
    }
    return result
}
```

### Avoid Reflection

```go
// BAD: Reflection is slow
val := reflect.ValueOf(obj).FieldByName("Name").String()

// GOOD: Direct access
val := obj.Name

// Or use code generation
```

### Use Sync Pool for Reusable Objects

```go
var bufferPool = sync.Pool{
    New: func() interface{} {
        return new(bytes.Buffer)
    },
}

func getBuffer() *bytes.Buffer {
    return bufferPool.Get().(*bytes.Buffer)
}

func putBuffer(buf *bytes.Buffer) {
    buf.Reset()
    bufferPool.Put(buf)
}
```

### Lock-Free Patterns

```go
// Use atomic operations for simple cases
import "sync/atomic"

var counter int64

// BAD: Lock for simple counter
func increment() {
    mu.Lock()
    counter++
    mu.Unlock()
}

// GOOD: Atomic operation
func increment() {
    atomic.AddInt64(&counter, 1)
}

// Read value
value := atomic.LoadInt64(&counter)
```

## Benchmarking

### Writing Benchmarks

```go
func BenchmarkFunction(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Function()
    }
}

func BenchmarkParallel(b *testing.B) {
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            Function()
        }
    })
}
```

### Measuring Allocations

```go
func BenchmarkWithAllocs(b *testing.B) {
    b.ReportAllocs()  // Report memory allocations
    for i := 0; i < b.N; i++ {
        Function()
    }
}
```

### Comparing Implementations

```go
func BenchmarkFunctions(b *testing.B) {
    b.Run("Implementation1", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            Impl1()
        }
    })

    b.Run("Implementation2", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            Impl2()
        }
    })
}
```

### Running Benchmarks

```bash
# Run benchmarks
go test -bench=.

# Run specific benchmark
go test -bench=BenchmarkFunction

# Run with memory stats
go test -bench=. -benchmem

# Run multiple times for accuracy
go test -bench=. -count=10

# Control benchmark time
go test -bench=. -benchtime=10s
```

## Performance Best Practices

1. **Profile before optimizing** - Measure, don't guess
2. **Focus on hot paths** - Optimize code that runs frequently
3. **Avoid premature optimization** - Readability first
4. **Use benchmarks** - Verify optimizations work
5. **Test with realistic data** - Small datasets hide issues
6. **Consider tradeoffs** - Performance vs maintainability
7. **Use standard library** - Usually well-optimized
8. **Run with race detector** - `go run -race`
9. **Check memory leaks** - `go tool pprof`
10. **Monitor in production** - Use real metrics

## Further Reading

- [Go Performance Tips](https://github.com/dgryski/go-perfbook)
- [Profiling Go Programs](https://go.dev/blog/pprof)
- [The Go Blog: Using go test -prof](https://go.dev/blog/pprof)
- [Go Performance Best Practices](https://github.com/alecthomas/go_serialization_benchmarks)
