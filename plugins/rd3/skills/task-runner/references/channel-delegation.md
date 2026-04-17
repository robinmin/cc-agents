# Channel Delegation Reference

**Documentation-only.** Channel normalization and ACP invocation are owned by `rd3:run-acp`. `task-runner` forwards raw channel names; it does not normalize.

## Supported Channel Values

| Value | Meaning |
|-------|---------|
| `current` | Run in the current agent and workspace |
| `codex` | Delegate via `rd3:run-acp` → ACP agent `codex` |
| `openclaw` | Delegate via `rd3:run-acp` → ACP agent `openclaw` |
| `opencode` | Delegate via `rd3:run-acp` → ACP agent `opencode` |
| `antigravity` | Delegate via `rd3:run-acp` → ACP agent `antigravity` |
| `pi` | Delegate via `rd3:run-acp` → ACP agent `pi` |
| `claude-code` | Delegate via `rd3:run-acp` → ACP agent `claude` |

## Channel Alias Normalization (Reference Only)

The following mapping is **implemented in `rd3:run-acp`**, not here. Listed for documentation clarity:

| Slash command value | ACP agent |
|---------------------|-----------|
| `claude-code` | `claude` |
| `codex` | `codex` |
| `openclaw` | `openclaw` |
| `opencode` | `opencode` |
| `antigravity` | `antigravity` |
| `pi` | `pi` |

## Routing Rules

- **Default:** `current` — all stages run in the current agent and workspace
- **Keep local:** `refine` and `test` unless strong reason otherwise
- **Delegable:** `plan`, `implement`, `verify` may use explicit external channel
- **Dogfood rule:** When modifying `rd3:run-acp` or `rd3:code-verification`, force `--channel current` to avoid circular delegation

## Channel Resolution (`auto` — if supported)

If a caller passes `--channel auto`:

| Scope | Routing |
|-------|---------|
| Small scope (single file, simple change) | `current` for all stages |
| Large scope (multi-module, architectural) | Delegate heavy phases (`plan`, `implement`, `verify`) via ACP |

`task-runner` forwards `auto` unchanged; `rd3:run-acp` decides final routing.

## Delegated Prompt Contracts

See `delegated-prompts.md` for phase-specific prompt templates.
