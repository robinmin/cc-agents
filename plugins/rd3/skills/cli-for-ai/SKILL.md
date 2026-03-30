---
name: cli-for-ai
description: Guide CLI design for AI agent compatibility — apply the 7 agent-friendly patterns (structured output, schema introspection, dry-run, next actions, input hardening, context discipline, skill shipping) when building or retrofitting CLI tools.
license: Apache-2.0
metadata:
  author: cc-agents
  version: "1.0"
  platforms: "claude-code,codex,openclaw,opencode,antigravity"
  openclaw:
    emoji: "🛠️"
---

# CLI for AI Agents

Design and evaluate CLI tools for AI agent compatibility. Apply the 7 proven patterns that make CLIs usable by autonomous agents alongside human operators.

Based on "Designing CLIs for AI Agents: Patterns That Work in 2026" by David Min [Medium, Mar 2026] and Justin Poehnelt's research at Google.

## When to use

Apply when:
- Designing a new CLI tool for AI agent consumption
- Retrofitting an existing CLI for agent compatibility
- Evaluating CLI agent-friendliness against the 7-pattern checklist
- Deciding between CLI, MCP, or hybrid approaches
- Writing SKILL.md files encoding agent-specific CLI guidance

## Overview

The core tension: Human DX optimizes for discoverability and forgiveness (colorful output, interactive prompts, tab completion). Agent DX optimizes for predictability and defense-in-depth (structured output, deterministic behavior, strict validation). The dual-mode pattern — human-friendly by default, machine-friendly with `--json` — serves both audiences from the same binary.

## Quick Start

Apply the 7-pattern checklist to any CLI command:

```bash
# Check if a CLI supports agent-friendly output
myctl deploy web-api --env prod --json

# Expected agent-mode response:
# {"ok": true, "deployment_id": "deploy-123", "status": "running",
#  "next_actions": ["myctl status deploy-123", "myctl logs deploy-123"]}
```

If the CLI returns formatted text instead of JSON, it needs retrofitting. Start with Pattern 1 (structured output) and work through the priority order in the Workflow section.

## The 7 Agent-Friendly CLI Patterns

### Pattern 1: Structured Output Is Non-Negotiable

Every command needs a `--json` flag producing valid, parseable JSON to stdout. Messages, progress, and warnings go to stderr.

**Human mode:**
```
$ myctl deploy web-api --env prod
Deployment started...
Status: Running
Replicas: 3/3
```

**Agent mode:**
```json
$ myctl deploy web-api --env prod --json
{
  "ok": true,
  "deployment_id": "deploy-123",
  "status": "running",
  "replicas": {"current": 3, "desired": 3},
  "next_actions": [
    "myctl status deploy-123",
    "myctl logs deploy-123",
    "myctl rollback deploy-123"
  ]
}
```

**Requirements:**
- `ok` boolean for success/failure
- Structured data fields (not stringified values like `"Replicas: 3/3"`)
- Semantic exit codes (0 = success, non-zero = failure with reason)
- Combine with `--quiet` to suppress spinners/progress bars

### Pattern 2: Schema Introspection Replaces Documentation

Agents can't Google your docs. Make the CLI self-documenting at runtime.

```json
$ myctl --help --json
{
  "commands": [
    {
      "name": "deploy",
      "description": "Deploy application",
      "flags": [
        {"name": "env", "type": "string", "required": true},
        {"name": "image", "type": "string", "required": false},
        {"name": "dry-run", "type": "boolean", "default": false}
      ]
    }
  ]
}
```

**Implementation:** Add a `schema` or `--describe` command that dumps full method signatures as machine-readable JSON. The CLI becomes the source of truth for what the API accepts right now.

### Pattern 3: Dry-Run Mode for Every Mutation

Agents need to preview actions before committing. A `--dry-run` flag returns what *would* happen without executing.

```json
$ myctl deploy web-api --env prod --dry-run --json
{
  "ok": true,
  "would_deploy": {
    "image": "myregistry/web:v2.1.0",
    "replicas": 3,
    "resources": {"cpu": "1000m", "memory": "512Mi"}
  },
  "estimated_time": "2m30s"
}
```

**Especially critical for destructive operations** — agents can validate locally, "think out loud," and catch hallucinated parameters before causing damage.

### Pattern 4: Next Actions — Tell the Agent What to Do Next

After every command, include a `next_actions` array of command templates the agent can run as follow-ups.

```json
{
  "ok": true,
  "message_id": "msg-123",
  "next_actions": [
    "myctl status msg-123",
    "myctl logs msg-123",
    "myctl rollback msg-123"
  ]
}
```

Without this, agents must infer commands, guess arguments, and hope syntax is correct. With `next_actions`, you give the agent a menu of valid next steps — reducing hallucination and improving task completion.

### Pattern 5: Input Hardening Against Hallucinations

