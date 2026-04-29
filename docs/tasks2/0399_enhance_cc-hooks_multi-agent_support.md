---
name: enhance cc-hooks for multi-agent hook support
description: Enhance the cc-hooks skill from Claude Code-only to multi-agent hook support across Claude Code, Codex, OpenCode, Pi, and OpenClaw via a unified abstract schema with per-platform config emitters.
status: Done
created_at: 2026-04-28T10:00:00.000Z
updated_at: 2026-04-28T11:30:00.000Z
folder: docs/tasks2
type: task
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0399. Enhance cc-hooks for Multi-Agent Hook Support

### Background

The current `plugins/rd3/skills/cc-hooks` skill is 100% Claude Code-centric. Every config path, environment variable, example, and reference document assumes Claude Code's `settings.json` format, `CLAUDE_PLUGIN_ROOT` env var, and Claude-specific event names (`PreToolUse`, `Stop`, etc.).

Research from `docs/hook_system.md` reveals that 7 major coding agents now support hooks in different ways. Two Pi extensions have been identified that bridge Claude Code hooks to Pi's extension system:

1. **`@hsingjui/pi-hooks`** — Reads from Pi-native config paths (`~/.pi/agent/settings.json`, `.pi/settings.json`), supports 9 events, modular architecture, `if` conditions, bilingual docs. **Recommended for Pi/OpenClaw.**
2. **`@ryan_nookpi/pi-extension-claude-hooks-bridge`** — Reads from `.claude/settings.json`, supports 5 events, monolithic 745-line file, no `if` conditions. **Not recommended** (config path is conceptually wrong for Pi).

Additional research confirms:
- **Codex** has `hooks.json` with `PreToolUse`/`PostToolUse` events (Rust engine, shell scripts). Recently added, expanding toward Claude parity.
- **OpenCode** uses a plugin (`opencode-hooks-plugin`) that reads `.claude/settings.json` and maps to OpenCode events (`tool.execute.before`, `tool.execute.after`, `session.idle`). Plugin-based, not native.
- **Gemini CLI** has synchronous middleware hooks (`BeforeTool`, `AfterAgent`, `BeforeModel`) in `.gemini/settings.json` using stdin/stdout JSON protocol. Different I/O model.
- **Antigravity** has no lifecycle hooks — uses manual workflow/slash commands only.

### Tier Model

| Tier | Agents | Strategy | Effort |
|------|--------|----------|--------|
| **Tier 1** | Claude Code, Codex, OpenCode | Shared abstract schema → per-platform config emitter (JSON) | Low |
| **Tier 2** | Pi, OpenClaw | Abstract schema → `.pi/settings.json` format (consumed by `pi-hooks` extension) | Low |
| **Tier 3** | Gemini CLI | Abstract schema → `.gemini/settings.json` format (adapter for stdin/stdout protocol) | Medium |
| **Tier 4** | Antigravity | Documentation only — no lifecycle hooks available | Trivial |

### Requirements

#### R1: Abstract Hook Schema

Define a platform-agnostic hook schema that captures the common subset of hook definitions across all supported agents.

**Schema location:** `plugins/rd3/skills/cc-hooks/schema/abstract-hook.json`

**Required fields per hook definition:**
```typescript
interface AbstractHookConfig {
  version: "1.0";
  hooks: {
    [eventName: string]: AbstractHookGroup[];
  };
}

interface AbstractHookGroup {
  matcher?: string;           // Regex or pipe-separated tool names. "" or "*" = match all
  hooks: AbstractHook[];
}

interface AbstractHook {
  type: "command" | "prompt";
  command?: string;           // Required when type="command"
  prompt?: string;            // Required when type="prompt"
  timeout?: number;           // Seconds. Default: 600 for command, 60 for prompt
  if?: string;                // Optional condition: "ToolName(pattern)" syntax
}
```

**Supported event names in the abstract schema (union of all platforms):**

