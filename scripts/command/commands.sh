#!/usr/bin/env bash
# =============================================================================
# commands.sh - Install plugin slash commands to target AI coding agents
# =============================================================================
#
# This command installs slash command definitions from plugins/{plugin}/commands/*.md
# to target platforms as Skills 2.0 skill directories.
#
# Usage:
#   ./scripts/command/commands.sh <plugin> <targets> [options]
#
# Arguments:
#   plugin      Plugin name (e.g., rd3, wt)
#   targets     Target agents: all, codexcli, geminicli, opencode, openclaw, antigravity, pi
#
# Options:
#   --global    Install to user-level global directories
#   --dry-run   Preview changes without executing
#   --verbose   Enable verbose output
#   --help      Show this help message
#
# =============================================================================

set -e

# Source shared library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

PLUGIN=""
TARGETS=""
DRY_RUN=false
VERBOSE=false
GLOBAL=false

AVAILABLE_TARGETS="codexcli,geminicli,opencode,openclaw,antigravity,pi"

# =============================================================================
# Usage
# =============================================================================

usage() {
    printf "${CYAN}commands.sh${NC} - Install plugin slash commands to AI coding agents\n\n"
    printf "${GREEN}USAGE:${NC}\n"
    printf "    $(basename "$0") <plugin> <targets> [options]\n\n"
    printf "${GREEN}ARGUMENTS:${NC}\n"
    printf "    plugin      Plugin name (e.g., rd3, wt)\n"
    printf "    targets     Target agents: all, codexcli, geminicli, opencode, openclaw, antigravity, pi\n\n"
    printf "${GREEN}OPTIONS:${NC}\n"
    printf "    --global    Install to user-level global directories (e.g., ~/.agents/skills/)\n"
    printf "    --dry-run   Preview changes without executing\n"
    printf "    --verbose   Enable verbose output\n"
    printf "    --help      Show this help message\n\n"
    printf "${GREEN}EXAMPLES:${NC}\n"
    printf "    $(basename "$0") rd3 all --global\n"
    printf "    $(basename "$0") rd3 codexcli --global\n"
    printf "    $(basename "$0") wt pi --global\n"
}

# =============================================================================
# Argument Parsing
# =============================================================================

parse_args() {
    while [ $# -gt 0 ]; do
        case $1 in
            --dry-run)  DRY_RUN=true; shift ;;
            --verbose)  VERBOSE=true; shift ;;
            --global)   GLOBAL=true; shift ;;
            --help|-h)  usage; exit 0 ;;
            -*)
                print_error "Unknown option: $1"; usage; exit 1 ;;
            *)
                if [ -z "$PLUGIN" ]; then
                    PLUGIN="$1"
                elif [ -z "$TARGETS" ]; then
                    TARGETS="$1"
                else
                    print_error "Unknown argument: $1"; usage; exit 1
                fi
                shift ;;
        esac
    done

    if [ -z "$PLUGIN" ]; then
        print_error "Plugin name is required"; usage; exit 1
    fi
    if [ -z "$TARGETS" ]; then
        print_error "Target agents are required"; usage; exit 1
    fi
}

# =============================================================================
# Validation
# =============================================================================

validate_environment() {
    print_info "Validating environment..."

    local plugin_dir="${PROJECT_ROOT}/plugins/${PLUGIN}"
    if [ ! -d "$plugin_dir" ]; then
        print_error "Plugin not found: plugins/${PLUGIN}"; exit 1
    fi
    print_success "Plugin found: plugins/${PLUGIN}"

    local commands_dir="${plugin_dir}/commands"
    if [ ! -d "$commands_dir" ]; then
        print_error "No commands directory found: plugins/${PLUGIN}/commands/"; exit 1
    fi

    local cmd_count
    cmd_count=$(ls -1 "$commands_dir"/*.md 2>/dev/null | wc -l | tr -d ' ')
    if [ "$cmd_count" -eq 0 ]; then
        print_error "No command files found in plugins/${PLUGIN}/commands/"; exit 1
    fi
    print_success "Found ${cmd_count} command(s)"

    validate_targets "$TARGETS" "$AVAILABLE_TARGETS" || exit 1
    echo
}

# =============================================================================
# Command Adaptation
# =============================================================================

# Normalize command frontmatter to Skills 2.0 format.
# Injects 'name' field, normalizes argument-hint and allowed-tools.
normalize_command_frontmatter() {
    local source_file="$1"
    local target_file="$2"
    local expected_name="$3"

    awk -v name="$expected_name" '
        function trim(value) {
            sub(/^[[:space:]]+/, "", value)
            sub(/[[:space:]]+$/, "", value)
            return value
        }

        function quote_yaml(value) {
            gsub(/\\/, "\\\\", value)
            gsub(/"/, "\\\"", value)
            return "\"" value "\""
        }

        BEGIN { in_frontmatter = 0 }

        NR == 1 && /^---[[:space:]]*$/ {
            in_frontmatter = 1
            print
            print "name: " name
            next
        }

        in_frontmatter && /^---[[:space:]]*$/ {
            print
            in_frontmatter = 0
            next
        }

        in_frontmatter {
            if ($0 ~ /^name:[[:space:]]*/) { next }
            if ($0 ~ /^argument-hint:[[:space:]]*/) {
                value = trim(substr($0, index($0, ":") + 1))
                print "argument-hint: " quote_yaml(value)
                next
            }
            if ($0 ~ /^allowed-tools:[[:space:]]*/) {
                value = trim(substr($0, index($0, ":") + 1))
                if (value ~ /^\[/) { print; next }
                count = split(value, parts, /,[[:space:]]*/)
                out = "["
                for (i = 1; i <= count; i++) {
                    part = trim(parts[i])
                    if (part == "") continue
                    if (out != "[") out = out ", "
                    out = out part
                }
                out = out "]"
                print "allowed-tools: " out
                next
            }
            print
            next
        }

        { print }
    ' "$source_file" > "$target_file"
}

