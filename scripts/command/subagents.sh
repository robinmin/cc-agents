#!/usr/bin/env bash
# =============================================================================
# subagents.sh - Install plugin subagents to target AI coding agents
# =============================================================================
#
# This command installs subagent definitions from plugins/{plugin}/agents/*.md
# to target platforms. Most platforms receive Skills 2.0 skill directories;
# Pi receives native pi-subagents markdown agents.
#
# Usage:
#   ./scripts/command/subagents.sh <plugin> <targets> [options]
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
    printf "${CYAN}subagents.sh${NC} - Install plugin subagents to AI coding agents\n\n"
    printf "${GREEN}USAGE:${NC}\n"
    printf "    $(basename "$0") <plugin> <targets> [options]\n\n"
    printf "${GREEN}ARGUMENTS:${NC}\n"
    printf "    plugin      Plugin name (e.g., rd3, wt)\n"
    printf "    targets     Target agents: all, codexcli, geminicli, opencode, openclaw, antigravity, pi\n\n"
    printf "${GREEN}OPTIONS:${NC}\n"
    printf "    --global    Install to user-level global directories (Pi uses ~/.pi/agent/agents/)\n"
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

    local agents_dir="${plugin_dir}/agents"
    if [ ! -d "$agents_dir" ]; then
        print_error "No agents directory found: plugins/${PLUGIN}/agents/"; exit 1
    fi

    local agent_count
    agent_count=$(ls -1 "$agents_dir"/*.md 2>/dev/null | wc -l | tr -d ' ')
    if [ "$agent_count" -eq 0 ]; then
        print_error "No agent files found in plugins/${PLUGIN}/agents/"; exit 1
    fi
    print_success "Found ${agent_count} subagent(s)"

    validate_targets "$TARGETS" "$AVAILABLE_TARGETS" || exit 1
    echo
}

# =============================================================================
# Shared Parsing Helpers
# =============================================================================

extract_frontmatter_field() {
    local source_file="$1"
    local field_name="$2"

    awk -v field="$field_name" '
        BEGIN { in_frontmatter = 0; capture = 0 }

        NR == 1 && /^---[[:space:]]*$/ {
            in_frontmatter = 1
            next
        }

        in_frontmatter && /^---[[:space:]]*$/ { exit }
        !in_frontmatter { next }

        capture {
            if ($0 ~ /^[^[:space:]]/ && $0 !~ /^$/) { exit }
            print
            next
        }

        $0 ~ ("^" field ":[[:space:]]*\\|[[:space:]]*$") {
            capture = 1
            print
            next
        }

        $0 ~ ("^" field ":[[:space:]]*") {
            print
            exit
        }
    ' "$source_file"
}

extract_frontmatter_scalar() {
    local source_file="$1"
    local field_name="$2"

    awk -v field="$field_name" '
        BEGIN { in_frontmatter = 0 }

        NR == 1 && /^---[[:space:]]*$/ {
            in_frontmatter = 1
            next
        }

        in_frontmatter && /^---[[:space:]]*$/ { exit }
        !in_frontmatter { next }

        $0 ~ ("^" field ":[[:space:]]*") {
            sub("^" field ":[[:space:]]*", "", $0)
            print
            exit
        }
    ' "$source_file"
}

extract_frontmatter_list_items() {
    local source_file="$1"
    local field_name="$2"

    awk -v field="$field_name" '
        BEGIN { in_frontmatter = 0; capture = 0 }

        function trim(value) {
            sub(/^[[:space:]]+/, "", value)
            sub(/[[:space:]]+$/, "", value)
            return value
        }

        NR == 1 && /^---[[:space:]]*$/ {
            in_frontmatter = 1
            next
        }

        in_frontmatter && /^---[[:space:]]*$/ { exit }
        !in_frontmatter { next }

        capture {
            if ($0 ~ /^[^[:space:]-]/ && $0 !~ /^$/) { exit }
            if ($0 ~ /^[[:space:]]*-[[:space:]]*/) {
                sub(/^[[:space:]]*-[[:space:]]*/, "", $0)
                print trim($0)
                next
            }
            if ($0 ~ /^[[:space:]]*$/) { next }
            exit
        }

        $0 ~ ("^" field ":[[:space:]]*\\[[^]]*\\][[:space:]]*$") {
            line = $0
            sub("^" field ":[[:space:]]*\\[", "", line)
            sub(/\][[:space:]]*$/, "", line)
            count = split(line, parts, /,[[:space:]]*/)
            for (i = 1; i <= count; i++) {
                part = trim(parts[i])
                if (part != "") print part
            }
            exit
        }

        $0 ~ ("^" field ":[[:space:]]*$") {
            capture = 1
            next
        }
    ' "$source_file"
}

