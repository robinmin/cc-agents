# Position Detection Guide

Complete reference for position detection algorithms used by the image illustrator skill.

## Overview

Position detection analyzes article content to identify optimal locations for images. The skill uses three position types, each with specific detection patterns and rationale.

## Three Position Types

### 1. Abstract Concepts

**Definition**: Complex ideas that need visual explanation.

**Detection Patterns**:

**Technical Jargon Indicators**:
- Domain-specific terminology (e.g., "CAP theorem", "neural backpropagation")
- Acronyms without prior explanation
- Theoretical concepts (e.g., "event sourcing", "CQRS")
- Architectural patterns (e.g., "circuit breaker", "Saga pattern")

**Visual Need Indicators**:
- No existing images in section
- Complex described relationships
- Multi-step processes
- Spatial relationships described in text

**Detection Algorithm**:

```python
def detect_abstract_concepts(section):
    """
    Detect if section contains abstract concepts needing visual explanation.
    """
    jargon_score = 0
    visual_need_score = 0

    # Check for technical jargon
    for sentence in section.sentences:
        if has_domain_specific_term(sentence):
            jargon_score += 1
        if has_acronym_without_definition(sentence):
            jargon_score += 1
        if has_theoretical_concept(sentence):
            jargon_score += 2

    # Check for visual need
    if not section.has_images():
        visual_need_score += 2
    if describes_complex_relationships(section):
        visual_need_score += 1
    if describes_spatial_relationships(section):
        visual_need_score += 1

    # Combined score threshold
    return (jargon_score >= 2) and (visual_need_score >= 2)
```

**Example Positions**:
- "Microservices architecture pattern"
- "Event-driven messaging system"
- "Neural network layers"
- "CAP theorem implications"

### 2. Information-Dense Sections

**Definition**: Charts, diagrams for data-heavy content.

**Detection Patterns**:

**Table Indicators**:
- Tables with 3+ columns
- Tables with 5+ rows
- Complex data relationships
- Multiple tables in proximity

**List Indicators**:
- Lists with 5+ items
- Nested lists
- Configuration options
- API parameters or methods

**Code Block Indicators**:
- Multiple consecutive code blocks
- Code without sufficient explanation
- Complex algorithm implementations

**Statistics Indicators**:
- Performance metrics
- Benchmark results
- Comparison data
- Quantitative analysis

**Detection Algorithm**:

```python
def detect_information_dense(section):
    """
    Detect if section has information-dense content needing visualization.
    """
    density_score = 0

    # Check for tables
    for table in section.tables:
        if table.columns >= 3:
            density_score += 1
        if table.rows >= 5:
            density_score += 1
        if table.has_complex_relationships():
            density_score += 1

    # Check for lists
    for list_item in section.lists:
        if list_item.item_count >= 5:
            density_score += 1
        if list_item.is_nested():
            density_score += 1

    # Check for code blocks
    if section.code_block_count >= 2:
        density_score += 2

    # Check for statistics
    if has_performance_metrics(section):
        density_score += 1
    if has_comparison_data(section):
        density_score += 1

    return density_score >= 3
```

**Example Positions**:
- Performance comparison tables
- Configuration options lists
- API endpoint specifications
- Benchmark results

### 3. Emotional Transitions

**Definition**: Visual breaks for narrative flow.

**Detection Patterns**:

**Section Break Indicators**:
- `##` or higher heading levels
- Major topic changes
- Shift in content type

**Tone Shift Indicators**:
- Technical → conversational transition
- Formal → informal transition
- Detailed → high-level transition

**Narrative Indicators**:
- Story sections in technical content
- Examples following theory
- Case studies after concepts

**Detection Algorithm**:

```python
def detect_emotional_transition(section, prev_section):
    """
    Detect if section marks an emotional/narrative transition.
    """
    transition_score = 0

    # Check for section breaks
    if section.heading_level >= 2:  # ## or higher
        transition_score += 1
    if section.is_major_topic_change(prev_section):
        transition_score += 1

    # Check for tone shifts
    if has_tone_shift(section, prev_section):
        transition_score += 2

    # Check for narrative markers
    if introduces_case_study(section):
        transition_score += 1
    if starts_story_section(section):
        transition_score += 1

    return transition_score >= 2

def has_tone_shift(current, previous):
    """Detect significant tone change between sections."""
    tone_keywords = {
        'technical': ['implementation', 'algorithm', 'configuration'],
        'conversational': ['story', 'example', 'imagine'],
        'formal': ['therefore', 'consequently', 'furthermore'],
        'informal': ['basically', 'essentially', 'pretty much']
    }

    current_tone = analyze_tone(current.text, tone_keywords)
    previous_tone = analyze_tone(previous.text, tone_keywords)

    return current_tone != previous_tone
```

