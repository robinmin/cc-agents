---
name: implement the new cc-commands skill
description: Build the rd3:cc-commands skill following the same architecture as rd3:cc-skills -- pure TypeScript/Bun pipeline with platform adapters, evaluation framework, and cross-platform command support
status: Done
created_at: 2026-03-15 23:40:43
updated_at: 2026-03-16 17:50:39
impl_progress:
  planning: completed
  design: completed
  phase_1_foundation: completed
  phase_2_scaffold_validate: completed
  phase_3_evaluate: completed
  phase_4_refine_adapt: completed
  phase_5_integration: completed
---

## 0218. Implement the new cc-commands skill

### Background

We have completed `plugins/rd3/skills/cc-skills/` -- a universal skill creator that works across all platforms (Claude Code, Codex, OpenClaw, OpenCode, Antigravity) following the agentskills.io standard. It features a pure TypeScript/Bun pipeline architecture with:

- `scaffold.ts` -- CLI scaffolding with templates
- `validate.ts` -- Structure validation with rule engine
- `evaluate.ts` -- 12-dimension quality evaluation with configurable weights
- `refine.ts` -- Platform companion generation and migration
- `adapt.ts` -- Cross-platform adaptation for entire plugins
- Platform adapters (`adapters/`) for Claude, Codex, OpenClaw, OpenCode, Antigravity
- Shared types (`types.ts`) and utilities (`utils.ts`)
- Configurable evaluation weights and security scanning (`evaluation.config.ts`)

Now we need the equivalent for **slash commands** (old-style plugin commands). The old `plugins/rd2/skills/cc-commands/` had Python scripts (`validate_command.py`, `check_quality.py`) and focused only on Claude Code. The new version must:

1. Be pure TypeScript/Bun (no Python/Bash scripts)
2. Support cross-platform command adaptation (Claude Code old-style commands, Skills 2.0 command-mode, Codex UI chips, Gemini CLI TOML commands, OpenClaw slash commands)
3. Follow the same pipeline architecture as cc-skills
4. Provide command-specific evaluation dimensions (different from skill evaluation)

**Key differences between commands and skills that drive the architecture:**

| Aspect | Skills (cc-skills) | Commands (cc-commands) |
|--------|-------------------|----------------------|
| File format | Directory with `SKILL.md` | Single `.md` file |
| Frontmatter fields | `name`, `description`, `license`, `metadata` | `description`, `allowed-tools`, `model`, `argument-hint`, `disable-model-invocation` |
| Body purpose | Domain knowledge, workflows | Imperative instructions for Claude, pseudocode orchestration |
| Naming convention | `verb-ing-noun` (skill dirs) | `noun-verb` (command files) for grouped commands |
| Size target | Up to 500 lines in SKILL.md | ~50-150 lines (thin wrappers) |
| Resources | `scripts/`, `references/`, `assets/` subdirs | None (flat .md file) |
| Platform portability | High (agentskills.io base) | Low (command syntax is mostly Claude-specific) |
| Evaluation focus | Content quality, trigger design, code quality | Frontmatter validity, description quality, delegation pattern, structure brevity |
| Cross-platform adaptation | Same SKILL.md + companion files | Must generate platform-specific equivalents (TOML for Gemini, openai.yaml for Codex, etc.) |

**What the research report (Section 9) tells us about cross-platform commands:**

- Claude Code: Old-style commands in `commands/*.md` with `Task()`, `Skill()`, `AskUserQuestion()` pseudocode
- Claude Code Skills 2.0: SKILL.md with `disable-model-invocation: true` acts as a command
- Codex: `agents/openai.yaml` with `policy.allow_implicit_invocation: false` for explicit-only
- Gemini CLI: Separate TOML files in `.gemini/commands/` (completely different format)
- OpenClaw: `/skill-name [input]` syntax with `command-dispatch` and `command-tool` frontmatter
- OpenCode: `.opencode/commands/<name>.md` or JSON config `command:` section
- Antigravity: `@skill-name` mention syntax (no formal command system)