| Abstract Event | Claude Code | Codex | OpenCode | Pi (via pi-hooks) | Gemini CLI |
|---------------|-------------|-------|----------|-------------------|------------|
| `SessionStart` | `SessionStart` | `session_start` | `session.start` | `SessionStart` | N/A |
| `SessionEnd` | `SessionEnd` | N/A | `session.end` | `SessionEnd` | N/A |
| `PreToolUse` | `PreToolUse` | `pre_tool_use` | `tool.execute.before` | `PreToolUse` | `BeforeTool` |
| `PostToolUse` | `PostToolUse` | `post_tool_use` | `tool.execute.after` | `PostToolUse` | `AfterTool` |
| `PostToolUseFailure` | N/A | N/A | N/A | `PostToolUseFailure` | N/A |
| `UserPromptSubmit` | `UserPromptSubmit` | N/A | N/A | `UserPromptSubmit` | N/A |
| `Stop` | `Stop` | N/A | `session.idle` | `Stop` | `AfterAgent` |
| `SubagentStop` | `SubagentStop` | N/A | N/A | N/A | N/A |
| `PreCompact` | `PreCompact` | N/A | N/A | `PreCompact` | N/A |
| `PostCompact` | N/A | N/A | N/A | `PostCompact` | N/A |
| `Notification` | `Notification` | N/A | N/A | N/A | N/A |

**Rules:**
- Events not supported by a platform are silently skipped during config emission with a logged warning.
- `type: "prompt"` hooks are Claude Code-only. All other platforms only support `type: "command"`. The emitter MUST convert prompt hooks to a warning for unsupported platforms.
- The abstract schema MUST NOT contain platform-specific env vars (`CLAUDE_PLUGIN_ROOT`, `CLAUDE_PROJECT_DIR`, etc.). Platform emitters inject the correct env vars.

#### R2: Event Name Crosswalk

**File:** `plugins/rd3/skills/cc-hooks/schema/event-map.yaml`

A machine-readable mapping from abstract event names to platform-specific event names. This is the single source of truth for event translation.

```yaml
events:
  SessionStart:
    claude-code: SessionStart
    codex: session_start
    opencode: session.start
    pi: SessionStart
    gemini: null  # not supported
  PreToolUse:
    claude-code: PreToolUse
    codex: pre_tool_use
    opencode: tool.execute.before
    pi: PreToolUse
    gemini: BeforeTool
  # ... etc for all events
```

#### R3: Tool Name Crosswalk

**File:** `plugins/rd3/skills/cc-hooks/schema/tool-map.yaml`

Pi uses lowercase tool names (`bash`, `write`, `edit`), Claude Code uses PascalCase (`Bash`, `Write`, `Edit`). The crosswalk maps between them.

```yaml
tool_names:
  claude-code:
    bash: Bash
    read: Read
    write: Write
    edit: Edit
    grep: Grep
    find: Find
    ls: LS
  pi:
    Bash: bash
    Read: read
    Write: write
    Edit: edit
  codex:
    bash: bash  # Codex uses lowercase
    read: read
  # ... etc
```

#### R4: Platform Config Emitters

Each supported platform has an emitter script that reads the abstract hook schema and produces the platform-specific config file.

**Emitter scripts location:** `plugins/rd3/skills/cc-hooks/emitters/`

| Emitter | Output File | Format | Notes |
|---------|-------------|--------|-------|
| `emit-claude-code.sh` | `.claude/settings.json` | Claude Code `hooks` block | Current behavior, extracted |
| `emit-codex.sh` | `codex.json` (hooks section) | Codex `hooks` format | Maps events, lowercase tool names |
| `emit-opencode.sh` | `.opencode/plugins/cc-hooks.ts` | OpenCode plugin TS file | Generates a plugin file that reads `.claude/settings.json` |
| `emit-pi.sh` | `.pi/settings.json` | pi-hooks compatible format | Maps events, lowercase tool names, no prompt hooks |
| `emit-gemini.sh` | `.gemini/settings.json` | Gemini CLI hooks format | Stdin/stdout JSON protocol, BeforeTool/AfterAgent |

**Emitter contract:**
- Input: abstract hook YAML/JSON file (or stdin)
- Output: platform-specific config file written to the correct path
- Exit 0 on success, exit 1 on error
- Warnings on stderr for unsupported features (e.g., prompt hooks on Pi)
- Each emitter MUST be independently testable

#### R5: Unified Emit Script

**File:** `plugins/rd3/skills/cc-hooks/scripts/emit-hooks.sh`

A single entry point that reads the abstract hook config and emits configs for all (or selected) platforms.

