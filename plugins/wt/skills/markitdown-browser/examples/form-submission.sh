#!/bin/bash
# Example: Form submission with agent-browser
# Demonstrates navigation, form filling, and verification

set -e  # Exit on error

# Navigate to form page
agent-browser open https://example.com/form
agent-browser wait --load networkidle

# Get interactive elements
agent-browser snapshot -i
# Output shows refs like: textbox "Email" [ref=e1], textbox "Password" [ref=e2], button "Submit" [ref=e3]

# Fill form fields (use actual refs from snapshot)
agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password123"

# Submit form
agent-browser click @e3
agent-browser wait --load networkidle

# Verify submission result
agent-browser snapshot -i
agent-browser screenshot result.png

# Clean up
agent-browser close
