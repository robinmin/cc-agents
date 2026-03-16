#!/usr/bin/env bash
# =============================================================================
# adapt-skills.sh - Adapt Claude Code plugin components for cross-platform use
# =============================================================================
#
# This script audits, fixes, and adapts plugin components (slash commands,
# skills, subagents) to be compatible with Claude Code Skills 2.0 and other
# coding agents (Codex, OpenClaw, etc.) following the agentskills.io standard.
#
# Usage:
#   ./scripts/adapt-skills.sh <plugin> <targets> [options]
#
# Arguments:
#   plugin      Plugin name (e.g., rd2, rd3, wt)
#   targets     Target platforms: all, codex, openclaw, claude (default: all)
#
# Options:
#   --component   Component to process: commands, skills, subagents, all (default: all)
#   --dry-run     Preview changes without applying
#   --verbose     Show detailed output
#   --help        Show this help message
#
# Examples:
#   ./scripts/adapt-skills.sh rd3 all
#   ./scripts/adapt-skills.sh rd2 codex,openclaw --dry-run
#   ./scripts/adapt-skills.sh rd3 claude --component commands
#
# Adaptations performed:
#
#   1. Skills 2.0 Compliance (all targets):
#      - Add 'name:' field to frontmatter if missing
#      - Add 'disable-model-invocation: true' for commands
#      - Verify 'description:' follows trigger spec format
#      - Detect CC-specific syntax (Task(), Skill(), !`cmd`)
#
#   2. Codex-specific (when target includes 'codex'):
#      - Generate agents/openai.yaml with UI metadata and invocation policy
#
#   3. OpenClaw-specific (when target includes 'openclaw'):
#      - Add metadata.openclaw to SKILL.md frontmatter (single-line JSON)
#
# Research Reference:
#   docs/reasearch/how_to_write_skills_en.md
#
# =============================================================================

set -e

# =============================================================================
# SECTION: Configuration
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

PLUGIN=""
TARGETS=""
COMPONENT="all"
DRY_RUN=false
VERBOSE=false

# ANSI colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# =============================================================================
# SECTION: Helper Functions
# =============================================================================

usage() {
    printf "${CYAN}adapt-skills.sh${NC} - Adapt plugin for cross-platform compatibility\n\n"
    printf "${GREEN}USAGE:${NC}\n"
    printf "    \$(basename "\$0") <plugin> <targets> [options]\n\n"
    printf "${GREEN}ARGUMENTS:${NC}\n"
    printf "    plugin      Plugin name (e.g., rd2, rd3, wt)\n"
    printf "    targets     Target platforms: all, codex, openclaw, claude (default: all)\n\n"
    printf "${GREEN}OPTIONS:${NC}\n"
    printf "    --component   Component: commands, skills, subagents, all (default: all)\n"
    printf "    --dry-run     Preview changes without applying\n"
    printf "    --verbose     Show detailed output\n"
    printf "    --help        Show this help message\n\n"
    printf "${GREEN}EXAMPLES:${NC}\n"
    printf "    ./scripts/adapt-skills.sh rd3 all\n"
    printf "    ./scripts/adapt-skills.sh rd2 codex,openclaw --dry-run\n"
    printf "    ./scripts/adapt-skills.sh rd3 claude --component commands\n"
}

print_info() { printf "${CYAN}ℹ️  $1${NC}\n"; }
print_success() { printf "${GREEN}✅ $1${NC}\n"; }
print_warning() { printf "${YELLOW}⚠️  $1${NC}\n"; }
print_error() { printf "${RED}❌ $1${NC}\n"; }

print_header() {
    printf "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}\n"
    printf "${MAGENTA}║${NC}    ${CYAN}adapt-skills.sh${NC} - Cross-Platform Adaptation        ${MAGENTA}║${NC}\n"
    printf "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}\n"
}

# =============================================================================
# SECTION: Argument Parsing
# =============================================================================