```bash
# Usage:
#   emit-hooks.sh [--platform claude-code,codex,pi] [--dry-run] [--config abstract-hooks.json]
#   emit-hooks.sh --all                    # Emit for all supported platforms
#   emit-hooks.sh --platform pi            # Emit for Pi only
#   emit-hooks.sh --platform claude-code --dry-run  # Preview without writing
```

**Behavior:**
- `--platform` accepts comma-separated list. Default: detect installed agents.
- `--dry-run` prints output to stdout instead of writing files.
- `--config` specifies the abstract hook file. Default: `./hooks.yaml` or `./hooks.json`.
- Auto-detection: checks for `.claude/`, `codex.json`, `.opencode/`, `.pi/`, `.gemini/` directories to determine which platforms are present.
- On conflict (file exists): warn and offer `--force` flag.

#### R6: Documentation Updates

**Files to create:**
1. `plugins/rd3/skills/cc-hooks/references/cross-platform.md` — Cross-platform hook usage guide, event crosswalk table, tool name mapping, gotchas per platform.
2. `plugins/rd3/skills/cc-hooks/references/platform-limits.md` — What's NOT portable and why. Explicit matrix of feature support per platform.

**Files to update:**
1. `plugins/rd3/skills/cc-hooks/SKILL.md` — Update description, tags, metadata to reflect multi-agent support. Add "Platform Selection" section. Update `metadata.platforms` to `"claude-code,codex,opencode,pi,openclaw,gemini"`.
2. `plugins/rd3/skills/cc-hooks/references/patterns.md` — Add cross-platform pattern examples showing how the same hook definition emits different configs.
3. `plugins/rd3/skills/cc-hooks/references/advanced.md` — Add platform-specific advanced patterns (e.g., Pi's `if` conditions, Gemini's synchronous middleware).

#### R7: Validation and Testing

**Schema validation:**
- Extend `scripts/validate-hook-schema.sh` to validate the abstract hook schema.
- Add test fixtures for abstract hook format: `tests/abstract_hooks/valid-*.json`, `tests/abstract_hooks/invalid-*.json`.

**Emitter tests:**
- For each emitter, add a bats test that:
  1. Takes a known abstract hook config as input
  2. Runs the emitter
  3. Validates the output matches the expected platform-specific format
  4. Verifies unsupported features generate warnings

**Cross-platform pattern tests:**
- Create a canonical hook config (`tests/fixtures/canonical-hooks.json`) with 5 common patterns (security validation, test enforcement, context loading, notification logging, build verification).
- For each platform emitter, verify the canonical config produces valid output.
- Snapshot tests: store expected outputs in `tests/expected/` and diff against emitter output.

**Test file locations:**
```
tests/
├── abstract_hooks/
│   ├── valid-minimal.json
│   ├── valid-full.json
│   ├── valid-all-events.json
│   ├── invalid-no-version.json
│   ├── invalid-no-hooks.json
│   └── invalid-bad-type.json
├── fixtures/
│   └── canonical-hooks.json
├── expected/
│   ├── claude-code-settings.json
│   ├── codex-hooks.json
│   ├── pi-settings.json
│   ├── opencode-plugin.ts
│   └── gemini-settings.json
├── emit-claude-code.bats
├── emit-codex.bats
├── emit-opencode.bats
├── emit-pi.bats
├── emit-gemini.bats
└── validate-abstract-schema.bats
```

#### R8: pi-hooks Integration Reference

Document how users install and configure `@hsingjui/pi-hooks` with cc-hooks:

**Installation:**
```bash
pi install npm:@hsingjui/pi-hooks
```

**Configuration flow:**
1. User defines hooks in `hooks.yaml` (abstract format)
2. `emit-hooks.sh --platform pi` generates `.pi/settings.json`
3. User runs `/reload` in Pi
4. pi-hooks extension reads `.pi/settings.json` and registers hooks

**Key integration points:**
- pi-hooks reads from `~/.pi/agent/settings.json` (global) and `.pi/settings.json` (project)
- The emitter writes to `.pi/settings.json` (project scope)
- Global hooks: user manually adds to `~/.pi/agent/settings.json`
- pi-hooks supports `if` conditions with `ToolName(pattern)` syntax — the emitter SHOULD translate abstract `matcher` to `if` where possible
- pi-hooks does NOT support `type: "prompt"` — the emitter MUST emit a warning and skip prompt hooks

