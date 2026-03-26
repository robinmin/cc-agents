---
name: golang-performance
description: "Go profiling and optimization: pprof, benchmarking, memory management, and performance analysis."
see_also:
  - rd3:pl-golang
  - rd3:pl-golang:concurrency
  - rd3:pl-golang:testing
---

# Go Performance Optimization

This reference covers profiling, benchmarking, and optimization techniques in Go.

## Table of Contents

1. [Benchmarking](#benchmarking)
2. [Profiling with pprof](#profiling-with-pprof)
3. [Memory Optimization](#memory-optimization)
4. [Common Optimizations](#common-optimizations)

## Benchmarking

### Basic Benchmark

```go
func BenchmarkFunc(b *testing.B) {
    for i := 0; i < b.N; i++ {
        // Code to measure
        result := expensiveFunc()
        _ = result
    }
}

// Run: go test -bench=BenchmarkFunc -benchmem
```

### Benchmark with Comparison

```go
func BenchmarkStringConcatenation(b *testing.B) {
    for i := 0; i < b.N; i++ {
        s := ""
        for j := 0; j < 100; j++ {
            s += "a"
        }
        _ = s
    }
}

func BenchmarkStringsBuilder(b *testing.B) {
    for i := 0; i < b.N; i++ {
        var sb strings.Builder
        for j := 0; j < 100; j++ {
            sb.WriteString("a")
        }
        _ = sb.String()
    }
}

// Compare: go test -bench=. -benchmem
```

### Benchmark Results

```bash
go test -bench=. -benchmem
# BenchmarkStringConcatenation-8   12345 ns/op   256 B/op   12 allocs/op
# BenchmarkStringsBuilder-8        1523 ns/op     64 B/op     1 allocs/op
```

## Profiling with pprof

### CPU Profiling

```go
import (
    "runtime/pprof"
    "os"
)

func writeCPUProfile() {
    f, err := os.Create("cpu.prof")
    if err != nil {
        log.Fatal(err)
    }
    pprof.StartCPUProfile(f)
    defer pprof.StopCPUProfile()

    // Your code here...
}
```

### Memory Profiling

```go
func writeMemProfile() {
    f, err := os.Create("mem.prof")
    if err != nil {
        log.Fatal(err)
    }
    defer f.Close()
    pprof.WriteHeapProfile(f)
}
```

### HTTP pprof Server

```go
import (
    "net/http"
    _ "net/http/pprof"
)

func main() {
    go func() {
        http.ListenAndServe("localhost:6060", nil)
    }()
    // Your main code...
}

// Then:
// go tool pprof http://localhost:6060/debug/pprof/profile
// go tool pprof http://localhost:6060/debug/pprof/heap
```

### Common pprof Commands

```bash
# CPU profile (30 second capture)
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/profile?seconds=30

# Memory profile
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/heap

# Goroutine profile
go tool pprof http://localhost:6060/debug/pprof/goroutine

# Trace (execution tracer)
go tool trace binary trace.out
```

## Memory Optimization

### Reduce Allocations

```go
// BAD: Multiple allocations
func concatBad() string {
    s := ""
    for _, p := range parts {
        s += p + ","
    }
    return s
}

// GOOD: Single allocation
func concatGood() string {
    var sb strings.Builder
    for i, p := range parts {
        if i > 0 {
            sb.WriteString(",")
        }
        sb.WriteString(p)
    }
    return sb.String()
}

// BEST for known size: Pre-allocate
func concatBest(parts []string) string {
    sb := strings.Builder{}
    sb.Grow(totalLen(parts)) // Pre-allocate
    for i, p := range parts {
        if i > 0 {
            sb.WriteString(",")
        }
        sb.WriteString(p)
    }
    return sb.String()
}
```

### Use sync.Pool for Reusable Objects

```go
var bufferPool = sync.Pool{
    New: func() any {
        return &Buffer{data: make([]byte, 1024)}
    },
}

func getBuffer() *Buffer {
    return bufferPool.Get().(*Buffer)
}

func putBuffer(b *Buffer) {
    b.Reset()
    bufferPool.Put(b)
}
```

### Avoid Boxing (Interface Conversions)

```go
// BAD: Boxing causes allocation
var i interface{} = 42

// GOOD: Concrete type
var i int = 42

// When interface{} is needed:
func process(v any) { // boxing happens at call site
    if n, ok := v.(int); ok { // unboxing at usage
        // use n
    }
}
```

## Common Optimizations

### slices and maps (Go 1.21+)

```go
import "slices"
import "maps"

// Use stdlib functions - optimized
slices.Contains(slice, val)
slices.Sort(slice)
maps.Copy(dst, src)
maps.Equal(a, b)
```

### strconv vs fmt

```go
// BAD: fmt is slow for simple conversions
s := fmt.Sprintf("%d", n)

// GOOD: strconv is faster
s := strconv.Itoa(n)
s := strconv.FormatInt(n, 10)
```

### bytes.Buffer vs strings.Builder

```go
// For byte manipulation
var buf bytes.Buffer
buf.Write([]byte("hello"))
data := buf.Bytes()

// For string building
var sb strings.Builder
sb.WriteString("hello")
s := sb.String()
```

### Pool for Temporary Allocations

```go
// Reuse byte slices
var pool = sync.Pool{
    New: func() any {
        b := make([]byte, 1024)
        return &b
    },
}

buf := pool.Get().(*[]byte)
defer pool.Put(buf)

// Use buf
```

## Profiling Tips

1. **Always benchmark before optimizing** - Measure, don't guess
2. **Profile in production-like conditions** - Real data, real load
3. **Focus on the biggest consumer** - 80/20 rule
4. **Memory and CPU profiles tell different stories** - Both matter
5. **Use `benchstat` for reliable comparisons**

```bash
# Install benchstat
go install golang.org/x/tools/cmd/benchstat@latest

# Compare benchmarks
go test -bench=. -count=5 > old.txt
# make changes
go test -bench=. -count=5 > new.txt
benchstat old.txt new.txt
```

## Further Reading

- [Profiling Go Programs](https://go.dev/blog/pprof)
- [Go Execution Tracer](https://go.dev/blog/trace)
- [Debugging Go Programs](https://go.dev/blog/debugging-go-programs)
