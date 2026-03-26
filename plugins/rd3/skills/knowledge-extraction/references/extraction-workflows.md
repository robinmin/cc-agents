---
name: extraction-workflows
description: "Extracted section: Extraction Workflows"
see_also:
  - rd3:knowledge-extraction
---

# Extraction Workflows

### Workflow 1: Single Source Extraction

**Use for:** Simple lookups, quick facts

```
1. Load source (file or URL)
2. Extract aspect-related information
3. Verify with 1-2 additional sources
4. Output with single citation
```

### Workflow 2: Multi-Source Synthesis

**Use for:** Complex topics, conflicting information

```
1. Extract from primary source
2. Extract from 2+ secondary sources
3. Cross-verify claims
4. Identify conflicts
5. Consolidate with conflict notes
6. Output with multiple citations
```

### Workflow 3: Aspect-Based Extraction

**Use for:** Targeted information retrieval

```
1. Define aspect clearly (e.g., "OAuth2 flows")
2. Scan sources for aspect matches
3. Extract relevant sections only
4. Filter by relevance score
5. Verify extracted content
6. Consolidate by aspect
```

### Workflow 4: Consolidation From Multiple Sources

**Use for:** Merging related information

```
1. Extract from all sources
2. Identify unique information per source
3. Find overlapping information
4. Merge duplicates (keep best version)
5. Resolve conflicts (prioritize credibility)
6. Create unified knowledge structure
```

### Workflow 5: Multi-Source Reconciliation

**Use for:** Merging conflicting versions of the same content (e.g., skill migration, document consolidation)

```
1. Provide multiple SourceContent objects with name, path, and content
2. detectConflicts() identifies conflicts at file, section, paragraph, and line levels
3. reconcileMultiSource() merges all sources deterministically:
   - Non-conflicting files: taken as-is
   - File-level conflicts: section-by-section merge preserving unique paragraphs
   - Section-level conflicts: paragraph-by-paragraph merge with dedup
   - Paragraph/line-level conflicts: line-by-line merge preserving unique lines
4. scoreMergeQuality() rates the result on coherence, completeness, non-redundancy, traceability (0-100)
5. Returns ReconciliationResult with merged content, quality score, conflict manifest, and source attributions
```

**Scripts:**
- `scripts/detect-conflicts.ts` — Multi-level conflict detection (file, section, paragraph, line)
- `scripts/reconcile.ts` — Deterministic merge engine with source attribution
- `scripts/score-quality.ts` — Four-dimension quality scoring (coherence, completeness, non-redundancy, traceability)
- `scripts/types.ts` — Shared TypeScript interfaces

**Output format (ReconciliationResult):**

```typescript
interface ReconciliationResult {
  mergedContent: string;          // The reconciled markdown content
  qualityScore: number;           // 0-100
  qualityJustification: string;   // Brief explanation of the score
  conflictManifest: ConflictManifest;  // All conflicts detected and how they were resolved
  sourceAttributions: Record<string, string>;  // Which source contributed what
  warnings: string[];             // Low-quality flags for human review
  deterministic: boolean;         // Whether the merge was deterministic
  timestamp: string;              // ISO timestamp of the merge
}
```

**Quality score interpretation:**

| Range | Level | Action |
|-------|-------|--------|
| 90-100 | High | Merge is coherent, complete, non-redundant — ready to use |
| 70-89 | Acceptable | Minor issues — may benefit from human review |
| 50-69 | Poor | Significant gaps or redundancies — must be reviewed |
| 0-49 | Failure | Merge is incoherent — manual intervention required |

**CLI usage:**

```bash
# Pipe sources as JSON array
echo '[{"name":"a","path":"SKILL.md","content":"..."},{"name":"b","path":"SKILL.md","content":"..."}]' \
  | bun plugins/rd3/skills/knowledge-extraction/scripts/reconcile.ts --json

# Summary only
bun plugins/rd3/skills/knowledge-extraction/scripts/reconcile.ts --json --summary --sources='[...]'
```
