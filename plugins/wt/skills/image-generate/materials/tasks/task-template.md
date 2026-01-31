---
name: image-generation-{timestamp}
description: Generate AI image using rd2:super-coder fallback
status: pending
created_at: {timestamp}
method: rd2:super-coder
source_skill: wt:image-generate
---

# Task: Image Generation (Fallback)

## Background

MCP huggingface unavailable or failed. Using rd2:super-coder as fallback for image generation.

## Requirements

Generate an image based on the following specifications:

### Image Specifications

```yaml
prompt: "{enhanced_prompt}"
style: "{style}"
resolution: "{width}x{height}"
output: "{output_path}"
cache: "{cache_path}"
```

### Enhanced Prompt

```
{enhanced_prompt}
```

### Style Modifiers Applied

```
{style_modifiers}
```

## Implementation Approach

Use rd2:super-coder with appropriate tool selection:

1. **Tool Selection**: Use image generation tools (agy, gemini, etc.)
2. **Prompt**: Use the enhanced prompt with style modifiers
3. **Resolution**: Generate at specified resolution
4. **Output**: Save to specified output path

## Success Criteria

- [ ] Image generated successfully
- [ ] Resolution matches specification
- [ ] Image saved to output path
- [ ] Style modifiers applied
- [ ] Return output path to caller

## Error Handling

- If generation fails: Log error, report to caller
- If resolution doesn't match: Retry with correct dimensions
- If output path invalid: Validate and report to caller

## References

- Original prompt: {original_prompt}
- Style: {style}
- Timestamp: {timestamp}
