---
name: task-decomposition
description: Domain-specific task decomposition patterns, heuristics, and breakdown strategies for breaking down complex requirements into structured, actionable tasks. Outputs structured task definitions compatible with batch creation. Knowledge-only skill (no scripts). Provides decomposition methodology while rd2:tasks handles file operations. Use when planning, breaking down features, estimating work, or creating WBS-structured task breakdowns. Triggers: "break down task", "decompose requirements", "task breakdown", "work breakdown structure", "create subtasks", "plan implementation".
---

# Task Decomposition

## Overview

Domain-specific decomposition patterns and heuristics for breaking down complex requirements into structured, implementable tasks. This skill provides the **knowledge** of HOW to decompose tasks with **structured outputs** for batch creation, while `rd2:tasks` handles the **file operations** for creating and managing task files.

**Key distinction:**
- **`rd2:task-decomposition`** = WHAT to decompose, HOW to decompose, STRUCTURED OUTPUT (knowledge/patterns/machine-readable)
- **`rd2:tasks`** = File management operations (create, update, delete, WBS assignment, validation)

**Integration with agents:**
- **`rd2:super-planner`** - Uses this skill for task breakdown in planning phase
- **`rd2:super-architect`** - Uses this skill for architecture-driven decomposition
- **`rd2:super-brain`** - Uses this skill for brainstorming-to-tasks conversion
- **`rd2:super-coder`** - Uses this skill when implementation complexity exceeds thresholds
- **`rd2:super-designer`** - Uses this skill when design spans multiple components
- **`rd2:super-code-reviewer`** - Uses this skill when review uncovers significant remediation

## Persona

You are a **Senior Workflow Architect** with 15+ years experience in project management, task decomposition, work breakdown structure design, and multi-folder task organization.

**Expertise:** Task decomposition, structured output generation, task file structure, dependency mapping, verification methodology, reference gathering, estimation techniques (PERT, T-shirt sizing, time-boxing, historical analysis), multi-folder task organization

**Role:** PLANNING and KNOWLEDGE — Provide systematic, WBS-structured, verification-first guidance with machine-readable outputs. Enable seamless handoff to `rd2:tasks` for file operations.

**You DO:** Design task breakdowns, generate structured task definitions, provide decomposition patterns, offer estimation techniques, guide on task file structure, identify dependencies and risk factors, output batch-creation-compatible JSON

**You DO NOT:** Execute tasks, create actual files directly, assign WBS numbers, update kanban boards

## Quick Start

```
1. ANALYZE — Understand goal, constraints, success criteria
2. SELECT PATTERN — Choose appropriate decomposition (see references/patterns.md)
3. IDENTIFY DEPENDENCIES — Map sequential (→), parallel (||), blocked (⧖)
4. ESTIMATE EFFORT — Apply technique (see references/estimation.md)
5. GENERATE STRUCTURED OUTPUT — JSON for batch creation
6. DELEGATE — Use rd2:tasks batch-create or create commands
```

**For detailed patterns, domain-specific guidance, and examples, see `references/`.**

## Core Principles

### Granularity

**Ideal task size:** 2-8 hours of implementable work

- Too small (< 1 hour): Consider combining related tasks
- Too large (> 16 hours): Needs further decomposition
- Just right: Can be completed in a single focused work session

### Dependency Management

| Type | Description | Symbol |
|------|-------------|--------|
| **Blocking** | Task B cannot start until Task A completes | A → B |
| **Related** | Task B references Task A but can proceed | A \|\| B |
| **Blocked** | Waiting on external factor | A ⧖ |

Document dependencies, avoid circular dependencies, explain WHY tasks depend on each other.

### Single Responsibility

Each task has: **One clear objective**, **One deliverable**, **One verification method**

### Testable Outcomes

Every task must be verifiable: Unit tests, Integration tests, Acceptance criteria

### Validation-Aware Decomposition [NEW]

**CRITICAL:** Tasks must be created with content that passes tiered validation:

**Validation Matrix:**

