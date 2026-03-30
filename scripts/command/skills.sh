#!/usr/bin/env bash
# =============================================================================
# skills.sh - Install plugin skills to target AI coding agents
# =============================================================================
#
# This command installs a plugin's skills and command wrappers to various
# AI coding agents using an isolated rulesync workspace for validation.
#
# Usage:
#   ./scripts/command/skills.sh <plugin> <targets> [options]
#
# Arguments:
#   plugin      Plugin name (e.g., rd3, wt)
#   targets     Target agents: all, codexcli, geminicli, opencode, openclaw, antigravity, augmentcode, pi
#
# Options:
#   --features  Features to install: skills,commands (default: skills,commands)
#   --global    Install to user-level global directories (e.g., ~/.codex/skills/)
#   --dry-run   Preview changes without executing
#   --verbose   Enable verbose output
#   --help      Show this help message
#
# =============================================================================

set -e

# Source shared library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

RULESYNC_CONFIG_FILE="${PROJECT_ROOT}/rulesync.jsonc"

# Default configuration values
PLUGIN=""
TARGETS=""
FEATURES="skills,commands"
DRY_RUN=false
VERBOSE=false
GLOBAL=false
PROJECT_DIR=""
WORKSPACE_DIR=""

AVAILABLE_TARGETS="codexcli,geminicli,opencode,openclaw,antigravity,augmentcode,pi"

# =============================================================================
# Usage
# =============================================================================

usage() {
    printf "${CYAN}skills.sh${NC} - Install plugin skills to AI coding agents\n\n"
    printf "${GREEN}USAGE:${NC}\n"
    printf "    $(basename "$0") <plugin> <targets> [options]\n\n"
    printf "${GREEN}ARGUMENTS:${NC}\n"
    printf "    plugin      Plugin name (e.g., rd3, wt)\n"
    printf "    targets     Target agents: all, codexcli, geminicli, opencode, openclaw, antigravity, augmentcode, pi\n\n"
    printf "${GREEN}OPTIONS:${NC}\n"
    printf "    --features      Features to install: skills,commands (default: skills,commands)\n"
    printf "    --project-dir   Target project directory (default: current directory)\n"
    printf "    --global        Install to user-level directories (e.g., ~/.codex/skills/)\n"
    printf "    --dry-run       Preview changes without executing\n"
    printf "    --verbose       Enable verbose output\n"
    printf "    --help          Show this help message\n\n"
    printf "${GREEN}EXAMPLES:${NC}\n"
    printf "    $(basename "$0") rd3 all --global\n"
    printf "    $(basename "$0") rd3 codexcli --global\n"
    printf "    $(basename "$0") rd3 geminicli,opencode --verbose\n"
    printf "    $(basename "$0") rd3 openclaw --features=skills,commands\n\n"
    printf "${GREEN}TARGETS:${NC}\n"
    printf "    codexcli       Codex CLI\n"
    printf "    geminicli      Google Gemini CLI\n"
    printf "    opencode       OpenCode CLI\n"
    printf "    openclaw       OpenClaw\n"
    printf "    antigravity    Google Antigravity CLI\n"
    printf "    augmentcode    Augment Code (Auggie)\n"
    printf "    pi             Pi CLI\n"
    printf "    all            All supported targets above\n"
}

# =============================================================================
# Workspace & Cleanup
# =============================================================================

cleanup_workspace() {
    if [ -n "$WORKSPACE_DIR" ] && [ -d "$WORKSPACE_DIR" ]; then
        rm -rf "$WORKSPACE_DIR"
    fi
}

trap cleanup_workspace EXIT

# =============================================================================
# Argument Parsing
# =============================================================================

parse_args() {
    while [ $# -gt 0 ]; do
        case $1 in
            --features=*)  FEATURES="${1#*=}"; shift ;;
            --dry-run)     DRY_RUN=true; shift ;;
            --verbose)     VERBOSE=true; shift ;;
            --global)      GLOBAL=true; shift ;;
            --project-dir) PROJECT_DIR="$2"; shift 2 ;;
            --project-dir=*) PROJECT_DIR="${1#*=}"; shift ;;
            --help|-h)     usage; exit 0 ;;
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

