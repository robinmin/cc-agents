//go:build ignore

// Context usage examples

package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"
)

// Data type for examples
type Data struct {
	ID   int
	Name string
}

// User type for examples
type User struct {
	ID    string
	Name  string
	Email string
}

// Database mock for examples
type Database struct {
	mu   sync.RWMutex
	users map[string]*User
}

func NewDatabase() *Database {
	return &Database{
		users: make(map[string]*User),
	}
}

func (db *Database) FindUser(ctx context.Context, id string) (*User, error) {
	db.mu.RLock()
	defer db.mu.RUnlock()

	if err := ctx.Err(); err != nil {
		return nil, err
	}

	user, ok := db.users[id]
	if !ok {
		return nil, errors.New("user not found")
	}
	return user, nil
}

func (db *Database) SaveUser(ctx context.Context, user *User) error {
	db.mu.Lock()
	defer db.mu.Unlock()

	if err := ctx.Err(); err != nil {
		return err
	}

	db.users[user.ID] = user
	return nil
}

// Example 1: Basic context with cancellation
func basicCancellation() {
	ctx, cancel := context.WithCancel(context.Background())

	go func(ctx context.Context) {
		for {
			select {
			case <-ctx.Done():
				fmt.Println("Goroutine cancelled:", ctx.Err())
				return
			default:
				fmt.Println("Working...")
				time.Sleep(500 * time.Millisecond)
			}
		}
	}(ctx)

	time.Sleep(2 * time.Second)
	cancel()
	time.Sleep(500 * time.Millisecond)
}

// Example 2: Context with timeout
func withTimeout() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	go func(ctx context.Context) {
		for {
			select {
			case <-ctx.Done():
				fmt.Println("Timeout:", ctx.Err())
				return
			default:
				fmt.Println("Processing...")
				time.Sleep(500 * time.Millisecond)
			}
		}
	}(ctx)

	time.Sleep(3 * time.Second)
}

// Example 3: Context with deadline
func withDeadline() {
	deadline := time.Now().Add(2 * time.Second)
	ctx, cancel := context.WithDeadline(context.Background(), deadline)
	defer cancel()

	go doWork(ctx)
	time.Sleep(3 * time.Second)
}

func doWork(ctx context.Context) {
	deadline, ok := ctx.Deadline()
	if ok {
		fmt.Printf("Deadline: %s\n", deadline)
	}

	for {
		select {
		case <-ctx.Done():
			fmt.Println("Deadline exceeded:", ctx.Err())
			return
		default:
			fmt.Println("Working...")
			time.Sleep(500 * time.Millisecond)
		}
	}
}

// Example 4: Context with values
type contextKey string

const (
	userIDKey  contextKey = "userID"
	requestIDKey contextKey = "requestID"
)

func withValues() {
	ctx := context.Background()

	// Add values
	ctx = context.WithValue(ctx, userIDKey, "user123")
	ctx = context.WithValue(ctx, requestIDKey, "req456")

	// Pass to function
	processRequest(ctx)
}

func processRequest(ctx context.Context) {
	userID := ctx.Value(userIDKey).(string)
	requestID := ctx.Value(requestIDKey).(string)

	fmt.Printf("Processing request %s for user %s\n", requestID, userID)
}

// Example 5: Context in HTTP handlers
func handlerWithContext(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Add timeout for database operation
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// Pass context to database operation
	data, err := databaseQuery(ctx)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			http.Error(w, "Database timeout", http.StatusRequestTimeout)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(data)
}

func databaseQuery(ctx context.Context) ([]Data, error) {
	// Simulate database query with context
	select {
	case <-time.After(100 * time.Millisecond):
		return []Data{{ID: 1, Name: "Test"}}, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

// Example 6: Context propagation
func contextPropagation() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start first level
	level1(ctx)
}

func level1(ctx context.Context) {
	fmt.Println("Level 1")

	// Add value
	ctx = context.WithValue(ctx, "level", 1)

	// Start second level
	level2(ctx)
}

func level2(ctx context.Context) {
	fmt.Println("Level 2")

	// Add value
	ctx = context.WithValue(ctx, "level", 2)

	// Start third level
	level3(ctx)
}

func level3(ctx context.Context) {
	fmt.Println("Level 3")

	level := ctx.Value("level").(int)
	fmt.Printf("Current level: %d\n", level)
}

// Example 7: Context with goroutine group
func contextWithGroup() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var wg sync.WaitGroup

	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func(ctx context.Context, id int) {
			defer wg.Done()
			worker(ctx, id)
		}(ctx, i)
	}

	time.Sleep(2 * time.Second)
	wg.Wait()
}

func worker(ctx context.Context, id int) {
	for {
		select {
		case <-ctx.Done():
			fmt.Printf("Worker %d cancelled\n", id)
			return
		default:
			fmt.Printf("Worker %d working\n", id)
			time.Sleep(500 * time.Millisecond)
		}
	}
}

// Example 8: Background vs TODO context
func backgroundVsTODO() {
	// Background - Use when unsure which context to use
	ctx1 := context.Background()

	// TODO - Use when context should be added later (placeholder)
	ctx2 := context.TODO()

	fmt.Printf("Background: %v\n", ctx1)
	fmt.Printf("TODO: %v\n", ctx2)
}

// Example 9: Checking context state
func checkContextState(ctx context.Context) {
	// Check if cancelled
	select {
	case <-ctx.Done():
		fmt.Println("Context done:", ctx.Err())
		return
	default:
		fmt.Println("Context still active")
	}

	// Check deadline
	deadline, ok := ctx.Deadline()
	if ok {
		fmt.Printf("Deadline: %s\n", deadline)
		fmt.Printf("Time until deadline: %v\n", time.Until(deadline))
	}

	// Check values
	if val := ctx.Value("key"); val != nil {
		fmt.Printf("Value: %v\n", val)
	}
}

// Example 10: Context in service layer
type Service struct {
	db *Database
}

func (s *Service) GetUser(ctx context.Context, id string) (*User, error) {
	// Check context
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("context cancelled: %w", err)
	}

	// Call database with context
	user, err := s.db.FindUser(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("find user: %w", err)
	}

	return user, nil
}

func main() {
	fmt.Println("=== Basic Cancellation ===")
	basicCancellation()

	fmt.Println("\n=== With Timeout ===")
	withTimeout()

	fmt.Println("\n=== With Deadline ===")
	withDeadline()

	fmt.Println("\n=== With Values ===")
	withValues()

	fmt.Println("\n=== Context Propagation ===")
	contextPropagation()

	fmt.Println("\n=== Context with Group ===")
	contextWithGroup()
}
