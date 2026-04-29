#!/bin/bash
# emit-pi.sh — Emit Pi settings.json for pi-hooks extension from abstract hook config
#
# Usage:
#   emit-pi.sh <abstract-hooks.json> [--output <path>] [--dry-run]
#
# Reads abstract hook config and outputs .pi/settings.json in pi-hooks format.
# Pi uses lowercase tool names, supports 'if' conditions, PascalCase + snake_case events.
#
# Dependency: @hsingjui/pi-hooks extension must be installed:
#   pi install npm:@hsingjui/pi-hooks
#
# Requires: jq, bash 4+

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../scripts/emit-common.sh"

PLATFORM="pi"
OUTPUT_PATH=".pi/settings.json"
DRY_RUN=false

usage() {
  echo "Usage: $0 <abstract-hooks.json> [--output <path>] [--dry-run]"
  echo ""
  echo "Emit Pi settings.json for pi-hooks extension from abstract hook config."
  echo ""
  echo "Options:"
  echo "  --output <path>  Output file path (default: .pi/settings.json)"
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

# Check for prompt hooks (NOT supported on Pi)
if [[ "$(has_prompt_hooks "$INPUT_FILE")" == "true" ]]; then
  warn_prompt_hooks "$PLATFORM"
fi

# Supported events on Pi (via pi-hooks)
SUPPORTED_EVENTS="SessionStart SessionEnd PreCompact PostCompact PreToolUse PostToolUse PostToolUseFailure UserPromptSubmit Stop"

# Emit Pi settings.json
# pi-hooks format: { "hooks": { "SessionStart": [...], "PreToolUse": [...], ... } }
# - PascalCase event names (primary), snake_case also accepted
# - Lowercase tool names in matchers
# - 'if' conditions supported for tool events
# - No prompt hooks
OUTPUT=$(jq '
  .hooks | to_entries | map(
    .key as $event |
    .value as $groups |
    # All Pi-supported events use PascalCase (pi-hooks accepts both)
    {
      key: $event,
      value: [$groups[] |
        # Filter out prompt hooks — pi-hooks only supports command type
        .hooks = [.hooks[] | select(.type == "command")] |
        select(.hooks | length > 0) |
        {
          matcher: (.matcher // null),
          hooks: [.hooks[] | {
            type: "command",
            command: (.command | gsub("\\$PROJECT_DIR"; "$CWD") | gsub("\\$PLUGIN_ROOT"; ".")),
            timeout: (.timeout // null),
            if: (.if // null)
          } | with_entries(select(.value != null))]
        } | with_entries(select(.value != null))
      ]
    }
  ) | from_entries | { hooks: . }
' "$INPUT_FILE")

# Report unsupported events
for event in $(jq -r '.hooks | keys[]' "$INPUT_FILE"); do
  case "$event" in
    SessionStart|SessionEnd|PreCompact|PostCompact|PreToolUse|PostToolUse|PostToolUseFailure|UserPromptSubmit|Stop) ;;
    *) warn_event "$event" "$PLATFORM" ;;
  esac
done

if [[ "$DRY_RUN" == "true" ]]; then
  echo "$OUTPUT" | jq .
  echo "" >&2
  echo "NOTE: Requires @hsingjui/pi-hooks extension. Install with:" >&2
  echo "  pi install npm:@hsingjui/pi-hooks" >&2
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

echo "Pi hooks emitted to $OUTPUT_PATH" >&2
echo "NOTE: Requires @hsingjui/pi-hooks extension. Install with:" >&2
echo "  pi install npm:@hsingjui/pi-hooks" >&2
echo "Then run /reload in Pi to activate hooks." >&2