### Requirements

#### Functional Requirements

1. **Scaffold commands** from templates
   - Create command `.md` files with valid frontmatter
   - Support template types: simple (direct instructions), complex (pseudocode workflow), plugin (with `CLAUDE_PLUGIN_ROOT`)
   - Generate valid YAML frontmatter with only the 5 allowed fields
   - Support `--platform` flag to generate platform-specific equivalents

2. **Validate command structure**
   - Check frontmatter has ONLY valid fields (description, allowed-tools, model, argument-hint, disable-model-invocation)
   - Reject invalid fields (name, skills, subagents, version, etc.)
   - Validate description under 60 characters
   - Validate `model` values (sonnet, opus, haiku)
   - Validate `allowed-tools` format (string or array, Bash filter patterns)
   - Check `argument-hint` matches `$1`, `$2` usage in body
   - Detect second-person language (should be imperative form)
   - Verify command is under ~150 lines (thin wrapper principle)

3. **Evaluate command quality** across adapted dimensions
   - Frontmatter Quality (valid fields, description quality)
   - Description Effectiveness (under 60 chars, starts with verb, specific triggers)
   - Content Quality (imperative form, clear instructions, no messages to user)
   - Structure & Brevity (under 150 lines, progressive disclosure, delegation to skills)
   - Delegation Pattern (uses Skill/Task/SlashCommand properly, fat skills thin wrappers)
   - Argument Design (argument-hint present when $N used, descriptive names)
   - Security (allowed-tools restriction, no dangerous patterns)
   - Naming Convention (noun-verb pattern for grouped, verb-noun for simple)
   - Platform Compatibility (Claude-specific features documented)
   - Operational Readiness (error handling, edge cases, validation)

4. **Refine commands** based on evaluation
   - Fix frontmatter issues (remove invalid fields, fix description length)
   - Convert second-person to imperative form
   - Add missing argument-hint when $N is used
   - Generate Platform Notes section
   - Migrate from rd2 patterns if needed

5. **Adapt commands** for cross-platform deployment
   - Generate Gemini CLI TOML equivalent from Claude Code command
   - Generate Skills 2.0 equivalent (SKILL.md with `disable-model-invocation: true`)
   - Generate Codex-compatible skill with `agents/openai.yaml` UI metadata
   - Generate OpenClaw command variant (with `command-dispatch`/`command-tool` if applicable)
   - Generate OpenCode command variant (`.opencode/commands/<name>.md`)
   - Handle argument syntax translation (`$ARGUMENTS`/`$N` -> `{{args}}` for Gemini, etc.)

#### Non-Functional Requirements

6. **Architecture**: Follow cc-skills pipeline pattern exactly
   - Same directory structure: `scripts/`, `templates/`, `references/`
   - Shared type system in `types.ts`
   - Shared utilities in `utils.ts`
   - Configurable evaluation weights in `evaluation.config.ts`
   - Platform adapters in `scripts/adapters/`
   - Reuse cc-skills `BaseAdapter` and `AdapterRegistry` pattern

7. **Quality**: Evaluation config must be tunable
   - Separate weight profiles for commands with/without pseudocode
   - Security scanning (same blacklist/greylist as cc-skills)
   - Passing threshold configurable (default 80/100)

8. **Testing**: Unit and integration tests
   - Test each script independently
   - Test command templates produce valid output
   - Test evaluation scoring is consistent
   - Test platform adaptation generates valid output per platform

### Q&A

**Q: Should cc-commands reuse types from cc-skills or define its own?**
A: Define its own `types.ts` with command-specific types (`CommandFrontmatter`, `Command`, `CommandValidationReport`, `CommandEvaluationReport`, etc.) but follow the same structural patterns. The two type systems are parallel but distinct because commands and skills have fundamentally different frontmatter schemas and structures.

