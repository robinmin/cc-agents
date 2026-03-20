# rd3 Meta-Agent Guide

This directory contains four meta-agent skills used to create, evaluate, refine, adapt, and evolve the agent-related assets in `rd3`.

Use them by ownership:

| Asset you want to manage | Source location | Meta-agent skill | Slash command family |
| --- | --- | --- | --- |
| Skills | `plugins/rd3/skills/*` | `cc-skills` | `/rd3:skill-*` |
| Slash commands | `plugins/rd3/commands/*` | `cc-commands` | `/rd3:command-*` |
| Subagents | `plugins/rd3/agents/*` | `cc-agents` | `/rd3:agent-*` |
| Main agents | project-level agent config such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `CODEX.md` | `cc-magents` | `/rd3:magent-*` |

## Which Skill Should I Use?

Use `cc-skills` when the thing you are changing is a skill package: `SKILL.md`, references, examples, scripts, tests, or packaging behavior.

Use `cc-commands` when the thing you are changing is a slash command wrapper: command naming, arguments, help text, guardrails, or how the command invokes an underlying skill.

Use `cc-agents` when the thing you are changing is a subagent definition under `plugins/rd3/agents`: role, routing, delegation contract, specialist behavior, or platform-specific adaptation for subagents.

Use `cc-magents` when the thing you are changing is the top-level main agent behavior of a project: `AGENTS.md` and equivalent files for different platforms, including global policy, workflow defaults, safety rules, and high-level routing.

## How The Four Skills Work Together

These four skills manage different layers of the same system:

1. `cc-skills` manages the reusable implementation logic.
2. `cc-commands` manages the human-facing slash command layer.
3. `cc-agents` manages delegated specialist subagents.
4. `cc-magents` manages the top-level main agent configuration.

Recommended ownership rule:

- Change the skill first if the behavior belongs in the implementation.
- Change the command if the user-facing entrypoint or CLI contract needs to change.
- Change the subagent if delegation behavior or specialist instructions need to change.
- Change the main agent if the global operating model or top-level policy needs to change.

This keeps the system aligned with the rd3 design principle: fat skills, thin wrappers.

## Common Operations

All four meta-agent skills support the same core maintenance loop:

- `evaluate`: assess quality against the relevant rubric
- `refine`: make immediate, local improvements
- `evolve`: generate or apply longer-term improvement proposals

The create/adapt operations differ by asset type:

| Meta-agent skill | Creation / setup operations | Conversion / packaging operations |
| --- | --- | --- |
| `cc-skills` | `add` | `package` |
| `cc-commands` | `scaffold` | `adapt` |
| `cc-agents` | `scaffold` | `adapt` |
| `cc-magents` | `add` | `adapt` |

## Recommended Workflows

### 1. Improve an Existing Asset

Use this loop when a skill, command, subagent, or main agent already exists and needs tuning.

1. Run `evaluate` to identify gaps.
2. Run `refine` to make immediate fixes.
3. Run `evaluate` again to confirm the result.
4. Run `evolve` if the issue is recurring, longitudinal, or needs proposal/history/rollback handling.

Examples:

- `/rd3:skill-evaluate ...`
- `/rd3:skill-refine ...`
- `/rd3:command-evaluate ...`
- `/rd3:command-refine ...`
- `/rd3:agent-evaluate ...`
- `/rd3:agent-refine ...`
- `/rd3:magent-evaluate ...`
- `/rd3:magent-refine ...`

### 2. Create a New Asset

Use the asset-specific create operation first, then the common quality loop.

For a new skill:

1. `/rd3:skill-add ...`
2. `/rd3:skill-evaluate ...`
3. `/rd3:skill-refine ...`
4. `/rd3:skill-package ...`

For a new slash command:

1. `/rd3:command-scaffold ...`
2. `/rd3:command-evaluate ...`
3. `/rd3:command-refine ...`
4. `/rd3:command-adapt ...` if platform conversion is needed

For a new subagent:

1. `/rd3:agent-scaffold ...`
2. `/rd3:agent-evaluate ...`
3. `/rd3:agent-refine ...`
4. `/rd3:agent-adapt ...` if platform conversion is needed

For a new main agent config:

1. `/rd3:magent-add ...`
2. `/rd3:magent-evaluate ...`
3. `/rd3:magent-refine ...`
4. `/rd3:magent-adapt ...` if platform conversion is needed

### 3. Handle Repeated Problems Over Time

Use `evolve` when simple one-shot refinement is no longer enough.

Typical triggers:

- the same quality issue keeps coming back
- multiple reviews point to the same structural weakness
- you want proposal generation, history, or rollback
- you want governed improvement instead of direct manual edits

Examples:

- `/rd3:skill-evolve ...`
- `/rd3:command-evolve ...`
- `/rd3:agent-evolve ...`
- `/rd3:magent-evolve ...`

Use `refine` for immediate cleanup. Use `evolve` for proposal-driven or longitudinal improvement.

## Practical Decision Matrix

Use this table when the boundary between the four skills is unclear.

