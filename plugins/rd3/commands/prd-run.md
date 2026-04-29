---
description: "Core PM workflow: intake + elicit + estimate + decompose"
argument-hint: "'<description>' [--strategy simplify|mvp|standard|mature] [--auto] OR <feature-id> [--auto]"
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
---

> **Argument hints:** `"<description>"` `[--strategy simplify|mvp|standard|mature]` `[--auto]` OR `<feature-id>` `[--auto]`

# prd-run

The primary product management command. Handles two modes based on input:

- **Mode A (new feature):** intake → elicit → estimate → approve → decompose
- **Mode B (existing feature):** readiness check with optional auto-fix

## When to Use

- "I have an idea for a feature" → Mode A
- "Add real-time collaboration" → Mode A
- "Is feature 0391 ready to implement?" → Mode B
- "Check if this feature is decomposed properly" → Mode B

Do NOT use when:
- Need to bootstrap the project (use `prd-init`)
- Need to generate a PRD (use `prd-doc`)
- Need to re-prioritize features (use `prd-adjust`)

## Arguments

### Mode A: New Feature

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `<description>` | Yes | — | Feature idea — can be vague or detailed |
| `--strategy` | No | auto-detect | Force decomposition strategy: `simplify`, `mvp`, `standard`, or `mature` |
| `--auto` | No | `false` | Skip HITL approval after estimation, decompose immediately |

### Mode B: Readiness Check

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `<feature-id>` | Yes | — | Feature ID to check (UUID/string ids accepted) |
| `--auto` | No | `false` | Auto-fix issues where possible |

### Smart Positional Detection

| Input Pattern | Mode | Example |
|---------------|------|---------|
| Single non-flag token that resolves via `ftree context <token>` | B (readiness check) | `prd-run abc123` |
| Text with spaces | A (new feature) | `prd-run "add real-time collab"` |
| Single token that does not resolve as a feature id | A (new feature) | `prd-run search` |

When the first positional argument is a single non-flag token, probe `ftree context <arg>` before selecting a mode. If the feature exists, run Mode B. If the probe fails, treat the token as a new feature description and run Mode A.

## Examples

| Command | Effect |
|---------|--------|
| `/rd3:prd-run "add dark mode"` | Add feature, elicit details, estimate, wait for approval |
| `/rd3:prd-run "add dark mode" --auto` | Same but auto-approve decomposition |
| `/rd3:prd-run "add dark mode" --strategy simplify` | Add feature and create the minimum useful task set |
| `/rd3:prd-run "add SSO" --strategy mature` | Force mature strategy |
| `/rd3:prd-run 0391` | Check if feature 0391 is ready to implement |
| `/rd3:prd-run 0391 --auto` | Check + auto-fix readiness issues |

## Workflow — Mode A (New Feature)

1. **Elicit** — If description is vague (no problem statement, no success criteria), run elicitation to flesh it out
2. **Add to tree** — Create feature node via `ftree add --title "..." --status backlog`
3. **Auto-select strategy** — Unless `--strategy` is specified:
   - Sparse request + user asks for speed/minimal ceremony → `simplify`
   - No success criteria → `mvp`
   - Has criteria + personas → `standard`
   - Has compliance/criticality keywords → `mature`
4. **Estimate decomposition** — Produce estimate: number of tasks, total effort (hours), strategy selected
5. **Approval gate:**
   - `--auto`: auto-approve, proceed to step 6
   - No `--auto`: present estimate, wait for user confirmation (go / switch strategy / cancel)
6. **Decompose** — Create child task files, link to feature via `ftree link`. With `simplify`, create only the minimum useful task set and skip non-blocking elicitation/estimation detail.
7. **Output** — Summary: feature ID, tasks created, WBS numbers, total effort

## Workflow — Mode B (Readiness Check)

1. **Load feature** — `ftree context <feature-id> --format full`
2. **Check readiness gates:**
   - Problem statement exists and is specific
   - Success criteria are measurable
   - Scope boundaries defined (in/out)
   - Feature has linked WBS tasks (decomposed)
   - Tasks have effort estimates
3. **Report** — Pass/fail for each gate, overall readiness score
4. **Auto-fix** (if `--auto`): Run elicitation for missing problem/criteria, run decomposition if not decomposed

## Delegation

Forward the raw slash-command arguments. The product-management skill parses `run` mode, probes feature ids, and handles flags.

```
Skill(skill="rd3:product-management", args="run $ARGUMENTS")
```

## See Also

- **rd3:prd-init**: Bootstrap feature tree before first `prd-run`
- **rd3:prd-adjust**: Adjust priorities or status after decomposition
- **rd3:prd-doc**: Generate PRD from decomposed features
- **rd3:product-management**: Source skill with Workflows 1, 4, 5

## Platform Notes

### Claude Code (primary)

Run the command directly. Uses `Skill()` for delegation.

### Other Platforms

Read the skill file and follow the workflow manually. For cross-channel execution, use `rd3-run-acp`.
