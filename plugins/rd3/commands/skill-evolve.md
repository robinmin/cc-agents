---
description: Analyze skill evolution signals and draft proposals
argument-hint: "<skill-path> --analyze|--propose|--apply <id>|--history|--rollback <ver>"
allowed-tools: ["Read", "Write", "Glob", "Bash", "Skill"]
disable-model-invocation: true
---

# Skill Evolve

Wraps **rd3:cc-skills** skill.

Analyze skill quality over time, persist refine-backed proposals, and apply or roll back changes through saved directory snapshots. See [Evolve Workflow](references/workflows.md#evolve-workflow) for full step details.

## When to Use

- Generate proposals after evaluation drift or repeated review feedback
- Apply low-risk fixes through `refine.ts` with snapshot-backed rollback
- Inspect current evolution history
- Propose follow-up changes when a skill's interaction-pattern design needs to mature over time

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `skill-path` | Path to the skill directory | (required) |
| `--analyze` | Analyze longitudinal improvement signals | - |
| `--propose` | Draft governed improvement proposals | - |
| `--apply <id>` | Apply a saved proposal through deterministic refine flow | - |
| `--history` | Show applied version history | - |
| `--rollback <ver>` | Restore a previous version from history | - |
| `--confirm` | Required for apply and rollback | false |

## Examples

```bash
# Analyze current evolution signals
/rd3:skill-evolve ./skills/my-skill --analyze

# Generate persisted proposals
/rd3:skill-evolve ./skills/my-skill --propose

# Apply a proposal with confirmation
/rd3:skill-evolve ./skills/my-skill --apply p1234 --confirm
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-skills** skill:

```
Skill(skill="rd3:cc-skills", args="evolve $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-skills/scripts/evolve.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
