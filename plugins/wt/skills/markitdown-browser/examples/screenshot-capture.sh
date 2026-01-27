#!/bin/bash
# Example: Capture full-page screenshot
# Demonstrates browser automation for screenshots

set -e

URL="${1:-https://example.com}"
OUTPUT="${2:-screenshot.png}"

echo "Capturing screenshot of $URL..."

# Navigate and wait for page load
agent-browser open "$URL"
agent-browser wait --load networkidle

# Capture full-page screenshot
agent-browser screenshot "$OUTPUT" --full

# Clean up
agent-browser close

echo "Screenshot saved: $OUTPUT"
ls -lh "$OUTPUT"
