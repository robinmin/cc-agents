# cc-commands: Command Examples

## Example 1: Scaffold a Simple Command

```bash
# Basic scaffold (minimal — fill in TODOs manually)
bun scripts/scaffold.ts review-code --path ./commands

# Scaffold with description and skill delegation pre-filled
bun scripts/scaffold.ts review-code "Review code quality and suggest fixes" \
  --skill rd3:cc-review --operation review --plugin-name rd3 --path ./commands

# Scaffold a plugin command (uses CLAUDE_PLUGIN_ROOT)
bun scripts/scaffold.ts deploy-app --template plugin --plugin-name rd3 \
  --skill rd3:cc-deploy --operation deploy --path ./commands
```

## Example 2: Evaluate and Fix

```bash
# Basic evaluation (7 of 10 dimensions)
bun scripts/evaluate.ts ./commands/review-code.md

# Full evaluation with detailed findings
bun scripts/evaluate.ts ./commands/review-code.md --scope full --verbose

# Full evaluation with JSON output
bun scripts/evaluate.ts ./commands/review-code.md --scope full --json

# Refine based on evaluation findings
bun scripts/refine.ts ./commands/review-code.md --from-eval eval-results.json
```

## Example 3: Generate Platform Variants

```bash
# Generate Gemini CLI TOML equivalent
bun scripts/adapt.ts ./commands/ gemini

# Generate all platform variants
bun scripts/adapt.ts ./commands/ all
```

## Key Patterns

### Correct Skill() Invocation

Always pass `args` with operation name:

```
Skill(skill="rd3:cc-skills", args="add $ARGUMENTS")
```

Not:

```
Skill(skill="rd3:cc-skills")  # Missing args — penalized by evaluator
```

### Positional Description

Commands that create or refine accept an optional description as the second positional argument:

```bash
/rd3:command-add review-code "Review code quality and suggest fixes"
/rd3:command-refine ./commands/review-code.md "Focus on security patterns"
```

The `--description` flag takes priority if both are provided.