validate_features() {
    local normalized_features="$FEATURES"
    if [ "$normalized_features" = "all" ]; then
        normalized_features="skills,commands"
    fi

    local validated_features=()
    local feature
    for feature in $(echo "$normalized_features" | tr ',' ' '); do
        case "$feature" in
            skills|commands)
                validated_features+=("$feature")
                ;;
            subagents)
                print_error "Subagent installation is not supported by skills.sh"
                print_info "Use scripts/command/subagents.sh instead"
                exit 1
                ;;
            *)
                print_error "Invalid feature: $feature"
                print_info "Valid features: skills,commands"
                exit 1
                ;;
        esac
    done

    if [ "${#validated_features[@]}" -eq 0 ]; then
        print_error "At least one feature is required"; exit 1
    fi

    FEATURES=$(IFS=,; echo "${validated_features[*]}")
}

create_rulesync_workspace() {
    local workspace_dir
    workspace_dir=$(mktemp -d "${TMPDIR:-/tmp}/install-skills-workspace.XXXXXX")

    if [ -f "$RULESYNC_CONFIG_FILE" ]; then
        cp "$RULESYNC_CONFIG_FILE" "${workspace_dir}/rulesync.jsonc"
    fi

    echo "$workspace_dir"
}

# =============================================================================
# Environment Validation
# =============================================================================

validate_environment() {
    print_info "Validating environment..."

    local plugin_dir="${PROJECT_ROOT}/plugins/${PLUGIN}"
    if [ ! -d "$plugin_dir" ]; then
        print_error "Plugin not found: plugins/${PLUGIN}"; exit 1
    fi
    print_success "Plugin found: plugins/${PLUGIN}"

    if ! command -v rulesync &> /dev/null && ! command -v npx &> /dev/null; then
        print_error "rulesync not found. Install with: npm install -g rulesync"; exit 1
    fi
    print_success "rulesync available"

    validate_features

    validate_targets "$TARGETS" "$AVAILABLE_TARGETS" || exit 1

    echo
}

# =============================================================================
# Resource Mapping
# =============================================================================

map_resources() {
    local workspace_dir="$1"
    local plugin_dir="${PROJECT_ROOT}/plugins/${PLUGIN}"
    local workspace_rulesync_dir="${workspace_dir}/.rulesync"
    local workspace_skills_dir="${workspace_rulesync_dir}/skills"

    print_info "Mapping plugin resources to rulesync format..."

    rm -rf "$workspace_rulesync_dir"
    mkdir -p "$workspace_skills_dir"

    # Process commands directory -> .rulesync/skills/{PLUGIN}-cmd-*/
    if feature_enabled "commands" "$FEATURES"; then
        local commands_dir="${plugin_dir}/commands"
        if [ -d "$commands_dir" ]; then
            print_info "Processing commands..."
            for cmd_file in "$commands_dir"/*.md; do
                if [ -f "$cmd_file" ]; then
                    local cmd_name
                    cmd_name=$(basename "$cmd_file" .md)
                    local target_skill_dir="${workspace_skills_dir}/${PLUGIN}-cmd-${cmd_name}"

                    mkdir -p "$target_skill_dir"
                    adapt_command_to_skill "$cmd_file" "$target_skill_dir/SKILL.md" "${PLUGIN}-cmd-${cmd_name}"
                    print_success "Mapped command: $cmd_name -> ${PLUGIN}-cmd-${cmd_name}"
                fi
            done
        fi
    fi

    # Process skills directory -> .rulesync/skills/{PLUGIN}-*/
    if feature_enabled "skills" "$FEATURES"; then
        local skills_dir="${plugin_dir}/skills"
        if [ -d "$skills_dir" ]; then
            print_info "Processing skills..."
            for skill_dir in "$skills_dir"/*/; do
                if [ -d "$skill_dir" ]; then
                    local skill_name
                    skill_name=$(basename "$skill_dir")
                    local skill_file="${skill_dir}SKILL.md"

                    if [ -f "$skill_file" ]; then
                        local target_skill_dir="${workspace_skills_dir}/${PLUGIN}-${skill_name}"

                        mkdir -p "$target_skill_dir"
                        rewrite_skill_for_install "$skill_file" "$target_skill_dir/SKILL.md" "${PLUGIN}-${skill_name}"

                        for subdir in scripts references templates assets; do
                            if [ -d "${skill_dir}${subdir}" ]; then
                                cp -r "${skill_dir}${subdir}" "$target_skill_dir/"
                                while IFS= read -r -d '' support_file; do
                                    rewrite_skill_references "$support_file" "$PLUGIN"
                                done < <(find "$target_skill_dir/$subdir" -type f -print0 2>/dev/null)
                            fi
                        done

                        print_success "Mapped skill: $skill_name"
                    fi
                fi
            done
        fi
    fi

    echo
}

rewrite_skill_for_install() {
    local source_file="$1"
    local target_file="$2"
    local expected_name="$3"

    cp "$source_file" "$target_file"
    sed -i '' "s/^name:.*/name: ${expected_name}/" "$target_file"
    rewrite_skill_references "$target_file" "$PLUGIN"
}

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
# Rulesync Execution
# =============================================================================

