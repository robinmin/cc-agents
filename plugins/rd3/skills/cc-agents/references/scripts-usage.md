# Scripts Usage Reference

Full CLI arguments and defaults for all cc-agents pipeline scripts.

## scaffold.ts

```
bun scripts/scaffold.ts <agent-name> [description] [options]

Arguments:
  <agent-name>              Name of the agent (hyphen-case, 3-50 chars)
  [description]             Optional agent description (free-text)

Options:
  -p, --path <dir>          Output directory (default: ./agents)
  -t, --template <tier>     Template: minimal, standard, specialist (default: standard)
      --description <text>  Agent description (alternative to positional)
      --tools <list>        Comma-separated tools (default: Read,Grep,Glob,Bash)
      --model <model>       Model override (default: inherit)
      --color <color>       Display color (default: teal)
      --plugin-name <name>  Plugin name for skill references
      --skills <list>       Comma-separated skills to delegate to
  -v, --verbose             Verbose output
  -h, --help                Show help
```

**Examples:**

```bash
# Standard agent with defaults
bun scripts/scaffold.ts my-agent --path ./agents

# Agent with description
bun scripts/scaffold.ts expert-foo "Thin wrapper for cc-foo skill" --path ./agents --skills "rd3:cc-foo"

# Minimal agent with custom tools
bun scripts/scaffold.ts quick-helper --path ./agents --template minimal --tools "Read,Grep"

# Specialist agent with plugin context
bun scripts/scaffold.ts domain-expert --path ./agents --template specialist --plugin-name rd3 --color blue
```

---

## validate.ts

```
bun scripts/validate.ts <agent-path> [options]

Arguments:
  <agent-path>              Path to agent .md file

Options:
      --platform <name>     Platform: claude, gemini, opencode, codex, openclaw, antigravity, all (default: claude)
  -v, --verbose             Show detailed output
      --json                Output as JSON
  -h, --help                Show help
```

**Examples:**

```bash
# Validate for Claude Code (default)
bun scripts/validate.ts ./agents/my-agent.md

# Validate for all platforms
bun scripts/validate.ts ./agents/my-agent.md --platform all

# JSON output for programmatic use
bun scripts/validate.ts ./agents/my-agent.md --json
```

---

## evaluate.ts

```
bun scripts/evaluate.ts <agent-path> [options]

Arguments:
  <agent-path>              Path to agent .md file

Options:
      --scope <level>       Evaluation scope: basic, full (default: full)
      --profile <name>      Weight profile: thin-wrapper, specialist, auto (default: auto)
      --output <format>     Output format: json, text (default: text)
  -v, --verbose             Show detailed findings
  -h, --help                Show help
```

**Examples:**

```bash
# Full evaluation with auto-detected profile
bun scripts/evaluate.ts ./agents/my-agent.md --scope full

# Force thin-wrapper profile
bun scripts/evaluate.ts ./agents/my-agent.md --profile thin-wrapper

# JSON output for CI/CD integration
bun scripts/evaluate.ts ./agents/my-agent.md --output json
```

---

## refine.ts

```
bun scripts/refine.ts <agent-path> [options]

Arguments:
  <agent-path>              Path to agent .md file

Options:
  -e, --eval                Run evaluation before refinement
      --migrate             Enable rd2 to rd3 migration mode
      --best-practices      Apply best practice auto-fixes
  -o, --output <path>       Output path (default: in-place)
      --dry-run             Show what would be changed
  -v, --verbose             Show detailed output
  -h, --help                Show help
```

**Examples:**

```bash
# Full refinement cycle: evaluate then fix
bun scripts/refine.ts ./agents/my-agent.md --eval --best-practices

# Preview changes without writing
bun scripts/refine.ts ./agents/my-agent.md --best-practices --dry-run

# Migrate rd2 agent to rd3 format
bun scripts/refine.ts ./agents/legacy-agent.md --migrate

# Write refined output to new file
bun scripts/refine.ts ./agents/my-agent.md --best-practices --output ./agents/my-agent-v2.md
```

---

## adapt.ts

```
bun scripts/adapt.ts <source-file> <source-platform> [target-platform] [options]

Arguments:
  <source-file>             Path to agent source file
  <source-platform>         Source: claude, gemini, opencode, codex, openclaw
  [target-platform]         Target: claude, gemini, opencode, codex, openclaw, antigravity, all (default: all)

Options:
  -o, --output <dir>        Output directory (default: same as source)
      --dry-run             Preview without writing files
      --verbose             Show detailed output
      --help                Show help
```

**Examples:**

```bash
# Convert Claude agent to all platforms
bun scripts/adapt.ts ./agents/my-agent.md claude all

# Convert to specific platform
bun scripts/adapt.ts ./agents/my-agent.md claude gemini

# Preview conversion without writing
bun scripts/adapt.ts ./agents/my-agent.md claude codex --dry-run

# Output to custom directory
bun scripts/adapt.ts ./agents/my-agent.md claude all --output ./adapted/
```

---

## evolve.ts

```
bun scripts/evolve.ts <agent-path> --analyze|--propose|--apply <id>|--history|--rollback <ver> [options]

Arguments:
  <agent-path>              Path to agent .md file

Commands:
      --analyze             Analyze longitudinal improvement signals
      --propose             Draft governed improvement proposals
      --apply <id>          Apply a saved proposal (requires --confirm)
      --history             Show applied version history
      --rollback <ver>      Restore a previous version (requires --confirm)

Options:
      --confirm             Required for apply and rollback
  -h, --help                Show help
```

**Examples:**

```bash
# Analyze current evolution signals
bun scripts/evolve.ts ./agents/my-agent.md --analyze

# Generate persisted proposals
bun scripts/evolve.ts ./agents/my-agent.md --propose

# Apply a proposal with backup + history
bun scripts/evolve.ts ./agents/my-agent.md --apply p1234 --confirm

# Roll back to a previous version
bun scripts/evolve.ts ./agents/my-agent.md --rollback v1 --confirm
```
