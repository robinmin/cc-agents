# Behavioral Test Scenario Schema

This document describes the `tests/scenarios.yaml` format for defining behavioral test scenarios in cc-skills.

## Overview

The scenario schema provides a standardized format for documenting expected skill behaviors, enabling:
- Behavioral readiness evaluation
- Test coverage tracking
- Skill quality assessment
- Automated validation

## Schema Location

- **YAML Schema**: `references/scenario-schema.yaml`
- **Reference File**: `tests/scenarios.yaml` (per skill)

## Quick Example

```yaml
version: "1.0"
scenarios:
  - name: "Basic skill invocation"
    input: "Use the skill for code generation"
    expected_behaviors:
      - "Skill recognizes code generation request"
      - "Skill provides code generation guidance"
    anti_behaviors:
      - "Skill returns unrelated content"
    difficulty: beginner
    tags: [basic, code-generation]

  - name: "Error handling"
    input: "Invalid input provided"
    expected_behaviors:
      - "Skill provides specific error guidance"
      - "Skill suggests valid alternatives"
    difficulty: intermediate
    tags: [error, recovery]
```

## Field Definitions

### Root Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | No | Schema version (default: "1.0") |
| `scenarios` | array | Yes | List of test scenarios |

### Scenario Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable scenario name |
| `input` | string | Yes | Expected input/trigger for the skill |
| `expected_behaviors` | array | Yes | Behaviors that SHOULD occur |
| `anti_behaviors` | array | No | Behaviors that SHOULD NOT occur |
| `difficulty` | enum | No | Skill level (beginner/intermediate/advanced) |
| `tags` | array | No | Categorization tags |

## Difficulty Levels

| Level | Description | Weight |
|-------|-------------|--------|
| `beginner` | Basic scenario, any skill user should handle | 1.0x |
| `intermediate` | Moderate complexity, requires experience | 1.2x |
| `advanced` | Complex scenario, requires expert knowledge | 1.5x |

## Scenario Minimums by Skill Type

| Skill Type | Minimum Scenarios | Description |
|------------|-------------------|-------------|
| `technique` | 3 | Specific technical techniques |
| `pattern` | 2 | Common usage patterns |
| `reference` | 2 | Reference documentation |
| `workflow` | 4 | Multi-step workflows |
| `default` | 2 | Fallback for unspecified types |

## Best Practices

### Write Clear Inputs

```yaml
# Good - specific and actionable
input: "Convert this Python dict to JSON with pretty formatting"

# Bad - vague and unclear
input: "Do something with data"
```

### Define Both Behaviors and Anti-Behaviors

```yaml
expected_behaviors:
  - "Provides JSON conversion with indent=2"
  - "Handles nested structures correctly"

anti_behaviors:
  - "Returns raw string without formatting"
  - "Throws unhandled exception on None values"
```

### Use Tags for Filtering

```yaml
tags: [json, formatting, error-handling, advanced]
```

This enables:
- Finding all error-handling scenarios
- Filtering by skill type
- Organizing by complexity

## Integration with Evaluators

### BehavioralReadinessEvaluator

The `BehavioralReadinessEvaluator` checks for:
- Presence of `tests/scenarios.yaml`
- Number of scenarios vs. minimum threshold
- Difficulty variety
- Anti-behavior coverage

### BehavioralEvaluator (LLM-as-Judge)

For deep evaluation, the `BehavioralEvaluator` uses rubric-based scoring:
- `scenario_presence`: File exists with valid content (25%)
- `scenario_quality`: Clarity and completeness (35%)
- `behavioral_coverage`: Difficulty range (25%)
- `anti_patterns`: Error/edge case documentation (15%)

## Example: Complete Scenario File

```yaml
version: "1.0"
scenarios:
  - name: "Skill invocation with trigger phrases"
    input: "Use the skill for JSON serialization"
    expected_behaviors:
      - "Skill description includes JSON serialization"
      - "Skill triggers on serialization-related keywords"
      - "Skill provides Python json module guidance"
    anti_behaviors:
      - "Skill fails to recognize serialization request"
    difficulty: beginner
    tags: [json, serialization, python, basic]

  - name: "Error recovery for invalid input"
    input: "Serialize circular reference"
    expected_behaviors:
      - "Skill explains circular reference concept"
      - "Skill suggests circularref encoder"
      - "Skill provides working code example"
    anti_behaviors:
      - "Returns cryptic recursion error"
      - "Silent failure without guidance"
    difficulty: advanced
    tags: [error, circular-reference, python, advanced]

  - name: "Edge case: datetime serialization"
    input: "Serialize datetime object to JSON"
    expected_behaviors:
      - "Skill provides default JSON serializer approach"
      - "Skill mentions isoformat() method"
      - "Skill shows custom JSONEncoder example"
    difficulty: intermediate
    tags: [datetime, json, python, edge-case]
```

## Validation

### Schema Validation

The schema is defined in `references/scenario-schema.yaml` and can be used for validation:

```python
import yaml
from jsonschema import validate

with open("references/scenario-schema.yaml") as f:
    schema = yaml.safe_load(f)

with open("tests/scenarios.yaml") as f:
    data = yaml.safe_load(f)

validate(instance=data, schema=schema)
```

### CLI Validation

```bash
# Validate a single skill's scenarios
python -c "
from evaluators.behavioral import ScenarioParser
with open('tests/scenarios.yaml') as f:
    content = f.read()
result = ScenarioParser.parse(content)
if result.errors:
    print('Errors:', result.errors)
else:
    print(f'Valid: {len(result.scenarios)} scenarios')
"
```

## See Also

- [BehavioralReadinessEvaluator](../scripts/evaluators/behavioral_readiness.py)
- [BehavioralEvaluator](../scripts/evaluators/behavioral.py)
- [Evaluation Framework](./evaluation.md)
- [Rubric-based Scoring](./evaluation.md#rubric-based-scoring)