run_rulesync() {
    local targets="$1"
    local workspace_dir="$2"
    local rulesync_targets="$targets"
    local rulesync_args=()

    # OpenClaw install is handled by direct copy
    rulesync_targets=$(echo "$rulesync_targets" | sed 's/\(^\|,\)openclaw\(,\|$\)/\1/g' | sed 's/,,*/,/g' | sed 's/^,//; s/,$//')

    if [ -z "$rulesync_targets" ]; then
        print_info "Skipping rulesync: selected targets are handled by direct copy"
        echo
        return 0
    fi

    print_info "Running rulesync for targets: $rulesync_targets"

    local rulesync_cmd="rulesync"
    if ! command -v rulesync &> /dev/null; then
        rulesync_cmd="npx --yes rulesync"
    fi

    if [ "$DRY_RUN" = "true" ]; then
        print_warning "DRY RUN - Would execute:"
        echo "   (cd <temp-rulesync-workdir> && $rulesync_cmd generate --targets $rulesync_targets --features $FEATURES)"
        if [ "$GLOBAL" = "true" ]; then
            echo "   Copy to global directories: $HOME/.codex/skills/, etc."
        fi
        return 0
    fi

    if [ "$VERBOSE" = "true" ]; then
        rulesync_args+=(--verbose)
        print_info "Using isolated rulesync workspace: $workspace_dir"
    fi

    local command="$rulesync_cmd generate --targets \"$rulesync_targets\" --features \"$FEATURES\""
    for arg in "${rulesync_args[@]}"; do
        command="${command} ${arg}"
    done

    (cd "$workspace_dir" && eval "$command")
    local status=$?
    if [ $status -ne 0 ]; then return $status; fi

    print_success "rulesync completed"
    echo
}

# =============================================================================
# File Distribution
# =============================================================================

