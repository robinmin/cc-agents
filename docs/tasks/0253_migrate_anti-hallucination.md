---
name: migrate anti-hallucination
description:
status: WIP
created_at: 2026-03-23T00:12:09.317Z
updated_at: 2026-03-23T02:19:14.455Z
folder: docs/tasks
type: task
impl_progress:
  planning: done
  design: done
  implementation: pending
  review: pending
  testing: pending
---

## 0253. migrate anti-hallucination

### Background

As we are migrating from plugin rd2 to plugin rd3, we need to migrate the anti-hallucination protocol skill. This involves:

1. **Migrating the skill structure**: The existing `plugins/rd2/skills/anti-hallucination/` skill needs to be recreated at `plugins/rd3/skills/anti-hallucination/` following the rd3 format with proper YAML frontmatter and metadata.

2. **Converting ah_guard.py to TypeScript**: The Python guard script (`plugins/rd2/skills/anti-hallucination/scripts/ah_guard.py`) that enforces the anti-hallucination protocol on Stop hooks must be converted to TypeScript (`ah_guard.ts`) for consistency with the Bun.js toolchain.

3. **Enhancing with SOTA techniques**: The existing research foundation (CoVe, HaluEval 2.0, UQLM) should be supplemented with newer techniques from 2024-2025 research including Self-Consistency, RAG-based grounding, and multi-agent verification patterns.

4. **Updating references**: The skill references need to be updated with newer sources and the tool selection guide should reflect current MCP tool capabilities.


### Requirements

1. **Skill Migration**
   - Create `plugins/rd3/skills/anti-hallucination/` directory following rd3 structure
   - Add proper YAML frontmatter with `name`, `description`, `license`, `metadata` (author, version, platforms)
   - Migrate all markdown content from rd2 SKILL.md to rd3 format
   - Include ADK interaction patterns in frontmatter

2. **Script Conversion**
   - Convert `ah_guard.py` (277 lines) to TypeScript `ah_guard.ts`
   - Use Bun.js runtime with proper TypeScript types
   - Maintain all existing verification patterns (source citations, confidence levels, tool usage evidence, red flags)
   - Add proper error handling and exit codes

3. **Reference Enhancement**
   - Update research foundation with newer SOTA techniques
   - Add sources from 2024-2025 research (Counterfactual Probing, FactCheckMate, Comprehensive Survey 2025)
   - Keep existing references that remain valid

4. **Hooks Configuration**
   - Create rd3-compatible hooks configuration for the anti-hallucination guard
   - Support Stop hook integration similar to existing rd2 configuration


### Q&A

**Q: Should the TypeScript guard script be a standalone executable or integrated into a larger guard framework?**
A: The TypeScript guard should be a standalone executable (`ah_guard.ts`) following the same pattern as `rd2_guard.sh` but in TypeScript. This keeps it modular and allows reuse across different guard scenarios.

**Q: How do we handle the MCP tool integration in the TypeScript guard?**
A: The guard script operates on message text analysis, not direct MCP tool calls. MCP tools are used by agents before generating responses. The guard verifies that evidence of tool usage appears in the response text.

**Q: What about backward compatibility with rd2?**
A: The migration should create a new rd3 skill. The rd2 skill can remain in place for projects still using rd2. This is a parallel migration, not an in-place replacement.


### Design

#### Architecture Overview

```
plugins/rd3/skills/anti-hallucination/
├── SKILL.md                    # Single source of truth with YAML frontmatter
├── scripts/
│   └── ah_guard.ts            # TypeScript guard script (converted from Python)
└── tests/
    └── ah_guard.test.ts       # Unit tests for guard script
├── references/
│   ├── anti-hallucination-research.md   # Updated research foundation
│   ├── prompt-patterns.md                 # Verification prompt patterns
│   ├── tool-usage-guide.md                # MCP tool usage guide
│   └── guard-implementation.md           # Guard hook integration guide
└── agents/
    └── openai.yaml                         # Platform companion (auto-generated)
```

#### Guard Script Design (TypeScript)

```typescript
// Core verification functions
interface VerificationResult {
  ok: boolean;
  reason: string;
  issues?: string[];
}

// Main verification categories
- Source Citations: Regex patterns for [Source:], Source:, URLs, etc.
- Confidence Levels: HIGH/MEDIUM/LOW detection
- Tool Usage Evidence: ref_search_documentation, searchCode, WebSearch, etc.
- Red Flags: "I think", "I believe", "Probably", etc.

Exit codes:
  0 - Allow (protocol followed)
  1 - Deny with issues (protocol not followed, issues listed)
```

