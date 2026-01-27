# Go Functions and Methods

This reference covers function declarations, methods, closures, defer, and function-related patterns in Go.

## Table of Contents

1. [Function Basics](#function-basics)
2. [Multiple Return Values](#multiple-return-values)
3. [Named Return Values](#named-return-values)
4. [Variadic Functions](#variadic-functions)
5. [Methods](#methods)
6. [Closures and Anonymous Functions](#closures-and-anonymous-functions)
7. [Defer](#defer)
8. [Panic and Recover](#panic-and-recover)
9. [Function Types](#function-types)
10. [Best Practices](#best-practices)

## Function Basics

### Function Declaration

```go
// Basic function
func add(a int, b int) int {
    return a + b
}

// Shorthand parameter declaration (same type)
func add(a, b int) int {
    return a + b
}

// No return value
func log(message string) {
    fmt.Println(message)
}

// Multiple parameters, different types
func format(name string, age int, score float64) string {
    return fmt.Sprintf("%s (%d) - %.2f", name, age, score)
}
```

### Function Calls

```go
result := add(2, 3)
log("Hello, World!")
formatted := format("Alice", 30, 95.5)
```

### Public vs Private Functions

```go
// Public (exported) - starts with uppercase
func PublicFunction() {
    // Can be called from other packages
}

// private (unexported) - starts with lowercase
func privateFunction() {
    // Only callable within the same package
}
```

## Multiple Return Values

### Basic Multiple Returns

```go
func divide(a, b int) (int, int) {
    quotient := a / b
    remainder := a % b
    return quotient, remainder
}

// Usage
q, r := divide(10, 3)
fmt.Println(q, r)  // 3 1
```

### Idiomatic Error Handling

```go
func readFile(path string) ([]byte, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, err
    }
    return data, nil
}

// Usage
data, err := readFile("config.txt")
if err != nil {
    log.Fatal(err)
}
```

### Ignoring Return Values

```go
// Ignore both
_, _ = divide(10, 3)

// Ignore specific value
q, _ := divide(10, 3)  // Only care about quotient
```

## Named Return Values

### Basic Named Returns

```go
func split(sum int) (x, y int) {
    x = sum * 4 / 9
    y = sum - x
    return  // Naked return - returns x, y
}

// Usage
a, b := split(17)
fmt.Println(a, b)  // 7 10
```

### Named Returns with Documentation

```go
// Connect returns connection and error
// conn is the database connection
// err is nil on success, non-nil otherwise
func Connect(url string) (conn *sql.DB, err error) {
    conn, err = sql.Open("postgres", url)
    if err != nil {
        return nil, err  // Explicit return with error
    }
    if err = conn.Ping(); err != nil {
        return nil, err
    }
    return conn, nil  // Or: return
}
```

### When to Use Named Returns

**Good for:**
- Documenting return values
- Complex functions with multiple return points
- Deferred functions that modify return values

**Avoid for:**
- Simple functions
- Functions where naming doesn't add clarity

## Variadic Functions

### Basic Variadic Functions

```go
func sum(numbers ...int) int {
    total := 0
    for _, n := range numbers {
        total += n
    }
    return total
}

// Usage
sum()           // 0
sum(1)          // 1
sum(1, 2, 3)    // 6

// With slice
nums := []int{1, 2, 3, 4}
sum(nums...)     // 10
```

### Variadic with Other Parameters

```go
func format(prefix string, values ...int) string {
    result := prefix
    for _, v := range values {
        result += fmt.Sprintf(" %d", v)
    }
    return result
}

// Usage
format("Numbers:", 1, 2, 3)  // "Numbers: 1 2 3"
```

### Variadic Function Type

```go
// Type that accepts a variadic function
type OperationFunc func(...int) int

func apply(op OperationFunc, values ...int) int {
    return op(values...)
}
```

## Methods

### Value vs Pointer Receivers

```go
type Counter struct {
    count int
}

// Value receiver (doesn't modify struct)
func (c Counter) Value() int {
    return c.count
}

// Pointer receiver (can modify struct)
func (c *Counter) Increment() {
    c.count++
}

// Usage
counter := Counter{count: 0}
fmt.Println(counter.Value())  // 0
counter.Increment()
fmt.Println(counter.Value())  // 1
```

### When to Use Pointer Receivers

**Use pointer receiver when:**
- Method needs to modify the receiver
- Struct is large (avoids copying)
- Consistency - some methods need pointer receivers

**Use value receiver when:**
- Method doesn't modify receiver
- Struct is small (int, basic struct)
- Value semantics are needed (immutability)

### Method Sets and Interfaces

```go
type Interface interface {
    Value() int      // Value receiver method
    Increment()      // Pointer receiver method
}

// *Counter satisfies Interface (has both value and pointer methods)
// Counter does NOT satisfy Interface (missing Increment method)
```

### Method Expressions and Values

```go
type Math struct{}

func (m Math) Add(a, b int) int {
    return a + b
}

// Method expression (function requires receiver)
addFunc := Math.Add
result := addFunc(Math{}, 2, 3)  // 5

// Method value (bound to instance)
m := Math{}
addMethod := m.Add
result = addMethod(2, 3)  // 5
```

## Closures and Anonymous Functions

### Basic Anonymous Functions

```go
// Anonymous function assigned to variable
add := func(a, b int) int {
    return a + b
}
result := add(2, 3)  // 5

// Immediately invoked
result := func(a, b int) int {
    return a + b
}(2, 3)  // 5
```

### Closures Capturing Variables

```go
func makeAdder(x int) func(int) int {
    return func(y int) int {
        return x + y  // x is captured from outer scope
    }
}

add10 := makeAdder(10)
add10(5)  // 15

add20 := makeAdder(20)
add20(5)  // 25
```

### Closure Gotcha: Loop Variable Capture

```go
// WRONG: All goroutines capture the same variable
var funcs []func()
for i := 0; i < 3; i++ {
    funcs = append(funcs, func() {
        fmt.Println(i)  // All print 3
    })
}

// RIGHT: Create local variable
for i := 0; i < 3; i++ {
    i := i  // Create new variable
    funcs = append(funcs, func() {
        fmt.Println(i)  // Prints 0, 1, 2
    })
}
```

Note: Go 1.22+ fixes this with new loop semantics, but explicit capture is still good practice for clarity.

### Practical Closure Uses

```go
// 1. Deferred cleanup
func processFile(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer func() {
        f.Close()
        fmt.Printf("Closed %s\n", path)
    }()
    // Process file...
    return nil
}

// 2. Generator pattern
func intGenerator(start int) func() int {
    i := start
    return func() int {
        i++
        return i
    }
}

gen := intGenerator(0)
gen()  // 1
gen()  // 2
gen()  // 3
```

## Defer

### Basic Defer

```go
func processFile(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close()  // Executed when function returns

    // Process file...
    return nil
}
```

### Defer Execution Order (LIFO)

```go
func example() {
    defer fmt.Println("1")  // Printed last
    defer fmt.Println("2")  // Printed second
    defer fmt.Println("3")  // Printed first
    fmt.Println("4")        // Printed first
}

// Output: 4, 3, 2, 1
```

### Defer with Arguments

```go
func deferWithArgs() {
    i := 0
    defer fmt.Println(i)  // Prints 0 (value at defer time)
    i = 10
    fmt.Println(i)        // Prints 10
}

// Output: 10, 0
```

### Defer in Loops

```go
// WRONG: Defer only executes after function returns
func processFiles(files []string) error {
    for _, file := range files {
        f, err := os.Open(file)
        if err != nil {
            return err
        }
        defer f.Close()  // Won't close until function returns!
    }
    return nil
}

// RIGHT: Use anonymous function
func processFiles(files []string) error {
    for _, file := range files {
        if err := func() error {
            f, err := os.Open(file)
            if err != nil {
                return err
            }
            defer f.Close()  // Closes after each iteration
            // Process file...
            return nil
        }(); err != nil {
            return err
        }
    }
    return nil
}
```

### Recovering from Panics

```go
func safeProcess() (err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("panic: %v", r)
        }
    }()

    // Code that might panic
    panic("something went wrong")
}

err := safeProcess()
fmt.Println(err)  // "panic: something went wrong"
```

## Panic and Recover

### When to Panic

**Panic is for:**
- Unrecoverable conditions (programmer errors)
- Initialization failures (cannot continue)
- Critical invariant violations

**Don't panic for:**
- Expected errors (file not found, network timeout)
- User input validation

```go
// GOOD: Panic on programmer error
func mustGetEnv(key string) string {
    value := os.Getenv(key)
    if value == "" {
        log.Fatalf("%s environment variable not set", key)
    }
    return value
}

// BAD: Panic on expected error
func readFile(path string) string {
    data, err := os.ReadFile(path)
    if err != nil {
        panic(err)  // Don't do this!
    }
    return string(data)
}

// GOOD: Return error
func readFile(path string) (string, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return "", err
    }
    return string(data), nil
}
```

### Recover Pattern

```go
func doWork() (err error) {
    defer func() {
        if r := recover(); r != nil {
            // Convert panic to error
            if e, ok := r.(error); ok {
                err = e
            } else {
                err = fmt.Errorf("panic: %v", r)
            }
        }
    }()

    // Do work that might panic
    return nil
}
```

## Function Types

### Function as Values

```go
type Operation func(int, int) int

func add(a, b int) int { return a + b }
func multiply(a, b int) int { return a * b }

func apply(op Operation, a, b int) int {
    return op(a, b)
}

// Usage
apply(add, 2, 3)       // 5
apply(multiply, 2, 3)  // 6
```

### Higher-Order Functions

```go
// Function that returns a function
func makeAdder(x int) func(int) int {
    return func(y int) int {
        return x + y
    }
}

// Function that takes a function
func filter(nums []int, predicate func(int) bool) []int {
    var result []int
    for _, n := range nums {
        if predicate(n) {
            result = append(result, n)
        }
    }
    return result
}

// Usage
evens := filter([]int{1, 2, 3, 4}, func(n int) bool {
    return n%2 == 0
})
```

### Method as Function

```go
type Math struct{}

func (m Math) Add(a, b int) int {
    return a + b
}

// Method expression
addFunc := Math.Add
result := addFunc(Math{}, 2, 3)
```

## Best Practices

### 1. Keep Functions Small

```go
// GOOD: Small, focused function
func calculateDiscount(price float64, customerLevel int) float64 {
    discount := getDiscountForLevel(customerLevel)
    return price * (1 - discount)
}

// BAD: Large function doing too much
func processOrder(order Order) error {
    // Validates order
    // Checks inventory
    // Calculates tax
    // Applies discount
    // Saves to database
    // Sends email
    // Updates analytics
    // ... 200 lines of code
}
```

### 2. Use Descriptive Names

```go
// GOOD: Clear name
func calculateDiscountForLoyalCustomer(price float64) float64

// BAD: Vague name
func calc(float64) float64
```

### 3. Limit Parameter Count

```go
// GOOD: Few parameters
func createUser(name, email string) error

// BETTER: Use struct for many parameters
type UserConfig struct {
    Name     string
    Email    string
    Age      int
    Address  string
    Phone    string
}

func createUser(config UserConfig) error
```

### 4. Return Errors Explicitly

```go
// GOOD: Explicit error handling
func divide(a, b int) (int, error) {
    if b == 0 {
        return 0, fmt.Errorf("division by zero")
    }
    return a / b, nil
}

// BAD: Panicking on error
func divide(a, b int) int {
    if b == 0 {
        panic("division by zero")
    }
    return a / b
}
```

### 5. Use Value Receivers for Immutable Operations

```go
// GOOD: Value receiver for read-only
func (s Shape) Area() float64 {
    return s.width * s.height
}

// GOOD: Pointer receiver for mutation
func (s *Shape) Scale(factor float64) {
    s.width *= factor
    s.height *= factor
}
```

### 6. Defer Early, Defer Often

```go
// GOOD: Defer right after resource acquisition
func process() error {
    db, err := sql.Open("sqlite3", ":memory:")
    if err != nil {
        return err
    }
    defer db.Close()  // Defer immediately

    tx, err := db.Begin()
    if err != nil {
        return err
    }
    defer tx.Rollback()  // Will rollback if not committed

    // ... work ...

    return tx.Commit()  // Commit overrides rollback
}
```

### 7. Avoid Naked Returns in Complex Functions

```go
// OK for simple functions
func simple() (result int) {
    result = 42
    return
}

// AVOID for complex functions
func complex(input string) (result string, err error) {
    if input == "" {
        err = fmt.Errorf("empty input")
        return  // Unclear what's being returned
    }
    // ... lots of logic ...
    result = "processed: " + input
    return  // Easy to miss setting result or err
}
```

## Further Reading

- [Effective Go - Functions](https://go.dev/doc/effective_go#functions)
- [Go by Example - Functions](https://gobyexample.com/functions)
- [Go Functions - A Visual Guide](https://www.practical-go-lessons.com/functions/)
- [Defer, Panic, and Recover](https://go.dev/blog/defer-panic-and-recover)
- [Go Proverbs: "Clear is better than clever"](https://go-proverbs.github.io/)
