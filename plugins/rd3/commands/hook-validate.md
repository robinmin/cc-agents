---
description: Validate hook config schema and lint hook scripts
argument-hint: "<config-or-script-path> [--lint]"
allowed-tools: ["Read", "Glob", "Bash"]
---

# Hook Validate

Wraps **rd3:cc-hooks** skill.

Validate an abstract hook config against the JSON Schema, and optionally lint hook shell scripts for common issues.

## When to Use

- Before emitting configs to verify the abstract hook definition is valid
- After editing `hooks.yaml` to catch syntax errors
- Before committing hook scripts to check for security issues
- As a pre-commit check for hook-related files

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `config-or-script-path` | Path to hooks.yaml/json or a shell script | (required) |
| `--lint` | Also run the hook linter on any .sh scripts referenced in the config | false |

## What Gets Validated

### For hook configs (`.yaml`, `.json`):
- Valid JSON/YAML syntax
- Required fields present (`version`, `hooks`)
- Hook type correctness (`command` or `prompt`)
- Matcher format
- Timeout ranges (1-3600 seconds)
- No unknown event names

### For shell scripts (`.sh`):
- Shebang presence (`#!/bin/bash`)
- `set -euo pipefail` usage
- Input reading from stdin
- Proper error handling
- Variable quoting (injection risk)
- Exit code usage (0 or 2)
- Hardcoded path detection
- Timeout considerations

## Examples

```bash
# Validate abstract hook config
/rd3:hook-validate ./hooks.yaml

# Validate and lint referenced scripts
/rd3:hook-validate ./hooks.yaml --lint

# Lint a single hook script
/rd3:hook-validate ./scripts/validate-bash.sh
```

## Implementation

For config files:
```bash
bash plugins/rd3/skills/cc-hooks/scripts/validate-hook-schema.sh $ARGUMENTS
```

For shell scripts:
```bash
bash plugins/rd3/skills/cc-hooks/scripts/hook-linter.sh $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation or run script directly
- Other platforms: Run script directly via Bash tool
