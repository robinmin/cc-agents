# Distribution Guide

This guide covers sharing and distributing Claude Code skills.

## Overview

After creating a skill, you can share it with others through:
- GitHub repositories (recommended)
- Claude Code API (programmatic usage)
- Organization-wide deployment

---

## GitHub Hosting (Recommended)

### Repository Structure

```
my-skill/
├── SKILL.md           # Required
├── scripts/           # Optional
├── references/        # Optional
├── assets/            # Optional
├── README.md          # Human-readable documentation
├── LICENSE            # Open source license
└── examples/          # Usage examples
```

### README.md Template

```markdown
# [Skill Name]

[One-line description]

## When to Use

Use this skill when:
- [Scenario 1]
- [Scenario 2]
- [Scenario 3]

## Installation

1. Download this skill to your Claude Code skills folder
2. Enable the skill in Claude Code settings
3. Test with: "[trigger phrase]"

## Examples

> "[Example trigger]"
> [Expected behavior]

## Requirements

- [MCP server X] (if applicable)
- [API keys] (if applicable)

## Documentation

- [SKILL.md](./SKILL.md) - Full skill documentation
- [references/](./references/) - Additional guides

## License

[Your license]
```

### Best Practices

1. **Human-first README** - Write for developers, not AI
2. **Include screenshots** - Visual examples help
3. **Link from MCP docs** - Help users find your skill
4. **Quick-start guide** - 3 steps or fewer

---

## API Usage

### Programmatic Skill Usage

```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-20250514",
    messages=[{"role": "user", "content": "Help me with database design"}],
    container={"skills": ["db-schema-design"]}
)
```

### Container Configuration

```python
# Use multiple skills
container = {
    "skills": [
        "db-schema-design",
        "sql-optimization",
        "data-migration"
    ]
}

# Or use with project context
container = {
    "project": "./my-project",
    "skills": ["code-review"]
}
```

---

## Skill Positioning

### Focus on Outcomes

| Good | Bad |
|------|-----|
| "Set up project workspaces in seconds" | "A folder with YAML frontmatter" |
| "Generate APIs from your database" | "A tool that reads schema files" |
| "Debug production issues 10x faster" | "A debugging methodology" |

### Highlight Value

```yaml
# Instead of:
description: "A skill for database design"

# Use:
description: "This skill should be used when you need to design a database schema,
create tables, or modify an existing database. It helps you: define efficient
schemas, set proper indexes, generate migrations. Examples: 'add user table',
'create relationship', 'optimize for read performance'."
```

### MCP + Skills Synergy

Promote how your skill works with MCP:

> "This skill coordinates [Service] MCP calls to automate [workflow], saving
> hours of manual work. Works with the official [Service] MCP server."

---

## Organization-Level Skills

### Benefits

- **Workspace-wide deployment** - All team members get access
- **Centralized management** - Update once, everyone has latest
- **Automatic updates** - Push changes without user action
- **Access control** - Restrict sensitive skills

### Deployment Steps

1. Host skill in organization's GitHub
2. Share installation instructions
3. Document in internal wiki
4. Set up update workflow

---

## Installation Guide Template

For your skill's README:

```markdown
## Installation

### Step 1: Download

[Option A: Direct download]
Download the skill folder and place in your skills directory.

[Option B: Git clone]
git clone https://github.com/yourorg/your-skill.git
cd your-skill

### Step 2: Install Dependencies

[If MCP required]
npx @yourorg/mcp-server

[If API keys needed]
export YOUR_API_KEY="xxx"

### Step 3: Enable

1. Open Claude Code settings
2. Navigate to Skills
3. Enable [Skill Name]

### Step 4: Test

Try: "[trigger phrase]"

Expected: [What happens]
```

---

## Distribution Checklist

- [ ] README.md with quick start (3 steps)
- [ ] Screenshots/videos of usage
- [ ] Installation instructions
- [ ] Requirements (MCP servers, API keys)
- [ ] Link from MCP documentation
- [ ] License file
- [ ] Examples folder
- [ ] CHANGELOG.md for versions

---

## See Also

- [Skill Anatomy](anatomy.md) - Structure guide
- [Best Practices](best-practices.md) - Quality guidance
- [Common Mistakes](common-mistakes.md) - What to avoid
- [Troubleshooting](troubleshooting.md) - Installation issues
