---
name: run-acp
description: Use acpx as a headless ACP CLI for agent-to-agent communication. Trigger when user mentions "run agent", "delegate to", "use acpx", "ACP session", "agent prompt", "multi-agent workflow", "codex", "claude agent", "openclaw agent".
license: Apache-2.0
metadata:
  author: cc-agents
  version: "1.0.0"
  platforms: "claude-code,codex,openclaw,opencode,antigravity"
  interactions:
    - tool-wrapper
  openclaw:
    emoji: "🛠️"
---

# run-acp

Use `acpx` as a headless ACP (Agent Client Protocol) CLI for delegating tasks to coding agents. This skill wraps the `acpx` tool, enabling persistent sessions, prompt queueing, and structured output across the built-in agent registry and custom ACP adapters.

## When to use this skill

Use this skill when you need to run coding agents through `acpx`, manage persistent ACP sessions, queue prompts, or consume structured agent output from scripts.

## What acpx is

`acpx` is a headless, scriptable CLI client for the Agent Client Protocol (ACP). It is built for agent-to-agent communication over the command line and avoids PTY scraping.

Core capabilities:

- Persistent multi-turn sessions per repo/cwd
- One-shot execution mode (`exec`)
- Named parallel sessions (`-s/--session`)
- Queue-aware prompt submission with optional fire-and-forget (`--no-wait`)
- Cooperative cancel command (`cancel`) for in-flight turns
- Graceful cancellation via ACP `session/cancel` on interrupt
- Session control methods (`set-mode`, `set <key> <value>`)
- Agent reconnect/resume after dead subprocess detection
- Prompt input via stdin or `--file`
- Config files with global+project merge and `config show|init`
- Session metadata/history inspection (`sessions show`, `sessions history`, `sessions read`)
- Local agent process checks via `status`
- Stable ACP `authenticate` support via env/config credentials
- Structured streaming output (`text`, `json`, `quiet`)
- Built-in agent registry plus raw `--agent` escape hatch

## Slash Command Channel Convention

Some rd3 slash commands expose `--channel <current|claude-code|codex|openclaw|opencode|antigravity|pi>`.

- `current` is a slash-command/orchestration shorthand meaning "stay on the current channel".
- `claude-code` is the user-facing slash-command alias for the ACP agent name `claude`.
- `codex`, `openclaw`, `opencode`, and `pi` map directly to ACP agent names.
- `antigravity` is a user-facing channel option and should be resolved through a configured ACP agent command for Antigravity in the local `acpx` config.
- When a wrapper resolves a non-`current` value, it should delegate through `rd3:run-acp` and preserve that value as `execution_channel` for downstream skills.

## Install

```bash
npm i -g acpx
```

For normal session reuse, prefer a global install over `npx`.

## Command model

`prompt` is the default verb.

```bash
acpx [global_options] [prompt_text...]
acpx [global_options] prompt [prompt_options] [prompt_text...]
acpx [global_options] exec [prompt_options] [prompt_text...]
acpx [global_options] cancel [-s <name>]
acpx [global_options] set-mode <mode> [-s <name>]
acpx [global_options] set <key> <value> [-s <name>]
acpx [global_options] status [-s <name>]
acpx [global_options] sessions [list | new [--name <name>] [--resume-session <id>] | ensure [--name <name>] [--resume-session <id>] | close [name] | show [name] | history [name] [--limit <count>] | read [name] [--tail <count>]]
acpx [global_options] config [show | init]

acpx [global_options] <agent> [prompt_options] [prompt_text...]
acpx [global_options] <agent> prompt [prompt_options] [prompt_text...]
acpx [global_options] <agent> exec [prompt_options] [prompt_text...]
acpx [global_options] <agent> cancel [-s <name>]
acpx [global_options] <agent> set-mode <mode> [-s <name>]
acpx [global_options] <agent> set <key> <value> [-s <name>]
acpx [global_options] <agent> status [-s <name>]
acpx [global_options] <agent> sessions [list | new [--name <name>] [--resume-session <id>] | ensure [--name <name>] [--resume-session <id>] | close [name] | show [name] | history [name] [--limit <count>] | read [name] [--tail <count>]]
```

If prompt text is omitted and stdin is piped, `acpx` reads prompt text from stdin.

## Built-in agent registry

Friendly agent names resolve to commands:

- `pi` -> `npx pi-acp`
- `openclaw` -> `openclaw acp`
- `codex` -> `npx @zed-industries/codex-acp`
- `claude` -> `npx -y @zed-industries/claude-agent-acp`
- `gemini` -> `gemini --acp`
- `cursor` -> `cursor-agent acp`
- `copilot` -> `copilot --acp --stdio`
- `droid` -> `droid exec --output-format acp`
- `iflow` -> `iflow --experimental-acp`
- `kilocode` -> `npx -y @kilocode/cli acp`
- `kimi` -> `kimi acp`
- `kiro` -> `kiro-cli acp`
- `opencode` -> `npx -y opencode-ai acp`
- `qwen` -> `qwen --acp`

