# Tool Comparison: coder-agy vs Other Code Generation Tools

## Comparison Table

| Aspect     | coder-agy    | coder-claude | coder-gemini | coder-opencode |
|------------|--------------|--------------|--------------|----------------|
| **Tool**   | Antigravity  | Claude CLI   | Gemini CLI   | OpenCode CLI   |
| **Models** | Google Gemini| Claude only  | Gemini only  | Multiple       |
| **Setup**  | CLI install  | None         | CLI install  | CLI + API keys |
| **Best For**| Google AI   | Quick impl   | Complex arch | Multi-model   |

## When to Use coder-agy

**Use coder-agy when:**
- Want Google's latest AI models
- Need multi-file context support
- Want smart file addition via `--add-file`
- Prefer Google's Gemini models
- Working with complex algorithms
- Need deep code understanding

## When to Use Alternatives

**Use coder-claude when:**
- Single model is sufficient
- Simpler setup preferred
- Native integration desired
- Claude-specific features needed

**Use coder-gemini when:**
- Gemini-only features required
- Direct Gemini API access preferred
- No additional context files needed

**Use coder-opencode when:**
- Multi-model comparison needed
- Want to compare outputs from different models
- Need vendor-agnostic approach

## Unique Features of coder-agy

1. **Google AI Integration** - Direct access to Google's latest models
2. **Multi-file Context** - Add multiple files with `--add-file`
3. **Mode Selection** - Choose agent/ask/edit modes
4. **TDD Integration** - Default TDD workflow via rd2:tdd-workflow
5. **Structured Output** - Generated code saved with metadata

## Mode Selection Within coder-agy

| Mode    | Best For                              | Speed    |
| ------- | ------------------------------------- | -------- |
| `agent` | Complex tasks with multi-step reasoning | Moderate |
| `ask`   | Quick questions and simple tasks     | Fast     |
| `edit`  | Code editing and refactoring         | Fast     |

**Selection heuristics:**
- **Default:** Uses `agent` mode for comprehensive code generation
- **Override for speed:** `--mode ask` for quick questions
- **Override for editing:** `--mode edit` for refactoring tasks
