# Position Detection Guide

This guide details the position detection algorithms and heuristics used by the `wt:image-illustrator` skill.

## Detection Overview

The skill analyzes articles to identify three types of positions that would benefit from images:

1. **Abstract Concepts** - Complex ideas needing visual explanation
2. **Information-Dense Sections** - Data-heavy content needing visual organization
3. **Emotional Transitions** - Narrative flow needing visual breaks

## Abstract Concepts Detection

### Technical Jargon Indicators

**Pattern**: Domain-specific terminology without visual representation

**Detection Rules**:
```python
# Keywords suggesting abstract concepts
abstract_keywords = [
    "architecture", "pattern", "paradigm", "framework",
    "mechanism", "algorithm", "protocol", "model"
]

# Technical jargon patterns
technical_patterns = [
    r"[A-Z]{2,}",  # Acronyms (CAP, API, HTTP)
    r"\w+\s+pattern",  # Design patterns
    r"\w+\s+architecture",  # Architecture terms
]

# Check if section has jargon but no images
if contains_jargon(section) and not has_images(section):
    mark_for_illustration("abstract_concept")
```

**Examples**:
- "Microservices architecture pattern"
- "Event-driven messaging system"
- "Neural network backpropagation"
- "CAP theorem in distributed systems"

### Visual Need Indicators

**Complex Relationships**:
- Multiple components interacting
- Spatial relationships described in text
- Multi-step processes
- State transitions

**Example Text**:
```
"The API gateway routes requests to the appropriate service,
which then queries the database and returns the response..."
```
→ Needs: Architecture diagram showing the flow

## Information-Dense Detection

### Table Indicators

**Detection Rules**:
```python
# Large tables
if table_columns >= 3 and table_rows >= 5:
    mark_for_illustration("information_dense")

# Complex tables
if table_columns >= 5 or table_rows >= 10:
    priority = "high"
```

**Example**:
| Endpoint | Method | Auth | Rate Limit | Description |
|----------|--------|------|------------|-------------|
| /users | GET | Yes | 100/hour | Get all users |
| /users | POST | Yes | 50/hour | Create user |
| /users/{id} | GET | Yes | 100/hour | Get user by ID |
| /users/{id} | PUT | Yes | 50/hour | Update user |
| /users/{id} | DELETE | Yes | 20/hour | Delete user |

→ Needs: API reference diagram or flowchart

### List Indicators

**Detection Rules**:
```python
# Long lists
if list_items >= 5:
    mark_for_illustration("information_dense")

# Nested or complex lists
if has_nested_lists(list) or list_depth >= 2:
    priority = "medium"
```

**Example**:
```
Configuration options:
- timeout: Request timeout in seconds
- retry_max: Maximum retry attempts
- backoff_factor: Exponential backoff multiplier
- circuit_breaker: Enable circuit breaker
- cache_ttl: Cache time-to-live
...
(12+ items)
```
→ Needs: Configuration diagram or organized visual

### Code Block Indicators

**Detection Rules**:
```python
# Multiple consecutive code blocks
if consecutive_code_blocks >= 2:
    mark_for_illustration("information_dense")

# Long code without explanation
if code_lines >= 20 and surrounding_explanation < 100:
    mark_for_illustration("information_dense")
```

**Example**:
```python
# 40+ lines of configuration
# With minimal explanation
```
→ Needs: Code flow diagram or annotated screenshot

### Statistics Indicators

**Detection Rules**:
```python
# Performance metrics
if contains_metrics(section) or contains_benchmarks(section):
    mark_for_illustration("information_dense")

# Comparison data
if contains_comparison_table(section):
    priority = "high"
```

**Example**:
```
Performance comparison:
- Method A: 150ms average, 99.5th percentile: 450ms
- Method B: 120ms average, 99.5th percentile: 280ms
- Method C: 180ms average, 99.5th percentile: 520ms
```
→ Needs: Bar chart or performance graph

## Emotional Transition Detection

### Section Break Indicators

**Detection Rules**:
```python
# Major section breaks
if heading_level >= 2:  # ## or higher
    mark_for_illustration("emotional_transition")

# Topic changes
if topic_change_score(section_break) > threshold:
    priority = "medium"
```

**Example**:
```markdown
## Microservices Architecture

[Content about architecture...]

## API Gateway Patterns
^-- Position for transition image
```

### Tone Shift Indicators

**Detection Rules**:
```python
# Tone shift detection
previous_tone = analyze_tone(previous_section)
current_tone = analyze_tone(current_section)

if tone_distance(previous_tone, current_tone) > threshold:
    mark_for_illustration("emotional_transition")
```

**Tone Types**:
- `technical` - Formal, detailed, code-heavy
- `conversational` - Casual, stories, examples
- `instructional` - How-to, step-by-step
- `theoretical` - Abstract, conceptual

**Example**:
```
[Technical section with code examples]

---

## Real-World Example: Building a Todo App
^-- Tone shift: technical → conversational
```
→ Needs: Transition image (app screenshot or illustration)

### Narrative Indicators

**Detection Rules**:
```python
# Story sections
if has_story_markers(section):
    mark_for_illustration("emotional_transition")

# Case studies
if is_case_study(section):
    priority = "medium"
```

**Example**:
```
## Case Study: Scaling to 1M Users

When we started, our architecture was simple...
```
→ Needs: Architecture diagram or visual progression

## Position Scoring

Each detected position is scored based on:

```python
score = (
    position_type_weight * 0.4 +
    content_density * 0.3 +
    visual_need * 0.2 +
    section_importance * 0.1
)
```

**Weights by position type**:
- Abstract Concept: 0.9 (high priority)
- Information-Dense: 0.8 (high priority)
- Emotional Transition: 0.6 (medium priority)

**Selection**:
- Sort positions by score
- Select top N positions (configurable, default: 3-10)

## Detection Examples

### Example 1: Technical Article

**Article**: "Microservices Architecture Guide" (200 lines)

**Detected Positions**:
1. Line 45 - Abstract Concept (score: 0.92)
   - Text: "Microservices architecture pattern"
   - Reason: Technical jargon, no images
2. Line 80 - Information-Dense (score: 0.88)
   - Text: API endpoints table (7 columns)
   - Reason: Large table, complex data
3. Line 120 - Abstract Concept (score: 0.85)
   - Text: "Service discovery mechanism"
   - Reason: Complex concept, no visual
4. Line 150 - Emotional Transition (score: 0.65)
   - Text: Section break before "Best Practices"
   - Reason: Major heading change
5. Line 180 - Information-Dense (score: 0.82)
   - Text: Configuration options list (12 items)
   - Reason: Long list, needs organization

### Example 2: Tutorial

**Article**: "Getting Started with Docker" (150 lines)

**Detected Positions**:
1. Line 30 - Abstract Concept (score: 0.78)
   - Text: "Containerization concepts"
   - Reason: Abstract technical concept
2. Line 60 - Information-Dense (score: 0.75)
   - Text: Docker command reference table
   - Reason: 5-column reference table
3. Line 90 - Emotional Transition (score: 0.62)
   - Text: Section break to "Advanced Topics"
   - Reason: Major heading change
4. Line 120 - Abstract Concept (score: 0.72)
   - Text: "Docker networking"
   - Reason: Complex networking concept

## Implementation Notes

- Use natural language processing for tone detection
- Calculate content density by word/code/token counts
- Track section boundaries with heading levels
- Consider article length when setting min/max positions
