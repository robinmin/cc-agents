# Gemini CLI Configuration Reference

Complete reference for Gemini CLI flags and model capabilities.

## Model Selection (`-m` / `--model`)

### Stable Models

| Model | Description | Context Window | Best For |
|-------|-------------|----------------|----------|
| `gemini-2.5-pro` | State-of-the-art reasoning | 1M tokens | Complex code review, architecture analysis |
| `gemini-2.5-flash` | Price-performance optimized | 1M tokens | Quick reviews, high-volume tasks |
| `gemini-2.5-flash-lite` | Fastest, cost-efficient | 1M tokens | Simple tasks, cost-sensitive workloads |

### Preview Models (Gemini 3)

| Model | Description | Context Window | Best For |
|-------|-------------|----------------|----------|
| `gemini-3-pro-preview` | Best multimodal understanding | 1M tokens | Complex reasoning, multi-modal analysis |
| `gemini-3-flash-preview` | Balanced speed/intelligence | 1M tokens | Fast, capable responses |

**Note**: Preview models may have API changes. Use stable models for production workflows.

## Output Format (`-o` / `--output-format`)

| Format | Description | Use Case |
|--------|-------------|----------|
| `text` | Plain text output (default) | General queries, human reading |
| `json` | JSON-formatted output | Programmatic parsing |
| `stream-json` | Streaming JSON | Real-time processing |

## Approval Mode (`--approval-mode`)

| Mode | Description | Use Case |
|------|-------------|----------|
| `default` | Prompt for approval before changes | Safe, controlled |
| `auto_edit` | Auto-apply without asking | Trusted batch ops |
| `yolo` | Immediate apply, no approval | Experimental/scripted |

## Sandbox Mode (`--sandbox`)

**Always use `--sandbox` for code review tasks.**

| Flag | Description |
|------|-------------|
| `--sandbox` | Prevents file modifications |

This flag is non-negotiable for code review operations to ensure Gemini cannot modify files.

## Common Flags

| Flag | Description |
|------|-------------|
| `--yolo` | Shorthand for `--approval-mode yolo` |
| `--include-directories` | Include directory contents in context |
| `-h` / `--help` | Display help |
| `--version` | Display version |
| `-v` / `--verbose` | Enable verbose output |

## Model Comparison

### gemini-2.5-pro (Recommended Default)

- **Strengths**: Deep analysis, complex reasoning, accurate code review
- **Speed**: Moderate (optimized for accuracy)
- **Context**: 1M tokens
- **Cost**: Higher
- **Use when**: Multi-file review, architecture analysis, security audit

### gemini-2.5-flash

- **Strengths**: Fast responses, good for most tasks
- **Speed**: Fast
- **Context**: 1M tokens
- **Cost**: Lower
- **Use when**: Single-file review, quick questions, rapid iteration

### gemini-2.5-flash-lite

- **Strengths**: Fastest, most cost-efficient
- **Speed**: Fastest
- **Context**: 1M tokens
- **Cost**: Lowest
- **Use when**: High volume, simple tasks, cost constraints

### gemini-3-pro-preview

- **Strengths**: State-of-the-art multimodal, advanced reasoning
- **Speed**: Slower (thorough processing)
- **Context**: 1M tokens
- **Cost**: Highest
- **Use when**: Complex problems requiring advanced reasoning

### gemini-3-flash-preview

- **Strengths**: Balanced frontier capability with speed
- **Speed**: Fast
- **Context**: 1M tokens
- **Cost**: Moderate
- **Use when**: Good capability needed quickly

## Timeout Recommendations

| Complexity | Files | Timeout | Model Recommendation |
|------------|-------|---------|---------------------|
| Simple | 1-3 | 5 min (300s) | `gemini-2.5-flash` |
| Moderate | 4-10 | 10 min (600s) | `gemini-2.5-pro` |
| Complex | 10+ | 15 min (900s) | `gemini-2.5-pro` |

## Command Examples

```bash
# Simple check
gemini --version

# Short prompt with flash model
gemini -m gemini-2.5-flash --sandbox -o text "Your prompt"

# Long prompt with pro model
gemini -m gemini-2.5-pro --sandbox -o text "$(cat prompt.txt)"

# JSON output for parsing
gemini -m gemini-2.5-flash --sandbox -o json "List 5 code smells"
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | API key for Gemini |
| `GOOGLE_APPLICATION_CREDENTIALS` | Service account credentials |

## Troubleshooting

### Timeout Issues

If Gemini times out:
1. Reduce scope (fewer files)
2. Use `gemini-2.5-flash` model
3. Increase timeout parameter

### Rate Limits

If hitting rate limits:
1. Wait and retry
2. Use `gemini-2.5-flash-lite` for lower rate limit impact
3. Batch requests if possible

### Empty Responses

If receiving empty responses:
1. Verify API key is valid
2. Check prompt length (stay under context limit)
3. Retry once before failing

## Links

- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Gemini CLI GitHub](https://github.com/google-gemini/gemini-cli)
- [Model Pricing](https://ai.google.dev/pricing)
