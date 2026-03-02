# Validation

Status transitions are validated against task content to ensure quality. This applies to both direct status updates and `--phase` auto-advance.

## Validation Matrix

Validation blocks status transitions when required sections are empty or placeholder-only:

| Section          | Backlog/Todo |    WIP     |  Testing   |    Done    |
| ---------------- | :----------: | :--------: | :--------: | :--------: |
| **Background**   |      -       |  required  |  required  |  required  |
| **Requirements** |      -       |  required  |  required  |  required  |
| **Solution**     |      -       |  required  |  required  |  required  |
| **Design**       |      -       | suggestion | suggestion | suggestion |
| **Plan**         |      -       | suggestion | suggestion | suggestion |
| **Q&A**          |      -       |  optional  |  optional  |  optional  |
| **Artifacts**    |      -       |  optional  |  optional  |  optional  |
| **References**   |      -       | suggestion | suggestion | suggestion |

**Legend:**
- **required** = Tier 2 warning, blocks unless `--force`
- **optional** = no check
- **suggestion** = Tier 3, informational only

## Tiered Validation

| Tier       | Type              | Behavior                                                        |
| ---------- | ----------------- | --------------------------------------------------------------- |
| **Tier 1** | Structural errors | Always block (missing frontmatter)                              |
| **Tier 2** | Content warnings  | Block unless `--force` (empty Background/Requirements/Solution) |
| **Tier 3** | Suggestions       | Informational only (empty References)                           |

## Validation Commands

```bash
# Preview validation for single task
tasks check 47

# Validate ALL tasks across all folders
tasks check
```

### Bulk Validation Output

```
[CHECK] Validated 179 tasks across 1 folder(s)

  0 errors, 12 warnings in 5 task(s):

  0042_feature.md (WIP): 0 errors, 2 warnings
  0043_bugfix.md (Todo): 0 errors, 1 warnings
```

## Force Bypass

```bash
# Populate required sections before starting work
tasks update 47 --section Solution --from-file /tmp/0047_solution.md

# Now transition to WIP (validation passes)
tasks update 47 wip

# If required sections are empty, validation blocks:
tasks update 47 wip          # Blocked if Background, Requirements, or Solution is placeholder
tasks update 47 wip --force  # Bypass warnings
```

## Validation with Phases

Auto-advance via `--phase` also respects tiered validation:

```bash
tasks update 47 --phase testing completed         # Blocked if Design is placeholder
tasks update 47 --phase testing completed --force  # Bypass warnings
```
