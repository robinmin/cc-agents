---
name: add-new-sections-to-agent
description: Add new sections to IT Writer agent document for orchestration layer design
status: Done
created_at: 2026-01-30
updated_at: 2026-01-30
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
dependencies: [0107]
tags: [wt, it-writer, documentation, orchestration, workflow]
---

## 0108. Add New Sections to Agent

### Background

The IT Writer agent redesign introduces 6 new sections to support the orchestration layer pattern. These sections document the agent's input patterns, output patterns, workflow orchestration, stage gate handlers, error handling, and delegation patterns.

**Design Source:** `/Users/robin/projects/cc-agents/docs/plans/2026-01-30-it-writer-agent-redesign.md`

**Target File:** `/Users/robin/projects/cc-agents/plugins/wt/agents/it-writer.md`

**Dependency:** Task 0107 must be completed first (frontmatter update)

### Requirements / Objectives

**Functional Requirements:**
- Add **Input Patterns** section documenting hybrid input approach
- Add **Output Patterns** section documenting adaptive response formatting
- Add **Workflow Orchestration** section with:
  - Intelligent stage selection table
  - Context awareness description
  - Dependency validation rules
- Add **Stage Gate Handlers** section with 3 gate types
- Add **Error Handling & Recovery** section
- Add **Delegation Pattern** section with stage-to-skill mapping

**Section Content Requirements:**

**1. Input Patterns**
- Document Pattern A: Natural Language Task with example
- Document Pattern B: Structured Parameters with YAML example
- List required fields and validation rules
- Include default values table

**2. Output Patterns**
- Document Full Workflow Output format (7 stages)
- Document Single-Stage Output format
- Show example output for each

**3. Workflow Orchestration**
- Intelligent Stage Selection table (7 task types)
- Context Awareness description (3+ behaviors)
- Dependency Validation with stage prerequisites

**4. Stage Gate Handlers**
- Gate 1: Outline Approval (Stage 2) - flow with AskUserQuestion
- Gate 2: Draft Review (Stage 3) - approve/revise/regenerate options
- Gate 3: Publishing Approval (Stage 6) - dry-run vs live options

**5. Error Handling & Recovery**
- Stage Execution Errors table (4 error types)
- User Input Errors table (3 error types)
- Smart Defaults list (4 defaults)
- Partial Success Handling description

**6. Delegation Pattern**
- Stage-to-Skill Mapping table (stages 0-6 with tools)
- Context Passing description (6 stages)

**Acceptance Criteria:**
- [ ] All 6 new sections present in agent file
- [ ] Input Patterns section has both Pattern A and Pattern B examples
- [ ] Output Patterns section has both full workflow and single-stage examples
- [ ] Workflow Orchestration has stage selection table with 7 rows
- [ ] Stage Gate Handlers documents all 3 gate types
- [ ] Error Handling includes all 4 error categories
- [ ] Delegation Pattern has complete stage-to-skill mapping (stages 0-6)
- [ ] All tables properly formatted in Markdown
- [ ] All code blocks properly formatted with syntax highlighting

#### Q&A

**Q:** Should examples use real or placeholder content?
**A:** Use real examples from design document (FastAPI REST APIs, Python Development collection).

**Q:** Where should sections be inserted in the document?
**A:** After "When to Use" section, before "Example Invocations" section.

### Solutions / Goals

**Technology Stack:**
- Markdown documentation
- File: `/Users/robin/projects/cc-agents/plugins/wt/agents/it-writer.md`

**Implementation Approach:**
1. Insert new sections after existing "When to Use" section
2. Copy content structure from design document
3. Ensure all tables and code blocks are properly formatted
4. Verify section ordering is logical
5. Update task file with completion status

#### Plan

1. **Insert New Sections**
   - [ ] Add Input Patterns section after "When to Use"
   - [ ] Add Output Patterns section
   - [ ] Add Workflow Orchestration section
   - [ ] Add Stage Gate Handlers section
   - [ ] Add Error Handling & Recovery section
   - [ ] Add Delegation Pattern section

2. **Verify Content**
   - [ ] All 6 sections present
   - [ ] All tables formatted correctly
   - [ ] All code blocks have language tags
   - [ ] Section ordering follows design document

### References

- Design document: `/Users/robin/projects/cc-agents/docs/plans/2026-01-30-it-writer-agent-redesign.md`
- Agent file: `/Users/robin/projects/cc-agents/plugins/wt/agents/it-writer.md`
- Dependency: Task 0107 (frontmatter update)
- Related tasks: 0109 (updates), 0110 (validation)