extract_body() {
    local source_file="$1"

    awk '
        BEGIN { in_frontmatter = 0; had_frontmatter = 0 }

        NR == 1 && /^---[[:space:]]*$/ {
            in_frontmatter = 1
            had_frontmatter = 1
            next
        }

        in_frontmatter && /^---[[:space:]]*$/ {
            in_frontmatter = 0
            next
        }

        in_frontmatter { next }
        { print }
    ' "$source_file"
}

join_csv() {
    local first=true
    local item
    for item in "$@"; do
        [ -z "$item" ] && continue
        if [ "$first" = "true" ]; then
            printf "%s" "$item"
            first=false
        else
            printf ", %s" "$item"
        fi
    done
}

append_unique() {
    local item="$1"
    shift
    local existing
    for existing in "$@"; do
        [ "$existing" = "$item" ] && return 0
    done
    return 1
}

# =============================================================================
# Skills 2.0 Adaptation
# =============================================================================

adapt_subagent_to_skill() {
    local source_file="$1"
    local target_file="$2"
    local expected_name="$3"
    local agent_name
    agent_name=$(basename "$source_file" .md)

    if grep -q "^---" "$source_file" 2>/dev/null; then
        awk -v name="$expected_name" '
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
                print
                next
            }

            { print }
        ' "$source_file" > "$target_file"
    else
        local description
        description=$(head -n 5 "$source_file" | grep -v "^#" | head -n 1 | tr -d '\n')
        cat > "$target_file" <<EOF
---
name: $expected_name
description: ${description:-${agent_name} subagent for ${PLUGIN} plugin}
---

$(cat "$source_file")
EOF
    fi

    rewrite_skill_references "$target_file" "$PLUGIN"
}

# =============================================================================
# Pi Adaptation
# =============================================================================

build_pi_tools_csv() {
    local source_file="$1"
    local raw_tools=()
    local raw_tool

    while IFS= read -r raw_tool; do
        [ -z "$raw_tool" ] && continue
        raw_tools+=("$raw_tool")
    done < <(extract_frontmatter_list_items "$source_file" "tools")

    normalize_pi_tool_list "$(join_csv "${raw_tools[@]}")" "csv"
}

build_pi_skills_csv() {
    local source_file="$1"
    local mapped=()
    local raw_skill normalized_skill
    local explicit_count=0

    while IFS= read -r raw_skill; do
        [ -z "$raw_skill" ] && continue
        explicit_count=$((explicit_count + 1))
        normalized_skill="${raw_skill/:/-}"
        if ! append_unique "$normalized_skill" "${mapped[@]}"; then
            mapped+=("$normalized_skill")
        fi
    done < <(extract_frontmatter_list_items "$source_file" "skills")

    if [ "$explicit_count" -eq 0 ]; then
        while IFS= read -r raw_skill; do
            [ -z "$raw_skill" ] && continue
            normalized_skill="${raw_skill/:/-}"
            if [ ! -d "${PROJECT_ROOT}/plugins/${PLUGIN}/skills/${normalized_skill#${PLUGIN}-}" ]; then
                continue
            fi
            if ! append_unique "$normalized_skill" "${mapped[@]}"; then
                mapped+=("$normalized_skill")
            fi
        done < <(
            perl -ne '
                next unless /\bskill\b/i;
                while (/\b([a-z][a-z0-9-]*:[a-z][a-z0-9-]*)\b/g) {
                    print "$1\n";
                }
            ' "$source_file" | sort -u
        )
    fi

    join_csv "${mapped[@]}"
}

