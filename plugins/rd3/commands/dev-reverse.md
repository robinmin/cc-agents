---
allowed-tools: ["Read", "Write", "Edit", "Grep", "Glob"]
description: Generate HLD document and critical issue audit for codebase
argument-hint: "[<path>] [--focus <security|architecture|all>] [--output <file.md>]"
---

# Dev Reverse

Analyze a codebase to produce a High-Level Design (HLD) document and critical issue audit. Delegates to **rd3:reverse-engineering** skill.

## When to Use

- Identify unfamiliar codebase structure and dependencies
- Generate architecture documentation for team onboarding
- Audit code quality before refactoring
- Find technical debt and security issues

## Quick Start

```bash
# Analyze current project
/rd3:dev-reverse

# Analyze specific path
/rd3:dev-reverse src/auth/

# Focus on security issues
/rd3:dev-reverse --focus security

# Save output to file
/rd3:dev-reverse --output docs/hld.md
```

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `<path>` | Directory or file to analyze | project root |
| `--focus` | Analysis focus: `security\|architecture\|all` | `all` |
| `--output` | Write HLD to file instead of conversation | (none) |

## Workflow (Claude Code)

1. Parse `$ARGUMENTS` for `<path>`, `--focus`, and `--output` flags
2. Invoke `rd3:reverse-engineering` skill with the parsed arguments
3. Skill executes 4-phase analysis: Reconnaissance -> Component Mapping -> Quality Audit -> Synthesis
4. Output HLD document with Mermaid diagrams and prioritized audit report
5. If `--output` specified, write to the given file path; otherwise display in conversation

## Output

Review two deliverables:
- **High-Level Design**: Architecture, components, data design, business flows
- **Critical Audit**: Prioritized issues with file evidence and remediation steps

## Platform Notes

- **Claude Code**: Invoke via `Skill("rd3:reverse-engineering")` delegation. Parse `$ARGUMENTS` for flags.
- **Codex**: Run script directly. Arguments passed as prompt context — extract from user message.
- **Gemini CLI**: Run script directly. Arguments available via TOML prompt template.
- **OpenClaw**: Run script directly. Arguments dispatched via `command-dispatch` metadata.
- **OpenCode**: Run script directly. Arguments embedded in chat context.
- **Antigravity**: Mention-triggered. Extract arguments from user message.

Script path for non-Claude platforms:

```bash
bun plugins/rd3/skills/reverse-engineering/scripts/analyze.ts <path> --focus <scope> --output <file>
```
