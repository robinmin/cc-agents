---
name: expert based agent architecture
description: Build MVP of Iterative, Self-Evolving, Hallucination-Resistant AI Suite with 8-section expert agents, verification protocols, and multi-layer verification strategy
status: Done
current_phase: 8
verify_cmd:
impl_progress:
  phase_1: completed
  phase_2: completed
  phase_3: completed
  phase_4: completed
  phase_5: completed
  phase_6: completed
  phase_7: completed
  phase_8: pending
created_at: 2026-01-09 17:57:27
updated_at: 2026-01-12 16:45:42
---

## 0004. Expert Based Agent Architecture

### Background

According to the papers in the References section (@docs/prompts/0004/medium.com_70638b9e_20260109_164107.pdf, and @docs/prompts/0004/medium.com_9fd0bb66_20260109_164142.pdf), we can see a more systematic and reliable approach to building expert agents to make sure the way we collaborate with them is more efficient and less hallucination.

Meanwhile, file @plugins/rd/commands/agent-meta.md is the definition of you, our meta agent. I want to base on your current prompt content with the experience and best practices above two papers mentioned to build next generation of you. So far, I named it as agent-expert in file @plugins/rd/agnts/agent-expert.md. It's the meta agent that can generate expert agents with SOTA techniques and the industry best practices.

You need to fully understand the content of the papers mentioned above and apply them to the new generated prompt content very strictly.

I also download the git repository of the author mentioned in the papers. You can refer it from folder @claude-code-subagents-collection

### Requirements / Objectives

**Our major goal of this task** is to build a MVP of Iterative, Self-Evolving, Hallucination-Resistant AI Suite. As the author suggested, what I want to build is a working workflow at least with the following steps:

- Input: "User Request"
- Routing: Auto-detect `xxxx-expert` agent will be used
- Skill: load `anti-halucination.md`
- Using tools: use local text tools or check with MCP ref for docs & HuggingFace for Models
- Safety Hook: PreToolUse - Validate safety
- Verification: Use LSP in prior if available, then we can try to use Jupyter as the author suggested as Claude Code start to support LSP features recently. (<- This is the different place with the original papers)
- Cleanup Hook: PostToolUse - Auto-formatting and cleanup
- Verified Code Output

Before any further action, you must to do the following first:

- Have a comprehensive review on the papers (both @docs/prompts/0004/medium.com_70638b9e_20260109_164107.pdf and @docs/prompts/0004/medium.com_9fd0bb66_20260109_164142.pdf) and clear understanding of their content. For example, its 3 pillars: Domain expertise auto-routing, Real-time data Live documentation Notebook execution, and Forced verification source citations confidence scoring graceful fallbacks.

**User Decisions (via interview):**

- Priority: **Production-Ready First** - Build full 400-600 line expert agents with complete verification protocols
- CLAUDE.md Scope: **Comprehensive** - Full configuration with tools routing, agent auto-detection, anti-hallucination protocol, error handling, fallback chains, and MCP integration
- Verification Strategy: **Multi-Layer** - LSP → Jupyter → MCP ref → WebSearch → local tools with graceful fallbacks
- Sample Agents: **Generate All Four** - python-expert, typescript-expert, mcp-expert, task-decomposition-expert

The following are the expected deliverables:

#### Global CLAUDE.md

Develop a global CLAUDE.md in @docs/prompts/0004/global_CLAUDE.md. As my current template shown, it at least contains:

- Recommended tools
- Agent Routing (Auto-Detection)
- Anti-Hallucination Protocol
- Error Handling & Fallbacks

If you have any suggestions based on the industry best practices and SOTA techniques, please feel free to add them.

#### agent-expert

It's a Meta-agent architect that generates production-ready expert agent skeletons following the official 8-section anatomy as the author described in the papers. This tool will be used to generate expert agents first with generic knowledge. Then the real expert user needs to finalize the agent by adding their specific knowledge and expertise to make it a real usable expert agent. It's located in @plugins/rd/agnts/agent-expert.md(I already prepared a initial version).

You also need to refer to the author's sample agent expert to optimize this agent-expert from file @claude-code-subagents-collection/subagents/agent-expert.md.

#### agent-doctor