write_pi_runtime_notes() {
    local source_file="$1"
    local skill_csv="$2"

    local raw_tools=()
    local raw_tool
    while IFS= read -r raw_tool; do
        [ -n "$raw_tool" ] && raw_tools+=("$raw_tool")
    done < <(extract_frontmatter_list_items "$source_file" "tools")

    local has_skill_tool=false
    local has_agent_tool=false
    local has_question_tool=false
    local has_task_tool=false
    local has_glob_tool=false
    local has_web_tools=false

    for raw_tool in "${raw_tools[@]}"; do
        case "$raw_tool" in
            Skill) has_skill_tool=true ;;
            Agent) has_agent_tool=true ;;
            AskUserQuestion) has_question_tool=true ;;
            Task) has_task_tool=true ;;
            Glob) has_glob_tool=true ;;
            WebSearch|WebFetch|ref_search_documentation|ref_read_url|mcp__*) has_web_tools=true ;;
        esac
    done

    if [ "$has_skill_tool" = "false" ] && [ "$has_agent_tool" = "false" ] && \
       [ "$has_question_tool" = "false" ] && [ "$has_task_tool" = "false" ] && \
       [ "$has_glob_tool" = "false" ] && [ "$has_web_tools" = "false" ]; then
        return 0
    fi

    cat <<EOF
## Pi Runtime Adaptation

EOF

    if [ "$has_skill_tool" = "true" ] && [ -n "$skill_csv" ]; then
        printf -- "- Skills in \`skill:\` are injected into this prompt. Treat any mention of a Skill tool as applying those injected skills directly: \`%s\`.\n" "$skill_csv"
    fi

    if [ "$has_agent_tool" = "true" ]; then
        printf -- "- Any mention of an Agent tool or agent delegation maps to Pi's \`subagent\` tool.\n"
    fi

    if [ "$has_question_tool" = "true" ]; then
        printf -- "- Any AskUserQuestion-style step should be handled by asking the user directly in the conversation.\n"
    fi

    if [ "$has_task_tool" = "true" ]; then
        printf -- "- Any Task tool reference should be handled with repository files or CLI workflows via \`bash\`, \`read\`, \`write\`, and \`edit\`.\n"
    fi

    if [ "$has_glob_tool" = "true" ]; then
        printf -- "- File discovery maps to Pi's \`find\` and \`ls\` tools instead of Claude-style Glob.\n"
    fi

    if [ "$has_web_tools" = "true" ]; then
        printf -- "- Web research maps to Pi web-access style tools (\`web_search\`, \`fetch_content\`, \`get_search_content\`). Install \`pi-web-access\` if you want those capabilities available.\n"
    fi
}

adapt_subagent_to_pi() {
    local source_file="$1"
    local target_file="$2"
    local expected_name="$3"
    local agent_name
    agent_name=$(basename "$source_file" .md)

    local description_field
    description_field=$(extract_frontmatter_field "$source_file" "description")

    local model_value
    model_value=$(extract_frontmatter_scalar "$source_file" "model")
    model_value="${model_value#"${model_value%%[![:space:]]*}"}"
    model_value="${model_value%"${model_value##*[![:space:]]}"}"
    if [ "$model_value" = "inherit" ]; then
        model_value=""
    fi

    local tool_csv
    tool_csv=$(build_pi_tools_csv "$source_file")

    local skill_csv
    skill_csv=$(build_pi_skills_csv "$source_file")

    local runtime_notes
    runtime_notes=$(write_pi_runtime_notes "$source_file" "$skill_csv")

    local body_content
    body_content=$(extract_body "$source_file")

    {
        printf -- "---\n"
        printf "name: %s\n" "$expected_name"
        if [ -n "$description_field" ]; then
            printf "%s\n" "$description_field"
        else
            printf "description: %s\n" "${agent_name} subagent for ${PLUGIN} plugin"
        fi
        if [ -n "$tool_csv" ]; then
            printf "tools: %s\n" "$tool_csv"
        fi
        if [ -n "$model_value" ]; then
            printf "model: %s\n" "$model_value"
        fi
        if [ -n "$skill_csv" ]; then
            printf "skill: %s\n" "$skill_csv"
        fi
        printf -- "---\n\n"

        if [ -n "$runtime_notes" ]; then
            printf "%s\n\n" "$runtime_notes"
        fi
        if [ -n "$body_content" ]; then
            printf "%s\n" "$body_content"
        fi
    } > "$target_file"

    rewrite_skill_references "$target_file" "$PLUGIN"
}

# =============================================================================
# Target Directory Resolution
# =============================================================================

# Get the target subagent output directory for a platform.
# Returns the global or project-level path. Pi uses its native agent path.
#
# Args:
#   $1 - Target platform name
get_target_subagent_dir() {
    local target="$1"

    if [ "$GLOBAL" = "true" ]; then
        case "$target" in
            codexcli)    echo "$HOME/.agents/skills" ;;
            geminicli)   echo "$HOME/.agents/skills" ;;
            opencode)    echo "$HOME/.agents/skills" ;;
            openclaw)    echo "$HOME/.agents/skills" ;;
            antigravity) echo "$HOME/.gemini/antigravity/skills" ;;
            pi)          echo "$HOME/.pi/agent/agents" ;;
        esac
    else
        case "$target" in
            codexcli)    echo ".codex/skills" ;;
            geminicli)   echo ".gemini/skills" ;;
            opencode)    echo ".opencode/skills" ;;
            openclaw)    echo "skills" ;;
            antigravity) echo ".gemini/antigravity/skills" ;;
            pi)          echo ".pi/agents" ;;
        esac
    fi
}