Aliases:

- `factory-droid` -> `droid`
- `factorydroid` -> `droid`

Rules:

- Default agent is `codex` for top-level `prompt`, `exec`, `cancel`, `set-mode`, `set`, `status`, and `sessions`.
- Unknown positional agent tokens are treated as raw agent commands.
- `--agent <command>` explicitly sets a raw ACP adapter command.
- Do not combine a positional agent and `--agent` in the same command.

## Commands

### Prompt (default, persistent session)

Implicit:

```bash
acpx codex "fix flaky tests"
```

Explicit:

```bash
acpx codex prompt "fix flaky tests"
acpx prompt "fix flaky tests"   # defaults to codex
```

Behavior:

- Uses a saved session for the session scope key
- Auto-resumes prior session when one exists for that scope
- If no session exists for the scope, exits with `NO_SESSION` and prompts for `sessions new`
- Is queue-aware when another prompt is already running for the same session
- On interrupt during an active turn, sends ACP `session/cancel` before force-kill fallback

Prompt options:

- `-s, --session <name>`: use a named session within the same cwd
- `--no-wait`: enqueue and return immediately when session is already busy
- `-f, --file <path>`: read prompt text from file (`-` means stdin)

### Exec (one-shot)

```bash
acpx exec "summarize this repo"
acpx codex exec "summarize this repo"
```

Behavior:

- Runs a single prompt in a temporary ACP session
- Does not reuse or save persistent session state
- Can be blocked by config if `disableExec` is set to `true`

### Cancel / Mode / Config

```bash
acpx codex cancel
acpx codex set-mode auto
acpx codex set thought_level high
```

Behavior:

- `cancel`: sends cooperative `session/cancel` through queue-owner IPC.
- `set-mode`: calls ACP `session/set_mode`.
- `set-mode` mode ids are adapter-defined; unsupported values are rejected by the adapter (often `Invalid params`).
- `set`: calls ACP `session/set_config_option`.
- For codex, `thought_level` is accepted as a compatibility alias for codex-acp `reasoning_effort`.
- `set-mode`/`set` route through queue-owner IPC when active, otherwise reconnect directly.

### Sessions

```bash
acpx sessions
acpx sessions list
acpx sessions new
acpx sessions new --name backend
acpx sessions ensure
acpx sessions ensure --name backend
acpx sessions close
acpx sessions close backend
acpx sessions show
acpx sessions history --limit 20
acpx sessions read --tail 50
acpx status

acpx codex sessions
acpx codex sessions new --name backend
acpx codex sessions ensure --name backend
acpx codex sessions close backend
acpx codex sessions show backend
acpx codex sessions history backend --limit 20
acpx codex sessions read backend --tail 50
acpx codex status
```

Behavior:

- `sessions` and `sessions list` are equivalent
- `new` creates a fresh session for the current `(agentCommand, cwd, optional name)` scope
- `ensure` returns an existing scoped session or creates one when missing
- `new` and `ensure` can accept `--resume-session <id>` to load an existing ACP session id when creating a local record
- `new --name <name>` and `ensure --name <name>` target a named session scope
- When `new` replaces an existing open session in that scope, the old one is soft-closed
- `close` targets current cwd default session
- `close <name>` targets current cwd named session
- `show [name]` prints stored metadata for that scoped session
- `history [name]` prints stored turn history previews (default 20, use `--limit`)
- `read [name]` prints full stored history; use `--tail` to limit trailing entries

## Global options

- `--agent <command>`: raw ACP agent command (escape hatch)
- `--cwd <dir>`: working directory for session scope (default: current directory)
- `--auth-policy <policy>`: auth policy when ACP auth is required (`skip` or `fail`)
- `--approve-all`: auto-approve all permission requests
- `--approve-reads`: auto-approve reads/searches, prompt for writes (default mode)
- `--deny-all`: deny all permission requests
- `--non-interactive-permissions <policy>`: behavior when prompting is unavailable (`deny` or `fail`)
- `--format <fmt>`: output format (`text`, `json`, `quiet`)
- `--model <id>`: agent model id passed into session metadata
- `--allowed-tools <list>`: comma-separated allowed tool names (`""` means no tools)
- `--max-turns <count>`: maximum turns for the session
- `--json-strict`: requires `--format json`; suppresses non-JSON stderr output
- `--timeout <seconds>`: max wait time (positive number)
- `--ttl <seconds>`: queue owner idle TTL before shutdown (default `300`, `0` keeps the owner alive indefinitely)
- `--verbose`: verbose ACP/debug logs to stderr

Permission flags are mutually exclusive.

## Config files

Config files are merged in this order (later wins):

- global: `~/.acpx/config.json`
- project: `<cwd>/.acpxrc.json`

CLI flags always win over config values.

Supported keys:

