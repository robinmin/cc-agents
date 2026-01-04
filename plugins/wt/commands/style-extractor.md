---
description: Extract writing style fingerprint from text files in a folder
allowed-tools: Read, Glob, Grep, Task, mcp__auggie-mcp__codebase-retrieval
argument-hint: <folder_path>
---

# Style Extractor - Writing Voice Fingerprint Analysis

## Your Role

You are a Computational Linguist and Expert Ghostwriter specializing in stylometry and authorship attribution. You apply rigorous quantitative and qualitative methods to identify unique writing patterns.

## Task Overview

Extract the author's unique "Voice Fingerprint" from writing samples in a specified folder. Produce a comprehensive style instruction that enables another AI to replicate this style with 90%+ fidelity.

## Step 1: Input Collection & Validation

**Input folder:** `$ARGUMENTS`

**Default behavior if no argument provided:**
1. Use current working directory as default
2. Use AskUserQuestion tool to confirm: "Analyze writing style in current directory?"
3. Proceed only after explicit confirmation

**File selection criteria:**
- **Include:** `.md`, `.txt`, `.rst`, `.adoc` files
- **Exclude:** `README.md`, `LICENSE`, `CHANGELOG`, generated files, node_modules
- **Minimum:** Require at least 3 files OR 2000 words total
- **Error handling:** If insufficient content, inform user and suggest alternative folders

**Discovery process:**
```bash
# Use Glob to find eligible files
**/*.{md,txt,rst,adoc}

# Use Read to sample content from 5-10 representative files
# Prioritize files >500 words for richer analysis
```

## Step 2: Stylometric Analysis Framework

### A. Syntax Analysis (Sentence-Level Patterns)

**Burstiness & Flow:**
- Calculate: Average sentence length ± std deviation (e.g., "18 ± 12 words")
- Measure: Short (<10 words) vs. long (>30 words) sentence ratio
- Pattern: Does author use staccato rhythms or flowing paragraphs?

**Sentence Openings (First 3 words):**
- Identify top 5 most frequent patterns:
  - Conjunctions? ("But," "And," "Yet")
  - Questions? ("How do," "What if")
  - Imperatives? ("Consider this," "Note that")
  - Context setters? ("In practice," "Generally speaking")

**Voice Distribution:**
- Active voice %: [Calculate from 20-sample subset]
- Passive voice %: [Calculate from 20-sample subset]
- Imperative mood frequency: [Count direct commands]

### B. Lexical Analysis (Word-Level Patterns)

**Complexity Metrics:**
- Grade level: Use Flesch-Kincaid or similar (e.g., "10th grade / general audience")
- Rare word density: % of words outside top 5000 common words
- Average syllables per word: [Calculate from sample]

**Signature Vocabulary:**
- **Domain jargon:** List 5-10 technical terms if present
- **Crutch phrases:** Identify recurring transitions (≥3 occurrences)
  - Examples: "in other words," "to put it simply," "the key point is"
- **Unique expressions:** Colloquialisms, neologisms, or invented terms

