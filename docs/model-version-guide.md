# Model Selection Guide

Comprehensive guide for model selection across all rd2 plugin skills, including criteria, mappings, and lifecycle information.

## Overview

The rd2 plugin supports multiple AI models across different providers (Gemini, Claude, OpenCode, Auggie). This guide standardizes model selection criteria and provides clear mapping of when to use each model.

## Model Categories

### 1. Code Generation Models

| Model | Provider | Best For | Speed | Cost |
|-------|----------|----------|-------|------|
| `gemini-2.5-pro` | Google | Complex multi-file generation, architecture | Moderate | Higher |
| `gemini-2.5-flash` | Google | Quick implementations, single-file | Fast | Lower |
| `gemini-3-pro-preview` | Google | State-of-the-art reasoning | Slower | Highest |
| `gemini-3-flash-preview` | Google | Balanced capability/speed (default) | Fast | Moderate |
| `claude-3-opus` | Anthropic | Deep analysis, nuanced code | Slower | Higher |
| `claude-3-sonnet` | Anthropic | Balanced speed/quality | Moderate | Moderate |
| `claude-3-haiku` | Anthropic | Quick tasks, simple code | Fast | Lower |
| `gpt-4o` | OpenAI (via OpenCode) | General purpose, fast | Fast | Moderate |
| `gpt-4-turbo` | OpenAI (via OpenCode) | Complex reasoning | Moderate | Higher |
| `local/codellama` | OpenCode | Privacy-sensitive, offline | Variable | Free |

### 2. Code Review Models

| Model | Provider | Best For | Speed | Cost |
|-------|----------|----------|-------|------|
| `gemini-2.5-pro` | Google | Comprehensive analysis, security audits | Moderate | Higher |
| `gemini-2.5-flash` | Google | Quick PR reviews, standard analysis | Fast | Lower |
| `gemini-3-pro-preview` | Google | Complex reasoning, edge cases | Slower | Highest |
| `gemini-3-flash-preview` | Google | Balanced analysis (default) | Fast | Moderate |
| `claude-3-opus` | Anthropic | Thorough review, nuanced feedback | Slower | Higher |
| `claude-3-sonnet` | Anthropic | Balanced review quality/speed | Moderate | Moderate |

### 3. Architecture/Planning Models

| Model | Provider | Best For | Speed | Cost |
|-------|----------|----------|-------|------|
| `gemini-2.5-pro` | Google | System architecture, multi-file planning | Moderate | Higher |
| `gemini-3-pro-preview` | Google | Complex architectural decisions | Slower | Highest |
| `claude-3-opus` | Anthropic | Design thinking, trade-off analysis | Slower | Higher |

## Selection Criteria

### Code Generation Decision Tree

```
IF privacy required OR offline needed:
    → local/codellama (via OpenCode)

ELIF single file OR simple implementation:
    → IF speed priority: gemini-2.5-flash or claude-3-haiku
    → ELSE: gemini-3-flash-preview (default)

ELIF multi-file OR complex architecture:
    → IF reasoning critical: gemini-3-pro-preview
    → ELSE: gemini-2.5-pro or claude-3-opus

ELIF external AI perspective desired:
    → gpt-4o (via OpenCode)

ELSE:
    → gemini-3-flash-preview (balanced default)
```

### Code Review Decision Tree

```
IF security audit required:
    → gemini-2.5-pro (thorough security analysis)

ELIF quick PR review (< 500 LOC):
    → claude-3-haiku (fastest)
    → OR gemini-2.5-flash (balanced)

ELIF comprehensive analysis needed:
    → gemini-2.5-pro OR claude-3-opus

ELIF semantic codebase understanding needed:
    → auggie (codebase-aware indexing)

ELIF multi-model comparison desired:
    → opencode (access to multiple models)

ELSE:
    → gemini-3-flash-preview (balanced default)
```

### Architecture Planning Decision Tree

```
IF complex system architecture:
    → gemini-3-pro-preview (state-of-the-art reasoning)

ELIF multi-service OR distributed systems:
    → gemini-2.5-pro (comprehensive analysis)

ELIF quick design guidance:
    → gemini-3-flash-preview (balanced)

ELSE:
    → claude-3-opus (design thinking expertise)
```

## Model Lifecycle

### Preview Models

**Status:** Preview
**Stability:** May change or be deprecated
**Use Case:** Cutting-edge capabilities, experimentation

| Model | Preview Status | Notes |
|-------|---------------|-------|
| `gemini-3-pro-preview` | Preview | State-of-the-art reasoning, may change |
| `gemini-3-flash-preview` | Preview | Balanced capability/speed, likely to stabilize |

**Recommendation:** Use preview models for experimentation, but default to stable models for production workflows.

### Stable Models

**Status:** Stable
**Stability:** Production-ready, API contract stable
**Use Case:** Reliable, consistent performance

| Model | Stability | Notes |
|-------|-----------|-------|
| `gemini-2.5-pro` | Stable | Production-ready, comprehensive capabilities |
| `gemini-2.5-flash` | Stable | Production-ready, fast |
| `claude-3-opus` | Stable | Production-ready, high quality |
| `claude-3-sonnet` | Stable | Production-ready, balanced |
| `claude-3-haiku` | Stable | Production-ready, fast |
| `gpt-4o` | Stable | Production-ready via OpenCode |

