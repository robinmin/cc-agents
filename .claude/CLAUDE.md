# Naming Conventions

**CRITICAL**: Always use full namespace when referencing Agent Skills, subagents, and slash commands.

## Core Rule

**ALWAYS use full namespace** - `plugin-name:resource-name` for plugin resources

## Component Naming Patterns

| Component | Naming Pattern | Example | Correct Reference |
|------------|---------------|---------|-------------------|
| **Slash Command** | `noun-verb` (grouped) | `code-generate.md` | `/rd2:code-generate` |
| **Agent Skill** | `verb-ing-noun` | `tdd-workflow` | `rd2:tdd-workflow` |
| **Subagent** | `role-agent` | `code-reviewer-agent` | `super-code-reviewer` (internal) |

## Slash Command Grouping Rule

When multiple slash commands share the same domain, use `noun-verb` format (NOT `verb-noun`):

**Purpose**: Groups related commands together alphabetically in listings

**Examples:**
- `agent-add.md`, `agent-evaluate.md`, `agent-refine.md` (all "agent" commands grouped)
- `code-generate.md`, `code-review.md` (all "code" commands grouped)
- `tasks-plan.md`, `tasks-cli.md` (all "tasks" commands grouped)

## Reference Rules

### 1. Agent Skills (CRITICAL)

**ALWAYS use full namespace**: `plugin-name:skill-name`

```bash
# Correct
rd2:tdd-workflow
rd2:code-review-gemini
rd2:tasks

# WRONG - will cause confusion
tdd-workflow
code-review-gemini
tasks
```

### 2. Slash Commands

**ALWAYS use full namespace with slash**: `/plugin-name:command-name`

```bash
# Correct
/rd2:code-generate
/rd2:tasks-cli
/rd2:agent-evaluate

# WRONG
code-generate
rd2:code-generate (missing /)
```

### 3. Subagents (Agents)

Can use bare names when clearly internal to the plugin, but full namespace is clearer:

```bash
# Acceptable (internal context)
super-architect
super-coder

# Clearer (external context)
super-code-reviewer
rd2:super-planner (explicit)
```

## Examples from rd2 Plugin

### Correct References

```markdown
## In SKILL.md files

- Delegate to `rd2:tdd-workflow` for test-driven development
- Use `rd2:tasks` for task file management
- Invoke `rd2:code-review-gemini` for comprehensive review

## In command examples

/rd2:code-generate "Implement OAuth2"
/rd2:tasks-plan --architect "Design event bus"
/rd2:agent-evaluate data-pipeline

## See Also sections

- `rd2:tdd-workflow` - Test-driven development
- `rd2:tasks` - Task management
- `/rd2:code-review` - Code review command
```

## Why This Matters

1. **Prevents Confusion**: LLM knows exactly which plugin/resource to use
2. **Avoids Name Collisions**: Multiple plugins may have `tasks` skill
3. **Enables Auto-Routing**: Proper namespace triggers correct agent routing
4. **Documentation Clarity**: Clear origin of each resource

## Quick Reference Card

```
┌─────────────────┬──────────────────┬─────────────────────────┐
│ Component       │ Pattern          │ Example Reference       │
├─────────────────┼──────────────────┼─────────────────────────┤
│ Slash Command   │ noun-verb        │ /rd2:code-generate      │
│ Agent Skill     │ verb-ing-noun    │ rd2:tdd-workflow        │
│ Subagent        │ role-agent       │ super-architect         │
│ Coder Skill     │ verb-ing-noun    │ rd2:code-review-gemini  │
│ Reviewer Skill  │ noun-review      │ rd2:code-review-auggie  │
└─────────────────┴──────────────────┴─────────────────────────┘
```

## Common Mistakes to Avoid

| Mistake | Why Wrong | Correct |
|---------|-----------|---------|
| `tasks` | Missing plugin prefix | `rd2:tasks` |
| `/tasks` | Missing plugin prefix | `/rd2:tasks-cli` |
| `generate-code` | Old format, wrong | `code-generate` or `/rd2:code-generate` |
| `super-code-reviewer` (as command) | Agent, not command | `/rd2:code-review` (command) |
| `rd2:super-coder` (as skill) | Agent, not skill | Use agent directly or via command |

## File Organization Implications

```
plugins/rd2/
├── commands/           # Slash commands (noun-verb.md)
│   ├── code-generate.md     → /rd2:code-generate
│   ├── code-review.md      → /rd2:code-review
│   └── tasks-cli.md        → /rd2:tasks-cli
├── agents/             # Subagents (role-agent.md)
│   ├── super-architect.md   # Internal reference: super-architect
│   └── super-coder.md       # Internal reference: super-coder
└── skills/             # Agent Skills (verb-ing-noun/)
    ├── tdd-workflow/SKILL.md     → rd2:tdd-workflow
    ├── tasks/SKILL.md            → rd2:tasks
    └── code-review-gemini/SKILL.md → rd2:code-review-gemini
```

## References

- Official Claude Code Documentation
- rd2 Plugin CHANGELOG.md - Naming evolution history
- rd2 Plugin Skills: cc-agents, cc-skills
