# Code Review Best Practices

Guidelines for effective code reviews using Auggie.

## Querying Tips

1. **Be specific about context**: Include relevant constraints, team size, timeline
2. **Use semantic queries**: Auggie understands code relationships, not just text
3. **Focus the review**: Use `--focus` to prioritize what matters most
4. **Leverage codebase awareness**: Auggie knows your code structure

## Review Quality Indicators

Good reviews from Auggie should include:
- Specific file and line references with context
- Severity ratings (Critical/High/Medium/Low)
- Clear impact descriptions
- Actionable fix recommendations
- Awareness of existing patterns in codebase

If reviews lack these:
- Provide more specific queries
- Narrow the review scope
- Use broader search terms for context gathering

## When to Use Auggie

| Scenario              | Use Auggie Because                     |
| --------------------- | -------------------------------------- |
| Internal code review  | Knows codebase structure and patterns  |
| Architecture analysis | Semantic understanding of dependencies |
| Quick questions       | Fast local semantic search             |

## When to Use Gemini Instead

| Scenario              | Use Gemini Because                     |
| --------------------- | -------------------------------------- |
| External perspective  | Unbiased outside view                  |
| Complex reasoning     | More capable reasoning model           |
| New code/PRs          | No index bias against new patterns     |

## Improving Review Results

### 1. Start Broad, Then Narrow

```bash
# First: Understand the area
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py run "Show me the authentication module"

# Then: Specific questions
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py run "How is JWT validation implemented?"
```

### 2. Use Semantic Language

```bash
# Good: Domain terms
"Where are user permissions checked?"

# Bad: Literal text
"Find 'if user.has_perm'"
```

### 3. Focus on Priority

```bash
# Start with critical issues only
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review src/ \
  --focus security
```

## Review Workflow

1. **Plan scope** - Determine what to review
2. **Choose focus** - Select relevant focus areas
3. **Run review** - Execute with appropriate flags
4. **Import tasks** - Convert issues to task files
5. **Track progress** - Update task stages as you fix

## See Also

- `../SKILL.md` - Main skill documentation
- `auggie-query-patterns.md` - Effective query patterns
- `tool-comparison.md` - Auggie vs Gemini comparison
