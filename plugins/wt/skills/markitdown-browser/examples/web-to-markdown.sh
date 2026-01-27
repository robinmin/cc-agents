#!/bin/bash
# Example: Convert web page to clean markdown
# Demonstrates combining curl with markitdown for static content

set -e

# URL to convert
URL="${1:-https://example.com}"
OUTPUT="${2:-content.md}"

echo "Converting $URL to $OUTPUT..."

# Fetch and convert in one step (for static pages)
curl -s "$URL" | markitdown > "$OUTPUT"

echo "Conversion complete: $OUTPUT"
wc -w "$OUTPUT"