parse_args() {
    while [ $# -gt 0 ]; do
        case $1 in
            --component)
                if [ -n "$2" ] && [[ "$2" != --* ]]; then
                    COMPONENT="$2"
                    shift 2
                else
                    print_error "--component requires a value"
                    usage
                    exit 1
                fi
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help|-h)
                usage
                exit 0
                ;;
            -*)
                print_error "Unknown option: $1"
                usage
                exit 1
                ;;
            *)
                if [ -z "$PLUGIN" ]; then
                    PLUGIN="$1"
                elif [ -z "$TARGETS" ]; then
                    TARGETS="$1"
                else
                    print_error "Unknown argument: $1"
                    usage
                    exit 1
                fi
                shift
                ;;
        esac
    done

    if [ -z "$PLUGIN" ]; then
        print_error "Plugin name is required"
        usage
        exit 1
    fi

    if [ -z "$TARGETS" ]; then
        TARGETS="all"
    fi

    # Set default component if not specified
    if [ -z "$COMPONENT" ]; then
        COMPONENT="all"
    fi
}

# =============================================================================
# SECTION: Validation
# =============================================================================

validate_environment() {
    print_info "Validating environment..."

    local plugin_dir="${PROJECT_ROOT}/plugins/${PLUGIN}"
    if [ ! -d "$plugin_dir" ]; then
        print_error "Plugin not found: plugins/${PLUGIN}"
        exit 1
    fi
    print_success "Plugin found: plugins/${PLUGIN}"

    local valid_components="commands,skills,subagents,all"
    if [[ ",$valid_components," != *",$COMPONENT,"* ]]; then
        print_error "Invalid component: $COMPONENT"
        echo "   Valid: $valid_components"
        exit 1
    fi

    local valid_targets="all,codex,openclaw,claude"
    local IFS=','
    local target_list=($TARGETS)
    for target in "${target_list[@]}"; do
        if [[ ",$valid_targets," != *",$target,"* ]]; then
            print_error "Invalid target: $target"
            echo "   Valid: $valid_targets"
            exit 1
        fi
    done

    echo
}

# =============================================================================
# SECTION: Skills 2.0 Compliance - Commands
# =============================================================================

# Audit a command file for Skills 2.0 compliance
audit_command() {
    local cmd_file="$1"
    local issues=0

    # Check 1: Frontmatter must have 'name' field
    if ! grep -q "^name:" "$cmd_file" 2>/dev/null; then
        print_warning "  [MISSING] name: field in frontmatter"
        issues=1
    fi

    # Check 2: Frontmatter must have 'description' field
    if ! grep -q "^description:" "$cmd_file" 2>/dev/null; then
        print_warning "  [MISSING] description: field in frontmatter"
        issues=1
    fi

    # Check 3: Should have 'disable-model-invocation: true' for commands
    if ! grep -q "^disable-model-invocation:" "$cmd_file" 2>/dev/null; then
        print_warning "  [OPTIONAL] disable-model-invocation: not set"
    fi

    # Check 4: CC-specific patterns that need platform sections
    if grep -q "Task(" "$cmd_file" 2>/dev/null; then
        print_warning "  [CC-SPECIFIC] Task() pseudocode found"
    fi

    if grep -q "Skill(" "$cmd_file" 2>/dev/null; then
        print_warning "  [CC-SPECIFIC] Skill() pseudocode found"
    fi

    if grep -q '!`' "$cmd_file" 2>/dev/null; then
        print_warning "  [CC-SPECIFIC] !\`cmd\` shell injection found"
    fi

    return $issues
}