It's the partner with agent-expert and located in @plugins/rd/agnts/agent-doctor.md. This agent follows up the author's approach to establish an expert agent evaluation process (Rule-based checking list with scoring framework mechanism), and provides improvement feedback on the generated expert agent. Normally, end user will:

- use `agent-expert` to generate an initial expert agent skeleton.
- Human-in-the-loop to refine and optimize the generated expert agent.
- use `agent-doctor` to validate and improve the generated expert agent.

#### Develop hook scripts for `PreToolUse` and `PostToolUse`

I will prepare MCP separatedly, you can ignore the relevant things.

#### Develop sample expert agents

I already put the sample expert agents in `ls claude-code-subagents-collection/subagents/*expert*.md` which provided by the author for reference.

You need to figure out the following expert agents(@plugins/rd/agnts/python-expert.md, @plugins/rd/agnts/typescript-expert.md, @plugins/rd/agnts/mcp-expert.md and @plugins/rd/agnts/task-decomposition-expert.md) by the following steps:

- Use `agent-expert` to generate an initial expert agent skeleton.
- Refer to the author's sample expert agents to refine and optimize the generated expert agent.
- use `agent-doctor` to validate and improve the generated expert agent.

Then I can get the following almost production-ready expert agents:

- @plugins/rd/agnts/python-expert.md
- @plugins/rd/agnts/typescript-expert.md
- @plugins/rd/agnts/mcp-expert.md
- @plugins/rd/agnts/task-decomposition-expert.md

### Solutions / Goals

#### Architecture Overview

This implementation creates a **Hallucination-Resistant Expert Agent System** based on the 8-section anatomy from the research papers. The system consists of:

1. **Global Configuration** (`global_CLAUDE.md`) - Foundation for all expert agents
2. **Meta Agents** (`agent-expert`, `agent-doctor`) - Agent generation and validation
3. **Expert Agents** (4 domain-specific) - Production-ready with verification protocols
4. **Hook System** (`PreToolUse`, `PostToolUse`) - Safety validation and code cleanup
5. **Multi-Layer Verification** - Cascading fallback strategy for fact-checking

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        USER REQUEST                                         │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   AGENT AUTO-ROUTING                                        │
│  • Detect domain from request (python, typescript, mcp, task-decomposition) │
│  • Load appropriate expert agent via "Use PROACTIVELY for" patterns         │
│  • Fall back to general-purpose agent if no match                           │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 ANTI-HALLUCINATION PROTOCOL                                  │
│  • Force verification BEFORE generation (not after)                         │
│  • Load competency lists as "structured memory"                             │
│  • Require source citations for all technical claims                        │
│  • Apply confidence scoring (HIGH/MEDIUM/LOW) to outputs                    │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 PRETOOLUSE HOOK (Safety Validation)                          │
│  • Validate file paths (no path traversal, no sensitive files)              │
│  • Check for credentials/secrets in code                                    │
│  • Verify command safety (no destructive operations without confirmation)   │
│  • Approve/deny/ask user based on risk assessment                           │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│           MULTI-LAYER VERIFICATION STRATEGY                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Layer 1: LSP (Language Server Protocol)                             │    │
│  │   • Validate syntax, semantics, type checking                        │    │
│  │   • Check for language-specific errors                              │    │
│  │   • Provide real-time feedback                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │ Fallback                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Layer 2: Jupyter Notebook Execution                                │    │
│  │   • Execute code in isolated environment                            │    │
│  │   • Verify runtime behavior                                         │    │
│  │   • Test edge cases                                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │ Fallback                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Layer 3: MCP ref (ref_search_documentation + ref_read_url)         │    │
│  │   • Search official documentation in real-time                       │    │
│  │   • Verify API signatures, deprecations, breaking changes            │    │
│  │   • Check for updates in last 6 months                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │ Fallback                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Layer 4: HuggingFace Models (for model-specific verification)      │    │
│  │   • Verify model architectures and capabilities                     │    │
│  │   • Check model versions and compatibility                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │ Fallback                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Layer 5: WebSearch (for recent changes/blogs)                      │    │
│  │   • Check for recent announcements                                  │    │
│  │   • Verify community consensus                                      │    │
│  │   • Look for breaking changes                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │ Fallback                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Layer 6: Local Text Tools (final fallback)                         │    │
│  │   • Use Read, Grep, Glob for file-based verification                │    │
│  │   • State "UNVERIFIED" if all else fails                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                POSTTOOLUSE HOOK (Code Cleanup)                               │
│  • Auto-format code (prettier, black, eslint, etc.)                         │
│  • Remove unused imports/variables                                          │
│  • Apply linting rules                                                      │
│  • Verify no breaking changes introduced                                    │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  VERIFIED CODE OUTPUT                                        │
│  • Confidence score attached (HIGH/MEDIUM/LOW)                               │
│  • Source citations included                                                │
│  • Verification timestamp                                                   │
│  • Fallback notes (if any)                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Core Components

