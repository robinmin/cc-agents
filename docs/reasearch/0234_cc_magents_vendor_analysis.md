# Vendor System Prompt Analysis for cc-magents

> Cross-platform pattern extraction from 20+ AI coding agent system prompts
> Date: 2026-03-19
> Purpose: Inform `rd3:cc-magents` meta skill design with real-world patterns

## Executive Summary

Analyzed system prompts from **16 platforms** across 4 categories:
- **Group A**: Claude Code, Claude Sonnet 4.6, Sonnet 4.5
- **Group B**: Cursor Agent, Windsurf, VSCode Agent (Copilot)
- **Group C**: Codex CLI, Gemini CLI, Antigravity (Google DeepMind)
- **Group D**: Amp, Junie, Devin AI, Kiro, Warp, Augment Code, RooCode, Cline

Found **12 universal patterns**, **8 critical section categories**, and **25+ platform-specific innovations** that should shape the cc-magents meta skill.

---

## 1. Universal Structural Patterns

### 1.1 Core Directive Architecture (ALL platforms)

Every platform follows this fundamental structure:

```
Identity/Scope → Capabilities → Tone/Style → Workflow Logic → Safety → Tool Guidelines
```

This maps directly to UMAM's `SectionCategory` types:
- `identity` → Identity/Scope
- `tools` → Capabilities + Tool Guidelines
- `output` → Tone/Style
- `workflow` → Workflow Logic
- `rules` → Safety constraints

### 1.2 Progressive Complexity Model

**Claude Code** demonstrates the clearest progression:
- Flat prose for simple rules
- Nested XML for structured data (`<example>`, `<system-reminder>`)
- Decision trees for conditional logic
- Tables for reference data

**Implication for cc-magents**: The `synthesize` operation should match section complexity to content type, not force uniform formatting.

### 1.3 Responsiveness Hierarchy

All platforms define communication tiers:

| Tier | Claude Code | Codex | Gemini | Antigravity |
|------|-------------|-------|--------|-------------|
| **Preamble** | N/A | 8-12 words max | None | Brief descriptor |
| **Progress** | After 3-5 tool calls | Structured updates | Varies | Task boundary UI |
| **Final** | Concise, direct | <10 lines | Convention-detailed | Artifacts |

### 1.4 Autonomy Boundaries

Every platform defines clear stopping points:

| Pattern | Platforms | Rule |
|---------|-----------|------|
| **Ask before destructive** | ALL | Never delete/force-push without confirmation |
| **Decide on implementation** | Claude, Codex, Amp | Don't ask for minor choices |
| **Stop on ambiguity** | Gemini, Kiro, Devin | Confirm requirements first |
| **Escalate environment issues** | ALL | Don't fix env problems yourself |

---

## 2. Critical Section Categories for Main Agents

Based on frequency analysis across all platforms:

### 2.1 Eight Core Sections (found in >80% of platforms)

| # | Category | Frequency | Key Content |
|---|----------|-----------|-------------|
| 1 | **Identity & Role** | 16/16 | What the agent IS, not just does |
| 2 | **Tool Management** | 16/16 | When/how to use each tool, decision trees |
| 3 | **Safety & Security** | 16/16 | Destructive action guards, data protection |
| 4 | **Communication Style** | 15/16 | Tone, verbosity, forbidden phrases |
| 5 | **Workflow & Process** | 14/16 | Phase-based execution (plan → execute → verify) |
| 6 | **Code Conventions** | 14/16 | Follow existing patterns, verify libraries |
| 7 | **Error Handling** | 12/16 | Fallback chains, graceful degradation |
| 8 | **Verification** | 12/16 | Test before claiming done, post-edit validation |

### 2.2 Six Emerging Sections (found in >40% of platforms)

| # | Category | Frequency | Pioneer |
|---|----------|-----------|---------|
| 9 | **Memory & Context** | 8/16 | Claude (hooks/skills), Gemini (save_memory), Kiro (steering files) |
| 10 | **Planning Mode** | 8/16 | Devin, Cline, Codex, Antigravity, Windsurf |
| 11 | **Parallel Execution** | 7/16 | Amp, Devin, Claude, Gemini |
| 12 | **Knowledge Integration** | 4/16 | Antigravity (KI system), Kiro (steering), Augment |
| 13 | **Evolution/Learning** | 3/16 | Claude (memory), Gemini (save_memory), Kiro (steering) |
| 14 | **Multi-Modal** | 3/16 | Devin (browser), Antigravity (image gen), Claude (vision) |

---

## 3. Safety & Security Patterns