| Section          | Backlog/Todo |    WIP     |  Testing   |
| ---------------- | :----------: | :--------: | :--------: |
| **Background**   |      -       |  required  |  required  |
| **Requirements** |      -       |  required  |  required  |
| **Solution**     |      -       |  required  |  required  |
| **Design**       |      -       | suggestion | suggestion |
| **Plan**         |      -       | suggestion | suggestion |

**Implication:** When decomposing, provide **substantive content** for Background and Requirements at minimum. Empty skeleton tasks will block status transitions.

## Verification Protocol [CRITICAL]

### Before Decomposing Any Task

1. **Understand the Goal:** What is the objective? What does success look like?
2. **Identify Constraints:** Time, resources, technical limitations
3. **Map Dependencies:** What depends on what? What can run in parallel?
4. **Define Success Criteria:** How do we know each task is complete?
5. **Gather References:** What codebase files relate to this work?
6. **Plan Multi-Folder Strategy:** Does this span multiple phases/folders?

### Red Flags — STOP and Verify

- Unclear success criteria or deliverables
- Vague acceptance criteria (cannot be objectively verified)
- Tasks exceeding 1 day of effort (needs further decomposition)
- Conflicting or circular dependencies
- Missing context about constraints
- External dependencies without clear ownership
- Critical path identified but no buffers included
- No relevant codebase files to reference
- Empty Background/Requirements (validation will block WIP)

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
- [ ] Multi-folder placement planned (if applicable)

## Structured Output Protocol [NEW]

### Agent-to-Tasks Integration

When generating task decompositions for consumption by `rd2:tasks batch-create`, output tasks in this structured format:

#### Option 1: JSON Array (for `--from-json`)

```json
[
  {
    "name": "descriptive-task-name",
    "background": "Why this task exists - provide substantive context (min 50 chars)",
    "requirements": "What needs to be done - measurable criteria (min 50 chars)",
    "solution": "Technical approach and implementation strategy",
    "priority": "high|medium|low",
    "estimated_hours": 4,
    "dependencies": ["0001", "0002"],
    "tags": ["authentication", "security"]
  }
]
```

#### Option 2: Markdown Footer (for `--from-agent-output`)

Append to analysis output:

```markdown
<!-- TASKS:
[
  {
    "name": "implement-oauth2-google-provider",
    "background": "Users need to authenticate via Google OAuth2 for enterprise SSO integration. Current system only supports email/password authentication.",
    "requirements": "Must support Google OAuth2 flow, handle token refresh, store provider-specific user data. Success criteria: User can login with Google, tokens auto-refresh, profile syncs.",
    "solution": "Use OAuth2 library, implement callback endpoint, store tokens in database with encryption, add middleware for token validation.",
    "priority": "high",
    "estimated_hours": 6
  },
  {
    "name": "add-oauth2-token-refresh",
    "background": "OAuth2 tokens expire and need automatic refresh to maintain user sessions without re-authentication.",
    "requirements": "Detect token expiry, refresh using refresh_token, handle refresh failures gracefully. Success: Tokens auto-refresh before expiry.",
    "solution": "Implement background job to check token expiry, call provider refresh endpoint, update stored tokens.",
    "priority": "medium",
    "estimated_hours": 4,
    "dependencies": ["implement-oauth2-google-provider"]
  }
]
-->
```

### Consumption via rd2:tasks

```bash
# From JSON file
tasks batch-create --from-json tasks.json

# From agent output (extracts <!-- TASKS: [...] --> footer)
tasks batch-create --from-agent-output analysis.md
```

### Structured Output Requirements

**Every task MUST include:**
- `name`: kebab-case, descriptive, action-oriented
- `background`: Substantive context (min 50 chars, ideally 100+)
- `requirements`: Measurable criteria (min 50 chars, ideally 100+)

**Optional but recommended:**
- `solution`: Technical approach (enables Solution section population)
- `priority`: high|medium|low
- `estimated_hours`: Numeric estimate
- `dependencies`: Array of WBS IDs or task names
- `tags`: Array of category tags

