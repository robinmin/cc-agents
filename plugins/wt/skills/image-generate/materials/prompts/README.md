# Prompts Storage

This folder stores enhanced prompts used for image generation, organized by timestamp for traceability and iteration.

## Structure

```
prompts/
├── prompt-001.md          # Timestamped prompt logs
├── prompt-002.md
└── ...
```

## Prompt Format

Each prompt file contains:

```yaml
---
timestamp: ISO-8601
original_prompt: "user input"
style: "style-name"
resolution: "WIDTHxHEIGHT"
model: "model-used"
method: "mcp_huggingface" | "rd2_super_coder"
status: "success" | "failed"
output_path: "/path/to/output.png"
---

# Prompt: {timestamp}

## Original Prompt

{user input}

## Enhanced Prompt

{enhanced prompt with style modifiers}

## Style Modifiers

{style-specific modifiers applied}

## Parameters

- **Style**: {style}
- **Resolution**: {resolution}
- **Model**: {model}
- **Method**: {method}
- **Output**: {output_path}

## Result

- **Status**: {success/failed}
- **Output Path**: {actual output path}
- **Generation Time**: {duration}
- **Error**: {error message if failed}
```

## Usage

These logs help with:

1. **Traceability** - See what prompts generated what images
2. **Iteration** - Learn what works and refine prompts
3. **Debugging** - Understand generation failures
4. **Consistency** - Reproduce successful generations

## Example

See `prompt-example.md` for a complete example.
