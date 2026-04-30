# Main Agent Customization Reference (Verified 2026-04-30)

This document is the base material for refactoring `rd3:cc-magents` in
`plugins/rd3/skills/cc-magents`. It focuses on **main agent customization**:
the project/global instruction files and rule systems that shape a coding
agent's default behavior.

The important correction: there is no universal 5-file stack across all major
tools. `AGENTS.md` is the strongest cross-tool baseline, but each platform has
different discovery, precedence, scoping, import, and configuration mechanics.
`rd3:cc-magents` should model those mechanics explicitly instead of treating
main-agent files as regex-detected markdown variants.

## Verification Status

| Platform | Verification status | Primary source |
| --- | --- | --- |
| AGENTS.md | High | OpenAI `agents.md` repository |
| OpenAI Codex | High | OpenAI Codex docs and published system message |
| Claude Code | High | Anthropic Claude Code memory docs |
| Gemini CLI | High | Google Gemini CLI docs |
| OpenCode | High | OpenCode rules and agents docs |
| Cursor | High | Cursor rules docs |
| GitHub Copilot / VS Code | High | GitHub Copilot custom instructions docs |
| Windsurf Cascade | High | Windsurf Memories & Rules docs |
| Cline | High | Cline Rules docs |
| Zed | High | Zed AI Rules docs |
| Amp | High | Amp manual |
| Aider | High | Aider docs |
| OpenClaw | Medium | OpenClaw docs exist, but ecosystem docs are fragmented |
| Google Antigravity | Low/Medium | Community reports only; official docs not found during verification |
| Pi / OpenAI cloud UI variants | Low | No stable official customization spec found |

## Universal Baseline: AGENTS.md

`AGENTS.md` is an open markdown convention for coding-agent instructions. It is
best treated as "README for agents": codebase structure, build/test commands,
style rules, review/release processes, and safety constraints.

Key semantics confirmed from OpenAI's published Codex system message and
`agents.md` material:

- `AGENTS.md` can appear in multiple locations.
- Scope is the directory tree rooted at the folder containing the file.
- More deeply nested files take precedence for conflicts.
- Direct system/developer/user prompt instructions override `AGENTS.md`.
- If checks are listed, agents should make a best effort to run them after
  changes.
- Standard markdown is enough; the spec does not require a rigid schema.

Design implication for `cc-magents`: parse markdown structure, but preserve
arbitrary headings and unknown sections. Validation should score usefulness and
operability, not enforce a single canonical template.

## Platform Behavior Matrix

