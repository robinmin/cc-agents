# Test Fixtures

This directory contains test fixtures for validating and testing the cc-magents skill.

## Directory Structure

```
test/
├── fixtures/           # Sample config files for different platforms
│   ├── agents-md-dev-agent.md
│   ├── claude-md-dev-agent.md
│   ├── cursorrules-dev-agent.md
│   └── gemini-md-dev-agent.md
├── expected/           # Expected outputs for validation
│   ├── validate-output.json
│   ├── evaluate-output.json
│   ├── adapt-output.json
│   └── adapt-all-output.json
└── README.md          # This file
```

## Fixtures

### agents-md-dev-agent.md

Universal AGENTS.md format - the canonical standard. This fixture tests:
- Section-based structure with identity, rules, tools, standards
- CRITICAL markers for safety rules
- Decision trees in tools section
- Anti-hallucination protocol
- Memory and evolution sections

### claude-md-dev-agent.md

Claude Code format (CLAUDE.md). This fixture tests:
- Similar structure with different formatting
- Platform-specific conventions
- Workflow sections
- Decision tree patterns

### cursorrules-dev-agent.md

Cursor format (.cursorrules). This fixture tests:
- Flattened structure
- Basic formatting
- Essential rules only
- Tier 2 platform support

### gemini-md-dev-agent.md

Gemini CLI format (GEMINI.md). This fixture tests:
- Different syntax conventions
- convention_workflow pattern
- save_memory section

## Expected Outputs

### validate-output.json

Expected validation result for `agents-md-dev-agent.md`:
- Valid: true
- No errors
- 12 sections detected
- Platform: agents-md

### evaluate-output.json

Expected evaluation result for `agents-md-dev-agent.md`:
- Grade: C (75%)
- Pass threshold: 75%
- Dimension scores:
  - Completeness: 85%
  - Specificity: 65%
  - Verifiability: 70%
  - Safety: 90%
  - Evolution-Readiness: 60%

### adapt-output.json

Expected adaptation result from CLAUDE.md to .cursorrules:
- Success: true
- Conversion warnings: hooks not portable

### adapt-all-output.json

Expected adaptation to all platforms:
- 3 successful conversions
- 1 info warning (globs not portable)

## Running Tests

```bash
# Validate a fixture
bun scripts/validate.ts scripts/test/fixtures/agents-md-dev-agent.md

# Evaluate a fixture
bun scripts/evaluate.ts scripts/test/fixtures/agents-md-dev-agent.md

# Adapt between platforms
bun scripts/adapt.ts scripts/test/fixtures/claude-md-dev-agent.md --to cursorrules

# Adapt to all platforms
bun scripts/adapt.ts scripts/test/fixtures/agents-md-dev-agent.md --to all --output scripts/test/fixtures/converted/
```