##### 1. Global CLAUDE.md (`docs/prompts/0004/global_CLAUDE.md`)

**Purpose:** Foundation configuration for all expert agents in the system.

**Sections:**

- **Recommended Tools** - Tool priority and usage patterns
- **Agent Routing** - Auto-detection rules using "Use PROACTIVELY for" patterns
- **Anti-Hallucination Protocol** - Verification-first methodology
- **Multi-Layer Verification** - Cascading fallback strategy
- **Error Handling & Fallbacks** - Graceful degradation patterns
- **Confidence Scoring** - Output quality indicators
- **Source Citation Format** - Standardized reference format
- **MCP Integration** - ref and other MCP server usage guidelines

**Key Design Decisions:**

- Uses `ref` MCP (ref_search_documentation, ref_read_url) instead of Context7
- Multi-layer verification ensures reliability even when some tools are unavailable
- Explicit fallback chains prevent silent failures
- Confidence scoring provides transparency about output reliability

##### 2. agent-expert (`plugins/rd/agnts/agent-expert.md`)

**Purpose:** Meta-agent architect that generates production-ready expert agent skeletons.

**Based on:** Author's reference implementation from `claude-code-subagents-collection/subagents/agent-expert.md`

**Key Features:**

- Follows 8-section anatomy (400-600 lines per agent)
- Enforces verification protocols in all generated agents
- Generates comprehensive competency lists (50+ items)
- Includes "Use PROACTIVELY for" patterns for auto-routing
- Provides confidence scoring templates
- Implements graceful fallback chains

**8-Section Anatomy:**

1. **METADATA** (~5 lines) - name, description, tools, model, color
2. **PERSONA** (~20 lines) - Senior expert background and verification-first mindset
3. **PHILOSOPHY** (~30 lines) - Core principles including verification-before-generation
4. **VERIFICATION PROTOCOL** (~50 lines) - Red flags, source priority, confidence scoring, fallbacks
5. **COMPETENCY LISTS** (~250 lines) - Structured memory with 50+ items across categories
6. **ANALYSIS PROCESS** (~50 lines) - Reproducible methodology (Diagnose → Solve → Verify)
7. **ABSOLUTE RULES** (~40 lines) - DO ✓ and DON'T ✗ behaviors (8-12 each)
8. **OUTPUT FORMAT** (~30 lines) - Templates with confidence scoring

**Verification Protocol Template (included in all generated agents):**

```markdown
## Before Answering ANY Technical Question

BEFORE generating any answer, the agent MUST:

1. **Search First**: Use ref (ref_search_documentation) to verify current information
2. **Check Recency**: Look for updates in the last 6 months
3. **Cite Sources**: Every technical claim must reference documentation or authoritative source
4. **Acknowledge Uncertainty**: If unsure, say "I need to verify this" and search
5. **Version Awareness**: Always note version numbers

### Red Flags — STOP and verify

- API endpoints or method signatures from memory
- Configuration options without documentation backing
- Version-specific features without version check
- Performance claims without benchmark citations

### Confidence Scoring (REQUIRED)

| Level  | Threshold | Criteria                                             |
| ------ | --------- | ---------------------------------------------------- |
| HIGH   | >90%      | Direct quote from official docs, verified today      |
| MEDIUM | 70-90%    | Synthesized from multiple authoritative sources      |
| LOW    | <70%      | FLAG FOR USER REVIEW — state "I cannot fully verify" |
```

##### 3. agent-doctor (`plugins/rd/agnts/agent-doctor.md`)

**Purpose:** Expert agent evaluation and improvement specialist.

**Key Features:**

- Rule-based checklist for agent quality assessment
- Scoring framework (0-100 scale) across multiple dimensions
- Improvement feedback with specific recommendations
- Validates 8-section anatomy compliance
- Checks competency list completeness
- Verifies verification protocol presence

