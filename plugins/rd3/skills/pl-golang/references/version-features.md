---
name: golang-version-features
description: "Go version feature matrix: generics, log/slog, slices, ranges, and version selection for Go 1.18-1.23."
see_also:
  - rd3:pl-golang
  - rd3:pl-golang:generics
  - rd3:pl-golang:best-practices
---

# Go Version Features

This reference covers Go version-specific features and what version to use for different requirements.

## Current Versions

| Version | Release Date | Status | EOL (Approx) |
|---------|-------------|--------|--------------|
| 1.23 | August 2024 | Current | February 2026 |
| 1.22 | February 2024 | Stable | August 2025 |
| 1.21 | August 2023 | Stable | February 2025 |
| 1.20 | February 2023 | Maintenance | August 2024 |
| 1.19 | August 2022 | Deprecated | February 2024 |

## Version Feature Matrix

| Feature | Go 1.18 | Go 1.19 | Go 1.20 | Go 1.21 | Go 1.22 | Go 1.23 |
|---------|---------|---------|---------|---------|---------|---------|
| **Generics** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Fuzzing** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **go.work** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Multiple workers in cmd/go** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **loosely typed constants** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Memory limit** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **errors.Join** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **PGO (Profile-Guided Optimization)** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Comparable types in type constraints** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **cmp.Ordered** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **slices package** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **maps package** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **cmp package** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **log/slog** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Min/Max builtins** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Clear maps/slices** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Range over integers** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Iterators (range over functions)** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **math/rand/v2** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **slices, maps, cmp updates** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## Go 1.18 Features

### Generics

```go
// Generic function
func Min[T cmp.Ordered](a, b T) T {
    if a < b {
        return a
    }
    return b
}

// Generic type
type Stack[T any] struct {
    items []T
}

// Generic constraints
type Ordered interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64 |
        ~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 |
        ~float32 | ~float64 | ~string
}
```

### Fuzzing

```go
func FuzzReverse(f *testing.F) {
    f.Add([]byte("hello"))
    f.Fuzz(func(t *testing.T, input []byte) {
        rev := Reverse(input)
        doubleRev := Reverse(rev)
        if !bytes.Equal(input, doubleRev) {
            t.Errorf("mismatch")
        }
    })
}
```

## Go 1.21 Features

### log/slog (Structured Logging)

```go
import "log/slog"

// Simple logging
slog.Info("message", "key", "value")
slog.Error("error", "err", err)
slog.Debug("debug", "count", 42)

// With context
slog.LogAttrs(ctx, slog.LevelInfo, "message",
    slog.String("key", "value"),
    slog.Int("count", 42),
)

// JSON handler for production
handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level: slog.LevelInfo,
})
logger := slog.New(handler)
```

### Min/Max Builtins

```go
min := min(1, 2, 3)        // 1
max := max(1, 2, 3)        // 3
min := min(1.5, 2.5)       // 1.5
```

### slices and maps Packages

```go
import "slices"
import "maps"

// slices
slices.Contains([]int{1, 2, 3}, 2)           // true
slices.Index([]int{1, 2, 3}, 2)              // 1
slices.Equal([]int{1, 2}, []int{1, 2})      // true
slices.Sort([]int{3, 1, 2})                 // [1, 2, 3]
slices.Delete([]int{1, 2, 3}, 1, 2)         // [1]
slices.Grow([]int{}, 10)

// maps
maps.Copy(dst, src)
maps.Equal(m1, m2)
maps.Keys(m)    // Returns []K
maps.Values(m)  // Returns []V
maps.Clear(m)   // Go 1.21+
```

## Go 1.22 Features

### Range Over Integers

```go
// Before
for i := 0; i < 10; i++ {
    fmt.Println(i)
}

// 1.22+
for i := range 10 {
    fmt.Println(i) // 0-9
}
```

## Go 1.23 Features

### Iterators (range over functions)

```go
// Iterator function type
type Iterator[T any] func(yield func(T) bool)

// Usage
func All[T any](s []T) Iterator[T] {
    return func(yield func(T) bool) {
        for _, v := range s {
            if !yield(v) {
                return
            }
        }
    }
}

// Using the iterator
for v := range All([]int{1, 2, 3}) {
    fmt.Println(v)
}
```

### math/rand/v2

```go
import "math/rand/v2"

// New API
r := rand.New(rand.NewSource(42))
r.IntN(100)           // Random int in [0, 100)
r.Float()              // Random float in [0, 1)
```

## Version Selection Guide

### Recommended Baseline: Go 1.21+

**Use 1.21+ for new projects:**

- Modern generics support
- Excellent standard library additions (slices, maps, cmp, slog)
- Clear/min builtins
- Good tooling support

### Go 1.23+ (Latest)

**Use for:**

- New projects starting now
- Iterators and range-over-function patterns
- Latest features and performance
- `math/rand/v2` for better random numbers

### Go 1.21 (Stable)

**Use for:**

- Production applications
- Team projects
- Stable, well-tested
- Broad compatibility

## Further Reading

- [Go 1.23 Release Notes](https://go.dev/doc/go1.23)
- [Go 1.22 Release Notes](https://go.dev/doc/go1.22)
- [Go 1.21 Release Notes](https://go.dev/doc/go1.21)
- [Go Release Policy](https://go.dev/doc/devel/release.html)
