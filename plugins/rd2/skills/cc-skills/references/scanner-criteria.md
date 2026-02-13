# Scanner Validation Criteria

This document describes each validation dimension in the skill evaluation scanner, ensuring documentation stays synchronized with implementation.

## Overview

The scanner evaluates skills across 10 dimensions, each weighted to contribute to an overall quality score (0-100) and letter grade (A-F):

| Dimension             | Weight | Description                                                  |
|----------------------|--------|--------------------------------------------------------------|
| Frontmatter          | 10%    | YAML frontmatter quality, naming conventions                 |
| Content              | 20%    | SKILL.md content quality, writing standards                  |
| Security             | 15%    | AST-based dangerous pattern detection                        |
| Structure            | 10%    | Directory organization, progressive disclosure               |
| Trigger Design       | 15%    | Discovery quality, trigger phrases, CSO optimization        |
| Instruction Clarity  | 10%    | Imperative form, unambiguous directives, actionability       |
| Value-Add Assessment | 10%    | Domain-specific knowledge, unique workflows, artifacts      |
| Behavioral Readiness | 10%    | Error handling, edge cases, test scenarios                    |
| Efficiency           | 5%     | Token efficiency, no duplication                              |
| Best Practices       | 5%     | Naming conventions, documentation standards                   |

## Rubric-Based Scoring

Each dimension uses rubric-based scoring with multiple criteria:

- **Criteria**: Individual aspects being evaluated (e.g., "description_quality")
- **Levels**: Score levels for each criterion (Excellent/Good/Fair/Poor/Missing)
- **Weight**: Each criterion's contribution to the dimension score

### Scoring Formula

```
Dimension Score = sum(criterion_weight * level_score) / sum(criterion_weights)
Overall Score = sum(dimension_weight * dimension_score) / sum(dimension_weights)
```

Grades: A (90+), B (80-89), C (70-79), D (60-69), F (<60)

---

## Dimension 1: Frontmatter (10% weight)

### What the scanner checks

**Required fields:**
- name field: Must be present
- description field: Must be present

**Name validation:**
- Maximum 64 characters
- Hyphen-case only: lowercase letters, numbers, hyphens
- Cannot start/end with hyphen
- No consecutive hyphens

**Description validation:**
- 20-1024 characters (optimal: 50-500)
- No angle brackets (prevents XML injection)
- Describes both what AND when to use

**Optional fields:**
- allowed-tools: Lists tools this skill uses
- license: License for the skill
- metadata: Additional metadata

### Examples

Passing frontmatter:
```yaml
---
name: pdf-processing
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
allowed-tools:
  - pdfplumber
  - PyPDF2
---
```

Failing frontmatter (underscores, not hyphen-case):
```yaml
---
name: PDF_Helper
description: Too short
---
```

---

## Dimension 2: Content (20% weight)

### What the scanner checks

**Content length:**
- 20-500 lines (excluding frontmatter) is ideal
- Less than 20 lines is too brief
- More than 500 lines should be split

**Required sections:**
- Overview section
- Examples or code blocks
- Workflow or guidance on when to use

**TODO placeholders:**
- Any unresolved TODO placeholders will be flagged

**Writing quality:**
- Imperative form usage (>60% of sentences)
- Active voice predominance
- Clear, concise language

---

## Dimension 3: Security (15% weight)

### What the scanner checks

The scanner performs AST-based analysis of Python code blocks in SKILL.md and scripts:

**Dangerous patterns flagged:**
- Direct eval() calls (code injection risk)
- Direct exec() calls (code injection risk)
- __import__() calls (dynamic import risk)
- os.system() calls (command injection risk)
- os.popen() calls (command injection risk)
- pickle.loads() calls (arbitrary code execution risk)
- subprocess calls with shell=True (command injection risk)

**Positive indicators:**
- Mentions security considerations
- Has references/ directory for security guidance

### Rationale

Code blocks in documentation are executable. Dangerous patterns in examples can lead to security vulnerabilities if copied.

---

## Dimension 4: Structure (10% weight)

### What the scanner checks

**Directory structure:**
- SKILL.md in root (required)
- scripts/ directory (if applicable)
- references/ directory (if applicable)
- assets/ directory (if applicable)

**Progressive disclosure:**
- Quick Start section (recommended)
- Overview section
- Advanced section indicated by ### headings (optional)