copy_to_targets() {
    local targets="$1"
    local workspace_dir="$2"
    local workspace_skills_dir="${workspace_dir}/.rulesync/skills"

    if [ "$GLOBAL" = "true" ]; then
        print_info "Copying generated files to user-level global paths..."
    else
        print_info "Copying generated files to project-level paths..."
    fi

    local target_dirs=()

    add_target_dir() {
        local target_dir="$1"
        local existing_dir=""
        for existing_dir in "${target_dirs[@]}"; do
            if [ "$existing_dir" = "$target_dir" ]; then return 0; fi
        done
        target_dirs+=("$target_dir")
    }

    get_path() {
        if [ "$GLOBAL" = "true" ]; then
            echo "$2"
        else
            if [ -n "$PROJECT_DIR" ]; then echo "${PROJECT_DIR}/$1"
            else echo "$1"
            fi
        fi
    }

    # Codex: ~/.codex/skills/
    if [[ "$targets" == *"codexcli"* ]] || [[ "$targets" == *"codex"* ]]; then
        local codex_path; codex_path=$(get_path ".codex/skills" "$HOME/.codex/skills")
        add_target_dir "$codex_path"
        print_info "Codex skills directory: $codex_path"
    fi

    # Gemini CLI: ~/.gemini/skills/ + ~/.agents/skills/
    if [[ "$targets" == *"geminicli"* ]] || [[ "$targets" == *"gemini"* ]]; then
        local gemini_path; gemini_path=$(get_path ".gemini/skills" "$HOME/.gemini/skills")
        local agents_path; agents_path=$(get_path ".agents/skills" "$HOME/.agents/skills")
        add_target_dir "$gemini_path"; print_info "Gemini CLI skills directory: $gemini_path"
        add_target_dir "$agents_path"; print_info "Cross-client skills directory: $agents_path"
    fi

    # OpenCode: ~/.opencode/skills/ + ~/.agents/skills/
    if [[ "$targets" == *"opencode"* ]]; then
        local opencode_path; opencode_path=$(get_path ".opencode/skills" "$HOME/.opencode/skills")
        local agents_path; agents_path=$(get_path ".agents/skills" "$HOME/.agents/skills")
        add_target_dir "$opencode_path"; print_info "OpenCode skills directory: $opencode_path"
        add_target_dir "$agents_path"; print_info "Cross-client skills directory: $agents_path"
    fi

    # OpenClaw: ~/.openclaw/skills/ (global) or skills/ (project)
    if [[ "$targets" == *"openclaw"* ]]; then
        if [ "$GLOBAL" = "true" ]; then
            local openclaw_path="$HOME/.openclaw/skills"
            add_target_dir "$openclaw_path"; print_info "OpenClaw skills directory: $openclaw_path"
        else
            local openclaw_path="skills"
            [ -n "$PROJECT_DIR" ] && openclaw_path="${PROJECT_DIR}/skills"
            add_target_dir "$openclaw_path"; print_info "OpenClaw skills directory: $openclaw_path"
        fi
    fi

    # Antigravity: ~/.gemini/antigravity/skills/ + ~/.agents/skills/
    if [[ "$targets" == *"antigravity"* ]]; then
        local antigravity_path; antigravity_path=$(get_path ".gemini/antigravity/skills" "$HOME/.gemini/antigravity/skills")
        local agents_path; agents_path=$(get_path ".agents/skills" "$HOME/.agents/skills")
        add_target_dir "$antigravity_path"; print_info "Antigravity skills directory: $antigravity_path"
        add_target_dir "$agents_path"; print_info "Cross-client skills directory: $agents_path"
    fi

    # Pi: ~/.pi/agent/skills/
    if [[ "$targets" == *"pi"* ]]; then
        local pi_path; pi_path=$(get_path ".pi/agent/skills" "$HOME/.pi/agent/skills")
        add_target_dir "$pi_path"; print_info "Pi skills directory: $pi_path"
    fi

    # Augment Code: Not yet implemented
    if [[ "$targets" == *"augmentcode"* ]]; then
        print_warning "Augment Code installation not implemented yet"
    fi

    if [ "$DRY_RUN" = "true" ]; then
        print_warning "DRY RUN - Would copy generated skills to:"
        for target_dir in "${target_dirs[@]}"; do echo "   $target_dir"; done
        echo
        return 0
    fi

    if [ -d "$workspace_skills_dir" ]; then
        for skill_dir in "$workspace_skills_dir"/*/; do
            if [ -d "$skill_dir" ]; then
                local skill_name; skill_name=$(basename "$skill_dir")
                for target_dir in "${target_dirs[@]}"; do
                    local dest_dir="${target_dir}/${skill_name}"
                    mkdir -p "$dest_dir"
                    cp -r "$skill_dir"* "$dest_dir/" 2>/dev/null || true
                    print_success "Copied: $skill_name -> $target_dir"
                done
            fi
        done
    fi

    echo
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

    if [ "$DRY_RUN" != "true" ]; then
        WORKSPACE_DIR=$(create_rulesync_workspace)
        map_resources "$WORKSPACE_DIR"
    fi

    run_rulesync "$actual_targets" "$WORKSPACE_DIR"
    copy_to_targets "$actual_targets" "$WORKSPACE_DIR"

    print_success "Installation completed successfully!"
    echo
    if [ "$GLOBAL" = "true" ]; then
        print_info "Installed ${PLUGIN} globally to: $actual_targets"
    else
        print_info "Installed ${PLUGIN} to project-level: $actual_targets"
    fi
    print_info "Features: $FEATURES"
}

main "$@"
