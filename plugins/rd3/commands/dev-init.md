---
description: Initialize and validate project infrastructure for the 9-phase pipeline
argument-hint: "[--stack <auto|typescript-bun-biome|python-uv-ruff|go-mod>] [--json]"
allowed-tools: ["Read", "Glob", "Bash"]
disable-model-invocation: true
---

# Dev Init

Validate that the current project has everything needed to run the 9-phase orchestration pipeline.

**Not a pipeline phase.** This is a pre-flight check that runs before `/rd3:dev-run`.

## When to Use

- Before running `/rd3:dev-run` for the first time on a project
- After adding or removing project configuration files
- In CI to verify the project meets orchestration requirements

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--stack <type>` | No | Override auto-detected stack. Default: auto-detect from project files |
| `--json` | No | Output machine-readable JSON report |

## What It Checks

1. **Task Infrastructure** — `docs/.tasks/config.jsonc`, task templates, task directories. Created automatically if missing.
2. **Stack Configuration** — Project files for the detected stack (e.g. `package.json`, `tsconfig.json`, `biome.json` for TypeScript+Bun+Biome). **Not created automatically** — reports what is missing.
3. **Required Scripts** — Declared scripts in `package.json` (e.g. `typecheck`, `lint`, `test`). **Not created automatically** — reports what is missing.

## Workflow

Runs the init script directly (does not go through orchestration):

```
# Auto-detect stack and validate
Bash(command="bun plugins/rd3/skills/orchestration-dev/scripts/init.ts")

# Force a specific stack
Bash(command="bun plugins/rd3/skills/orchestration-dev/scripts/init.ts --stack typescript-bun-biome")

# JSON output for scripting
Bash(command="bun plugins/rd3/skills/orchestration-dev/scripts/init.ts --json")
```

Exit code 0 = ready, 1 = not ready.

## Examples

```bash
/rd3:dev-init
/rd3:dev-init --stack typescript-bun-biome
/rd3:dev-init --json
```

## See Also

- **/rd3:dev-run**: Profile-driven pipeline execution
- **/rd3:tasks init**: Task infrastructure only (dev-init calls this internally)
