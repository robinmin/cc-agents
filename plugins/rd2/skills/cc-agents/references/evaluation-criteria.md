# Agent Evaluation Criteria

## Scoring Framework (0-100 scale)

| Dimension | Weight | Pass Criteria | Scoring Method |
|-----------|--------|---------------|----------------|
| **Structure** | 20% | All 8 sections present, 400-600 lines | 5 points per section + line count |
| **Verification** | 25% | Complete protocol with red flags, fallbacks | Red flags (10), sources (5), confidence (5), fallbacks (5) |
| **Competencies** | 20% | 50+ items across categories | 0.4 points per item, capped at 20 |
| **Rules** | 15% | 8+ DO and 8+ DON'T | 1 point per rule, min 8 each |
| **Auto-Routing** | 10% | "Use PROACTIVELY for" with keywords | Phrase (5), keyword relevance (5) |
| **Examples** | 10% | 2-3 examples with commentary | 5 points per complete example |

**Passing Score:** >= 80/100
**Excellent Score:** >= 90/100

## Dimension Details

### Structure (20 points)

```
Section 1 (METADATA) present: _____ / 2
Section 2 (PERSONA) present: _____ / 2
Section 3 (PHILOSOPHY) present: _____ / 2
Section 4 (VERIFICATION) present: _____ / 2
Section 5 (COMPETENCIES) present: _____ / 2
Section 6 (PROCESS) present: _____ / 2
Section 7 (RULES) present: _____ / 2
Section 8 (OUTPUT) present: _____ / 2
Line count 400-600: _____ / 4 (bonus)
```

### Verification (25 points)

```
Red flags listed (domain-specific): _____ / 10
Source priority defined: _____ / 5
Confidence scoring included: _____ / 5
Fallback protocol complete: _____ / 5
```

### Competencies (20 points)

```
Total items counted: _____
Score = min(items × 0.4, 20)
```

### Rules (15 points)

```
DO ✓ rules (min 8): _____ / 7.5
DON'T ✗ rules (min 8): _____ / 7.5
```

### Auto-Routing (10 points)

```
"Use PROACTIVELY for" present: _____ / 5
Keywords relevant and specific: _____ / 5
```

### Examples (10 points)

```
Example 1 complete (context + user + assistant + commentary): _____ / 3.33
Example 2 complete: _____ / 3.33
Example 3 complete: _____ / 3.34
```

## Common Issues by Dimension

### Structure Issues

| Issue | Impact | Fix |
|-------|--------|-----|
| Missing section | -2 to -5 points | Add missing section |
| Too short (<400) | Fails structure | Expand content |
| Too long (>600) | Fails efficiency | Condense |

### Verification Issues

| Issue | Impact | Fix |
|-------|--------|-----|
| No red flags | -10 points | Add domain-specific red flags |
| Missing source priority | -5 points | Define source hierarchy |
| No confidence scoring | -5 points | Add confidence levels |
| No fallback protocol | -5 points | Add error handling |

### Competencies Issues

| Issue | Impact | Fix |
|-------|--------|-----|
| Too few items (<50) | Score < 20 | Add more items |
| Poor categorization | Quality issue | Group by category |
| Vague items | Quality issue | Make specific |

### Rules Issues

| Issue | Impact | Fix |
|-------|--------|-----|
| Fewer than 8 DO | Score < 7.5 | Add more |
| Fewer than 8 DON'T | Score < 7.5 | Add more |
| Unbalanced | Quality issue | Ensure both types |

### Auto-Routing Issues

| Issue | Impact | Fix |
|-------|--------|-----|
| No "Use PROACTIVELY" | -5 points | Add to description |
| Vague keywords | -5 points | Use specific triggers |

### Examples Issues

| Issue | Impact | Fix |
|-------|--------|-----|
| Missing examples | Score = 0 | Add 2-3 examples |
| No commentary | Quality issue | Add explanations |
| Not relevant | Quality issue | Use domain-specific cases |

## Grade Scale

| Grade | Score | Status | Action |
|-------|-------|--------|--------|
| A | 90-100 | Excellent | Production ready |
| B | 80-89 | Good | Minor polish recommended |
| C | 70-79 | Fair | Needs improvement before production |
| D | 60-69 | Poor | Significant revision needed |
| F | <60 | Fail | Complete rewrite required |

## Evaluation Checklist

Use this checklist when evaluating an agent:

### Structure
- [ ] All 8 sections present
- [ ] Total lines between 400-600
- [ ] Sections properly ordered
- [ ] Each section has appropriate content

### Verification
- [ ] Red flags are domain-specific
- [ ] Source priority is defined
- [ ] Confidence scoring included
- [ ] Fallback protocol complete

### Competencies
- [ ] 50+ items total
- [ ] Items categorized properly
- [ ] Specific (not vague)
- [ ] Includes "When NOT to use"

### Rules
- [ ] 8+ DO rules
- [ ] 8+ DON'T rules
- [ ] Rules are specific and actionable
- [ ] Balanced between positive and negative

### Auto-Routing
- [ ] "Use PROACTIVELY for" present
- [ ] Keywords are relevant
- [ ] Keywords are specific
- [ ] Not overly broad

### Examples
- [ ] 2-3 examples present
- [ ] Each has context
- [ ] Each has user/assistant dialogue
- [ ] Each has commentary
- [ ] Examples are domain-relevant
