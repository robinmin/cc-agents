#!/bin/bash
# Rulesync wrapper functions for setup-all.sh

# Get rulesync command (use global if installed, otherwise npx)
get_rulesync_cmd() {
    if command -v rulesync &> /dev/null; then
        echo "rulesync"
    else
        echo "npx --yes rulesync"
    fi
}

# Run rulesync command
run_rulesync() {
    local targets="$1"
    local features="$2"
    local dry_run="$3"
    local verbose="${4:-false}"

    local cmd=$(get_rulesync_cmd)

    # Build command arguments
    local args=""
    if [ "$targets" != "*" ]; then
        args="$args --targets $targets"
    else
        args="$args --targets '*'"
    fi

    if [ "$features" != "*" ]; then
        args="$args --features $features"
    else
        args="$args --features '*'"
    fi

    if [ "$dry_run" = "true" ]; then
        echo "🔍 DRY RUN: Would execute:"
        echo "   $cmd generate $args"
        return 0
    fi

    if [ "$verbose" = "true" ]; then
        args="$args --verbose"
    fi

    echo "▶️  Running: $cmd generate $args"
    eval "$cmd generate $args"
    return $?
}

# Initialize rulesync if needed
init_rulesync() {
    local dry_run="$1"

    if [ -d ".rulesync" ]; then
        echo "✅ .rulesync directory already exists"
        return 0
    fi

    if [ "$dry_run" = "true" ]; then
        echo "🔍 DRY RUN: Would initialize rulesync"
        return 0
    fi

    echo "🔧 Initializing rulesync..."
    local cmd=$(get_rulesync_cmd)
    eval "$cmd init"
    return $?
}

# Import existing configurations
import_configs() {
    local targets="$1"
    local features="$2"
    local dry_run="$3"

    if [ "$dry_run" = "true" ]; then
        echo "🔍 DRY RUN: Would import configs for: $targets"
        return 0
    fi

    echo "📥 Importing existing configurations..."
    local cmd=$(get_rulesync_cmd)
    eval "$cmd import --targets $targets --features $features"
    return $?
}
