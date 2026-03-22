# ACP Session Management

Deep dive into `acpx` session behavior, scoping, persistence, and queueing.

## Session Storage

Sessions are stored as JSON files in:

```text
~/.acpx/sessions/
```

Each session file contains metadata such as:

- `sessionId`
- `agentCommand`
- `cwd`
- `name`
- `pid`
- `createdAt`
- `lastUsedAt`
- `closed`
- `closedAt`
- `history`

## Session Scope Key

Sessions are uniquely scoped by the tuple:

```text
(agentCommand, absoluteCwd, optionalName)
```

Examples:

| Scope | Session Key |
|-------|-------------|
| codex in `/home/user/project` | (`codex`, `/home/user/project`, null) |
| codex backend session | (`codex`, `/home/user/project`, `backend`) |
| claude in `/home/user/project` | (`claude`, `/home/user/project`, null) |

## Auto-Resume Behavior

When running `acpx codex "prompt"`:

1. Walk up from `absoluteCwd` to git root, if one exists
2. At each directory, check for an active session matching scope
3. If found, resume that session
4. If not found, exit with code `4` and prompt for `sessions new`

```text
/home/user/project/src  -> check (codex, /home/user/project/src, null)
/home/user/project      -> check (codex, /home/user/project, null)
/home/user/.git         -> stop (git root reached, no match)
-> exit 4: no session found
```

## Git-Root-Bounded Search

Session lookup is bounded by the nearest git root. This prevents session mismatch when navigating subdirectories.

```bash
# In src/utils/ subdirectory
acpx codex "fix bug"  # Still finds session scoped to project root

# Explicitly different scope
acpx --cwd . codex "fix bug"  # New session scope for the current cwd
```

## Creating Sessions

```bash
# Create default session for current cwd
acpx sessions new
acpx codex sessions new

# Create named session
acpx codex sessions new --name backend

# Idempotent get-or-create
acpx codex sessions ensure
acpx codex sessions ensure --name backend

# Create a local record by resuming an existing ACP session id
acpx codex sessions new --resume-session <acp-session-id>
acpx codex sessions ensure --resume-session <acp-session-id>
```

### Soft Close Behavior

When creating a new session that replaces an existing one:

- Old session is soft-closed: marked `closed: true`, `closedAt` set
- Old session is retained on disk for history inspection
- Auto-resume skips closed sessions
- To explicitly reconnect an existing ACP session id while creating a local record, use `--resume-session <id>`

## Queue System

### Queue Owner

- First `acpx` process to start a prompt becomes the queue owner
- Owner keeps the agent process alive between prompts
- Owner waits for new work up to TTL
- Other `acpx` invocations submit work via IPC

### Queue IPC Details

- Unix sockets on macOS/Linux: `~/.acpx/queues/<hash>.sock`
- Named pipes on Windows
- Lock file coordination: `~/.acpx/queues/<hash>.lock`

### TTL (Time To Live)

```bash
# Default: 300 seconds
acpx codex "first prompt"
acpx codex --no-wait "second prompt"  # owner waits 300s after drain

# Custom TTL
acpx --ttl 60 codex "quick task"
acpx --ttl 0 codex "keep queue owner alive indefinitely"
```

### `--no-wait`

```bash
# Blocks until prompt completes
acpx codex "long-running analysis"

# Returns immediately after queue acknowledgement
acpx codex --no-wait "fire-and-forget task"
```

## Cancel and Interrupt

### Cancel Command

```bash
acpx codex cancel
```

This sends `session/cancel` through queue-owner IPC if a prompt is active; otherwise `acpx` reports that there is nothing to cancel.

### Interrupt (`Ctrl+C`)

1. Sends `session/cancel`
2. Waits briefly for graceful cancellation
3. Force-kills only if cancellation does not complete

### Dead Process Detection

If a queue owner dies unexpectedly:

1. Next `acpx` prompt detects the dead PID
2. Respawns the agent subprocess
3. Attempts `session/load` with saved state
4. Falls back to `session/new` if load fails

## Session Inspection

```bash
# View recent turn previews
acpx codex sessions history
acpx codex sessions history --limit 10
acpx codex sessions history backend --limit 20

# Read full stored history
acpx codex sessions read
acpx codex sessions read backend --tail 50

# Show session metadata
acpx codex sessions show
acpx codex sessions show backend

# Check process status
acpx codex status
acpx codex status -s backend
```

Status output reports whether the local session is running, dead, or missing and includes process/session metadata when available.
