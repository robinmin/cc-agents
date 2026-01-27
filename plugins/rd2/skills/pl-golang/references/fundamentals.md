# Go Fundamentals

This reference covers Go syntax basics, types, variables, constants, and core language features.

## Table of Contents

1. [Basic Syntax](#basic-syntax)
2. [Variables and Declarations](#variables-and-declarations)
3. [Types](#types)
4. [Constants](#constants)
5. [Control Flow](#control-flow)
6. [Pointers](#pointers)
7. [Common Pitfalls](#common-pitfalls)

## Basic Syntax

### Package Declaration

Every Go file starts with a package declaration:

```go
package main  // Executable programs use "package main"

package mypackage  // Libraries use descriptive names
```

### Imports

```go
import "fmt"                    // Single import
import (
    "fmt"                       // Multiple imports (grouped)
    "os"
    "github.com/user/project"   // Third-party packages
)

// Import with alias
import alias "path/to/package"

// Blank import (for side effects only)
import _ "github.com/lib/pq"
```

### The main Function

Entry point for executable programs:

```go
package main

func main() {
    // Code here
}
```

## Variables and Declarations

### Declaration Syntax

```go
// var name type = value
var x int = 42
var y = 42              // Type inferred
var z int               // Zero value (0 for int)

// Short declaration (only inside functions)
x := 42                 // Type inferred

// Multiple variables
var a, b int = 1, 2
c, d := 3, 4

// Block declaration
var (
    name string = "Go"
    version float64 = 1.21
)
```

### Zero Values

Every type has a zero value:

```go
var i int           // 0
var f float64       // 0
var b bool          // false
var s string        // ""
var p *int          // nil
var c chan int      // nil
var m map[int]int   // nil (empty map)
var sl []int        // nil (empty slice)
```

### Variable Scope

```go
package main

var global int = 1  // Package-level scope

func main() {
    local := 2      // Function-level scope

    if true {
        block := 3  // Block-level scope
        // local is accessible
        // global is accessible
    }
    // block is NOT accessible here
}
```

## Types

### Basic Types

```go
// Numeric types
var i int        // Platform-dependent (32 or 64 bit)
var i8 int8      // -128 to 127
var i16 int16    // -32768 to 32767
var i32 int32    // -2^31 to 2^31-1
var i64 int64    // -2^63 to 2^63-1

var u uint       // Platform-dependent unsigned
var u8 uint8     // 0 to 255 (byte is alias for uint8)
var u16 uint16   // 0 to 65535
var u32 uint32
var u64 uint64

var f32 float32  // IEEE-754 32-bit
var f64 float64  // IEEE-754 64-bit

var c64 complex64   // Complex with float32 parts
var c128 complex128 // Complex with float64 parts

// Other types
var b bool       // true or false
var s string     // Immutable sequence of bytes
var r rune       // Unicode code point (alias for int32)
```

### Type Conversions

Go requires explicit type conversions:

```go
var i int = 42
var f float64 = float64(i)  // Explicit conversion
var s string = string(i)    // No implicit conversions!

// String conversions
i := 42
s := string(i)              // No! This gives ASCII character
s := strconv.Itoa(i)        // Yes! Convert int to string

// Parse strings
s := "42"
i, err := strconv.Atoi(s)   // Parse int
f, err := strconv.ParseFloat(s, 64)
```

### Composite Types

#### Arrays

Fixed-size sequences:

```go
var arr [3]int                    // Array of 3 ints (zero values)
arr := [3]int{1, 2, 3}            // Initialized
arr := [...]int{1, 2, 3}          // Size inferred

// Accessing
arr[0] = 10                       // Zero-indexed
len(arr)                          // 3 (fixed size)
```

#### Slices

Dynamic views into arrays:

```go
// Slice creation
sl := []int{1, 2, 3}              // Slice literal
sl := make([]int, 3)              // make(type, length, capacity)
sl := make([]int, 3, 5)           // With capacity

// Slicing
arr := [5]int{1, 2, 3, 4, 5}
sl := arr[1:4]                    // [2, 3, 4] (low:high, high exclusive)
sl := arr[:3]                     // [1, 2, 3] (from start)
sl := arr[2:]                     // [3, 4, 5] (to end)

// Operations
len(sl)                           // Current length
cap(sl)                           // Underlying capacity
sl = append(sl, 4)                // Add element
sl = append(sl, 5, 6, 7)          // Add multiple

// Copying
src := []int{1, 2, 3}
dst := make([]int, len(src))
copy(dst, src)                    // dst is now [1, 2, 3]
```

#### Maps

Hash tables:

```go
// Map creation
m := make(map[string]int)         // Empty map
m := map[string]int{              // With literals
    "one":   1,
    "two":   2,
}

// Operations
m["three"] = 3                    // Add/Update
val, ok := m["one"]               // Read with existence check
delete(m, "one")                  // Delete

// Checking for zero vs missing
if val, ok := m["key"]; !ok {
    // Key doesn't exist
}

// Iterating
for key, value := range m {
    fmt.Printf("%s: %d\n", key, value)
}
```

## Constants

### Declaration

```go
const Pi = 3.14159

const (
    StatusOK       = 200
    StatusNotFound = 404
)

// iota for enumerations
const (
    Monday = iota    // 0
    Tuesday          // 1
    Wednesday        // 2
    Thursday         // 3
    Friday           // 4
)

// With expressions
const (
    _ = iota         // Skip 0
    KB = 1 << (10 * iota)  // 1024
    MB                         // 1048576
    GB                         // 1073741824
)
```

### Typed vs Untyped Constants

```go
const untyped = 42      // Can be used as int, float64, etc.
const typed int = 42    // Can only be used as int

var f float64 = untyped  // OK
var f float64 = typed    // Error! Cannot use int as float64
```

## Control Flow

### If Statements

```go
if x > 0 {
    fmt.Println("positive")
} else if x < 0 {
    fmt.Println("negative")
} else {
    fmt.Println("zero")
}

// With initialization
if err := doSomething(); err != nil {
    return err
}
```

### For Loops

Go has only `for`, but it's versatile:

```go
// C-style
for i := 0; i < 10; i++ {
    fmt.Println(i)
}

// While-style
for condition {
    // loop until condition is false
}

// Infinite
for {
    // loop forever
    break  // or return
}

// Range over slices/maps
for i, v := range slice {
    fmt.Printf("%d: %v\n", i, v)
}

for k, v := range map {
    fmt.Printf("%s: %v\n", k, v)
}

// Iterate only indices
for i := range slice {
    fmt.Println(i)
}

// Iterate only values
for _, v := range slice {
    fmt.Println(v)
}
```

### Switch Statements

```go
switch value {
case 1:
    fmt.Println("one")
case 2:
    fmt.Println("two")
default:
    fmt.Println("other")
}

// No condition (like if-else chain)
switch {
case x < 0:
    fmt.Println("negative")
case x > 0:
    fmt.Println("positive")
default:
    fmt.Println("zero")
}

// Multiple cases
switch day {
case "Saturday", "Sunday":
    fmt.Println("weekend")
default:
    fmt.Println("weekday")
}
```

### Break, Continue, Goto

```go
// Break exits innermost loop
for i := 0; i < 10; i++ {
    if i == 5 {
        break
    }
}

// Continue skips to next iteration
for i := 0; i < 10; i++ {
    if i%2 == 0 {
        continue
    }
    fmt.Println(i)  // Only odd numbers
}

// Labels for breaking outer loops
outer:
for i := 0; i < 3; i++ {
    for j := 0; j < 3; j++ {
        if i == j {
            break outer  // Breaks outer loop
        }
    }
}
```

## Pointers

Go has pointers, but no pointer arithmetic:

```go
// Pointer declaration
var p *int                  // Pointer to int
x := 42
p = &x                      // p points to x
fmt.Println(*p)             // Dereference: prints 42

// Pointer with structs
type Person struct {
    Name string
    Age  int
}

p := &Person{Name: "Alice"}  // Pointer to struct
p.Name = "Bob"               // Auto-dereferenced
fmt.Println((*p).Name)       // Explicit dereference

// Pointers are useful for:
// 1. Modifying the original value
// 2. Avoiding copying large structs
// 3. Sharing state between goroutines
```

## Common Pitfalls

### Nil Slices vs Empty Slices

```go
var nilSlice []int          // nil slice, len=0, cap=0
emptySlice := []int{}       // empty slice, len=0, cap=0
makeSlice := make([]int, 0) // empty slice, len=0, cap=0

// JSON marshaling difference
json.Marshal(nilSlice)      // null
json.Marshal(emptySlice)    // []
json.Marshal(makeSlice)     // []
```

### Range Loop Variable Capture

```go
// WRONG: All goroutines capture the same variable
var funcs []func()
for _, v := range []int{1, 2, 3} {
    funcs = append(funcs, func() {
        fmt.Println(v)  // All print 3
    })
}

// RIGHT: Create local variable
for _, v := range []int{1, 2, 3} {
    v := v  // Create new variable
    funcs = append(funcs, func() {
        fmt.Println(v)  // Prints 1, 2, 3
    })
}
```

### String vs []byte

```go
s := "hello"
b := []byte(s)  // Creates copy
s2 := string(b) // Creates another copy

// For zero-copy conversion (unsafe)
// Only use when you understand the implications
import "unsafe"
s := "hello"
b := unsafe.Slice(unsafe.StringData(s), len(s))
```

## Best Practices

1. **Use short declaration (`:=`)** inside functions
2. **Prefer `make` over literals** for slices and maps when size is known
3. **Check for zero values** when dealing with maps
4. **Use `const` with `iota`** for enumerations
5. **Be explicit with type conversions** - Go never converts implicitly
6. **Check `ok` return value** when accessing maps
7. **Use range for iteration** - it's idiomatic and safe

## Further Reading

- [Effective Go - Basics](https://go.dev/doc/effective_go#semicolons)
- [Go Tour - Basics](https://go.dev/tour/welcome/1)
- [Go Language Specification](https://go.dev/ref/spec)
