# codex.sh - Codex MCP Server tool module
#
# This module defines the configuration and hooks for syncing to Codex MCP Server.
#
# Codex is an MCP (Model Context Protocol) server that provides AI coding
# capabilities through the MCP protocol, not a traditional CLI tool.

# Tool display name (for user-facing messages)
TOOL_DISPLAY_NAME="Codex MCP Server"

# Default features for this tool
DEFAULT_FEATURES="*"

# Supported features (comma-separated)
# Codex MCP doesn't use rulesync - features are available via MCP protocol
SUPPORTED_FEATURES="mcp"

# Get tool config information
get_tool_config() {
    cat << EOF
Tool: Codex MCP Server
Type: MCP Server
Protocol: Model Context Protocol (MCP)

Features:
  - MCP Server: Provides tools via MCP protocol
  - No config files: Uses MCP for configuration
  - Direct access: Plugins available via MCP tools

MCP Tools:
  - mcp__codex__codex: Run Codex sessions

Notes:
  - Codex doesn't use rulesync (it's an MCP server)
  - Plugins are accessible directly via MCP protocol
  - No generated config files
EOF
}

# Pre-sync hook (optional)
pre_sync() {
    # No pre-sync actions needed for Codex MCP
    :
}

# Post-sync hook (optional)
post_sync() {
    echo
    print_info "Codex MCP server is available via MCP protocol"
    echo ""
    echo "Available MCP tools:"
    echo "  • mcp__codex__codex - Run Codex sessions"
    echo ""
    echo "To use Codex:"
    echo "  mcp-server-name start codex"
}
