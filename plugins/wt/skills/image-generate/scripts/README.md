# Image Generate Scripts

Python wrapper scripts for HuggingFace image generation API integration.

## Files

- `huggingface_image_generator.py` - Main wrapper for HuggingFace text-to-image API

## Installation

```bash
# Install dependencies
pip install requests Pillow

# Set up API token
export HUGGINGFACE_API_TOKEN="your_token_here"

# Or create .env file
echo "HUGGINGFACE_API_TOKEN=your_token_here" > .env
```

## Usage

```bash
python huggingface_image_generator.py \
  "A beautiful sunset over mountains" \
  --output sunset.png \
  --resolution 1920x1080

# With custom model
python huggingface_image_generator.py \
  "Technical diagram of microservices" \
  --output diagram.png \
  --model "stabilityai/stable-diffusion-xl-base-1.0" \
  --style technical-diagram

# Cover image (2.35:1)
python huggingface_image_generator.py \
  "Article cover about AI" \
  --output cover.png \
  --resolution 1920x817
```

## Common Resolutions

| Resolution | Aspect Ratio | Use Case |
|------------|--------------|----------|
| 1024x1024 | 1:1 | Social media, square images |
| 1920x1080 | 16:9 | Blog headers, wide images |
| 800x600 | 4:3 | Inline illustrations |
| 1280x720 | 16:9 | YouTube thumbnails |
| 1080x1080 | 1:1 | Instagram, LinkedIn |
| 1920x817 | 2.35:1 | Cinematic covers |

## API Token

Get your HuggingFace API token at: https://huggingface.co/settings/tokens

Set via environment variable:
```bash
export HUGGINGFACE_API_TOKEN="your_token_here"
```

Or `.env` file:
```
HUGGINGFACE_API_TOKEN=your_token_here
```

## Error Handling

The script includes automatic retry logic:
- 3 retries with exponential backoff
- Handles model loading (503) responses
- Timeout protection (default 60s)

## Integration

This script is called by the `wt:image-generate` skill for MCP huggingface integration.
