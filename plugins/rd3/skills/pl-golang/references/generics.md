---
name: golang-generics
description: "Go generics patterns: type parameters, constraints, generic types, and common use cases for Go 1.18+."
see_also:
  - rd3:pl-golang
  - rd3:pl-golang:version-features
  - rd3:pl-golang:best-practices
---

# Go Generics

This reference covers Go generics patterns and best practices for Go 1.18+.

## Table of Contents

1. [Type Parameters](#type-parameters)
2. [Generic Constraints](#generic-constraints)
3. [Generic Types](#generic-types)
4. [Common Patterns](#common-patterns)
5. [When to Use Generics](#when-to-use-generics)

## Type Parameters

### Generic Functions

```go
// Single type parameter
func Min[T any](a, b T) T {
    if a < b {
        return a
    }
    return b
}

// Multiple type parameters
func Pair[A, B any](a A, b B) (A, B) {
    return a, b
}

// Usage
m := Min(3, 7)           // m = 3 (type inferred)
m := Min[int](3, 7)       // explicit type
```

### Generic with Constraint

```go
// Use cmp.Ordered for comparable types
func Min[T cmp.Ordered](a, b T) T {
    if a < b {
        return a
    }
    return b
}

// Use any for any type
func First[T any](slice []T) T {
    return slice[0]
}
```

## Generic Constraints

### Predefined Constraints

| Constraint | Meaning | Example Types |
|------------|---------|---------------|
| `any` | No constraint | any type |
| `comparable` | Can use `==`, `!=` | int, string, bool |
| `cmp.Ordered` | Ordered types | int, float, string |

### Custom Constraints

```go
// Define a constraint interface
type Number interface {
    int | int8 | int16 | int32 | int64 |
        float32 | float64
}

// Use custom constraint
func Sum[T Number](vals []T) T {
    var total T
    for _, v := range vals {
        total += v
    }
    return total
}
```

### More Complex Constraints

```go
// Constraint with methods
type Stringer interface {
    String() string
}

func Join[T Stringer](vals []T, sep string) string {
    if len(vals) == 0 {
        return ""
    }
    parts := make([]string, len(vals))
    for i, v := range vals {
        parts[i] = v.String()
    }
    return strings.Join(parts, sep)
}

// Constraint for pointer types
type PointerTo[T any] interface {
    *T
}

func Deref[T any](p PointerTo[T]) T {
    return *p
}
```

## Generic Types

### Generic Struct

```go
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(item T) {
    s.items = append(s.items, item)
}

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    item := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return item, true
}

// Usage
var intStack Stack[int]
intStack.Push(1)
intStack.Push(2)
v, _ := intStack.Pop() // v = 2
```

### Generic Struct with Constraint

```go
type Map[K comparable, V any] struct {
    data map[K]V
}

func NewMap[K comparable, V any]() *Map[K, V] {
    return &Map[K, V]{data: make(map[K]V)}
}

func (m *Map[K, V]) Set(key K, value V) {
    m.data[key] = value
}

func (m *Map[K, V]) Get(key K) (V, bool) {
    v, ok := m.data[key]
    return v, ok
}
```

### Generic Interface

```go
type Cache[T any] interface {
    Get(key string) (T, bool)
    Set(key string, value T)
    Delete(key string)
}
```

## Common Patterns

### Container Types

```go
// Stack
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(item T) { s.items = append(s.items, item) }
func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 { var z T; return z, false }
    item := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return item, true
}

// Queue
type Queue[T any] struct {
    items []T
}

func (q *Queue[T]) Enqueue(item T) { q.items = append(q.items, item) }
func (q *Queue[T]) Dequeue() (T, bool) {
    if len(q.items) == 0 { var z T; return z, false }
    item := q.items[0]
    q.items = q.items[1:]
    return item, true
}
```

### Utility Functions

```go
// Filter
func Filter[T any](slice []T, fn func(T) bool) []T {
    result := make([]T, 0)
    for _, v := range slice {
        if fn(v) {
            result = append(result, v)
        }
    }
    return result
}

// Map/Transform
func Map[T, U any](slice []T, fn func(T) U) []U {
    result := make([]U, len(slice))
    for i, v := range slice {
        result[i] = fn(v)
    }
    return result
}

// Reduce
func Reduce[T, U any](slice []T, init U, fn func(U, T) U) U {
    result := init
    for _, v := range slice {
        result = fn(result, v)
    }
    return result
}

// Usage
nums := []int{1, 2, 3, 4, 5}
evens := Filter(nums, func(n int) bool { return n%2 == 0 }) // [2, 4]
doubles := Map(nums, func(n int) int { return n * 2 })     // [2, 4, 6, 8, 10]
sum := Reduce(nums, 0, func(acc, n int) int { return acc + n }) // 15
```

### Result Type

```go
type Result[T any] struct {
    Value T
    Error error
}

func (r Result[T]) Unwrap() (T, error) {
    return r.Value, r.Error
}

func (r Result[T]) Must() T {
    if r.Error != nil {
        panic(r.Error)
    }
    return r.Value
}

// Usage
func divide(a, b float64) Result[float64] {
    if b == 0 {
        return Result[float64]{Error: errors.New("division by zero")}
    }
    return Result[float64]{Value: a / b}
}
```

### Optional Type

```go
type Optional[T any] struct {
    value T
    valid bool
}

func Some[T any](value T) Optional[T] {
    return Optional[T]{value: value, valid: true}
}

func None[T any]() Optional[T] {
    return Optional[T]{valid: false}
}

func (o Optional[T]) Get() (T, bool) {
    return o.value, o.valid
}

func (o Optional[T]) MustGet() T {
    if !o.valid {
        panic("optional is None")
    }
    return o.value
}
```

## When to Use Generics

### Use Generics When:

- Building container data structures (stack, queue, tree)
- Writing utility functions that work on multiple types
- Creating type-safe wrappers around existing types
- Implementing algorithms that don't depend on specific types

### Don't Use Generics When:

- Simple single-type utility functions
- Working with concrete types that already exist
- The overhead of type parameters isn't worth it

### Example Decision

```go
// GOOD: Generic container
type Tree[T any] struct {
    value T
    left  *Tree[T]
    right *Tree[T]
}

// GOOD: Generic utility
func MapKeys[K, V comparable](m map[K]V) []K {
    keys := make([]K, 0, len(m))
    for k := range m {
        keys = append(keys, k)
    }
    return keys
}

// AVOID: Overly generic when concrete is fine
type Handler[T any] struct { /* ... */ }
// Use concrete http.Handler instead
```

## Further Reading

- [Go Generics Draft Design](https://go.dev/blog/intro-generics)
- [Using Generics](https://go.dev/doc/tutorial/generics)
- [Generics in Go](https://go.dev/blog/generics-next)
