# Tool Comparison: code-review-opencode vs Alternatives

Detailed comparison of code review tools available in the rd2 plugin ecosystem.

## Overview

| Aspect | code-review-opencode | code-review-gemini | code-review-claude | code-review-auggie |
|--------|-------------------|---------------------|-------------------|-------------------|
| **Tool** | OpenCode CLI | Gemini CLI | Claude CLI | Auggie MCP |
| **Setup** | CLI + auth | CLI install | Claude Code | MCP server |
| **Models** | Multiple (Claude, GPT, etc.) | Gemini only | Claude only | MCP-dependent |
| **Context** | Manual file specification | Manual file upload | Manual discovery | Semantic index |
| **Best For** | Multi-model flexibility | Gemini users | Quick native reviews | Codebase-aware |
| **Speed** | Variable (model-dependent) | Medium | Fast | Fast (if indexed) |

## Detailed Comparison

### Setup Requirements

#### code-review-opencode
```bash
# Prerequisites
- OpenCode CLI installed
- API key configured (opencode auth login)
- Account with available credits

# Setup time: 5-10 minutes
```

#### code-review-gemini
```bash
# Prerequisites
- Gemini CLI installed
- Google Cloud API key
- API quota/billing setup

# Setup time: 5-10 minutes
```

#### code-review-claude
```bash
# Prerequisites
- Claude Code CLI installed
- No additional auth required

# Setup time: < 1 minute (if Claude Code installed)
```

#### code-review-auggie
```bash
# Prerequisites
- Auggie MCP server running
- MCP configuration in Claude Code
- Codebase indexing completed

# Setup time: 15-30 minutes (includes indexing)
```

### Model Availability

#### code-review-opencode

**Strengths:**
- Access to multiple AI models
- Can choose best model for specific task
- Model flexibility for different review types

**Models Available:**
- Claude (Opus, Sonnet, Haiku)
- GPT-4, GPT-4 Turbo, GPT-3.5
- Gemini Pro, Gemini Flash
- And more as added

**Weaknesses:**
- Requires external service account
- Dependent on OpenCode service availability
- API costs vary by model

#### code-review-gemini

**Strengths:**
- Gemini Pro's large context window
- Fast Gemini Flash for quick reviews
- Google ecosystem integration

**Weaknesses:**
- Limited to Gemini models only
- Network dependency
- API costs

#### code-review-claude

**Strengths:**
- Native Claude Code integration
- No external service dependency
- Direct access to Claude's capabilities

**Weaknesses:**
- Claude model only
- Limited to Claude's knowledge cutoff
- No model selection

#### code-review-auggie

**Strengths:**
- Semantic codebase understanding
- Natural language queries
- Handles large codebases efficiently

**Weaknesses:**
- Dependent on MCP server
- Index may become stale
- Another system dependency

### Usage Comparison

#### Task: Review Authentication Code

**code-review-opencode:**
```bash
python3 .../code-review-opencode.py review src/auth/ \
  --model claude-opus \
  --focus security
```

**code-review-gemini:**
```bash
python3 .../code-review-gemini.py review src/auth/ \
  --focus security
```

**code-review-claude:**
```bash
python3 .../code-review-claude.py review src/auth/ \
  --focus security
```

**code-review-auggie:**
```bash
python3 .../code-review-auggie.py review "authentication security" \
  --focus security
```

### Output Format Comparison

All four tools produce **identical output format** for consistency:

```yaml
---
type: [opencode|claude-code-review]-code-review
target: <target>
mode: review
---

# Code Review

## Critical Issues (Must Fix)
...
```

This allows seamless switching between tools.

## Performance Characteristics

| Scenario | opencode | gemini | claude | auggie |
|----------|----------|--------|--------|--------|
| Single file review | ~10s | ~10s | ~5s | ~8s |
| Directory (10 files) | ~30s | ~30s | ~15s | ~12s |
| Large codebase (100+ files) | ~5-10 min | ~5-10 min | ~2-5 min | ~1-2 min |
| Semantic search | N/A | N/A | N/A | ~5s |

## Decision Matrix

| Your Situation | Recommended Tool | Why |
|----------------|------------------|-----|
| Want model flexibility | **opencode** | Choose best model per task |
| Already use OpenCode | **opencode** | Leverage existing setup |
| Need Claude quality | **claude** or **opencode** | Native or via opencode |
| Gemini power user | **gemini** | Your preferred tool |
| Quick native review | **claude** | Fast, no setup |
| Large codebase analysis | **auggie** | Semantic search is faster |
| Multi-model comparison | **opencode** | Run same prompt with different models |

## Cost Considerations

| Tool | Cost Model | Notes |
|------|-----------|-------|
| opencode | Per-model pricing | Varies by model selected |
| gemini | Gemini API pricing | Pay per token |
| claude | Free (in Claude Code) | No additional cost |
| auggie | Free (local) | MCP server cost only |

## Migration Guide

### Switching Between Tools

Since all tools share the same output format, you can easily switch:

```bash
# Start with opencode
python3 .../code-review-opencode.py review src/ --output review.md

# Later switch to claude for comparison
python3 .../code-review-claude.py review src/ --output review-claude.md

# Results are comparable and importable the same way
python3 .../code-review-opencode.py import review.md
```

## Summary

| Use code-review-opencode when: | Use alternatives when: |
|------------------------------|------------------------|
| You have OpenCode account | You want native Claude Code |
| Need model selection | You only need Claude |
| Want multi-model comparison | You prefer one specific tool |
| External AI perspective needed | You need semantic codebase search |
| Flexible model pricing | You have free Claude access |