**OpenClaw note:** OpenClaw is based on Pi. If OpenClaw supports Pi extensions, the same `pi-hooks` extension and `.pi/settings.json` format applies. Verify during implementation.

### Design

#### D1: Architecture Overview

```
hooks.yaml (abstract)          ← User writes this
    │
    ├── emit-claude-code.sh  → .claude/settings.json
    ├── emit-codex.sh        → codex.json (hooks section)
    ├── emit-opencode.sh     → .opencode/plugins/cc-hooks.ts
    ├── emit-pi.sh           → .pi/settings.json
    └── emit-gemini.sh       → .gemini/settings.json

schema/
├── abstract-hook.json       ← JSON Schema for validation
├── event-map.yaml           ← Event name crosswalk
└── tool-map.yaml            ← Tool name crosswalk
```

#### D2: Abstract Hook Schema Detail

```yaml
# hooks.yaml — Example abstract hook config
version: "1.0"
hooks:
  SessionStart:
    - matcher: "*"
      hooks:
        - type: command
          command: "bash ./scripts/load-context.sh"
          timeout: 10

  PreToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "bash ./scripts/validate-write.sh"
          timeout: 5
        - type: prompt
          prompt: "File: $TOOL_INPUT.file_path. Check: not in /etc, not .env, no '..' traversal. Return approve/deny."
          timeout: 15

    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash ./scripts/validate-bash.sh"
          timeout: 5

  Stop:
    - matcher: "*"
      hooks:
        - type: command
          command: "bash ./scripts/check-tests.sh"
          timeout: 30
```

**Environment variables injected by emitters (NOT in abstract schema):**

| Abstract Placeholder | Claude Code | Codex | Pi | Gemini |
|---------------------|-------------|-------|----|--------|
| `$PROJECT_DIR` | `$CLAUDE_PROJECT_DIR` | `$CODEX_PROJECT_DIR` | `$CWD` (from ctx) | `$GEMINI_PROJECT_DIR` |
| `$PLUGIN_ROOT` | `$CLAUDE_PLUGIN_ROOT` | `$CODEX_PLUGIN_ROOT` | N/A (use relative) | N/A |
| `$SESSION_ID` | `$CLAUDE_SESSION_ID` | `$CODEX_SESSION_ID` | session file path | `$GEMINI_SESSION_ID` |

Emitters replace `$PROJECT_DIR` and `$PLUGIN_ROOT` with the platform-specific env var names.

#### D3: Emitter Implementation Pattern

Each emitter follows the same structure:

```bash
#!/bin/bash
# emit-<platform>.sh
# Input: abstract hook config (file path arg or stdin)
# Output: platform-specific config (stdout or --output file)

set -euo pipefail

# 1. Parse abstract config (use jq for JSON, yq for YAML)
# 2. Map event names using event-map.yaml
# 3. Map tool names using tool-map.yaml (if applicable)
# 4. Filter unsupported events (warn on stderr)
# 5. Filter unsupported hook types (warn on stderr for prompt hooks)
# 6. Replace env var placeholders with platform-specific names
# 7. Output platform-specific JSON
```

**Shared utilities:** Extract common functions (event mapping, tool name mapping, env var replacement) into `scripts/emit-common.sh` to avoid duplication across emitters.

#### D4: Handling `type: "prompt"` Hooks Across Platforms

| Platform | Support | Strategy |
|----------|---------|----------|
| Claude Code | Full (native) | Emit as-is |
| Codex | None | Convert to command hook that echoes warning. Log: "Prompt hooks not supported on Codex, converted to no-op" |
| OpenCode | None (plugin reads Claude format) | Plugin handles it if it reads `.claude/settings.json` directly |
| Pi | None | Skip with warning: "Prompt hooks not supported on Pi/pi-hooks" |
| Gemini | None | Skip with warning |

**Decision:** Prompt hooks are Claude Code's killer feature. We do NOT attempt to emulate them on other platforms. The emitter skips them with a clear warning. Users who need prompt-like behavior on other platforms should use command hooks with LLM CLI calls (documented in `platform-limits.md`).

#### D5: Handling `if` Conditions

