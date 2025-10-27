# Multi-Language Examples

Complete workflow examples in multiple programming languages.

## Table of Contents

- [Python Example](#python-example)
- [JavaScript Example](#javascript-example)
- [Java Example](#java-example)
- [Go Example](#go-example)
- [Rust Example](#rust-example)

---

## Python Example

### Stage 1: Specification

```
Function: validate_email
Language: Python
Module: validators

Inputs:
  - email: str - Email address to validate

Outputs:
  - tuple[bool, str] - (is_valid, reason)

Purpose:
  Validate email format with clear error messages

Edge Cases:
  - Empty string
  - Missing @ symbol
  - Missing domain
  - Multiple @ symbols

Test File: tests/test_validators.py
Source File: src/validators.py
```

### Stage 2: Smoke Test

```python
# tests/test_validators.py
"""Tests for email validation."""

def test_validate_email_smoke():
    """Smoke test for email validation."""
    from validators import validate_email

    is_valid, reason = validate_email("user@example.com")
    assert is_valid is not None
    assert reason is not None
```

### Stage 3 & 7: Syntax Check

```bash
python -m py_compile tests/test_validators.py
pylint tests/test_validators.py --disable=all --enable=E,F
```

### Stage 4: Run Smoke Test

```bash
pytest tests/test_validators.py::test_validate_email_smoke -v
# Expected: FAILS (function doesn't exist)
```

### Stage 5: Implementation

```python
# src/validators.py
"""Email validation utilities."""

def validate_email(email: str) -> tuple[bool, str]:
    """
    Validate an email address format.

    Args:
        email: Email address to validate

    Returns:
        Tuple of (is_valid, reason) where:
        - is_valid: True if email is valid
        - reason: Error message if invalid, empty string if valid

    Examples:
        >>> validate_email("user@example.com")
        (True, "")
        >>> validate_email("invalid")
        (False, "Missing @ symbol")
    """
    if not email:
        return False, "Email cannot be empty"

    if "@" not in email:
        return False, "Missing @ symbol"

    if email.count("@") > 1:
        return False, "Multiple @ symbols"

    local, domain = email.split("@")

    if not local:
        return False, "Missing local part"

    if not domain:
        return False, "Missing domain"

    if "." not in domain:
        return False, "Missing domain extension"

    return True, ""
```

### Stage 6: Expanded Tests

```python
# tests/test_validators.py
"""Comprehensive tests for email validation."""
import pytest
from validators import validate_email


def test_validate_email_valid():
    """Test with valid email addresses."""
    valid_emails = [
        "user@example.com",
        "test.user@example.com",
        "user+tag@example.co.uk",
    ]
    for email in valid_emails:
        is_valid, reason = validate_email(email)
        assert is_valid, f"Expected {email} to be valid"
        assert reason == ""


def test_validate_email_empty():
    """Test with empty email."""
    is_valid, reason = validate_email("")
    assert not is_valid
    assert "empty" in reason.lower()


def test_validate_email_no_at():
    """Test email without @ symbol."""
    is_valid, reason = validate_email("invalidemail")
    assert not is_valid
    assert "@" in reason


def test_validate_email_multiple_at():
    """Test email with multiple @ symbols."""
    is_valid, reason = validate_email("user@@example.com")
    assert not is_valid
    assert "multiple" in reason.lower()


def test_validate_email_no_domain():
    """Test email without domain."""
    is_valid, reason = validate_email("user@")
    assert not is_valid
    assert "domain" in reason.lower()


def test_validate_email_no_extension():
    """Test email without domain extension."""
    is_valid, reason = validate_email("user@example")
    assert not is_valid
    assert "extension" in reason.lower()
```

### Stage 8: Run All Tests

```bash
pytest tests/test_validators.py -v
pytest tests/test_validators.py --cov=validators --cov-report=term-missing
```

---

## JavaScript Example

### Stage 1: Specification

```
Function: validateEmail
Language: JavaScript
Module: validators

Inputs:
  - email: string - Email address to validate

Outputs:
  - object: { isValid: boolean, reason: string }

Purpose:
  Validate email format with clear error messages

Test File: tests/validators.test.js
Source File: src/validators.js
```

### Stage 2: Smoke Test

```javascript
// tests/validators.test.js
const { validateEmail } = require('../src/validators');

test('validateEmail smoke test', () => {
    const result = validateEmail('user@example.com');
    expect(result).toBeDefined();
    expect(result.isValid).toBeDefined();
    expect(result.reason).toBeDefined();
});
```

### Stage 3 & 7: Syntax Check

```bash
npx eslint tests/validators.test.js
npx eslint src/validators.js
```

### Stage 4: Run Smoke Test

```bash
npm test -- tests/validators.test.js
# Expected: FAILS (function doesn't exist)
```

### Stage 5: Implementation

```javascript
// src/validators.js
/**
 * Validate an email address format.
 *
 * @param {string} email - Email address to validate
 * @returns {{isValid: boolean, reason: string}} Validation result
 *
 * @example
 * validateEmail('user@example.com')
 * // Returns: { isValid: true, reason: '' }
 *
 * validateEmail('invalid')
 * // Returns: { isValid: false, reason: 'Missing @ symbol' }
 */
function validateEmail(email) {
    if (!email) {
        return { isValid: false, reason: 'Email cannot be empty' };
    }

    if (!email.includes('@')) {
        return { isValid: false, reason: 'Missing @ symbol' };
    }

    const atCount = (email.match(/@/g) || []).length;
    if (atCount > 1) {
        return { isValid: false, reason: 'Multiple @ symbols' };
    }

    const [local, domain] = email.split('@');

    if (!local) {
        return { isValid: false, reason: 'Missing local part' };
    }

    if (!domain) {
        return { isValid: false, reason: 'Missing domain' };
    }

    if (!domain.includes('.')) {
        return { isValid: false, reason: 'Missing domain extension' };
    }

    return { isValid: true, reason: '' };
}

module.exports = { validateEmail };
```

### Stage 6: Expanded Tests

```javascript
// tests/validators.test.js
const { validateEmail } = require('../src/validators');

describe('validateEmail', () => {
    test('accepts valid email addresses', () => {
        const validEmails = [
            'user@example.com',
            'test.user@example.com',
            'user+tag@example.co.uk',
        ];

        validEmails.forEach(email => {
            const result = validateEmail(email);
            expect(result.isValid).toBe(true);
            expect(result.reason).toBe('');
        });
    });

    test('rejects empty email', () => {
        const result = validateEmail('');
        expect(result.isValid).toBe(false);
        expect(result.reason.toLowerCase()).toContain('empty');
    });

    test('rejects email without @ symbol', () => {
        const result = validateEmail('invalidemail');
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('@');
    });

    test('rejects email with multiple @ symbols', () => {
        const result = validateEmail('user@@example.com');
        expect(result.isValid).toBe(false);
        expect(result.reason.toLowerCase()).toContain('multiple');
    });

    test('rejects email without domain', () => {
        const result = validateEmail('user@');
        expect(result.isValid).toBe(false);
        expect(result.reason.toLowerCase()).toContain('domain');
    });

    test('rejects email without domain extension', () => {
        const result = validateEmail('user@example');
        expect(result.isValid).toBe(false);
        expect(result.reason.toLowerCase()).toContain('extension');
    });
});
```

### Stage 8: Run All Tests

```bash
npm test -- tests/validators.test.js
jest tests/validators.test.js --coverage
```

---

## Java Example

### Stage 1: Specification

```
Function: validateEmail
Language: Java
Class: EmailValidator

Inputs:
  - email: String - Email address to validate

Outputs:
  - ValidationResult (class with boolean isValid, String reason)

Purpose:
  Validate email format with clear error messages

Test File: src/test/java/EmailValidatorTest.java
Source File: src/main/java/EmailValidator.java
```

### Stage 2: Smoke Test

```java
// src/test/java/EmailValidatorTest.java
import org.junit.Test;
import static org.junit.Assert.*;

public class EmailValidatorTest {

    @Test
    public void testValidateEmailSmoke() {
        EmailValidator validator = new EmailValidator();
        ValidationResult result = validator.validateEmail("user@example.com");
        assertNotNull(result);
        assertNotNull(result.isValid());
        assertNotNull(result.getReason());
    }
}
```

### Stage 3 & 7: Syntax Check

```bash
javac -Xlint src/test/java/EmailValidatorTest.java
javac -Xlint src/main/java/EmailValidator.java
```

### Stage 5: Implementation

```java
// src/main/java/ValidationResult.java
/**
 * Result of email validation.
 */
public class ValidationResult {
    private final boolean isValid;
    private final String reason;

    public ValidationResult(boolean isValid, String reason) {
        this.isValid = isValid;
        this.reason = reason;
    }

    public boolean isValid() {
        return isValid;
    }

    public String getReason() {
        return reason;
    }
}

// src/main/java/EmailValidator.java
/**
 * Email validation utilities.
 */
public class EmailValidator {

    /**
     * Validate an email address format.
     *
     * @param email Email address to validate
     * @return ValidationResult with isValid flag and reason
     *
     * @example
     * ValidationResult result = validator.validateEmail("user@example.com");
     * // result.isValid() returns true
     * // result.getReason() returns ""
     */
    public ValidationResult validateEmail(String email) {
        if (email == null || email.isEmpty()) {
            return new ValidationResult(false, "Email cannot be empty");
        }

        if (!email.contains("@")) {
            return new ValidationResult(false, "Missing @ symbol");
        }

        long atCount = email.chars().filter(ch -> ch == '@').count();
        if (atCount > 1) {
            return new ValidationResult(false, "Multiple @ symbols");
        }

        String[] parts = email.split("@");
        String local = parts[0];
        String domain = parts.length > 1 ? parts[1] : "";

        if (local.isEmpty()) {
            return new ValidationResult(false, "Missing local part");
        }

        if (domain.isEmpty()) {
            return new ValidationResult(false, "Missing domain");
        }

        if (!domain.contains(".")) {
            return new ValidationResult(false, "Missing domain extension");
        }

        return new ValidationResult(true, "");
    }
}
```

### Stage 6: Expanded Tests

```java
// src/test/java/EmailValidatorTest.java
import org.junit.Test;
import org.junit.Before;
import static org.junit.Assert.*;

public class EmailValidatorTest {

    private EmailValidator validator;

    @Before
    public void setUp() {
        validator = new EmailValidator();
    }

    @Test
    public void testValidEmailAddresses() {
        String[] validEmails = {
            "user@example.com",
            "test.user@example.com",
            "user+tag@example.co.uk"
        };

        for (String email : validEmails) {
            ValidationResult result = validator.validateEmail(email);
            assertTrue("Expected " + email + " to be valid", result.isValid());
            assertEquals("", result.getReason());
        }
    }

    @Test
    public void testEmptyEmail() {
        ValidationResult result = validator.validateEmail("");
        assertFalse(result.isValid());
        assertTrue(result.getReason().toLowerCase().contains("empty"));
    }

    @Test
    public void testEmailWithoutAtSymbol() {
        ValidationResult result = validator.validateEmail("invalidemail");
        assertFalse(result.isValid());
        assertTrue(result.getReason().contains("@"));
    }

    @Test
    public void testEmailWithMultipleAtSymbols() {
        ValidationResult result = validator.validateEmail("user@@example.com");
        assertFalse(result.isValid());
        assertTrue(result.getReason().toLowerCase().contains("multiple"));
    }

    @Test
    public void testEmailWithoutDomain() {
        ValidationResult result = validator.validateEmail("user@");
        assertFalse(result.isValid());
        assertTrue(result.getReason().toLowerCase().contains("domain"));
    }

    @Test
    public void testEmailWithoutExtension() {
        ValidationResult result = validator.validateEmail("user@example");
        assertFalse(result.isValid());
        assertTrue(result.getReason().toLowerCase().contains("extension"));
    }
}
```

### Stage 8: Run All Tests

```bash
mvn test -Dtest=EmailValidatorTest
gradle test --tests EmailValidatorTest
```

---

## Go Example

### Stage 1: Specification

```
Function: ValidateEmail
Language: Go
Package: validators

Inputs:
  - email: string - Email address to validate

Outputs:
  - ValidationResult (struct with IsValid bool, Reason string)

Purpose:
  Validate email format with clear error messages

Test File: validators_test.go
Source File: validators.go
```

### Stage 2: Smoke Test

```go
// validators_test.go
package validators

import "testing"

func TestValidateEmailSmoke(t *testing.T) {
    result := ValidateEmail("user@example.com")
    if result.IsValid == false && result.Reason == "" {
        t.Error("Expected non-nil result")
    }
}
```

### Stage 5: Implementation

```go
// validators.go
package validators

import "strings"

// ValidationResult represents the result of email validation
type ValidationResult struct {
    IsValid bool
    Reason  string
}

// ValidateEmail validates an email address format
//
// Parameters:
//   - email: Email address to validate
//
// Returns:
//   - ValidationResult with IsValid flag and Reason
//
// Example:
//   result := ValidateEmail("user@example.com")
//   // result.IsValid == true
//   // result.Reason == ""
func ValidateEmail(email string) ValidationResult {
    if email == "" {
        return ValidationResult{false, "Email cannot be empty"}
    }

    if !strings.Contains(email, "@") {
        return ValidationResult{false, "Missing @ symbol"}
    }

    if strings.Count(email, "@") > 1 {
        return ValidationResult{false, "Multiple @ symbols"}
    }

    parts := strings.Split(email, "@")
    local := parts[0]
    domain := parts[1]

    if local == "" {
        return ValidationResult{false, "Missing local part"}
    }

    if domain == "" {
        return ValidationResult{false, "Missing domain"}
    }

    if !strings.Contains(domain, ".") {
        return ValidationResult{false, "Missing domain extension"}
    }

    return ValidationResult{true, ""}
}
```

### Stage 6: Expanded Tests

```go
// validators_test.go
package validators

import (
    "strings"
    "testing"
)

func TestValidateEmailValid(t *testing.T) {
    validEmails := []string{
        "user@example.com",
        "test.user@example.com",
        "user+tag@example.co.uk",
    }

    for _, email := range validEmails {
        result := ValidateEmail(email)
        if !result.IsValid {
            t.Errorf("Expected %s to be valid", email)
        }
        if result.Reason != "" {
            t.Errorf("Expected empty reason for valid email")
        }
    }
}

func TestValidateEmailEmpty(t *testing.T) {
    result := ValidateEmail("")
    if result.IsValid {
        t.Error("Expected empty email to be invalid")
    }
    if !strings.Contains(strings.ToLower(result.Reason), "empty") {
        t.Errorf("Expected reason to mention empty, got: %s", result.Reason)
    }
}

func TestValidateEmailNoAt(t *testing.T) {
    result := ValidateEmail("invalidemail")
    if result.IsValid {
        t.Error("Expected email without @ to be invalid")
    }
    if !strings.Contains(result.Reason, "@") {
        t.Errorf("Expected reason to mention @, got: %s", result.Reason)
    }
}

func TestValidateEmailMultipleAt(t *testing.T) {
    result := ValidateEmail("user@@example.com")
    if result.IsValid {
        t.Error("Expected email with multiple @ to be invalid")
    }
    if !strings.Contains(strings.ToLower(result.Reason), "multiple") {
        t.Errorf("Expected reason to mention multiple, got: %s", result.Reason)
    }
}

func TestValidateEmailNoDomain(t *testing.T) {
    result := ValidateEmail("user@")
    if result.IsValid {
        t.Error("Expected email without domain to be invalid")
    }
    if !strings.Contains(strings.ToLower(result.Reason), "domain") {
        t.Errorf("Expected reason to mention domain, got: %s", result.Reason)
    }
}

func TestValidateEmailNoExtension(t *testing.T) {
    result := ValidateEmail("user@example")
    if result.IsValid {
        t.Error("Expected email without extension to be invalid")
    }
    if !strings.Contains(strings.ToLower(result.Reason), "extension") {
        t.Errorf("Expected reason to mention extension, got: %s", result.Reason)
    }
}
```

### Stage 8: Run All Tests

```bash
go test -v
go test -cover
go test -coverprofile=coverage.out
```

---

## Rust Example

### Stage 1: Specification

```
Function: validate_email
Language: Rust
Module: validators

Inputs:
  - email: &str - Email address to validate

Outputs:
  - ValidationResult (struct with is_valid: bool, reason: String)

Purpose:
  Validate email format with clear error messages

Test File: src/validators.rs (with #[cfg(test)] mod)
Source File: src/validators.rs
```

### Stage 2: Smoke Test

```rust
// src/validators.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_email_smoke() {
        let result = validate_email("user@example.com");
        assert!(result.is_valid || !result.is_valid); // Just checks it runs
        assert!(!result.reason.is_empty() || result.reason.is_empty());
    }
}
```

### Stage 5: Implementation

```rust
// src/validators.rs

/// Result of email validation
#[derive(Debug, PartialEq)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub reason: String,
}

/// Validate an email address format
///
/// # Arguments
///
/// * `email` - Email address to validate
///
/// # Returns
///
/// ValidationResult with is_valid flag and reason
///
/// # Examples
///
/// ```
/// let result = validate_email("user@example.com");
/// assert!(result.is_valid);
/// assert_eq!(result.reason, "");
/// ```
pub fn validate_email(email: &str) -> ValidationResult {
    if email.is_empty() {
        return ValidationResult {
            is_valid: false,
            reason: "Email cannot be empty".to_string(),
        };
    }

    if !email.contains('@') {
        return ValidationResult {
            is_valid: false,
            reason: "Missing @ symbol".to_string(),
        };
    }

    let at_count = email.matches('@').count();
    if at_count > 1 {
        return ValidationResult {
            is_valid: false,
            reason: "Multiple @ symbols".to_string(),
        };
    }

    let parts: Vec<&str> = email.split('@').collect();
    let local = parts[0];
    let domain = parts[1];

    if local.is_empty() {
        return ValidationResult {
            is_valid: false,
            reason: "Missing local part".to_string(),
        };
    }

    if domain.is_empty() {
        return ValidationResult {
            is_valid: false,
            reason: "Missing domain".to_string(),
        };
    }

    if !domain.contains('.') {
        return ValidationResult {
            is_valid: false,
            reason: "Missing domain extension".to_string(),
        };
    }

    ValidationResult {
        is_valid: true,
        reason: String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_email_addresses() {
        let valid_emails = vec![
            "user@example.com",
            "test.user@example.com",
            "user+tag@example.co.uk",
        ];

        for email in valid_emails {
            let result = validate_email(email);
            assert!(result.is_valid, "Expected {} to be valid", email);
            assert_eq!(result.reason, "");
        }
    }

    #[test]
    fn test_empty_email() {
        let result = validate_email("");
        assert!(!result.is_valid);
        assert!(result.reason.to_lowercase().contains("empty"));
    }

    #[test]
    fn test_email_without_at() {
        let result = validate_email("invalidemail");
        assert!(!result.is_valid);
        assert!(result.reason.contains("@"));
    }

    #[test]
    fn test_email_with_multiple_at() {
        let result = validate_email("user@@example.com");
        assert!(!result.is_valid);
        assert!(result.reason.to_lowercase().contains("multiple"));
    }

    #[test]
    fn test_email_without_domain() {
        let result = validate_email("user@");
        assert!(!result.is_valid);
        assert!(result.reason.to_lowercase().contains("domain"));
    }

    #[test]
    fn test_email_without_extension() {
        let result = validate_email("user@example");
        assert!(!result.is_valid);
        assert!(result.reason.to_lowercase().contains("extension"));
    }
}
```

### Stage 8: Run All Tests

```bash
cargo test
cargo test --verbose
cargo test -- --nocapture
```

---

## Common Patterns Across Languages

### Input Validation Pattern

All languages follow the same validation logic:
1. Check for empty/null input
2. Check for @ symbol presence
3. Check for multiple @ symbols
4. Split on @ and validate parts
5. Check for domain extension

### Test Organization Pattern

All languages organize tests similarly:
1. Valid input tests (multiple cases)
2. Empty/null input tests
3. Missing @ symbol tests
4. Multiple @ symbol tests
5. Missing domain tests
6. Missing extension tests

### Documentation Pattern

All languages include:
1. Function/method purpose
2. Parameter descriptions
3. Return value descriptions
4. Usage examples
5. Edge case handling

---

## Key Takeaways

✅ **Same Workflow**: All languages follow identical 10-stage workflow
✅ **Same Logic**: Validation logic is consistent across languages
✅ **Same Testing**: Test organization and coverage patterns are universal
✅ **Tool-Agnostic**: Syntax checking and test running use language-specific tools
✅ **Quality Standards**: Documentation and error handling expectations are consistent
