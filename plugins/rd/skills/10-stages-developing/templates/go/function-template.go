// Package module provides [brief description of what this module does]
package module

import (
	"errors"
	"fmt"
)

// Result represents the result of FunctionName
type Result struct {
	Key1 string
	Key2 int
}

// FunctionName [brief description of what the function does]
//
// Parameters:
//   - param1: [Description of param1]
//   - param2: [Description of param2]
//
// Returns:
//   - Result struct containing processed results
//   - error if validation fails
//
// Example:
//   result, err := FunctionName("example", 42)
//   // Returns: Result{Key1: "processed_example", Key2: 84}, nil
func FunctionName(param1 string, param2 int) (Result, error) {
	// Input validation
	if param1 == "" {
		return Result{}, errors.New("param1 cannot be empty")
	}

	if param2 < 0 {
		return Result{}, errors.New("param2 must be non-negative")
	}

	// Implementation
	result := Result{
		Key1: fmt.Sprintf("processed_%s", param1),
		Key2: param2 * 2,
	}

	return result, nil
}