| If you need to change... | Use... |
| --- | --- |
| skill content, references, examples, scripts, tests | `cc-skills` |
| slash command syntax, help text, CLI flags, wrapper behavior | `cc-commands` |
| subagent role definition, delegation behavior, specialist prompt | `cc-agents` |
| top-level project agent policy, workflow defaults, safety rules, global routing | `cc-magents` |

## Typical End-to-End Change Order

When a feature touches multiple layers, use this order:

1. Update the underlying skill with `cc-skills`.
2. Update the slash command wrapper with `cc-commands` if the user interface changes.
3. Update the subagent with `cc-agents` if delegation behavior changes.
4. Update the main agent with `cc-magents` if global policy or routing changes.
5. Re-evaluate the affected layers.

This order reduces drift between implementation, wrappers, delegation, and top-level policy.

## Examples By Asset Type

### Tune a Skill

- Evaluate quality: `/rd3:skill-evaluate <skill-dir>`
- Fix local issues: `/rd3:skill-refine <skill-dir>`
- Propose longitudinal improvements: `/rd3:skill-evolve <skill-dir> --propose`

### Tune a Slash Command

- Evaluate quality: `/rd3:command-evaluate <command-file>`
- Fix local issues: `/rd3:command-refine <command-file>`
- Propose longitudinal improvements: `/rd3:command-evolve <command-file> --propose`

### Tune a Subagent

- Evaluate quality: `/rd3:agent-evaluate <agent-file>`
- Fix local issues: `/rd3:agent-refine <agent-file>`
- Propose longitudinal improvements: `/rd3:agent-evolve <agent-file> --propose`

### Tune a Main Agent

- Evaluate quality: `/rd3:magent-evaluate <main-agent-file>`
- Fix local issues: `/rd3:magent-refine <main-agent-file>`
- Propose longitudinal improvements: `/rd3:magent-evolve <main-agent-file> --propose`

## Installation For Codex, OpenCode, and OpenClaw

For installing the rd3 skill surface itself into Codex, OpenCode, and OpenClaw, use [install-skills.sh](/Users/robin/projects/cc-agents/scripts/install-skills.sh).

This is the correct entrypoint for installing:

- rd3 skills
- rd3 slash commands, after converting them into skill-style wrappers
- the shared skill surface that exposes the four meta-agent skills on target platforms

Use the specialized meta-agent flows after installation when you need to create, evaluate, refine, adapt, or evolve a specific asset.

### Primary Install Commands

```bash
# Install rd3 into Codex
./scripts/install-skills.sh rd3 codexcli

# Install rd3 into OpenCode
./scripts/install-skills.sh rd3 opencode

# Install rd3 into OpenClaw
./scripts/install-skills.sh rd3 openclaw --features=skills,commands

# Install to all three at once
./scripts/install-skills.sh rd3 codexcli,opencode,openclaw
```

Useful options:

- `--features=skills`
- `--features=skills,commands`
- `--features=skills,commands,subagents`
- `--dry-run`
- `--verbose`

### Codex

Install rd3 into Codex with:

```bash
./scripts/install-skills.sh rd3 codexcli
```

This installs rd3 skills and command wrappers into `.codex/skills/`.

If you need a Codex subagent or a Codex main-agent file, use the specialized flows after the rd3 skill surface is installed:

- subagents: `/rd3:agent-adapt <agent-file> claude codex` or `bun plugins/rd3/skills/cc-agents/scripts/install.ts <agent-file> --target codex`
- main agents: `/rd3:magent-adapt <source-file> --to codex`

### OpenCode

Install rd3 into OpenCode with:

```bash
./scripts/install-skills.sh rd3 opencode
```

This installs rd3 skills and command wrappers into `.opencode/skills/` and `.agents/skills/`.

If you need OpenCode-specific artifacts after installation:

- subagents: `/rd3:agent-adapt <agent-file> claude opencode`
- main agents: `/rd3:magent-adapt <source-file> --to opencode-rules`

### OpenClaw

Install rd3 into OpenClaw with:

```bash
./scripts/install-skills.sh rd3 openclaw --features=skills,commands
```

This installs rd3 skills and command wrappers into the workspace `skills/` directory for OpenClaw discovery.

Current limitations:

- `install-skills.sh` now supports the OpenClaw skill surface, but OpenClaw subagents still use the specialized `cc-agents` adapt flow.
- `cc-magents` does not currently target an OpenClaw top-level main-agent format.
- if you need an OpenClaw subagent config, use `/rd3:agent-adapt <agent-file> claude openclaw`

## Practical Install Rule

If you are unsure which command to run first, use this rule:

1. Install the rd3 meta-agent skill surface first with `./scripts/install-skills.sh rd3 <target>`.
2. Use the installed rd3 commands or skills to manage the asset you care about.
3. For subagents, use `cc-agents` specialized adapt or install flows when needed.
4. For main-agent configs, use `cc-magents` specialized adapt flow when needed.

## Summary

The four rd3 meta-agent skills are complementary, not overlapping:

- `cc-skills` owns skill implementation.
- `cc-commands` owns slash command wrappers.
- `cc-agents` owns subagents.
- `cc-magents` owns main agents.

If you keep each change in the right layer and follow the `evaluate -> refine -> evaluate` loop, the system stays easier to maintain. Use `evolve` when improvement needs to be proposal-driven, traceable, and repeatable over time.
