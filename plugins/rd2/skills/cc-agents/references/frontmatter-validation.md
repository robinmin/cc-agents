# Agent Frontmatter Validation Schema

Reference for validating Claude Code agent frontmatter fields.
Based on official Claude Code documentation: https://code.claude.com/docs/en/subagents

## Official Schema (from Claude Code docs)

### Required Fields

Only these two fields are required by the official schema:

| Field | Required | Format | Example |
|-------|----------|--------|---------|
| `name` | Yes | lowercase-hyphens, 3-50 chars | code-reviewer |
| `description` | Yes | Text with trigger conditions | Use when... `<example>`... |

### Optional Fields (with defaults)

| Field | Required | Default | Format | Example |
|-------|----------|---------|--------|---------|
| `model` | No | inherit | inherit/sonnet/opus/haiku | inherit |
| `tools` | No | All tools | Array of tool names | ["Read", "Grep"] |
| `disallowedTools` | No | None | Array of tool names | ["Write", "Edit"] |
| `permissionMode` | No | default | default/acceptEdits/dontAsk/bypassPermissions/plan | default |
| `maxTurns` | No | None | Number | 10 |
| `skills` | No | None | Array of skill names | ["my-skill"] |
| `mcpServers` | No | None | Object | {"slack": {...}} |
| `hooks` | No | None | Object | {PreToolUse: [...]} |
| `memory` | No | None | user/project/local | user |

### Extended Fields (UI-enhanced)

These fields are not in the official YAML schema but are used by the Claude Code UI:

| Field | UI Purpose | Format | Example |
|-------|-----------|--------|---------|
| `color` | Background color in UI | Color name | blue |

**Note:** The `color` field is used by the interactive UI but is not part of the official YAML frontmatter schema. It may be ignored by some tools.

## name Field Validation

**Format:** lowercase, numbers, hyphens only
**Length:** 3-50 characters
**Pattern:** Must start and end with alphanumeric

### Valid Examples:
- `code-reviewer`
- `test-generator`
- `api-docs-writer`
- `security-analyzer`
- `my-agent-v2`

### Invalid Examples:
- `helper` - too generic
- `-agent-` - starts/ends with hyphen
- `my_agent` - underscores not allowed
- `ag` - too short (< 3 chars)
- `agent-name-with-way-too-much-text-that-exceeds-fifty-characters-long` - exceeds 50 chars

## description Field Validation

**Length:** 10-5,000 characters
**Must include:**
1. Triggering conditions ("Use this agent when...")
2. Multiple `<example>` blocks showing usage
3. Context, user request, and assistant response in each example
4. `<commentary>` explaining why agent triggers

### Format:
```
Use this agent when [conditions]. Examples:

<example>
Context: [Scenario description]
user: "[What user says]"
assistant: "[How Claude should respond]"
<commentary>
[Why this agent is appropriate]
</commentary>
</example>

[More examples...]
```

### Best Practices:
- Include 2-4 concrete examples
- Show proactive and reactive triggering
- Cover different phrasings of same intent
- Explain reasoning in commentary
- Be specific about when NOT to use the agent

## model Field Validation

**Options:**
- `inherit` - Use same model as parent (default if omitted)
- `sonnet` - Claude Sonnet (balanced)
- `opus` - Claude Opus (most capable, expensive)
- `haiku` - Claude Haiku (fast, cheap)

**Note:** If `model` field is omitted, it defaults to `inherit`. This field is optional.

**Recommendation:** Use `inherit` unless agent needs specific model capabilities.

## color Field Validation (Extended/UI Field)

**Note:** This field is NOT in the official Claude Code YAML schema but is used by the interactive UI.

**Options:** `blue`, `cyan`, `green`, `yellow`, `magenta`, `red`

### Guidelines:
- Choose distinct colors for different agents in same plugin
- Use consistent colors for similar agent types
- Blue/cyan: Analysis, review
- Green: Success-oriented tasks
- Yellow: Caution, validation
- Red: Critical, security
- Magenta: Creative, generation

**Validation Note:** The validator should treat `color` as optional - it will be ignored by some tools that only support the official schema.

## tools Field Validation

**Format:** Array of tool names
**Default:** If omitted, agent has access to all tools

### Examples:
```yaml
tools: ["Read", "Write", "Grep", "Bash"]
tools: ["Read", "Grep", "Glob"]
tools: []
```

### Common Tool Sets:
- Read-only analysis: `["Read", "Grep", "Glob"]`
- Code generation: `["Read", "Write", "Grep"]`
- Testing: `["Read", "Bash", "Grep"]`
- Full access: Omit field or use `["*"]`

### Best Practice:** Limit tools to minimum needed (principle of least privilege)

## Invalid Fields

**These fields are NOT valid for agent frontmatter:**
- `agent:` - Use `name:` instead
- `subagents:` - Not a valid field
- `orchestrates:` - Not a valid field
- `skills:` - Use `skills:` array field (valid in official schema)
- `prompt:` - Use body instead (system prompt)

## Additional Valid Fields from Official Schema

The official schema also supports these fields not mentioned above:
- `disallowedTools` - Tools to deny access
- `permissionMode` - Control permission prompts
- `maxTurns` - Limit agentic turns
- `mcpServers` - MCP server configurations
- `hooks` - Lifecycle hooks
- `memory` - Persistent memory scope

## System Prompt Validation

The markdown body becomes the agent's system prompt.

**Length:** 20-10,000 characters
**Best:** 500-3,000 characters

### Structure Requirements:
- Clear responsibilities
- Process steps
- Output format
- Quality standards
- Edge cases

## Validation Rules Summary

### Identifier Validation
```
✅ Valid: code-reviewer, test-gen, api-analyzer-v2
❌ Invalid: ag (too short), -start (starts with hyphen), my_agent (underscore)
```

### Rules:
- 3-50 characters
- Lowercase letters, numbers, hyphens only
- Must start and end with alphanumeric
- No underscores, spaces, or special characters

### Description Validation
- Length: 10-5,000 characters
- Must include: Triggering conditions and examples
- Best: 200-1,000 characters with 2-4 examples