# Fix command file for Skills 2.0 compliance
fix_command() {
    local cmd_file="$1"
    local cmd_name=$(basename "$cmd_file" .md)

    # Read entire file
    local content=$(cat "$cmd_file")

    # Fix 1: Add 'name:' field if missing
    if ! grep -q "^name:" "$cmd_file" 2>/dev/null; then
        if grep -q "^---" "$cmd_file" 2>/dev/null; then
            # Add name after first ---
            content=$(awk -v name="${PLUGIN}-${cmd_name}" 'NR==1 && /^---/ {print; print "name: " name; next} /^---/ {print; next} {print}' "$cmd_file")
            print_info "  Added name: ${PLUGIN}-${cmd_name}"
        fi
    fi

    # Fix 2: Add 'disable-model-invocation: true' if not present
    if ! grep -q "^disable-model-invocation:" "$cmd_file" 2>/dev/null; then
        if grep -q "^---" "$cmd_file" 2>/dev/null; then
            # Add after name or description
            content=$(awk 'NR==1 && /^---/ {print; print "disable-model-invocation: true"; next} /^---/ {print; next} {print}' <<< "$content")
            print_info "  Added disable-model-invocation: true"
        fi
    fi

    # Fix 3: Add platform section for CC-specific syntax if needed
    local has_cc_syntax=false
    if grep -q "Task(" "$cmd_file" 2>/dev/null || grep -q "Skill(" "$cmd_file" 2>/dev/null || grep -q '!`' "$cmd_file" 2>/dev/null; then
        has_cc_syntax=true
    fi

    if [ "$has_cc_syntax" = "true" ]; then
        # Check if platform section already exists
        if ! grep -q "## Platform Notes" "$cmd_file" 2>/dev/null; then
            # Add platform section at the end
            content="${content}

## Platform Notes

### Claude Code
- Uses Task(), Skill(), and !\`cmd\` pseudocode for orchestration

### Other Agents
- These commands are available as Skills in .agents/skills/ or .codex/skills/
"
            print_info "  Added Platform Notes section"
        fi
    fi

    # Write fixed content
    echo "$content" > "${cmd_file}.tmp"
    mv "${cmd_file}.tmp" "$cmd_file"
}

# Process all commands for a plugin
process_commands() {
    local plugin_dir="${PROJECT_ROOT}/plugins/${PLUGIN}"
    local commands_dir="${plugin_dir}/commands"

    if [ ! -d "$commands_dir" ]; then
        print_info "No commands directory found for ${PLUGIN}"
        return
    fi

    print_info "Processing commands in ${commands_dir}..."

    local total=0
    local issues=0

    for cmd_file in "$commands_dir"/*.md; do
        if [ -f "$cmd_file" ]; then
            total=$((total + 1))
            local cmd_name=$(basename "$cmd_file" .md)
            echo ""
            print_info "Auditing: $cmd_name"

            if [ "$DRY_RUN" = "true" ]; then
                audit_command "$cmd_file" || true
            else
                if audit_command "$cmd_file"; then
                    print_success "  OK"
                else
                    issues=$((issues + 1))
                    print_info "  Fixing..."
                    fix_command "$cmd_file"
                    print_success "  Fixed"
                fi
            fi
        fi
    done

    echo ""
    print_info "Commands: $total total, $issues issues found"
}

# =============================================================================
# SECTION: Skills 2.0 Compliance - Skills
# =============================================================================

# Audit a skill file for Skills 2.0 compliance
audit_skill() {
    local skill_dir="$1"
    local skill_name=$(basename "$skill_dir")
    local skill_file="${skill_dir}SKILL.md"

    if [ ! -f "$skill_file" ]; then
        print_warning "  [MISSING] SKILL.md file"
        return 1
    fi

    local issues=0

    # Check 1: 'name:' must match directory name
    local name_in_file=$(grep "^name:" "$skill_file" 2>/dev/null | head -n1 | sed 's/^name: *//')
    if [ "$name_in_file" != "$skill_name" ]; then
        print_warning "  [MISMATCH] name: '$name_in_file' != directory '$skill_name'"
        issues=1
    fi

    # Check 2: 'description:' should exist and be descriptive
    if ! grep -q "^description:" "$skill_file" 2>/dev/null; then
        print_warning "  [MISSING] description: field"
        issues=1
    else
        local desc=$(grep "^description:" "$skill_file" 2>/dev/null | sed 's/^description: *//')
        if [ ${#desc} -lt 20 ]; then
            print_warning "  [SHORT] description too short (${#desc} chars)"
        fi
    fi

    # Check 3: CC-specific patterns
    if grep -q "Task(" "$skill_file" 2>/dev/null; then
        print_warning "  [CC-SPECIFIC] Task() pseudocode"
    fi

    if grep -q '!`' "$skill_file" 2>/dev/null; then
        print_warning "  [CC-SPECIFIC] !\`cmd\` shell injection"
    fi

    return $issues
}

