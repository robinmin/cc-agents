# Evaluation Framework for Main Agent Configurations

This document describes the 5-dimension MECE evaluation framework used by `rd3:cc-magents` to assess the quality of main agent configuration files (AGENTS.md, CLAUDE.md, GEMINI.md, .cursorrules, etc.).

## Overview

The evaluation framework scores configurations across 5 mutually exclusive, collectively exhaustive dimensions, each weighted according to a profile:

| Dimension | Weight (standard) | What It Measures |
|-----------|-------------------|------------------|
| **Coverage** | 25% | Are all core concerns present and substantive? |
| **Operability** | 25% | Can the agent reliably choose tools, execute steps, and format outputs? |
| **Grounding** | 20% | Does the config require evidence, verification, and uncertainty handling? |
| **Safety** | 20% | Are CRITICAL rules, destructive action guards, and permissions defined? |
| **Maintainability** | 10% | Can the config be updated safely through memory, feedback, steering, and versioning? |

**Pass Threshold**: 75% overall score

---

## Dimension Details

### 1. Coverage (25%)

**What it checks:**
- All expected sections are present (identity, tools, rules, output, workflow, standards, verification, error-handling)
- Sections have substantive content (not just headings with empty bodies)
- Platform-specific required sections are present
- Coverage does not double-count memory/evolution concerns owned by Maintainability

**Scoring criteria:**
- 100%: All expected categories present with substantive content
- 75%: All P0+P1 categories present
- 50%: Majority of P0 categories present
- 25%: Only few categories present
- 0%: Critical sections missing

**Expected categories by priority:**

| Priority | Categories |
|----------|------------|
| P0 (Required) | identity, tools, rules |
| P1 (Expected) | output, workflow, standards |
| P2 (Recommended) | verification, error-handling |
| P3 (Optional) | memory, planning, parallel |
| P4 (Advanced) | environment, evolution |

---

### 2. Operability (25%)

**What it checks:**
- Decision trees for tool usage (When-to-Use / When-NOT-to-Use patterns)
- Example blocks and executable command snippets
- Version numbers, concrete thresholds, specific tool names
- Output contracts and success criteria
- Stepwise workflow guidance

**Scoring criteria:**
- 100%: Tool-routing + executable examples + output contract + workflow guidance
- 75%: Strong routing and examples, with some output/workflow structure
- 50%: Some examples or commands, but incomplete operational guidance
- 25%: Minimal actionability
- 0%: Generic statements with no concrete details

**Key indicators (from vendor analysis):**
- `When-to-Use:` / `When-NOT-to-Use:` patterns
- `<example>` blocks
- Tool decision trees (e.g., "use Read tool, NOT cat/head/tail")
- Version numbers (`TypeScript 5.0+`, `Node 18+`)
- Concrete thresholds (`max 100 lines`, `timeout: 30s`)

---

### 3. Grounding (20%)

**What it checks:**
- Source or evidence requirements for external information
- Confidence and uncertainty signaling
- Verification criteria before claiming completion
- Fallback and escalation rules when evidence is missing

**Scoring criteria:**
- 100%: Evidence + verification + uncertainty handling + fallback rules
- 75%: Strong verification and evidence requirements
- 50%: Basic verification rules
- 25%: Minimal grounding guidance
- 0%: No verification guidance

**Key indicators:**
- Explicit "verify before claiming" rules
- Confidence scoring phrases (`high confidence`, `low confidence`)
- Citation requirements (`cite source`)
- Self-verification loops
- "If unsure" fallback / escalation instructions

---

### 4. Safety (20%)

**What it checks:**
- CRITICAL markers for non-negotiable rules
- Destructive action guards (git reset, rm -rf, force push)
- Secret handling (env vars, redaction awareness)
- PII protection guidelines
- Permission boundaries

**Scoring criteria:**
- 100%: All critical safety + permission rules
- 75%: CRITICAL markers + destructive guards
- 50%: Basic safety rules
- 25%: Minimal safety
- 0%: No safety guidance

**Tiered safety rules (from vendor analysis):**

