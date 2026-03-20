# Evaluation Framework for Main Agent Configurations

This document describes the 5-dimension evaluation framework used by `rd3:cc-magents` to assess the quality of main agent configuration files (AGENTS.md, CLAUDE.md, GEMINI.md, .cursorrules, etc.).

## Overview

The evaluation framework scores configurations across 5 dimensions, each weighted according to a profile:

| Dimension | Weight (standard) | What It Measures |
|-----------|-------------------|------------------|
| **Completeness** | 25% | Are all necessary sections present and substantive? |
| **Specificity** | 20% | Are rules concrete with examples, decision trees, version numbers? |
| **Verifiability** | 20% | Are there anti-hallucination rules and source citations? |
| **Safety** | 20% | Are CRITICAL rules, destructive action guards, and permissions defined? |
| **Evolution-Readiness** | 15% | Are memory architecture and feedback mechanisms present? |

**Pass Threshold**: 75% overall score

---

## Dimension Details

### 1. Completeness (25%)

**What it checks:**
- All expected sections are present (identity, tools, rules, output, workflow, standards, verification, error-handling)
- Sections have substantive content (not just headings with empty bodies)
- Platform-specific required sections are present

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

### 2. Specificity (20%)

**What it checks:**
- Decision trees for tool usage (When-to-Use / When-NOT-to-Use patterns)
- Example blocks demonstrating expected behavior
- Version numbers, concrete thresholds, specific tool names
- Tables for reference data

**Scoring criteria:**
- 100%: Decision trees + examples + version specificity
- 75%: Decision trees + examples
- 50%: Examples only or vague guidelines
- 25%: Minimal specificity
- 0%: Generic statements with no concrete details

**Key indicators (from vendor analysis):**
- `When-to-Use:` / `When-NOT-to-Use:` patterns
- `<example>` blocks
- Tool decision trees (e.g., "use Read tool, NOT cat/head/tail")
- Version numbers (`TypeScript 5.0+`, `Node 18+`)
- Concrete thresholds (`max 100 lines`, `timeout: 30s`)

---

### 3. Verifiability (20%)

**What it checks:**
- Anti-hallucination protocol rules
- Confidence scoring patterns
- Source citations for external information
- Verification criteria before claiming completion

**Scoring criteria:**
- 100%: All verification mechanisms present
- 75%: Anti-hallucination + confidence scoring
- 50%: Basic verification rules
- 25%: Minimal verification
- 0%: No verification guidance

**Key indicators:**
- Explicit "verify before claiming" rules
- Confidence scoring phrases (`high confidence`, `low confidence`)
- Citation requirements (`cite source`)
- Self-verification loops

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

### 5. Evolution-Readiness (15%)

**What it checks:**
- Memory sections or context persistence
- Feedback mechanisms
- Steering file patterns (`.kiro/`, `.agent/`)
- Version history or changelog guidance

**Scoring criteria:**
- 100%: Full memory + feedback + steering
- 75%: Memory + feedback mechanisms
- 50%: Basic memory patterns
- 25%: Minimal evolution support
- 0%: No evolution mechanisms

---

## Weight Profiles

### Standard (default)

Balanced weights for general-purpose configs:
- Completeness: 25%
- Specificity: 20%
- Verifiability: 20%
- Safety: 20%
- Evolution-Readiness: 15%

### Minimal

Higher weight on completeness and safety for simple configs:
- Completeness: 30%
- Specificity: 20%
- Verifiability: 15%
- Safety: 30%
- Evolution-Readiness: 5%

### Advanced

Higher weight on evolution and verifiability for self-evolving configs:
- Completeness: 20%
- Specificity: 15%
- Verifiability: 25%
- Safety: 15%
- Evolution-Readiness: 25%

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

1. **Decision trees for specificity** - All mature platforms (Claude, Cursor, Gemini, Codex) use explicit When-to-Use/When-NOT-to-Use patterns
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