**Heading hierarchy:**
- Starts with # or ## heading
- Starting with ### or deeper is flagged as issue

### Rationale

Progressive disclosure ensures Claude loads only what's needed. Quick Start provides immediate value, while Advanced sections load only when needed.

---

## Dimension 5: Trigger Design (15% weight)

### What the scanner checks

**Trigger phrase presence:**
- Count of unique quoted phrases in description (target: 3+)
- Variety of trigger mechanisms (keywords, error messages, tool names)

**CSO (Core Skill Ontology) compliance:**
- No workflow summaries in description ("This skill covers X, Y, Z...")
- Specific "when to use" documentation
- Clear trigger-ability signals

**Third-person form:**
- Uses "This skill should be used when..." pattern
- Avoids first-person or generic descriptions

**Synonym coverage:**
- Key concepts include related terms (e.g., "timeout" also covers "hang", "freeze")

### Rubric Criteria

| Criterion          | Weight | Description                                             |
|-------------------|--------|-------------------------------------------------------- |
| trigger_phrases   | 30%    | Number and quality of trigger phrases                  |
| when_to_use       | 25%    | Clarity of activation conditions                       |
| cso_compliance    | 25%    | No workflow summaries, proper CSO structure             |
| synonym_coverage  | 20%    | Related terms and concepts covered                     |

---

## Dimension 6: Instruction Clarity (10% weight)

### What the scanner checks

**Imperative form ratio:**
- Percentage of sentences using imperative mood
- Target: >70% imperative sentences

**Vague language detection:**
- Hedging words: "might", "could", "maybe", "perhaps", "possibly"
- Conditional phrases without criteria: "as needed", "if appropriate"
- Fuzzy quantifiers: "some", "a few", "several", "many"

**Actionability:**
- Percentage of instructions referencing specific tools/files/commands
- Presence of concrete action verbs

**Conditional clarity:**
- Conditionals ("if X, do Y") have specific criteria for X
- No vague branching conditions

### Rubric Criteria

| Criterion           | Weight | Description                                              |
|--------------------|--------|----------------------------------------------------------|
| imperative_form    | 30%    | Ratio of imperative to declarative sentences             |
| vague_language    | 25%    | Absence of hedging/fuzzy language                       |
| actionability     | 25%    | Reference to specific tools, files, or commands         |
| conditional_clarity | 20%  | Specificity of conditional instructions                  |

---

## Dimension 7: Value-Add Assessment (10% weight)

### What the scanner checks

**Generic content detection:**
- Explaining well-known concepts (REST, SQL, HTTP, general programming)
- Generic advice applicable to any project
- Wrapper-only content that restates Claude's native knowledge

**Domain specificity:**
- Project-specific terminology density
- Industry-specific workflows and patterns
- Custom tools and scripts unique to the domain

**Artifact presence:**
- scripts/ directory with executable utilities
- templates/ directory with reusable formats
- references/ with domain-specific documentation

**Unique workflow documentation:**
- Procedures not covered by standard prompting
- Specialized techniques and optimizations
- Custom error handling for domain-specific errors

### Rubric Criteria

| Criterion            | Weight | Description                                               |
|---------------------|--------|-----------------------------------------------------------|
| domain_expertise    | 30%    | Depth of domain-specific knowledge                        |
| workflow_uniqueness | 25%    | Unique procedures beyond standard prompting                |
| artifact_quality    | 25%    | Quality and utility of scripts, templates, references    |
| generic_overlap     | 20%    | Avoidance of generic/wrapper-only content                 |

---

## Dimension 8: Behavioral Readiness (10% weight)

### What the scanner checks

**Error handling:**
- Specific error guidance ("when X fails, do Y")
- Error-specific recovery steps
- References to common error patterns

**Edge case coverage:**
- Null/empty input handling
- Boundary condition documentation
- Invalid state recovery

**Fallback strategies:**
- Alternative approaches when primary method fails
- Graceful degradation patterns

**Test scenarios:**
- tests/scenarios.yaml file presence
- Number of behavioral test cases (minimum: 2-4 depending on skill type)
- Coverage of both positive and negative scenarios

**Trigger testing (NEW in v2.0):**
- tests/scenarios.yaml contains trigger_tests section
- should_trigger queries defined (minimum: 3)
- should_not_trigger queries defined (minimum: 2)
- Negative trigger guidance in documentation