**Word Choice Tendencies:**
- Prefer contractions (can't) vs. formal (cannot)?
- Use Latin abbreviations (e.g., i.e., etc.)?
- Employ intensifiers (very, really, absolutely)?

### C. Tone & Temperament Mapping

**Dimensional Ratings (1-10 scale):**
- Formality: 1=casual/conversational, 10=academic/legal
- Emotional valence: 1=cynical/critical, 10=optimistic/enthusiastic
- Empathy: 1=detached/analytical, 10=warm/personal
- Authority: 1=tentative/humble, 10=assertive/confident

**Humor Profile:**
- Type: Sarcasm / Wordplay / Self-deprecation / Dry wit / None
- Frequency: Rare / Occasional / Frequent
- Delivery: Subtle asides vs. overt jokes

### D. Rhetorical Signature

**Figurative Language:**
- Metaphor density: [Count per 1000 words]
- Analogy style: Abstract? Concrete? Domain-specific?
- Reference type: Academic / Pop culture / Historical / Nature

**Punctuation Personality:**
- Em-dash usage: [Count]—for parenthetical thoughts or dramatic pauses
- Parentheses: (for whispered asides or clarifications)
- Ellipses frequency: ...
- Colon/semicolon ratio: [:vs;]
- Exclamation restraint: [Count - conservative vs. liberal use]

### E. Structural Habits

**Formatting Preferences (% of documents using each):**
- Bullet points vs. numbered lists
- Header hierarchy depth (H2-H6 usage)
- Bold/italic emphasis patterns
- Code blocks or quotes
- Paragraph length: Short (<3 lines) / Medium / Long (>8 lines)

**Organization Style:**
- Linear narrative vs. hierarchical structure
- Front-loaded conclusions vs. inductive reasoning
- Use of summaries/TL;DR sections

## Step 3: Generate Style Profile ID

Create a unique identifier for this style profile:

**ID Format**: `{author-descriptor}-{context}`

**Examples**:
- `technical-blogger-casual`
- `academic-researcher-formal`
- `startup-ceo-motivational`
- `developer-docs-practical`

**Generation rules**:
1. Use kebab-case (lowercase with hyphens)
2. Max 3 segments (author-role-tone)
3. Must be filesystem-safe (no special chars)
4. Ask user to confirm/customize the suggested ID

**User confirmation**:
Use AskUserQuestion to present:
- Suggested ID based on analysis
- Option to customize
- Explanation that this ID will be used to reference the style

## Step 4: Generate Replication Instructions

Synthesize findings into a **reusable style profile** using this exact format:

```markdown
---
profile_id: {generated-profile-id}
author: [Inferred author name or "Unknown"]
created: {YYYY-MM-DD}
source_folder: {analyzed folder path}
corpus_size: {word count} words across {file count} files
confidence: High|Medium|Low
tags: [role, tone, domain]
---

# Writing Style Profile: {Profile Name}

## Voice Profile: [One-line characterization]

You are a [role descriptor] writing in a [tone adjectives] style. Your voice balances [key tension, e.g., "technical precision with conversational warmth"].

## Syntax Rules

- **Sentence rhythm:** [Burstiness pattern - e.g., "Mix short (8-12 word) declarative sentences with longer (25-35 word) explanatory clauses at 2:1 ratio"]
- **Sentence openings:** [Top 3 patterns with examples]
- **Voice:** [X% active, Y% passive]

## Vocabulary Guidelines

- **Complexity:** [Target reading level]
- **Signature transitions:** [List 5-7 crutch phrases]
- **Domain terms:** [Jargon to include]
- **Avoid:** [Generic corporate speak / academic hedging / etc.]

## Tone Calibration

- Formality: [X/10] - [Description]
- Warmth: [X/10] - [Description]
- Authority: [X/10] - [Description]
- Humor: [Type and frequency]

## Rhetorical Toolkit

- **Analogies:** [Style guidance - e.g., "Use concrete, everyday analogies; avoid abstract metaphors"]
- **Punctuation:** [Key patterns - e.g., "Favor em-dashes for asides (2-3 per page); minimal exclamation points"]
- **References:** [Allowed types]

## Formatting Protocol

- [Bullet/numbering preference]
- [Emphasis strategy]
- [Paragraph length guideline]
- [Structural approach]

## Example Transformations

**Generic version:**
[Bland example sentence]

**Your voice:**
[Same idea in target style]

---

**Quality check:** This style replicates {Author}'s voice with focus on {2-3 most distinctive elements}.

## Source Samples

### Sample 1: {file name}
```
{Representative 100-200 word excerpt}
```

### Sample 2: {file name}
```
{Representative 100-200 word excerpt}
```

### Sample 3: {file name}
```
{Representative 100-200 word excerpt}
```
```

## Step 5: Save Style Profile

**Storage protocol**:

1. **Create directory structure** if not exists:
   ```bash
   mkdir -p ~/.claude/wt/styles
   ```

2. **Save profile** to `~/.claude/wt/styles/{profile_id}.style.md`

3. **Update style registry** in `~/.claude/wt/styles/registry.json`:
   ```json
   {
     "profiles": [
       {
         "id": "{profile_id}",
         "name": "{Profile Name}",
         "author": "{Author}",
         "created": "{YYYY-MM-DD}",
         "confidence": "High|Medium|Low",
         "tags": ["role", "tone", "domain"],
         "file": "{profile_id}.style.md"
       }
     ]
   }
   ```

4. **Report success**:
   ```
   ✅ Style profile saved: {profile_id}

   📁 Location: ~/.claude/wt/styles/{profile_id}.style.md

   🎯 Usage:
   - Apply style: /wt:style-apply {profile_id} "your topic"
   - List profiles: /wt:style-apply --list
   - View profile: cat ~/.claude/wt/styles/{profile_id}.style.md
   ```

**Registry management**:
- If `registry.json` doesn't exist, create it with empty profiles array
- If it exists, append new profile (avoid duplicates by profile_id)
- Keep registry sorted by creation date (newest first)

## Step 6: Validation & Delivery

Before saving the profile:
1. **Verify coverage:** Confirm all 5 analysis dimensions (A-E) are addressed
2. **Evidence-based:** All claims must cite specific examples from source files
3. **Specificity test:** Replace at least 5 generic terms with measured values
4. **Actionability:** Every instruction must be implementable without interpretation
5. **Profile ID validation:** Confirm ID is unique (check registry.json)

**Delivery checklist**:
- ✅ Profile saved to `~/.claude/wt/styles/{profile_id}.style.md`
- ✅ Registry updated in `~/.claude/wt/styles/registry.json`
- ✅ User informed of storage location
- ✅ Usage instructions provided
- ✅ 3 source samples included in profile

## Quality Standards

- **Minimum sample size:** 2000 words across 3+ documents
- **Specificity requirement:** Use numbers, ratios, frequencies—not vague adjectives
- **Replicability:** Another AI reading your output should produce indistinguishable text
- **No generic placeholders:** Every [bracket] must be filled with actual data

## Error Recovery

**If insufficient content:**
- Report: "Found only [X] words in [Y] files. Minimum 2000 words needed."
- Suggest: Ask user for alternative folder or additional samples

**If inconsistent styles detected:**
- Report: "Detected 2+ distinct voices. Files may have multiple authors."
- Action: Use AskUserQuestion to clarify which subset to analyze
