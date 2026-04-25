---
name: add simple wrapper for for all coding agent
description: add simple wrapper for for all coding agent
status: Done
created_at: 2026-04-25T15:44:22.586Z
updated_at: 2026-04-25T20:40:46Z
folder: docs/tasks2
type: task
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0388. Add Lightweight Wrapper for All Coding Agents

### Background

We use multiple AI coding agents for different tasks. Each has different CLI flags for non-interactive mode, session resumption, model selection, and output format. ACP/acpx was tried and rejected — too heavy with poor performance. We need a lightweight bash wrapper to unify prompt/slash-command execution across agents, especially for rd3/wt plugin slash commands.

### Verified CLI Flag Matrix (2026-04-25)

All entries verified from `--help` output on the local machine.

| Agent | Command | Non-interactive | One-off exec | Continue session | Model flag | Output format |
|-------|---------|-----------------|--------------|-----------------|------------|---------------|
| Claude Code | `claude` | `-p` / `--print` | `claude -p "prompt"` | `-c` / `--continue` | `--model <model>` | `--output-format text\|json\|stream-json` |
| Codex | `codex` | `codex exec` | `codex exec "prompt"` | `codex exec resume --last` | `-m <model>` | `--json` (for wrapper `--mode json`) |
| Gemini CLI | `gemini` | `-p` / `--prompt` | `gemini -p "prompt"` | `-r` / `--resume latest` | `-m <model>` | `-o text\|json\|stream-json` |
| Pi | `pi` | `-p` / `--print` | `pi -p "prompt"` | `-c` / `--continue` | `--model <model>` | `--mode text\|json\|rpc` |
| OpenCode | `opencode` | `opencode run` | `opencode run "prompt"` | `-c` / `--continue` | `-m provider/model` | `--format default\|json` |
| Antigravity | `agy chat` | **None** (TUI only) | `agy chat "prompt"` (TUI) | (TUI sessions) | (none in CLI) | (none; TUI only) |
| OpenClaw | `openclaw` | `openclaw agent --local` | `openclaw agent --local -m "prompt"` | `--session-id <id>` | (via gateway config) | `--json` |

**Agent tier classification:**
- **Tier 1 (full support)**: Claude Code, Codex, Gemini CLI, Pi, OpenCode — true non-interactive headless mode
- **Tier 2 (doctor-only)**: Antigravity (no headless), OpenClaw (requires gateway) — health check only; explicit selection launches TUI with warning

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Capability source | Hardcoded inline (bash assoc arrays) | Single file, zero deps, easy to grep |
| Channel resolution: `auto` | First installed + logged-in agent (priority: pi > codex > gemini > claude > opencode) | Matches the preferred local execution order |
| Channel resolution: `current` | `$AIRUNNER_CHANNEL` env var | Parent agent can set; works from skills |
| Session continuation | Pass-through `-c` to agent's native flag | No wrapper-managed state; agent-native UX |
| Doctor output | Human-readable table; exit 0 if any usable, exit 1 if none | Consistent with `claude doctor` UX |
| Output mode normalization | Wrapper accepts `text\|json`; passes through agent-native flag | `stream-json`/`rpc`/`default` available if user targets specific agent |
| Script location | `scripts/airunner.sh` | Single file, no adapter files |

### Requirements

#### 1. Script: `scripts/airunner.sh`

Single bash script, ~300-400 lines, with 3 subcommands.

#### 2. Subcommands

##### `run` — Execute prompt via coding agent

```bash
scripts/airunner.sh run "prompt-or-command" \
  [--channel <auto|current|claude|codex|gemini|pi|opencode|antigravity|openclaw>] \
  [-c] \
  [--model <model>] \
  [--mode text|json]
```

Behavior:
- `--channel auto` (default): selects first Tier-1 agent passing doctor check, in priority order (pi > codex > gemini > claude > opencode)
- `--channel current`: reads `$AIRUNNER_CHANNEL` env var
- `claude` is the canonical Claude Code channel; `claude-code` is accepted as an alias
- `-c`: passes through to agent's native session-continue flag
- `--model`: passes through to agent's native model flag
- `--mode text|json`: normalizes to agent's native output flag
- If prompt starts with `/`, apply slash-command auto-translation before dispatch
- If selected agent is Tier 2 (antigravity, openclaw): print warning to stderr, launch TUI, exit

##### `doctor` — Health check all agents

```bash
scripts/airunner.sh doctor
```

Output format (tabular):

```
AGENT          INSTALLED   VERSION         AUTHENTICATED   USABLE
claude         yes         1.x.x           yes             yes
codex          yes         0.x.x           yes             yes
gemini         yes         0.x.x           yes             yes
pi             yes         0.x.x           yes             yes
opencode       yes         0.x.x           yes             yes
antigravity    no          -               -               no
openclaw       yes         0.x.x           yes             yes*
```

