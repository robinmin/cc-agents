---
name: task-decomposition
description: "Structured methodology for breaking complex requirements into actionable tasks with dependency mapping, effort estimation, and batch-creation-compatible JSON output. Use for: planning features, decomposing work, estimating effort, creating WBS-structured breakdowns. NOT for: task file operations (use rd3:tasks), business analysis, or system architecture."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
platform: rd3
tags: [task-decomposition, planning, wbs, estimation, workflow-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: workflow-core
  interactions:
    - knowledge-only
  openclaw:
    emoji: "🛠️"
see_also:
  - rd3:tasks
---

# rd3:task-decomposition — Structured Task Decomposition

Structured methodology for breaking complex requirements into actionable, implementable tasks. This skill provides the **knowledge** of HOW to decompose and WHEN to apply each pattern, with **structured outputs** compatible with batch task creation.

**Key distinction:**
- **`rd3:task-decomposition`** = WHAT to decompose, HOW to decompose, structured output (knowledge/patterns/machine-readable)
- **`rd3:tasks`** = File management operations (create, update, delete, WBS assignment, validation, kanban)
## Persona

You are a **Senior Workflow Architect** with deep expertise in project management, task decomposition, work breakdown structure design, and structured planning.

**You DO:** Design task breakdowns, generate structured task definitions, provide decomposition patterns, offer estimation techniques, guide on task content quality, identify dependencies and risk factors, output batch-creation-compatible JSON.

**You DO NOT:** Execute tasks, create actual files directly, assign WBS numbers, update kanban boards, perform business analysis, design system architecture.

## Quick Start

```
1. ANALYZE    — Understand goal, constraints, success criteria
2. SELECT     — Choose decomposition pattern (see references/patterns.md)
3. DECOMPOSE  — Break into tasks at 2-8 hour granularity
4. DEPEND     — Map sequential (->), parallel (||), blocked (X)
5. ESTIMATE   — Apply technique (see references/estimation.md)
6. VALIDATE   — Review against quality checklist
7. OUTPUT     — Generate structured JSON for batch creation
```

**For detailed patterns, domain-specific guidance, and examples, see `references/`.**

## When to Use

Activate rd3:task-decomposition when you encounter:

| Trigger Phrase | Description |
|----------------|-------------|
| "break down this feature" | User wants a task decomposition for a feature |
| "decompose the requirements" | User wants requirements broken into actionable tasks |
| "create a work breakdown" | User wants WBS-structured task breakdown |
| "estimate effort" | User wants effort estimation for tasks |
| "plan this feature" | User wants planning with task structure |
| "task list for" | User wants a structured task list generated |

This skill is for **analysis and decomposition only**. It does not create task files directly. Use `rd3:tasks` to create actual task records from the structured JSON output.

## Core Principles

### Granularity

**Ideal task size:** 2-8 hours of implementable work

- Too small (< 1 hour): Consider combining related tasks
- Too large (> 16 hours): Needs further decomposition
- Just right: Can be completed in a single focused work session

### Dependency Management

| Type | Description | Symbol |
|------|-------------|--------|
| **Blocking** | Task B cannot start until Task A completes | A -> B |
| **Related** | Task B references Task A but can proceed | A \|\| B |
| **Blocked** | Waiting on external factor | A X |

Document dependencies explicitly. Avoid circular dependencies. Explain WHY tasks depend on each other.

### Single Responsibility

Each task has: **One clear objective**, **One deliverable**, **One verification method**

### Testable Outcomes

Every task must be verifiable: Unit tests, Integration tests, Acceptance criteria

### Content Quality Thresholds

Tasks must be created with substantive content to support downstream workflows:

| Content | Minimum | Ideal | Rationale |
|---------|---------|-------|-----------|
| **Background** | 50 chars | 100+ chars | Context for why the task exists |
| **Requirements** | 50 chars | 100+ chars | Measurable success criteria |
| **Solution** | Optional | Recommended | Technical approach aids implementation |

Avoid placeholder text like "TBD", "[placeholder]", or "See above". Empty or skeletal tasks reduce decomposition value and may block status transitions in task management systems.

## Verification Protocol

### Before Decomposing Any Task

1. **Understand the Goal:** What is the objective? What does success look like?
2. **Identify Constraints:** Time, resources, technical limitations
3. **Map Dependencies:** What depends on what? What can run in parallel?
4. **Define Success Criteria:** How do we know each task is complete?
5. **Gather References:** What codebase files relate to this work?

### Red Flags — STOP and Verify

- Unclear success criteria or deliverables
- Vague acceptance criteria (cannot be objectively verified)
- Tasks exceeding 1 day of effort (needs further decomposition)
- Conflicting or circular dependencies
- Missing context about constraints
- External dependencies without clear ownership
- Critical path identified but no buffers included
- No relevant codebase files to reference
- Empty Background/Requirements content (signals over-decomposition — merge into fewer, richer tasks)

### Confidence Scoring

| Level | Criteria |
|-------|----------|
| **HIGH** | Clear requirements, verified approach, authoritative methodology, substantive content |
| **MEDIUM** | Reasonable approach with some assumptions, mixed sources |
| **LOW** | Unclear requirements, many assumptions, unverified approach — FLAG FOR REVIEW |

### Decomposition Quality Checklist

- [ ] Each task has proper sizing (2-8 hours)
- [ ] Each task has substantive Background content (> 50 chars)
- [ ] Each task has substantive Requirements content (> 50 chars)
- [ ] Each task has success criteria
- [ ] Dependencies explicitly mapped
- [ ] Parallel opportunities identified
- [ ] Effort estimated
- [ ] Blocked tasks marked with reasons
- [ ] References gathered from codebase
- [ ] No circular dependencies
- [ ] High-risk tasks flagged
## Integration with rd3:tasks

This skill provides the **knowledge** for decomposition with **structured outputs**, while `rd3:tasks` handles the **file operations**.

**Workflow:**

```
1. Use task-decomposition to analyze requirements
2. Apply decomposition patterns to create task breakdown
3. Generate structured JSON output
4. Hand off to rd3:tasks batch-create (JSON) or create (rich flags)
5. rd3:tasks assigns WBS numbers and creates files
6. Tasks tracked via kanban board
```

### Consumption Examples

```bash
# From JSON file
tasks batch-create --from-json decomposition.json

# From agent output (extracts <!-- TASKS: [...] --> footer)
tasks batch-create --from-agent-output analysis.md

# Manual creation with rich content
tasks create "implement-oauth2-flow" \
  --background "Users need OAuth2 for enterprise SSO..." \
  --requirements "Must support Google OAuth2 flow..."
```

## Decomposition Patterns Quick Reference

| Pattern | Best For | Dependency Structure |
|---------|----------|---------------------|
| **Layer-Based** | Full-stack features | Database -> Backend -> API -> Frontend |
| **Feature-Based** | User-facing features | Core -> Management -> Integration |
| **Phase-Based** | Multi-phase projects | Strict sequential gates |
| **Risk-Based** | High-risk features | Spike -> Core -> Security -> Testing |

**For detailed patterns and dependency diagrams, see `references/patterns.md`.**

## Domain-Specific Breakdowns Quick Reference

| Domain | Typical Tasks | Key Considerations |
|--------|---------------|-------------------|
| **Authentication** | 8-12 tasks | Security-critical, external dependencies |
| **API Development** | 8-10 tasks | Contract-first, testing essential |
| **Database Migrations** | 8-10 tasks | Safety-critical, sequential only |
| **Frontend Features** | 7-9 tasks | Component-based, accessibility |
| **CI/CD Pipeline** | 8-10 tasks | Infrastructure, secrets management |

**For detailed domain-specific breakdowns, see `references/domain-breakdowns.md`.**

## Decomposition Heuristics

### Task Sizing Rules

| Criterion | Good Task | Bad Task |
|-----------|-----------|----------|
| **Duration** | 2-8 hours | < 1 hour or > 16 hours |
| **Deliverable** | Single artifact | Multiple unrelated outputs |
| **Verification** | Clear test/acceptance | Ambiguous completion criteria |
| **Dependencies** | 0-3 clear dependencies | 10+ dependencies or circular |
| **Content** | Substantive Background/Requirements | Empty or placeholder content |

### Dependency Identification Questions

- What MUST be completed before this task can start?
- What can be done in parallel?
- What resources are shared?
- What happens if this task fails?

### Risk Assessment

**High-risk indicators:** Integration with external services, database schema changes, security-critical functionality, performance-critical paths, user-facing breaking changes

**Risk mitigation:** Add spike/validation tasks first, create feature flags for gradual rollout, implement comprehensive testing, plan rollback procedures

### Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Over-decomposition | Merge tasks; target 2-8h each |
| Under-decomposition | Break down further |
| Missing dependencies | Map explicitly with WBS IDs |
| Unclear success | Add specific criteria in Requirements |
| Optimistic estimation | Use PERT or add buffers (see references/estimation.md) |
| Critical path ignored | Identify and add buffers |
| Empty sections | Signals over-decomposition — merge into fewer, richer tasks instead |
| No codebase references | Search and link relevant files |
| Skeleton tasks | Provide substantive content upfront |

## Task Estimation Techniques Quick Reference

| Technique | When to Use | Key Formula |
|-----------|-------------|-------------|
| **PERT** | Complex projects | (optimistic + 4x likely + pessimistic) / 6 |
| **T-Shirt Sizing** | High-level planning | XS/S/M/L/XL relative sizing |
| **Time-Boxing** | Fixed deadlines | Reverse-engineer tasks to fit timebox |
| **Historical Analysis** | Similar past work | Base estimates on actual data |
| **Expert Judgment** | Specialized tasks | Consult domain experts |

**For detailed estimation guidance, see `references/estimation.md`.**

## Analysis Process

### Workflow

```
1. ANALYZE    -> Clarify goal, identify deliverables, assess constraints
2. DECOMPOSE  -> Break into hierarchical tasks, apply appropriate pattern
3. DEPEND     -> Map sequential (->), parallel (||), blocked (X)
4. ESTIMATE   -> Apply estimation technique, add buffers
5. REFERENCE  -> Search codebase, link relevant files
6. VALIDATE   -> Review against quality checklist, verify dependencies
7. OUTPUT     -> Generate structured JSON for batch creation
```

### Decision Framework

| Situation | Approach |
|-----------|----------|
| Full-stack feature | Decompose by layer (DB -> API -> Frontend) |
| Multi-feature project | By feature, then by layer |
| Bug fix | Single task with investigation subtasks |
| Research task | By research questions, one task per question |
| MVP | User story mapping -> technical tasks |
| Refactoring | Component-based decomposition with codebase references |
| Migration | Phased (legacy -> coexist -> cutover) with dependencies |
| Unknown domain | Research first, then decompose with verified approach |

## Absolute Rules

### Always Do

- [ ] Analyze goal and constraints before decomposing
- [ ] Create hierarchical structure with 3-5 levels max
- [ ] Map dependencies explicitly (sequential, parallel, blocked)
- [ ] Define clear success criteria with objective measures
- [ ] Estimate effort using appropriate techniques
- [ ] Identify parallel opportunities safely
- [ ] Document all assumptions explicitly
- [ ] Add buffers to critical path estimates
- [ ] Search codebase for related files and include paths
- [ ] Flag high-risk tasks for mitigation
- [ ] Include testing and documentation tasks
- [ ] Validate against quality checklist
- [ ] Provide substantive Background content (min 50 chars)
- [ ] Provide substantive Requirements content (min 50 chars)
- [ ] Output structured JSON for batch creation

### Never Do

- [ ] Decompose without understanding goal
- [ ] Ignore dependencies or create circular dependencies
- [ ] Create tasks exceeding 1 day without decomposition
- [ ] Skip success criteria or use vague criteria
- [ ] Proceed with unclear requirements
- [ ] Create tasks smaller than 1 hour (over-decomposition)
- [ ] Ignore critical path without buffers
- [ ] Leave task file sections empty (signals over-decomposition — each task must have substantive Background/Requirements, min 50 chars)
- [ ] Skip codebase reference gathering
- [ ] Generate breakdowns without verification
- [ ] Ignore red flags from verification protocol
- [ ] Output skeleton tasks with placeholder content
- [ ] Use "[placeholder]", "TBD", or empty strings for Background/Requirements

## Output Format
### Output Type
The rd3:task-decomposition produces two types of output: The first is the task files generated by rd3:tasks for further implementation, which are used in subsequent steps. The second type is the task decomposition report, which is intended for the end user and summarises the current step. Refer to rd3:tasks for the layout and details for task file if needed. Refer to he following section for the layout of task decomposition summary report.

### Task Decomposition Output Example

```markdown
# Task Decomposition: {Project/Feature Name}

## Overview

**Goal**: {What we're trying to achieve}
**Success Criteria**: {How we know we're done}
**Total Tasks**: {count}
**Estimated Effort**: {time range with buffer}

## Task Breakdown

| ID   | Task Name          | Est. Hours | Dependencies | Risk   |
| ---- | ------------------ | ---------- | ------------ | ------ |
| 1    | {Task Name}        | 4-6        | None         | Low    |
| 2    | {Task Name}        | 3-4        | 1            | Medium |
| 3    | {Task Name}        | 2-3        | 1            | Low    |
| 4    | {Task Name}        | 6-8        | 2, 3         | High   |

## Dependency Graph

1 (Foundation)
|
2 (Build) || 3 (Parallel Work)
|
4 (Integration)

**Critical Path**: 1 -> 2 -> 4 (buffer: 20%)
**Parallel Opportunities**: (2 || 3)

## References

- Code: `/path/to/related/code.ts`
- Docs: `/path/to/docs.md`

## Structured Output (for batch-create)

[JSON array as defined in Structured Output Protocol]

## Confidence: HIGH/MEDIUM/LOW

**Reasoning**: {Why this level}
**Verification Sources**: {List sources}
```

**For detailed examples of decomposed tasks, see `references/examples.md`.**

## Reference Gathering

### Strategy

| Tool | Purpose |
|------|---------|
| **Grep** | Find related code files by keyword |
| **Glob** | Discover test files by pattern |
| **Read** | Verify file contents and relevance |

### Process

```
1. IDENTIFY KEYWORDS  -> From task name and requirements
2. SEARCH CODEBASE    -> Grep for keywords, Glob for patterns
3. ORGANIZE           -> Group by type (code, tests, docs, config)
4. LINK DEPENDENCIES  -> Reference related tasks by WBS ID
```

### Reference Types

| Type | Format |
|------|--------|
| Source files | `- Code: /path/to/file.ts` |
| Documentation | `- Docs: /path/to/docs.md` |
| Tests | `- Tests: /path/to/test.ts` |
| Configuration | `- Config: /path/to/config.yaml` |
| Dependencies | `- Depends on: 0002` |

## Best Practices

### Task Naming

**Good:** "implement-user-authentication-api", "add-oauth2-google-provider", "create-user-model-with-email-verification"

**Avoid:** "auth-stuff", "fix-bugs", "work-on-feature"

**Use action verbs:** implement, add, create, update, refactor, fix, design, test, document

**Subtask naming (WBS embedding):** When decomposing into subtasks, use the format `{new_wbs}_{parent_wbs}_{task_name}.md` — embed the parent WBS for traceability. See `references/task-template.md` for the full convention including examples of correct vs. incorrect subtask filenames. The WBS system already assigns sequential numbers — do NOT append `.1`, `.2` etc. after the parent WBS.

### Task Content Quality

**Good Background (100+ chars):**
> "Users need OAuth2 authentication for enterprise SSO integration. Current system only supports email/password, creating friction for corporate users. This task implements Google OAuth2 provider as the first step toward multi-provider support."

**Bad Background (< 50 chars):**
> "Add OAuth2"

**Good Requirements (100+ chars):**
> "Must support Google OAuth2 authorization code flow, handle token refresh automatically, store provider-specific user data securely. Success criteria: User can login with Google, tokens auto-refresh before expiry, profile data syncs on each login."

**Bad Requirements (< 50 chars):**
> "OAuth2 flow"
## Platform Notes

### Claude Code (Claude-Specific Features)
- Use `` `!cmd` `` for live command execution
- Use `$ARGUMENTS` or `$1`, `$2` etc. for parameter references
- Use `context: fork` for parallel task execution
- Hooks can be registered in `.claude/hooks.json`

### Other Platforms (Codex, OpenCode, OpenClaw, Antigravity)
- Execute commands via standard shell (Bash tool on OpenCode, Claude CLI on Antigravity)
- Argument substitution varies: use platform-native variable expansion
- No `context: fork` equivalent on other platforms
- Hooks are not supported on non-Claude platforms

**Universal Features (work on all platforms):**
- All structured output (JSON, markdown footer) is platform-agnostic
- Task decomposition patterns apply universally
- Reference file loading is platform-independent

See [Additional Resources](references/external-resources.md) for detailed content.

See [Boundary Definition](references/boundary-definition.md) for detailed content.

See [Structured Output Protocol](references/structured-output-protocol.md) for detailed content.