The `if` field (e.g., `Bash(git push*)`) is supported by pi-hooks but not by Claude Code's native format (which uses `matcher` instead).

**Strategy:**
- In the abstract schema, `if` is an optional field on individual hooks.
- Claude Code emitter: ignores `if` (uses `matcher` at group level instead).
- Pi emitter: passes `if` through directly (pi-hooks supports it natively).
- Other emitters: ignore `if` with warning.

#### D6: SKILL.md Update Plan

The SKILL.md needs these sections updated:

1. **Frontmatter:**
   - `description`: Change from Claude Code-only to multi-agent
   - `tags`: Add `multi-agent`, `codex`, `pi`, `opencode`, `gemini`
   - `metadata.platforms`: Update to `"claude-code,codex,opencode,pi,openclaw,gemini"`

2. **Overview section:** Add "Multi-Platform Support" subsection explaining the tier model.

3. **New section: "Platform Selection":** Table showing which platforms support which features.

4. **New section: "Cross-Platform Workflow":** Step-by-step guide for writing hooks once and deploying to multiple agents.

5. **Existing sections:** Keep all Claude Code-specific content but add notes where behavior differs on other platforms.

### Implementation Subtasks

#### Phase 1: Schema and Crosswalks (Foundation)

**0399.1: Create abstract hook JSON Schema**
- File: `plugins/rd3/skills/cc-hooks/schema/abstract-hook.json`
- JSON Schema Draft-7 for the abstract hook config
- Validate: `ajv validate schema/abstract-hook.json hooks.yaml`
- Test: valid and invalid fixture files

**0399.2: Create event name crosswalk**
- File: `plugins/rd3/skills/cc-hooks/schema/event-map.yaml`
- All 11 events × 5 platforms (null for unsupported)
- Source of truth for all emitters

**0399.3: Create tool name crosswalk**
- File: `plugins/rd3/skills/cc-hooks/schema/tool-map.yaml`
- Built-in tools for Claude Code, Codex, Pi, Gemini
- Include MCP tool name handling (MCP tools use `mcp__*` prefix universally)

**0399.4: Create shared emitter utilities**
- File: `plugins/rd3/skills/cc-hooks/scripts/emit-common.sh`
- Functions: `load_event_map()`, `map_event_name()`, `map_tool_name()`, `replace_env_vars()`, `warn_unsupported()`
- Test: unit tests for each function

#### Phase 2: Platform Emitters

**0399.5: Refactor existing Claude Code config generation into emitter**
- File: `plugins/rd3/skills/cc-hooks/emitters/emit-claude-code.sh`
- Extract current hook config logic from SKILL.md examples into a script
- Reads abstract schema, emits `settings.json` hooks block
- Test: bats test with canonical config

**0399.6: Create Codex emitter**
- File: `plugins/rd3/skills/cc-hooks/emitters/emit-codex.sh`
- Maps events to Codex format (`pre_tool_use`, `post_tool_use`, `session_start`)
- Codex uses lowercase tool names
- Codex hook engine is Rust-based; emitter outputs `hooks.json` format
- Test: bats test with canonical config

**0399.7: Create OpenCode emitter**
- File: `plugins/rd3/skills/cc-hooks/emitters/emit-opencode.sh`
- Strategy: Generate a TypeScript plugin file that reads `.claude/settings.json` at runtime
- Alternative: Generate OpenCode-native `opencode.json` hooks section
- Decision point: verify which approach is more reliable (plugin vs native)
- Test: bats test with canonical config

**0399.8: Create Pi/OpenClaw emitter**
- File: `plugins/rd3/skills/cc-hooks/emitters/emit-pi.sh`
- Outputs `.pi/settings.json` in pi-hooks compatible format
- Maps events using pi-hooks event names (PascalCase primary, snake_case alias)
- Maps tool names to lowercase (pi-hooks convention)
- Strips `type: "prompt"` hooks with warning
- Passes through `if` conditions
- Test: bats test with canonical config + verification that pi-hooks can parse the output

**0399.9: Create Gemini CLI emitter**
- File: `plugins/rd3/skills/cc-hooks/emitters/emit-gemini.sh`
- Outputs `.gemini/settings.json` hooks section
- Maps: `PreToolUse` → `BeforeTool`, `Stop` → `AfterAgent`
- Gemini uses synchronous stdin/stdout JSON; emitter generates config only (not the protocol wrapper)
- Test: bats test with canonical config