- `defaultAgent`
- `defaultPermissions` (`approve-all`, `approve-reads`, `deny-all`)
- `nonInteractivePermissions` (`deny`, `fail`)
- `authPolicy` (`skip`, `fail`)
- `ttl` (seconds)
- `timeout` (seconds or `null`)
- `format` (`text`, `json`, `quiet`)
- `disableExec` (`true` disables the `exec` subcommand)
- `agents` map (`name -> { command }`)
- `auth` map (`authMethodId -> credential`)

Use `acpx config show` to inspect the resolved config and `acpx config init` to create the global template.

## Session behavior

Persistent prompt sessions are scoped by:

- `agentCommand`
- absolute `cwd`
- optional session `name`

Persistence:

- Session records are stored in `~/.acpx/sessions/*.json`.
- `-s/--session` creates parallel named conversations in the same repo.
- Changing `--cwd` changes scope and therefore session lookup.
- Closed sessions are retained on disk with `closed: true` and `closedAt`.
- Auto-resume by scope skips closed sessions.

Resume behavior:

- Prompt mode attempts to reconnect to a saved session.
- If adapter-side session is invalid/not found, `acpx` creates a fresh session and updates the saved record.
- Explicit ACP session resume is supported through `sessions new --resume-session <id>` and `sessions ensure --resume-session <id>`.
- Dead saved PIDs are detected and reconnected on the next prompt.
- Each completed prompt stores lightweight turn history previews in the session record.

## Prompt queueing and `--no-wait`

Queueing is per persistent session.

- The active `acpx` process for a running prompt becomes the queue owner.
- Other invocations submit prompts over local IPC.
- On Unix-like systems, queue IPC uses a Unix socket under `~/.acpx/queues/<hash>.sock`.
- Ownership is coordinated with a lock file under `~/.acpx/queues/<hash>.lock`.
- On Windows, named pipes are used instead of Unix sockets.
- After the queue drains, owner shutdown is governed by TTL (default 300s, configurable with `--ttl`).

Submission behavior:

- Default: enqueue and wait for queued prompt completion, streaming updates back.
- `--no-wait`: enqueue and return after queue acknowledgement.
- `Ctrl+C` during an active turn sends ACP `session/cancel`, waits briefly, then force-kills only if cancellation does not finish in time.
- `cancel` sends the same cooperative cancellation without requiring terminal signals.

## Output formats

Use `--format <fmt>`:

- `text` (default): human-readable stream with updates/tool status and done line
- `json`: NDJSON event stream (good for automation)
- `quiet`: final assistant text only

Example automation:

```bash
acpx --format json codex exec "review changed files" \
  | jq -r 'select(.type=="tool_call") | [.status, .title] | @tsv'
```

Use `--json-strict` with `--format json` when your caller requires JSON-only output channels.

## Permission modes

- `--approve-all`: no interactive permission prompts
- `--approve-reads` (default): approve reads/searches, prompt for writes
- `--deny-all`: deny all permission requests

If every permission request is denied/cancelled and none approved, `acpx` exits with permission-denied status.

## Practical workflows

Persistent repo assistant:

```bash
acpx codex "inspect failing tests and propose a fix plan"
acpx codex "apply the smallest safe fix and run tests"
```

Parallel named streams:

```bash
acpx codex -s backend "fix API pagination bug"
acpx codex -s docs "draft changelog entry for release"
```

Queue follow-up without waiting:

```bash
acpx codex "run full test suite and investigate failures"
acpx codex --no-wait "after tests, summarize root causes and next steps"
```

One-shot script step:

```bash
acpx --format quiet exec "summarize repo purpose in 3 lines"
```

Machine-readable output for orchestration:

```bash
acpx --format json codex "review current branch changes" > events.ndjson
```

Raw custom adapter command:

```bash
acpx --agent "./bin/custom-acp-server --profile ci" "run validation checks"
```

Repo-scoped review with permissive mode:

```bash
acpx --cwd ~/repos/shop --approve-all codex -s pr-842 \
  "review PR #842 for regressions and propose minimal patch"
```

## Gotchas

1. **No session found**: Prompt mode requires an existing saved session. Run `sessions new` or `sessions ensure` first.

2. **Positional agent vs `--agent`**: Do not combine them in the same command. Use either a built-in/positional agent or `--agent <command>`, not both.

3. **Named session scope**: `-s <name>` creates a separate conversation within the same repo. Without `-s`, prompts go to the cwd-default session.

4. **JSON-only output**: `--json-strict` requires `--format json` and cannot be combined with `--verbose`.

5. **Permission prompts in CI**: Set `--non-interactive-permissions fail` to fail fast when a prompt would otherwise block.

6. **Exec may be disabled by config**: If `disableExec` is `true` in config, the `exec` subcommand is unavailable even though the binary supports it.

## Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | Success |
| `1` | Agent/protocol/runtime error |
| `2` | CLI usage error |
| `3` | Timeout |
| `4` | No session found |
| `5` | Permission denied |
| `130` | Interrupted (SIGINT/SIGTERM) |

## Additional resources

- `references/agents.md` - Detailed agent registry and adapter notes
- `references/sessions.md` - Session management deep dive
- `references/workflows.md` - Practical workflow patterns
