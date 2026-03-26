---
name: golang-stdlib
description: "Essential Go standard library packages: net/http, context, os, fmt, strings, and more."
see_also:
  - rd3:pl-golang
  - rd3:pl-golang:project-structures
---

# Go Standard Library

This reference covers essential Go standard library packages.

## Table of Contents

1. [Context](#context)
2. [Errors](#errors)
3. [fmt](#fmt)
4. [Strings](#strings)
5. [net/http](#nethttp)
6. [os](#os)
7. [Time](#time)
8. [Sync](#sync)
9. [Bytes/Strings](#bytesstrings)

## Context

```go
import "context"

// Cancellation
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

// Timeout
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

// Value
ctx := context.WithValue(ctx, "key", "value")
value := ctx.Value("key") // "value"

// Common patterns
select {
case <-ctx.Done():
    return ctx.Err()
default:
    // Continue
}
```

## Errors

```go
import "errors"

// New error
err := errors.New("something failed")

// Wrap with fmt.Errorf
err := fmt.Errorf("operation: %w", originalErr)

// Check errors
errors.Is(err, os.ErrNotExist)
errors.As(err, &myError)

// Multiple errors (1.20+)
errs := []error{err1, err2, err3}
combined := errors.Join(errs...)
for _, e := range errors.Errors(combined) {
    fmt.Println(e)
}
```

## fmt

```go
import "fmt"

// Print
fmt.Println("hello")
fmt.Printf("value: %d\n", 42)

// Format
s := fmt.Sprintf("name: %s, age: %d", "Alice", 30)

// Format verbs
%v  // Default format
%#v // Go syntax
%s  // String
%d  // Integer
%f  // Float
%.2f // Float with precision
%t  // Boolean
%p  // Pointer
%T  // Type

// Width
fmt.Printf("%10s", "hello") // "     hello"
fmt.Printf("%-10s", "hello") // "hello     "

// Error wrapping
fmt.Errorf("context: %w", err)
```

## Strings

```go
import "strings"

// Split and join
parts := strings.Split("a,b,c", ",")     // ["a", "b", "c"]
joined := strings.Join(parts, ",")       // "a,b,c"

// Contains and has
strings.Contains(s, "子")               // true
strings.HasPrefix(s, "http")           // true
strings.HasSuffix(s, ".go")            // true

// Replace
strings.ReplaceAll(s, "old", "new")

// To lower/upper
strings.ToLower(s)
strings.ToUpper(s)

// Trim
strings.TrimSpace(s)
strings.Trim(s, " \t\n")

// Builder (efficient concatenation)
var sb strings.Builder
sb.WriteString("hello")
sb.WriteString(" world")
result := sb.String()
```

## net/http

```go
import "net/http"

// Server
http.HandleFunc("/path", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    fmt.Fprintln(w, `{"message":"hello"}`)
})
http.ListenAndServe(":8080", nil)

// Client
resp, err := http.Get("https://api.example.com/data")
defer resp.Body.Close()
body, _ := io.ReadAll(resp.Body)

// With context
req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
client.Do(req)

// Server with mux
mux := http.NewServeMux()
mux.HandleFunc("GET /users", handleUsers)
mux.HandleFunc("POST /users", createUser)
http.ListenAndServe(":8080", mux)
```

### http.Request

```go
// Path parameters
r.URL.Path        // "/users/123"
r.URL.Query()     // url.Values{"name": ["alice"]}
r.Header.Get("X-Request-ID")

// Read body
body, err := io.ReadAll(r.Body)
var reqBody MyType
json.Unmarshal(body, &reqBody)
```

### http.ResponseWriter

```go
w.Header().Set("Content-Type", "application/json")
w.WriteHeader(http.StatusCreated)
json.NewEncoder(w).Encode(response)
```

## os

```go
import "os"

// Files
data, err := os.ReadFile("file.txt")
err = os.WriteFile("file.txt", []byte("content"), 0644)

// Open with options
f, err := os.Open("file.txt")
defer f.Close()

// File info
info, err := os.Stat("file.txt")
info.Name()      // "file.txt"
info.Size()      // 1024
info.IsDir()     // false

// Directories
os.MkdirAll("dir/subdir", 0755)
os.RemoveAll("dir")

// Environment
os.Getenv("HOME")
os.Setenv("KEY", "value")

// Exit
os.Exit(1)
```

## Time

```go
import "time"

// Now
now := time.Now()
now.Unix()
now.Format("2006-01-02")

// Durations
dur := 5 * time.Second
time.Sleep(dur)

// Parsing
t, err := time.Parse("2006-01-02", "2024-01-01")
t, err := time.ParseInLocation("2006-01-02", "2024-01-01", time.Local)

// Add/Subtract
future := now.Add(24 * time.Hour)
past := now.Add(-48 * time.Hour)

// Since/Until
time.Since(t)
time.Until(t)

// Timer
timer := time.NewTimer(5 * time.Second)
<-timer.C
```

## Sync

```go
import "sync"

// WaitGroup
var wg sync.WaitGroup
wg.Add(1)
go func() {
    defer wg.Done()
    // work
}()
wg.Wait()

// Mutex
var mu sync.Mutex
mu.Lock()
defer mu.Unlock()
counter++

// RWMutex (for read-heavy workloads)
var rwmu sync.RWMutex
rwmu.RLock()
defer rwmu.RUnlock()
value := data[key]

// Once
var once sync.Once
once.Do(initFunc)

// Map (concurrent)
var m sync.Map
m.Store("key", value)
val, ok := m.Load("key")
m.Delete("key")
m.Range(func(k, v any) bool {
    fmt.Println(k, v)
    return true
})

// Pool
pool := &sync.Pool{New: func() any {
    return &Buffer{}
}}
buf := pool.Get().(*Buffer)
// use buf
pool.Put(buf)
```

## Bytes

```go
import "bytes"

// Buffer
var buf bytes.Buffer
buf.Write([]byte("hello"))
buf.WriteString(" world")
data := buf.Bytes()

// Reader
reader := bytes.NewReader([]byte("hello"))
n, _ := reader.Read(b)

// Concat (use strings.Builder for strings)
var sb bytes.Buffer
sb.Grow(100) // Pre-allocate
```

## Further Reading

- [Go Standard Library](https://pkg.go.dev/std)
