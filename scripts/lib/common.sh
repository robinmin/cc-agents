#!/usr/bin/env bash
# =============================================================================
# common.sh - Shared utilities for cc-agents installation scripts
# =============================================================================
#
# Source this file at the top of any installation script:
#   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#   source "${SCRIPT_DIR}/../lib/common.sh"
#
# Provides:
#   - ANSI color constants (RED, GREEN, YELLOW, MAGENTA, CYAN, BOLD, NC)
#   - Output helpers (print_info, print_success, print_warning, print_error)
#   - Directory detection (SCRIPT_DIR, PROJECT_ROOT via detect_dirs)
#   - Skill reference rewriting (rewrite_skill_references)
#   - Target validation and expansion (validate_targets, expand_targets)
#   - Feature checking (feature_enabled)
#
# =============================================================================

# Prevent double-sourcing
[ -n "$_CC_AGENTS_COMMON_SOURCED" ] && return 0
_CC_AGENTS_COMMON_SOURCED=1

# =============================================================================
# ANSI Color Constants
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# =============================================================================
# Directory Detection
# =============================================================================

# Set SCRIPT_DIR and PROJECT_ROOT based on the calling script's location.
# The calling script must set SCRIPT_DIR before sourcing this file:
#   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#   source "${SCRIPT_DIR}/../lib/common.sh"
#
# After sourcing, PROJECT_ROOT is derived as SCRIPT_DIR/../..
detect_dirs() {
    if [ -z "$SCRIPT_DIR" ]; then
        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
    fi
    PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
}

# Auto-detect PROJECT_ROOT from SCRIPT_DIR.
# Supports two sourcing patterns:
#   scripts/command/*.sh -> SCRIPT_DIR/scripts/command -> PROJECT_ROOT = SCRIPT_DIR/../..
#   scripts/*.sh         -> SCRIPT_DIR/scripts         -> PROJECT_ROOT = SCRIPT_DIR/..
if [ -n "$SCRIPT_DIR" ]; then
    if [ -f "${SCRIPT_DIR}/../package.json" ]; then
        # Sourced from scripts/*.sh (one level deep)
        PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
    else
        # Sourced from scripts/command/*.sh (two levels deep)
        PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
    fi
fi

# =============================================================================
# Output Helpers
# =============================================================================

print_info()    { printf "${CYAN}ℹ️  $1${NC}\n"; }
print_success() { printf "${GREEN}✅ $1${NC}\n"; }
print_warning() { printf "${YELLOW}⚠️  $1${NC}\n"; }
print_error()   { printf "${RED}❌ $1${NC}\n"; }

# =============================================================================
# Skill Reference Rewriting
# =============================================================================

# Rewrite plugin:skill-name -> plugin-skill-name in a file.
# The colon format only works inside Claude Code's plugin system. When skills
# are installed as directories for other agents, the LLM needs hyphenated names
# that match the installed directory names.
#
# Args:
#   $1 - File path to rewrite
#   $2 - Plugin prefix to scope the rewrite (optional, e.g., "rd3" or "wt")
rewrite_skill_references() {
    local file="$1"
    local plugin_prefix="${2:-}"
    if [ ! -f "$file" ]; then return; fi

    # Match word boundary + identifier + colon + lowercase-hyphenated name
    # Character class [a-z0-9-] handles identifiers with digits (rd3, cc1, etc.)
    if [ -n "$plugin_prefix" ]; then
        PLUGIN_PREFIX="$plugin_prefix" perl -0pi -e \
            'my $p = quotemeta($ENV{PLUGIN_PREFIX} // q{}); s/\b(${p}):([a-z][a-z0-9-]*)/$1-$2/g;' "$file"
    else
        perl -pi -e 's/\b([a-z][a-z0-9-]*):([a-z][a-z0-9-]*)/$1-$2/g' "$file"
    fi
}

# =============================================================================
# Target Validation & Expansion
# =============================================================================

# Validate comma-separated targets against an available list.
# Prints error and returns 1 if any target is invalid.
#
# Args:
#   $1 - Comma-separated targets (or "all")
#   $2 - Comma-separated available targets
validate_targets() {
    local targets="$1"
    local available="$2"

    [ "$targets" = "all" ] && return 0

    for target in $(echo "$targets" | tr ',' ' '); do
        local valid=false
        for avail in $(echo "$available" | tr ',' ' '); do
            [ "$target" = "$avail" ] && valid=true && break
        done
        if [ "$valid" = "false" ]; then
            print_error "Invalid target: $target"
            echo "   Available: $available"
            return 1
        fi
    done
}

# Expand "all" to the full available targets list, or pass through as-is.
#
# Args:
#   $1 - Comma-separated targets (or "all")
#   $2 - Comma-separated available targets
expand_targets() {
    local targets="$1"
    local available="$2"
    if [ "$targets" = "all" ]; then
        echo "$available"
    else
        echo "$targets"
    fi
}

# =============================================================================
# Feature Checking
# =============================================================================

# Check if a feature is enabled in a comma-separated features list.
#
# Args:
#   $1 - Feature name to check
#   $2 - Comma-separated features list
# Returns: 0 if enabled, 1 if not
feature_enabled() {
    local feature="$1"
    local features="$2"
    case ",${features}," in
        *,${feature},*) return 0 ;;
        *) return 1 ;;
    esac
}
