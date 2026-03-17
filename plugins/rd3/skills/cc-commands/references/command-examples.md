# cc-commands: Command Examples

## Example 1: Scaffold a Simple Command

```bash
bun run scripts/scaffold.ts review-code --template simple --path ./commands
# Creates: ./commands/review-code.md
```

## Example 2: Evaluate and Fix

```bash
# Evaluate
bun run scripts/evaluate.ts ./commands/review-code.md --scope full --json

# Refine based on findings
bun run scripts/refine.ts ./commands/review-code.md --from-eval eval-results.json
```

## Example 3: Generate Platform Variants

```bash
# Generate Gemini CLI TOML equivalent
bun run scripts/adapt.ts ./commands/ --platform gemini

# Generate all platform variants
bun run scripts/adapt.ts ./commands/ --platform all
```