# Fix skill file for Skills 2.0 compliance
fix_skill() {
    local skill_dir="$1"
    local skill_name=$(basename "$skill_dir")
    local skill_file="${skill_dir}SKILL.md"

    # Fix 1: Ensure name matches directory
    if ! grep -q "^name: $skill_name" "$skill_file" 2>/dev/null; then
        if grep -q "^name:" "$skill_file" 2>/dev/null; then
            sed -i '' "s/^name:.*/name: $skill_name/" "$skill_file"
            print_info "  Fixed name: -> $skill_name"
        else
            # Add name field
            sed -i '' "1s/^/---\nname: $skill_name\n/" "$skill_file"
            print_info "  Added name: $skill_name"
        fi
    fi
}

# Process all skills for a plugin
process_skills() {
    local plugin_dir="${PROJECT_ROOT}/plugins/${PLUGIN}"
    local skills_dir="${plugin_dir}/skills"

    if [ ! -d "$skills_dir" ]; then
        print_info "No skills directory found for ${PLUGIN}"
        return
    fi

    print_info "Processing skills in ${skills_dir}..."

    local total=0
    local issues=0

    for skill_dir in "$skills_dir"/*/; do
        if [ -d "$skill_dir" ]; then
            total=$((total + 1))
            local skill_name=$(basename "$skill_dir")
            echo ""
            print_info "Auditing skill: $skill_name"

            # Skills 2.0 compliance check (always runs)
            if [ "$DRY_RUN" = "true" ]; then
                audit_skill "$skill_dir"
            else
                if audit_skill "$skill_dir"; then
                    print_success "  OK"
                else
                    issues=$((issues + 1))
                    print_info "  Fixing..."
                    fix_skill "$skill_dir"
                    print_success "  Fixed"
                fi
            fi

            # Platform-specific adaptations
            local IFS=','
            local target_list=($TARGETS)

            for target in "${target_list[@]}"; do
                case "$target" in
                    codex)
                        adapt_for_codex "$skill_dir"
                        ;;
                    openclaw)
                        adapt_for_openclaw "$skill_dir"
                        ;;
                    claude)
                        # Claude Code - no additional file generation needed
                        ;;
                    all)
                        adapt_for_codex "$skill_dir"
                        adapt_for_openclaw "$skill_dir"
                        ;;
                esac
            done
        fi
    done

    echo ""
    print_info "Skills: $total total, $issues issues found"
}

# =============================================================================
# SECTION: Codex Adaptations - agents/openai.yaml
# =============================================================================

# Generate agents/openai.yaml for Codex
generate_codex_yaml() {
    local skill_name="$1"
    local skill_dir="$2"

    # Read description from SKILL.md
    local description=$(grep "^description:" "${skill_dir}SKILL.md" 2>/dev/null | sed 's/^description: *//' | head -c 200)

    cat <<EOF
# Codex UI metadata and invocation policy
# This file is Codex-specific and ignored by other platforms

# Display configuration
display_name: ${skill_name}
short_description: ${description:-${skill_name} skill}

# Invocation policy
policy:
  # Set to false to prevent implicit triggering (explicit-only)
  allow_implicit_invocation: true

# Default prompt (optional)
# default_prompt: |
#   Your custom prompt here

# UI appearance (optional)
# interface:
#   icon_small: icon.png
#   icon_large: icon@2x.png
#   brand_color: "#007AFF"

# MCP server dependencies (optional)
# dependencies:
#   tools:
#     - mcp__some-server
EOF
}

# Add Codex adaptation to a skill
adapt_for_codex() {
    local skill_dir="$1"
    local skill_name=$(basename "$skill_dir")
    local agents_dir="${skill_dir}agents"

    # Skip if target doesn't include codex
    if [[ "$TARGETS" != *"codex"* ]] && [ "$TARGETS" != "all" ]; then
        return
    fi

    print_info "Adapting for Codex: $skill_name"

    # Create agents directory
    mkdir -p "$agents_dir"

    # Generate agents/openai.yaml
    local yaml_file="${agents_dir}/openai.yaml"
    if [ ! -f "$yaml_file" ]; then
        if [ "$DRY_RUN" = "true" ]; then
            print_info "  [WOULD CREATE] agents/openai.yaml"
        else
            generate_codex_yaml "$skill_name" "$skill_dir" > "$yaml_file"
            print_success "Created: agents/openai.yaml"
        fi
    else
        print_info "  [SKIP] agents/openai.yaml already exists"
    fi
}

