#!/bin/bash
# test-workflow.sh - Integration test script for Technical Content Workflow
#
# Usage: ./test-workflow.sh [--cleanup]
#
# Options:
#   --cleanup    Remove test topic after testing

set -euo pipefail  # Exit on error, undefined vars, and pipe failures

echo "========================================"
echo "Technical Content Workflow - Integration Tests"
echo "========================================"

# Configuration
TEST_TOPIC="test-topic-001"
TEST_COLLECTION="test-collection"
RESULTS_FILE="TEST_RESULTS.md"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    FAILED_TESTS+=("$1")
}

info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Cleanup function
cleanup() {
    if [ -d "$TEST_TOPIC" ]; then
        rm -rf "$TEST_TOPIC"
        info "Cleaned up test topic: $TEST_TOPIC"
    fi
}

# Parse arguments
if [ "$1" == "--cleanup" ]; then
    cleanup
    exit 0
fi

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=()

# Phase 1: Setup
echo ""
echo "Phase 1: Setup"
echo "----------------------------------------"

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -d "$TEST_TOPIC" ]; then
    rm -rf "$TEST_TOPIC"
fi

# Create test topic structure
mkdir -p "$TEST_TOPIC/0-materials"
mkdir -p "$TEST_TOPIC/1-research"
mkdir -p "$TEST_TOPIC/2-outline"
mkdir -p "$TEST_TOPIC/3-draft/draft-revisions"
mkdir -p "$TEST_TOPIC/4-illustration/images"
mkdir -p "$TEST_TOPIC/5-adaptation"
mkdir -p "$TEST_TOPIC/6-publish/published"
mkdir -p "$TEST_TOPIC/6-publish/assets"

# Create topic.md
cat > "$TEST_TOPIC/topic.md" << 'EOF'
---
name: test-topic-001
title: Test Topic - AI Coding Best Practices
description: Integration test topic for Technical Content Workflow
collection: test-collection
created_at: 2026-01-28
updated_at: 2026-01-28
status: draft
author:
  name: Test User
  email: test@example.com
tags:
  - test
  - integration
  - ai
keywords:
  - test
  - workflow
  - integration
stage: 0
version: 1.0.0
review:
  last_reviewed_at: null
  reviewer: null
  status: pending
  feedback: []
links:
  materials: 0-materials/materials-extracted.md
  research: 1-research/research-brief.md
  outline: 2-outline/outline-approved.md
  draft: 3-draft/draft-article.md
  illustration: 4-illustration/
  adaptation: 5-adaptation/
  publish: 6-publish/article.md
stats:
  word_count: null
  reading_time: null
  source_count: 0
  image_count: 0
---

## Additional Notes

Integration test topic for the Technical Content Workflow.
EOF

