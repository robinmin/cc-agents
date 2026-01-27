# Go Generics (Go 1.18+)

This reference covers Go generics syntax, type parameters, constraints, and common generic patterns.

## Table of Contents

1. [Type Parameters](#type-parameters)
2. [Type Constraints](#type-constraints)
3. [Generic Functions](#generic-functions)
4. [Generic Types](#generic-types)
5. [Built-in Constraints](#built-in-constraints)
6. [Common Patterns](#common-patterns)
7. [When to Use Generics](#when-to-use-generics)
8. [Common Pitfalls](#common-pitfalls)

## Type Parameters

### Basic Syntax

```go
// Generic function
func Print[T any](s []T) {
    for _, v := range s {
        fmt.Println(v)
    }
}

// Usage
Print([]int{1, 2, 3})
Print([]string{"a", "b", "c"})
```

### Multiple Type Parameters

```go
func Map[T, U any](s []T, f func(T) U) []U {
    result := make([]U, len(s))
    for i, v := range s {
        result[i] = f(v)
    }
    return result
}

// Usage
ints := []int{1, 2, 3}
strings := Map(ints, func(i int) string {
    return strconv.Itoa(i)
})
```

### Type Inference

```go
// Go can often infer types
func First[T any](s []T) T {
    return s[0]
}

// Type inferred from argument
val := First([]int{1, 2, 3})  // T is int

// Explicit type specification
val := First[int]([]int{1, 2, 3})
```

## Type Constraints

### Basic Constraints

```go
// any constraint (any type)
func Print[T any](v T) {
    fmt.Println(v)
}

// Comparable constraint (supports == and !=)
func Contains[T comparable](s []T, v T) bool {
    for _, item := range s {
        if item == v {
            return true
        }
    }
    return false
}

// Ordered constraint (Go 1.21+)
func Min[T cmp.Ordered](a, b T) T {
    if a < b {
        return a
    }
    return b
}
```

### Custom Constraints

```go
// Interface with type list
type Number interface {
    int | int8 | int16 | int32 | int64 |
    uint | uint8 | uint16 | uint32 | uint64 |
    float32 | float64
}

func Sum[T Number](nums []T) T {
    var sum T
    for _, n := range nums {
        sum += n
    }
    return sum
}

// Constraint with methods
type Stringer interface {
    String() string
}

func PrintAll[T Stringer](items []T) {
    for _, item := range items {
        fmt.Println(item.String())
    }
}
```

### Combining Constraints

```go
// Multiple constraints
type StringerComparable interface {
    Stringer
    comparable
}

// Approximation (~) allows underlying types
type Numeric interface {
    ~int | ~float64
}

type MyInt int

func Double[T Numeric](n T) T {
    return n * 2
}

var m MyInt = 10
Double(m)  // Works because of ~
```

### Constraint Interfaces

```go
// Built-in constraints (Go 1.18+)
package constraints

type Integer interface {
    Signed | Unsigned
}

type Signed interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64
}

type Unsigned interface {
    ~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 | ~uintptr
}

type Float interface {
    ~float32 | ~float64
}

type Complex interface {
    ~complex64 | ~complex128
}

type Ordered interface {
    Integer | Float | ~string
}

// Usage
import "golang.org/x/exp/constraints"

func Max[T constraints.Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}
```

## Generic Functions

### Min/Max

```go
func Min[T cmp.Ordered](a, b T) T {
    if a < b {
        return a
    }
    return b
}

func Max[T cmp.Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}

// Usage
min := Min(5, 10)
max := Max(3.14, 2.71)
```

### Filter

```go
func Filter[T any](s []T, pred func(T) bool) []T {
    result := make([]T, 0)
    for _, v := range s {
        if pred(v) {
            result = append(result, v)
        }
    }
    return result
}

// Usage
nums := []int{1, 2, 3, 4, 5}
evens := Filter(nums, func(n int) bool {
    return n%2 == 0
})
```

### Reduce

```go
func Reduce[T, U any](s []T, init U, f func(U, T) U) U {
    result := init
    for _, v := range s {
        result = f(result, v)
    }
    return result
}

// Usage
nums := []int{1, 2, 3, 4, 5}
sum := Reduce(nums, 0, func(acc, n int) int {
    return acc + n
})
```

### Map

```go
func Map[T, U any](s []T, f func(T) U) []U {
    result := make([]U, len(s))
    for i, v := range s {
        result[i] = f(v)
    }
    return result
}

// Usage
ints := []int{1, 2, 3}
doubled := Map(ints, func(n int) int {
    return n * 2
})
```

### Sort

```go
import "sort"

func Sort[T cmp.Ordered](s []T) {
    sort.Slice(s, func(i, j int) bool {
        return s[i] < s[j]
    })
}

// Usage
nums := []int{5, 2, 8, 1}
Sort(nums)  // nums is now [1, 2, 5, 8]
```

## Generic Types

### Generic Struct

```go
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(v T) {
    s.items = append(s.items, v)
}

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    idx := len(s.items) - 1
    item := s.items[idx]
    s.items = s.items[:idx]
    return item, true
}

// Usage
stack := Stack[int]{}
stack.Push(1)
stack.Push(2)
val, _ := stack.Pop()
```

### Generic Map Wrapper

```go
type MultiMap[K comparable, V any] struct {
    data map[K][]V
}

func NewMultiMap[K comparable, V any]() *MultiMap[K, V] {
    return &MultiMap[K, V]{
        data: make(map[K][]V),
    }
}

func (m *MultiMap[K, V]) Put(key K, value V) {
    m.data[key] = append(m.data[key], value)
}

func (m *MultiMap[K, V]) Get(key K) []V {
    return m.data[key]
}
```

### Generic Interface

```go
type Container[T any] interface {
    Push(v T)
    Pop() (T, bool)
}

type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(v T) {
    s.items = append(s.items, v)
}

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    idx := len(s.items) - 1
    item := s.items[idx]
    s.items = s.items[:idx]
    return item, true
}

var _ Container[int] = &Stack[int]{}
```

### Generic Channel

```go
type Processor[T any] struct {
    input  chan T
    output chan T
}

func NewProcessor[T any](bufSize int) *Processor[T] {
    return &Processor[T]{
        input:  make(chan T, bufSize),
        output: make(chan T, bufSize),
    }
}

func (p *Processor[T]) Process(f func(T) T) {
    go func() {
        for in := range p.input {
            p.output <- f(in)
        }
        close(p.output)
    }()
}

func (p *Processor[T]) In() chan<- T {
    return p.input
}

func (p *Processor[T]) Out() <-chan T {
    return p.output
}
```

## Built-in Constraints

### cmp Package (Go 1.21+)

```go
import "cmp"

// Ordered constraint
func Max[T cmp.Ordered](x, y T) T {
    if x > y {
        return x
    }
    return y
}

// Compare function
func Compare[T cmp.Ordered](x, y T) int {
    switch {
    case x < y:
        return -1
    case x > y:
        return 1
    default:
        return 0
    }
}
```

### slices Package (Go 1.21+)

```go
import "slices"

// Contains
if slices.Contains([]int{1, 2, 3}, 2) {
    fmt.Println("found")
}

// Index
idx := slices.Index([]int{1, 2, 3}, 2)

// Equal
if slices.Equal([]int{1, 2}, []int{1, 2}) {
    fmt.Println("equal")
}

// Sort
nums := []int{3, 1, 2}
slices.Sort(nums)

// BinarySearch
nums := []int{1, 2, 3, 4, 5}
idx, found := slices.BinarySearch(nums, 3)
```

### maps Package (Go 1.21+)

```go
import "maps"

// Copy
dst := make(map[string]int)
maps.Copy(dst, src)

// Equal
if maps.Equal(m1, m2) {
    fmt.Println("equal")
}

// Keys
keys := maps.Keys(m)  // Returns slice

// Values
values := maps.Values(m)  // Returns slice
```

## Common Patterns

### Generic Repository

```go
type Repository[T any, ID comparable] interface {
    Get(id ID) (T, error)
    Save(entity T) error
    Delete(id ID) error
    List() ([]T, error)
}

type InMemoryRepo[T any, ID comparable] struct {
    data map[ID]T
}

func NewInMemoryRepo[T any, ID comparable]() *InMemoryRepo[T, ID] {
    return &InMemoryRepo[T, ID]{
        data: make(map[ID]T),
    }
}

func (r *InMemoryRepo[T, ID]) Get(id ID) (T, error) {
    entity, ok := r.data[id]
    if !ok {
        var zero T
        return zero, fmt.Errorf("not found")
    }
    return entity, nil
}

func (r *InMemoryRepo[T, ID]) Save(entity T) error {
    // Need ID field - this is simplified
    return nil
}
```

### Generic Result Type

```go
type Result[T any] struct {
    Value T
    Error error
}

func OK[T any](value T) Result[T] {
    return Result[T]{Value: value}
}

func Err[T any](err error) Result[T] {
    return Result[T]{Error: err}
}

func (r Result[T]) IsOK() bool {
    return r.Error == nil
}

// Usage
func divide(a, b int) Result[int] {
    if b == 0 {
        return Err[int](errors.New("division by zero"))
    }
    return OK(a / b)
}
```

### Generic Option Pattern

```go
type Option[T any] struct {
    value T
    valid bool
}

func Some[T any](value T) Option[T] {
    return Option[T]{value: value, valid: true}
}

func None[T any]() Option[T] {
    return Option[T]{valid: false}
}

func (o Option[T]) IsSome() bool {
    return o.valid
}

func (o Option[T]) IsNone() bool {
    return !o.valid
}

func (o Option[T]) Unwrap() T {
    if !o.valid {
        panic("unwrap called on None")
    }
    return o.value
}

func (o Option[T]) UnwrapOr(defaultValue T) T {
    if !o.valid {
        return defaultValue
    }
    return o.value
}
```

## When to Use Generics

### Good Use Cases

1. **Container types** - Slices, maps, stacks, queues with specific behavior
2. **Utility functions** - Min, max, filter, map, reduce
3. **Repository patterns** - Generic data access
4. **Type-safe wrappers** - Around untyped APIs
5. **Algorithm implementations** - Sort, search, etc.

```go
// GOOD: Generic container
type Queue[T any] struct { /* ... */ }

// GOOD: Generic utility
func Filter[T any](s []T, pred func(T) bool) []T

// GOOD: Type-safe wrapper
type SafeMap[K comparable, V any] struct { /* ... */ }
```

### Bad Use Cases

1. **Just to avoid interface{}** - Sometimes reflection is OK
2. **Single implementation** - Wait for multiple types
3. **Over-complication** - When simple code works

```go
// BAD: Over-engineered for single use
type Result[T any] struct { /* ... */ }  // Only used for int?

// BETTER: Use concrete type or interface
type Result struct {
    Value interface{}
    Error error
}
```

## Common Pitfalls

### Type Instantiation

```go
// Must instantiate generic types
type Stack[T any] struct { /* ... */ }

// WRONG
var s Stack  // Error: missing type argument

// RIGHT
var s Stack[int]
```

### Method Type Parameters

```go
// Methods can't have type parameters (only receiver)

// WRONG
type Stack[T any] struct { /* ... */ }
func (s *Stack[T]) Push[U any](v U) { /* ... */ }

// RIGHT - use struct type parameter
type Stack[T any] struct { /* ... */ }
func (s *Stack[T]) Push(v T) { /* ... */ }
```

### Generic Packages

```go
// WRONG
package generic[T any]

// RIGHT - Use regular packages with generic types/functions
package stack
type Stack[T any] struct { /* ... */ }
```

### Constraint Confusion

```go
// Using any when you need specific operations

// WRONG
func Add[T any](a, b T) T {
    return a + b  // Error: any doesn't support +
}

// RIGHT - use ordered constraint
func Add[T cmp.Ordered](a, b T) T {
    return a + b
}
```

## Further Reading

- [Go Generics Tutorial](https://go.dev/doc/tutorial/generics)
- [When to Use Generics](https://go.dev/blog/when-generics)
- [Go Generics FAQ](https://go.dev/doc/faq#generics)
- [Go by Example - Generics](https://gobyexample.com/generics)
