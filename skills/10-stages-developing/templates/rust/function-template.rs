// [Brief description of what this module does]

use std::collections::HashMap;

/// Result of function_name operation
#[derive(Debug, PartialEq)]
pub struct FunctionResult {
    pub key1: String,
    pub key2: i32,
}

/// [Brief description of what the function does]
///
/// # Arguments
///
/// * `param1` - [Description of param1]
/// * `param2` - [Description of param2]
///
/// # Returns
///
/// * `Ok(FunctionResult)` - Processed results
/// * `Err(String)` - Error message if validation fails
///
/// # Examples
///
/// ```
/// let result = function_name("example", 42)?;
/// assert_eq!(result.key1, "processed_example");
/// assert_eq!(result.key2, 84);
/// ```
pub fn function_name(param1: &str, param2: i32) -> Result<FunctionResult, String> {
    // Input validation
    if param1.is_empty() {
        return Err("param1 cannot be empty".to_string());
    }

    if param2 < 0 {
        return Err("param2 must be non-negative".to_string());
    }

    // Implementation
    let result = FunctionResult {
        key1: format!("processed_{}", param1),
        key2: param2 * 2,
    };

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_function_name_smoke() {
        let result = function_name("test", 10);
        assert!(result.is_ok());
        let result = result.unwrap();
        assert!(!result.key1.is_empty());
        assert_ne!(result.key2, 0);
    }

    #[test]
    fn test_function_name_valid_input() {
        let result = function_name("hello", 42).unwrap();

        assert_eq!(result.key1, "processed_hello");
        assert_eq!(result.key2, 84);
    }

    #[test]
    fn test_function_name_empty_string() {
        let result = function_name("", 10);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("empty"));
    }

    #[test]
    fn test_function_name_negative_number() {
        let result = function_name("test", -1);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("non-negative"));
    }

    #[test]
    fn test_function_name_zero() {
        let result = function_name("test", 0).unwrap();
        assert_eq!(result.key2, 0);
    }

    #[test]
    fn test_function_name_large_number() {
        let result = function_name("test", 1000000).unwrap();
        assert_eq!(result.key2, 2000000);
    }

    // Parametrized tests using test vectors
    #[test]
    fn test_function_name_parametrized() {
        let test_cases = vec![
            ("hello", 10, "processed_hello", 20, false),
            ("world", 5, "processed_world", 10, false),
            ("test", 0, "processed_test", 0, false),
            ("", 10, "", 0, true),
            ("test", -1, "", 0, true),
        ];

        for (input_str, input_num, expected_key1, expected_key2, expect_error) in test_cases {
            let result = function_name(input_str, input_num);

            if expect_error {
                assert!(result.is_err(), "Expected error for input: {}, {}", input_str, input_num);
            } else {
                assert!(result.is_ok(), "Expected success for input: {}, {}", input_str, input_num);
                let result = result.unwrap();
                assert_eq!(result.key1, expected_key1);
                assert_eq!(result.key2, expected_key2);
            }
        }
    }
}
