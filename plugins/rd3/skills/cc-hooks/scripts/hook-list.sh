#!/bin/bash
# hook-list.sh — Scan and display all active hooks across platforms
#
# Usage:
#   hook-list.sh [--json] [--platform <name>] [--config <path>]
#
# Reads hook configs from all known locations and displays a unified table.
# Supports: Claude Code, Pi (pi-hooks), Codex, Gemini CLI, OpenCode, abstract hooks.yaml
#
# Requires: jq, bash 4+

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ============================================================================
# Configuration paths
# ============================================================================

# Search roots: project dir, home dir
SEARCH_ROOTS=(".")
HOME_ROOTS=("$HOME")

# Hook config file patterns per platform
# Format: platform|path_pattern|parser
CONFIG_PATTERNS=(
    "claude-code|.claude/settings.json|json"
    "pi|.pi/settings.json|json"
    "codex|codex.json|json"
    "gemini|.gemini/settings.json|json"
    "opencode|.opencode/plugins/cc-hooks.ts|typescript"
    "abstract|hooks.yaml|yaml"
    "abstract|hooks.yml|yaml"
    "abstract|hooks.json|json"
)

# ============================================================================
# Output helpers
# ============================================================================

JSON_MODE=false
FILTER_PLATFORM=""
FILTER_CONFIG=""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ============================================================================
# Parsers
# ============================================================================

# Parse a JSON hook config and output tab-separated rows: platform\tevent\tmatcher\ttype\tcommand
parse_json_hooks() {
    local platform="$1"
    local file="$2"

    if ! command -v jq &>/dev/null; then
        echo -e "${RED}ERROR: jq is required but not installed${NC}" >&2
        return 1
    fi

    if ! jq empty "$file" 2>/dev/null; then
        echo -e "${YELLOW}WARNING: Invalid JSON in $file${NC}" >&2
        return 1
    fi

    # Extract hooks — handles both { "hooks": { ... } } and { "PreToolUse": [...] } formats
    jq -r --arg platform "$platform" '
        # Normalize: extract hooks object
        (if .hooks then .hooks else . end) as $hooks |

        # Iterate over events
        $hooks | to_entries[] |
        .key as $event |
        .value as $groups |

        # Iterate over hook groups
        ($groups // [])[] |
        (.matcher // "*") as $matcher |
        (.hooks // [])[] |
        [
            $platform,
            $event,
            $matcher,
            (.type // "command"),
            (.command // .prompt // "-")
        ] | @tsv
    ' "$file" 2>/dev/null || true
}

# Parse a TypeScript plugin file (OpenCode) and extract basic hook info
parse_typescript_hooks() {
    local platform="$1"
    local file="$2"

    if [[ ! -f "$file" ]]; then
        return 0
    fi

    # Extract event names from the TS plugin (look for "event.name": patterns)
    grep -oE '"[a-z]+\.[a-z]+"' "$file" 2>/dev/null | tr -d '"' | sort -u | while read -r event; do
        echo -e "${platform}\t${event}\t*\tcommand\t(plugin)"
    done || true
}

# Parse YAML hook config (abstract format)
parse_yaml_hooks() {
    local platform="$1"
    local file="$2"

    if [[ ! -f "$file" ]]; then
        return 0
    fi

    # Convert YAML to JSON if possible, then parse
    if command -v yq &>/dev/null; then
        yq -o=json "$file" 2>/dev/null | jq -r --arg platform "$platform" '
            (if .hooks then .hooks else . end) as $hooks |
            $hooks | to_entries[] |
            .key as $event |
            .value as $groups |
            ($groups // [])[] |
            (.matcher // "*") as $matcher |
            (.hooks // [])[] |
            [
                $platform,
                $event,
                $matcher,
                (.type // "command"),
                (.command // .prompt // "-")
            ] | @tsv
        ' 2>/dev/null || true
    elif command -v python3 &>/dev/null; then
        python3 -c "
import json, sys, yaml
try:
    data = yaml.safe_load(open('$file'))
    hooks = data.get('hooks', data)
    for event, groups in (hooks or {}).items():
        for group in (groups or []):
            matcher = group.get('matcher', '*')
            for hook in (group.get('hooks', [])):
                htype = hook.get('type', 'command')
                cmd = hook.get('command') or hook.get('prompt') or '-'
                print(f'$platform\t{event}\t{matcher}\t{htype}\t{cmd}')
except: pass
" 2>/dev/null || true
    else
        # Fallback: grep-based extraction
        local current_event=""
        while IFS= read -r line; do
            if [[ "$line" =~ ^[A-Z][a-zA-Z]+:$ ]]; then
                current_event="${line%:}"
            elif [[ "$line" =~ type:\ *command ]] && [[ -n "$current_event" ]]; then
                echo -e "${platform}\t${current_event}\t*\tcommand\t(extracted)"
            fi
        done < "$file" || true
    fi
}

# ============================================================================
# Scanner
# ============================================================================

scan_hooks() {
    local all_rows=()
    local found_files=0

    for pattern_entry in "${CONFIG_PATTERNS[@]}"; do
        IFS='|' read -r platform config_path parser <<< "$pattern_entry"

        # Apply platform filter
        if [[ -n "$FILTER_PLATFORM" && "$platform" != "$FILTER_PLATFORM" ]]; then
            continue
        fi

        # Search in project roots
        for root in "${SEARCH_ROOTS[@]}"; do
            local full_path="${root}/${config_path}"

            if [[ -f "$full_path" ]]; then
                found_files=$((found_files + 1))
                case "$parser" in
                    json)       parse_json_hooks "$platform" "$full_path" ;;
                    yaml)       parse_yaml_hooks "$platform" "$full_path" ;;
                    typescript) parse_typescript_hooks "$platform" "$full_path" ;;
                esac
            fi
        done

        # Search in home roots for global configs
        for root in "${HOME_ROOTS[@]}"; do
            local full_path="${root}/${config_path}"

            if [[ -f "$full_path" ]]; then
                # Skip if same as project path
                local project_path="./${config_path}"
                if [[ "$full_path" == "$(realpath "$project_path" 2>/dev/null || echo "NONE")" ]]; then
                    continue
                fi

                found_files=$((found_files + 1))
                case "$parser" in
                    json)       parse_json_hooks "${platform} (global)" "$full_path" ;;
                    yaml)       parse_yaml_hooks "${platform} (global)" "$full_path" ;;
                    typescript) parse_typescript_hooks "${platform} (global)" "$full_path" ;;
                esac
            fi
        done
    done

    return $found_files
}

# ============================================================================
# Output formatting
# ============================================================================

print_table() {
    local data="$1"

    if [[ -z "$data" ]]; then
        echo -e "${YELLOW}No hooks found.${NC}"
        echo ""
        echo "Searched locations:"
        for pattern_entry in "${CONFIG_PATTERNS[@]}"; do
            IFS='|' read -r platform config_path parser <<< "$pattern_entry"
            echo "  $platform: $config_path"
        done
        echo ""
        echo "To create hooks, run: /rd3:hook-setup"
        return 0
    fi

    # Header
    printf "${BOLD}%-18s %-20s %-16s %-10s %s${NC}\n" "PLATFORM" "EVENT" "MATCHER" "TYPE" "COMMAND"
    printf "%-18s %-20s %-16s %-10s %s\n" "──────────" "─────────────────" "───────────────" "─────────" "─────────────────────────────"

    # Sort by platform, then event
    echo "$data" | sort -t$'\t' -k1,1 -k2,2 | while IFS=$'\t' read -r platform event matcher htype command; do
        # Truncate long commands
        if [[ ${#command} -gt 50 ]]; then
            command="${command:0:47}..."
        fi

        # Color by platform
        local color="$NC"
        case "$platform" in
            claude-code*) color="$GREEN" ;;
            pi*)          color="$CYAN" ;;
            codex*)       color="$BLUE" ;;
            gemini*)      color="$YELLOW" ;;
            opencode*)    color="$RED" ;;
            abstract*)    color="$BOLD" ;;
        esac

        printf "${color}%-18s${NC} %-20s %-16s %-10s %s\n" "$platform" "$event" "$matcher" "$htype" "$command"
    done
}

print_json() {
    local data="$1"

    if [[ -z "$data" ]]; then
        echo '{"hooks": [], "count": 0}'
        return 0
    fi

    # Build JSON array using jq to properly escape strings
    echo "$data" | jq -R -s '
        split("\n") | map(select(length > 0)) | map(split("\t")) |
        map({platform: .[0], event: .[1], matcher: .[2], type: .[3], command: .[4]}) |
        {hooks: ., count: length}
    '
}

# ============================================================================
# Main
# ============================================================================

usage() {
    echo "Usage: $(basename "$0") [options]"
    echo ""
    echo "Scan and display all active hooks across platforms."
    echo ""
    echo "Options:"
    echo "  --json              Output as JSON"
    echo "  --platform <name>   Filter to specific platform (claude-code, pi, codex, gemini, opencode, abstract)"
    echo "  --config <path>     Also scan a specific config file"
    echo "  --help              Show this help"
    exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --json)       JSON_MODE=true; shift ;;
        --platform)   FILTER_PLATFORM="$2"; shift 2 ;;
        --config)     FILTER_CONFIG="$2"; shift 2 ;;
        --help)       usage 0 ;;
        -*)           echo "Unknown option: $1" >&2; usage 1 ;;
        *)            echo "Unexpected argument: $1" >&2; usage 1 ;;
    esac
