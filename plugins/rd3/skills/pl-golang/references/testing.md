---
name: golang-testing
description: "Go testing patterns: table-driven tests, benchmarks, fuzzing, httptest, and test organization."
see_also:
  - rd3:pl-golang
  - rd3:pl-golang:best-practices
  - rd3:tdd-workflow
---

# Go Testing

This reference covers testing patterns and best practices in Go.

## Table of Contents

1. [Table-Driven Tests](#table-driven-tests)
2. [Subtests](#subtests)
3. [Test Organization](#test-organization)
4. [Benchmark Tests](#benchmark-tests)
5. [Fuzzing](#fuzzing)
6. [HTTP Testing](#http-testing)
7. [Test Utilities](#test-utilities)

## Table-Driven Tests

### Basic Pattern

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"simple", 1, 2, 3},
        {"negative", -1, -2, -3},
        {"zero", 0, 0, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := Add(tt.a, tt.b)
            if result != tt.expected {
                t.Errorf("Add(%d, %d) = %d; want %d", tt.a, tt.b, result, tt.expected)
            }
        })
    }
}
```

### Error Cases

```go
func TestFindUser(t *testing.T) {
    tests := []struct {
        name    string
        id      string
        wantErr bool
        errType error
    }{
        {
            name:    "not found",
            id:      "invalid-id",
            wantErr: true,
            errType: ErrNotFound,
        },
        {
            name:    "success",
            id:      "valid-id",
            wantErr: false,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            user, err := FindUser(tt.id)
            if tt.wantErr {
                if err == nil {
                    t.Fatal("expected error, got nil")
                }
                if tt.errType != nil && !errors.Is(err, tt.errType) {
                    t.Errorf("expected error %v, got %v", tt.errType, err)
                }
                return
            }
            if err != nil {
                t.Fatalf("unexpected error: %v", err)
            }
            if user == nil {
                t.Fatal("expected user, got nil")
            }
        })
    }
}
```

## Subtests

### Sharing Setup

```go
func TestDatabase(t *testing.T) {
    // Setup shared resources
    db, err := sql.Open("sqlite", ":memory:")
    if err != nil {
        t.Fatal(err)
    }
    defer db.Close()

    // Seed data
    seedTestData(t, db)

    t.Run("GetUser", func(t *testing.T) {
        user, err := GetUser(db, 1)
        if err != nil {
            t.Error(err)
        }
        if user.Name != "Alice" {
            t.Errorf("expected Alice, got %s", user.Name)
        }
    })

    t.Run("ListUsers", func(t *testing.T) {
        users, err := ListUsers(db)
        if err != nil {
            t.Error(err)
        }
        if len(users) != 3 {
            t.Errorf("expected 3 users, got %d", len(users))
        }
    })
}
```

### Running Specific Subtests

```bash
go test -v -run "TestDatabase/GetUser"
go test -v -run "TestDatabase/ListUsers"
```

## Test Organization

### Co-located Tests

```
mypackage/
├── mypackage.go
├── mypackage_test.go  # Tests co-located with code
└── internal.go
    └── internal_test.go
```

### Test File Naming

```go
// mypackage_test.go - same package
package mypackage

// OR - external tests
package mypackage_test  // _test suffix = external test
```

### Test Main

```go
func TestMain(m *testing.M) {
    // Setup
    flag.Parse()

    // Run tests
    exitCode := m.Run()

    // Teardown
    cleanup()

    os.Exit(exitCode)
}
```

## Benchmark Tests

### Basic Benchmark

```go
func BenchmarkSprintf(b *testing.B) {
    var s string
    for i := 0; i < b.N; i++ {
        s = fmt.Sprintf("hello %d %s", 123, "world")
    }
}

func BenchmarkBuilder(b *testing.B) {
    var sb strings.Builder
    for i := 0; i < b.N; i++ {
        sb.Reset()
        sb.WriteString("hello ")
        sb.WriteString("world")
        sb.WriteInt(123)
        s = sb.String()
    }
}

// Run with: go test -bench=. -benchmem
```

### Benchmark with Comparison

```go
func BenchmarkConcat(b *testing.B) {
    const n = 10
    inputs := make([]string, n)
    for i := 0; i < n; i++ {
        inputs[i] = fmt.Sprintf("item-%d", i)
    }

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        result := strings.Join(inputs, ",")
        _ = result
    }
}
```

## Fuzzing

### Basic Fuzzer (Go 1.18+)

```go
func FuzzReverse(f *testing.F) {
    // Seed corpus
    f.Add([]byte("hello"))
    f.Add([]byte("world"))

    f.Fuzz(func(t *testing.T, input []byte) {
        // Reverse twice should return original
        rev := Reverse(input)
        doubleRev := Reverse(rev)
        if !bytes.Equal(input, doubleRev) {
            t.Errorf("Reverse(Reverse(%q)) = %q; want %q", input, doubleRev, input)
        }
    })
}

// Run with: go test -fuzz=FuzzReverse
```

### Fuzzer with Contract

```go
func FuzzTrimSpace(f *testing.F) {
    f.Add([]byte("  hello  "))
    f.Add([]byte("\ttab\t"))
    f.Add([]byte(""))

    f.Fuzz(func(t *testing.T, input []byte) {
        trimmed := strings.TrimSpace(string(input))
        // Contract: trimmed should have no leading/trailing whitespace
        if len(trimmed) > 0 {
            if trimmed[0] == ' ' || trimmed[len(trimmed)-1] == ' ' {
                t.Errorf("TrimSpace returned %q with leading/trailing space", trimmed)
            }
        }
        // Contract: trimming twice should be idempotent
        if strings.TrimSpace(trimmed) != trimmed {
            t.Errorf("TrimSpace not idempotent: %q -> %q", trimmed, strings.TrimSpace(trimmed))
        }
    })
}
```

## HTTP Testing

### Using httptest

```go
func TestHandler(t *testing.T) {
    mux := http.NewServeMux()
    mux.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        w.Write([]byte(`{"id":"1","name":"Alice"}`))
    })

    req := httptest.NewRequest("GET", "/users", nil)
    rec := httptest.NewRecorder()

    mux.ServeHTTP(rec, req)

    if rec.Code != http.StatusOK {
        t.Errorf("expected status 200, got %d", rec.Code)
    }

    if rec.Header().Get("Content-Type") != "application/json" {
        t.Errorf("expected Content-Type application/json")
    }
}
```

### Testing JSON APIs

```go
func TestCreateUser(t *testing.T) {
    payload := `{"name":"Bob","email":"bob@example.com"}`

    req := httptest.NewRequest("POST", "/users", strings.NewReader(payload))
    req.Header.Set("Content-Type", "application/json")
    rec := httptest.NewRecorder()

    handler(rec, req)

    if rec.Code != http.StatusCreated {
        t.Errorf("expected 201, got %d", rec.Code)
    }

    var resp User
    if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
        t.Fatalf("failed to decode response: %v", err)
    }

    if resp.Name != "Bob" {
        t.Errorf("expected name Bob, got %s", resp.Name)
    }
}
```

## Test Utilities

### testify/assert

```go
import (
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestWithTestify(t *testing.T) {
    // require - stops test on failure
    require.NoError(t, err)
    require.Equal(t, 3, count)

    // assert - continues on failure
    assert.Equal(t, "expected", actual)
    assert.Contains(t, output, "substring")
    assert.Len(t, items, 5)
}
```

### Table-Driven Test Helper

```go
func runTestCases[T any](t *testing.T, testFn func(*testing.T, T)) {
    cases := []T{/* ... */}
    for _, tc := range cases {
        tc := tc // capture range variable
        t.Run(fmt.Sprintf("case-%d", tc), func(t *testing.T) {
            testFn(t, tc)
        })
    }
}
```

## Test Coverage

```bash
# Run with coverage
go test -cover ./...

# Coverage with profile
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# View per-function coverage
go tool cover -func=coverage.out
```

## Further Reading

- [Testing in Go](https://go.dev/blog/testing)
- [Testing Techniques](https://go.dev/doc/code#testing)
- [Fuzzing in Go](https://go.dev/security/fuzz/)
