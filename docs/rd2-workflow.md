# RD2 Workflow Documentation

Complete workflow guide for the rd2 plugin's two-level review process and super-* agent orchestration.

## Overview

The rd2 plugin implements a comprehensive workflow with **two-level review process**:

1. **Solution Review** (Step 3, Optional) - Architecture/design level validation
2. **Code Review** (Step 9-10, Mandatory) - Implementation quality validation

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE RD2 WORKFLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

User Requirements
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: super-planner receives requirements                                  │
│  - Assesses scale and complexity                                             │
│  - Determines if specialists are needed                                      │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Task Decomposition                                                  │
│  - Consult rd2:task-decomposition for decomposition knowledge/patterns     │
│  - Delegate to rd2:tasks decompose for file creation                        │
│  - Break down requirements into WBS-structured subtasks                      │
│  - Assign WBS# numbers                                                      │
│  - Track dependencies                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: Solution Review (OPTIONAL - if complex)                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ super-architect validates:                                           │   │
│  │  - Overall architecture decisions                                    │   │
│  │  - Design pattern selection                                          │   │
│  │  - System boundaries and integration                                 │   │
│  │  - High-level scalability                                            │   │
│  │  - Technology stack choices                                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  SCALE ASSESSMENT CRITERIA:                                                  │
│  - High complexity (multi-system integration)                               │
│  - New technology stack                                                      │
│  - Security-critical requirements                                           │
│  - Performance-critical requirements                                        │
│  - User explicitly requests architecture review                              │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: UI/UX Design (OPTIONAL - if frontend work)                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ super-designer creates:                                              │   │
│  │  - UI/UX design specifications                                        │   │
│  │  - Component documentation                                            │   │
│  │  - Accessibility compliance (WCAG AA)                                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  TRIGGER CRITERIA:                                                          │
│  - Frontend components required                                             │
│  - User interface needed                                                    │
│  - User explicitly requests design review                                    │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 5-10: Implementation (super-coder)                                      │
│                                                                             │
│  Steps 1-6: Understand & Clarify                                            │
│   Step 7: Design & Plan → Uses solution review output                        │
│   Step 8: Implementation Strategy → Uses design specifications               │
│  Step 11: Mark as WIP                                                       │
│  Step 12: Select Code Generation → Delegates to coder-* skills              │
│  Step 13: Apply TDD Workflow → Uses rd2:tdd-workflow                        │
│  Step 14-15: Implement Code & Generate Tests                                │
│  Step 16: Debug Issues → Systematic debugging                               │
│  Step 17: Verify Completion → Ready for code review                         │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 9-10: Code Review (MANDATORY) ← YOU ARE HERE                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ super-code-reviewer validates:                                        │   │
│  │  - Code quality and style                                             │   │
│  │  - Best practices adherence                                           │   │
│  │  - Bug detection and edge cases                                       │   │
│  │  - Error handling completeness                                        │   │
│  │  - Test coverage and test quality                                     │   │
│  │  - Documentation quality                                              │   │
│  │  - Performance issues                                                 │   │
│  │  - Security vulnerabilities in implementation                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  TOOL AUTO-SELECTION:                                                        │
│  - < 500 LOC, simple → claude                                               │
│  - 500-2000 LOC → gemini-flash                                              │
│  - > 2000 LOC, complex → gemini-pro                                         │
│  - Semantic context needed → auggie                                          │
│  - Security audit → gemini-pro                                              │
│  - Multi-model access → opencode                                            │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 10: Mark as Done                                                        │
│  - Update task file status to "Done"                                         │
│  - Archive implementation results                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Integration Points

### Solution Review → Implementation

**When super-architect completes solution review:**

1. **Architecture Decision Records (ADRs)** created
2. **Task file enhanced** with architecture decisions section
3. **Integration points documented** (system boundaries, dependencies)
4. **Scalability considerations** documented

**super-coder consumes:**
- Architecture decisions from task file
- Integration specifications
- Technology choices and constraints
- Performance requirements

### Design → Implementation

**When super-designer completes design:**

1. **Component specifications** created (states, variants, interactions)
2. **Design tokens** documented (colors, spacing, typography)
3. **Accessibility requirements** specified (WCAG level)
4. **Responsive design** breakpoints defined

**super-coder consumes:**
- Component specifications for implementation
- Design tokens for styling
- Accessibility checklist for testing
- Responsive breakpoints for CSS

### Implementation → Code Review

**When super-coder completes implementation:**

1. **All tests passing** (unit, integration, E2E)
2. **Code documented** with comments and docstrings
3. **Task file updated** with Q&A and Plan sections
4. **Status marked** ready for review

