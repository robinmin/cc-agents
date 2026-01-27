# Go Testing

This reference covers testing fundamentals, table-driven tests, benchmarks, fuzzing, and testing best practices in Go.

## Table of Contents

1. [Testing Basics](#testing-basics)
2. [Table-Driven Tests](#table-driven-tests)
3. [Subtests](#subtests)
4. [Test Helpers](#test-helpers)
5. [Benchmarks](#benchmarks)
6. [Examples](#examples)
7. [Fuzzing](#fuzzing)
8. [Testing Patterns](#testing-patterns)
9. [Best Practices](#best-practices)

## Testing Basics

### Test File Structure

```go
// Package declaration - typically test the same package
package mypackage

import "testing"

// Test function must start with Test
func TestAdd(t *testing.T) {
    result := Add(2, 3)
    expected := 5

    if result != expected {
        t.Errorf("Add(2, 3) = %d; want %d", result, expected)
    }
}
```

### Running Tests

```bash
# Run all tests in current directory
go test

# Run with verbose output
go test -v

# Run specific test
go test -run TestAdd

# Run tests in all subdirectories
go test ./...

# Run with race detection
go test -race

# Run with coverage
go test -cover

# Generate coverage report
go test -coverprofile=coverage.out
go tool cover -html=coverage.out
```

### Test Assertions

```go
func TestSomething(t *testing.T) {
    t.Run("subtest", func(t *testing.T) {
        // Basic failure
        if result != expected {
            t.Errorf("got %d, want %d", result, expected)
        }

        // Fatal error (stops test)
        if result == nil {
            t.Fatal("result was nil")
        }

        // Skip test
        if testing.Short() {
            t.Skip("skipping in short mode")
        }
    })
}
```

## Table-Driven Tests

### Basic Table-Driven Test

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive", 2, 3, 5},
        {"negative", -2, -3, -5},
        {"mixed", -2, 3, 1},
        {"zero", 0, 0, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := Add(tt.a, tt.b)
            if result != tt.expected {
                t.Errorf("Add(%d, %d) = %d; want %d",
                    tt.a, tt.b, result, tt.expected)
            }
        })
    }
}
```

### Table-Driven with Error Cases

```go
func TestDivide(t *testing.T) {
    tests := []struct {
        name        string
        a, b        int
        expected    int
        expectError bool
    }{
        {"normal", 10, 2, 5, false},
        {"fraction", 7, 2, 3, false},
        {"divide by zero", 10, 0, 0, true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result, err := Divide(tt.a, tt.b)

            if tt.expectError {
                if err == nil {
                    t.Error("expected error, got nil")
                }
                return
            }

            if err != nil {
                t.Fatalf("unexpected error: %v", err)
            }
            if result != tt.expected {
                t.Errorf("Divide(%d, %d) = %d; want %d",
                    tt.a, tt.b, result, tt.expected)
            }
        })
    }
}
```

### Table-Driven with Setup

```go
func TestUserValidation(t *testing.T) {
    // Setup
    db := setupTestDB(t)
    defer db.Close()

    tests := []struct {
        name    string
        user    User
        isValid bool
    }{
        {"valid", User{Name: "Alice"}, true},
        {"empty name", User{Name: ""}, false},
        {"long name", User{Name: strings.Repeat("x", 300)}, false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := db.SaveUser(tt.user)
            isValid := err == nil

            if isValid != tt.isValid {
                t.Errorf("validation result: %v; want %v (error: %v)",
                    isValid, tt.isValid, err)
            }
        })
    }
}
```

## Subtests

### Organizing Tests

```go
func TestUserService(t *testing.T) {
    svc := NewUserService()

    t.Run("CreateUser", func(t *testing.T) {
        t.Run("valid user", func(t *testing.T) {
            user, err := svc.CreateUser("alice@example.com", "Alice")
            if err != nil {
                t.Fatalf("CreateUser failed: %v", err)
            }
            if user.Email != "alice@example.com" {
                t.Errorf("email mismatch")
            }
        })

        t.Run("duplicate email", func(t *testing.T) {
            _, _ = svc.CreateUser("bob@example.com", "Bob")
            _, err := svc.CreateUser("bob@example.com", "Robert")
            if err == nil {
                t.Error("expected duplicate error")
            }
        })
    })

    t.Run("GetUser", func(t *testing.T) {
        // GetUser tests...
    })
}
```

### Parallel Subtests

```go
func TestParallel(t *testing.T) {
    tests := []int{1, 2, 3, 4, 5}

    for _, tt := range tests {
        tt := tt
        t.Run(fmt.Sprintf("value=%d", tt), func(t *testing.T) {
            t.Parallel()  // Run in parallel

            result := process(tt)
            if result != tt*2 {
                t.Errorf("got %d, want %d", result, tt*2)
            }
        })
    }
}
```

## Test Helpers

### Test Setup and Teardown

```go
func setupTestDB(t *testing.T) *sql.DB {
    db, err := sql.Open("sqlite3", ":memory:")
    if err != nil {
        t.Fatalf("failed to open test db: %v", err)
    }

    // Run migrations
    _, err = db.Exec(schema)
    if err != nil {
        t.Fatalf("failed to migrate: %v", err)
    }

    t.Cleanup(func() {
        db.Close()
    })

    return db
}

func TestWithDB(t *testing.T) {
    db := setupTestDB(t)
    // Use db, will be cleaned up automatically
}
```

### Comparison Helpers

```go
func assertEqual[T comparable](t *testing.T, got, want T) {
    t.Helper()
    if got != want {
        t.Errorf("got %v, want %v", got, want)
    }
}

func assertNoError(t *testing.T, err error) {
    t.Helper()
    if err != nil {
        t.Errorf("unexpected error: %v", err)
    }
}

// Usage
func TestSomething(t *testing.T) {
    got := Add(2, 3)
    assertEqual(t, got, 5)

    err := doSomething()
    assertNoError(t, err)
}
```

### Deep Equality

```go
import "reflect"

func assertDeepEqual(t *testing.T, got, want interface{}) {
    t.Helper()
    if !reflect.DeepEqual(got, want) {
        t.Errorf("got %v, want %v", got, want)
    }
}

// Or use cmp package (golang.org/x/exp/cmp)
import "github.com/google/go-cmp/cmp"

func assertEqual(t *testing.T, got, want interface{}) {
    t.Helper()
    if diff := cmp.Diff(want, got); diff != "" {
        t.Errorf("mismatch (-want +got):\n%s", diff)
    }
}
```

## Benchmarks

### Basic Benchmark

```go
func BenchmarkFib(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Fib(20)
    }
}
```

### Running Benchmarks

```bash
# Run benchmarks
go test -bench=.

# Run specific benchmark
go test -bench=BenchmarkFib

# Run with memory allocation stats
go test -bench=. -benchmem

# Control benchmark time
go test -bench=. -benchtime=10s
```

### Benchmark Subtests

```go
func BenchmarkJSON(b *testing.B) {
    data := []byte(`{"name":"test","value":123}`)

    b.Run("Unmarshal", func(b *testing.B) {
        var result map[string]interface{}
        for i := 0; i < b.N; i++ {
            json.Unmarshal(data, &result)
        }
    })

    b.Run("Marshal", func(b *testing.B) {
        obj := map[string]interface{}{"name": "test", "value": 123}
        for i := 0; i < b.N; i++ {
            json.Marshal(obj)
        }
    })
}
```

### Benchmark with Setup

```go
func BenchmarkWithSetup(b *testing.B) {
    // Setup (not timed)
    data := make([]byte, 1024)
    rand.Read(data)

    b.ResetTimer()  // Reset timer after setup
    for i := 0; i < b.N; i++ {
        process(data)
    }
}
```

### Benchmark Allocations

```go
func BenchmarkAllocations(b *testing.B) {
    b.ReportAllocs()  // Report memory allocations
    for i := 0; i < b.N; i++ {
        _ = make([]byte, 1024)
    }
}
```

## Examples

### Basic Example

```go
// This is an example function (will be executed by go test)
func ExampleAdd() {
    result := Add(2, 3)
    fmt.Println(result)
    // Output: 5
}
```

### Example with Multiple Cases

```go
func ExampleInt_Min() {
    x := 5
    y := 10
    min := math.Min(x, y)
    fmt.Println(min)
    // Output: 5
}
```

## Fuzzing

Go 1.18+ introduced fuzzing for finding edge cases:

### Basic Fuzz Test

```go
func FuzzParseInt(f *testing.F) {
    // Add seed corpus
    f.Add("123")
    f.Add("-456")
    f.Add("invalid")

    f.Fuzz(func(t *testing.T, input string) {
        result, err := strconv.Atoi(input)
        if err != nil {
            return  // Invalid input is OK
        }
        // Test invariants
        if result > 0 && input[0] == '-' {
            t.Errorf("positive result %d from negative-looking input %s", result, input)
        }
    })
}
```

### Running Fuzz Tests

```bash
# Run fuzz test (will generate random inputs)
go test -fuzz=FuzzParseInt

# Run with time limit
go test -fuzz=FuzzParseInt -fuzztime=30s

# Run with specific seed corpus
go test -fuzz=FuzzParseInt -fuzz=corpus/
```

### Fuzzing Structs

```go
func FuzzReverse(f *testing.F) {
    f.Add([]byte("hello"))
    f.Add([]byte(""))

    f.Fuzz(func(t *testing.T, input []byte) {
        rev := Reverse(input)
        doubleRev := Reverse(rev)

        if !bytes.Equal(input, doubleRev) {
            t.Errorf("double reverse not equal: %v -> %v -> %v", input, rev, doubleRev)
        }
    })
}
```

## Testing Patterns

### HTTP Handlers

```go
func TestHandler(t *testing.T) {
    handler := NewHandler()

    tests := []struct {
        name           string
        method         string
        path           string
        expectedStatus int
        expectedBody   string
    }{
        {"get user", "GET", "/users/1", 200, `{"id":1}`},
        {"not found", "GET", "/users/999", 404, ""},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            req := httptest.NewRequest(tt.method, tt.path, nil)
            w := httptest.NewRecorder()

            handler.ServeHTTP(w, req)

            if w.Code != tt.expectedStatus {
                t.Errorf("status %d, want %d", w.Code, tt.expectedStatus)
            }

            if tt.expectedBody != "" && w.Body.String() != tt.expectedBody {
                t.Errorf("body %q, want %q", w.Body.String(), tt.expectedBody)
            }
        })
    }
}
```

### Mock Interfaces

```go
type MockDatabase struct {
    MockGetUser func(id int) (*User, error)
}

func (m *MockDatabase) GetUser(id int) (*User, error) {
    return m.MockGetUser(id)
}

func TestService(t *testing.T) {
    mockDB := &MockDatabase{
        MockGetUser: func(id int) (*User, error) {
            return &User{ID: id, Name: "Test"}, nil
        },
    }

    svc := NewService(mockDB)
    user, err := svc.GetUser(1)

    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if user.Name != "Test" {
        t.Errorf("name = %s; want Test", user.Name)
    }
}
```

### Test Main

```go
var testDB *sql.DB

func TestMain(m *testing.M) {
    // Global setup
    testDB = setupDB()
    defer testDB.Close()

    // Run tests
    code := m.Run()
    os.Exit(code)
}
```

## Best Practices

1. **Co-locate tests** with the code they test (`package_test.go`)
2. **Use table-driven tests** for multiple cases
3. **Run with `-race`** to detect data races
4. **Use `t.Helper()`** in helper functions
5. **Name tests descriptively** - `TestAdd_PositiveNumbers`
6. **Use subtests** for organization
7. **Avoid test interdependencies** - tests should be independent
8. **Test edge cases** - nil, empty, negative, boundary values
9. **Use coverage reports** - `go test -cover`
10. **Keep tests fast** - use `testing.Short()` for slow tests

## Further Reading

- [Testing in Go](https://go.dev/doc/tutorial/add-a-test)
- [Table-Driven Tests](https://dave.cheney.net/2019/05/07/prefer-table-driven-tests)
- [Go Fuzzing](https://go.dev/doc/fuzz/)
- [Writing Subtests and Benchmarks](https://go.dev/blog/subtests)
- [The Go Blog: Using Subtests and Sub-benchmarks](https://go.dev/blog/subtests)
