# README.md

## Background
This folder stores all main agent configs in subfolders. Only main agents go here — subagents live in `plugins/<plugin-name>/agents/`.

## Directory Structure

```
magents/<agent-name>/
├── IDENTITY.md           # Universal — who the agent is
├── SOUL.md               # Universal — tone & decision contract
├── AGENTS.md             # Base operations manual (single source of truth)
├── USER.md               # Universal — operator profile
├── MEMORY.md             # Reference-only (not installed)
└── overrides/            # Per-platform customizations
    ├── codexcli/
    │   └── AGENTS.md     # Codex CLI specific operations
    └── pi/
        └── AGENTS.md     # Pi CLI specific operations
```

## Override Resolution

For each config file (IDENTITY.md, SOUL.md, AGENTS.md, USER.md), the install script checks:

1. `overrides/<platform>/<file>` — platform-specific override
2. `<file>` — base file (fallback)

Override files contain the **complete replacement** for that layer, not a diff. Only files that differ from the base need an override entry.

## Platform Transforms

After concatenation, platform-specific syntax transforms are applied:

| Transform | What it does | Applied to |
|---|---|---|
| `rewrite_skill_references` | `plugin:skill` → `plugin-skill` | All non-Claude-global installs |
| `strip_at_file_refs` | Removes `@file` import lines | Codex CLI |

## Token Profiles

The `--profile` flag controls output verbosity:

| Profile | Effect |
|---|---|
| `full` | Everything included (default) |
| `standard` | Strips `<example>` blocks |
| `compact` | Strips `<example>` blocks, ````text` decision trees |

## Team Details

### team-stark-children — Software Development Team
