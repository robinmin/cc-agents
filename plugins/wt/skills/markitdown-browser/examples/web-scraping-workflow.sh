#!/bin/bash
# Example: Combined web scraping to markdown workflow
# Demonstrates agent-browser + markitdown integration

set -e

URL="${1:-https://example.com/data}"
OUTPUT="${2:-extracted.md}"

echo "Web scraping workflow for $URL..."

# Step 1: Navigate with browser (for JS-rendered content or interactions)
agent-browser open "$URL"
agent-browser wait --load networkidle
agent-browser snapshot -i

# Step 2: Interact if needed (e.g., click "Show All", apply filters)
# agent-browser click @e1  # Uncomment and use actual ref
# agent-browser wait --load networkidle

# Step 3: Save page source and convert
# For JS-rendered pages, save via browser methods
# For static pages, use curl:
curl -s "$URL" | markitdown > "$OUTPUT"

# Clean up
agent-browser close

echo "Extraction complete: $OUTPUT"
echo "Word count: $(wc -w < "$OUTPUT")"
