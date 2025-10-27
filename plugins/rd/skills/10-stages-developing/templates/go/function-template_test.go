package module

import (
	"strings"
	"testing"
)

func TestFunctionNameSmoke(t *testing.T) {
	result, err := FunctionName("test", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Key1 == "" || result.Key2 == 0 {
		t.Error("expected non-zero result")
	}
}

func TestFunctionNameValidInput(t *testing.T) {
	result, err := FunctionName("hello", 42)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Key1 != "processed_hello" {
		t.Errorf("expected Key1 to be 'processed_hello', got '%s'", result.Key1)
	}

	if result.Key2 != 84 {
		t.Errorf("expected Key2 to be 84, got %d", result.Key2)
	}
}

func TestFunctionNameEmptyString(t *testing.T) {
	_, err := FunctionName("", 10)

	if err == nil {
		t.Error("expected error for empty string")
	}

	if !strings.Contains(err.Error(), "empty") {
		t.Errorf("expected error to mention 'empty', got: %s", err.Error())
	}
}

func TestFunctionNameNegativeNumber(t *testing.T) {
	_, err := FunctionName("test", -1)

	if err == nil {
		t.Error("expected error for negative number")
	}

	if !strings.Contains(err.Error(), "non-negative") {
		t.Errorf("expected error to mention 'non-negative', got: %s", err.Error())
	}
}

func TestFunctionNameZero(t *testing.T) {
	result, err := FunctionName("test", 0)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Key2 != 0 {
		t.Errorf("expected Key2 to be 0, got %d", result.Key2)
	}
}

func TestFunctionNameLargeNumber(t *testing.T) {
	result, err := FunctionName("test", 1000000)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Key2 != 2000000 {
		t.Errorf("expected Key2 to be 2000000, got %d", result.Key2)
	}
}

// Table-driven tests
func TestFunctionNameParametrized(t *testing.T) {
	tests := []struct {
		name         string
		inputStr     string
		inputNum     int
		expectedKey1 string
		expectedKey2 int
		expectError  bool
	}{
		{"valid case 1", "hello", 10, "processed_hello", 20, false},
		{"valid case 2", "world", 5, "processed_world", 10, false},
		{"zero value", "test", 0, "processed_test", 0, false},
		{"empty string", "", 10, "", 0, true},
		{"negative number", "test", -1, "", 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FunctionName(tt.inputStr, tt.inputNum)

			if tt.expectError {
				if err == nil {
					t.Error("expected error but got none")
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}

				if result.Key1 != tt.expectedKey1 {
					t.Errorf("expected Key1='%s', got '%s'", tt.expectedKey1, result.Key1)
				}

				if result.Key2 != tt.expectedKey2 {
					t.Errorf("expected Key2=%d, got %d", tt.expectedKey2, result.Key2)
				}
			}
		})
	}
}
