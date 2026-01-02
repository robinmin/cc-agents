#!/usr/bin/env bash

# Tasks Management Tool
# Location: plugins/rd/scripts/prompts.sh

PROMPTS_DIR="docs/prompts"
KANBAN_FILE="$PROMPTS_DIR/.kanban.md"
TEMPLATE_FILE="$PROMPTS_DIR/.template.md"

# Ensure we are running from the project root or adjust paths accordingly
# We take current working directory as the PROJECT_ROOT
PROJECT_ROOT="$(pwd)"

# Determine script location for symlink
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_PATH="$SCRIPT_DIR/prompts.sh"

# Adjust PROMPTS_DIR to be absolute
PROMPTS_DIR="$PROJECT_ROOT/docs/prompts"
KANBAN_FILE="$PROMPTS_DIR/.kanban.md"
TEMPLATE_FILE="$PROMPTS_DIR/.template.md"

function validate_project_root() {
    if [ ! -d "$PROJECT_ROOT/.git" ]; then
        log_error "Not a valid project root (no .git directory found). Please run from the root of your git repository."
        exit 1
    fi
}

function validate_stage() {
    local stage="$1"
    # Valid stages
    case "$stage" in
        Backlog|Todo|WIP|Testing|Done)
            ;;
        *)
            log_error "Invalid stage: '$stage'. Valid stages are: Backlog, Todo, WIP, Testing, Done."
            exit 1
            ;;
    esac
}

function log_info() {
    echo -e "\033[1;32m[INFO]\033[0m $1"
}

function log_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

function check_dependencies() {
    if ! command -v glow &> /dev/null; then
        log_error "glow is not installed. Please install it using 'brew install glow'."
        exit 1
    fi
}

function cmd_init() {
    log_info "Initializing tasks management tool..."

    # Create prompts directory
    if [ ! -d "$PROMPTS_DIR" ]; then
        mkdir -p "$PROMPTS_DIR"
        log_info "Created directory: $PROMPTS_DIR"
    else
        log_info "Directory already exists: $PROMPTS_DIR"
    fi

    # Create .kanban.md
    if [ ! -f "$KANBAN_FILE" ]; then
        cat > "$KANBAN_FILE" <<EOF
---
kanban-plugin: board
---

# Kanban Board

## Backlog

## Todo

## WIP

## Testing

## Done

EOF
        log_info "Created kanban board: $KANBAN_FILE"
    else
        log_info "Kanban board already exists: $KANBAN_FILE"
    fi

    # Create .template.md
    if [ ! -f "$TEMPLATE_FILE" ]; then
        cat > "$TEMPLATE_FILE" <<EOF
---
name: {{PROMPT_NAME}}
description: <prompt description>
status: Backlog
created_at: {{CREATED_AT}}
updated_at: {{UPDATED_AT}}
---

## {{PROMPT_NAME}}

### Background

### Requirements / Objectives

### Solutions / Goals

### References
EOF
        log_info "Created template file: $TEMPLATE_FILE"
    else
        log_info "Template file already exists: $TEMPLATE_FILE"
    fi

    check_dependencies
    
    # Create soft link to /opt/homebrew/bin/tasks
    if [ ! -L "/opt/homebrew/bin/tasks" ] && [ ! -f "/opt/homebrew/bin/tasks" ]; then
        log_info "Creating soft link /opt/homebrew/bin/tasks..."
        if ln -s "$SCRIPT_PATH" /opt/homebrew/bin/tasks 2>/dev/null; then
             log_info "Soft link created successfully."
        else
             log_error "Failed to create soft link. Permission denied?"
             log_info "You can try running: sudo ln -s \"$SCRIPT_PATH\" /opt/homebrew/bin/tasks"
        fi
    else
        log_info "Soft link /opt/homebrew/bin/tasks already exists."
    fi

    log_info "Initialization complete."
}

