# Examples Reference

## Scaffold Examples

### Minimal Agent

```bash
bun scripts/scaffold.ts code-reviewer --path ./agents --template minimal
```

Creates a minimal agent (~30 lines) with basic structure.

### Standard Agent

```bash
bun scripts/scaffold.ts backend-architect --path ./agents --template standard --description "Design backend systems"
```

Creates a standard agent (~80 lines) with persona, process, rules sections.

### Specialist Agent

```bash
bun scripts/scaffold.ts fullstack-expert --path ./agents --template specialist
```

Creates a specialist agent (~250 lines) with full 8-section anatomy.

## Validate Examples

### Basic Validation

```bash
bun scripts/validate.ts ./agents/my-agent.md
```

Checks frontmatter, required fields, YAML syntax.

### With Platform

```bash
bun scripts/validate.ts ./agents/my-agent.md --platform claude
```

Validates against Claude Code constraints.

## Evaluate Examples

### Full Evaluation

```bash
bun scripts/evaluate.ts ./agents/my-agent.md --scope full
```

Scores across all 10 dimensions with full report.

### With Weight Profile

```bash
bun scripts/evaluate.ts ./agents/my-agent.md --profile specialist
```

Uses specialist weight profile (emphasizes body quality).

### JSON Output

```bash
bun scripts/evaluate.ts ./agents/my-agent.md --output json
```

Machine-readable output.

## Refine Examples

### Best Practice Fixes

```bash
bun scripts/refine.ts ./agents/my-agent.md --best-practices
```

Applies deterministic fixes:
- Remove TODO markers
- Fix second-person language
- Fix Windows paths

### With Migration

```bash
bun scripts/refine.ts ./agents/my-agent.md --migrate
```

Runs rd2→rd3 migration + best practices + LLM refine.

### Dry Run

```bash
bun scripts/refine.ts ./agents/my-agent.md --best-practices --dry-run
```

Shows changes without writing.

## Adapt Examples

### Single Platform

```bash
bun scripts/adapt.ts ./agents/my-agent.md claude gemini
```

Generates Gemini CLI format.

### All Platforms

```bash
bun scripts/adapt.ts ./agents/my-agent.md claude all
```

Generates all 6 platform formats.

### With Preview

```bash
bun scripts/adapt.ts ./agents/my-agent.md claude all --verbose
```

Shows loss detection warnings.

## End-to-End Pipeline

```bash
# 1. Scaffold
bun scripts/scaffold.ts my-agent --path ./agents --template standard

# 2. Validate
bun scripts/validate.ts ./agents/my-agent.md

# 3. Evaluate
bun scripts/evaluate.ts ./agents/my-agent.md --scope full

# 4. Refine (if needed)
bun scripts/refine.ts ./agents/my-agent.md --best-practices

# 5. Adapt to all platforms
bun scripts/adapt.ts ./agents/my-agent.md claude all
```

## Sample Output

After running adapt with `--platform all`:

```
agents/
├── my-agent.md              # Claude Code format (source)
├── .gemini/
│   └── agents/
│       └── my-agent.md      # Gemini CLI format
├── my-agent.opencode.md     # OpenCode format
├── my-agent.codex.toml      # Codex TOML config
├── my-agent.openclaw.json   # OpenClaw JSON config
└── my-agent.antigravity.md # Antigravity advisory
```
