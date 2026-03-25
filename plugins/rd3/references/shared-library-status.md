# Shared Library Status

Tracks which utilities were extracted to `plugins/rd3/scripts/` and which remain local.

## Extracted (Shared)

| Library | Consumers | Purpose |
|---------|-----------|---------|
| `markdown-frontmatter.ts` | cc-agents, cc-commands, cc-skills | Parse and serialize YAML frontmatter |
| `markdown-analysis.ts` | cc-agents, cc-commands, cc-skills | Heading extraction, TODO counting, second-person detection |
| `validation-findings.ts` | cc-agents, cc-commands, cc-skills, cc-magents | Structured finding accumulation with severity |
| `grading.ts` | cc-agents, cc-commands, cc-skills, cc-magents | Grade lookup, pass threshold, decision vocabulary |
| `best-practice-fixes.ts` | cc-agents, cc-commands, cc-skills | TODO normalization, voice fixes, Windows paths |
| `evolution-contract.ts` | cc-agents, cc-commands, cc-skills, cc-magents | Evolution proposal types, lifecycle model |
| `evolution-engine.ts` | cc-agents, cc-commands, cc-skills, cc-magents | Proposal generation, ranking, apply, rollback |
| `logger.ts` | All scripts | Shared logger with globalSilent for tests |

## Deferred (Local)

| Utility | Current Location | Why Deferred |
|---------|-----------------|-------------|
| Resource discovery | `cc-skills/scripts/utils.ts:discoverResources()` | Only one consumer; will extract when a second skill needs it |

## Intentionally Local

| Logic | Skill | Why Local |
|-------|-------|----------|
| UMAM parsing and section classification | cc-magents | Structurally different from frontmatter-based skills |
| Agent anatomy and template-tier logic | cc-agents | Agent-specific tiering not shared |
| Argument and pseudocode semantics | cc-commands | Command-specific parsing |
| Adapter transformation logic | All | Each skill has artifact-specific adaptation rules |

## Decision Criteria

A utility is extracted to shared when:

1. Two or more meta-skills use the same logic
2. The abstraction is primitive (not artifact-specific)
3. Characterization tests exist before extraction
4. The shared version does not force conditional branches per artifact type
