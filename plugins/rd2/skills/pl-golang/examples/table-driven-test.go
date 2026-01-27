//go:build ignore

// Table-driven test examples

package example

import (
	"errors"
	"fmt"
	"testing"
)

// Function to test
func Divide(a, b int) (int, error) {
	if b == 0 {
		return 0, errors.New("division by zero")
	}
	return a / b, nil
}

// Basic table-driven test
func TestDivide(t *testing.T) {
	tests := []struct {
		name        string
		a, b        int
		expected    int
		expectError bool
	}{
		{"positive numbers", 10, 2, 5, false},
		{"negative numbers", -10, 2, -5, false},
		{"fraction truncates", 7, 3, 2, false},
		{"divide by zero", 10, 0, 0, true},
		{"zero dividend", 0, 5, 0, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := Divide(tt.a, tt.b)

			if tt.expectError {
				if err == nil {
					t.Errorf("expected error, got nil")
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

// Test with setup
func TestWithSetup(t *testing.T) {
	// Setup
	data := []int{1, 2, 3, 4, 5}

	tests := []struct {
		name     string
		input    int
		expected bool
	}{
		{"exists", 3, true},
		{"not exists", 10, false},
		{"zero", 0, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			found := false
			for _, v := range data {
				if v == tt.input {
					found = true
					break
				}
			}

			if found != tt.expected {
				t.Errorf("found=%v, want=%v", found, tt.expected)
			}
		})
	}
}

// Parallel subtests
func TestParallel(t *testing.T) {
	tests := []int{1, 2, 3, 4, 5}

	for _, tt := range tests {
		tt := tt
		t.Run(fmt.Sprintf("value=%d", tt), func(t *testing.T) {
			t.Parallel()

			// Simulate work
			result := tt * 2
			if result != tt*2 {
				t.Errorf("expected %d, got %d", tt*2, result)
			}
		})
	}
}

// Test with helper functions
func assertEqual(t *testing.T, got, want int) {
	t.Helper()
	if got != want {
		t.Errorf("got %d, want %d", got, want)
	}
}

func assertNoError(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestWithHelpers(t *testing.T) {
	result, err := Divide(10, 2)
	assertNoError(t, err)
	assertEqual(t, result, 5)
}