### Local Models

**Status:** Variable
**Stability:** Depends on local setup
**Use Case:** Privacy-sensitive, offline scenarios

| Model | Stability | Notes |
|-------|-----------|-------|
| `local/codellama` | Variable | Depends on local hardware/setup |

## Skill-Specific Model Selection

### coder-gemini

**Default:** `gemini-3-flash-preview`

**Selection Heuristics:**
- **Default:** `gemini-3-flash-preview` (balanced)
- **Complex multi-file:** `gemini-2.5-pro`
- **Simple single-file:** `gemini-2.5-flash`
- **State-of-the-art reasoning:** `gemini-3-pro-preview`

### coder-claude

**Default:** Native Claude (built-in)

**Selection Heuristics:**
- **Quick implementation:** Use built-in Claude
- **No external setup:** Use built-in Claude

### coder-opencode

**Default:** Configured in OpenCode CLI

**Selection Heuristics:**
- **Speed priority:** `gpt-4o`
- **Complex reasoning:** `gpt-4-turbo`
- **Privacy:** `local/codellama`
- **Multi-model:** Let OpenCode auto-select

### code-review-gemini

**Default:** `gemini-3-flash-preview`

**Selection Heuristics:**
- **Default:** `gemini-3-flash-preview` (balanced)
- **Security audit:** `gemini-2.5-pro`
- **Quick PR review:** `gemini-2.5-flash`
- **Complex analysis:** `gemini-3-pro-preview`

### code-review-claude

**Default:** Native Claude (built-in)

**Selection Heuristics:**
- **Fast review:** Use built-in Claude
- **No external setup:** Use built-in Claude

## Standardization Guidelines

### When to Reference Models

**DO reference models:**
- In SKILL.md files for clarity
- In error messages about tool availability
- In documentation examples
- In user-facing explanations

**DON'T reference models:**
- Hardcode specific versions in implementation (use defaults)
- Assume all models are available (check availability first)
- Mix preview and stable without explanation

### Model Version References

**Format:**
- Use full model name: `gemini-2.5-pro`, `claude-3-opus`
- Include "preview" suffix for preview models: `gemini-3-pro-preview`
- Specify provider when ambiguous: `gpt-4o (OpenCode)`

**Examples:**
```markdown
Good:
- Use gemini-2.5-pro for complex multi-file generation
- Default: gemini-3-flash-preview (balanced capability/speed)

Bad:
- Use gemini pro (ambiguous version)
- Use the latest gemini (unclear which version)
```

### Default Model Strategy

Each skill should have a sensible default:

| Skill | Default Model | Rationale |
|-------|---------------|-----------|
| coder-gemini | gemini-3-flash-preview | Balanced speed/capability |
| coder-claude | Native Claude | No setup required |
| code-review-gemini | gemini-3-flash-preview | Balanced analysis |
| code-review-claude | Native Claude | Fast, no setup |

## Migration Path

### Updating Model References

When models are added or deprecated:

1. **Update SKILL.md files** with new model information
2. **Update scripts** to use new defaults
3. **Update documentation** with new selection criteria
4. **Deprecate old models** gracefully (maintain backwards compatibility if possible)

### Example: Model Deprecation

```markdown
### Deprecated Models

The following models are deprecated but still supported:

| Model | Deprecation Date | Replacement |
|-------|------------------|-------------|
| `gemini-2.0-pro` | 2024-12-01 | Use `gemini-2.5-pro` |
| `claude-2-opus` | 2024-10-15 | Use `claude-3-opus` |

**Note:** Deprecated models will be removed in future versions.
```

## Best Practices

### 1. Always Check Availability

Before using a model, verify it's available:

```python
# Example from coder-gemini skill
def check_gemini_availability():
    result = run("gemini --version")
    if result.returncode != 0:
        raise RuntimeError("Gemini CLI not available")
```

### 2. Provide Fallback Options

Have fallback models ready:

```python
model_fallbacks = {
    "gemini-3-pro-preview": ["gemini-2.5-pro", "claude-3-opus"],
    "gemini-2.5-pro": ["gemini-2.5-flash", "claude-3-sonnet"],
    "claude-3-opus": ["claude-3-sonnet", "gemini-2.5-pro"]
}
```

### 3. Document Model-Specific Behavior

Some models have unique behaviors:

```markdown
### Model-Specific Notes

**gemini-2.5-pro:**
- Excellent for multi-file architecture
- May be slower for simple tasks
- Strong security analysis capabilities

**claude-3-opus:**
- Best for nuanced code design
- Strong at explaining trade-offs
- May produce more verbose output
```

### 4. Update Regularly

Models change frequently. Review this guide quarterly to:
- Add new models
- Deprecate old models
- Update selection criteria
- Refresh stability information

## Related Documentation

- **Workflow**: `/docs/rd2-workflow.md`
- **Architecture**: `/docs/rd2-architecture.md`
- **coder-gemini skill**: `/plugins/rd2/skills/coder-gemini/SKILL.md`
- **code-review-gemini skill**: `/plugins/rd2/skills/code-review-gemini/SKILL.md`
