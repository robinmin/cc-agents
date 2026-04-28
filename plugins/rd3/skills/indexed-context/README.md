# indexed-context

Always-on agent intelligence layer powered by OpenWolf. Provides file index awareness, learning memory, token tracking, bug history, Design QC, Reframe framework selection, and daemon/cron management.

## Quick Start

1. Install OpenWolf: `npm install -g openwolf`
2. Initialize in your project: `openwolf init`
3. The skill activates automatically at session start

## Features

- **File Index** — anatomy.md describes every file's content and token cost
- **Learning Memory** — cerebrum.md accumulates preferences, conventions, and mistakes
- **Token Tracking** — lifetime usage stats with savings estimation
- **Bug Memory** — buglog.json prevents re-discovering the same bugs
- **Design QC** — screenshot-based design evaluation
- **Reframe** — structured UI framework comparison and migration
- **Daemon & Cron** — scheduled maintenance and live dashboard

## Structure

```
indexed-context/
├── SKILL.md                        # Main skill definition
├── README.md                       # This file
└── reference/
    └── hooks-protocol.md           # Hook scripts reference
```

## Platform Support

Claude Code, pi, Codex, OpenCode, OpenClaw, Antigravity

## See Also

- [OpenWolf](https://github.com/nicepkg/openwolf)
- Auto-activation wrapper — check agents directory for the companion subagent
