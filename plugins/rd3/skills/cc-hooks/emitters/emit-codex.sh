#!/bin/bash
# emit-codex.sh — Emit Codex hooks.json from abstract hook config
#
# Usage:
#   emit-codex.sh <abstract-hooks.json> [--output <path>] [--dry-run]
#
# Reads abstract hook config and outputs Codex hooks.json format.
# Codex uses lowercase event names (pre_tool_use, post_tool_use, session_start)
# and lowercase tool names.
#
# Requires: jq, bash 4+

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../scripts/emit-common.sh"

PLATFORM="codex"
OUTPUT_PATH="codex.json"
DRY_RUN=false

usage() {
  echo "Usage: $0 <abstract-hooks.json> [--output <path>] [--dry-run]"
  echo ""
  echo "Emit Codex hooks.json from abstract hook config."
  echo ""
  echo "Options:"
  echo "  --output <path>  Output file path (default: codex.json)"
  echo "  --dry-run        Print output to stdout instead of writing file"
  echo "  --help           Show this help"
  exit "${1:-0}"
}

# Codex event name mapping (abstract → codex)
codex_event_name() {
  case "$1" in
    SessionStart) echo "session_start" ;;
    PreToolUse) echo "pre_tool_use" ;;
    PostToolUse) echo "post_tool_use" ;;
    *) echo "null" ;;
  esac
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

# Check for prompt hooks (NOT supported on Codex)
if [[ "$(has_prompt_hooks "$INPUT_FILE")" == "true" ]]; then
  warn_prompt_hooks "$PLATFORM"
fi

# Supported events on Codex
SUPPORTED_EVENTS="SessionStart PreToolUse PostToolUse"

# Emit Codex hooks.json
# Codex format: { "hooks": { "pre_tool_use": [...], "post_tool_use": [...], ... } }
OUTPUT=$(jq '
  .hooks | to_entries | map(
    .key as $event |
    .value as $groups |
    # Map event names
    (if $event == "SessionStart" then "session_start"
     elif $event == "PreToolUse" then "pre_tool_use"
     elif $event == "PostToolUse" then "post_tool_use"
     else null end) as $codex_event |
    select($codex_event != null) |
    {
      key: $codex_event,
      value: [$groups[] |
        # Filter out prompt hooks
        .hooks = [.hooks[] | select(.type == "command")] |
        select(.hooks | length > 0) |
        {
          matcher: (.matcher // "*"),
          hooks: [.hooks[] | {
            type: "command",
            command: (.command | gsub("\\$PROJECT_DIR"; "$CODEX_PROJECT_DIR") | gsub("\\$PLUGIN_ROOT"; "$CODEX_PLUGIN_ROOT")),
            timeout: (.timeout // null)
          } | with_entries(select(.value != null))]
        }
      ]
    }
  ) | from_entries | { hooks: . }
' "$INPUT_FILE")

# Report unsupported events
for event in $(jq -r '.hooks | keys[]' "$INPUT_FILE"); do
  codex_name=$(codex_event_name "$event")
  if [[ "$codex_name" == "null" ]]; then
    warn_event "$event" "$PLATFORM"
  fi
done

if [[ "$DRY_RUN" == "true" ]]; then
  echo "$OUTPUT" | jq .
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

echo "Codex hooks emitted to $OUTPUT_PATH" >&2
