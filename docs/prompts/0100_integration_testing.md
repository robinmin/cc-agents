---
name: integration testing
description: Create test workflow to verify end-to-end Technical Content Workflow system
status: Done
created_at: 2026-01-28
updated_at: 2026-01-28
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
dependencies: [0091, 0092, 0093, 0094, 0095, 0096, 0097, 0098, 0099]
tags: [wt-plugin, testing, technical-content-workflow, integration]
---

## 0010. Integration Testing

### Background

Integration testing validates that all Technical Content Workflow commands work together correctly in an end-to-end workflow. This task creates a comprehensive test workflow that:
1. Verifies folder structure compliance
2. Tests file path handling across all commands
3. Validates command output quality
4. Ensures smooth workflow transitions between stages

This task depends on all other tasks (0001-0009) being completed first.

### Requirements

**Functional Requirements:**
- Create test topic with representative content
- Test full workflow: materials -> research -> outline -> draft -> illustration -> adaptation -> publish
- Verify file path handling across all commands
- Validate output quality at each stage
- Test error handling and edge cases

**Non-Functional Requirements:**
- Tests must be repeatable and automated
- Tests must not require external API calls (mock where needed)
- Test results must be documented and reproducible
- Tests must cover both success and error paths

**Acceptance Criteria:**
- [ ] Test topic created with all stage folders
- [ ] End-to-end workflow tested from materials to publish
- [ ] File path handling verified for all commands
- [ ] Folder structure compliance validated
- [ ] Command output quality assessed
- [ ] Error handling tested for missing files, invalid inputs
- [ ] Test results documented in TEST_RESULTS.md

### Design

**Test Workflow Overview:**

```
Phase 1: Setup
  - Create test topic using /wt:topic-init
  - Verify folder structure

Phase 2: Materials Stage (0)
  - Create sample materials file
  - Test /wt:info-seek --save
  - Verify 0-materials/materials-extracted.md

Phase 3: Research Stage (1)
  - Create sample research brief
  - Test /wt:info-research --file
  - Verify 1-research/research-brief.md

Phase 4: Outline Stage (2)
  - Test /wt:outline with --length short
  - Test /wt:outline with --length long
  - Verify 2-outline/outline-draft.md

Phase 5: Draft Stage (3)
  - Test /wt:style-apply --file
  - Verify 3-draft/draft-article.md

Phase 6: Illustration Stage (4)
  - Test /wt:generate-image (mock)
  - Verify 4-illustration/images/

Phase 7: Adaptation Stage (5)
  - Test /wt:adapt --platform twitter
  - Test /wt:adapt --platform linkedin
  - Test /wt:adapt --platform devto
  - Verify 5-adaptation/article-*.md

Phase 8: Publish Stage (6)
  - Test /wt:publish --platform blog (--dry-run)
  - Test /wt:publish --platform twitter (clipboard mock)
  - Verify 6-publish/article.md
  - Verify publish-log.json

Phase 9: Error Handling Tests
  - Missing input files
  - Invalid paths
  - Invalid parameters
  - Missing folders

Phase 10: Results Documentation
  - Compile test results
  - Document any failures
  - Provide recommendations
```

**Test Topic Structure:**

```
test-topic-001/
├── 0-materials/
│   ├── materials.json
│   ├── sample-source.md
│   └── materials-extracted.md (generated)
├── 1-research/
│   ├── sources.json
│   └── research-brief.md (generated)
├── 2-outline/
│   ├── outline-draft.md (generated)
│   └── outline-approved.md (manual)
├── 3-draft/
│   ├── draft-article.md (generated)
│   └── draft-revisions/
├── 4-illustration/
│   ├── images/
│   └── captions.json
├── 5-adaptation/
│   ├── article-twitter.md (generated)
│   ├── article-linkedin.md (generated)
│   └── article-devto.md (generated)
├── 6-publish/
│   ├── published/
│   ├── article.md (generated)
│   └── publish-log.json (generated)
├── metadata.yaml
└── publish-log.json
```

**Test Scenarios:**

| Scenario | Input | Expected Output | Validation |
|----------|-------|-----------------|------------|
| Topic Init | "test-topic" | All folders created | Folder count = 7 |
| Info Seek --save | sample.pdf | materials-extracted.md | File exists, frontmatter correct |
| Info Research --file | materials-extracted.md | research-brief.md | File exists, sources indexed |
| Outline --length short | research-brief.md | outline-draft.md | Sections = 3-5 |
| Outline --length long | research-brief.md | outline-draft.md | Sections = 8+, subsections |
| Style Apply --file | outline-approved.md | draft-article.md | File exists, frontmatter correct |
| Generate Image | "diagram prompt" | image file | File exists in images/ |
| Adapt --platform twitter | draft-article.md | article-twitter.md | Character count < 280 |
| Adapt --platform linkedin | draft-article.md | article-linkedin.md | Format correct |
| Publish --dry-run blog | draft-article.md | No git changes | Dry-run reported |
| Error: Missing file | missing.md | Error message | Appropriate error |
| Error: Missing folder | Wrong path | Error message | Appropriate error |

