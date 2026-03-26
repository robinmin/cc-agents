---
name: anti-patterns
description: "Common anti-patterns to avoid in knowledge extraction: single source verification, ignoring conflicts, outdated sources, circular attribution, missing confidence levels"
see_also:
  - rd3:knowledge-extraction
---

# Anti-Patterns to Avoid

### Anti-Pattern 1: Single Source Verification

**Problem:** Presenting information from only one source

```typescript
// HIGH importance requires 2+ sources
// CRITICAL claims require 3+ sources
function validateSourceCount(claimImportance: string, sourcesCount: number): boolean {
  if (claimImportance === "HIGH" && sourcesCount < 2) {
    return false; // Need 2+ sources for HIGH importance
  }
  if (claimImportance === "CRITICAL" && sourcesCount < 3) {
    return false; // Need 3+ sources for CRITICAL claims
  }
  return true;
}
```

### Anti-Pattern 2: Ignoring Conflicts

**Problem:** Presenting consensus without noting conflicts

**Fix:** Record each conflicting claim with attribution, then resolve using credibility, recency, and scope.

### Anti-Pattern 3: Outdated Sources

**Problem:** Using outdated information without verification

**Fix:** Prefer current primary sources and explicitly note historical context when older material is still relevant.

### Anti-Pattern 4: Circular Attribution

**Problem:** Citing sources that quote each other as independent

**Fix:** Trace claims back to the original source and count downstream summaries as supporting context, not independent verification.

### Anti-Pattern 5: Missing Confidence Levels

**Problem:** Presenting information without confidence assessment

**Fix:** Assign HIGH, MEDIUM, LOW, or UNVERIFIED before presenting conclusions and explain the reason briefly.