done

# Collect all hook data
if [[ -n "$FILTER_CONFIG" ]]; then
    if [[ -f "$FILTER_CONFIG" ]]; then
        # --config specified and file exists: only scan that file
        ext="${FILTER_CONFIG##*.}"
        case "$ext" in
            json)       DATA=$(parse_json_hooks "custom" "$FILTER_CONFIG" 2>/dev/null || true) ;;
            yaml|yml)   DATA=$(parse_yaml_hooks "custom" "$FILTER_CONFIG" 2>/dev/null || true) ;;
            ts)         DATA=$(parse_typescript_hooks "custom" "$FILTER_CONFIG" 2>/dev/null || true) ;;
            *)          DATA="" ;;
        esac
    else
        # --config specified but file doesn't exist
        DATA=""
    fi
else
    # Scan all default locations
    DATA=$(scan_hooks 2>/dev/null || true)
fi

if [[ "$JSON_MODE" == "true" ]]; then
    print_json "$DATA"
else
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}  cc-hooks: Active Hooks Across All Platforms${NC}"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    print_table "$DATA"
    echo ""
    echo -e "${BOLD}Total:${NC} $(echo "$DATA" | grep -c "." 2>/dev/null || echo 0) hook(s) across $(echo "$DATA" | cut -f1 | sort -u | grep -c "." 2>/dev/null || echo 0) platform(s)"
fi