# Adapt a command .md file to Skills 2.0 format.
# Ensures frontmatter has required fields, rewrites references.
adapt_command_to_skill() {
    local source_file="$1"
    local target_file="$2"
    local expected_name="$3"
    local cmd_name
    cmd_name=$(basename "$source_file" .md)

    if grep -q "^---" "$source_file" 2>/dev/null; then
        normalize_command_frontmatter "$source_file" "$target_file" "$expected_name"
    else
        local description
        description=$(head -n 5 "$source_file" | grep -v "^#" | head -n 1 | tr -d '\n')
        cat > "$target_file" <<EOF
---
name: $expected_name
description: ${description:-${cmd_name} command for ${PLUGIN} plugin}
disable-model-invocation: true
---

$(cat "$source_file")
EOF
    fi

    rewrite_skill_references "$target_file" "$PLUGIN"
}

# =============================================================================
# Target Directory Resolution
# =============================================================================

get_target_skills_dir() {
    local target="$1"
    if [ "$GLOBAL" = "true" ]; then
        case "$target" in
            codexcli)    echo "$HOME/.agents/skills" ;;
            geminicli)   echo "$HOME/.agents/skills" ;;
            opencode)    echo "$HOME/.agents/skills" ;;
            openclaw)    echo "$HOME/.agents/skills" ;;
            antigravity) echo "$HOME/.gemini/antigravity/skills" ;;
            pi)          echo "$HOME/.agents/skills" ;;
        esac
    else
        case "$target" in
            codexcli)    echo ".codex/skills" ;;
            geminicli)   echo ".gemini/skills" ;;
            opencode)    echo ".opencode/skills" ;;
            openclaw)    echo "skills" ;;
            antigravity) echo ".gemini/antigravity/skills" ;;
            pi)          echo ".pi/agent/skills" ;;
        esac
    fi
}

get_all_target_dirs() {
    local targets="$1"
    local dirs=()

    add_unique_dir() {
        local d="$1"
        local existing
        for existing in "${dirs[@]}"; do
            [ "$existing" = "$d" ] && return 0
        done
        dirs+=("$d")
    }

    for target in $(echo "$targets" | tr ',' ' '); do
        local primary
        primary=$(get_target_skills_dir "$target")
        [ -n "$primary" ] && add_unique_dir "$primary"

        if [ "$GLOBAL" = "false" ]; then
            case "$target" in
                geminicli|opencode|antigravity)
                    add_unique_dir ".agents/skills"
                    ;;
            esac
        fi
    done

    printf '%s\n' "${dirs[@]}"
}

# =============================================================================
# Installation
# =============================================================================

install_commands() {
    local targets="$1"
    local commands_dir="${PROJECT_ROOT}/plugins/${PLUGIN}/commands"

    print_info "Installing commands from plugins/${PLUGIN}/commands/..."

    local target_dirs=()
    while IFS= read -r dir; do
        target_dirs+=("$dir")
    done < <(get_all_target_dirs "$targets")

    if [ "$DRY_RUN" = "true" ]; then
        print_warning "DRY RUN - Would install commands to:"
        for target_dir in "${target_dirs[@]}"; do
            echo "   $target_dir"
        done

        for cmd_file in "$commands_dir"/*.md; do
            [ -f "$cmd_file" ] || continue
            local cmd_name
            cmd_name=$(basename "$cmd_file" .md)
            local skill_name="${PLUGIN}-${cmd_name}"
            echo "   ${skill_name}/SKILL.md"
        done
        return 0
    fi

    local installed=0
    for cmd_file in "$commands_dir"/*.md; do
        [ -f "$cmd_file" ] || continue

        local cmd_name
        cmd_name=$(basename "$cmd_file" .md)
        local skill_name="${PLUGIN}-${cmd_name}"

        for target_dir in "${target_dirs[@]}"; do
            local dest_dir="${target_dir}/${skill_name}"
            mkdir -p "$dest_dir"
            adapt_command_to_skill "$cmd_file" "$dest_dir/SKILL.md" "$skill_name"
            print_success "Installed: ${skill_name} -> ${target_dir}"
        done
        installed=$((installed + 1))
    done

    echo
    print_info "Installed ${installed} command(s) to ${#target_dirs[@]} target directory(ies)"
}

# =============================================================================
# Main
# =============================================================================

main() {
    parse_args "$@"

    local actual_targets
    actual_targets=$(expand_targets "$TARGETS" "$AVAILABLE_TARGETS")
    if [ "$TARGETS" = "all" ]; then
        print_info "Expanding 'all' to: $actual_targets"
    fi

    validate_environment
    install_commands "$actual_targets"

    print_success "Command installation completed!"
}

main "$@"