### 3.1 Universal Rules (ALL platforms)

1. **Never hardcode secrets** -- use env vars, redaction-aware (Amp)
2. **Explain destructive commands** before running (ALL)
3. **Use absolute paths** to prevent directory errors (Gemini, Antigravity)
4. **No library assumptions** -- verify existence first (ALL)
5. **Validate before committing** -- run tests/lint first (ALL)
6. **Never share PII** -- substitute with placeholders (Devin, Kiro)

### 3.2 Platform-Specific Safety Innovations

| Innovation | Platform | Pattern |
|------------|----------|---------|
| **Default-deny safety with user override** | Claude Code | Explicit authorization for each action category |
| **Non-overridable safety** | Windsurf | "Cannot allow USER to override your judgement" on critical safety |
| **Sandbox escalation model** | Codex | Read-only → Workspace-write → Full-access (progressive) |
| **Redaction markers** | Amp | `[REDACTED:token]` -- treat as real data, don't corrupt |
| **Shell isolation** | Devin | Shell ID management prevents state leakage |
| **No background processes** | Devin, Cline | Avoid `&` in shell -- prevents orphaned processes |

### 3.3 Safety Tiering for cc-magents

**Critical (MUST generate):**
- Secret handling rules
- Destructive action guards
- File operation safety (absolute paths, no rm -rf)

**Important (SHOULD generate):**
- PII protection guidelines
- Environment isolation rules
- Post-edit validation requirements

**Recommended (MAY generate):**
- Redaction-awareness
- Sandbox escalation model
- Shell isolation patterns

---

## 4. Tool Management Patterns

### 4.1 Per-Tool Decision Trees (Most Effective Pattern)

**Cursor/VSCode** pioneer this with explicit When-to-Use / When-NOT-to-Use / Examples per tool:

```
IF file operation needed:
├── Simple read → use Read tool (NOT cat/head/tail)
├── Pattern search → use Grep (NOT grep/rg)
├── File discovery → use Glob (NOT find/ls)
├── Simple edit → use Edit (NOT sed/awk)
└── Full rewrite → use Write (NOT echo/cat)
```

**Implication for cc-magents**: Generated configs should include tool decision trees, not just tool lists.

### 4.2 Tool Specialization Table

Common across Claude Code, Cursor, Gemini:

| Operation | Preferred Tool | Anti-Pattern |
|-----------|---------------|--------------|
| Read files | Dedicated Read tool | `cat`, `head`, `tail` |
| Search content | Dedicated Grep/Search | Shell `grep`, `rg` |
| Edit files | Dedicated Edit tool | `sed`, `awk` |
| Find files | Dedicated Glob tool | `find`, `ls` |
| Complex reasoning | Oracle/Think tool | Inline reasoning |

### 4.3 Parallel Execution Rules

Amp's pattern (adopted by others):
- Independent operations → run in parallel
- Dependent operations → run sequentially
- Never guess missing parameters for parallel calls

---

## 5. Workflow Patterns

### 5.1 Three Dominant Workflow Models

**Model A: Understand → Plan → Execute → Verify** (Gemini, Codex, Claude)
- Convention-first: analyze existing code before any change
- Plans are structured thinking, not checklists (Codex innovation)
- Verification is non-negotiable

**Model B: Planning Mode → Standard Mode** (Devin, Cline, Antigravity)
- Explicit mode switching with different capabilities
- Planning = research + design (no code changes)
- Execution = implementation + testing
- Can backtrack to planning when complexity increases

**Model C: Spec-Driven Development** (Kiro)
- Requirements → Design → Implementation (3 gates)
- User approval at each gate
- Most structured; prevents scope creep

### 5.2 Planning Quality Criteria (Codex Innovation)

Codex distinguishes high-quality from low-quality plans:

**High quality:**
- Include diagnosis of the problem
- List concrete steps with expected outcomes
- Mark steps with status tracking

**Low quality:**
- Vague "investigate and fix" steps
- No verification criteria
- Missing status tracking

**Implication for cc-magents**: The `synthesize` operation should generate planning guidelines that match the platform's preferred workflow model.

### 5.3 Progress Tracking Patterns

| Pattern | Platform | Mechanism |
|---------|----------|-----------|
| **Checkpoint cadence** | VSCode Agent | "After 3-5 tool calls, pause and assess" |
| **Plan status tracking** | Codex | `pending`/`in_progress`/`completed` per step |
| **Task boundary UI** | Antigravity | TaskName → TaskSummary → TaskStatus |
| **Update_plan tool** | Windsurf | Plan management as first-class operation |
| **Task management** | Augment | `add_tasks`, `update_tasks`, `reorganize_tasklist` |