| Platform | Native files / locations | Discovery and precedence | Imports / modularity | Main-agent customization notes |
| --- | --- | --- | --- | --- |
| OpenAI Codex | `AGENTS.md` | Scoped by directory tree; nested files override broader ones. Codex docs mention an optional `child_agents_md` feature flag for additional hierarchy guidance. | No official `@` import support in `AGENTS.md` found. | Codex relies strongly on `AGENTS.md` for repo instructions and verification commands. |
| Claude Code | `CLAUDE.md`, user/project memories | Recursively reads `CLAUDE.md` from cwd upward; nested subtree `CLAUDE.md` files are loaded when Claude reads files in those subtrees. Higher-level memories load first; more specific memories build on them. | Supports `@path` imports, relative and absolute paths, recursive up to 5 hops. `CLAUDE.local.md` is deprecated in favor of imports. | Best bridge: keep `CLAUDE.md` as a thin entrypoint importing portable files and Claude-specific behavior. |
| Gemini CLI | `GEMINI.md` by default; `context.fileName` can configure names such as `AGENTS.md` | Hierarchical context loading from global, workspace/parents, and JIT/subdirectory context files. Content is concatenated and inspectable via `/memory show`. | Supports `@file.md` imports in context files. `context.fileName` supports a string or list. | Best bridge: use `GEMINI.md` or configure `context.fileName` to include `AGENTS.md`; avoid relying on unverified Antigravity semantics. |
| OpenCode | `AGENTS.md`; `CLAUDE.md` fallback; `~/.config/opencode/AGENTS.md`; `.opencode/agents/*.md` for agents | Local traversal from cwd using `AGENTS.md` first, then `CLAUDE.md`; global OpenCode file; Claude global fallback unless disabled. First matching local file wins per category. | Does not automatically parse `@` references in `AGENTS.md`. Recommended modularity is `opencode.json` `instructions` with files/globs/URLs. Manual lazy-loading instructions are a fallback. | Supports primary agents and subagents via `opencode.json` or `.opencode/agents/*.md`, with modes and permissions. |
| Cursor | `.cursor/rules/*.mdc`; user rules; `AGENTS.md`; legacy `.cursorrules` | Project rules can be Always, Auto Attached by glob, Agent Requested, or Manual. `AGENTS.md` is a root-level simple alternative in current docs; nested support has been planned/reported but should not be assumed unless docs say so. | Cursor rules can reference files with `@filename`. | Best bridge: generate `.cursor/rules/*.mdc` for rich scoping; generate root `AGENTS.md` only for simple portable rules. |
| GitHub Copilot / VS Code | `.github/copilot-instructions.md`; `.github/instructions/*.instructions.md`; `AGENTS.md`; root `CLAUDE.md` or `GEMINI.md`; local `$HOME/.copilot/copilot-instructions.md` for CLI | Repository-wide, path-specific, and agent instructions may combine. For agent instructions, nearest `AGENTS.md` takes precedence. Copilot CLI can also search paths from `COPILOT_CUSTOM_INSTRUCTIONS_DIRS`. | Path-specific instructions use `applyTo` frontmatter. | Best bridge: emit `.github/copilot-instructions.md` for repo-wide guidance and `.github/instructions/*.instructions.md` for path scopes; support `AGENTS.md` for agent mode. |
| Windsurf Cascade | `.windsurf/rules/*.md`; global `~/.codeium/windsurf/memories/global_rules.md`; `AGENTS.md` in workspace directories; enterprise system rules | Rules can be `always_on`, `glob`, `model_decision`, or `manual`. Root `AGENTS.md` is always-on; subdirectory `AGENTS.md` acts like a location-scoped glob rule. | Rule frontmatter controls trigger and globs. | Best bridge: model both rules and `AGENTS.md`; enforce character budgets: global rules 6,000 chars, workspace rules 12,000 chars each. |
| Cline | `.clinerules/*.md`; global rules dir; `.cursorrules`; `.windsurfrules`; `AGENTS.md` | Workspace and global rules combine; workspace rules win on conflict. Cline detects multiple rule formats and exposes toggles. Nested `AGENTS.md` search is documented as recursive only when a top-level `AGENTS.md` exists. | Conditional `.clinerules` support YAML frontmatter with `paths` globs. | Best bridge: generate `.clinerules/*.md` for focused rules; generate `AGENTS.md` for cross-tool baseline. |
| Zed | `.rules`, `.cursorrules`, `.windsurfrules`, `.clinerules`, `.github/copilot-instructions.md`, `AGENT.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` | Top-level worktree rule file auto-included. Zed uses the first matching file in its documented compatibility order. | Rules Library supports default and on-demand rules. | Best bridge: prefer `.rules` for Zed-native output; be careful when multiple compatible files exist because only the first matching one is used. |
| Amp | `AGENTS.md` in cwd, parents, subtrees; `$HOME/.config/amp/AGENTS.md`; `$HOME/.config/AGENTS.md`; system-wide paths | Cwd/editor roots and parent `AGENTS.md` files always included up to `$HOME`; subtree files included when files in subtree are read. User and system files are always included if present. | No official `@` import behavior found in manual. | Best bridge: `AGENTS.md` is native and hierarchical. |
| Aider | `.aider.conf.yml`; files loaded by `/read` or `--read` | Config files load from home, git root, then current directory; later files take priority. | Use `read: CONVENTIONS.md` in `.aider.conf.yml` for always-loaded read-only convention files. | Aider is not `AGENTS.md`-native in verified docs; adapt by generating a conventions file plus config `read` entries. |
| OpenClaw | `SOUL.md`, `IDENTITY.md`, `USER.md`, `AGENTS.md`, `MEMORY.md`, plus docs mention `TOOLS.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` | OpenClaw docs emphasize startup reading of identity/user/memory files. Some docs say runtime may already provide startup context and manual rereads should be avoided unless needed. | Plain markdown files; no verified `@` import processing. | Treat OpenClaw as a multi-file platform, not as a single converted markdown target. Split content by role: identity, user preferences, operating rules, tools, and memory. |
| Google Antigravity | Reported `GEMINI.md` and `AGENTS.md` | Official documentation was not found in this verification pass. Community sources claim `AGENTS.md` support and possible precedence interactions with `GEMINI.md`, but the claims conflict. | Unknown. | Do not encode hard precedence rules until official docs are available. Mark as provisional in `cc-magents`. |