**Q: How do we handle the fact that commands are single files, not directories?**
A: The `Command` type has `path` (to the .md file) but no `directory` or `resources` fields. Validation and evaluation operate on the single file. Scaffolding creates a single .md file, not a directory. This simplifies the pipeline significantly compared to cc-skills.

**Q: Should we share the security scanner with cc-skills?**
A: The security scanner rules (blacklist/greylist patterns) should be identical. Consider importing `EVALUATION_CONFIG.security` from cc-skills or duplicating the patterns in cc-commands' own `evaluation.config.ts`. For Phase 1, duplicate is acceptable; a shared security module can be extracted later.

**Q: How does the Gemini CLI TOML adaptation work?**
A: The adapt script reads a Claude Code command `.md` file, extracts the description and body, translates `$ARGUMENTS`/`$N` to `{{args}}`, translates `!`cmd`` to `!{cmd}`, and generates a `.toml` file with `prompt` and `description` fields. Note that `Task()`, `Skill()`, `AskUserQuestion()` pseudocode cannot be translated to TOML -- these must be converted to natural language instructions or flagged as Claude-specific.

**Q: What about commands that delegate to subagents via Task()?**
A: These are inherently Claude Code-specific. The adapter should:
1. Flag `Task()` usage as non-portable
2. For other platforms, generate a natural language equivalent ("Spawn a specialist agent to handle X")
3. Document the limitation in the generated Platform Notes

### Design

#### Directory Structure

```
plugins/rd3/skills/cc-commands/
├── SKILL.md                        # Skill definition (describes cc-commands itself)
├── scripts/
│   ├── types.ts                    # Command-specific type definitions
│   ├── utils.ts                    # Shared utilities (parseFrontmatter, etc.)
│   ├── scaffold.ts                 # Command scaffolding from templates
│   ├── validate.ts                 # Command structure validation
│   ├── evaluate.ts                 # Command quality evaluation (10 dimensions)
│   ├── evaluation.config.ts        # Configurable weights and security rules
│   ├── refine.ts                   # Command refinement and migration
│   ├── adapt.ts                    # Cross-platform command adaptation
│   └── adapters/                   # Platform-specific adapters
│       ├── base.ts                 # Base adapter interface
│       ├── claude.ts               # Claude Code command validation
│       ├── codex.ts                # Codex UI chip generation
│       ├── gemini.ts               # Gemini CLI TOML generation
│       ├── openclaw.ts             # OpenClaw command variant
│       ├── opencode.ts             # OpenCode command variant
│       └── antigravity.ts          # Antigravity @mention variant
├── templates/
│   ├── simple.md                   # Simple command (direct instructions)
│   ├── workflow.md                 # Complex command (pseudocode orchestration)
│   └── plugin.md                   # Plugin command (uses CLAUDE_PLUGIN_ROOT)
├── references/
│   ├── evaluation-framework.md     # 10-dimension evaluation guide
│   ├── frontmatter-reference.md    # Command frontmatter field specs
│   └── platform-compatibility.md   # Cross-platform command support matrix
└── tests/
    ├── scaffold.test.ts            # Scaffold tests
    ├── validate.test.ts            # Validation tests
    ├── evaluate.test.ts            # Evaluation tests
    └── fixtures/                   # Test command files
        ├── valid-simple.md
        ├── valid-complex.md
        ├── invalid-frontmatter.md
        └── invalid-fields.md
```

#### Type System (types.ts)

Key types to define:

```typescript
// Command frontmatter -- ONLY these 5 fields are valid
interface CommandFrontmatter {
    description?: string;
    'allowed-tools'?: string | string[];
    model?: 'sonnet' | 'opus' | 'haiku';
    'argument-hint'?: string;
    'disable-model-invocation'?: boolean;
}

// Invalid fields that must be rejected
const INVALID_COMMAND_FIELDS = [
    'name', 'skills', 'subagents', 'version', 'agent',
    'context', 'user-invocable', 'triggers', 'license',
    'metadata', 'examples', 'arguments', 'tools'
];

// Complete command structure
interface Command {
    frontmatter: CommandFrontmatter;
    body: string;
    raw: string;
    path: string;
    filename: string;  // command name derived from filename
}

// Evaluation dimensions (10 for commands vs 12 for skills)
interface CommandEvaluationDimension { ... }
interface CommandEvaluationReport { ... }
interface CommandValidationReport { ... }

// Platform-specific types
type CommandPlatform = 'claude' | 'codex' | 'gemini' | 'openclaw' | 'opencode' | 'antigravity';
```

#### Evaluation Dimensions (10 dimensions, adapted from cc-skills' 12)

| # | Dimension | Weight (with pseudocode) | Weight (without) | What it checks |
|---|-----------|--------------------------|-------------------|----------------|
| 1 | Frontmatter Quality | 15 | 18 | Valid YAML, only allowed fields, no invalid fields |
| 2 | Description Effectiveness | 15 | 18 | Under 60 chars, starts with verb, specific, no "This command" |
| 3 | Content Quality | 12 | 15 | Imperative form, no second-person, writes FOR Claude not TO user |
| 4 | Structure & Brevity | 10 | 12 | Under 150 lines, progressive disclosure, sections well-organized |
| 5 | Delegation Pattern | 12 | 5 | Uses Skill()/Task()/SlashCommand(), fat skills thin wrappers |
| 6 | Argument Design | 8 | 10 | argument-hint present when $N used, descriptive names, consistent |
| 7 | Security | 10 | 8 | allowed-tools restrictive, no dangerous patterns, proper Bash filters |
| 8 | Naming Convention | 5 | 7 | noun-verb for grouped, verb-noun for simple, full namespace |
| 9 | Platform Compatibility | 8 | 5 | Claude-specific features documented, portability notes |
| 10 | Operational Readiness | 5 | 2 | Error handling, edge cases, input validation |
| | **Total** | **100** | **100** | |

#### Platform Adapter Strategy

Each adapter converts a Claude Code command to the target platform's equivalent:

| Platform | Input | Output | Key Transformations |
|----------|-------|--------|---------------------|
| Claude | `command.md` | Validation only | Check Claude-specific features |
| Codex | `command.md` | SKILL.md + `agents/openai.yaml` | Convert to skill with `policy.allow_implicit_invocation: false` |
| Gemini | `command.md` | `.toml` file | `$ARGUMENTS` -> `{{args}}`, `!`cmd`` -> `!{cmd}` |
| OpenClaw | `command.md` | SKILL.md with `command-dispatch` | Add `command-tool` if applicable |
| OpenCode | `command.md` | `.opencode/commands/<name>.md` | Adapt argument syntax to `$ARGUMENTS`/`$NAME` |
| Antigravity | `command.md` | SKILL.md (mention-triggered) | Natural language only, no pseudocode |

### Solution

The solution follows the **cc-skills pipeline architecture** with command-specific adaptations. Each script in the pipeline operates independently and can be invoked from CLI or from slash commands.

#### Pipeline Architecture

```
scaffold.ts  -->  validate.ts  -->  evaluate.ts  -->  refine.ts  -->  adapt.ts
   |                  |                 |                |               |
   v                  v                 v                v               v
 Create            Check            Score            Fix/Migrate     Generate
 command.md        structure         quality          issues          platform
 from template     & frontmatter    (10 dims)        & improve       equivalents
```

#### Shared Code Reuse

- `utils.ts` can import `parseFrontmatter` from cc-skills (or duplicate the ~50-line function)
- `evaluation.config.ts` shares the same security scanner patterns
- `adapters/base.ts` follows the same `BaseAdapter`/`AdapterRegistry` pattern but with `Command` instead of `Skill`

#### Key Implementation Details

1. **Frontmatter validation is strict**: Commands have exactly 5 valid fields. Any other field is an ERROR, not a warning. This is the most critical difference from skill validation.