**Scoring Framework:**

| Dimension    | Weight | Criteria                                         |
| ------------ | ------ | ------------------------------------------------ |
| Structure    | 20%    | 8-section anatomy present, proper line counts    |
| Verification | 25%    | Verification protocol complete, red flags listed |
| Competencies | 20%    | 50+ items, proper categorization                 |
| Rules        | 15%    | DO ✓ and DON'T ✗ both present, 8+ each           |
| Auto-Routing | 10%    | "Use PROACTIVELY for" in description             |
| Examples     | 10%    | 2-3 examples demonstrating capabilities          |

**Workflow:**

1. **Read** agent file to evaluate
2. **Check** each section against requirements
3. **Score** each dimension based on completeness
4. **Provide** specific improvement recommendations
5. **Suggest** fixes for missing or weak areas

##### 4. Hook Scripts (`hooks/` directory)

**PreToolUse Hook** (`hooks/pre-tool-use.json`):

- Validate file paths (no traversal, no sensitive files)
- Check for credentials/secrets in code
- Verify command safety
- Use prompt-based hooks for context-aware decisions

**PostToolUse Hook** (`hooks/post-tool-use.json`):

- Auto-format code (language-specific formatters)
- Remove unused imports
- Apply linting rules
- Verify no breaking changes

**Note:** User mentioned they will prepare MCP separately, so hooks will focus on validation and formatting using available tools.

##### 5. Sample Expert Agents

**Four production-ready expert agents** to be generated using agent-expert:

1. **python-expert** (`plugins/rd/agnts/python-expert.md`)
   - Core concepts: async/await, decorators, generators, type hints
   - Tools: pytest, black, ruff, mypy
   - Verification: ref to Python docs, LSP via Pylance

2. **typescript-expert** (`plugins/rd/agnts/typescript-expert.md`)
   - Core concepts: generics, utility types, conditional types, discriminated unions
   - Tools: eslint, prettier,typescript-eslint
   - Verification: ref to TypeScript docs, LSP via tsserver

3. **mcp-expert** (`plugins/rd/agnts/mcp-expert.md`)
   - Core concepts: MCP protocol, server configuration, tool integration
   - Tools: npx, MCP servers
   - Verification: ref to MCP documentation

4. **task-decomposition-expert** (`plugins/rd/agnts/task-decomposition-expert.md`)
   - Core concepts: workflow design, dependency mapping, task prioritization
   - Tools: project management tools
   - Verification: ref to documentation on best practices

Each agent will:

- Be 400-600 lines following 8-section anatomy
- Include 50+ competency items
- Have complete verification protocol
- Use "Use PROACTIVELY for" for auto-routing
- Include confidence scoring in outputs

#### Data Model

##### Agent File Structure

```yaml
---
name: {domain}-expert
description: |
  Senior {Domain} expert. Use PROACTIVELY for {trigger keywords}.

  <example>
  Context: {situation}
  user: "{request}"
  assistant: "{response with verification}"
  <commentary>{explanation}</commentary>
  </example>
tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - WebSearch
  # MCP tools
model: inherit
color: {category-color}
---
```

##### Verification Protocol Data Model

```json
{
  "verification_chain": [
    { "layer": "LSP", "action": "validate_syntax", "fallback": "jupyter" },
    { "layer": "Jupyter", "action": "execute_code", "fallback": "ref" },
    { "layer": "ref", "action": "search_docs", "fallback": "websearch" },
    {
      "layer": "WebSearch",
      "action": "check_recency",
      "fallback": "local_tools"
    }
  ],
  "confidence_levels": {
    "HIGH": { "threshold": 90, "requirement": "direct_quote_from_docs" },
    "MEDIUM": {
      "threshold": 70,
      "requirement": "multiple_authoritative_sources"
    },
    "LOW": { "threshold": 0, "requirement": "flag_for_review" }
  }
}
```

##### Scoring Framework Data Model

```json
{
  "agent_scores": {
    "structure": { "weight": 0.2, "max": 20 },
    "verification": { "weight": 0.25, "max": 25 },
    "competencies": { "weight": 0.2, "max": 20 },
    "rules": { "weight": 0.15, "max": 15 },
    "auto_routing": { "weight": 0.1, "max": 10 },
    "examples": { "weight": 0.1, "max": 10 }
  },
  "total_score": { "min": 0, "max": 100, "passing": 80 }
}
```

