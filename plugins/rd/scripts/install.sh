#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# Claude Code Expert Agent Suite - Tool Installation Script
# ═══════════════════════════════════════════════════════════════════════════════
#
# This script installs all necessary linting and formatting tools required by
# the PostToolUse hooks for automatic code quality enforcement.
#
# Tools installed:
#   - Biome (JS/TS/JSON) - Rust-based, fast
#   - Ruff + ty (Python) - Rust-based linter and type checker
#   - golangci-lint + gofumpt (Go) - Comprehensive linting
#   - rustfmt + clippy (Rust) - Standard Rust tools
#   - markdownlint-cli2 (Markdown) - Fast markdown linting
#   - yamlfmt + yamllint (YAML) - Formatting and linting
#   - sqruff (SQL) - Rust-based SQL formatter
#   - prettier + stylelint (HTML/CSS) - Web formatting
#   - taplo (TOML) - Rust-based TOML formatter
#   - shfmt + shellcheck (Shell) - Shell script tools
#   - hadolint (Dockerfile) - Dockerfile linter
#
# Usage:
#   ./install.sh [OPTIONS]
#
# Options:
#   --all         Install all tools (default)
#   --check       Check which tools are installed
#   --minimal     Install only essential tools (biome, ruff, shfmt)
#   --help        Show this help message
#
# ═══════════════════════════════════════════════════════════════════════════════

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