2. **Body analysis**: The evaluator parses the command body for:
   - Second-person language ("You should..." -> "Do X")
   - Messages addressed to user ("Here's what I found..." -> Write instructions for Claude)
   - Pseudocode constructs (`Task()`, `Skill()`, `AskUserQuestion()`, `SlashCommand()`)
   - Shell injection (`!`cmd``)
   - Argument references (`$ARGUMENTS`, `$1`, `$2`, `@$1`)
   - `CLAUDE_PLUGIN_ROOT` usage

3. **Template types**:
   - `simple.md`: Direct imperative instructions, no subagent delegation
   - `workflow.md`: Multi-step with `Task()` and `Skill()` pseudocode
   - `plugin.md`: Uses `CLAUDE_PLUGIN_ROOT` for script/template paths

4. **Gemini TOML generation** is the most complex adaptation because TOML is structurally different from Markdown. The adapter must:
   - Extract description for TOML `description` field
   - Convert body to TOML `prompt` field (escaping multiline strings)
   - Translate argument syntax
   - Strip non-portable constructs (Task, Skill, AskUserQuestion) with warnings

### Plan

#### Phase 1: Foundation (types, utils, templates)
**Deliverables**: `types.ts`, `utils.ts`, 3 templates, `SKILL.md`

- [ ] Create `plugins/rd3/skills/cc-commands/SKILL.md` with skill metadata
- [ ] Create `scripts/types.ts` with all command-specific type definitions
- [ ] Create `scripts/utils.ts` with shared utilities (frontmatter parsing, field validation)
- [ ] Create `templates/simple.md` -- simple direct-instruction command template
- [ ] Create `templates/workflow.md` -- pseudocode workflow command template
- [ ] Create `templates/plugin.md` -- plugin command template with CLAUDE_PLUGIN_ROOT
- [ ] Create `references/frontmatter-reference.md` (port from rd2, update for cross-platform)
- [ ] Create `references/evaluation-framework.md` (10-dimension framework)
- [ ] Create `references/platform-compatibility.md` (cross-platform command matrix)

#### Phase 2: Scaffold and Validate
**Deliverables**: `scaffold.ts`, `validate.ts`

- [ ] Implement `scaffold.ts` -- create command files from templates
  - Parse CLI args (command name, output path, template type, platform)
  - Normalize command name (noun-verb or verb-noun pattern)
  - Load and process template with variable substitution
  - Write single .md file (not directory like skills)
  - Print next steps guidance
- [ ] Implement `validate.ts` -- structural validation
  - Parse frontmatter with strict field validation (only 5 fields allowed)
  - Check for invalid fields (reject with error, not warning)
  - Validate each field's format and constraints
  - Check body content (imperative form, line count, section structure)
  - Check argument-hint consistency with body $N usage
  - Output validation report (JSON or text)
- [ ] Create test fixtures: `tests/fixtures/valid-simple.md`, `valid-complex.md`, `invalid-frontmatter.md`, `invalid-fields.md`
- [ ] Write `tests/scaffold.test.ts`
- [ ] Write `tests/validate.test.ts`

#### Phase 3: Evaluate
**Deliverables**: `evaluate.ts`, `evaluation.config.ts`

- [ ] Implement `evaluation.config.ts` with command-specific dimension weights
  - Two weight profiles: with-pseudocode and without-pseudocode
  - Security scanner rules (reuse from cc-skills)
  - Detection patterns for pseudocode constructs
- [ ] Implement `evaluate.ts` with 10 evaluation dimensions
  - Frontmatter Quality scorer
  - Description Effectiveness scorer
  - Content Quality scorer (imperative form, writing for Claude)
  - Structure & Brevity scorer (line count, progressive disclosure)
  - Delegation Pattern scorer (Task/Skill/SlashCommand usage)
  - Argument Design scorer (hint-to-body consistency)
  - Security scorer (allowed-tools analysis, dangerous patterns)
  - Naming Convention scorer (noun-verb vs verb-noun validation)
  - Platform Compatibility scorer (Claude-specific feature documentation)
  - Operational Readiness scorer (error handling, edge cases)
  - Overall score calculation with weighted dimensions
  - Grade assignment (A/B/C/D/F)
  - JSON and text output formats