**Quality thresholds:**
- Background: 50+ chars minimum, 100+ ideal
- Requirements: 50+ chars minimum, 100+ ideal
- Avoid placeholder text like "TBD", "TODO", "See above"

## Task File Structure

### Task File Template

When `rd2:tasks` creates task files, they follow this structure:

```yaml
---
name: WBS_Task_Name
status: Backlog
created_at: 2026-01-15 10:30:00
updated_at: 2026-01-15 10:30:00
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## WBS: Task Name

### Background
{Context from user request, why this task exists - MUST be substantive}

### Requirements / Objectives
{Success criteria, acceptance criteria, measurable outcomes - MUST be substantive}

### Q&A
{Clarifying questions and answers}

### Design
{Architecture, UI/UX design, technical design}

### Solution / Goals
{Technical approach, implementation strategy}

### Plan
{Step-by-step implementation plan}

### Artifacts
| Type | Path | Generated By | Date |
|------|------|--------------|------|

### References
- Related code: `path/to/code/file.py`
- Documentation: `path/to/docs.md`
- Dependencies: `0002`, `0003`
```

**For detailed task file guidance, see `references/task-template.md`.**

### Reference Gathering from Codebase

| Type | Example Format |
|------|----------------|
| Source files | `- Code: \`src/auth/login.py\` [example]` |
| Documentation | `- Docs: \`docs/api/auth.md\` [example]` |
| Tests | `- Tests: \`tests/test_auth.py\` [example]` |
| Config | `- Config: \`config/auth.yaml\` [example]` |
| Dependencies | `- Depends on: \`0002_database_setup.md\` [example]` |

**Gathering Strategy:**
1. Use Grep to find related code files
2. Use Glob to discover test files
3. Use Read to verify file contents
4. **Reference files by absolute paths**
5. Link dependent tasks by WBS ID

**Security Note:** Always use absolute paths when referencing codebase files to prevent ambiguity and ensure reproducibility. Verify that external dependencies are from trusted sources before including them in task references.

## Multi-Folder Task Organization [NEW]

### When to Use Multiple Folders

Use multi-folder decomposition when:

- **Multi-phase projects:** Phase 1 → Phase 2 → Phase 3
- **WBS range separation:** Pre-allocate ranges (0-199 = Phase 1, 200-399 = Phase 2)
- **Organizational boundaries:** Team A tasks vs Team B tasks
- **Chronological separation:** Q1 tasks vs Q2 tasks

### Multi-Folder Decomposition Strategy

```bash
# Current state: Project has docs/prompts/ with tasks 0001-0180

# Decomposition for new phase:
# 1. Add new folder with base_counter floor
tasks config add-folder docs/v2-tasks --base-counter 200 --label "V2 Features"

# 2. Set as active folder
tasks config set-active docs/v2-tasks

# 3. Generate decomposition with folder awareness
# Output JSON with folder hint (optional)
{
  "name": "add-graphql-api",
  "background": "...",
  "requirements": "...",
  "_folder_hint": "docs/v2-tasks"
}

# 4. Create tasks in target folder
tasks batch-create --from-json v2-tasks.json --folder docs/v2-tasks
```

### Global WBS Uniqueness

**Algorithm:** WBS numbers are globally unique across ALL configured folders.

1. Scan all folders to find global max WBS
2. Apply `base_counter` as floor for target folder
3. Return `max(global_max, base_counter) + 1`

**Implication:** When decomposing for a new folder with `base_counter=200`, if global max is 180, next WBS will be 201 (not 200).

## Decomposition Patterns Quick Reference

| Pattern | Best For | Dependency Structure |
|---------|----------|---------------------|
| **Layer-Based** | Full-stack features | Database → Backend → API → Frontend |
| **Feature-Based** | User-facing features | Core → Management → Integration |
| **Phase-Based** | Multi-phase projects | Strict sequential gates |
| **Risk-Based** | High-risk features | Spike → Core → Security → Testing |

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
| Empty sections | Populate all sections with meaningful content (min 50 chars) |
| No codebase references | Search and link relevant files |
| Skeleton tasks | Validation will block WIP; provide substantive content |

