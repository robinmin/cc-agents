# Go Standard Library

This reference covers essential Go standard library packages for common tasks.

## Table of Contents

1. [I/O](#io)
2. [HTTP](#http)
3. [Strings](#strings)
4. [JSON](#json)
5. [Time](#time)
6. [File System](#file-system)
7. [Templates](#templates)
8. [Logging](#logging)
9. [Encoding](#encoding)
10. [Other Useful Packages](#other-useful-packages)

## I/O

### Readers and Writers

```go
import (
    "io"
    "os"
    "strings"
)

// Reading
reader := strings.NewReader("hello, world")
buf := make([]byte, 5)
n, err := reader.Read(buf)
// buf = []byte("hello")

// Writing
var builder strings.Builder
n, err := builder.Write([]byte("hello"))

// Copy from reader to writer
var buf bytes.Buffer
io.Copy(&buf, os.Stdin)

// Limit reader
limited := io.LimitReader(reader, 100)
```

### Common Readers/Writers

| Type | Description |
|------|-------------|
| `os.File` | File on disk |
| `bytes.Buffer` | In-memory buffer |
| `strings.Reader` | Read from string |
| `strings.Builder` | Efficient string building |
| `io.PipeReader/Writer` | Pipe for communication |

## HTTP

### HTTP Client

```go
import "net/http"

// Simple GET
resp, err := http.Get("https://example.com")
if err != nil {
    return err
}
defer resp.Body.Close()
body, _ := io.ReadAll(resp.Body)

// POST
resp, err := http.Post(
    "https://example.com/api",
    "application/json",
    strings.NewReader(`{"key":"value"}`),
)

// Custom request
req, _ := http.NewRequest("GET", "https://example.com", nil)
req.Header.Set("Authorization", "Bearer token")
client := &http.Client{Timeout: 10 * time.Second}
resp, err := client.Do(req)
```

### HTTP Server

```go
import "net/http"

// Simple handler
func handler(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("Hello, World!"))
}

// With routing
func main() {
    http.HandleFunc("/", handler)
    http.HandleFunc("/api", apiHandler)

    // Custom server
    server := &http.Server{
        Addr:         ":8080",
        ReadTimeout:  5 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  120 * time.Second,
    }
    server.ListenAndServe()
}

// Request information
func handler(w http.ResponseWriter, r *http.Request) {
    // Method
    fmt.Println(r.Method)

    // URL
    fmt.Println(r.URL.Path)
    fmt.Println(r.URL.Query().Get("key"))

    // Headers
    auth := r.Header.Get("Authorization")

    // Body
    defer r.Body.Close()
    body, _ := io.ReadAll(r.Body)
}

// Response
func handler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    w.Write([]byte(`{"message":"created"}`))
}
```

### HTTP Testing

```go
import "net/http/httptest"

func TestHandler(t *testing.T) {
    req := httptest.NewRequest("GET", "/test", nil)
    w := httptest.NewRecorder()

    handler(w, req)

    if w.Code != http.StatusOK {
        t.Errorf("got status %d, want %d", w.Code, http.StatusOK)
    }

    if w.Body.String() != "OK" {
        t.Errorf("got body %q, want %q", w.Body.String(), "OK")
    }
}
```

## Strings

### String Operations

```go
import (
    "strings"
    "unicode"
)

// Contains
strings.Contains("hello", "ell")  // true

// Prefix/Suffix
strings.HasPrefix("hello", "he")   // true
strings.HasSuffix("hello", "lo")   // true

// Split/Join
parts := strings.Split("a,b,c", ",")  // ["a", "b", "c"]
result := strings.Join([]string{"a", "b"}, ",")  // "a,b"

// Trim
strings.TrimSpace("  hello  ")  // "hello"
strings.Trim("!!hello!!", "!")  // "hello"

// Replace
strings.Replace("hello", "l", "x", 1)  // "hexlo"
strings.ReplaceAll("hello", "l", "x")  // "hexxo"

// Case
strings.ToLower("HELLO")  // "hello"
strings.ToUpper("hello")  // "HELLO"

// Fields
strings.Fields("a  b\tc")  // ["a", "b", "c"]

// Builder (efficient concatenation)
var builder strings.Builder
for i := 0; i < 1000; i++ {
    builder.WriteString("text")
}
result := builder.String()
```

### String Conversion

```go
import (
    "strconv"
    "fmt"
)

// String to int
i, _ := strconv.Atoi("42")

// Int to string
s := strconv.Itoa(42)

// Parse with base
i, _ := strconv.ParseInt("101", 2, 64)  // Binary

// Format
s := strconv.FormatInt(42, 16)  // "2a"

// Float
f, _ := strconv.ParseFloat("3.14", 64)
s := strconv.FormatFloat(3.14, 'f', 2, 64)

// Bool
b, _ := strconv.ParseBool("true")
s := strconv.FormatBool(true)

// Sprintf (for complex formatting)
s := fmt.Sprintf("%d items, %.2f each", 10, 3.14)
```

## JSON

### Marshal/Unmarshal

```go
import "encoding/json"

// Struct tags for JSON
type User struct {
    ID       int    `json:"id"`
    Name     string `json:"name"`
    Email    string `json:"email"`
    Password string `json:"-"`              // Ignore
    Internal string `json:"internal,omitempty"`  // Omit if empty
}

// Marshal
user := User{ID: 1, Name: "Alice"}
data, err := json.Marshal(user)
// data = []byte(`{"id":1,"name":"Alice"}`)

// Unmarshal
var user User
err := json.Unmarshal(data, &user)

// With io.Reader/Writer
json.NewEncoder(w).Encode(user)
json.NewDecoder(r).Decode(&user)

// Indented
data, _ := json.MarshalIndent(user, "", "  ")
```

### Streaming JSON

```go
// Streaming decode (for large files)
decoder := json.NewDecoder(file)
for decoder.More() {
    var item Item
    if err := decoder.Decode(&item); err != nil {
        break
    }
    process(item)
}

// Streaming encode
encoder := json.NewEncoder(w)
for _, item := range items {
    if err := encoder.Encode(item); err != nil {
        return err
    }
}
```

### Custom JSON Handling

```go
// MarshalJSON/UnmarshalJSON for custom types
type Time struct {
    time.Time
}

func (t Time) MarshalJSON() ([]byte, error) {
    return []byte(fmt.Sprintf(`"%s"`, t.Format("2006-01-02"))), nil
}

func (t *Time) UnmarshalJSON(data []byte) error {
    s := strings.Trim(string(data), `"")
    parsed, err := time.Parse("2006-01-02", s)
    t.Time = parsed
    return err
}
```

## Time

### Time Operations

```go
import "time"

// Current time
now := time.Now()

// Parsing/Formatting
layout := "2006-01-02 15:04:05"
t, _ := time.Parse(layout, "2024-01-15 10:30:00")
formatted := t.Format(layout)  // "2024-01-15 10:30:00"

// Time arithmetic
future := now.Add(24 * time.Hour)
past := now.Add(-7 * 24 * time.Hour)

// Duration
duration := future.Sub(now)
hours := duration.Hours()

// Time zones
loc, _ := time.LoadLocation("America/New_York")
t := time.Now().In(loc)

// Unix timestamp
unix := time.Now().Unix()
t := time.Unix(unix, 0)

// Time comparison
if t1.Before(t2) { /* ... */ }
if t1.After(t2) { /* ... */ }
if t1.Equal(t2) { /* ... */ }

// Timers
timer := time.NewTimer(5 * time.Second)
<-timer.C

// Tickers
ticker := time.NewTicker(1 * time.Second)
for range ticker.C {
    // Every second
}
ticker.Stop()
```

## File System

### File Operations

```go
import "os"
import "io/ioutil"  // Deprecated, use os/io instead

// Read file
data, err := os.ReadFile("file.txt")  // Go 1.16+

// Write file
err := os.WriteFile("file.txt", data, 0644)

// Open file
file, err := os.Open("file.txt")
defer file.Close()

// Create file
file, err := os.Create("file.txt")
defer file.Close()

// Read/write
data := make([]byte, 1024)
n, err := file.Read(data)
n, err = file.Write(data)

// Seek
file.Seek(0, 0)  // Seek to beginning

// File info
info, _ := os.Stat("file.txt")
size := info.Size()
mode := info.Mode()
modTime := info.ModTime()
```

### Directory Operations

```go
// Create directory
err := os.Mkdir("dir", 0755)
err := os.MkdirAll("path/to/dir", 0755)

// Remove
err := os.Remove("file.txt")
err := os.RemoveAll("path")

// Read directory
entries, err := os.ReadDir(".")
for _, entry := range entries {
    name := entry.Name()
    isDir := entry.IsDir()
}

// Walk directory tree
filepath.Walk(".", func(path string, info os.FileInfo, err error) error {
    fmt.Println(path)
    return nil
})
```

## Templates

### Text Templates

```go
import "text/template"

const tpl = `Hello, {{.Name}}!`

data := struct{ Name string }{Name: "World"}

t, _ := template.New("greeting").Parse(tpl)
t.Execute(os.Stdout, data)
// Output: Hello, World!
```

### HTML Templates

```go
import "html/template"

const html = `<html><body>{{.Name}}</body></html>`

t, _ := template.New("page").Parse(html)
t.Execute(os.Stdout, data)
```

### Template Functions

```go
funcMap := template.FuncMap{
    "upper": strings.ToUpper,
    "lower": strings.ToLower,
}

t := template.New("page").Funcs(funcMap)
t.Parse(`{{.Name | upper}}`)

data := struct{ Name string }{Name: "hello"}
t.Execute(os.Stdout, data)
// Output: HELLO
```

## Logging

### Log Package

```go
import "log"

// Simple logging
log.Println("message")
log.Printf("value: %d", 42)

// Fatal (exit)
log.Fatal("critical error")

// Panic (panic)
log.Panic("error")

// Custom logger
logger := log.New(os.Stdout, "APP: ", log.LstdFlags|log.Lshortfile)
logger.Println("custom logger")

// With file
f, _ := os.OpenFile("log.txt", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
logger := log.New(f, "LOG: ", log.LstdFlags)
```

### Structured Logging (log/slog - Go 1.21+)

```go
import "log/slog"

// Default handler
slog.Info("message", "key", "value")
slog.Error("error", "err", err)

// With context
slog.LogAttrs(r.Context(), slog.LevelInfo, "message",
    slog.String("key", "value"),
    slog.Int("count", 42),
)

// Custom handler
opts := &slog.HandlerOptions{
    Level: slog.LevelDebug,
}
handler := slog.NewJSONHandler(os.Stdout, opts)
logger := slog.New(handler)

logger.Info("message", "key", "value")
```

## Encoding

### Base64

```go
import "encoding/base64"

// Encode
encoded := base64.StdEncoding.EncodeToString([]byte("hello"))
// encoded = "aGVsbG8="

// Decode
decoded, _ := base64.StdEncoding.DecodeString(encoded)
// decoded = []byte("hello")

// URL-safe encoding
encoded := base64.URLEncoding.EncodeToString(data)
```

### Hex

```go
import "encoding/hex"

// Encode
encoded := hex.EncodeToString([]byte("hello"))
// encoded = "68656c6c6f"

// Decode
decoded, _ := hex.DecodeString(encoded)
```

### Gzip

```go
import "compress/gzip"

// Compress
var buf bytes.Buffer
writer := gzip.NewWriter(&buf)
writer.Write([]byte("hello"))
writer.Close()
compressed := buf.Bytes()

// Decompress
reader, _ := gzip.NewReader(bytes.NewReader(compressed))
defer reader.Close()
decompressed, _ := io.ReadAll(reader)
```

## Other Useful Packages

### Path/filepath

```go
import "path/filepath"

// Join
path := filepath.Join("dir", "subdir", "file.txt")

// Base/Dir
base := filepath.Base("/path/to/file.txt")  // "file.txt"
dir := filepath.Dir("/path/to/file.txt")    // "/path/to"

// Ext
ext := filepath.Ext("file.txt")  // ".txt"

// Clean
clean := filepath.Clean("/path/./to/../file")

// Split
dir, file := filepath.Split("/path/to/file.txt")

// Walk
filepath.Walk("/path", func(path string, info os.FileInfo, err error) error {
    fmt.Println(path)
    return nil
})
```

### Math

```go
import "math"

// Constants
pi := math.Pi
e := math.E

// Functions
abs := math.Abs(-5.5)        // 5.5
ceil := math.Ceil(5.1)       // 6
floor := math.Floor(5.9)     // 5
round := math.Round(5.5)     // 6
pow := math.Pow(2, 8)        // 256
sqrt := math.Sqrt(16)        // 4
max := math.Max(5, 10)       // 10
min := math.Min(5, 10)       // 5

// Trigonometric
sin := math.Sin(math.Pi / 2)  // 1
cos := math.Cos(0)            // 1
```

### Sort

```go
import "sort"

// Sort slice
nums := []int{5, 2, 8, 1}
sort.Ints(nums)

// Sort strings
strs := []string{"banana", "apple", "cherry"}
sort.Strings(strs)

// Custom sort
type Person struct {
    Name string
    Age  int
}

people := []Person{{"Alice", 30}, {"Bob", 25}}

sort.Slice(people, func(i, j int) bool {
    return people[i].Age < people[j].Age
})
```

## Further Reading

- [Standard Library Overview](https://go.dev/pkg/)
- [Effective Go - I/O](https://go.dev/doc/effective_go#io)
- [Go by Example - HTTP Servers](https://gobyexample.com/http-servers)
