#!/bin/bash
# emit-hooks.sh — Unified entry point for multi-agent hook config emission
#
# Usage:
#   emit-hooks.sh [options]
#
# Reads abstract hook config and emits platform-specific configs for all
# (or selected) coding agents.
#
# Options:
#   --config <path>       Abstract hook config file (default: ./hooks.yaml or ./hooks.json)
#   --platform <list>     Comma-separated platforms: claude-code,codex,opencode,pi,gemini
#   --all                 Emit for all supported platforms
#   --dry-run             Print output to stdout instead of writing files
#   --force               Overwrite existing config files without warning
#   --detect              Auto-detect installed platforms and emit for those only
#   --help                Show this help
#
# Requires: jq, bash 4+

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EMITTERS_DIR="$SCRIPT_DIR/../emitters"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$SCRIPT_DIR/emit-common.sh"

ALL_PLATFORMS="claude-code,codex,opencode,pi,gemini"
PLATFORMS=""
CONFIG_FILE=""
DRY_RUN=false
FORCE=false
AUTO_DETECT=false

usage() {
  echo "Usage: $0 [options]"
  echo ""
  echo "Emit platform-specific hook configs from abstract hook config."
  echo ""
  echo "Options:"
  echo "  --config <path>       Abstract hook config (default: auto-detect hooks.yaml/json)"
  echo "  --platform <list>     Comma-separated: claude-code,codex,opencode,pi,gemini"
  echo "  --all                 Emit for all platforms"
  echo "  --dry-run             Preview output without writing files"
  echo "  --force               Overwrite existing configs"
  echo "  --detect              Auto-detect installed platforms"
  echo "  --help                Show this help"
  echo ""
  echo "Examples:"
  echo "  $0 --all                           # Emit for all platforms"
  echo "  $0 --platform pi                   # Emit for Pi only"
  echo "  $0 --platform claude-code --dry-run # Preview Claude Code config"
  echo "  $0 --detect                        # Auto-detect and emit"
  exit "${1:-0}"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --config) CONFIG_FILE="$2"; shift 2 ;;
    --platform) PLATFORMS="$2"; shift 2 ;;
    --all) PLATFORMS="$ALL_PLATFORMS"; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --force) FORCE=true; shift ;;
    --detect) AUTO_DETECT=true; shift ;;
    --help) usage 0 ;;
    -*) echo "Unknown option: $1" >&2; usage 1 ;;
    *) echo "Unexpected argument: $1" >&2; usage 1 ;;
  esac
done

# Auto-detect config file if not specified
if [[ -z "$CONFIG_FILE" ]]; then
  for candidate in "hooks.yaml" "hooks.yml" "hooks.json" ".cc-hooks/hooks.yaml" ".cc-hooks/hooks.json"; do
    if [[ -f "$candidate" ]]; then
      CONFIG_FILE="$candidate"
      break
    fi
  done
fi

if [[ -z "$CONFIG_FILE" ]]; then
  echo "ERROR: No config file found. Specify with --config or create hooks.yaml in current directory." >&2
  exit 1
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "ERROR: Config file not found: $CONFIG_FILE" >&2
  exit 1
fi

# Convert YAML to JSON if needed (requires yq or python)
CONFIG_JSON="$CONFIG_FILE"
if [[ "$CONFIG_FILE" == *.yaml || "$CONFIG_FILE" == *.yml ]]; then
  if command -v yq &>/dev/null; then
    CONFIG_JSON=$(mktemp)
    yq -o=json "$CONFIG_FILE" > "$CONFIG_JSON"
    trap "rm -f $CONFIG_JSON" EXIT
  elif command -v python3 &>/dev/null; then
    CONFIG_JSON=$(mktemp)
    python3 -c "import json, yaml, sys; json.dump(yaml.safe_load(sys.stdin), sys.stdout, indent=2)" < "$CONFIG_FILE" > "$CONFIG_JSON"
    trap "rm -f $CONFIG_JSON" EXIT
  else
    echo "ERROR: YAML config requires yq or python3. Install yq: brew install yq" >&2
    exit 1
  fi
fi

# Validate
validation=$(validate_abstract "$CONFIG_JSON")
if [[ "$validation" != "OK" ]]; then
  echo "ERROR: Invalid config: $validation" >&2
  exit 1
fi

# Auto-detect platforms if requested
if [[ "$AUTO_DETECT" == "true" ]]; then
  PLATFORMS=""
  [[ -d ".claude" ]] && PLATFORMS="${PLATFORMS:+$PLATFORMS,}claude-code"
  [[ -f "codex.json" || -d ".codex" ]] && PLATFORMS="${PLATFORMS:+$PLATFORMS,}codex"
  [[ -d ".opencode" ]] && PLATFORMS="${PLATFORMS:+$PLATFORMS,}opencode"
  [[ -d ".pi" ]] && PLATFORMS="${PLATFORMS:+$PLATFORMS,}pi"
  [[ -d ".gemini" ]] && PLATFORMS="${PLATFORMS:+$PLATFORMS,}gemini"

  if [[ -z "$PLATFORMS" ]]; then
    echo "WARNING: No platform directories detected. Use --platform to specify manually." >&2
    exit 1
  fi
  echo "Auto-detected platforms: $PLATFORMS" >&2
fi

if [[ -z "$PLATFORMS" ]]; then
  echo "ERROR: No platforms specified. Use --platform, --all, or --detect." >&2
  usage 1
fi

# Show summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "cc-hooks: Multi-Agent Hook Config Emitter" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "Config: $CONFIG_FILE" >&2
echo "Platforms: $PLATFORMS" >&2
echo "Mode: $(if $DRY_RUN; then echo "dry-run"; else echo "write"; fi)" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "" >&2

# Emit for each platform
IFS=',' read -ra PLATFORM_LIST <<< "$PLATFORMS"
errors=0

for platform in "${PLATFORM_LIST[@]}"; do
  platform=$(echo "$platform" | xargs)  # trim whitespace

  emitter="$EMITTERS_DIR/emit-${platform}.sh"

  if [[ ! -f "$emitter" ]]; then
    echo "ERROR: No emitter found for platform '$platform' (expected: $emitter)" >&2
    ((errors++))
    continue
  fi

  echo "▸ Emitting $platform..." >&2

  args=("$CONFIG_JSON")
  if [[ "$DRY_RUN" == "true" ]]; then
    args+=("--dry-run")
  fi
  if [[ "$FORCE" == "true" ]]; then
    args+=("--force")
  fi

  if bash "$emitter" "${args[@]}"; then
    echo "  ✓ $platform done" >&2
  else
    echo "  ✗ $platform failed" >&2
    ((errors++))
  fi
  echo "" >&2
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
if [[ $errors -eq 0 ]]; then
  echo "✅ All platforms emitted successfully" >&2
else
  echo "⚠️  $errors platform(s) had errors" >&2
fi

exit $errors