Agents hallucinate differently than humans typo. Known failure modes:

| Failure Mode | Example | Fix |
|---|---|---|
| Path traversal | `../../.ssh` | Canonicalize and sandbox output paths |
| Control characters | Invisible chars below `0x20` | Reject ASCII below `0x20` |
| Embedded query params | `fileId?fields=name` | Validate against `?`, `#`, `%` |
| Double URL encoding | Pre-encoded strings | Detect and reject pre-encoded input |

**Principle:** Treat agent input as adversarial. Validate at system boundaries.

### Pattern 6: Context Window Discipline

Every unnecessary byte wastes tokens and context window.

- Support field masks: `--fields id,name,status` lets agents request only what they need
- Use NDJSON (one JSON object per line) for paginated results — agents process incrementally instead of loading everything into memory
- This is the difference between an agent that can handle your API and one that runs out of context mid-task

### Pattern 7: Ship Skills, Not Just Commands

Agents learn through injected context at conversation start, not `--help` or docs. Ship `SKILL.md` files alongside your CLI.

Skills encode agent-specific guidance that isn't obvious from `--help`:
- "Always use `--dry-run` for mutations"
- "Always confirm before write/delete"
- "Use field masks when listing resources"

**Key finding:** Focused, task-specific skills outperform comprehensive ones — one skill per API surface plus higher-level workflow skills.

## Workflow

### Step 1: Evaluate Current CLI

Run the design checklist against each command:

- [ ] `--json` flag produces valid JSON
- [ ] Semantic exit codes (0 = success, non-zero = failure with reason)
- [ ] `--dry-run` previews destructive actions
- [ ] JSON includes `next_actions` array
- [ ] Flags over positional arguments (agents prefer explicit naming)
- [ ] Idempotent operations where possible
- [ ] Error responses include structured `error` field with reason and code
- [ ] Non-interactive mode via `--yes` or TTY detection

### Step 2: Apply Patterns in Priority Order

Implementation priority (from Poehnelt's practical guide):

1. **Add `--output json`** — machine-readable output is table stakes
2. **Validate all inputs** — reject control characters, path traversals, embedded query parameters
3. **Add `schema` or `--describe` command** — let agents introspect capabilities at runtime
4. **Support field masks or `--fields`** — protect the agent's context window
5. **Add `--dry-run`** — validate before mutating
6. **Ship skill files** — encode invariants agents can't intuit from `--help`
7. **Expose an MCP surface** — only if wrapping an API that benefits from typed JSON-RPC tools

### Step 3: Choose CLI vs. MCP

**Choose CLI when:**
- Simple request-response patterns
- Token efficiency matters (CLI ~200 tokens vs. 150,000+ for loaded MCP schemas)
- Composability is important (Unix pipes)
- The model already knows your tool from training data (`gh`, `aws`, `docker`, `kubectl`)

**Choose MCP when:**
- No CLI exists and building one isn't practical
- Complex state management between calls required
- Real-time streaming required
- Multi-tenant environments need fine-grained permission scoping
- Agents need to dynamically discover available tools

**Hybrid winner:** CLI for execution, Skills for context, MCP only when its specific guarantees are needed.

## Gotchas

1. **Single source of truth for output**: Maintain one dict — `--json` dumps it raw, human mode pretty-prints the same dict. Don't maintain two separate output paths. (Source: David Min, Medium comments [Mar 2026])
2. **Interactive prompts are agent dead ends**: An interactive confirmation prompt that improves Human DX blocks agents entirely. Always support `--yes` or TTY detection for non-interactive mode.
3. **Token cost of MCP schemas**: Loading a typical MCP server's tool definitions can consume tens of thousands of tokens before the agent does anything. A CLI command plus output might cost 200 tokens total. At scale, this is the gap between viable and prohibitively expensive.
4. **Flags over positionals**: Agents prefer explicit flag naming (`--env prod`) over positional arguments. Positionals require remembering argument order — a source of hallucination.
5. **Version drift**: Machine-readable output contract will drift from human-facing output over time. Maintain the single-dict pattern (gotcha #1) to minimize this risk.

## Additional Resources

- [references/article-source.md](references/article-source.md) — Source citations, key quotes, token efficiency comparison table
- [Justin Poehnelt — "Rewrite Your CLI for AI Agents"](https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents/) — Google's research on agent-friendly CLI design
- [Google Workspace CLI](https://github.com/googleworkspace/cli) — Reference implementation of schema introspection pattern

## Platform Notes

### Claude Code
Run CLI commands directly via Bash tool. For live execution, use `!cmd` prefix.

### Codex / OpenClaw / OpenCode / Antigravity
Run commands via Bash tool. Arguments provided in chat.

---

**Template type**: technique
**Purpose**: Step-by-step workflows with concrete instructions