#### API / Interface Design

##### Agent Generation Workflow

```bash
# Generate expert agent using agent-expert
/agent:agent-expert "Create a Rust expert agent"
  → Generates plugins/rd/agnts/rust-expert.md
  → Follows 8-section anatomy
  → Includes verification protocol
  → 400-600 lines with 50+ competencies

# Validate using agent-doctor
/agent:agent-doctor plugins/rd/agnts/rust-expert.md
  → Scores agent across 6 dimensions
  → Provides improvement recommendations
  → Suggests specific fixes

# Use the generated expert agent
# Auto-routing triggers based on "Use PROACTIVELY for" keywords
"I need to write a Rust iterator"
  → Automatically invokes rust-expert
  → Applies verification protocol
  → Returns code with confidence score
```

##### Hook Activation Flow

```json
// PreToolUse Hook Input
{
  "tool_name": "Write",
  "tool_input": {"file_path": "/path/to/file.py"},
  "session_id": "abc123"
}

// PreToolUse Hook Output
{
  "permissionDecision": "allow|deny|ask",
  "updatedInput": {},
  "systemMessage": "Validation passed"
}

// PostToolUse Hook Input
{
  "tool_name": "Edit",
  "tool_result": {"success": true},
  "session_id": "abc123"
}

// PostToolUse Hook Output
{
  "continue": true,
  "systemMessage": "Code formatted with black"
}
```

#### Key Implementation Details

1. **Auto-Routing Mechanism**
   - Uses "Use PROACTIVELY for {keywords}" in agent descriptions
   - Claude automatically detects patterns and routes to appropriate expert
   - No explicit @agent invocation needed for common tasks
   - Enables seamless multi-agent collaboration

2. **Verification-First Philosophy**
   - Forces verification BEFORE generation (critical difference from standard approach)
   - Transforms Claude from "confident intern" to "rigorous senior"
   - Every technical claim must have source citation
   - Confidence scores indicate verification level

3. **Competency Lists as Structured Memory**
   - LLMs cannot invent what's not in the prompt (by design)
   - Exhaustive lists constrain hallucination scope
   - 50+ items minimum across categories
   - Include "when NOT to use" to prevent misapplication

4. **Graceful Degradation**
   - Multi-layer verification ensures something always works
   - Each layer falls back to next if unavailable
   - Final fallback: state "UNVERIFIED" with LOW confidence
   - Never present unverified claims as verified facts

5. **Hook Integration**
   - Prompt-based hooks for context-aware validation
   - Use \${CLAUDE_PLUGIN_ROOT} for portable paths
   - Parallel execution for performance
   - JSON output for structured decisions

6. **Source Citation Format**
   - Inline citations with date: `[React Docs, 2022]`
   - Source priority: Official docs → Authoritative guides → Well-maintained repos → Community
   - Always include version numbers for version-specific claims
   - Link to sources when possible

#### Edge Cases Handled

| Edge Case                  | Solution                                                       |
| -------------------------- | -------------------------------------------------------------- |
| MCP unavailable            | Fallback to WebSearch → local tools → state "UNVERIFIED"       |
| No documentation found     | State uncertainty explicitly, use LOW confidence               |
| Conflicting sources        | Cite all sources, note conflict, recommend manual verification |
| Version ambiguity          | Always specify version, check for breaking changes             |
| Deprecated features        | Check deprecation dates, provide migration path                |
| Performance claims         | Require benchmark citations, otherwise state "unverified"      |
| Security-sensitive code    | Additional PreToolUse validation, ask for confirmation         |
| Domain too broad           | Suggest decomposition into multiple focused agents             |
| Competency list too short  | agent-doctor flags as incomplete, suggests additions           |
| Line count outside 400-600 | agent-doctor flags as violation, requires revision             |

### Implementation Plan

#### Phase 1: Foundation [Complexity: Medium]

**Goal**: Set up global configuration and meta-agent infrastructure

**Status**: completed

