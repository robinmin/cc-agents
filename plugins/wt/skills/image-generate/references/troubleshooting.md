# Image Generation Troubleshooting Guide

This guide covers common issues and their solutions when using the image generation skill.

## API Key Problems

### HuggingFace API Token Missing

**Error**: `HUGGINGFACE_API_TOKEN environment variable not set`

**Solution**:
```bash
# Set environment variable
export HUGGINGFACE_API_TOKEN="your_token_here"

# Or add to .env file
echo "HUGGINGFACE_API_TOKEN=your_token_here" >> .env
```

**Get a token**: Visit https://huggingface.co/settings/tokens

### Gemini API Key Missing

**Error**: `GEMINI_API_KEY environment variable not set`

**Solution**:
```bash
# Set environment variable
export GEMINI_API_KEY="your_api_key_here"

# Or add to .env file
echo "GEMINI_API_KEY=your_api_key_here" >> .env
```

**Get a key**: Visit https://makersuite.google.com/app/apikey

### Invalid API Token

**Error**: `401 Unauthorized` or `Invalid API token`

**Solution**:
1. Verify token is correct at provider dashboard
2. Check token has required permissions (read/write for models)
3. Regenerate token if expired
4. Ensure no extra whitespace in token value

## Backend Selection Issues

### MCP Backend Not Available

**Error**: `MCP huggingface service not available`

**Solution**: The framework automatically falls back to rd2:super-coder. To manually fix:

1. Check MCP server is running:
   ```bash
   # Check MCP huggingface server status
   mcp list
   ```

2. Restart MCP server if needed

3. Use explicit backend selection:
   ```bash
   python scripts/image_generator.py --backend gemini --prompt "..."
   ```

### Backend Priority Order

When no backend is explicitly specified, the framework tries:

1. **huggingface** - Primary (requires `HUGGINGFACE_API_TOKEN`)
2. **gemini** - Fallback (requires `GEMINI_API_KEY`)
3. **nano_banana** - Last resort (requires MCP HuggingFace)

Force a specific backend:
```bash
python scripts/image_generator.py --backend gemini ...
```

## Resolution Mapping

### Unsupported Resolution

**Error**: `Resolution not supported by backend`

**Solution**:

**HuggingFace/Stable Diffusion**: Supports any resolution
- May need to adjust for aspect ratio

**Gemini Imagen**: Limited aspect ratios
- Supported: 1:1, 4:3, 3:4, 16:9, 9:16
- Use closest match: `1024x1024` (1:1), `1024x768` (4:3)

**nano_banana**: 30+ predefined resolutions
- Auto-maps to closest supported size
- Common resolutions: `1024x1024`, `1152x896`, `896x1152`

### Resolution Auto-Mapping

When using `nano_banana`, resolutions are automatically mapped:

| Requested | Mapped To |
|-----------|-----------|
| 1920x1080 | 1536x640 (ultrawide) |
| 1920x817 | 1536x640 (ultrawide) |
| 1080x1080 | 1024x1024 (square) |
| 800x600 | 768x1024 (portrait) |

### MCP Resolution Format Error (Z-Image Turbo)

**Error**: `MCP error -32602: Input validation error: Invalid enum value`

**Symptoms**:
```
"received": "1280x720 (16:9)"
Expected: "1280x720 ( 16:9 )"
```

**Root Cause**: The Z-Image Turbo MCP tool requires resolution strings with **exactly TWO spaces** before the opening parenthesis and after the colon.

**Solution**: Use the correct format with two spaces:

| Incorrect Format | Correct Format |
|-----------------|----------------|
| `"1280x720 (16:9)"` | `"1280x720 ( 16:9 )"` |
| `"1920x817 (21:9)"` | `"1920x817 ( 21:9 )"` |
| `"1024x1024 (1:1)"` | `"1024x1024 ( 1:1 )"` |

