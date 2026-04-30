---
description: Guided hook creation with multi-platform emission
argument-hint: "[--template security|test-enforcement|context-loading|full] [--output <path>]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Hook Setup

Wraps **rd3:cc-hooks** skill.

Interactive guided workflow to create an abstract hook config and emit platform-specific configs. Walks the user through event selection, hook behavior, and target platforms.

## When to Use

- First-time hook setup for a project
- Add hooks to a project that doesn't have them yet
- Create hooks from a pre-built template
- Guided walkthrough for users unfamiliar with the hook system

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `--template` | Pre-built template: security, test-enforcement, context-loading, full | (none — interactive) |
| `--output` | Output path for abstract hook config | `./hooks.yaml` |
| `--emit` | Also emit platform configs after creation | true |
| `--platform` | Target platforms for emission | auto-detect |
| `--dry-run` | Preview without writing files | false |

## Templates

### security
Blocks dangerous commands and file writes:
- PreToolUse: Validate bash commands for destructive operations
- PreToolUse: Validate file writes to sensitive paths

### test-enforcement
Ensures tests run before stopping:
- Stop: Verify tests were executed after code changes
- PostToolUse: Log tool results for audit

### context-loading
Loads project context at session start:
- SessionStart: Detect project type and load context
- PreToolUse: Validate writes to project-specific paths

### full
Combines all templates plus notification logging:
- All events from security, test-enforcement, context-loading
- Notification: Log all notifications for audit

## Examples

```bash
# Interactive setup (walks through all options)
/rd3:hook-setup

# Quick setup with security template
/rd3:hook-setup --template security

# Full template, emit to Pi and Claude Code only
/rd3:hook-setup --template full --platform claude-code,pi

# Preview what would be generated
/rd3:hook-setup --template security --dry-run

# Custom output path
/rd3:hook-setup --template test-enforcement --output ./config/hooks.yaml
```

## Workflow

### Step 1: Choose Template or Custom

If `--template` is specified, use the pre-built template. Otherwise, ask the user:
1. Which events? (SessionStart, PreToolUse, PostToolUse, Stop, etc.)
2. What behavior per event? (validate, block, log, load context)
3. Which tools to match? (Bash, Write|Edit, *, etc.)

### Step 2: Generate Abstract Config

Create `hooks.yaml` (or `--output` path) with:
- `version: "1.0"`
- Hook groups for each selected event
- `type: "command"` hooks (portable) with `$PROJECT_DIR` and `$PLUGIN_ROOT` placeholders
- Reasonable timeouts (5s for validation, 30s for test checks)

### Step 3: Emit Platform Configs

Run `emit-hooks.sh` with `--detect` or `--platform` to generate platform-specific configs.

### Step 4: Report

Show:
- Generated abstract config summary
- Which platform configs were created
- Any warnings (e.g., prompt hooks not supported on Pi)
- Next steps (install pi-hooks, run `/reload`, test hooks)

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

```bash
# Step 1-2: LLM-guided config creation (handled by invoking agent)
# Step 3: Emit
bash plugins/rd3/skills/cc-hooks/scripts/emit-hooks.sh $ARGUMENTS
# Step 4: List
bash plugins/rd3/skills/cc-hooks/scripts/hook-list.sh
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation — LLM handles interactive questions
- Other platforms: Read skill file, follow workflow manually, run scripts via Bash tool
- Pi requires `@hsingjui/pi-hooks` extension: `pi install npm:@hsingjui/pi-hooks`