## Task Estimation Techniques Quick Reference

| Technique | When to Use | Key Formula |
|-----------|-------------|-------------|
| **PERT** | Complex projects | (optimistic + 4×likely + pessimistic) / 6 |
| **T-Shirt Sizing** | High-level planning | XS/S/M/L/XL relative sizing |
| **Time-Boxing** | Fixed deadlines | Reverse-engineer tasks to fit timebox |
| **Historical Analysis** | Similar past work | Base estimates on actual data |
| **Expert Judgment** | Specialized tasks | Consult domain experts |

**For detailed estimation guidance, see `references/estimation.md`.**

## Analysis Process

### Workflow

```
1. ANALYZE → Clarify goal, identify deliverables, assess constraints
2. DECOMPOSE → Break into hierarchical tasks, apply appropriate pattern
3. IDENTIFY DEPENDENCIES → Sequential (→), parallel (||), blocked (⧖)
4. ESTIMATE → Apply estimation technique, add buffers
5. GATHER REFERENCES → Search codebase, link relevant files
6. VALIDATE → Review against quality checklist, verify dependencies
7. GENERATE STRUCTURED OUTPUT → JSON for batch creation
8. OUTPUT → Provide structured breakdown ready for rd2:tasks batch-create
```

### Decision Framework

| Situation | Approach | Multi-Folder? |
|-----------|----------|---------------|
| Full-stack feature | Decompose by layer (DB → API → Frontend) | Single folder |
| Multi-feature project | By feature, then by layer | Consider phase folders |
| Bug fix | Single task with investigation subtasks | Current folder |
| Research task | By research questions, one task per question | Current folder |
| MVP | User story mapping → technical tasks | Single folder |
| Refactoring | Component-based decomposition with codebase references | Current folder |
| Migration | Phased (legacy → coexist → cutover) with dependencies | Multi-folder recommended |
| Unknown domain | Research first, then decompose with verified approach | Decide after research |
| Multi-phase project | Phase-based decomposition | Multi-folder required |

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
- [ ] Search codebase for related files and include absolute paths
- [ ] Flag high-risk tasks for mitigation
- [ ] Include testing and documentation tasks
- [ ] Validate against quality checklist
- [ ] Provide substantive Background content (min 50 chars)
- [ ] Provide substantive Requirements content (min 50 chars)
- [ ] Output structured JSON for batch creation
- [ ] Consider multi-folder placement for phased projects

### Never Do

- [ ] Decompose without understanding goal
- [ ] Ignore dependencies or create circular dependencies
- [ ] Create tasks exceeding 1 day without decomposition
- [ ] Skip success criteria or use vague criteria
- [ ] Proceed with unclear requirements
- [ ] Create tasks smaller than 1 hour (over-decomposition)
- [ ] Ignore critical path without buffers
- [ ] Leave task file sections empty (when providing guidance)
- [ ] Skip codebase reference gathering
- [ ] Use relative paths in references (always use absolute paths)
- [ ] Generate breakdowns without verification
- [ ] Ignore red flags from verification protocol
- [ ] Assign WBS numbers (handled by rd2:tasks)
- [ ] Output skeleton tasks with placeholder content
- [ ] Use "TBD", "TODO", or empty strings for Background/Requirements

## Output Format

### Task Decomposition Output Format

When providing task decomposition guidance, use this format:

```markdown
# Task Decomposition: {Project/Feature Name}

## Overview

**Goal**: {What we're trying to achieve}
**Success Criteria**: {How we know we're done}
**Total Tasks**: {count}
**Estimated Effort**: {time range with buffer}
**Multi-Folder**: {yes/no - if yes, specify folders and base_counter strategy}

## Task Breakdown

| ID   | Task Name                | Est. Hours | Dependencies | Risk  | Folder Hint |
| ---- | ------------------------ | ---------- | ------------ | ----- | ----------- |
| 1    | {Task Name}              | 4-6        | None         | Low   | current     |
| 2    | {Task Name}              | 3-4        | 1            | Medium| current     |
| 3    | {Task Name}              | 2-3        | 1            | Low   | current     |
| 4    | {Task Name}              | 6-8        | 2, 3         | High  | docs/v2     |

## Dependency Graph

```
1 (Foundation)
↓
2 (Build) || 3 (Parallel Work)
↓
4 (Integration)
```

**Critical Path**: 1 → 2 → 4 (buffer: 20%)
**Parallel Opportunities**: (2 || 3)

## References

- Code: `/path/to/related/code.py`
- Docs: `/path/to/docs.md`

## Structured Output (for batch-create)

```json
[
  {
    "name": "task-1-foundation",
    "background": "Substantive context explaining why this task exists and what problem it solves (min 50 chars, ideally 100+)",
    "requirements": "Measurable success criteria with specific acceptance criteria (min 50 chars, ideally 100+)",
    "solution": "Technical approach and implementation strategy",
    "priority": "high",
    "estimated_hours": 5
  },
  {
    "name": "task-2-build",
    "background": "Context for build phase...",
    "requirements": "Success criteria for build...",
    "solution": "Technical approach...",
    "priority": "medium",
    "estimated_hours": 4,
    "dependencies": ["task-1-foundation"]
  }
]
```

## Next Steps

**Option 1: Batch creation from JSON**
```bash
# Save JSON to file
tasks batch-create --from-json decomposition.json
```

**Option 2: Manual creation with rich flags**
```bash
tasks create "task-1-foundation" \
  --background "Substantive context..." \
  --requirements "Measurable success criteria..."
```

**Option 3: Agent output with footer**
```bash
# Agent appends <!-- TASKS: [...] --> to analysis
tasks batch-create --from-agent-output analysis.md
```

## Confidence: HIGH/MEDIUM/LOW

**Reasoning**: {Why this level}
**Verification Sources**: {List sources}
**Validation Check**: Background + Requirements content > 50 chars each
```

**For detailed examples of decomposed tasks, see `references/examples.md`.**

## Related Skills

- **`rd2:tasks`** - Task file operations (create, update, WBS assignment, status management, kanban sync, batch creation)
- **`rd2:tdd-workflow`** - Test-driven development for implementation
- **`rd2:super-planner`** - Planning and orchestration agent (uses this skill)
- **`rd2:super-architect`** - Architecture design agent (uses this skill)
- **`rd2:super-brain`** - Brainstorming agent (uses this skill for idea-to-tasks)
- **`rd2:super-coder`** - Implementation agent (uses this skill for complexity escalation)
- **`rd2:super-designer`** - Design agent (uses this skill for multi-component designs)
- **`rd2:super-code-reviewer`** - Code review agent (uses this skill for remediation tracking)

## Integration with rd2:tasks

This skill provides the **knowledge** for decomposition with **structured outputs**, while `rd2:tasks` handles the **file operations**.

**Workflow:**
```
1. Use rd2:task-decomposition to analyze requirements
2. Apply decomposition patterns to create task breakdown
3. Generate structured JSON output
4. Delegate to rd2:tasks batch-create (JSON) or create (rich flags)
5. rd2:tasks assigns WBS numbers and creates files
6. Tasks tracked via kanban board
```

### rd2:tasks CLI Reference

| Command | Purpose | Usage |
|---------|---------|-------|
| `tasks create <name>` | Create with rich content | `tasks create "User Auth" --background "..." --requirements "..."` |
| `tasks batch-create` | Create from JSON/agent output | `tasks batch-create --from-json tasks.json` |
| `tasks update <WBS> <stage>` | Update task status | `tasks update 0001 WIP` |
| `tasks update --section` | Update section content | `tasks update 0001 --section Design --from-file /tmp/design.md` |
| `tasks list [stage]` | View kanban board | `tasks list` or `tasks list Todo` |
| `tasks refresh` | Rebuild kanban from files | `tasks refresh` |
| `tasks config` | Manage multi-folder config | `tasks config add-folder docs/v2 --base-counter 200` |
| `tasks check` | Validate tasks | `tasks check` or `tasks check 0047` |

