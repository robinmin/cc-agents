# Substack API Research

## Why Browser Automation?

**Substack has NO official API**. According to multiple sources:

- No official public API for content publishing
- Unofficial Python/TypeScript libraries exist but are fragile:
  - [NHagar/substack_api](https://github.com/NHagar/substack_api) - Python wrapper, limited functionality
  - [jakub-k-slys/substack-api](https://github.com/jakub-k-slys/substack-api) - TypeScript client, incomplete
- Browser automation via Chrome CDP is the most reliable approach

## Unofficial Libraries Status

| Library | Language | Status | Limitations |
|---------|----------|--------|-------------|
| NHagar/substack_api | Python | Incomplete | Limited functionality, not actively maintained |
| jakub-k-slys/substack-api | TypeScript | Incomplete | Missing core publishing features |
| ty13r/substack-mcp-plus | TypeScript (MCP) | Active | 12 tools but still browser-based |

## Sources

- [NHagar/substack_api - Unofficial Python wrapper](https://github.com/NHagar/substack_api)
- [jakub-k-slys/substack-api - TypeScript client](https://github.com/jakub-k-slys/substack-api)
- [ty13r/substack-mcp-plus - Substack MCP with 12 tools](https://github.com/ty13r/substack-mcp-plus)
- [n8n community - Substack automation discussion](https://community.n8n.io/t/n8n-to-substack-automated-publishing-solutions-needed/67671)

## Technical Rationale

**Why Chrome CDP over alternatives:**

1. **Reliability**: Direct DOM manipulation vs API abstraction layers
2. **Maintenance**: DOM selectors easier to update than API reverse-engineering
3. **Authentication**: Cookie-based sessions work reliably
4. **Future-proof**: If Substack releases official API, migration path remains clear