- [x] Create `docs/prompts/0004/global_CLAUDE.md` with comprehensive configuration
  - [x] Recommended tools section (tool priority and usage)
  - [x] Agent routing rules (auto-detection patterns)
  - [x] Anti-hallucination protocol (verification-first methodology)
  - [x] Multi-layer verification strategy (LSP → Jupyter → ref → WebSearch → local)
  - [x] Error handling & fallbacks (graceful degradation)
  - [x] Confidence scoring guidelines (HIGH/MEDIUM/LOW criteria)
  - [x] Source citation format (inline citations with dates)
  - [x] MCP integration guidelines (ref usage, other MCP servers)

- [x] Update `plugins/rd/agnts/agent-expert.md` based on author's reference
  - [x] Incorporate 8-section anatomy templates
  - [x] Add verification protocol templates
  - [x] Include competency list generation guidelines
  - [x] Add "Use PROACTIVELY for" patterns
  - [x] Ensure 400-600 line output specification
  - [x] Replace Context7 references with `ref` MCP tool
  - [x] Add self-verification checklist

**Deliverable**: Global CLAUDE.md and updated agent-expert ready for agent generation
**Dependencies**: None
**Estimated Components**: 2 files (global_CLAUDE.md, agent-expert.md)

---

#### Phase 2: Agent Doctor [Complexity: Medium]

**Goal**: Build agent validation and improvement specialist

**Status**: completed

- [x] Create `plugins/rd/agnts/agent-doctor.md` following 8-section anatomy
  - [x] METADATA: name, description with examples, tools (Read, Grep)
  - [x] PERSONA: Senior QA specialist with prompt engineering expertise
  - [x] PHILOSOPHY: Quality-first, comprehensive evaluation principles
  - [x] VERIFICATION PROTOCOL: How agent-doctor verifies its own assessments
  - [x] COMPETENCY LISTS: Agent quality criteria, scoring frameworks, patterns
  - [x] ANALYSIS PROCESS: Read → Check → Score → Provide recommendations
  - [x] ABSOLUTE RULES: DO ✓ (thorough evaluation) and DON'T ✗ (bypass checks)
  - [x] OUTPUT FORMAT: Score report with specific improvement suggestions

- [x] Implement scoring framework
  - [x] Structure dimension (20%): 8-section check, line count validation
  - [x] Verification dimension (25%): protocol completeness, red flags
  - [x] Competencies dimension (20%): 50+ items, categorization
  - [x] Rules dimension (15%): DO ✓ and DON'T ✗ presence
  - [x] Auto-routing dimension (10%): "Use PROACTIVELY for" check
  - [x] Examples dimension (10%): 2-3 example validation

- [x] Create evaluation templates
  - [x] Pass/fail criteria for each dimension
  - [x] Specific improvement recommendations
  - [x] Before/after comparison examples

**Deliverable**: agent-doctor capable of evaluating and improving expert agents
**Dependencies**: Phase 1 (global_CLAUDE.md for reference)
**Estimated Components**: 1 file (agent-doctor.md)

---

#### Phase 3: Hook Scripts [Complexity: Medium]

**Goal**: Implement PreToolUse and PostToolUse hooks for safety and cleanup

**Status**: completed

- [x] Create `hooks/pre-tool-use.json`
  - [x] Prompt-based hook for file write validation
  - [x] Path traversal detection
  - [x] Sensitive file detection (.env, credentials)
  - [x] Command safety validation
  - [x] Permission decision output (allow/deny/ask)

- [x] Create `hooks/post-tool-use.json`
  - [x] Language-specific formatting triggers
  - [x] Python: black, ruff
  - [x] TypeScript: eslint, prettier
  - [x] Generic: remove unused imports
  - [x] Feedback to Claude on cleanup actions

- [x] Create hook validation scripts (if needed)
  - [x] Path validation helper
  - [x] Credential detection helper
  - [x] Formatter invocation helpers

**Deliverable**: Functional hooks for safety validation and code cleanup
**Dependencies**: Phase 1 (tool definitions from global_CLAUDE.md)
**Estimated Components**: 2 files (pre-tool-use.json, post-tool-use.json), optional helper scripts

---

#### Phase 4: Python Expert [Complexity: High]

**Goal**: Generate production-ready Python expert agent using agent-expert

**Status**: completed

- [x] Invoke agent-expert to generate python-expert skeleton
  - [x] Specify domain: Python programming language
  - [x] Request focus areas: async, decorators, type hints, testing
  - [x] Ensure 400-600 line output

