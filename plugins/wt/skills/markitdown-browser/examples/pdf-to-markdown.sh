#!/bin/bash
# Example: Convert PDF to markdown
# Demonstrates document conversion workflow

set -e

INPUT_PDF="$1"
OUTPUT_MD="${2:-${INPUT_PDF%.pdf}.md}"

if [ -z "$INPUT_PDF" ]; then
  echo "Usage: $0 <input.pdf> [output.md]"
  exit 1
fi

if [ ! -f "$INPUT_PDF" ]; then
  echo "Error: File not found: $INPUT_PDF"
  exit 1
fi

echo "Converting $INPUT_PDF to $OUTPUT_MD..."

# Convert PDF to markdown
markitdown "$INPUT_PDF" -o "$OUTPUT_MD"

echo "Conversion complete!"
echo "Word count: $(wc -w < "$OUTPUT_MD")"
