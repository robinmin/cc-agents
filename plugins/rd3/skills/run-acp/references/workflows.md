# ACP Workflow Patterns

Practical workflow patterns for using `acpx` effectively.

## Persistent Assistant Workflow

Best for: ongoing development in a repo where context accumulates.

```bash
# Step 1: Create or resume session
acpx codex sessions new

# Step 2: Multi-turn conversation
acpx codex "inspect failing tests and propose a fix plan"
acpx codex "apply the smallest safe fix and run tests"
acpx codex "if tests pass, refactor the test helper to reduce duplication"
```

Why: the saved session maintains conversation history, so each prompt builds on previous context.

## Parallel Workstreams

Best for: multiple concurrent tasks in the same repo.

```bash
# Create named sessions
acpx codex sessions new --name backend
acpx codex sessions new --name frontend
acpx codex sessions new --name docs

# Work on different streams
acpx codex -s backend "fix checkout timeout bug"
acpx codex -s docs "document payment retry behavior"
acpx codex -s frontend "implement dark mode toggle"
```

Why: each named session maintains separate conversation context.

## Queue Follow-up Pattern

Best for: chaining related tasks where the second depends on the first.

```bash
# First: long-running analysis
acpx codex "run full test suite and investigate failures"

# Second: queue a follow-up without waiting
acpx codex --no-wait "after tests complete, summarize root causes"

# Third: inspect results later
acpx codex "summarize the findings from previous analysis"
```

Why: `--no-wait` queues work without blocking the caller.

## One-shot Exec Pattern

Best for: stateless, single-turn delegation.

```bash
acpx --format quiet exec "summarize repo purpose in 3 lines"
acpx --format json codex exec "review auth module for security issues"
acpx --deny-all exec "run linter and report issues"
```

Why: `exec` creates a temporary session and does not persist conversation state.

## Script Integration Pattern

Best for: CI pipelines and automation.

```bash
# Machine-readable output
acpx --format json codex "review current branch changes" > events.ndjson

# Process events
acpx --format json codex exec "review PR diff" \
  | jq -r 'select(.type=="tool_call") | [.status, .title] | @tsv'

# Extract final response only
acpx --format quiet exec "summarize changes" > summary.txt
```

Why: JSON output enables programmatic parsing and integration.

## Permission-Scoped Automation

Best for: automated runs with known risk levels.

```bash
# Permissive
acpx --approve-all --cwd ~/repos/api codex -s ci-123 \
  "run integration tests and report results"

# Restrictive
acpx --deny-all codex exec "audit dependencies without modifying anything"

# Fail fast when prompts are unavailable
acpx --approve-reads --non-interactive-permissions fail codex \
  "inspect repo structure and suggest a plan"
```

Why: match permission policy to the automation context.

## Cross-Repo Delegation

Best for: monorepo or multi-project workflows.

```bash
# API project
acpx --cwd ~/monorepo/api codex sessions new --name api-refactor
acpx --cwd ~/monorepo/api codex -s api-refactor "migrate to new auth"

# Frontend project
acpx --cwd ~/monorepo/web codex sessions new --name ui-update
acpx --cwd ~/monorepo/web codex -s ui-update "update to new API client"

# Shared library
acpx --cwd ~/monorepo/shared codex "audit for breaking changes"
```

Why: sessions are cwd-scoped, enabling clean separation.

## Raw Adapter Pattern

Best for: custom ACP servers or local adapter development.

```bash
# Custom ACP server
acpx --agent "./bin/my-acp-server --mode dev" "process task"

# Development adapter
acpx --agent "node ./scripts/acp-dev-server.mjs --profile local" \
  exec "run development checks"

# CI-optimized adapter
acpx --agent "./bin/ci-agent --acp --no-color" \
  --approve-all "run CI pipeline"
```

Why: `--agent` bypasses the built-in registry for custom setups. Do not combine `--agent` with a positional agent name.

## Interrupt and Resume

Best for: long-running tasks that need intervention.

```bash
# Start analysis
acpx codex "analyze entire codebase for performance issues"

# Interrupt with Ctrl+C, then inspect status
acpx codex status

# Continue in the same saved session
acpx codex "continue the analysis focusing on database queries"
```

Why: interrupt sends a graceful cancel and preserves the saved session for later prompts.

## Config-Driven Workflows

Best for: team-standardized agent behavior.

```json
{
  "defaultAgent": "claude",
  "defaultPermissions": "approve-reads",
  "nonInteractivePermissions": "deny",
  "timeout": 120,
  "agents": {
    "claude": {
      "command": "npx -y @zed-industries/claude-agent-acp"
    }
  }
}
```

```bash
acpx "review this PR"
```

Why: config supplies sensible defaults while still using an ACP-capable adapter command.