## Corrected Findings from the Previous Draft

- The "five core files" pattern (`SOUL.md`, `IDENTITY.md`, `USER.md`,
  `AGENTS.md`, `MEMORY.md`) is **OpenClaw-specific**, not a universal
  requirement.
- Claude Code should use `CLAUDE.md`, not `AGENTS.md`, as the native entrypoint.
  `CLAUDE.md` can import portable files with `@path`.
- Gemini CLI defaults to `GEMINI.md`, but can be configured with
  `context.fileName`; it also supports context imports.
- OpenCode is not merely "manual": it natively supports `AGENTS.md`, has
  `CLAUDE.md` compatibility fallbacks, supports `opencode.json` instruction
  files/globs/URLs, and supports configurable primary/subagents.
- Cursor's modern native format is `.cursor/rules/*.mdc`; `.cursorrules` is
  legacy. `AGENTS.md` is useful for simple root-level instructions.
- Windsurf, Cline, Zed, Amp, Copilot, and Aider have important customization
  mechanics missing from the original draft.
- Antigravity claims in the original draft are not sufficiently verified. Keep
  support provisional until official docs or installed-product behavior tests
  confirm file names, precedence, and imports.

## Main Agent Capability Model Needed by `cc-magents`

`cc-magents` should pivot from a filename/keyword detector to a capability-aware
main-agent configuration system.

### Core Entities

| Entity | Meaning |
| --- | --- |
| Instruction document | A source file such as `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/foo.mdc`, or `.github/copilot-instructions.md`. |
| Rule | A scoped instruction unit with activation behavior: always, glob/path, manual, agent-requested/model-decision, or subtree/JIT. |
| Persona / identity | Agent role, voice, principles, boundaries. Native in OpenClaw; usually plain sections elsewhere. |
| User preference | Human preferences and environment assumptions. Native in OpenClaw; often merged into global/user rules elsewhere. |
| Memory / persistence | Durable learned facts. Native or semi-native only in some tools; often must be represented as a referenced file or out-of-band process. |
| Permission / safety policy | Tool permissions, destructive-operation rules, approval boundaries. Native in OpenCode agents; markdown elsewhere. |
| Adapter feature | A platform-specific capability such as Claude imports, Gemini `context.fileName`, Windsurf triggers, Cline `paths`, or Copilot `applyTo`. |

### Required Adapter Metadata

Every platform adapter should expose:

- `nativeFiles`: canonical file names and locations.
- `discovery`: root-only, cwd-upward, subtree/JIT, configured paths, global files.
- `precedence`: conflict rules and load ordering.
- `modularity`: native imports, config-listed files, globs, manual lazy-loading, or none.
- `scoping`: global, project, directory, path/glob, manual, model-decision.
- `limits`: known line/character/token limits where documented.
- `supports`: parse, generate, validate, adapt, multi-file output, loss reporting.
- `confidence`: High/Medium/Low with source URLs and verification date.

### Refactor Recommendation

Use a richer Universal Main Agent Model, but do not force all platforms into a
single-section markdown shape. Recommended model:

```typescript
interface MainAgentWorkspace {
  documents: InstructionDocument[];
  rules: AgentRule[];
  personas: PersonaProfile[];
  memories: MemoryPolicy[];
  permissions: PermissionPolicy[];
  platformBindings: PlatformBinding[];
  sourceEvidence: SourceEvidence[];
}
```

This model lets `cc-magents` answer real questions:

- Which files should exist for this platform?
- Which instructions are always active versus path-scoped?
- What will be lost if converting from Claude to Copilot, or from OpenCode to
  Codex?
- Which references must become native imports, config `instructions`, or manual
  lazy-load instructions?
- Which claims are verified versus provisional?

## Recommended Cross-Platform Strategy

| Need | Recommended source of truth | Platform-specific output |
| --- | --- | --- |
| Portable project instructions | `AGENTS.md` | Use directly for Codex, Amp, OpenCode, Windsurf, Cline, Copilot agent mode, Zed compatibility. |
| Claude Code | `CLAUDE.md` | Thin bridge with `@AGENTS.md` and Claude-specific sections/imports. |
| Gemini CLI | `GEMINI.md` or configured `AGENTS.md` | Prefer `GEMINI.md` bridge or `.gemini/settings.json` `context.fileName` when you control config. |
| Rich Cursor behavior | `.cursor/rules/*.mdc` | Split by activation type and globs. |
| Rich Copilot behavior | `.github/copilot-instructions.md` and `.github/instructions/*.instructions.md` | Map repo-wide and path-specific guidance separately. |
| Rich Windsurf behavior | `.windsurf/rules/*.md` | Map trigger modes and character limits. |
| Rich Cline behavior | `.clinerules/*.md` | Map `paths` frontmatter and toggle-friendly files. |
| OpenCode agents | `opencode.json` and `.opencode/agents/*.md` | Model primary/subagent modes, prompts, tools, and permissions. |
| OpenClaw | Multi-file workspace | Generate `SOUL.md`, `IDENTITY.md`, `USER.md`, `AGENTS.md`, `MEMORY.md`, and optional operational files. |
| Aider | `.aider.conf.yml` plus convention files | Use `read:` entries to load generated guidance. |

## Source Notes

Verified on 2026-04-30:

- OpenAI AGENTS.md: https://github.com/openai/agents.md
- OpenAI Codex AGENTS.md docs: https://github.com/openai/codex/blob/main/docs/agents_md.md
- OpenAI Codex published system message: https://openai.com/index/introducing-codex/
- Anthropic Claude Code memory docs: https://docs.anthropic.com/en/docs/claude-code/memory
- Gemini CLI context files: https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/gemini-md.md
- Gemini CLI configuration: https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md
- OpenCode rules: https://opencode.ai/docs/rules/
- OpenCode agents: https://opencode.ai/docs/agents/
- Cursor rules: https://docs.cursor.com/en/context/rules
- GitHub Copilot repository custom instructions: https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions
- GitHub Copilot CLI custom instructions: https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions
- Windsurf Cascade Memories & Rules: https://docs.windsurf.com/windsurf/cascade/memories
- Cline Rules: https://docs.cline.bot/customization/cline-rules
- Zed AI Rules: https://zed.dev/docs/ai/rules
- Amp manual: https://ampcode.com/manual
- Aider conventions: https://aider.chat/docs/usage/conventions.html
- Aider config: https://aider.chat/docs/config/aider_conf.html
- OpenClaw default AGENTS.md: https://docs.openclaw.ai/reference/AGENTS.default
- OpenClaw AGENTS template: https://docs.openclaw.ai/reference/templates/AGENTS
- OpenClaw SOUL.md guide: https://clawdocs.org/guides/soul-md/

Community-only / lower-confidence Antigravity sources reviewed:

- https://antigravity.md/
- https://antigravitylab.net/en/articles/tips/agents-md-guide
- https://antigravitylab.net/en/articles/agents/antigravity-agents-md-gemini-31-pro