#### Key Migration Changes from rd2

| rd2 Aspect | rd3 Migration |
|------------|---------------|
| Python guard script | TypeScript guard script (ah_guard.ts) |
| Basic SKILL.md | SKILL.md with YAML frontmatter + metadata |
| Static tool patterns | Dynamic patterns with MCP tool support |
| Simple references | Enhanced with 2024-2025 sources |
| No ADK patterns | ADK interaction patterns (reviewer, pipeline) |


### Solution

#### Phase 1: Skill Structure Migration

1. Create `plugins/rd3/skills/anti-hallucination/` directory
2. Add YAML frontmatter to SKILL.md:
```yaml
---
name: anti-hallucination
description: Zero-trust verification-before-generation with MCP tool priority. Use for ANY task requiring external information (APIs, libraries, frameworks, facts, recent events).
license: Apache-2.0
metadata:
  author: cc-agents
  version: 3.0.0
  platforms: claude-code,codex,antigravity,opencode,openclaw
  interactions:
    - reviewer
    - pipeline
---
```
3. Migrate content from rd2 SKILL.md, updating for rd3 conventions

#### Phase 2: Guard Script Conversion

Convert `ah_guard.py` to `ah_guard.ts`:

```typescript
#!/usr/bin/env bun

interface VerificationResult {
  ok: boolean;
  reason: string;
  issues?: string[];
}

// Verification patterns (migrated from Python)
const SOURCE_PATTERNS = [
  /\[Source:\s*[^\]]+\]/gi,
  /Source:\s*\[?[^\n]+\]?/gi,
  // ... more patterns
];

const CONFIDENCE_PATTERNS = [
  /Confidence:\s*(HIGH|MEDIUM|LOW)/gi,
  // ... more patterns
];

// Core verification functions
export function hasSourceCitations(text: string): boolean { ... }
export function hasConfidenceLevel(text: string): boolean { ... }
export function hasToolUsageEvidence(text: string): boolean { ... }
export function hasRedFlags(text: string): string[] { ... }
export function requiresExternalVerification(text: string): boolean { ... }
export function verifyAntiHallucinationProtocol(text: string): VerificationResult { ... }

// CLI entry point
const result = verifyAntiHallucinationProtocol(content);
console.log(JSON.stringify(result));
process.exit(result.ok ? 0 : 1);
```

#### Phase 3: Reference Enhancement

Update `references/anti-hallucination-research.md` to include:
- **New 2024-2025 sources**: Counterfactual Probing (Aug 2025), FactCheckMate (Oct 2024), Comprehensive Survey 2025 (Oct 2025)
- **SOTA techniques**: Self-Consistency via ANAH-v2, Entropy-Based Detection via Nature 2024
- **Production models**: AimonLabs HDM-2, Varun-Chowdary Detector on HuggingFace

#### Phase 4: Testing

Create comprehensive tests in `scripts/ah_guard.test.ts`:
- Unit tests for each verification function
- Integration tests for full protocol verification
- Edge case handling (empty text, mixed content, etc.)


### Plan

| Step | Action | Status |
|------|--------|--------|
| 1 | Create rd3 anti-hallucination directory structure | Pending |
| 2 | Create SKILL.md with YAML frontmatter and migrated content | Pending |
| 3 | Convert ah_guard.py to ah_guard.ts | Pending |
| 4 | Create ah_guard.test.ts with unit tests | Pending |
| 5 | Update references with SOTA techniques | Pending |
| 6 | Create guard-implementation.md reference | Pending |
| 7 | Create agents/openai.yaml platform companion | Pending |
| 8 | Run full test suite and verify | Pending |


### Review

**Migration Completeness Checklist:**
- [ ] SKILL.md has valid YAML frontmatter with all required fields
- [ ] Content migrated completely from rd2 version
- [ ] TypeScript guard script compiles without errors
- [ ] All verification patterns converted correctly
- [ ] Exit codes match original behavior
- [ ] References updated with 2024-2025 sources
- [ ] Tests cover all verification functions

**Quality Gates:**
- All TypeScript compiles: `bun tsc --noEmit`
- All tests pass: `bun test`
- Format and lint pass: `biome format --write . && biome lint --write .`


### Testing

**Unit Test Categories:**

