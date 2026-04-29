#!/bin/bash
# emit-claude-code.sh — Emit Claude Code settings.json hooks from abstract hook config
#
# Usage:
#   emit-claude-code.sh <abstract-hooks.json> [--output <path>] [--dry-run]
#
# Reads abstract hook config and outputs Claude Code settings.json hooks block.
# Default output: .claude/settings.json (merged with existing settings if present).
#
# Requires: jq, bash 4+

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../scripts/emit-common.sh"

PLATFORM="claude-code"
OUTPUT_PATH=".claude/settings.json"
DRY_RUN=false

usage() {
  echo "Usage: $0 <abstract-hooks.json> [--output <path>] [--dry-run]"
  echo ""
  echo "Emit Claude Code settings.json hooks from abstract hook config."
  echo ""
  echo "Options:"
  echo "  --output <path>  Output file path (default: .claude/settings.json)"
  echo "  --dry-run        Print output to stdout instead of writing file"
  echo "  --help           Show this help"
  exit "${1:-0}"
}

# Parse arguments
INPUT_FILE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --output) OUTPUT_PATH="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --help) usage 0 ;;
    -*) echo "Unknown option: $1" >&2; usage 1 ;;
    *)
      if [[ -z "$INPUT_FILE" ]]; then
        INPUT_FILE="$1"
      else
        echo "Unexpected argument: $1" >&2; usage 1
      fi
      shift
      ;;
  esac
done

if [[ -z "$INPUT_FILE" ]]; then
  echo "ERROR: No input file specified" >&2
  usage 1
fi

require_jq

# Validate input
validation=$(validate_abstract "$INPUT_FILE")
if [[ "$validation" != "OK" ]]; then
  echo "$validation" >&2
  exit 1
fi

# Check for prompt hooks (fully supported on Claude Code)
prompt_count=$(count_hooks_by_type "$INPUT_FILE" "prompt")
if [[ "$prompt_count" -gt 0 ]]; then
  echo "INFO: $prompt_count prompt hook(s) found — fully supported on Claude Code" >&2
fi

# Emit Claude Code settings.json hooks block
# Claude Code uses the same PascalCase event names as the abstract schema.
# Replace $PROJECT_DIR and $PLUGIN_ROOT with Claude Code env vars.
OUTPUT=$(jq '
  {
    hooks: (.hooks | to_entries | map(
      .key as $event |
      .value as $groups |
      {
        key: $event,
        value: [$groups[] | {
          matcher: (.matcher // "*"),
          hooks: [.hooks[] | {
            type: .type,
            command: (.command // null),
            prompt: (.prompt // null),
            timeout: (.timeout // null)
          } | with_entries(select(.value != null))]
        }]
      }
    ) | from_entries)
  }
' "$INPUT_FILE")

# Replace env vars for Claude Code using sed (more reliable than jq gsub for $-prefixed vars)
OUTPUT=$(echo "$OUTPUT" | sed 's/\$PROJECT_DIR/$CLAUDE_PROJECT_DIR/g; s/\$PLUGIN_ROOT/$CLAUDE_PLUGIN_ROOT/g')

if [[ "$DRY_RUN" == "true" ]]; then
  echo "$OUTPUT" | jq .
  exit 0
fi

# Write to file (merge with existing settings if present)
OUTPUT_DIR=$(dirname "$OUTPUT_PATH")
mkdir -p "$OUTPUT_DIR"

if [[ -f "$OUTPUT_PATH" ]]; then
  # Merge: keep existing non-hooks fields, replace hooks
  MERGED=$(jq -s '.[0] * {hooks: .[1].hooks}' "$OUTPUT_PATH" <(echo "$OUTPUT"))
  echo "$MERGED" | jq . > "$OUTPUT_PATH"
  echo "Updated hooks in existing $OUTPUT_PATH" >&2
else
  echo "$OUTPUT" | jq . > "$OUTPUT_PATH"
  echo "Created $OUTPUT_PATH" >&2
fi

echo "Claude Code hooks emitted to $OUTPUT_PATH" >&2