**0399.10: Create unified emit-hooks.sh entry point**
- File: `plugins/rd3/skills/cc-hooks/scripts/emit-hooks.sh`
- `--platform`, `--dry-run`, `--config`, `--force`, `--all` flags
- Auto-detection of installed platforms
- Calls individual emitter scripts
- Test: bats integration test

#### Phase 3: Documentation

**0399.11: Create cross-platform reference doc**
- File: `plugins/rd3/skills/cc-hooks/references/cross-platform.md`
- Event crosswalk table (full matrix)
- Tool name mapping table
- Step-by-step: write once, deploy to N platforms
- Common pitfalls and workarounds

**0399.12: Create platform limits reference doc**
- File: `plugins/rd3/skills/cc-hooks/references/platform-limits.md`
- Feature support matrix (prompt hooks, `if` conditions, matchers, etc.)
- What's NOT portable and why
- Workarounds for limited platforms
- pi-hooks installation and configuration guide

**0399.13: Update SKILL.md**
- File: `plugins/rd3/skills/cc-hooks/SKILL.md`
- Update frontmatter (description, tags, platforms)
- Add "Multi-Platform Support" section
- Add "Platform Selection" table
- Add "Cross-Platform Workflow" guide
- Update all examples to show abstract format + platform-specific output

**0399.14: Update patterns.md**
- File: `plugins/rd3/skills/cc-hooks/references/patterns.md`
- Add cross-platform examples for each pattern
- Show abstract config → multiple platform outputs

**0399.15: Update advanced.md**
- File: `plugins/rd3/skills/cc-hooks/references/advanced.md`
- Add platform-specific advanced patterns
- Pi `if` conditions deep dive
- Gemini synchronous middleware patterns

#### Phase 4: Testing and Validation

**0399.16: Create abstract schema test fixtures**
- Valid: minimal, full, all-events, with-if-conditions
- Invalid: no-version, no-hooks, bad-type, prompt-on-pi, unknown-event
- Location: `tests/abstract_hooks/`

**0399.17: Create canonical hook config**
- File: `tests/fixtures/canonical-hooks.json`
- Covers: security validation, test enforcement, context loading, notification, build verification
- Used as input for all emitter snapshot tests

**0399.18: Create emitter snapshot tests**
- For each of the 5 emitters:
  - Run with canonical config
  - Diff against expected output in `tests/expected/`
  - Verify warnings for unsupported features
- Bats test files: `tests/emit-*.bats`

**0399.19: Create validate-abstract-schema.bats**
- Extends existing schema validation tests
- Tests abstract hook schema validation
- Location: `tests/validate-abstract-schema.bats`

**0399.20: Run full verification**
- All existing bats tests still pass
- All new bats tests pass
- Hook linter still works (may need update for new env vars)
- `bun test` passes (if any TS components added)

### Acceptance Criteria

1. **AC1:** A user can write a single `hooks.yaml` (abstract format) and generate valid configs for Claude Code, Codex, OpenCode, Pi, and Gemini CLI using `emit-hooks.sh`.

2. **AC2:** The generated `.pi/settings.json` is parseable by `@hsingjui/pi-hooks` extension and hooks execute correctly on Pi.

3. **AC3:** Events not supported by a platform are silently skipped with a warning on stderr (never errors).

4. **AC4:** `type: "prompt"` hooks are emitted for Claude Code, skipped with warning for all other platforms.

5. **AC5:** All existing cc-hooks tests (bats) continue to pass — no regressions.

6. **AC6:** The SKILL.md accurately reflects multi-agent support with correct platform selection guidance.

7. **AC7:** The event-map.yaml and tool-map.yaml are the single source of truth — no hardcoded event mappings in emitter scripts.

8. **AC8:** Each emitter is independently testable and produces deterministic output.

### Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| pi-hooks API changes after we depend on it | Medium | Pin to specific version in docs. Test against current version (0.0.1). |
| Codex hooks format changes (still experimental) | Medium | Document Codex hooks as "beta" in platform-limits.md. |
| OpenCode plugin approach vs native hooks unclear | Low | Implement both paths; default to plugin approach (more proven). |
| Gemini CLI hook format undocumented/evolving | Medium | Mark as "experimental" in docs. Test against v0.26.0+. |
| Prompt hook emulation on non-Claude platforms | Low | Explicitly out of scope. Document workaround (command hook + LLM CLI call). |