function get_status() {
    local file="$1"
    # Extract status from frontmatter. Assumes "status: value" format.
    # Use grep to find the line, then cut or awk to get the value.
    # We need to handle potential whitespace.
    local status=$(grep "^status:" "$file" | head -n 1 | sed 's/^status:[[:space:]]*//')
    echo "$status"
}

function cmd_refresh() {
    log_info "Refreshing Kanban board..."
    
    if [ ! -f "$KANBAN_FILE" ]; then
        log_error "Kanban file not found. Run 'init' first."
        exit 1
    fi

    # Temporary files for each stage
    local tmp_dir=$(mktemp -d)
    touch "$tmp_dir/Backlog" "$tmp_dir/Todo" "$tmp_dir/WIP" "$tmp_dir/Testing" "$tmp_dir/Done"

    # Iterate over all markdown files in PROMPTS_DIR, excluding dotfiles
    # We use nullglob to handle case where no files exist
    shopt -s nullglob
    for file in "$PROMPTS_DIR"/*.md; do
        filename=$(basename "$file")
        # Skip dotfiles (like .kanban.md, .template.md)
        if [[ "$filename" == .* ]]; then
            continue
        fi

        status=$(get_status "$file")
        # Default to Backlog if status is missing or invalid
        if [[ -z "$status" ]]; then
            status="Backlog"
        fi

        # Map status to file. Handle case sensitivity if needed, but for now assume exact match.
        # We need to handle spaces in status names (e.g., "To Do", "In Progress")
        # Check if the status file exists in tmp_dir
        if [ -f "$tmp_dir/$status" ]; then
             # Determine checkbox state based on status
            local checkbox=" "
            if [[ "$status" == "WIP" ]]; then
                checkbox="."
            elif [[ "$status" == "Testing" ]]; then
                checkbox="."
            elif [[ "$status" == "Done" ]]; then
                checkbox="x"
            fi
            
            # Format: - [ ] <filename_without_extension>
            # The requirement example shows: - [ ] 001_Prompt1
            local name_no_ext="${filename%.md}"
            echo "- [$checkbox] $name_no_ext" >> "$tmp_dir/$status"
        else
            log_error "Unknown status '$status' in file '$filename'. Skipping."
        fi
    done
    shopt -u nullglob

    # Rebuild .kanban.md
    cat > "$KANBAN_FILE" <<EOF
---
kanban-plugin: board
---

# Kanban Board

## Backlog

$(cat "$tmp_dir/Backlog")

## Todo

$(cat "$tmp_dir/Todo")

## WIP

$(cat "$tmp_dir/WIP")

## Testing

$(cat "$tmp_dir/Testing")

## Done

$(cat "$tmp_dir/Done")

EOF

    rm -rf "$tmp_dir"
    log_info "Kanban board updated."
}

function cmd_create() {
    local prompt_name="$1"
    if [ -z "$prompt_name" ]; then
        log_error "Please provide a task name."
        echo "Usage: tasks create <task name>"
        exit 1
    fi

    validate_project_root
    if [ ! -d "$PROMPTS_DIR" ]; then
        log_error "Prompts directory not found at $PROMPTS_DIR. Please run from project root or run 'init'."
        exit 1
    fi

    # Calculate next WBS number
    # Count non-dot files
    local count=0
    shopt -s nullglob
    for file in "$PROMPTS_DIR"/*.md; do
        if [[ "$(basename "$file")" != .* ]]; then
            ((count++))
        fi
    done
    shopt -u nullglob

    local next_seq=$((count + 1))
    local wbs=$(printf "%04d" "$next_seq")
    
    # Sanitize prompt name for filename (replace spaces with underscores)
    local filename_safe_name="${prompt_name// /_}"
    local filename="${wbs}_${filename_safe_name}.md"
    local filepath="$PROMPTS_DIR/$filename"

    if [ -f "$filepath" ]; then
        log_error "File already exists: $filepath"
        exit 1
    fi

    # Create file from template
    if [ -f "$TEMPLATE_FILE" ]; then
        cp "$TEMPLATE_FILE" "$filepath"
        # Replace placeholders
        # We use sed with | as delimiter. 
        # Note: prompt_name might contain slashes or special chars.
        # We assume prompt_name doesn't contain the delimiter '|'.
        
        # Handle both {{KEY}} and { { KEY } } formats to be robust
        # But user specifically asked for { { KEY } } support based on their edit.
        # We will try to replace both styles.
        
        # PROMPT_NAME
        sed -i '' "s|{{PROMPT_NAME}}|$prompt_name|g" "$filepath"
        sed -i '' "s|{ { PROMPT_NAME } }|$prompt_name|g" "$filepath"
        
        # WBS
        sed -i '' "s|{{WBS}}|$wbs|g" "$filepath"
        sed -i '' "s|{ { WBS } }|$wbs|g" "$filepath"
        
        # Set created_at and updated_at
        local now=$(date "+%Y-%m-%d %H:%M:%S")
        sed -i '' "s|{{CREATED_AT}}|$now|g" "$filepath"
        sed -i '' "s|{ { CREATED_AT } }|$now|g" "$filepath"
        
        sed -i '' "s|{{UPDATED_AT}}|$now|g" "$filepath"
        sed -i '' "s|{ { UPDATED_AT } }|$now|g" "$filepath"
    else
        log_error "Template file not found: $TEMPLATE_FILE"
        exit 1
    fi

    log_info "Created prompt: $filepath"
    
    # Refresh Kanban
    cmd_refresh
}

function cmd_help() {
    echo "Usage: tasks <subcommand> [arguments]"
    echo ""
    echo "Subcommands:"
    echo "  init                     Initialize the tasks management tool"
    echo "  create <task name>       Create a new task"
    echo "  list [stage]             List tasks (optionally filter by stage)"
    echo "  update <WBS> <stage>     Update a task's stage"
    echo "  refresh                  Refresh the kanban board"
    echo "  help                     Show this help message"
}

# Main dispatcher


function cmd_list() {
    local stage="$1"
    
    if [ ! -f "$KANBAN_FILE" ]; then
        log_error "Kanban file not found. Run 'init' first."
        exit 1
    fi

    if [ -z "$stage" ]; then
        # List all
        glow "$KANBAN_FILE"
    else
        validate_stage "$stage"
        
        # List specific stage
        # We need to extract the section.
        # Assuming stages are headers level 2 (## Stage)
        # We use awk to print from "## Stage" to next "##" or end of file.
        # Note: We need to match the stage name exactly or case-insensitively?
        # Let's try exact match first.
        
        # Check if stage exists in the file
        if ! grep -q "## $stage" "$KANBAN_FILE"; then
            log_error "Stage '$stage' not found in Kanban board."
            # List available stages?
            return 1
        fi

        # Extract section
        # awk flag to print: p
        # When match "## Stage", set p=1.
        # When match "## " (next header) AND we are already printing, set p=0.
        # But we want to print the header "## Stage" too? Yes.
        # And we want to stop BEFORE the next header.
        
        awk -v stage="$stage" '
            BEGIN { p=0 }
            /^## / {
                if ($0 == "## " stage) {
                    p=1
                    print
                    next
                } else if (p==1) {
                    p=0
                    exit
                }
            }
            p==1 { print }
        ' "$KANBAN_FILE" | glow
    fi
}

function cmd_update() {
    local wbs="$1"
    local stage="$2"

    if [ -z "$wbs" ] || [ -z "$stage" ]; then
        log_error "Usage: tasks update <WBS> <stage>"
        exit 1
    fi

    validate_stage "$stage"

    if [ ! -d "$PROMPTS_DIR" ]; then
        log_error "Prompts directory not found. Run 'init' first."
        exit 1
    fi

    # Find file by WBS
    # WBS is 4 digits.
    # We search for files starting with WBS_
    local files=("$PROMPTS_DIR/${wbs}_"*.md)
    
    # Check if file exists
    if [ ! -e "${files[0]}" ]; then
        log_error "No task found with WBS: $wbs"
        exit 1
    fi

    if [ ${#files[@]} -gt 1 ]; then
        log_error "Multiple files found for WBS: $wbs. This shouldn't happen."
        exit 1
    fi

    local file="${files[0]}"
    
    # Update status
    # We use sed to replace the status line.
    # Assuming "status: OldStatus"
    # We need to be careful if status is not found.
    
    if grep -q "^status:" "$file"; then
        sed -i '' "s/^status: .*/status: $stage/" "$file"
        log_info "Updated status of $(basename "$file") to '$stage'"
        
        # Set updated_at
        local now=$(date "+%Y-%m-%d %H:%M:%S")
        sed -i '' "s/^updated_at: .*/updated_at: $now/" "$file"
        
        cmd_refresh
    else
        log_error "Status field not found in $(basename "$file")"
        exit 1
    fi
}