- [x] Refine based on author's python-expert reference
  - [x] Review author's implementation from claude-code-subagents-collection
  - [x] Incorporate missing patterns and best practices
  - [x] Ensure all 8 sections are comprehensive

- [x] Validate using agent-doctor
  - [x] Run agent-doctor on generated python-expert
  - [x] Address any failing dimensions
  - [x] Iterate until score ≥ 80

- [x] Final verification
  - [x] Line count: 400-600
  - [x] Competencies: 50+ items
  - [x] Verification protocol: Complete with red flags
  - [x] Rules: 8+ DO ✓ and 8+ DON'T ✗
  - [x] Auto-routing: "Use PROACTIVELY for" present

**Deliverable**: Production-ready python-expert.md agent
**Dependencies**: Phase 1 (agent-expert), Phase 2 (agent-doctor)
**Estimated Components**: 1 file (python-expert.md, 400-600 lines)

---

#### Phase 5: TypeScript Expert [Complexity: High]

**Goal**: Generate production-ready TypeScript expert agent

**Status**: completed

- [x] Invoke agent-expert to generate typescript-expert skeleton
  - [x] Specify domain: TypeScript programming language
  - [x] Request focus areas: generics, utility types, type system design
  - [x] Ensure 400-600 line output

- [x] Refine based on author's typescript-expert reference
  - [x] Review author's implementation
  - [x] Incorporate advanced type patterns
  - [x] Ensure comprehensive coverage

- [x] Validate using agent-doctor
  - [x] Run agent-doctor on generated typescript-expert
  - [x] Address any failing dimensions
  - [x] Iterate until score ≥ 80

- [x] Final verification
  - [x] All 8 sections complete
  - [x] 50+ competency items
  - [x] Verification protocol with TypeScript-specific red flags
  - [x] Complete rules section
  - [x] Auto-routing enabled

**Deliverable**: Production-ready typescript-expert.md agent
**Dependencies**: Phase 1 (agent-expert), Phase 2 (agent-doctor)
**Estimated Components**: 1 file (typescript-expert.md, 400-600 lines)

---

#### Phase 6: MCP Expert [Complexity: High]

**Goal**: Generate production-ready MCP expert agent

**Status**: completed

- [x] Invoke agent-expert to generate mcp-expert skeleton
  - [x] Specify domain: Model Context Protocol
  - [x] Request focus areas: server configuration, tool integration, protocol design
  - [x] Ensure 400-600 line output

- [x] Refine based on author's mcp-expert reference
  - [x] Review author's implementation
  - [x] Add MCP-specific verification patterns
  - [x] Include ref MCP tool usage examples

- [x] Validate using agent-doctor
  - [x] Run agent-doctor on generated mcp-expert
  - [x] Address any failing dimensions
  - [x] Iterate until score ≥ 80

- [x] Final verification
  - [x] Complete 8-section anatomy
  - [x] 50+ competency items on MCP ecosystem
  - [x] Verification protocol for MCP servers
  - [x] Complete rules section
  - [x] Auto-routing for MCP-related tasks

**Deliverable**: Production-ready mcp-expert.md agent
**Dependencies**: Phase 1 (agent-expert), Phase 2 (agent-doctor)
**Estimated Components**: 1 file (mcp-expert.md, 400-600 lines)

---

#### Phase 7: Task Decomposition Expert [Complexity: High]

**Goal**: Generate production-ready task decomposition expert agent

**Status**: completed

- [x] Invoke agent-expert to generate task-decomposition-expert skeleton
  - [x] Specify domain: Task breakdown and workflow design
  - [x] Request focus areas: dependency mapping, prioritization, agent orchestration
  - [x] Ensure 400-600 line output

- [x] Refine based on author's task-decomposition-expert reference
  - [x] Review author's implementation
  - [x] Add workflow design patterns
  - [x] Include multi-agent collaboration patterns

- [x] Validate using agent-doctor
  - [x] Run agent-doctor on generated task-decomposition-expert
  - [x] Address any failing dimensions
  - [x] Iterate until score ≥ 80

- [x] Final verification
  - [x] Complete 8-section anatomy
  - [x] 50+ competency items on task patterns
  - [x] Verification protocol for workflow design
  - [x] Complete rules section
  - [x] Auto-routing for task decomposition

