#!/bin/bash
# Validation functions for setup-all.sh

# Check if rulesync is available
check_rulesync() {
    if command -v rulesync &> /dev/null; then
        return 0
    elif npx --yes rulesync --version &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Validate tool names
validate_tools() {
    local tools="$1"
    local valid_tools="antigravity geminicli auggie opencode codexcli claudecode cursor cline copilot"

    IFS=',' read -ra TOOL_ARRAY <<< "$tools"
    for tool in "${TOOL_ARRAY[@]}"; do
        tool=$(echo "$tool" | xargs) # trim whitespace
        if [[ ! " $valid_tools " =~ " $tool " ]]; then
            echo "❌ Invalid tool: $tool"
            echo "Valid tools: $valid_tools"
            return 1
        fi
    done
    return 0
}

# Validate feature names
validate_features() {
    local features="$1"
    local valid_features="rules ignore mcp commands subagents skills"

    IFS=',' read -ra FEATURE_ARRAY <<< "$features"
    for feature in "${FEATURE_ARRAY[@]}"; do
        feature=$(echo "$feature" | xargs) # trim whitespace
        if [[ ! " $valid_features " =~ " $feature " ]]; then
            echo "❌ Invalid feature: $feature"
            echo "Valid features: $valid_features"
            return 1
        fi
    done
    return 0
}

# Check if .rulesync directory exists
check_rulesync_dir() {
    if [ ! -d ".rulesync" ]; then
        echo "⚠️  .rulesync directory not found"
        echo "   Run 'npx rulesync init' first"
        return 1
    fi
    return 0
}

# Print validation error and exit
validation_error() {
    local message="$1"
    echo "❌ Validation Error: $message"
    exit 1
}