- `*` = Tier 2 (TUI only or gateway required)
- Exit 0 if at least one Tier-1 agent is usable, exit 1 if none

Auth detection methods per agent:
| Agent | Installed check | Auth check |
|-------|-----------------|------------|
| Claude Code | `command -v claude` | `claude auth status 2>&1` |
| Codex | `command -v codex` | `codex login status` or check `~/.codex/auth*` |
| Gemini CLI | `command -v gemini` | Check `~/.gemini/settings.json` for auth config |
| Pi | `command -v pi` | Check env vars (`GOOGLE_API_KEY`, `ANTHROPIC_API_KEY`) or `pi --list-models 2>&1` |
| OpenCode | `command -v opencode` | `opencode providers 2>&1` |
| Antigravity | `command -v agy` | (check only) |
| OpenClaw | `command -v openclaw` | `openclaw health 2>&1` |

##### `help` — Show usage

```bash
scripts/airunner.sh help
scripts/airunner.sh --help
scripts/airunner.sh
```

Prints usage with examples.

#### 3. Slash-Command Auto-Translation

When the prompt starts with `/`, translate the slash command prefix per target agent. Input format is always Claude Code standard: `/[plugin-name]:[command-name] [args]`.

Translation rules:

| Target Agent | Input (Claude standard) | Output |
|-------------|------------------------|--------|
| Claude (`claude`) | `/rd3:dev-run` | `/rd3:dev-run` (no change) |
| Codex | `/rd3:dev-run` | `$rd3-dev-run` |
| Pi | `/rd3:dev-run` | `/skill:rd3-dev-run` |
| Gemini CLI | `/rd3:dev-run` | `/rd3-dev-run` |
| OpenCode | `/rd3:dev-run` | `/rd3-dev-run` |
| Antigravity | `/rd3:dev-run` | `/rd3-dev-run` |
| OpenClaw | `/rd3:dev-run` | `/rd3-dev-run` |

Translation logic:
1. Strip leading `/` from input
2. Split on first `:` → `plugin_name` and `rest`
3. For codex: `$plugin_name-rest`
4. For pi: `/skill:plugin_name-rest`
5. For all others: `/plugin_name-rest`

Args after the command name pass through unchanged.

#### 4. Agent Dispatch Mapping

Each Tier-1 agent's dispatch logic (pseudocode):

```
claude:       claude -p "<prompt>" [--continue] [--model <m>] [--output-format text|json]
codex:        codex exec "<prompt>" [-m <m>] [--json for wrapper --mode json]  (or: codex exec resume --last for -c)
gemini:       gemini -p "<prompt>" [-m <m>] [-o text|json]  (or: -r latest for -c)
pi:           pi -p "<prompt>" [-c] [--model <m>] [--mode text|json]
opencode:     opencode run "<prompt>" [-c] [-m <m>] [--format json]
```

#### 5. Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | No usable Tier-1 agent found |
| 2 | Invalid arguments |
| 3 | Agent execution failed |

### Out of Scope (v1)

- Streaming output mode
- Wrapper-managed session state
- Model alias translation (e.g., `sonnet` → `claude-sonnet-4-6`)
- Config file / profiles
- Parallel multi-agent execution
- Cost tracking

### Q&A

(Reserved)

### Solution

Single bash script `scripts/airunner.sh` (452 lines), bash 3.2 compatible (no associative arrays).

**Implementation:**
- 3 subcommands: `run`, `doctor`, `help`
- Slash-command translation: `/plugin:command args` → agent-native format
- Channel resolution: `auto` (priority scan), `current` (env var), or explicit
- Agent dispatch: correct flags for each Tier-1 agent
- Tier-2 agents: warning + TUI launch
- Auth detection per agent (claude JSON output, codex login check, gemini settings, pi env vars, opencode providers, etc.)

**Test results:** 34/34 passing (`scripts/tests/airunner.test.sh`)
- Slash-command translation for all agent types
- Exit code validation
- Channel resolution (auto, current, unknown)
- Doctor output format verification

### Plan

1. Implement `scripts/airunner.sh` with all 3 subcommands
2. Add slash-command translation function
3. Add doctor health-check for all 7 agents
4. Add dispatch logic for 5 Tier-1 agents
5. Add Tier-2 fallback with warning
6. Manual testing against all installed agents

### Testing

- Unit test slash-command translation function (bash)
- Verify `doctor` output for all installed agents
- Verify `run` dispatches correctly for each Tier-1 agent
- Verify `--channel auto` picks the first available
- Verify `--channel current` reads `$AIRUNNER_CHANNEL`
- Verify Tier-2 agents print warning and launch TUI
- Verify exit codes for error cases

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Script | `scripts/airunner.sh` | Lord Robb | 2026-04-25 |
| Tests | `scripts/tests/airunner.test.sh` | Lord Robb | 2026-04-25 |