print_header() {
  echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}!${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_info() {
  echo -e "${BLUE}→${NC} $1"
}

# Check if a command exists
command_exists() {
  command -v "$1" &>/dev/null
}

# Check tool version
check_tool() {
  local tool="$1"
  local version_flag="${2:---version}"

  if command_exists "$tool"; then
    local version
    version=$("$tool" "$version_flag" 2>&1 | head -1) || version="installed"
    print_success "$tool: $version"
    return 0
  else
    print_error "$tool: not installed"
    return 1
  fi
}

# Install Homebrew if not present (macOS/Linux)
ensure_brew() {
  if ! command_exists brew; then
    print_info "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Add to PATH for Linux
    if [[ "$OS" == "Linux" ]]; then
      eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    fi
  fi
}

# Install Bun if not present
ensure_bun() {
  if ! command_exists bun; then
    print_info "Installing Bun..."
    if [[ "$OS" == "Darwin" ]]; then
      brew install oven-sh/bun/bun
    else
      curl -fsSL https://bun.sh/install | bash
      export PATH="$HOME/.bun/bin:$PATH"
    fi
  fi
  print_success "Bun is available"
}

# Install uv (Python package manager) if not present
ensure_uv() {
  if ! command_exists uv; then
    print_info "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
  fi
  print_success "uv is available"
}

# Install Rust if not present
ensure_rust() {
  if ! command_exists rustup; then
    print_info "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
  fi
  print_success "Rust is available"
}

# Install Go if not present
ensure_go() {
  if ! command_exists go; then
    print_info "Installing Go..."
    if [[ "$OS" == "Darwin" ]]; then
      brew install go
    else
      print_warning "Please install Go manually: https://go.dev/doc/install"
      return 1
    fi
  fi
  print_success "Go is available"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Tool Installation Functions
# ═══════════════════════════════════════════════════════════════════════════════

install_js_tools() {
  print_header "JavaScript/TypeScript Tools"
  ensure_bun

  print_info "Installing Biome (Rust-based JS/TS/JSON linter & formatter)..."
  bun install -g @biomejs/biome || true

  print_info "Installing eslint_d (fast ESLint daemon)..."
  bun install -g eslint_d || true

  print_info "Installing Prettier..."
  bun install -g prettier || true
}

install_python_tools() {
  print_header "Python Tools"
  ensure_uv

  print_info "Installing Ruff (Rust-based Python linter & formatter)..."
  uv tool install ruff || true

  print_info "Installing ty (Rust-based Python type checker)..."
  uv tool install ty || true
}

install_go_tools() {
  print_header "Go Tools"

  if ! ensure_go; then
    print_warning "Skipping Go tools installation"
    return
  fi

  print_info "Installing golangci-lint..."
  if [[ "$OS" == "Darwin" ]]; then
    brew install golangci-lint || true
  else
    go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest || true
  fi

  print_info "Installing gofumpt..."
  go install mvdan.cc/gofumpt@latest || true
}

install_rust_tools() {
  print_header "Rust Tools"
  ensure_rust

  print_info "Adding rustfmt and clippy..."
  rustup component add rustfmt clippy || true
}

install_markdown_tools() {
  print_header "Markdown Tools"
  ensure_bun

  print_info "Installing markdownlint-cli2..."
  bun install -g markdownlint-cli2 || true
}

install_yaml_tools() {
  print_header "YAML Tools"
  ensure_uv

  print_info "Installing yamlfmt..."
  if [[ "$OS" == "Darwin" ]]; then
    brew install yamlfmt || true
  else
    go install github.com/google/yamlfmt/cmd/yamlfmt@latest || true
  fi

  print_info "Installing yamllint..."
  uv tool install yamllint || true
}

install_sql_tools() {
  print_header "SQL Tools"

  print_info "Installing sqruff (Rust-based SQL formatter)..."
  if [[ "$OS" == "Darwin" ]]; then
    brew install sqruff || cargo install sqruff || true
  else
    cargo install sqruff || true
  fi
}

install_web_tools() {
  print_header "HTML/CSS Tools"
  ensure_bun

  print_info "Installing Prettier..."
  bun install -g prettier || true

  print_info "Installing Stylelint..."
  bun install -g stylelint || true

  print_info "Installing HTMLHint..."
  bun install -g htmlhint || true
}

install_toml_tools() {
  print_header "TOML Tools"

  print_info "Installing taplo (Rust-based TOML formatter)..."
  if [[ "$OS" == "Darwin" ]]; then
    brew install taplo || cargo install taplo-cli || true
  else
    cargo install taplo-cli || true
  fi
}

install_shell_tools() {
  print_header "Shell Script Tools"

  print_info "Installing shfmt..."
  if [[ "$OS" == "Darwin" ]]; then
    brew install shfmt || true
  else
    go install mvdan.cc/sh/v3/cmd/shfmt@latest || true
  fi

  print_info "Installing shellcheck..."
  if [[ "$OS" == "Darwin" ]]; then
    brew install shellcheck || true
  else
    sudo apt-get install -y shellcheck 2>/dev/null || brew install shellcheck || true
  fi
}

install_docker_tools() {
  print_header "Docker Tools"

  print_info "Installing hadolint (Dockerfile linter)..."
  if [[ "$OS" == "Darwin" ]]; then
    brew install hadolint || true
  else
    # Try brew on Linux, or download binary
    brew install hadolint 2>/dev/null || {
      print_info "Downloading hadolint binary..."
      curl -sL "https://github.com/hadolint/hadolint/releases/latest/download/hadolint-Linux-x86_64" -o /tmp/hadolint
      chmod +x /tmp/hadolint
      sudo mv /tmp/hadolint /usr/local/bin/hadolint || mv /tmp/hadolint "$HOME/.local/bin/hadolint"
    } || true
  fi
}

install_core_tools() {
  print_header "Core Development Tools"

  print_info "Installing git and gh..."
  if [[ "$OS" == "Darwin" ]]; then
    brew install git gh || true
  else
    sudo apt-get update && sudo apt-get install -y git || true
    # gh CLI installation for Linux
    if ! command_exists gh; then
      print_info "Installing GitHub CLI..."
      curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg 2>/dev/null
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list >/dev/null
      sudo apt-get update && sudo apt-get install -y gh || true
    fi
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# Main Functions
# ═══════════════════════════════════════════════════════════════════════════════

check_all_tools() {
  print_header "Checking Installed Tools"

  echo "Core:"
  check_tool git || true
  check_tool gh || true
  check_tool bun || true

  echo -e "\nJavaScript/TypeScript:"
  check_tool biome || true
  check_tool eslint_d || true
  check_tool prettier || true

  echo -e "\nPython:"
  check_tool ruff || true
  check_tool ty || true

  echo -e "\nGo:"
  check_tool golangci-lint || true
  check_tool gofumpt || true

  echo -e "\nRust:"
  check_tool rustfmt || true
  check_tool cargo-clippy "clippy --version" || check_tool clippy-driver || true

  echo -e "\nMarkdown:"
  check_tool markdownlint-cli2 || true

  echo -e "\nYAML:"
  check_tool yamlfmt || true
  check_tool yamllint || true

  echo -e "\nSQL:"
  check_tool sqruff || true

  echo -e "\nHTML/CSS:"
  check_tool stylelint || true
  check_tool htmlhint || true

  echo -e "\nTOML:"
  check_tool taplo || true

  echo -e "\nShell:"
  check_tool shfmt || true
  check_tool shellcheck || true

  echo -e "\nDocker:"
  check_tool hadolint || true
}

install_all() {
  print_header "Installing All Tools for Claude Code Expert Agent Suite"
  echo "OS: $OS ($ARCH)"
  echo ""

  # Ensure package managers
  if [[ "$OS" == "Darwin" ]]; then
    ensure_brew
  fi

  install_core_tools
  install_js_tools
  install_python_tools
  install_go_tools
  install_rust_tools
  install_markdown_tools
  install_yaml_tools
  install_sql_tools
  install_web_tools
  install_toml_tools
  install_shell_tools
  install_docker_tools

  print_header "Installation Complete!"
  echo "Run './install.sh --check' to verify all tools are installed."
}

install_minimal() {
  print_header "Installing Minimal Tools (Essential Only)"
  echo "OS: $OS ($ARCH)"
  echo ""

  ensure_bun
  ensure_uv

  print_info "Installing Biome..."
  bun install -g @biomejs/biome || true

  print_info "Installing Ruff..."
  uv tool install ruff || true

  print_info "Installing shfmt..."
  if [[ "$OS" == "Darwin" ]]; then
    brew install shfmt || true
  else
    go install mvdan.cc/sh/v3/cmd/shfmt@latest || true
  fi

  print_header "Minimal Installation Complete!"
}

show_help() {
  echo "Claude Code Expert Agent Suite - Tool Installation Script"
  echo ""
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --all       Install all tools (default)"
  echo "  --check     Check which tools are installed"
  echo "  --minimal   Install only essential tools (biome, ruff, shfmt)"
  echo "  --help      Show this help message"
  echo ""
  echo "Individual tool groups:"
  echo "  --js        Install JavaScript/TypeScript tools"
  echo "  --python    Install Python tools"
  echo "  --go        Install Go tools"
  echo "  --rust      Install Rust tools"
  echo "  --markdown  Install Markdown tools"
  echo "  --yaml      Install YAML tools"
  echo "  --sql       Install SQL tools"
  echo "  --web       Install HTML/CSS tools"
  echo "  --toml      Install TOML tools"
  echo "  --shell     Install Shell script tools"
  echo "  --docker    Install Docker tools"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Entry Point
# ═══════════════════════════════════════════════════════════════════════════════

main() {
  case "${1:-}" in
  --check)
    check_all_tools
    ;;
  --minimal)
    install_minimal
    ;;
  --help | -h)
    show_help
    ;;
  --js)
    install_js_tools
    ;;
  --python)
    install_python_tools
    ;;
  --go)
    install_go_tools
    ;;
  --rust)
    install_rust_tools
    ;;
  --markdown)
    install_markdown_tools
    ;;
  --yaml)
    install_yaml_tools
    ;;
  --sql)
    install_sql_tools
    ;;
  --web)
    install_web_tools
    ;;
  --toml)
    install_toml_tools
    ;;
  --shell)
    install_shell_tools
    ;;
  --docker)
    install_docker_tools
    ;;
  --all | "")
    install_all
    ;;
  *)
    print_error "Unknown option: $1"
    show_help
    exit 1
    ;;
  esac
}

main "$@"
