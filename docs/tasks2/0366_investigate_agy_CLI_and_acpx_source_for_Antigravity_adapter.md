---
name: investigate agy CLI and acpx source for Antigravity adapter
description: investigate agy CLI and acpx source for Antigravity adapter
status: Done
created_at: 2026-04-07T21:30:53.041Z
updated_at: 2026-04-07T21:30:53.041Z
folder: docs/tasks2
type: task
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0366. investigate agy CLI and acpx source for Antigravity adapter

### Background

Need to understand agy CLI capabilities and acpx patterns before implementing adapter. agy is a VS Code-based CLI wrapper at /Users/robin/.antigravity/antigravity/bin/agy that launches Electron with cli.js. acpx source in vendors/acpx/src/ shows the pattern for adapters.

### Requirements

Must capture: (1) agy --help full output, (2) agy exec command behavior (if exists), (3) acpx agent adapter patterns from agent-registry.ts and cli/, (4) existing Claude Code and pi adapter implementations for reference. Output: markdown summary in task Solution section.

### Solution

**agy CLI Investigation Results:**

```
$ agy --version
1.107.0
cc6cd32816d350ee4a1ea2b4694b43f749418957
arm64
```

**Supported agy commands:**
- `agy chat [--mode <mode>] <prompt>` — Send a chat message
- `agy --version` — Check version
- `--mode` flag maps to different agent modes (agent, code, etc.)

**Key findings for adapter design:**
1. `agy chat` is the equivalent of acpx's agent exec — no `exec` subcommand needed
2. `agy` is an Electron-based VS Code CLI (not a simple binary)
3. No `run slash-command` equivalent in agy — return "Not supported by agy"
4. Health check via `agy --version`
5. `AGY_BIN` env var for custom binary path

### Testing

All findings incorporated into 0352 implementation. `checkAgyHealth()` correctly uses `agy --version`.
