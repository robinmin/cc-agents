# ACP Agent Registry

Reference for built-in agents and custom adapter usage supported by `acpx`.

## Agent Commands

| Agent | Command | Notes |
|------|---------|-------|
| `pi` | `npx pi-acp` | Pi AI assistant |
| `openclaw` | `openclaw acp` | OpenClaw native ACP mode |
| `codex` | `npx @zed-industries/codex-acp` | Zed Industries Codex adapter |
| `claude` | `npx -y @zed-industries/claude-agent-acp` | Claude Code via ACP adapter |
| `gemini` | `gemini --acp` | Google Gemini CLI |
| `cursor` | `cursor-agent acp` | Cursor CLI |
| `copilot` | `copilot --acp --stdio` | GitHub Copilot CLI |
| `droid` | `droid exec --output-format acp` | Factory Droid |
| `iflow` | `iflow --experimental-acp` | iFlow CLI |
| `kilocode` | `npx -y @kilocode/cli acp` | KiloCode |
| `kimi` | `kimi acp` | Kimi CLI |
| `kiro` | `kiro-cli acp` | Kiro CLI |
| `opencode` | `npx -y opencode-ai acp` | OpenCode |
| `qwen` | `qwen --acp` | Qwen Code |

Aliases:

- `factory-droid` -> `droid`
- `factorydroid` -> `droid`

## Resolution Rules

- Default agent for top-level `prompt`, `exec`, `cancel`, `set-mode`, `set`, `status`, and `sessions` is `codex`.
- Unknown positional agent tokens are treated as raw agent commands.
- `--agent <command>` is the explicit escape hatch for custom ACP servers.
- Do not combine a positional agent and `--agent` in the same command.

## Custom Agents

### Using `--agent`

```bash
# Custom ACP adapter
acpx --agent "./bin/my-acp-server" "run task"

# With npx-based adapters
acpx --agent "npx @my-org/custom-acp-adapter" "process data"
```

### Config File Agent Registration

```json
{
  "agents": {
    "my-custom": {
      "command": "./bin/my-acp-server"
    }
  }
}
```

## Agent-Specific Notes

### openclaw

For repo-local OpenClaw checkouts:

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node scripts/run-node.mjs acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

### claude

The Claude ACP adapter requires the Claude CLI to be installed and authenticated.

```bash
# Verify connectivity
acpx --format json claude exec "ping"
```

### codex

These are equivalent because `codex` is the default top-level agent:

```bash
acpx "fix bug"
acpx codex "fix bug"
```

These are also equivalent one-shot forms:

```bash
acpx exec "fix bug"
acpx codex exec "fix bug"
```

Prompt mode and `exec` are not equivalent: prompt mode uses persistent saved sessions, while `exec` is always one-shot.

## Adapter Auto-Download

Most adapters are downloaded automatically via `npx` on first use. Ensure `npx` is available and network access is allowed for initial setup.

## Verifying Agent Availability

```bash
# Check agent status
acpx <agent> status

# Test with one-shot exec
acpx --format quiet <agent> exec "echo test"
```

Exit code `1` with protocol/runtime error usually indicates the agent adapter or underlying CLI is not available.