function cmd_open() {
    local wbs="$1"

    if [ -z "$wbs" ]; then
        log_error "Usage: tasks open <WBS>"
        exit 1
    fi

    if [ ! -d "$PROMPTS_DIR" ]; then
        log_error "Prompts directory not found. Run 'init' first."
        exit 1
    fi

    # Find file by WBS
    local files=("$PROMPTS_DIR/${wbs}_"*.md)

    # Check if file exists
    if [ ! -e "${files[0]}" ]; then
        log_error "No task found with WBS: $wbs"
        exit 1
    fi

    if [ ${#files[@]} -gt 1 ]; then
        log_error "Multiple files found for WBS: $wbs. This shouldn't happen."
        exit 1
    fi

    local file="${files[0]}"
    log_info "Opening: $file"
    open "$file"
}

function cmd_help() {
    echo "Usage: tasks <subcommand> [arguments]"
    echo ""
    echo "Subcommands:"
    echo "  init                     Initialize the tasks management tool"
    echo "  create <task name>       Create a new task"
    echo "  list [stage]             List tasks (optionally filter by stage)"
    echo "  update <WBS> <stage>     Update a task's stage"
    echo "  open <WBS>               Open a task file in default editor"
    echo "  refresh                  Refresh the kanban board"
    echo "  help                     Show this help message"
}

# Main dispatcher
# Main dispatcher
case "$1" in
    init)
        validate_project_root
        cmd_init
        ;;
    create)
        validate_project_root
        if [ ! -d "$PROMPTS_DIR" ]; then
            log_error "Prompts directory not found at $PROMPTS_DIR. Please run from project root or run 'init'."
            exit 1
        fi
        cmd_create "$2"
        ;;
    list)
        validate_project_root
        if [ ! -d "$PROMPTS_DIR" ]; then
            log_error "Prompts directory not found at $PROMPTS_DIR. Please run from project root or run 'init'."
            exit 1
        fi
        cmd_list "$2"
        ;;
    update)
        validate_project_root
        if [ ! -d "$PROMPTS_DIR" ]; then
            log_error "Prompts directory not found at $PROMPTS_DIR. Please run from project root or run 'init'."
            exit 1
        fi
        cmd_update "$2" "$3"
        ;;
    refresh)
        validate_project_root
        if [ ! -d "$PROMPTS_DIR" ]; then
            log_error "Prompts directory not found at $PROMPTS_DIR. Please run from project root or run 'init'."
            exit 1
        fi
        cmd_refresh
        ;;
    open)
        validate_project_root
        if [ ! -d "$PROMPTS_DIR" ]; then
            log_error "Prompts directory not found at $PROMPTS_DIR. Please run from project root or run 'init'."
            exit 1
        fi
        cmd_open "$2"
        ;;
    help|*)
        cmd_help
        ;;
esac