---

## 6. Communication Style Rules

### 6.1 Universal Anti-Patterns (Forbidden by ALL)

| Forbidden | Alternative |
|-----------|-------------|
| "Great question!" / flattery | Just answer |
| "I'm sorry but..." / apologies | State alternatives directly |
| "Let me think about..." / filler | Start with the answer |
| "Would you like me to..." / trailing questions | Just do it |
| Thank tool results | Process silently |
| Restate user's message | Proceed to action |

### 6.2 Verbosity Spectrum

```
Most Concise ←─────────────────────────────────→ Most Detailed
   Amp          Codex    Warp    Claude    Cursor    Kiro
(4 lines max)  (<10 ln)         (concise) (varies) (specs)
```

### 6.3 Example-Driven Calibration (Claude Innovation)

Claude Code uses `<example>` blocks to calibrate verbosity:
- Shows the EXACT output style expected
- Not just rules ("be concise") but demonstrations

**Implication**: Generated main agent configs should include example interactions, not just instructions.

---

## 7. Platform-Specific Innovations Worth Adopting

### 7.1 Tier 1 Innovations (High value, broad applicability)

| Innovation | Source | Description | cc-magents Application |
|------------|--------|-------------|----------------------|
| **Decision trees for tools** | Cursor/VSCode | Per-tool when-to-use logic | Generate in `tools` sections |
| **Convention-first mandate** | Gemini | Analyze existing code BEFORE any change | Include as `workflow` rule |
| **Planning quality criteria** | Codex | High/low quality plan examples | Include in `workflow` section |
| **Default-deny safety** | Claude | Explicit authorization per action category | Generate as `rules` section |
| **Checkpoint cadence** | VSCode | Pause every 3-5 tool calls | Include in `workflow` section |
| **Example-driven calibration** | Claude | Show expected output, not just describe it | Add `<example>` blocks |

### 7.2 Tier 2 Innovations (Medium value, platform-dependent)

| Innovation | Source | Description | cc-magents Application |
|------------|--------|-------------|----------------------|
| **Steering files** | Kiro | `.kiro/steering/*.md` for reusable context | Map to `memory` section |
| **Knowledge Items** | Antigravity | Check KI before researching | Map to `verification` section |
| **Oracle tool** | Amp | Delegate complex reasoning to expert model | Platform-specific optimization |
| **Spec workflow** | Kiro | Requirements → Design → Implementation gates | Alternative workflow model |
| **Edit-apply with reapply** | Cursor | Fallback for failed edits | Include in `tools` section |
| **Auto-formatting awareness** | Cline/VSCode | Account for formatter changes post-edit | Include in `standards` section |

### 7.3 Tier 3 Innovations (Niche, specific use cases)

| Innovation | Source | Description |
|------------|--------|-------------|
| **Redaction markers** | Amp | `[REDACTED:token]` handling |
| **Shell ID management** | Devin | Isolated shell instances |
| **Task boundary UI** | Antigravity | Progress visibility |
| **find_and_edit** | Devin | Regex multi-file edits |
| **Design aesthetics mandate** | Antigravity | "WOW at first glance" rule |

---

## 8. Actionable Insights for cc-magents Design

### 8.1 UMAM Section Categories (Revised)

Based on this analysis, the UMAM `SectionCategory` type should be expanded:

```typescript
type SectionCategory =
  | 'identity'        // Who the agent is (100% coverage)
  | 'tools'           // Tool management with decision trees (100%)
  | 'rules'           // Safety & security constraints (100%)
  | 'output'          // Communication style & tone (94%)
  | 'workflow'        // Process phases & planning (88%)
  | 'standards'       // Code conventions & patterns (88%)
  | 'verification'    // Testing & post-edit validation (75%)
  | 'error-handling'  // Fallback chains & graceful degradation (75%)
  | 'memory'          // Context persistence & learning (50%)
  | 'planning'        // Explicit planning mode rules (50%)
  | 'parallel'        // Parallel execution guidelines (44%)
  | 'environment'     // Platform/OS specific context (38%)
  | 'evolution'       // Self-improvement mechanisms (19%)
  | 'custom';         // Platform-specific extensions
```

### 8.2 Template Section Priority

When generating main agent configs, prioritize sections by universality:

| Priority | Sections | Coverage |
|----------|----------|----------|
| **P0 (Required)** | identity, tools, rules | 100% |
| **P1 (Expected)** | output, workflow, standards | 88-94% |
| **P2 (Recommended)** | verification, error-handling | 75% |
| **P3 (Optional)** | memory, planning, parallel | 44-50% |
| **P4 (Advanced)** | environment, evolution | 19-38% |