**Best Practice**: Use `NanoBananaBackend.get_mcp_params()` or the `RESOLUTION_MAP` from `image_generator.py` to ensure correct formatting:

```python
from scripts.image_generator import NanoBananaBackend

backend = NanoBananaBackend()
resolution_str = backend._find_closest_resolution((1280, 720))
# Returns: "1280x720 ( 16:9 )"  (correctly formatted)
```

## Template Issues

### Template Not Found

**Error**: `Template 'xyz' not found`

**Solution**:
```bash
# List available templates
python scripts/image_generator.py --list-templates

# Check template locations
# 1. Project: .image-templates/
# 2. Skill: assets/templates/
```

### Invalid Template YAML

**Error**: `Invalid YAML in template frontmatter`

**Solution**: Validate YAML structure:
```yaml
---
name: mytemplate      # Required
description: "Desc"   # Required
width: 1024           # Required (integer)
height: 1024          # Required (integer)
style: vibrant        # Required
---
```

### Variable Not Substituted

**Error**: Output still contains `{{variable}}` literals

**Solution**:
1. Ensure variable is defined in template frontmatter
2. Provide value via `--var variable=value`
3. Or define default value in template: `{{variable | default}}`

## Output Path Issues

### Directory Does Not Exist

**Error**: `Output directory does not exist`

**Solution**:
```bash
# Create directory first
mkdir -p output/images

# Or use full path with auto-creation
python scripts/image_generator.py --output output/images/file.png
```

### Permission Denied

**Error**: `Permission denied when writing to output path`

**Solution**:
1. Check directory permissions: `ls -la`
2. Ensure write access: `chmod +w output/`
3. Try different output location

## Generation Quality Issues

### Poor Image Quality

**Symptoms**: Blurry, low detail, not matching prompt

**Solutions**:

1. **Increase inference steps**:
   ```bash
   --steps 50  # Default: 30-50
   ```

2. **Enhance prompt**:
   ```bash
   --prompt "subject, highly detailed, 8K, professional quality, sharp focus"
   ```

3. **Use different backend**:
   ```bash
   --backend huggingface  # Usually better quality than nano_banana
   ```

4. **Try different style**:
   ```bash
   --style photorealistic  # Instead of vibrant
   ```

### Prompt Not Reflected in Image

**Symptoms**: Generated image doesn't match prompt description

**Solutions**:

1. **Simplify prompt** - Focus on key elements
2. **Use style modifiers** - Add relevant style keywords
3. **Add content context** - Use `--content` flag with article text
4. **Try different model** - Switch backend

## Timeout Issues

### API Request Timeout

**Error**: `Request timeout after N seconds`

**Solution**:
```bash
# Increase timeout
--timeout 120  # Default: 60 seconds

# Or use faster backend
--backend nano_banana  # Fastest (1-20 steps)
```

### MCP Server Timeout

**Error**: `MCP server not responding`

**Solution**:
1. Check MCP server status: `mcp list`
2. Restart MCP server if needed
3. Fall back to alternative backend: `--backend gemini`

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `No API token available` | Missing environment variable | Set `HUGGINGFACE_API_TOKEN` or `GEMINI_API_KEY` |
| `Module 'xxx' not found` | Missing Python dependencies | Run `uv add xxx` or `pip install xxx` |
| `Invalid resolution` | Unsupported resolution for backend | Check backend docs, use supported resolution |
| `Template not found` | Template file missing | Use `--list-templates` to see available |
| `Permission denied` | Cannot write to output path | Create directory or check permissions |

## Getting Help

For issues not covered here:

1. Check backend documentation (HuggingFace, Gemini Imagen)
2. Verify template syntax with `--list-templates`
3. Try simpler prompt first to isolate issue
4. Check environment variables are set: `env | grep API`

## Debug Mode

Enable verbose output for troubleshooting:

```bash
# Python backend with debug
python scripts/image_generator.py --debug --prompt "..."

# Check what backend is being used
python scripts/image_generator.py --verbose ...
```