| Tier | Required | Examples |
|------|----------|----------|
| Critical | Must have | Secret handling, destructive action guards |
| Important | Should have | PII protection, env isolation |
| Recommended | Nice to have | Redaction awareness, sandbox model |

---

### 5. Maintainability (10%)

**What it checks:**
- Memory sections or context persistence
- Feedback mechanisms
- Steering file patterns (`.kiro/`, `.agent/`)
- Version history, changelog, or effective-date guidance

**Scoring criteria:**
- 100%: Memory + feedback + steering + change tracking
- 75%: Strong memory and improvement mechanisms
- 50%: Basic maintainability patterns
- 25%: Minimal maintainability support
- 0%: No evolution mechanisms

---

## Weight Profiles

### Standard (default)

Balanced weights for general-purpose configs:
- Coverage: 25%
- Operability: 25%
- Grounding: 20%
- Safety: 20%
- Maintainability: 10%

### Minimal

Higher weight on coverage and safety for simple configs:
- Coverage: 30%
- Operability: 20%
- Grounding: 15%
- Safety: 30%
- Maintainability: 5%

### Advanced

Higher weight on maintainability and grounding for self-evolving configs:
- Coverage: 20%
- Operability: 20%
- Grounding: 25%
- Safety: 15%
- Maintainability: 20%

---

## Grade Thresholds

| Grade | Score Range | Description |
|-------|-------------|-------------|
| A | 90-100% | Excellent - production-ready with all best practices |
| B | 80-89% | Good - solid configuration with minor improvements possible |
| C | 70-79% | Satisfactory - meets basic requirements, some gaps |
| D | 60-69% | Needs work - significant gaps in coverage or quality |
| F | <60% | Unsatisfactory - critical issues must be addressed |

**Pass threshold**: 75% (grade C or higher)

---

## Output Format

The evaluation produces a `MagentEvaluationReport`:

```typescript
interface MagentEvaluationReport {
    overallScore: number;       // Weighted aggregate (0-100)
    grade: Grade;               // A, B, C, D, or F
    passed: boolean;            // true if overallScore >= 75
    dimensions: DimensionScore[];
    platform: MagentPlatform;
    profile: MagentWeightProfile;
    sectionBreakdown: Record<string, {
        categories: SectionCategory[];
        tokens: number;
        issues: string[];
    }>;
    recommendations: string[];  // Suggestions for improvement
    timestamp: string;
}
```

---

## CLI Usage

```bash
# Evaluate with default (standard) profile
bun evaluate.ts AGENTS.md

# Evaluate with minimal profile (higher safety focus)
bun evaluate.ts .claude/CLAUDE.md --profile minimal

# Output as JSON
bun evaluate.ts AGENTS.md --json

# Verbose output with details
bun evaluate.ts AGENTS.md --verbose

# Write results to file
bun evaluate.ts AGENTS.md --output evaluation-report.json
```

---

## Integration with Other Operations

The evaluation framework integrates with:

- **validate** (Phase 1): Structural validation must pass before quality evaluation
- **synthesize** (Phase 3): Evaluation used to score generated configs
- **refine** (Phase 3): Evaluation identifies quality gaps for improvement
- **evolve** (Phase 5): Evaluation tracks quality over time

---

## Vendor Analysis Insights

This framework incorporates patterns from 16+ production AI coding agent system prompts:

1. **Decision trees for operability** - All mature platforms (Claude, Cursor, Gemini, Codex) use explicit When-to-Use/When-NOT-to-Use patterns
2. **Example blocks** - Claude and Codex use `<example>` blocks to calibrate behavior more effectively than prose
3. **Tiered safety** - Safety rules are universal but prioritized differently by platform
4. **Communication anti-patterns** - All platforms forbid flattery, apologies, filler phrases
5. **Three workflow models** - Configs should be consistent within one model (Understand→Plan→Execute, Planning/Standard modes, or Spec-driven)

---

## References

- Task 0234: `docs/tasks/0234_create_meta_skill_cc-magents.md`
- Vendor Analysis: `docs/reasearch/0234_cc_magents_vendor_analysis.md`
- Types: `scripts/types.ts`
- Config: `scripts/evaluation.config.ts`
- Evaluator: `scripts/evaluate.ts`
