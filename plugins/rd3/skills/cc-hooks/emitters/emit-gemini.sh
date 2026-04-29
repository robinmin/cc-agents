#!/bin/bash
# emit-gemini.sh — Emit Gemini CLI settings.json hooks from abstract hook config
#
# Usage:
#   emit-gemini.sh <abstract-hooks.json> [--output <path>] [--dry-run]
#
# Reads abstract hook config and outputs .gemini/settings.json hooks section.
# Gemini uses synchronous middleware hooks with stdin/stdout JSON protocol.
# Event mapping: PreToolUse → BeforeTool, Stop → AfterAgent, PostToolUse → AfterTool
#
# Requires: jq, bash 4+

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../scripts/emit-common.sh"

PLATFORM="gemini"
OUTPUT_PATH=".gemini/settings.json"
DRY_RUN=false

usage() {
  echo "Usage: $0 <abstract-hooks.json> [--output <path>] [--dry-run]"
  echo ""
  echo "Emit Gemini CLI settings.json hooks from abstract hook config."
  echo ""
  echo "Options:"
  echo "  --output <path>  Output file path (default: .gemini/settings.json)"
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

# Check for prompt hooks (NOT supported on Gemini)
if [[ "$(has_prompt_hooks "$INPUT_FILE")" == "true" ]]; then
  warn_prompt_hooks "$PLATFORM"
fi

# Supported events on Gemini
# BeforeTool (PreToolUse), AfterTool (PostToolUse), AfterAgent (Stop)
# BeforeModel (not in abstract schema)

# Emit Gemini settings.json
# Gemini format: { "hooks": { "BeforeTool": [...], "AfterAgent": [...], ... } }
# Gemini uses synchronous stdin/stdout JSON communication
OUTPUT=$(jq '
  .hooks | to_entries | map(
    .key as $event |
    .value as $groups |
    # Map abstract events to Gemini events
    (if $event == "PreToolUse" then "BeforeTool"
     elif $event == "PostToolUse" then "AfterTool"
     elif $event == "Stop" then "AfterAgent"
     else null end) as $gemini_event |
    select($gemini_event != null) |
    {
      key: $gemini_event,
      value: [$groups[] |
        # Filter out prompt hooks
        .hooks = [.hooks[] | select(.type == "command")] |
        select(.hooks | length > 0) |
        {
          matcher: (.matcher // "*"),
          hooks: [.hooks[] | {
            type: "command",
            command: (.command | gsub("\\$PROJECT_DIR"; "$GEMINI_PROJECT_DIR") | gsub("\\$PLUGIN_ROOT"; ".")),
            timeout: (.timeout // null)
          } | with_entries(select(.value != null))]
        }
      ]
    }
  ) | from_entries | { hooks: . }
' "$INPUT_FILE")

# Report unsupported events
for event in $(jq -r '.hooks | keys[]' "$INPUT_FILE"); do
  case "$event" in
    PreToolUse|PostToolUse|Stop) ;;
    *) warn_event "$event" "$PLATFORM" ;;
  esac
done

if [[ "$DRY_RUN" == "true" ]]; then
  echo "$OUTPUT" | jq .
  echo "" >&2
  echo "NOTE: Gemini CLI hooks use synchronous stdin/stdout JSON protocol." >&2
  echo "  Hook commands must read JSON from stdin and write JSON to stdout." >&2
  echo "  See: https://geminicli.com/docs/hooks/reference" >&2
  exit 0
fi

# Write to file
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

echo "Gemini CLI hooks emitted to $OUTPUT_PATH" >&2
echo "NOTE: Gemini hooks use synchronous stdin/stdout JSON protocol." >&2
echo "  Hook commands must read JSON from stdin and write JSON to stdout." >&2
