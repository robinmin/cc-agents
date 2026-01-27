# Go Version Features

This reference covers Go version-specific features and what version to use for different requirements.

## Table of Contents

1. [Current Versions](#current-versions)
2. [Version Feature Matrix](#version-feature-matrix)
3. [Go 1.18 Features](#go-118-features)
4. [Go 1.19 Features](#go-119-features)
5. [Go 1.20 Features](#go-120-features)
6. [Go 1.21 Features](#go-121-features)
7. [Go 1.22 Features](#go-122-features)
8. [Version Selection Guide](#version-selection-guide)

## Current Versions

| Version | Release Date | Status | EOL (Approx) |
|---------|-------------|--------|--------------|
| 1.22 | February 2024 | Current | August 2025 |
| 1.21 | August 2023 | Stable | February 2025 |
| 1.20 | February 2023 | Maintenance | August 2024 |
| 1.19 | August 2022 | Deprecated | February 2024 |
| 1.18 | March 2022 | Deprecated | August 2023 |

## Version Feature Matrix

| Feature | Go 1.18 | Go 1.19 | Go 1.20 | Go 1.21 | Go 1.22 |
|---------|---------|---------|---------|---------|---------|
| **Generics** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **fuzzing** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **fmt.Appendf** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **errors.Is/As** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **go.work** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Multiple workers in cmd/go** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **loosely typed constants** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Unix socket support** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Memory limit** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **errors.Join** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **PGO (Profile-Guided Optimization)** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Comparable types in type constraints** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **cmp.Ordered** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **slices package** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **maps package** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **cmp package** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **log/slog** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Min/Max builtins** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Clear maps/slices** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Range over integers** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Math optimizations** | ❌ | ❌ | ❌ | ❌ | ✅ |

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

### go.work (Workspaces)

```go
// go.work
go 1.18

use (
    ./module1
    ./module2
)
```

## Go 1.19 Features

### Loosely Typed Constants

```go
// Before 1.19 - Error!
const (
    A = 1
    B = 1.0  // Error: mismatched types
)

// 1.19+ - OK!
const (
    A = 1
    B = 1.0  // Now OK
)
```

### Unix Socket Support

```go
// Unix socket support in net.Listen
l, err := net.Listen("unix", "/tmp/socket")
```

### Multiple Workers in cmd/go

```bash
# Now uses multiple workers by default
go build
go test
```

## Go 1.20 Features

### errors.Join

```go
func doWork() error {
    var errs []error

    for _, item := range items {
        if err := process(item); err != nil {
            errs = append(errs, err)
        }
    }

    return errors.Join(errs...)
}
```

### Memory Limit

```go
// Set memory limit
debug.SetMemoryLimit(1 << 30)  // 1GB
```

### PGO (Profile-Guided Optimization)

```bash
# 1. Create profile
go build -o myprog
./myprog -cpuprofile=/tmp/cpu.prof

# 2. Build with PGO
go build -pgofile=/tmp/cpu.prof
```

### Comparable in Type Constraints

```go
func Contains[T comparable](s []T, v T) bool {
    for _, item := range s {
        if item == v {
            return true
        }
    }
    return false
}
```

### cmp.Ordered

```go
import "cmp"

func Max[T cmp.Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}
```

### slices Package

```go
import "slices"

slices.Contains([]int{1, 2, 3}, 2)  // true
slices.Index([]int{1, 2, 3}, 2)     // 1
slices.Equal([]int{1, 2}, []int{1, 2})  // true
slices.Sort([]int{3, 1, 2})         // [1, 2, 3]
```

### maps Package

```go
import "maps"

maps.Copy(dst, src)
maps.Equal(m1, m2)
maps.Keys(m)    // Returns slice
maps.Values(m)  // Returns slice
```

## Go 1.21 Features

### log/slog (Structured Logging)

```go
import "log/slog"

// Simple logging
slog.Info("message", "key", "value")
slog.Error("error", "err", err)

// With context
slog.LogAttrs(ctx, slog.LevelInfo, "message",
    slog.String("key", "value"),
    slog.Int("count", 42),
)

// Custom handler
handler := slog.NewJSONHandler(os.Stdout, nil)
logger := slog.New(handler)
```

### Min/Max Builtins

```go
min := min(1, 2, 3)        // 1
max := max(1, 2, 3)        // 3
min := min(1.5, 2.5)       // 1.5
```

### Clear Maps/Slices

```go
m := map[string]int{"a": 1, "b": 2}
clear(m)  // m is now empty

s := []int{1, 2, 3}
clear(s)  // s is now [0, 0, 0]
```

### cmp Package

```go
import "cmp"

// Compare
cmp.Compare(1, 2)     // -1
cmp.Compare(2, 2)     // 0
cmp.Compare(3, 2)     // 1

// Less/LessOrEqual
cmp.Less(1, 2)        // true
cmp.LessOrEqual(2, 2) // true
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
    fmt.Println(i)
}

// With step
for i := range 10 {
    if i%2 == 0 {
        fmt.Println(i)
    }
}
```

### Math Optimizations

```go
// Faster math operations
import "math"

// Faster implementations of:
math.Max
math.Min
math.Remainder
// And more...
```

## Version Selection Guide

### Recommended Baseline: Go 1.21+

**Use 1.21+ for new projects:**

- Modern generics support
- Excellent standard library additions (slices, maps, cmp)
- Structured logging (log/slog)
- Clear/min builtins
- Good tooling support

### Go 1.22+ (Latest)

**Use for:**

- New projects starting now
- Latest features and performance
- Range over integers
- Math optimizations

**Considerations:**

- May have bugs (recent release)
- Limited adoption
- Not all dependencies support it

### Go 1.21 (Stable)

**Use for:**

- Production applications
- Team projects
- Stable, well-tested
- Broad compatibility

### Go 1.20 (Maintenance)

**Use for:**

- Legacy systems
- Limited updates
- Near EOL

### Older Versions

**Avoid for new projects:**

- Go 1.19 and older are deprecated
- Missing important features
- Security updates may be limited

## Minimum Version Requirements

| Feature | Minimum Go Version |
|---------|------------------|
| **Generics** | 1.18 |
| **Fuzzing** | 1.18 |
| **Workspaces** | 1.18 |
| **errors.Join** | 1.20 |
| **slices/maps/cmp** | 1.20 |
| **log/slog** | 1.21 |
| **min/max builtins** | 1.21 |
| **range over int** | 1.22 |

## Choosing Your Version

### Questions to Ask

1. **What features do you need?**
   - Generics: 1.18+
   - Modern stdlib: 1.20+
   - Structured logging: 1.21+

2. **What's your deployment environment?**
   - Latest OS/packages: Use latest Go
   - Stable/LTS: Use 1.21+

3. **What's your team's experience?**
   - New to Go: Use stable 1.21
   - Experienced: Consider 1.22

4. **What dependencies do you use?**
   - Check their minimum Go versions

## Version Matrix for Planning

| Scenario | Recommended Version | Why |
|----------|-------------------|-----|
| **New project** | 1.21+ | Latest stable, great features |
| **Production service** | 1.21 | Stable, well-tested |
| **Cutting-edge features** | 1.22 | Latest features |
| **Minimal dependencies** | 1.21 | Balance of features/stability |
| **Educational** | 1.21 | Modern Go, stable |

## Upgrade Planning

### When to Upgrade

**Upgrade when:**
- Security vulnerabilities in current version
- Need new features
- Dependencies require newer version
- Current version enters maintenance mode

### Upgrade Testing

```bash
# 1. Update go.mod
go mod edit -go=1.21

# 2. Tidy dependencies
go mod tidy

# 3. Run tests
go test ./...

# 4. Run with race detector
go test -race ./...

# 5. Build
go build ./...
```

## Further Reading

- [Go 1.22 Release Notes](https://go.dev/doc/go1.22)
- [Go 1.21 Release Notes](https://go.dev/doc/go1.21)
- [Go 1.20 Release Notes](https://go.dev/doc/go1.20)
- [Go 1.19 Release Notes](https://go.dev/doc/go1.19)
- [Go 1.18 Release Notes](https://go.dev/doc/go1.18)
- [Go Release Policy](https://go.dev/doc/devel/release.html)