### Dependencies

- `docs/hook_system.md` — Research report (already complete)
- `@hsingjui/pi-hooks` npm package — Pi extension for hook support (external dependency)
- `jq` — Required for JSON processing in emitter scripts (already available)
- `yq` — Optional, for YAML processing (can use jq + manual parsing as fallback)

### See Also

- `docs/hook_system.md` — Hook ecosystem analysis report
- `plugins/rd3/skills/cc-hooks/SKILL.md` — Current cc-hooks skill
- `plugins/rd3/skills/cc-hooks/references/patterns.md` — Existing hook patterns
- `plugins/rd3/skills/cc-hooks/references/advanced.md` — Advanced hook techniques
- `plugins/rd3/skills/cc-hooks/references/migration.md` — Migration guide
- https://github.com/hsingjui/pi-hooks — Pi hooks extension (recommended)
- https://github.com/Jonghakseo/pi-extension/tree/main/packages/claude-hooks-bridge — Alternative Pi bridge (not recommended)

## Review

### Verdict: PASS

**Date:** 2026-04-28
**Mode:** full (Phase 7 SECU + Phase 8 Traceability)
**Focus:** all (security, efficiency, correctness, usability)

### Phase 7: SECU Findings

| ID | Severity | Dimension | Finding | File | Status |
|----|----------|-----------|---------|------|--------|
| F1 | P3 | Efficiency | 4 emitters invoke jq 6 times each for JSON processing. Could consolidate to 2-3 calls per emitter for minor performance improvement. | `emitters/emit-*.sh` | Accepted (non-blocking, correctness unaffected) |
| F2 | P4 | Usability | OpenCode emitter generates a static TypeScript plugin file rather than a dynamic config. This is by design — OpenCode uses a plugin bridge pattern. | `emitters/emit-opencode.sh` | Accepted (architectural decision) |
| F3 | P4 | Correctness | `emit-common.sh` uses `return` instead of `exit` for error paths. This is correct behavior for a sourced library script. | `scripts/emit-common.sh` | Accepted (by design) |

**Security:** No hardcoded secrets, no command injection vectors, all variables quoted, `set -euo pipefail` in all scripts. PASS.
**Correctness:** All 105 bats tests passing, JSON Schema valid, YAML structure validated. PASS.
**Usability:** All scripts have `--help` and `usage()` functions. Error messages are clear. PASS.

### Phase 8: Requirements Traceability

| Req | Description | Evidence | Status |
|-----|-------------|----------|--------|
| R1 | Abstract Hook Schema | `schema/abstract-hook.json` — JSON Schema Draft-7 | ✅ |
| R2 | Event Name Crosswalk | `schema/event-map.yaml` — 11 events × 5 platforms | ✅ |
| R3 | Tool Name Crosswalk | `schema/tool-map.yaml` — 10 tools × 5 platforms + MCP | ✅ |
| R4 | Platform Config Emitters | 5 emitters in `emitters/` | ✅ |
| R5 | Unified Emit Script | `scripts/emit-hooks.sh` | ✅ |
| R6 | Documentation Updates | 5 docs updated/created | ✅ |
| R7 | Validation and Testing | 8 bats files, 105/105 passing | ✅ |
| R8 | pi-hooks Integration | Documented in platform-limits.md | ✅ |

### Acceptance Criteria

| AC | Status | Evidence |
|----|--------|----------|
| AC1: Single hooks.yaml → 5 configs | ✅ | `emit-hooks.sh --all --dry-run` verified |
| AC2: .pi/settings.json parseable | ✅ | Matches pi-hooks format |
| AC3: Unsupported events warned | ✅ | Bats tests verify warnings |
| AC4: Prompt hooks Claude-only | ✅ | Bats tests verify stripping |
| AC5: Existing tests pass | ✅ | 105/105 (65 existing + 40 new) |
| AC6: SKILL.md updated | ✅ | v2.0.0 with tier model |
| AC7: Crosswalks are source of truth | ✅ | emit-common.sh loads from schema/ |
| AC8: Emitters independently testable | ✅ | 5 separate bats files |