**Test Script Structure:**

```bash
#!/bin/bash
# test-workflow.sh - Integration test script for Technical Content Workflow

set -e  # Exit on error

echo "========================================"
echo "Technical Content Workflow - Integration Tests"
echo "========================================"

# Configuration
TEST_TOPIC="test-topic-001"
TEST_COLLECTION="test-collection"
RESULTS_FILE="TEST_RESULTS.md"

# Phase 1: Setup
echo ""
echo "Phase 1: Setup"
echo "----------------------------------------"
./wt:topic-init --collection "$TEST_COLLECTION" "$TEST_TOPIC"
# Verify folders exist

# Phase 2: Materials
echo ""
echo "Phase 2: Materials Stage"
echo "----------------------------------------"
# Create sample source
echo "# Sample Source" > "$TEST_TOPIC/0-materials/sample-source.md"
./wt:info-seek "$TEST_TOPIC/0-materials/sample-source.md" --save
# Verify output

# Phase 3: Research
echo ""
echo "Phase 3: Research Stage"
echo "----------------------------------------"
./wt:info-research --file "$TEST_TOPIC/0-materials/materials-extracted.md"
# Verify output

# Phase 4: Outline
echo ""
echo "Phase 4: Outline Stage"
echo "----------------------------------------"
./wt:outline "$TEST_TOPIC/1-research/research-brief.md" --length short
./wt:outline "$TEST_TOPIC/1-research/research-brief.md" --length long
# Verify outputs

# ... additional phases

echo ""
echo "========================================"
echo "Integration Tests Complete"
echo "========================================"
```

### Plan

**Phase 1: Test Infrastructure**
- [ ] Create test topic template
- [ ] Create sample source files for testing
- [ ] Create expected output templates
- [ ] Write test script (test-workflow.sh)

**Phase 2: Stage-by-Stage Testing**
- [ ] Test Phase 1: Topic Init (Task 0009)
- [ ] Test Phase 2: Materials Stage (Task 0006)
- [ ] Test Phase 3: Research Stage (Task 0007)
- [ ] Test Phase 4: Outline Stage (Task 0002)
- [ ] Test Phase 5: Draft Stage (Task 0008)
- [ ] Test Phase 6: Illustration Stage (Task 0004)
- [ ] Test Phase 7: Adaptation Stage (Task 0003)
- [ ] Test Phase 8: Publish Stage (Task 0005)

**Phase 3: Error Handling Tests**
- [ ] Test missing input files
- [ ] Test invalid file paths
- [ ] Test invalid command parameters
- [ ] Test missing folder structures
- [ ] Test edge cases

**Phase 4: Quality Assessment**
- [ ] Review output file quality
- [ ] Validate frontmatter completeness
- [ ] Check file path consistency
- [ ] Verify JSON/YAML validity

**Phase 5: Results Documentation**
- [ ] Compile test results
- [ ] Document test coverage
- [ ] Note any failures or issues
- [ ] Provide recommendations
- [ ] Create TEST_RESULTS.md

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Test Script | test-workflow.sh | This task | 2026-01-28 |
| Test Topic | test-topic-001/ | Test script | 2026-01-28 |
| Test Results | TEST_RESULTS.md | This task | 2026-01-28 |
| Sample Source | test-topic-001/0-materials/sample-source.md | Test script | 2026-01-28 |

### References

- [Task 0001](/docs/prompts/0001_repository_structure_setup.md) - Folder structure prerequisite
- [Task 0002](/docs/prompts/0002_create_wt-outline_command.md) - Command to test
- [Task 0003](/docs/prompts/0003_create_wt-adapt_command.md) - Command to test
- [Task 0004](/docs/prompts/0004_create_wt-generate-image_command.md) - Command to test
- [Task 0005](/docs/prompts/0005_create_wt-publish_command.md) - Command to test
- [Task 0006](/docs/prompts/0006_enhance_wt-info-seek_command.md) - Command to test
- [Task 0007](/docs/prompts/0007_enhance_wt-info-research_command.md) - Command to test
- [Task 0008](/docs/prompts/0008_enhance_wt-style-apply_command.md) - Command to test
- [Task 0009](/docs/prompts/0009_create_topic_init_helper.md) - Command to test
