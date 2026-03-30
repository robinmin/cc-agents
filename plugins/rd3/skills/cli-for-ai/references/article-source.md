# Source References — CLI for AI Agents

Primary source: "Designing CLIs for AI Agents: Patterns That Work in 2026" by David Min [Medium, Mar 11, 2026]

## Referenced Works

1. Justin Poehnelt — "You Need to Rewrite Your CLI for AI Agents" — https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents/
2. "Writing CLI Tools That AI Agents Actually Want to Use" — Dev.to — https://dev.to/uenyioha/writing-cli-tools-that-ai-agents-actually-want-to-use-39no
3. "Making Your CLI Agent-Friendly" — Speakeasy — https://www.speakeasy.com/blog/engineering-agent-friendly-cli
4. "Why CLI Is the New MCP for AI Agents" — OneUptime — https://oneuptime.com/blog/post/2026-02-03-cli-is-the-new-mcp/view
5. "MCP vs. CLI for AI Agents: A Practical Decision Framework" — Manveer Chawla — https://manveerc.substack.com/p/mcp-vs-cli-ai-agents
6. "Why CLI Tools Are Beating MCP for AI Agents" — Jannik Reinhard — https://jannikreinhard.com/2026/02/22/why-cli-tools-are-beating-mcp-for-ai-agents/
7. "Keep the Terminal Relevant: Patterns for AI Agent Driven CLIs" — InfoQ — https://www.infoq.com/articles/ai-agent-cli/
8. Google Workspace CLI — Reference Implementation — https://github.com/googleworkspace/cli

## Key Quotes

> "Human developer experience optimizes for discoverability and forgiveness, while agent developer experience optimizes for predictability and defense-in-depth." — Justin Poehnelt, Google

> "The dual-mode pattern — human-friendly by default, machine-friendly with `--json` and `--non-interactive` — has become the standard approach. Same binary, two audiences." — David Min

> "Treat agent input as adversarial." — Justin Poehnelt, Google

## Token Efficiency Comparison

| Approach | Token Cost |
|---|---|
| CLI command + output | ~200 tokens |
| MCP server tool definitions | 150,000+ tokens |
| CLI with `--fields` mask | ~50 tokens |
