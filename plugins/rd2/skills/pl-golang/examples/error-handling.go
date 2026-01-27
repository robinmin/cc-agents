//go:build ignore

// Error handling patterns examples

package main

import (
	"errors"
	"fmt"
	"os"
	"sync"
	"time"
)

// User type for examples
type User struct {
	ID   int
	Name string
	Age  int
}

// Example 1: Basic error checking
func divide(a, b int) (int, error) {
	if b == 0 {
		return 0, errors.New("division by zero")
	}
	return a / b, nil
}

// Example 2: Error wrapping (Go 1.13+)
func readFile(path string) ([]byte, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read file %s: %w", path, err)
	}
	return data, nil
}

// Example 3: Sentinel errors
var (
	ErrNotFound     = errors.New("not found")
	ErrInvalidInput = errors.New("invalid input")
)

func getUser(id int) (*User, error) {
	if id <= 0 {
		return nil, ErrInvalidInput
	}
	if id > 100 {
		return nil, ErrNotFound
	}
	return &User{ID: id}, nil
}

// Example 4: Custom error type
type ValidationError struct {
	Field   string
	Message string
}

func (e ValidationError) Error() string {
	return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}

func validateUser(u User) error {
	if u.Name == "" {
		return ValidationError{Field: "name", Message: "required"}
	}
	if u.Age < 0 {
		return ValidationError{Field: "age", Message: "must be positive"}
	}
	return nil
}

// Example 5: Error with Unwrap
type RetryableError struct {
	Err     error
	RetryAt time.Time
}

func (e RetryableError) Error() string {
	return fmt.Sprintf("retry after %s: %v", e.RetryAt, e.Err)
}

func (e RetryableError) Unwrap() error {
	return e.Err
}

// Example 6: Error checking patterns
func processUser(id int) error {
	// Early return on error
	user, err := getUser(id)
	if err != nil {
		return fmt.Errorf("get user %d: %w", id, err)
	}

	// Check specific error
	if errors.Is(err, ErrNotFound) {
		return fmt.Errorf("user %d not found", id)
	}

	// Validate
	if err := validateUser(*user); err != nil {
		var verr ValidationError
		if errors.As(err, &verr) {
			return fmt.Errorf("validation on %s failed: %s", verr.Field, verr.Message)
		}
		return err
	}

	return nil
}

// Example 7: Deferred error handling
func processFile(path string) (err error) {
	// Named return value for deferred error
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open file: %w", err)
	}
	defer func() {
		if cerr := file.Close(); cerr != nil {
			err = errors.Join(err, cerr)
		}
	}()

	// Process file...
	return nil
}

// Example 8: Error group (simplified)
type ErrorGroup struct {
	mu   sync.Mutex
	errs []error
}

func (g *ErrorGroup) Add(err error) {
	if err != nil {
		g.mu.Lock()
		g.errs = append(g.errs, err)
		g.mu.Unlock()
	}
}

func (g *ErrorGroup) ToError() error {
	if len(g.errs) == 0 {
		return nil
	}
	if len(g.errs) == 1 {
		return g.errs[0]
	}
	return fmt.Errorf("%d errors: %v", len(g.errs), g.errs)
}

// Example 9: Retry with error checking
func doWithRetry(maxRetries int, f func() error) error {
	var lastErr error
	for i := 0; i < maxRetries; i++ {
		err := f()
		if err == nil {
			return nil
		}

		lastErr = err

		// Check if error is retryable
		if errors.Is(err, ErrInvalidInput) {
			return err // Don't retry validation errors
		}

		time.Sleep(time.Duration(i+1) * time.Second)
	}
	return fmt.Errorf("after %d retries: %w", maxRetries, lastErr)
}

func main() {
	// Example usage
	result, err := divide(10, 2)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
	} else {
		fmt.Printf("Result: %d\n", result)
	}

	// Check sentinel error
	user, err := getUser(0)
	if errors.Is(err, ErrInvalidInput) {
		fmt.Println("Invalid user ID")
	}

	// Check custom error type
	u := User{Name: "", Age: 25}
	if err := validateUser(u); err != nil {
		var verr ValidationError
		if errors.As(err, &verr) {
			fmt.Printf("Validation failed on %s: %s\n", verr.Field, verr.Message)
		}
	}
}