**Deliverable**: Production-ready task-decomposition-expert.md agent
**Dependencies**: Phase 1 (agent-expert), Phase 2 (agent-doctor)
**Estimated Components**: 1 file (task-decomposition-expert.md, 400-600 lines)

---

#### Phase 8: Integration Testing [Complexity: Medium]

**Goal**: Verify end-to-end workflow functionality

**Status**: pending

- [ ] Test auto-routing
  - [ ] Verify python-expert triggers on Python-related requests
  - [ ] Verify typescript-expert triggers on TypeScript-related requests
  - [ ] Verify mcp-expert triggers on MCP-related requests
  - [ ] Verify task-decomposition-expert triggers on workflow requests

- [ ] Test verification protocol
  - [ ] Trigger ref searches for technical questions
  - [ ] Verify source citations are included
  - [ ] Check confidence scores are present
  - [ ] Test fallback chains (simulate unavailable tools)

- [ ] Test hooks
  - [ ] PreToolUse: Test path traversal detection
  - [ ] PreToolUse: Test sensitive file detection
  - [ ] PostToolUse: Test code formatting
  - [ ] Verify proper JSON output

- [ ] Test agent-doctor
  - [ ] Evaluate all four generated agents
  - [ ] Verify scoring accuracy
  - [ ] Check improvement recommendations are actionable

- [ ] Document workflow
  - [ ] Create quick-start guide
  - [ ] Document how to create new expert agents
  - [ ] Document troubleshooting steps

**Deliverable**: Fully tested and documented expert agent system
**Dependencies**: Phases 1-7 (all components must be complete)
**Estimated Components**: Documentation files, test verification report

---

### References

- [How I Turned Claude Code Into a War Machine (Part 1)](docs/prompts/0004/medium.com_70638b9e_20260109_164107.pdf)
- [How I Turned Claude Code Into a War Machine (Part 2)](docs/prompts/0004/medium.com_9fd0bb66_20260109_164142.pdf)
- [Claude Code SDK Overview](https://docs.claude.com/en/docs/claude-code/sdk/sdk-overview)
- [Hook Development for Claude Code Plugins](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/hook-development/SKILL.md)

---

For docs/prompts/0004/global_settings.json, we need to enhance it in the following way:

### Fix invalid JSON schema

We used an invalid JSON schema before for file docs/prompts/0004/global_settings.json. Despite I fixed it now, but there are still some issues with the schema. We need to fix them as well.

### Permissions

- In 'permissions.allow' we will add all relevant reading operation(for example bisect, diff, grep, log, show, status) for `git` and `gh` tools in it.
- In 'permissions.ask' we will add all writing relevant operation(for example clone, init, add, mv, restore, rm, backfill, branch, commit, merge, rebase, reset, switch, tag, fetch, pull, push
  ) for `git` and `gh` tools in it.
- In 'permissions.deny' we will add all risky operations(for example rm, rmdir, diskutil and etc) tools in it.

Above is just an example, you can need to add more permissions based on the industry best practices and security guidelines.

### Hooks

Instead of using prompt based solution( that will caused performance issues with multiple round communication with LLM), we need to use local tools or scripts to handle these operations.

For hook `PreToolUse`, we need to develop a bash script that will check the permissions and execute the tool accordingly. <-- **YOU need to** compare this new proposal with the original prompt solution for their pros and cons then figure out which one is better. This also need to work with the `permissions` section to ensure a easy and safe way to develop and use the tools.

For hook `PostToolUse`, we need to implement file type based linting and auto-formatting tools to ensure code quality and consistency. I already added the configuration for `js,ts,jsx,tsx,json`. You at least need to figure out the solutions for the following file types with the industry best practices:

- python: I am more prefer `ruff` and `ty`(or `black`?) than `flake8` and `mypy` for performance and accuracy reasons.
- golang: I am more prefer `golangci-lint` and `gofumpt` than `gofmt` and `goimports` for performance and accuracy reasons.
- rust
- markdown
- yaml
- sql
- html
- css

You need to figure out the proper tools for these I donot provided. Rust based new tools > traditional tools.

### Installation command lines via `brew`

Based on the content of @docs/prompts/0004/global_CLAUDE.md and this revised @docs/prompts/0004/global_settings.json, we need to provide a command list to install and ensure all necessary tools are installed.
