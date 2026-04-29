#!/bin/bash
# emit-common.sh — Shared utilities for multi-agent hook config emitters
# Source this file from individual emitter scripts.
#
# Usage:
#   source "$(dirname "$0")/emit-common.sh"
#
# Provides:
#   load_event_map        — Load event crosswalk from schema/event-map.yaml
#   load_tool_map         — Load tool name crosswalk from schema/tool-map.yaml
#   map_event_name        — Map abstract event name to platform-specific name
#   map_tool_name         — Map abstract tool name to platform-specific name
#   map_matcher           — Translate matcher string for target platform
#   replace_env_vars      — Replace $PROJECT_DIR/$PLUGIN_ROOT with platform vars
#   warn_unsupported      — Print warning for unsupported features
#   warn_prompt_hooks     — Print warning for unsupported prompt hooks
#   validate_abstract     — Validate abstract hook config structure
#   parse_abstract_json   — Parse abstract hook JSON and output normalized form

set -euo pipefail

# Resolve paths relative to the cc-hooks skill root
SKILL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMA_DIR="$SKILL_ROOT/schema"
EVENT_MAP="$SCHEMA_DIR/event-map.yaml"
TOOL_MAP="$SCHEMA_DIR/tool-map.yaml"

# ============================================================================
# YAML Parsing (lightweight, no yq dependency)
# ============================================================================

# Parse event-map.yaml and extract the platform-specific event name.
# Args: $1=abstract_event_name, $2=platform (claude-code|codex|opencode|pi|gemini)
# Output: platform-specific event name, or "null" if not supported
# Exit: 0 on success, 1 if event not found
map_event_name() {
  local abstract_event="$1"
  local platform="$2"

  if [[ ! -f "$EVENT_MAP" ]]; then
    echo "ERROR: Event map not found at $EVENT_MAP" >&2
    return 1
  fi

  # Extract the mapping line for this event + platform
  # YAML structure: events > EventName > platform: value
  local result
  result=$(awk -v event="$abstract_event" -v platform="$platform" '
    /^events:/ { in_events=1; next }
    /^[a-zA-Z]/ && !/^  / { in_events=0 }
    in_events && /^  [A-Z]/ {
      current_event=$1
      gsub(/:$/, "", current_event)
      next
    }
    in_events && current_event == event && $1 == platform ":" {
      value=$2
      gsub(/"/, "", value)
      print value
      exit
    }
  ' "$EVENT_MAP")

  if [[ -z "$result" ]]; then
    echo "null"
    return 1
  fi

  echo "$result"
}

# Parse tool-map.yaml and extract the platform-specific tool name.
# Args: $1=abstract_tool_name, $2=platform
# Output: platform-specific tool name, or the original name if no mapping
map_tool_name() {
  local abstract_tool="$1"
  local platform="$2"

  if [[ ! -f "$TOOL_MAP" ]]; then
    echo "$abstract_tool"
    return 0
  fi

  local result
  result=$(awk -v tool="$abstract_tool" -v platform="$platform" '
    /^tool_names:/ { in_tools=1; next }
    /^[a-zA-Z]/ && !/^  / { in_tools=0 }
    in_tools && /^  [a-z_]+:$/ {
      current_tool=$1
      gsub(/:$/, "", current_tool)
      next
    }
    in_tools && current_tool == tool && $1 == platform ":" {
      value=$2
      gsub(/"/, "", value)
      print value
      exit
    }
  ' "$TOOL_MAP")

  if [[ -z "$result" ]]; then
    echo "$abstract_tool"
  else
    echo "$result"
  fi
}

# Translate a matcher string for the target platform.
# Handles case conversion and pipe-separated tool names.
# Args: $1=matcher_string, $2=platform
# Output: translated matcher string
map_matcher() {
  local matcher="$1"
  local platform="$2"

  if [[ -z "$matcher" || "$matcher" == "*" || "$matcher" == "" ]]; then
    echo "*"
    return 0
  fi

  # Split by pipe, map each tool name, rejoin
  local IFS='|'
  read -ra parts <<< "$matcher"
  local mapped_parts=()

  for part in "${parts[@]}"; do
    part=$(echo "$part" | xargs)  # trim whitespace
    mapped_parts+=("$(map_tool_name "$part" "$platform")")
  done

  local result=""
  for i in "${!mapped_parts[@]}"; do
    if [[ $i -gt 0 ]]; then
      result+="|"
    fi
    result+="${mapped_parts[$i]}"
  done

  echo "$result"
}

# ============================================================================
# Environment Variable Replacement
# ============================================================================

# Replace abstract env var placeholders with platform-specific ones.
# Args: $1=command_string, $2=platform
# Output: command with replaced env vars
replace_env_vars() {
  local cmd="$1"
  local platform="$2"

  case "$platform" in
    claude-code)
      cmd="${cmd//\$PROJECT_DIR/\$CLAUDE_PROJECT_DIR}"
      cmd="${cmd//\$\{PROJECT_DIR\}/\$\{CLAUDE_PROJECT_DIR\}}"
      cmd="${cmd//\$PLUGIN_ROOT/\$CLAUDE_PLUGIN_ROOT}"
      cmd="${cmd//\$\{PLUGIN_ROOT\}/\$\{CLAUDE_PLUGIN_ROOT\}}"
      ;;
    codex)
      cmd="${cmd//\$PROJECT_DIR/\$CODEX_PROJECT_DIR}"
      cmd="${cmd//\$\{PROJECT_DIR\}/\$\{CODEX_PROJECT_DIR\}}"
      cmd="${cmd//\$PLUGIN_ROOT/\$CODEX_PLUGIN_ROOT}"
      cmd="${cmd//\$\{PLUGIN_ROOT\}/\$\{CODEX_PLUGIN_ROOT\}}"
      ;;
    pi)
      cmd="${cmd//\$PROJECT_DIR/\$CWD}"
      cmd="${cmd//\$\{PROJECT_DIR\}/\$\{CWD\}}"
      # Pi doesn't have PLUGIN_ROOT — use relative paths
      cmd="${cmd//\$PLUGIN_ROOT/.}"
      cmd="${cmd//\$\{PLUGIN_ROOT\}/.}"
      ;;
    opencode)
      cmd="${cmd//\$PROJECT_DIR/\$OPENCODE_PROJECT_DIR}"
      cmd="${cmd//\$\{PROJECT_DIR\}/\$\{OPENCODE_PROJECT_DIR\}}"
      cmd="${cmd//\$PLUGIN_ROOT/.}"
      cmd="${cmd//\$\{PLUGIN_ROOT\}/.}"
      ;;
    gemini)
      cmd="${cmd//\$PROJECT_DIR/\$GEMINI_PROJECT_DIR}"
      cmd="${cmd//\$\{PROJECT_DIR\}/\$\{GEMINI_PROJECT_DIR\}}"
      cmd="${cmd//\$PLUGIN_ROOT/.}"
      cmd="${cmd//\$\{PLUGIN_ROOT\}/.}"
      ;;
  esac

  echo "$cmd"
}

