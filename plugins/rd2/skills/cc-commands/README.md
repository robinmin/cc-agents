# cc-commands Skill

Create, evaluate, and refine Claude Code slash commands.

## Quick Commands

```bash
# Validate a command
python3 scripts/validate_command.py your-command.md

# Check frontmatter
# Use allowed fields only: description, allowed-tools, argument-hint, model, disable-model-invocation
```

## Directory Structure

```
cc-commands/
├── SKILL.md                    # Main skill documentation
├── README.md                   # This file
├── references/                # Detailed references
│   ├── frontmatter-reference.md
│   ├── ClaudeCodeBuilt-inTools.md
│   └── plugin-features-reference.md
├── examples/                   # Example commands
│   ├── simple-commands.md
│   └── plugin-commands.md
├── assets/                     # Templates
│   └── command-template.md
├── scripts/                    # Helper scripts
│   └── validate_command.py
└── tests/                     # Test scenarios
    └── scenarios.yaml
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Command not in /help | Check file location (commands/) |
| Arguments not working | Use $1, $2 with matching argument-hint |
| Invalid YAML | Validate frontmatter syntax |
| Too long | Move details to references/ |
