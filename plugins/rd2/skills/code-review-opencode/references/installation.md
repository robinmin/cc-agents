# OpenCode CLI Installation

How to install and configure OpenCode CLI for use with code-review-opencode.

## Prerequisites

- Node.js 16+ or Python 3.8+
- OpenCode account (free tier available)
- API key or authentication setup

## Installation Methods

### Method 1: NPM (Recommended)

```bash
npm install -g @opencode/cli
opencode --version
```

### Method 2: Python pip

```bash
pip install opencode-cli
opencode --version
```

### Method 3: Binary Download

Visit https://opencode.ai/docs/cli/ and download the appropriate binary for your platform.

## Authentication

### Step 1: Login

```bash
opencode auth login
```

This will open a browser window for authentication.

### Step 2: Verify

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py check
```

Expected output:
```
✓ OpenCode CLI is available
Version: 1.0.0
Authenticated: yes
```

## Configuration

### Set Default Model

```bash
opencode config set model claude-opus
```

### Configure API Key (if needed)

```bash
opencode config set api-key YOUR_API_KEY
```

## Troubleshooting

### Command Not Found

```bash
# Check installation
which opencode

# Add to PATH if needed
export PATH="$PATH:$(npm config get prefix)/bin"
```

### Authentication Issues

```bash
# Logout and login again
opencode auth logout
opencode auth login

# Check auth status
opencode auth status
```

### Version Compatibility

code-review-opencode requires OpenCode CLI >= 1.0.0. Check version:

```bash
opencode --version
```

## Account Setup

### Free Tier

- 100 reviews per month
- Access to GPT-3.5 and Claude Haiku
- Community support

### Pro Tier ($29/month)

- Unlimited reviews
- Access to all models (GPT-4, Claude Opus, Gemini Pro)
- Priority support

See https://opencode.ai/pricing/ for current plans.