# ============================================================================
# Warning Helpers
# ============================================================================

# Print a warning for unsupported features.
# Args: $1=feature_name, $2=platform, $3=optional detail
warn_unsupported() {
  local feature="$1"
  local platform="$2"
  local detail="${3:-}"
  echo "WARNING: $feature is not supported on $platform. Skipped.${detail:+ $detail}" >&2
}

# Print a warning specifically for unsupported prompt hooks.
# Args: $1=platform
warn_prompt_hooks() {
  local platform="$1"
  echo "WARNING: type=\"prompt\" hooks are not supported on $platform. These hooks will be skipped." >&2
  echo "  Workaround: Use type=\"command\" hooks that invoke an LLM CLI for similar behavior." >&2
}

# Print a warning for unsupported events.
# Args: $1=event_name, $2=platform
warn_event() {
  local event="$1"
  local platform="$2"
  echo "WARNING: Event '$event' is not supported on $platform. Skipped." >&2
}

# ============================================================================
# JSON Helpers (jq-dependent)
# ============================================================================

# Check if jq is available.
require_jq() {
  if ! command -v jq &>/dev/null; then
    echo "ERROR: jq is required but not installed. Install with: brew install jq" >&2
    return 1
  fi
}

# Validate basic structure of abstract hook JSON.
# Args: $1=file_path
# Exit: 0 if valid, 1 if invalid
validate_abstract() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    echo "ERROR: File not found: $file" >&2
    return 1
  fi

  require_jq

  # Check it's valid JSON
  if ! jq empty "$file" 2>/dev/null; then
    echo "ERROR: Invalid JSON in $file" >&2
    return 1
  fi

  # Check version field
  local version
  version=$(jq -r '.version // empty' "$file")
  if [[ "$version" != "1.0" ]]; then
    echo "ERROR: version must be '1.0', got '$version'" >&2
    return 1
  fi

  # Check hooks field exists
  if ! jq -e '.hooks' "$file" &>/dev/null; then
    echo "ERROR: Missing 'hooks' field" >&2
    return 1
  fi

  # Check at least one hook group has hooks
  local hook_count
  hook_count=$(jq '[.hooks | to_entries[].value[] | .hooks | length] | add // 0' "$file")
  if [[ "$hook_count" -eq 0 ]]; then
    echo "ERROR: No hooks defined" >&2
    return 1
  fi

  echo "OK"
  return 0
}

# Parse abstract hook JSON and output normalized JSON.
# Args: $1=file_path (or reads stdin)
# Output: normalized JSON to stdout
parse_abstract_json() {
  require_jq

  local input="${1:-/dev/stdin}"

  # Normalize: ensure all hook groups have arrays, filter nulls
  jq '{
    version: .version,
    hooks: (.hooks | to_entries | map({
      key: .key,
      value: [.value[] | {
        matcher: (.matcher // "*"),
        hooks: [.hooks[] | {
          type: .type,
          command: (.command // null),
          prompt: (.prompt // null),
          timeout: (.timeout // null),
          if: (.if // null)
        }]
      }]
    }) | from_entries)
  }' "$input"
}

# Extract hook groups for a specific event from abstract JSON.
# Args: $1=file_path, $2=event_name
# Output: JSON array of hook groups for that event
get_event_hooks() {
  local file="$1"
  local event="$2"

  require_jq

  jq --arg event "$event" '.hooks[$event] // []' "$file"
}

# Check if any hooks in the config are type="prompt".
# Args: $1=file_path
# Output: "true" or "false"
has_prompt_hooks() {
  local file="$1"

  require_jq

  local count
  count=$(jq '[.hooks | to_entries[].value[] | .hooks[] | select(.type == "prompt")] | length' "$file")

  if [[ "$count" -gt 0 ]]; then
    echo "true"
  else
    echo "false"
  fi
}

# Count hooks of a specific type.
# Args: $1=file_path, $2=hook_type (command|prompt)
# Output: count as number
count_hooks_by_type() {
  local file="$1"
  local hook_type="$2"

  require_jq

  jq --arg type "$hook_type" \
    '[.hooks | to_entries[].value[] | .hooks[] | select(.type == $type)] | length' "$file"
}