**Example Positions**:
- Before major sections
- After technical deep-dives
- Introduction to new topics
- Summary/conclusion starts

## Position Scoring and Selection

### Scoring System

Each detected position receives a priority score:

```python
def score_position(position):
    """
    Calculate priority score for a position.
    Higher score = higher priority for image generation.
    """
    base_score = {
        'abstract_concept': 10,
        'information_dense': 8,
        'emotional_transition': 6
    }[position.type]

    # Adjust for section length
    if position.section_length > 500:
        base_score += 2
    elif position.section_length < 200:
        base_score -= 1

    # Adjust for existing images nearby
    nearby_images = count_nearby_images(position)
    base_score -= nearby_images * 2

    # Adjust for position in article
    if position.is_in_introduction:
        base_score += 1

    return base_score
```

### Selection Algorithm

```python
def select_positions(all_positions, min_count, max_count):
    """
    Select optimal positions from all detected positions.
    """
    # Score all positions
    scored = [(p, score_position(p)) for p in all_positions]
    scored.sort(key=lambda x: x[1], reverse=True)

    # Avoid clustering (minimum distance between positions)
    selected = []
    min_distance = 20  # lines

    for position, score in scored:
        if not too_close_to_selected(position, selected, min_distance):
            selected.append(position)
            if len(selected) >= max_count:
                break

    # Ensure minimum count
    if len(selected) < min_count:
        # Add more positions, relaxing distance constraint
        for position, score in scored[len(selected):]:
            selected.append(position)
            if len(selected) >= min_count:
                break

    return selected

def too_close_to_selected(position, selected, min_distance):
    """Check if position is too close to already selected positions."""
    for s in selected:
        if abs(position.line_number - s.line_number) < min_distance:
            return True
    return False
```

## Style Selection by Position Type

| Position Type | Recommended Style | Rationale |
|--------------|------------------|-----------|
| Abstract Concept | `technical-diagram` | Clear explanation of complex ideas |
| Information-Dense | `technical-diagram` or `sketch` | Visual organization of data |
| Emotional Transition | `minimalist` or `vibrant` | Visual interest without distraction |

## Position Detection Configuration

### Adjustable Parameters

```yaml
# Detection thresholds
jargon_threshold: 2              # Technical terms required
table_column_threshold: 3        # Columns for "dense" table
list_item_threshold: 5           # Items for "dense" list
heading_level_threshold: 2       # ## or higher for transitions

# Selection parameters
min_positions: 3                 # Minimum images to generate
max_positions: 10                # Maximum images to generate
min_position_distance: 20        # Lines between images

# Scoring weights
abstract_concept_weight: 10
information_dense_weight: 8
emotional_transition_weight: 6
```

## Position Output Format

Positions are stored in `materials/positions/positions-XXX.md`:

```markdown
---
article: /path/to/article.md
detected_at: 2026-01-29T12:00:00Z
total_positions: 7
selected_positions: 5
---

## Position 1

- **Line**: 45
- **Type**: abstract_concept
- **Section**: "## Microservices Architecture"
- **Score**: 12
- **Rationale**: Technical jargon density (3), no images in section (2)
- **Concept**: "Microservices architecture pattern"
- **Keywords**: ["microservices", "API gateway", "distributed systems"]

## Position 2

- **Line**: 80
- **Type**: information_dense
- **Section**: "## API Endpoints"
- **Score**: 10
- **Rationale**: 7-column table (3), nested list (1), multiple code blocks (2)
- **Content**: API endpoint reference table
- **Keywords**: ["REST", "API", "endpoints", "reference"]
```

## Troubleshooting Detection

### Too Few Positions Detected

1. **Lower detection thresholds**:
   - Reduce `jargon_threshold` to 1
   - Reduce `list_item_threshold` to 3

2. **Increase position limits**:
   - Set higher `max_positions`

3. **Check article content**:
   - Verify article has technical content
   - Check for tables/lists that should trigger detection

### Too Many Positions Detected

1. **Raise detection thresholds**:
   - Increase `jargon_threshold` to 3
   - Increase `list_item_threshold` to 7

2. **Reduce position limits**:
   - Set lower `max_positions`

3. **Increase minimum distance**:
   - Set higher `min_position_distance`

### Wrong Type Assigned

1. **Review detection patterns**
2. **Adjust scoring weights**
3. **Manually override position type** in positions file

## Integration with Generation

Position detection feeds directly into image generation:

1. **Analyze article** → Detect positions
2. **Generate prompts** → Based on position type and content
3. **Generate images** → Using position-appropriate styles
4. **Insert images** → At detected line numbers
5. **Track metadata** → In `captions.json`

For complete workflow details, see `references/workflows.md`.