1. **Source Citation Tests**
   - Test URL detection: `https://example.com`, `[Source: ...]`
   - Test markdown formats: `**Source**:`, `Source:`
   - Test list formats: `Sources:\n - ...`

2. **Confidence Level Tests**
   - Test uppercase: `Confidence: HIGH`
   - Test markdown bold: `**Confidence**: MEDIUM`
   - Test section header: `### Confidence`

3. **Tool Usage Evidence Tests**
   - Test MCP tool names: `ref_search_documentation`, `searchCode`
   - Test prefixed names: `mcp__ref__ref_search_documentation`
   - Test fallbacks: `WebSearch`, `WebFetch`

4. **Red Flag Tests**
   - Test phrases: `I think`, `I believe`, `I recall`
   - Test uncertainty: `Probably`, `Likely`, `Possibly`
   - Test conditional: `It should be`, `This might`

5. **Integration Tests**
   - Full protocol verification with compliant text
   - Full protocol verification with non-compliant text
   - Empty/minimal text handling

**Test File Location:** `plugins/rd3/skills/anti-hallucination/tests/ah_guard.test.ts`


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Skill | `plugins/rd3/skills/anti-hallucination/SKILL.md` | rd2:super-brain | 2026-03-22 |
| Script | `plugins/rd3/skills/anti-hallucination/scripts/ah_guard.ts` | rd2:super-brain | 2026-03-22 |
| Tests | `plugins/rd3/skills/anti-hallucination/tests/ah_guard.test.ts` | rd2:super-brain | 2026-03-22 |
| Reference | `plugins/rd3/skills/anti-hallucination/references/anti-hallucination-research.md` | rd2:super-brain | 2026-03-22 |
| Reference | `plugins/rd3/skills/anti-hallucination/references/guard-implementation.md` | rd2:super-brain | 2026-03-22 |

### References

**Research Sources (16 validated sources, 2,500+ citations):**

| # | Source | Citations | Year | Contribution |
|---|--------|-----------|------|-------------|
| 1 | CoVe (Dhuliawala et al) | 727+ | 2023 | Chain-of-Verification pattern |
| 2 | Nature 2024 | 1,017+ | 2024 | Entropy-based detection |
| 3 | HaluEval 2.0 | 226+ | 2024 | 8,770 question benchmark |
| 4 | UQLM | 115+ | 2024 | Uncertainty quantification |
| 5 | Comprehensive Survey 2024 (Tonmoy) | 650+ | 2024 | 32+ technique taxonomy |
| 6 | Counterfactual Probing (Feng) | - | 2025 | 24.5% hallucination reduction |
| 7 | FactCheckMate (Alnuhait) | - | 2024 | 70%+ preemptive detection |
| 8 | Comprehensive Survey 2025 (Alansari) | - | 2025 | Complete taxonomy update |
| 9 | Theoretical Foundations (Gumaan) | - | 2025 | PAC-Bayes bounds |
| 10 | ANAH-v2 (Gu et al) | 21+ | 2024 | Self-training EM algorithm |
| 11 | MedHalu (Agarwal) | - | 2024 | Medical hallucination patterns |
| 12 | Lakera.ai Guide | - | 2025 | Industry best practices |
| 13 | RootSignals Analysis | - | 2025 | 2025 state of hallucinations |
| 14 | Voiceflow Strategies | - | 2025 | Production mitigation |
| 15 | AWS Bedrock Agents | - | 2024 | Production workflow |
| 16 | AimonLabs HDM-2 | - | 2024 | Production detector model |

**Existing Source Files (to be migrated):**
- `/Users/robin/projects/cc-agents/plugins/rd2/skills/anti-hallucination/SKILL.md`
- `/Users/robin/projects/cc-agents/plugins/rd2/skills/anti-hallucination/scripts/ah_guard.py`
- `/Users/robin/projects/cc-agents/plugins/rd2/skills/anti-hallucination/references/anti-hallucination-research.md`
- `/Users/robin/projects/cc-agents/plugins/rd2/skills/anti-hallucination/references/prompt-patterns.md`
- `/Users/robin/projects/cc-agents/plugins/rd2/skills/anti-hallucination/references/tool-usage-guide.md`

**rd3 Reference Structures:**
- `/Users/robin/projects/cc-agents/plugins/rd3/skills/cc-skills/SKILL.md` (skill format reference)
- `/Users/robin/projects/cc-agents/plugins/rd2/hooks/hooks.json` (hook configuration reference)