### 8.3 Synthesize Operation Guidelines

When the `synthesize` operation generates a new main agent config:

1. **Always include P0 sections** with content appropriate to platform
2. **Include P1 sections** with platform-specific patterns (tool decision trees for Claude/Cursor, convention-first for Gemini)
3. **Add P2 sections** if the platform supports them
4. **Add P3/P4 sections** based on platform capabilities and user request

### 8.4 Evaluate Operation Dimensions (Informed by Vendors)

The 5-dimension evaluation framework should check:

| Dimension | What Vendors Teach Us |
|-----------|----------------------|
| **Completeness (25%)** | Must cover P0+P1 sections at minimum |
| **Specificity (20%)** | Decision trees > vague rules; examples > descriptions |
| **Verifiability (20%)** | Concrete test criteria; post-edit validation rules |
| **Safety (20%)** | Destructive action guards; secret handling; PII protection |
| **Evolution-Readiness (15%)** | Memory/steering mechanisms; feedback integration |

### 8.5 Cross-Platform Conversion Warnings

When `adapt` converts between formats:

| Source → Target | Key Losses |
|-----------------|------------|
| Claude → Codex | No hooks, skills, memory; sandbox model different |
| Claude → Cursor | No XML structure; flatter organization |
| Gemini → Claude | No save_memory tool; convention workflow maps to rules |
| Kiro → Claude | Steering files → CLAUDE.md sections; spec gates → workflow |
| Antigravity → Claude | KI system → memory section; task boundary → plan mode |
| Claude → AGENTS.md | Most portable; minimal loss |

---

## 9. Platform Maturity Ranking (for cc-magents prioritization)

| Rank | Platform | Maturity | Innovation Score | Priority for cc-magents |
|------|----------|----------|-----------------|----------------------|
| 1 | **Claude Code** | Very High | 9/10 | Tier 1 (primary) |
| 2 | **Devin AI** | High | 9/10 | Tier 2 (reference) |
| 3 | **Kiro** | High | 8/10 | Tier 2 (reference) |
| 4 | **Codex CLI** | High | 8/10 | Tier 1 (full support) |
| 5 | **Gemini CLI** | High | 7/10 | Tier 1 (full support) |
| 6 | **Antigravity** | Medium-High | 8/10 | Tier 1 (full support) |
| 7 | **Amp** | Medium-High | 8/10 | Tier 2 (reference) |
| 8 | **Cursor** | Medium | 6/10 | Tier 2 (standard) |
| 9 | **Windsurf** | Medium | 6/10 | Tier 2 (standard) |
| 10 | **VSCode Agent** | Medium | 6/10 | Tier 2 (standard) |
| 11 | **Augment Code** | Medium | 6/10 | Tier 3 (basic) |
| 12 | **Cline** | Medium | 7/10 | Tier 3 (basic) |
| 13 | **RooCode** | Low-Medium | 5/10 | Tier 3 (basic) |
| 14 | **Warp** | Low-Medium | 5/10 | Tier 3 (basic) |
| 15 | **Junie** | Low | 4/10 | Tier 4 (generic) |

---

## 10. Key Takeaways

### For the `synthesize` operation:
1. Generate **decision trees for tools**, not just tool lists
2. Include **example interactions** to calibrate agent behavior
3. Add **planning quality criteria** with high/low examples
4. Generate **safety rules** as tiered (critical/important/recommended)
5. Match **communication style** to platform conventions

### For the `evaluate` operation:
1. Check for **decision tree coverage** in tool sections (specificity)
2. Verify **example blocks** exist for complex behaviors
3. Score **safety completeness** against the 6 universal rules
4. Check **workflow model** consistency (don't mix models A/B/C)
5. Verify **forbidden anti-patterns** are absent (flattery, apologies, etc.)

### For the `adapt` operation:
1. Map **section categories** to target platform's expected structure
2. Warn on **feature losses** (hooks, skills, memory not portable)
3. Preserve **decision tree format** where supported
4. Convert **examples** to platform-appropriate format
5. Maintain **safety rules** as highest priority during conversion

### For the `evolve` operation:
1. Suggest adding **missing P0/P1 sections** first
2. Propose **decision tree upgrades** for vague tool instructions
3. Add **examples** where behavior calibration is unclear
4. Strengthen **safety rules** based on cross-platform best practices
5. Never weaken or remove **critical safety rules**