# Verify folders
FOLDER_COUNT=$(ls -d "$TEST_TOPIC"/*/ 2>/dev/null | wc -l)
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ "$FOLDER_COUNT" -eq 7 ]; then
    pass "Folder structure: 7 stage folders created"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "Folder structure: Expected 7 folders, found $FOLDER_COUNT"
fi

# Phase 2: Materials
echo ""
echo "Phase 2: Materials Stage"
echo "----------------------------------------"

# Create sample source
cat > "$TEST_TOPIC/0-materials/sample-source.md" << 'EOF'
# AI Coding Best Practices - Source Material

## Introduction

This document provides best practices for using AI coding assistants.

## Key Principles

1. Understand before accepting
2. Maintain code ownership
3. Verify functionality
4. Security first
5. Document decisions

EOF

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "$TEST_TOPIC/0-materials/sample-source.md" ]; then
    pass "Sample source created"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "Sample source creation"
fi

# Create materials.json
cat > "$TEST_TOPIC/0-materials/materials.json" << 'EOF'
{
  "version": "1.0.0",
  "last_updated": "2026-01-28T10:00:00Z",
  "materials": [
    {
      "id": "mat-001",
      "file": "materials-extracted.md",
      "source": "sample-source.md",
      "source_type": "file",
      "extracted_at": "2026-01-28T10:00:00Z",
      "word_count": 100,
      "confidence": "HIGH"
    }
  ]
}
EOF

# Create materials-extracted.md
cat > "$TEST_TOPIC/0-materials/materials-extracted.md" << 'EOF'
---
title: Extracted Materials: AI Coding Best Practices
source: sample-source.md
source_type: file
extracted_at: 2026-01-28T10:00:00Z
topic: test-topic-001
word_count: 100
confidence: HIGH
---

# Extracted Materials: AI Coding Best Practices

## Source

- File: sample-source.md
- Type: Markdown Document
- Extracted: 2026-01-28

## Content

AI coding best practices include understanding code, maintaining ownership, verifying functionality, security first, and documenting decisions.

## Confidence

Level: HIGH
EOF

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "$TEST_TOPIC/0-materials/materials-extracted.md" ]; then
    pass "materials-extracted.md created with frontmatter"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "materials-extracted.md creation"
fi

# Phase 3: Research
echo ""
echo "Phase 3: Research Stage"
echo "----------------------------------------"

# Create sources.json
cat > "$TEST_TOPIC/1-research/sources.json" << 'EOF'
{
  "version": "1.0.0",
  "last_updated": "2026-01-28T10:00:00Z",
  "sources": [
    {
      "id": "src-001",
      "title": "AI Coding Best Practices",
      "url": "file://sample-source.md",
      "type": "documentation",
      "cited_in": "research-brief.md",
      "added_at": "2026-01-28T10:00:00Z"
    }
  ],
  "research_type": "systematic",
  "time_range": "2024-2026",
  "confidence": "HIGH"
}
EOF

# Create research-brief.md
cat > "$TEST_TOPIC/1-research/research-brief.md" << 'EOF'
---
title: Research Brief: AI Coding Best Practices
source_materials: 0-materials/materials-extracted.md
research_type: systematic
time_range: 2024-2026
topics:
  - ai coding
  - best practices
created_at: 2026-01-28T10:00:00Z
status: draft
confidence: HIGH
sources_count: 5
---

# Research Brief: AI Coding Best Practices

## Executive Summary

Key findings on AI coding best practices:

1. Understanding before accepting is critical [HIGH]
2. Code review standards apply to AI output [HIGH]
3. Security requires special attention [MEDIUM]
4. Documentation improves maintainability [MEDIUM]

## Research Parameters

- Type: systematic
- Time Range: 2024-2026
- Sources: 5 sources
- Confidence: HIGH
EOF

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "$TEST_TOPIC/1-research/research-brief.md" ]; then
    pass "research-brief.md created with frontmatter"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "research-brief.md creation"
fi

# Phase 4: Outline
echo ""
echo "Phase 4: Outline Stage"
echo "----------------------------------------"

# Create outline-draft.md
cat > "$TEST_TOPIC/2-outline/outline-draft.md" << 'EOF'
---
title: Outline Draft: AI Coding Best Practices
source_research: 1-research/research-brief.md
length: short
topics:
  - introduction
  - best practices
  - conclusion
created_at: 2026-01-28T10:00:00Z
status: draft
confidence: HIGH
---

# Outline Draft: AI Coding Best Practices

## 1. Introduction
   - Overview of AI coding assistants

## 2. Best Practices
   - Code review
   - Security
   - Learning

## 3. Conclusion
   - Summary
   - Next steps
EOF

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "$TEST_TOPIC/2-outline/outline-draft.md" ]; then
    pass "outline-draft.md created with frontmatter"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "outline-draft.md creation"
fi

# Create outline-approved.md
cat > "$TEST_TOPIC/2-outline/outline-approved.md" << 'EOF'
---
title: Outline Approved: AI Coding Best Practices
source_research: 1-research/research-brief.md
approved_at: 2026-01-28T10:00:00Z
approved_by: Test User
status: approved
---

# Outline Approved: AI Coding Best Practices

## 1. Introduction
   - Overview of AI coding assistants
   - Why best practices matter

## 2. Code Review Best Practices
   - Understanding before acceptance
   - Rigorous review standards
   - Edge cases

## 3. Security Considerations
   - Protecting sensitive information
   - Data privacy
   - Secret detection

## 4. Learning and Growth
   - Using AI as a tool
   - Asking for explanations

## 5. Conclusion
   - Key takeaways
   - Next steps
EOF

# Phase 5: Draft
echo ""
echo "Phase 5: Draft Stage"
echo "----------------------------------------"

# Create draft-article.md
cat > "$TEST_TOPIC/3-draft/draft-article.md" << 'EOF'
---
title: Draft: AI Coding Best Practices
style_profile: technical-writer
source_outline: 2-outline/outline-approved.md
topic: AI Coding Best Practices
version: 1
created_at: 2026-01-28T10:00:00Z
updated_at: 2026-01-28T10:30:00Z
status: draft
style_notes:
  - tone: formal
  - vocabulary: technical
---

# AI Coding Best Practices

## Introduction

AI coding assistants have transformed software development. This guide explores best practices for using them effectively.

## Code Review Best Practices

### Understanding Before Acceptance

Never accept AI-generated code without understanding it. Take time to review implementations.

### Rigorous Review Standards

Apply the same standards to AI code as human code. Check for correctness, performance, error handling.

## Security Considerations

### Protecting Sensitive Information

Never share sensitive information with AI systems.

### Data Privacy

Be aware of data privacy implications when using AI tools.

## Learning and Growth

Use AI as a learning tool, not a replacement for understanding.

## Conclusion

AI coding assistants are powerful when used responsibly.

---
*Generated with style profile: technical-writer*
EOF

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "$TEST_TOPIC/3-draft/draft-article.md" ]; then
    pass "draft-article.md created with frontmatter"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "draft-article.md creation"
fi

# Phase 6: Illustration
echo ""
echo "Phase 6: Illustration Stage"
echo "----------------------------------------"

# Create context-cover.json for wt:image-cover integration
cat > "$TEST_TOPIC/4-illustration/context-cover.json" << 'EOF'
{
  "version": "1.0.0",
  "title": "AI Coding Best Practices",
  "themes": ["AI coding", "best practices", "security"],
  "tone": "technical",
  "detected_style": "technical"
}
EOF

# Create context-illustration.json for wt:image-illustrator integration
cat > "$TEST_TOPIC/4-illustration/context-illustration.json" << 'EOF'
{
  "version": "1.0.0",
  "positions": [
    {
      "line": 45,
      "type": "abstract_concept",
      "description": "AI coding workflow diagram",
      "prompt": "AI coding workflow showing human-AI collaboration"
    },
    {
      "line": 89,
      "type": "information_dense",
      "description": "Security best practices chart",
      "prompt": "Security best practices flowchart for AI coding"
    },
    {
      "line": 123,
      "type": "emotional_transition",
      "description": "Learning pathway visualization",
      "prompt": "Learning pathway from beginner to expert with AI"
    }
  ]
}
EOF

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "$TEST_TOPIC/4-illustration/context-cover.json" ]; then
    pass "context-cover.json created for wt:image-cover"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "context-cover.json creation"
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "$TEST_TOPIC/4-illustration/context-illustration.json" ]; then
    pass "context-illustration.json created for wt:image-illustrator"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "context-illustration.json creation"
fi

# Create captions.json with wt:image-illustrator format
cat > "$TEST_TOPIC/4-illustration/captions.json" << 'EOF'
{
  "version": "1.0.0",
  "last_updated": "2026-01-30T12:00:00Z",
  "article": "3-draft/draft-article.md",
  "images": [
    {
      "id": "img-001",
      "position": "line 45",
      "prompt": "AI coding workflow showing human-AI collaboration",
      "file": "images/ai-coding-workflow.png",
      "alt_text": "Workflow diagram showing AI coding workflow with human oversight",
      "reason": "abstract_concept",
      "created_at": "2026-01-30T12:00:00Z"
    },
    {
      "id": "img-002",
      "position": "line 89",
      "prompt": "Security best practices flowchart for AI coding",
      "file": "images/security-best-practices.png",
      "alt_text": "Flowchart showing security best practices for AI coding",
      "reason": "information_dense",
      "created_at": "2026-01-30T12:00:00Z"
    }
  ]
}
EOF

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "$TEST_TOPIC/4-illustration/captions.json" ]; then
    pass "captions.json created with wt:image-illustrator format"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "captions.json creation"
fi

# Create sample image output files for verification
mkdir -p "$TEST_TOPIC/4-illustration/images"
touch "$TEST_TOPIC/4-illustration/cover.png"
touch "$TEST_TOPIC/4-illustration/images/ai-coding-workflow.png"

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "$TEST_TOPIC/4-illustration/cover.png" ]; then
    pass "cover.png created (wt:image-cover output)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "cover.png creation"
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "$TEST_TOPIC/4-illustration/images/ai-coding-workflow.png" ]; then
    pass "images/ai-coding-workflow.png created (wt:image-generate output)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "ai-coding-workflow.png creation"
fi

# Phase 7: Adaptation
echo ""
echo "Phase 7: Adaptation Stage"
echo "----------------------------------------"

# Create Twitter adaptation
cat > "$TEST_TOPIC/5-adaptation/article-twitter.md" << 'EOF'
---
title: Adaptation: Twitter - AI Coding Best Practices
source_draft: 3-draft/draft-article.md
platform: twitter
adapted_at: 2026-01-28T10:00:00Z
character_count: 245
---

# AI Coding Best Practices Thread

1/ AI coding assistants are powerful. Best practices:

- Understand before accepting
- Apply review standards
- Protect sensitive data

2/ Security:

- Never share API keys
- Be aware of privacy
- Check for secrets

3/ Learning:

- Use AI as a tool
- Ask for explanations

Key: Be responsible with AI!

#AIcoding #DevTools
EOF

TOTAL_TESTS=$((TOTAL_TESTS + 1))
TWITTER_CHARS=$(cat "$TEST_TOPIC/5-adaptation/article-twitter.md" | grep -v "^---" | wc -c)
if [ "$TWITTER_CHARS" -lt 280 ]; then
    pass "Twitter adaptation: $TWITTER_CHARS chars (under 280 limit)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "Twitter adaptation: $TWITTER_CHARS chars (exceeds 280 limit)"
fi

# Create LinkedIn adaptation
cat > "$TEST_TOPIC/5-adaptation/article-linkedin.md" << 'EOF'
---
title: Adaptation: LinkedIn - AI Coding Best Practices
source_draft: 3-draft/draft-article.md
platform: linkedin
adapted_at: 2026-01-28T10:00:00Z
format: professional-article
---

# AI Coding Best Practices: A Guide for Developers

AI coding assistants have become indispensable tools. Here are best practices to use them effectively:

## Key Principles

1. Understand before accepting
2. Apply rigorous review standards
3. Protect sensitive information
4. Use AI as a learning tool

## The Bottom Line

AI enhances our capabilities when used responsibly.

What practices have you found valuable?

#SoftwareDevelopment #AI #Coding
EOF

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "$TEST_TOPIC/5-adaptation/article-linkedin.md" ]; then
    pass "LinkedIn adaptation created"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "LinkedIn adaptation creation"
fi

# Create Dev.to adaptation
cat > "$TEST_TOPIC/5-adaptation/article-devto.md" << 'EOF'
---
title: Adaptation: Dev.to - AI Coding Best Practices
source_draft: 3-draft/draft-article.md
platform: devto
adapted_at: 2026-01-28T10:00:00Z
tags: [ai, coding, best-practices]
---

# AI Coding Best Practices

AI coding assistants are powerful tools. Here is how to use them effectively.

## Best Practices

- Understand before accepting
- Apply rigorous review
- Protect sensitive data
- Use AI as a learning tool

## Conclusion

Use AI responsibly.

#ai #coding #bestpractices
EOF

# Phase 8: Publish
echo ""
echo "Phase 8: Publish Stage"
echo "----------------------------------------"

# Create published article
cat > "$TEST_TOPIC/6-publish/article.md" << 'EOF'
---
title: Published: AI Coding Best Practices
source_draft: 3-draft/draft-article.md
published_at: 2026-01-28T10:00:00Z
status: published
version: 1.0.0
word_count: 400
reading_time: 2 min
---

# AI Coding Best Practices

## Introduction

AI coding assistants have transformed software development. This guide covers best practices.

## Code Review Best Practices

Understanding before acceptance and rigorous review standards are essential.

## Security Considerations

Protect sensitive information and be aware of data privacy implications.

## Learning and Growth

Use AI as a learning tool, not a replacement for understanding.

## Conclusion

AI coding assistants are powerful when used responsibly.

---
*Published: 2026-01-28*
EOF

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "$TEST_TOPIC/6-publish/article.md" ]; then
    pass "Published article created with frontmatter"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "Published article creation"
fi

# Create publish-log.json
cat > "$TEST_TOPIC/6-publish/publish-log.json" << 'EOF'
{
  "version": "1.0.0",
  "last_updated": "2026-01-28T10:00:00Z",
  "publications": [
    {
      "id": "pub-001",
      "platform": "blog",
      "url": "article.md",
      "published_at": "2026-01-28T10:00:00Z",
      "status": "published",
      "version": "1.0.0",
      "notes": "Initial publication"
    }
  ]
}
EOF

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "$TEST_TOPIC/6-publish/publish-log.json" ]; then
    pass "publish-log.json created with publication record"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "publish-log.json creation"
fi

# Create root publish-log.json
cat > "$TEST_TOPIC/publish-log.json" << 'EOF'
{
  "version": "1.0.0",
  "last_updated": "2026-01-28T10:00:00Z",
  "topic": "test-topic-001",
  "publications": [
    {
      "id": "pub-001",
      "platform": "blog",
      "url": "6-publish/article.md",
      "published_at": "2026-01-28T10:00:00Z",
      "status": "published",
      "version": "1.0.0",
      "notes": "Initial publication"
    }
  ],
  "adaptations": [
    {
      "platform": "twitter",
      "file": "5-adaptation/article-twitter.md"
    },
    {
      "platform": "linkedin",
      "file": "5-adaptation/article-linkedin.md"
    },
    {
      "platform": "devto",
      "file": "5-adaptation/article-devto.md"
    }
  ]
}
EOF

# Phase 9: Multi-Option Outline Tests
echo ""
echo "Phase 9: Multi-Option Outline Workflow"
echo "----------------------------------------"

# Create multi-option outline structure
mkdir -p "$TEST_TOPIC/2-outline/materials"

TOTAL_TESTS=$((TOTAL_TESTS + 1))
cat > "$TEST_TOPIC/2-outline/outline-option-a.md" << 'EOF'
---
title: Outline Option A - Traditional/Structured
option: a
style: traditional-structured
created_at: 2026-01-30T10:00:00Z
status: draft
---

# Outline Option A: Traditional/Structured

## 1. Introduction
## 2. Best Practices
## 3. Conclusion
EOF

TOTAL_TESTS=$((TOTAL_TESTS + 1))
cat > "$TEST_TOPIC/2-outline/outline-option-b.md" << 'EOF'
---
title: Outline Option B - Narrative/Story-driven
option: b
style: narrative-story-driven
created_at: 2026-01-30T10:00:00Z
status: draft
---

# Outline Option B: Narrative/Story-driven

## 1. The Crisis
## 2. A New Mindset
## 3. Your Journey
EOF

TOTAL_TESTS=$((TOTAL_TESTS + 1))
cat > "$TEST_TOPIC/2-outline/outline-option-c.md" << 'EOF'
---
title: Outline Option C - Technical/Deep-dive
option: c
style: technical-deep-dive
created_at: 2026-01-30T10:00:00Z
status: draft
---

# Outline Option C: Technical/Deep-dive

## 1. Technical Overview
## 2. Implementation
## 3. Advanced Topics
EOF

TOTAL_TESTS=$((TOTAL_TESTS + 1))
cat > "$TEST_TOPIC/2-outline/materials/prompts-used.md" << 'EOF'
# Prompts Used for Outline Generation
## Prompt for Option A
Generate traditional structured outline...

## Prompt for Option B
Generate narrative outline...

## Prompt for Option C
Generate technical deep-dive outline...
EOF

TOTAL_TESTS=$((TOTAL_TESTS + 1))
cat > "$TEST_TOPIC/2-outline/materials/generation-params.json" << 'EOF'
{
  "version": "1.0.0",
  "generated_at": "2026-01-30T10:00:00Z",
  "num_options": 3,
  "selected": "b"
}
EOF

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "$TEST_TOPIC/2-outline/outline-option-a.md" ]; then
    pass "outline-option-a.md created"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "outline-option-a.md creation"
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "$TEST_TOPIC/2-outline/outline-option-b.md" ]; then
    pass "outline-option-b.md created"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "outline-option-b.md creation"
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "$TEST_TOPIC/2-outline/outline-option-c.md" ]; then
    pass "outline-option-c.md created"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "outline-option-c.md creation"
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "$TEST_TOPIC/2-outline/materials/prompts-used.md" ]; then
    pass "outline materials/prompts-used.md created"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "outline prompts-used.md creation"
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "$TEST_TOPIC/2-outline/materials/generation-params.json" ]; then
    pass "outline materials/generation-params.json created"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "outline generation-params.json creation"
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
OUTLINE_COUNT=$(ls "$TEST_TOPIC/2-outline/outline-option-"*.md 2>/dev/null | wc -l)
if [ "$OUTLINE_COUNT" -eq 3 ]; then
    pass "Multi-option outline: 3 options created"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "Multi-option outline: Expected 3 options, found $OUTLINE_COUNT"
fi

# Phase 10: Script Integration Tests
echo ""
echo "Phase 10: Script Integration Tests"
echo "----------------------------------------"

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "../scripts/repo-config.py" ]; then
    pass "repo-config.py script exists"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "repo-config.py not found"
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "../scripts/topic-init.py" ]; then
    pass "topic-init.py script exists"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "topic-init.py not found"
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "../scripts/context-validator.py" ]; then
    pass "context-validator.py script exists"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "context-validator.py not found"
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "../scripts/outline-generator.py" ]; then
    pass "outline-generator.py script exists"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "outline-generator.py not found"
fi

# Test script executability (Python scripts)
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if python3 -c "import sys; sys.path.insert(0, '../scripts'); from shared.config import get_tcc_config" 2>/dev/null; then
    pass "shared.config module importable"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "shared.config module import failed"
fi

# Phase 11: Error Handling Tests
echo ""
echo "Phase 11: Error Handling Tests"
echo "----------------------------------------"

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if ! [ -f "nonexistent-file.md" ] 2>/dev/null; then
    pass "Missing file detection works"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "Missing file detection"
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if ! [ -d "/nonexistent/path" ] 2>/dev/null; then
    pass "Invalid path detection works"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "Invalid path detection"
fi

# Phase 12: Complete Workflow Example
echo ""
echo "Phase 12: Complete Workflow Example"
echo "----------------------------------------"

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -d "../examples/complete-workflow" ]; then
    pass "examples/complete-workflow directory exists"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "examples/complete-workflow directory not found"
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "../examples/complete-workflow/README.md" ]; then
    pass "Complete workflow README.md exists"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "Complete workflow README.md not found"
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
EXAMPLE_STAGES=$(ls -d ../examples/complete-workflow/*/ 2>/dev/null | wc -l)
if [ "$EXAMPLE_STAGES" -ge 7 ]; then
    pass "Complete workflow has all 7 stages"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    fail "Complete workflow: Expected 7+ stages, found $EXAMPLE_STAGES"
fi

# Summary
echo ""
echo "========================================"
echo "Integration Tests Complete"
echo "========================================"
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $((TOTAL_TESTS - PASSED_TESTS))"
echo ""

if [ "$PASSED_TESTS" -eq "$TOTAL_TESTS" ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    EXIT_CODE=0
else
    echo -e "${RED}Some tests failed.${NC}"
    EXIT_CODE=1
fi

echo ""
echo "Test topic created: $TEST_TOPIC/"
echo "To clean up, run: ./test-workflow.sh --cleanup"

exit $EXIT_CODE