- [ ] Write `tests/evaluate.test.ts`

#### Phase 4: Refine and Adapt
**Deliverables**: `refine.ts`, `adapt.ts`, all platform adapters

- [ ] Implement `refine.ts` -- command improvement
  - Fix invalid frontmatter fields (remove, warn)
  - Fix description length (truncate with warning)
  - Convert second-person to imperative form
  - Add missing argument-hint when $N detected
  - Add Platform Notes section
  - Migration mode for rd2 commands
- [ ] Implement `adapters/base.ts` -- base adapter interface for commands
- [ ] Implement `adapters/claude.ts` -- Claude Code command validation
- [ ] Implement `adapters/codex.ts` -- generate SKILL.md + openai.yaml from command
- [ ] Implement `adapters/gemini.ts` -- generate TOML from command (most complex)
- [ ] Implement `adapters/openclaw.ts` -- generate OpenClaw command variant
- [ ] Implement `adapters/opencode.ts` -- generate OpenCode command variant
- [ ] Implement `adapters/antigravity.ts` -- generate Antigravity skill variant
- [ ] Implement `adapt.ts` -- batch adaptation across plugins
  - Discover commands in `<plugin>/commands/`
  - Apply selected adapters
  - Generate output files
  - Report results
- [ ] Write adapter integration tests

#### Phase 5: Integration and Polish
**Deliverables**: slash commands, documentation, final testing

- [ ] Create rd3 slash commands that invoke cc-commands scripts:
  - `/rd3:command-add` -- scaffold a new command
  - `/rd3:command-evaluate` -- validate and evaluate command quality
  - `/rd3:command-refine` -- refine command based on evaluation
  - `/rd3:command-adapt` -- generate cross-platform variants
- [ ] Integration testing: end-to-end workflow (scaffold -> validate -> evaluate -> refine -> adapt)
- [ ] Test with real commands from `plugins/rd2/commands/` and `plugins/wt/commands/`
- [ ] Update `plugins/rd3/skills/cc-commands/SKILL.md` with final documentation
- [ ] Verify all tests pass with `bun test`

### Artifacts

| Type | Path | Generated By | Date |
| ---- | ---- | ------------ | ---- |
| Research | docs/reasearch/how_to_write_skills_en.md | wt:super-researcher | 2026-03-12 |
| Reference Architecture | plugins/rd3/skills/cc-skills/ | rd2:super-coder | 2026-03-15 |
| Domain Knowledge | plugins/rd2/skills/cc-commands/ | rd2 (legacy) | 2026-02-19 |

### References

- **Research report**: `docs/reasearch/how_to_write_skills_en.md` -- Section 9 covers slash commands across all platforms
- **Reference architecture**: `plugins/rd3/skills/cc-skills/` -- The pattern to follow (same pipeline, adapted for commands)
- **Old cc-commands**: `plugins/rd2/skills/cc-commands/` -- Domain knowledge, frontmatter reference, evaluation dimensions
- **Old frontmatter ref**: `plugins/rd2/skills/cc-commands/references/frontmatter-reference.md` -- Definitive 5-field command frontmatter spec
- **Old command template**: `plugins/rd2/skills/cc-commands/assets/command-template.md` -- Template for new commands
- **CLAUDE.md conventions**: `/Users/robin/projects/cc-agents/.claude/CLAUDE.md` -- Naming rules, fat skills thin wrappers
- **agentskills.io**: https://agentskills.io/home -- Cross-platform standard
- Related tasks: 0214 (shared utils extraction), 0215 (adapt.ts integration), 0210 (cc-skills parent)