# Get all unique install specs for a comma-separated list of platforms.
# Format: "<layout>|<dir>"
#
# Args:
#   $1 - Comma-separated target list
# Prints: One install spec per line
get_all_install_specs() {
    local targets="$1"
    local specs=()

    add_unique_spec() {
        local spec="$1"
        local existing
        for existing in "${specs[@]}"; do
            [ "$existing" = "$spec" ] && return 0
        done
        specs+=("$spec")
    }

    for target in $(echo "$targets" | tr ',' ' '); do
        local primary
        primary=$(get_target_subagent_dir "$target")

        if [ "$target" = "pi" ]; then
            [ -n "$primary" ] && add_unique_spec "pi-agent|$primary"
            continue
        fi

        [ -n "$primary" ] && add_unique_spec "skill-dir|$primary"

        if [ "$GLOBAL" = "false" ]; then
            case "$target" in
                geminicli|opencode|antigravity)
                    add_unique_spec "skill-dir|.agents/skills"
                    ;;
            esac
        fi
    done

    printf '%s\n' "${specs[@]}"
}

# =============================================================================
# Installation
# =============================================================================

install_subagents() {
    local targets="$1"
    local agents_dir="${PROJECT_ROOT}/plugins/${PLUGIN}/agents"

    print_info "Installing subagents from plugins/${PLUGIN}/agents/..."

    local install_specs=()
    while IFS= read -r spec; do
        [ -n "$spec" ] && install_specs+=("$spec")
    done < <(get_all_install_specs "$targets")

    if [ "$DRY_RUN" = "true" ]; then
        print_warning "DRY RUN - Would install subagents to:"
        local install_spec layout target_dir
        for install_spec in "${install_specs[@]}"; do
            IFS='|' read -r layout target_dir <<< "$install_spec"
            case "$layout" in
                pi-agent) echo "   $target_dir (*.md)" ;;
                *)        echo "   $target_dir (Skills 2.0 directory)" ;;
            esac
        done

        for agent_file in "$agents_dir"/*.md; do
            [ -f "$agent_file" ] || continue
            local agent_name
            agent_name=$(basename "$agent_file" .md)
            local skill_name="${PLUGIN}-${agent_name}"
            for install_spec in "${install_specs[@]}"; do
                IFS='|' read -r layout target_dir <<< "$install_spec"
                case "$layout" in
                    pi-agent) echo "   ${target_dir}/${skill_name}.md" ;;
                    *)        echo "   ${target_dir}/${skill_name}/SKILL.md" ;;
                esac
            done
        done
        return 0
    fi

    # Process each agent file
    local installed=0
    for agent_file in "$agents_dir"/*.md; do
        [ -f "$agent_file" ] || continue

        local agent_name
        agent_name=$(basename "$agent_file" .md)
        local skill_name="${PLUGIN}-${agent_name}"

        local install_spec layout target_dir
        for install_spec in "${install_specs[@]}"; do
            IFS='|' read -r layout target_dir <<< "$install_spec"

            case "$layout" in
                pi-agent)
                    mkdir -p "$target_dir"
                    adapt_subagent_to_pi "$agent_file" "${target_dir}/${skill_name}.md" "$skill_name"
                    print_success "Installed Pi agent: ${skill_name}.md -> ${target_dir}"
                    ;;
                *)
                    local dest_dir="${target_dir}/${skill_name}"
                    mkdir -p "$dest_dir"
                    adapt_subagent_to_skill "$agent_file" "$dest_dir/SKILL.md" "$skill_name"
                    print_success "Installed skill wrapper: ${skill_name} -> ${target_dir}"
                    ;;
            esac
        done
        installed=$((installed + 1))
    done

    echo
    print_info "Installed ${installed} subagent(s) to ${#install_specs[@]} target location(s)"
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
    install_subagents "$actual_targets"

    print_success "Subagent installation completed!"
}

main "$@"
