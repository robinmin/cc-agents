---
name: golang-interfaces
description: "Go interface design patterns: accept interfaces return structs, small focused interfaces, and testing."
see_also:
  - rd3:pl-golang
  - rd3:pl-golang:best-practices
  - rd3:pl-golang:error-handling
---

# Go Interface Design

This reference covers interface design principles and patterns in Go.

## Core Principles

### Accept Interfaces, Return Structs

```go
// WRONG: Accept concrete type
func ProcessData(f *os.File) error {
    // ...
}

// RIGHT: Accept interface
func ProcessData(w io.Writer) error {
    // ...
}

// WRONG: Return interface
func NewBuffer() io.Writer {
    return &bytes.Buffer{}
}

// RIGHT: Return concrete type
func NewBuffer() *bytes.Buffer {
    return &bytes.Buffer{}
}
```

### Keep Interfaces Small

```go
// WRONG: Large interface (god interface)
type Database interface {
    SaveUser(u *User) error
    FindUser(id int) (*User, error)
    DeleteUser(id int) error
    UpdateUser(u *User) error
    ListUsers() ([]*User, error)
    // ... 20 more methods
}

// RIGHT: Small, focused interfaces
type UserSaver interface {
    SaveUser(ctx context.Context, u *User) error
}

type UserFinder interface {
    FindUser(ctx context.Context, id string) (*User, error)
}

type UserDeleter interface {
    DeleteUser(ctx context.Context, id string) error
}
```

### Define Interfaces in Consumer Package

```go
// WRONG: Interface defined in implementing package
package postgres

type UserRepository interface {
    Save(ctx context.Context, u *User) error
    Find(ctx context.Context, id string) (*User, error)
}

// RIGHT: Interface defined where it's consumed
package service

type UserRepository interface {
    Save(ctx context.Context, u *User) error
    Find(ctx context.Context, id string) (*User, error)
}

type Service struct {
    repo UserRepository // Service specifies what it needs
}

// Provider implements the interface
package postgres

type PostgresDB struct { /* ... */ }

func (db *PostgresDB) Save(ctx context.Context, u *User) error {
    // Implementation
}

func (db *PostgresDB) Find(ctx context.Context, id string) (*User, error) {
    // Implementation
}
```

## Interface Naming

### The -er Suffix Convention

```go
// Single-method interfaces get -er suffix
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type Closer interface {
    Close() error
}

type ReadWriter interface {
    Reader
    Writer
}
```

### Descriptive Names for Multi-Method Interfaces

```go
// When -er doesn't fit, use descriptive names
type UserStore interface {
    Save(ctx context.Context, user *User) error
    FindByID(ctx context.Context, id string) (*User, error)
    FindByEmail(ctx context.Context, email string) (*User, error)
    Delete(ctx context.Context, id string) error
}

type PaymentProcessor interface {
    Charge(ctx context.Context, amount int64, currency string) (*Transaction, error)
    Refund(ctx context.Context, txID string) error
}
```

## Standard Library Interfaces

Use and implement these common interfaces:

| Interface | Package | Purpose |
|-----------|---------|---------|
| `io.Reader` | stdlib | Read data |
| `io.Writer` | stdlib | Write data |
| `io.Closer` | stdlib | Close/release resources |
| `io.Seeker` | stdlib | Seek position |
| `context.Context` | stdlib | Cancellation, deadlines |
| `error` | stdlib | Error representation |
| `fmt.Stringer` | stdlib | String representation |

### Example: Implementing io.Reader

```go
type MyReader struct {
    data []byte
    pos  int
}

func (r *MyReader) Read(p []byte) (n int, err error) {
    if r.pos >= len(r.data) {
        return 0, io.EOF
    }
    n = copy(p, r.data[r.pos:])
    r.pos += n
    return n, nil
}
```

## Interface Composition

### Embedding Interfaces

```go
type ReadWriter interface {
    Reader
    Writer
}

type ReadWriteCloser interface {
    Reader
    Writer
    Closer
}

// Embedding with additional methods
type BufferedReadWriter interface {
    Reader
    Writer
    Flush() error
}
```

## Designing for Testing

### Make Fakes Easy

```go
// WRONG: Concrete dependency
type Service struct {
    db *PostgresDB // Hard to test
}

// RIGHT: Interface dependency
type Service struct {
    db UserStore // Easy to fake
}

// Fake implementation for tests
type fakeUserStore struct {
    users map[string]*User
}

func (f *fakeUserStore) Save(ctx context.Context, u *User) error {
    f.users[u.ID] = u
    return nil
}

func (f *fakeUserStore) Find(ctx context.Context, id string) (*User, error) {
    return f.users[id], nil
}

// Usage in tests
func TestService(t *testing.T) {
    fake := &fakeUserStore{users: make(map[string]*User)}
    svc := NewService(fake)
    // test...
}
```

## Interface Checking at Compile Time

### Compile-Time Interface Checks

```go
// Verify that *PostgresDB implements UserStore at compile time
var _ UserStore = (*PostgresDB)(nil)

// Or with error checking
var _ UserStore = &PostgresDB{}
```

## Common Mistakes

### 1. Interface Pollution

```go
// WRONG: Creating interfaces for everything
type Stringifier interface {
    String() string
}

// RIGHT: Only create interfaces when needed
// (wait until you have multiple implementations)
```

### 2. Returning Interfaces

```go
// WRONG: Return interface
func NewCache() error {
    return &cache{} // Returns error interface, not *cache
}

// RIGHT: Return concrete type or interface when appropriate
type Cache interface {
    Get(key string) (value any, ok bool)
    Set(key string, value any)
}

func NewCache() Cache {
    return &cache{}
}
```

### 3. Interface in Producer Package

```go
// WRONG: package postgres defines interface
package postgres

type Connection interface { /* ... */ }

// RIGHT: package postgres implements interfaces defined by consumers
package postgres

type PostgresDB struct { /* ... */ }
```

## Best Practices Summary

1. **Accept interfaces, return structs**
2. **Keep interfaces small (1-3 methods)**
3. **Define interfaces where they are consumed**
4. **Use the -er suffix for single-method interfaces**
5. **Implement standard library interfaces when possible**
6. **Verify implementations at compile time**
7. **Don't create interfaces "just in case"**

## Further Reading

- [Effective Go: Interfaces](https://go.dev/doc/effective_go#interfaces)
- [Go Code Review Comments: Interfaces](https://github.com/golang/go/wiki/CodeReviewComments#interfaces)