**Performance comparison (NEW in v2.0):**
- tests/scenarios.yaml contains performance_tests section
- Baseline vs with-skill metrics defined
- Token efficiency guidance in documentation

### Rubric Criteria

| Criterion           | Weight | Description                                               |
|--------------------|--------|-----------------------------------------------------------|
| error_handling     | 20%    | Quality of error guidance and recovery steps               |
| edge_case_coverage | 20%    | Documentation of boundary conditions and edge cases       |
| fallback_strategies | 15%  | Alternative approaches and graceful degradation           |
| test_scenarios     | 15%    | Presence and quality of tests/scenarios.yaml               |
| anti_patterns      | 10%    | Documentation of what NOT to do                           |
| trigger_testing    | 10%    | Trigger test coverage (should/should_not trigger)         |
| performance_comparison | 10% | Performance metrics and token efficiency guidance       |

---

## Dimension 9: Efficiency (5% weight)

### What the scanner checks

**Token count (rough estimate: 4 characters = 1 token):**
- Under 500 tokens: Token-efficient
- 500-1500 tokens: Reasonable size
- 1500-3000 tokens: Large skill, consider splitting
- Over 3000 tokens: Very large skill, strongly consider splitting

**Content quality:**
- Duplicate lines (case-insensitive, over 20 characters)
- Verbose lines (over 30 words per line average)

---

## Dimension 10: Best Practices (5% weight)

### What the scanner checks

**Name convention:**
- Follows hyphen-case format

**TODO placeholders:**
- Each TODO placeholder reduces score

**Documentation standards:**
- Clear section structure
- Consistent formatting
- Proper code block language annotations

---

## Dimension 1: Frontmatter (10% weight)

### What the scanner checks

**Required fields:**
- name field: Must be present
- description field: Must be present

**Name validation:**
- Maximum 64 characters
- Hyphen-case only: lowercase letters, numbers, hyphens
- Cannot start/end with hyphen
- No consecutive hyphens

**Description validation:**
- 20-1024 characters (optimal: 50-500)
- No angle brackets (prevents XML injection)
- Describes both what AND when to use

**Optional fields:**
- allowed-tools: Lists tools this skill uses
- license: License for the skill
- metadata: Additional metadata

### Examples

Passing frontmatter:
```yaml
---
name: pdf-processing
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
allowed-tools:
  - pdfplumber
  - PyPDF2
---
```

Failing frontmatter (underscores, not hyphen-case):
```yaml
---
name: PDF_Helper
description: Too short
---
```

## Dimension 2: Content (25% weight)

### What the scanner checks

**Content length:**
- 20-500 lines (excluding frontmatter) is ideal
- Less than 20 lines is too brief
- More than 500 lines should be split

**Required sections:**
- Overview section
- Examples or code blocks
- Workflow or guidance on when to use

**TODO placeholders:**
- Any unresolved TODO placeholders will be flagged

## Dimension 3: Security (20% weight)

### What the scanner checks

The scanner performs AST-based analysis of Python code blocks in SKILL.md and scripts:

**Dangerous patterns flagged:**
- Direct eval() calls (code injection risk)
- Direct exec() calls (code injection risk)
- __import__() calls (dynamic import risk)
- os.system() calls (command injection risk)
- os.popen() calls (command injection risk)
- pickle.loads() calls (arbitrary code execution risk)
- subprocess calls with shell=True (command injection risk)

**Positive indicators:**
- Mentions security considerations
- Has references/ directory for security guidance

### Rationale

Code blocks in documentation are executable. Dangerous patterns in examples can lead to security vulnerabilities if copied.

## Dimension 4: Structure (15% weight)

### What the scanner checks

**Directory structure:**
- SKILL.md in root (required)
- scripts/ directory (if applicable)
- references/ directory (if applicable)
- assets/ directory (if applicable)

**Progressive disclosure:**
- Quick Start section (recommended)
- Overview section
- Advanced section indicated by ### headings (optional)

**Heading hierarchy:**
- Starts with # or ## heading
- Starting with ### or deeper is flagged as issue

### Rationale

Progressive disclosure ensures Claude loads only what's needed. Quick Start provides immediate value, while Advanced sections load only when needed.