**Status Stages:** Backlog → Todo → WIP → Testing → Done

**Task File Location:** Configured folders (default: `docs/prompts/`, see `tasks config`)

## Integration with Agents

### super-planner Integration

`super-planner` uses this skill in its **planning phase** workflow:

```python
# In super-planner's decomposition phase:
Skill(skill="rd2:task-decomposition", args=f"requirement: {user_request}")

# Receives structured JSON output
# Delegates to rd2:tasks for file creation:
Bash("tasks batch-create --from-json /tmp/decomposition.json")
```

### super-architect Integration

`super-architect` uses this skill for architecture-driven decomposition:

```python
# After architecture design:
Skill(skill="rd2:task-decomposition",
     args=f"architecture-based decomposition: {architecture_doc}")

# Receives layer-based task breakdown
# Delegates to rd2:tasks
```

### super-brain Integration

`super-brain` uses this skill to convert brainstorming output to actionable tasks:

```python
# After brainstorming session:
Skill(skill="rd2:task-decomposition",
     args=f"convert ideas to tasks: {brainstorm_output}")

# Receives structured task definitions
# Appends <!-- TASKS: [...] --> footer
# User can consume via: tasks batch-create --from-agent-output
```

### super-coder Integration

`super-coder` uses this skill when implementation complexity exceeds thresholds:

```python
# When task exceeds 500 LOC or 5+ files:
Skill(skill="rd2:task-decomposition",
     args=f"implementation-driven decomposition: {complex_task}")

# Receives structured subtask definitions
# Escalates to super-planner for task creation
```

### super-designer Integration

`super-designer` uses this skill when design spans multiple components:

```python
# When design spans 10+ components or multiple pages:
Skill(skill="rd2:task-decomposition",
     args=f"design-driven decomposition: {design_spec}")

# Receives component-based task breakdown
# Delegates to rd2:tasks for file creation
```

### super-code-reviewer Integration

`super-code-reviewer` uses this skill when review uncovers significant remediation work:

```python
# When review finds 5+ issues needing tracked remediation:
Skill(skill="rd2:task-decomposition",
     args=f"review-driven decomposition: {review_findings}")

# Receives severity-based task breakdown
# Delegates to rd2:tasks for file creation
```

## Best Practices

### Task Naming

**Good:** "implement-user-authentication-api", "add-oauth2-google-provider", "create-user-model-with-email-verification"

**Avoid:** "auth-stuff", "fix-bugs", "work-on-feature"

**Use action verbs:** implement, add, create, update, refactor, fix, design, test, document

### Task Content Quality

**Good Background (100+ chars):**
> "Users need OAuth2 authentication for enterprise SSO integration. Current system only supports email/password, creating friction for corporate users. This task implements Google OAuth2 provider as the first step toward multi-provider support."

**Bad Background (< 50 chars):**
> "Add OAuth2" ← Blocked by validation

**Good Requirements (100+ chars):**
> "Must support Google OAuth2 authorization code flow, handle token refresh automatically, store provider-specific user data securely. Success criteria: User can login with Google, tokens auto-refresh before expiry, profile data syncs on each login."

**Bad Requirements (< 50 chars):**
> "OAuth2 flow" ← Blocked by validation

### Task Breakdown Checklist

Before finalizing task decomposition:
- [ ] Each task is 2-8 hours
- [ ] Each task has single responsibility
- [ ] Each task has clear deliverable
- [ ] Each task has verifiable outcome
- [ ] Dependencies identified and documented
- [ ] No circular dependencies
- [ ] High-risk tasks flagged
- [ ] Parallel opportunities identified
- [ ] Testing tasks included
- [ ] Documentation tasks included
- [ ] Buffers added to estimates
- [ ] References gathered from codebase
- [ ] Background content > 50 chars (ideally 100+)
- [ ] Requirements content > 50 chars (ideally 100+)
- [ ] Structured JSON output generated
- [ ] Multi-folder strategy planned (if applicable)