# =============================================================================
# SECTION: OpenClaw Adaptations - metadata.openclaw
# =============================================================================

# Add OpenClaw adaptation to a skill
adapt_for_openclaw() {
    local skill_dir="$1"
    local skill_name=$(basename "$skill_dir")
    local skill_file="${skill_dir}SKILL.md"

    # Skip if target doesn't include openclaw
    if [[ "$TARGETS" != *"openclaw"* ]] && [ "$TARGETS" != "all" ]; then
        return
    fi

    print_info "Adapting for OpenClaw: $skill_name"

    # Check if metadata.openclaw already exists
    if grep -q "metadata:" "$skill_file" 2>/dev/null; then
        # Check if openclaw metadata already exists in YAML format
        if grep -q "openclaw:" "$skill_file" 2>/dev/null; then
            print_info "  [SKIP] openclaw metadata already exists"
            return
        fi
        # Check for single-line JSON format (needs to convert to YAML)
        if grep -q 'metadata:.*openclaw' "$skill_file" 2>/dev/null; then
            print_info "  [SKIP] openclaw metadata already exists (JSON)"
            return
        fi
    fi

    if [ "$DRY_RUN" = "true" ]; then
        print_info "  [WOULD ADD] metadata.openclaw to frontmatter"
    else
        # Add metadata.openclaw field after description
        local emoji='🛠️'
        local homepage='https://github.com/cc-agents/cc-agents'
        local metadata_line="metadata:\n  openclaw:\n    emoji: \"$emoji\"\n    homepage: \"$homepage\""

        # Insert after description line
        sed -i '' "/^description:/a\\$metadata_line" "$skill_file"
        print_success "Added: metadata.openclaw to frontmatter"
    fi
}

# =============================================================================
# SECTION: Subagents (Claude Code only)
# =============================================================================

# Process subagents (note: no cross-platform standard exists)
process_subagents() {
    local plugin_dir="${PROJECT_ROOT}/plugins/${PLUGIN}"
    local subagents_dir="${plugin_dir}/subagents"

    if [ ! -d "$subagents_dir" ]; then
        print_info "No subagents directory found for ${PLUGIN}"
        return
    fi

    print_info "Processing subagents in ${subagents_dir}..."
    print_warning "  Note: Subagents have no cross-platform standard (Claude Code only)"

    local total=0

    for agent_file in "$subagents_dir"/*.md; do
        if [ -f "$agent_file" ]; then
            total=$((total + 1))
            local agent_name=$(basename "$agent_file" .md)
            print_info "  - $agent_name (Claude Code only)"
        fi
    done

    echo ""
    print_info "Subagents: $total (Claude Code specific - no cross-platform migration)"
}

# =============================================================================
# SECTION: Main
# =============================================================================

main() {
    parse_args "$@"
    print_header

    validate_environment

    echo "Plugin: ${PLUGIN}"
    echo "Targets: ${TARGETS}"
    echo "Component: ${COMPONENT}"
    echo "Mode: $([ "$DRY_RUN" = "true" ] && echo "DRY RUN" || echo "APPLY")"
    echo ""

    if [[ "$COMPONENT" == *"commands"* ]] || [ "$COMPONENT" = "all" ]; then
        process_commands
    fi

    if [[ "$COMPONENT" == *"skills"* ]] || [ "$COMPONENT" = "all" ]; then
        process_skills
    fi

    if [[ "$COMPONENT" == *"subagents"* ]] || [ "$COMPONENT" = "all" ]; then
        process_subagents
    fi

    echo ""
    print_success "Adaptation complete!"
    echo ""
    print_info "Next steps:"
    echo "  1. Review changes with --dry-run first"
    echo "  2. Run install-skills.sh to distribute to target agents"
    echo ""
    print_info "Platform adaptations applied:"
    echo "  - Claude Code: Skills 2.0 compliance (name, description, disable-model-invocation)"
    echo "  - Codex: agents/openai.yaml (UI chips, invocation policy)"
    echo "  - OpenClaw: metadata.openclaw in SKILL.md frontmatter"
}

main "$@"
