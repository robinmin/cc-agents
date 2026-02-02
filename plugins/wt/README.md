# WT Plugin Configuration Guide

The wt (technical content) plugin supports centralized configuration via `~/.claude/wt/config.jsonc`.

## Quick Setup

### 1. Create Configuration Directory

```bash
mkdir -p ~/.claude/wt
```

### 2. Copy Example Configuration

```bash
# From the plugin directory
cp plugins/wt/skills/technical-content-creation/assets/config.example.jsonc ~/.claude/wt/config.jsonc
```

### 3. Edit Configuration

```bash
# Edit with your preferred editor
nano ~/.claude/wt/config.jsonc
# or
code ~/.claude/wt/config.jsonc
```

## Configuration Structure

```jsonc
{
  // Environment variables (auto-injected into wt scripts)
  "env": {
    "HUGGINGFACE_API_TOKEN": "your-token-here",
    "GEMINI_API_KEY": "your-key-here"
  },

  // Image generation settings
  "image_generation": {
    "backend": "nano_banana",
    "default_resolution": "1024x1024",
    "default_steps": 8
  },

  // Content generation settings
  "content_generation": {
    "default_style": "technical-writer",
    "default_research_type": "systematic",
    "max_article_words": 5000
  },

  // Publishing settings
  "publishing": {
    "default_platforms": ["blog", "twitter", "linkedin"],
    "publish_branch": "main"
  }
}
```

## Getting API Keys

### HuggingFace API Token

1. Go to: https://huggingface.co/settings/tokens
2. Click "New token"
3. Select "Read" permissions for inference API
4. Copy token to config: `HUGGINGFACE_API_TOKEN`

### Google Gemini API Key

1. Go to: https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy key to config: `GEMINI_API_KEY`

### Install Dependencies (if using Gemini backend)

```bash
cd /path/to/cc-agents
uv add google-genai
```

## Validation

Validate your configuration:

```bash
python plugins/wt/skills/technical-content-creation/scripts/config_loader.py validate
```

Show current configuration:

```bash
python plugins/wt/skills/technical-content-creation/scripts/config_loader.py show
```

## Backend Selection

The plugin tries backends in this order:

1. **nano_banana** (Z-Image Turbo via MCP) - Highest quality, fast
2. **huggingface** (Stable Diffusion XL) - Good quality
3. **gemini** (Google Imagen) - Good alternative

To override per-request, use the `--backend` parameter:

```bash
wt:image-generate "A landscape" --backend gemini --output image.png
```

## Language Support

The wt plugin supports multi-language content generation with automatic filename suffixing:

| Language Code | Language | Filename Suffix | Emoji |
|--------------|----------|-----------------|-------|
| `en` | English | `_en` | 🇬🇧 |
| `cn` | Chinese (Simplified) | `_cn` | 🇨🇳 |
| `jp` | Japanese | `_jp` | 🇯🇵 |

### Setting Language in Config

Add to your `~/.claude/wt/config.jsonc`:

```jsonc
{
  "content_generation": {
    "default_language": "en"
  }
}
```

### Output Filenames

Articles are automatically named with language suffix:

```
6-publish/
├── article_en.md  # English version
├── article_cn.md  # Chinese version
└── article_jp.md  # Japanese version
```

### Language Aliases

Alternative codes that map to the same language:
- `zh` → `cn` (Chinese)
- `ja` → `jp` (Japanese)

## Troubleshooting

### Config file not loading

Check the config file path:
```bash
python plugins/wt/skills/technical-content-creation/scripts/config_loader.py path
```

### API errors

- Verify API keys are correct (no extra spaces)
- Check API key has proper permissions
- Ensure dependencies are installed: `uv add requests Pillow google-genai`

### MCP tool errors (nano_banana)

Ensure HuggingFace MCP server is configured in `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "huggingface": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-huggingface"]
    }
  }
}
```