### References

- `scripts/setup-all.sh` — installation naming conventions
- `scripts/command/skills.sh` — target directory mapping per agent

## Review

**Date:** 2026-04-25
**Mode:** `full`
**Channel:** `current`
**Scope:** `scripts/airunner.sh`, `scripts/tests/airunner.test.sh`
**Gate:** `bash -n scripts/airunner.sh` ✅, `bash -n scripts/tests/airunner.test.sh` ✅, `bash scripts/tests/airunner.test.sh` ✅ (`34/34` passed)

### Verdict: PASS

- P1 blockers: 0
- P2 warnings: 0
- P3 info: 0
- P4 suggestions: 0
- Unmet requirements: 0
- Partial requirements: 0

### Verification Notes

- Verified Claude dispatch with a mocked `claude` binary: `scripts/airunner.sh run '/rd3:dev-run 0274' --channel claude-code` now forwards `-p /rd3:dev-run 0274 --output-format text`.
- Verified execution-failure remap with a mocked `claude` binary that exits `7`: the wrapper now exits `3` and reports the underlying agent exit code.
- Verified Tier-2 doctor semantics with a mocked healthy `openclaw`: the row renders with a usable marker (`yes*`) while overall `doctor` success still depends on Tier-1 availability.
- Verified `test_channel_current_env` no longer touches real local agents; it dispatches to a shimmed `gemini` binary via `AIRUNNER_CHANNEL`.
- Verified current suite health: `bash scripts/tests/airunner.test.sh` passes with `34/34`.
- Verified the current Codex CLI surface on the local machine: `codex exec --help` exposes `--json`, and `codex login --help` / `codex login status` confirm `login status` is the supported auth probe.

## Requirements Traceability

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `scripts/airunner.sh` exists as a single wrapper script with `run`, `doctor`, and `help` subcommands | MET | `scripts/airunner.sh:289-388` |
| `run` supports channel selection, continue, model, and text/json mode | MET | `scripts/airunner.sh:289-343` |
| Claude-standard slash commands remain unchanged for Claude Code | MET | `scripts/airunner.sh:140-149`, `scripts/airunner.sh:198-209`; mocked dispatch preserves `/rd3:dev-run` verbatim |
| Wrapper exit codes match documented contract (`3` for agent execution failure) | MET | `scripts/airunner.sh:353-359`; failing child process is trapped and remapped to wrapper exit `3` |
| `doctor` reports Tier-2 agents with the documented usable marker semantics | MET | `scripts/airunner.sh:131-134`, `scripts/airunner.sh:390-397`; authenticated Tier-2 rows render `yes*` |
| Tests validate translation, channel handling, and doctor output without hanging | MET | `scripts/tests/airunner.test.sh:121-131`, `scripts/tests/airunner.test.sh:202-310`; shim-based tests cover Claude dispatch, exit remap, current-channel dispatch, and Tier-2 doctor output |
| `--channel auto` default priority matches the task contract | MET | `docs/tasks2/0388_add_simple_wrapper_for_for_all_coding_agent.md:46`, `docs/tasks2/0388_add_simple_wrapper_for_for_all_coding_agent.md:72`, `scripts/airunner.sh:22`, `scripts/airunner.sh:488` all specify `pi > codex > gemini > claude > opencode`. |
| Canonical Claude channel naming is `claude` with `claude-code` accepted as alias | MET | `docs/tasks2/0388_add_simple_wrapper_for_for_all_coding_agent.md:65`, `docs/tasks2/0388_add_simple_wrapper_for_for_all_coding_agent.md:74`, `docs/tasks2/0388_add_simple_wrapper_for_for_all_coding_agent.md:90`, `scripts/airunner.sh:22`, `scripts/airunner.sh:287-290`, `scripts/airunner.sh:490`. |
| Codex wrapper JSON mode aligns with the current CLI | MET | Task matrix and dispatch mapping at `docs/tasks2/0388_add_simple_wrapper_for_for_all_coding_agent.md:30`, `docs/tasks2/0388_add_simple_wrapper_for_for_all_coding_agent.md:154` now match implementation at `scripts/airunner.sh:237-249`; local `codex exec --help` exposes `--json`. |
| Codex auth detection aligns with the current CLI | MET | `docs/tasks2/0388_add_simple_wrapper_for_for_all_coding_agent.md:106` and `scripts/airunner.sh:132-137` both use `codex login status` with auth-file fallback; local `codex login --help` exposes the `status` subcommand. |
