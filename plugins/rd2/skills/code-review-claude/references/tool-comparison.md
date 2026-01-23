# Tool Comparison: code-review-claude vs Alternatives

Detailed comparison of code review tools available in the rd2 plugin ecosystem.

## Overview

| Aspect | code-review-claude | code-review-gemini | code-review-auggie |
|--------|-------------------|---------------------|-------------------|
| **Tool** | Claude CLI (native) | Gemini CLI | Auggie MCP Server |
| **Setup** | Claude Code required | CLI install + API key | MCP server setup |
| **Context Source** | Manual file discovery | Manual file specification | Semantic codebase index |
| **Query Approach** | Read/Grep/Glob tools | Send file contents | Semantic search queries |
| **Best For** | Quick, targeted reviews | External AI perspective | Large codebase analysis |
| **Speed** | Fast (local) | Medium (network) | Fast (local index) |
| **Token Efficiency** | High | Medium | High |
| **Isolation** | Subprocess-spawned | CLI-spawned | MCP-connected |

## Detailed Comparison

### Setup Requirements

#### code-review-claude
```bash
# Prerequisites
- Claude Code CLI installed
- No API keys required
- No additional servers

# Setup time: < 1 minute (if Claude Code installed)
```

#### code-review-gemini
```bash
# Prerequisites
- Gemini CLI installed
- Google Cloud API key
- API quota/billing setup

# Setup time: 5-10 minutes
```

#### code-review-auggie
```bash
# Prerequisites
- Auggie MCP server running
- MCP configuration in Claude Code
- Codebase indexing completed

# Setup time: 15-30 minutes (includes indexing)
```

### Context Understanding

#### code-review-claude

**Strengths:**
- Direct access to Claude's full understanding
- No context loss through API translation
- Can use all Claude Code tools (Read, Grep, Glob)

**Weaknesses:**
- Requires manual file discovery
- No semantic search across codebase
- User must specify what to review

**Best for:**
- Quick reviews of known files
- Targeted security audits
- When you know exactly what to review

#### code-review-gemini

**Strengths:**
- External AI provides fresh perspective
- May catch issues Claude misses
- Different AI model's insights

**Weaknesses:**
- Requires manual file content preparation
- Network dependency
- API costs and rate limits
- No direct tool access

**Best for:**
- Second opinion on critical code
- Cross-validation of reviews
- When external perspective is valuable

#### code-review-auggie

**Strengths:**
- Semantic codebase understanding
- Can find related code automatically
- Natural language queries work well
- Handles large codebases efficiently

**Weaknesses:**
- Indexing can be slow initially
- Index may become stale
- Requires MCP server maintenance
- Another system dependency

**Best for:**
- Large codebases
- Exploratory reviews ("find all auth issues")
- When you don't know what files to review

## Usage Comparison

### Same Task, Different Approaches

#### Task: Review authentication code

**code-review-claude:**
```bash
# Must specify files manually
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review \
  src/auth/login.py src/auth/middleware.py \
  --focus security
```

**code-review-gemini:**
```bash
# Must provide file contents
cat > auth-files.txt << EOF
src/auth/login.py: $(cat src/auth/login.py)
src/auth/middleware.py: $(cat src/auth/middleware.py)
EOF

python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py review \
  --files auth-files.txt \
  --focus security
```

**code-review-auggie:**
```bash
# Semantic query finds relevant files
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
  "authentication security vulnerabilities" \
  --focus security
```

### Output Format Comparison

All three tools produce **identical output format** for consistency:

```yaml
---
type: claude-code-review
target: <target>
mode: review
---

# Code Review

## Critical Issues (Must Fix)
**[CRITICAL-001]** Issue Title
- **Location**: file.py:line
- **Issue**: Description
- **Impact**: Risk assessment
- **Fix**: Recommendation

## High Priority Issues (Should Fix)
...
```

This allows seamless switching between tools.

## Performance Characteristics

### Speed Comparison

| Scenario | claude | gemini | auggie |
|----------|--------|--------|--------|
| Single file review | ~5s | ~10s | ~8s |
| Directory (10 files) | ~15s | ~30s | ~12s |
| Large codebase (100+ files) | ~2-5 min | ~5-10 min | ~1-2 min |
| Semantic search | N/A | N/A | ~5s |

### Token Usage

| Scenario | claude | gemini | auggie |
|----------|--------|--------|--------|
| Single file | ~2K tokens | ~3K tokens | ~2.5K tokens |
| Directory | ~10K tokens | ~20K tokens | ~8K tokens |
| Semantic query | N/A | N/A | ~5K tokens |

## Decision Matrix

| Your Situation | Recommended Tool | Why |
|----------------|------------------|-----|
| Quick review of specific files | **claude** | Fastest, no setup |
| Need second opinion | **gemini** | External AI perspective |
| Exploring unknown codebase | **auggie** | Semantic search finds relevant code |
| Security audit of known module | **claude** | Direct tool access |
| Large enterprise codebase | **auggie** | Handles scale best |
| No additional setup wanted | **claude** | Already have Claude Code |
| Have Gemini API quota | **gemini** | Leverage existing setup |
| Running MCP servers | **auggie** | Already invested |

## Combining Tools

### Recommended Workflow for Critical Reviews

```bash
# Step 1: Use auggie for broad discovery
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
  "security vulnerabilities in auth" \
  --output .claude/plans/discovery.md

# Step 2: Use claude for detailed review of found files
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review \
  src/auth/login.py src/auth/middleware.py \
  --focus security \
  --output .claude/plans/detailed.md

# Step 3: Use gemini for external validation
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py review \
  --files src/auth/ \
  --focus security \
  --output .claude/plans/validation.md
```

### Cost-Benefit Analysis

| Tool | Setup Cost | Per-Use Cost | Maintenance | Best ROI When |
|------|-----------|--------------|-------------|---------------|
| claude | Low (if Claude Code) | Free | None | Quick reviews |
| gemini | Medium | API costs | None | Second opinions |
| auggie | High | Free | Index updates | Large codebases |

## Migration Guide

### Switching Between Tools

Since all tools share the same output format, you can easily switch:

```bash
# Start with claude
python3 .../code-review-claude.py review src/ --output review.md

# Later switch to auggie for semantic search
python3 .../code-review-auggie.py review "review src/" --output review.md

# Results are comparable and importable the same way
python3 .../code-review-claude.py import review.md
```

## Future Developments

### Planned Enhancements

| Tool | Planned Features |
|------|-----------------|
| claude | Auto-discovery patterns, focus presets |
| gemini | More model options, batch processing |
| auggie | Faster indexing, hybrid search |

### Unified Command

Future development may include a unified slash command that:
- Automatically selects the best tool
- Combines results from multiple tools
- Provides comparative analysis

## Summary

| Use code-review-claude when: | Use code-review-gemini when: | Use code-review-auggie when: |
|------------------------------|------------------------------|------------------------------|
| You have Claude Code | You need external perspective | You have large codebase |
| Know what to review | Want second opinion | Don't know what to review |
| Want fastest results | Have Gemini API | Want semantic search |
| No additional setup | Need cross-validation | Already using MCP |
| Direct tool access needed | Different AI insights | Automatic file discovery |