**super-code-reviewer validates:**
- Code quality matches super-coder methodology
- Tests cover critical paths
- Documentation is complete
- No obvious bugs or edge cases

## Decision Matrix

### When to Invoke super-architect (Solution Review)

| Criteria | Yes (Invoke) | No (Skip) |
|----------|--------------|-----------|
| **System scale** | Multi-service, distributed | Single service, simple |
| **Technology** | New tech stack for team | Established tech stack |
| **Security** | Handles sensitive data | Non-sensitive data |
| **Performance** | High throughput required | Standard performance OK |
| **Integration** | External system dependencies | Self-contained |
| **User request** | Explicitly requested | Not mentioned |

### When to Invoke super-designer (UI/UX Design)

| Criteria | Yes (Invoke) | No (Skip) |
|----------|--------------|-----------|
| **Frontend** | UI components required | Backend/API only |
| **User interaction** | User-facing features | Internal tools |
| **Accessibility** | Public-facing app | Internal/admin tools |
| **User request** | Explicitly requested | Not mentioned |

### When to Auto-Select Code Review Tool

| Code Characteristics | Selected Tool | Rationale |
|---------------------|---------------|-----------|
| < 500 LOC, simple | claude | Fast, no external setup |
| 500-2000 LOC | gemini-flash | Balanced speed/capability |
| > 2000 LOC, complex | gemini-pro | Comprehensive analysis |
| Semantic context | auggie | Codebase-aware indexing |
| Security audit | gemini-pro | Thorough security analysis |
| Multi-model | opencode | External AI perspective |

## Example Workflows

### Example 1: Simple Feature (No Solution Review)

```
User: /rd2:tasks-plan "Add user profile page"

→ super-planner agent: Scale=low, no architect needed
→ rd2:tasks skill (decompose): Creates 3 tasks
→ super-coder agent: Implements with TDD workflow (via /rd2:code-generate --task XXXX)
→ super-code-reviewer agent: Auto-selects claude for quick review (via /rd2:code-review)
→ Task: Done
```

### Example 2: Complex Feature (With Solution Review)

```
User: /rd2:tasks-plan "Build payment processing system with Stripe"

→ super-planner agent: Scale=high, architect needed
→ rd2:tasks skill (decompose): Creates 8 tasks
→ super-architect agent: Solution review (security, architecture)
→ super-coder agent: Implements with TDD workflow
→ super-code-reviewer agent: Auto-selects gemini-pro for security audit
→ Task: Done
```

### Example 3: Full-Stack Feature (With Design)

```
User: /rd2:tasks-plan "Build admin dashboard with user management"

→ super-planner agent: Scale=medium, designer needed
→ rd2:tasks skill (decompose): Creates 10 tasks
→ super-designer agent: UI/UX specifications
→ super-coder agent: Implements frontend + backend
→ super-code-reviewer agent: Auto-selects gemini-flash for comprehensive review
→ Task: Done
```

## Quick Reference

### Command Invocation

**Note:** Commands (entry points) use `/rd2:command-name` syntax. Agents are delegated to by commands, not invoked directly.

```bash
# Start workflow (auto-scales) - delegates to super-planner agent
/rd2:tasks-plan "Build user authentication system"

# Force solution review
/rd2:tasks-plan "Build payment system" --architect

# Force design review
/rd2:tasks-plan "Build admin dashboard" --design

# Task-driven implementation - delegates to super-coder agent
/rd2:code-generate --task 0047

# Code review with auto-selection - delegates to super-code-reviewer agent
/rd2:code-review src/auth/

# Code review with explicit tool
/rd2:code-review --tool gemini --focus security src/
```

### Task File Status Flow

```
Backlog → Todo → WIP → Testing → Done
                ↓       ↓
          (coding) (tests)
```

### Review Result Integration

Both solution review and code review produce:

1. **Structured findings** with severity levels
2. **Recommendations** with action items
3. **Quality scores** for tracking
4. **Task import capability** for issue tracking

## Related Documentation

- **super-planner**: `plugins/rd2/agents/super-planner.md`
- **super-architect**: `plugins/rd2/agents/super-architect.md`
- **super-designer**: `plugins/rd2/agents/super-designer.md`
- **super-coder**: `plugins/rd2/agents/super-coder.md`
- **super-code-reviewer**: `plugins/rd2/agents/super-code-reviewer.md`
- **tasks**: `plugins/rd2/skills/tasks/SKILL.md`
- **tdd-workflow**: `plugins/rd2/skills/tdd-workflow/SKILL.md`
