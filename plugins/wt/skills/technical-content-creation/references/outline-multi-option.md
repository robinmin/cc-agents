# Stage 2: Multi-Option Outline Generation

Complete workflow documentation for generating and selecting outline options in Stage 2.

## Overview

Stage 2 generates 2-3 alternative outline options in parallel, allowing the user to select the most appropriate structure for their content. This provides flexibility and choice in content creation.

**Key Principle**: All options are based on the same research brief, but use different structural approaches to suit different content goals and audiences.

## Outline Options

| Option | Style/Approach      | Description                          | Best For                          |
|--------|---------------------|--------------------------------------|-----------------------------------|
| A      | Traditional/Structured | Hierarchical, logical progression   | Technical documentation, tutorials |
| B      | Narrative/Story-driven | Storytelling, engaging flow         | Blog posts, opinion pieces        |
| C      | Technical/Deep-dive   | Comprehensive, detail-oriented      | In-depth guides, reference docs   |

### Option A: Traditional/Structured

**Characteristics:**
- Hierarchical structure with clear sections
- Logical progression from fundamentals to advanced topics
- Formal, organized presentation
- Focus on clarity and completeness

**Best Use Cases:**
- Technical tutorials and how-to guides
- Documentation that needs to be referenceable
- Educational content with clear learning objectives
- Professional whitepapers

**Structure Example (Long Form):**
```
1. Introduction
   - Overview
   - Why this matters
   - Who this is for

2. Background
   - Historical context
   - Current state

3. Core Topic 1
4. Core Topic 2
5. Core Topic 3

6. Best Practices
7. Common Pitfalls

8. Conclusion
```

### Option B: Narrative/Story-driven

**Characteristics:**
- Storytelling approach with engaging hooks
- Real-world scenarios and examples
- Conversational tone
- Focus on reader engagement

**Best Use Cases:**
- Blog posts and articles
- Opinion pieces and thought leadership
- Content for social media platforms
- Case studies with human elements

**Structure Example (Long Form):**
```
1. The Hook
   - A compelling story
   - Why you should care

2. Setting the Scene
   - The challenge
   - The opportunity

3. The Journey Begins
4. Exploring Theme 1
5. Exploring Theme 2
6. Exploring Theme 3

7. The Turning Point
   - Key insights

8. The Takeaway
   - Lessons learned
   - Call to action
```

### Option C: Technical/Deep-dive

**Characteristics:**
- Comprehensive coverage of all aspects
- Technical depth and detail
- Advanced topics and edge cases
- Focus on thoroughness

**Best Use Cases:**
- In-depth technical guides
- Reference documentation
- Architecture specifications
- Advanced developer resources

**Structure Example (Long Form):**
```
1. Technical Overview
   - Definition
   - Architecture/components
   - Prerequisites

2. Deep Dive: Foundations
   - Underlying mechanisms
   - Specifications
   - Standards

3. Implementation Details
4. Theme 1: Technical Analysis
5. Theme 2: Technical Analysis
6. Theme 3: Technical Analysis

7. Advanced Topics
   - Optimization
   - Scalability

8. Technical Summary
   - Best practices
   - Common pitfalls
```

## Workflow Process

### Step 1: Read Research Brief

The workflow begins by reading the research brief from `1-research/research-brief.md`. This brief contains:

- Executive summary of research findings
- Key themes and topics discovered
- Evidence quality assessment
- Source materials used

**Research Brief Frontmatter Example:**
```yaml
---
title: Research Brief: AI Coding Best Practices
source_materials: 0-materials/materials-extracted.md
research_type: systematic
time_range: 2024-2026
topics:
  - ai coding assistants
  - best practices
  - code review
  - security
  - productivity
created_at: 2026-01-28T10:00:00Z
status: draft
confidence: HIGH
sources_count: 5
---
```

### Step 2: Generate Outline Options in Parallel

Using the `outline-generator.py` script, generate 2-3 outline options simultaneously:

```bash
# Generate 3 options with interactive selection
python3 scripts/outline-generator.py --options 3 --length long --interactive

# Generate 2 options without interactive selection
python3 scripts/outline-generator.py --options 2 --length short
```

**Script Features:**
- Reads research brief automatically from current topic folder
- Generates distinct outline options based on style templates
- Saves each option to `2-outline/outline-option-{a,b,c}.md`
- Stores generation materials for traceability

### Step 3: Store Generation Materials

The script automatically saves generation materials to `2-outline/materials/`:

**`prompts-used.md`** - Contains the prompts used for each option:
```markdown
# Outline Generation Prompts

**Generated**: 2026-01-28T10:00:00Z
**Research Brief**: 1-research/research-brief.md
**Topic**: AI Coding Best Practices
**Length**: long

---

## Option A: Traditional/Structured

**Style ID**: traditional-structured
**Description**: Hierarchical, logical progression

**Prompt Template**:
```
Generate a traditional, structured outline for "{topic}"...
[Template content]
```

**Actual Prompt Used**:
```
Generate a traditional, structured outline for "AI Coding Best Practices"...
[Actual prompt with topic and research brief path]
```
```

**`generation-params.json`** - Contains generation parameters:
```json
{
  "generated_at": "2026-01-28T10:00:00Z",
  "topic": "AI Coding Best Practices",
  "length": "long",
  "options_generated": ["a", "b", "c"],
  "source_research": "1-research/research-brief.md",
  "styles": [
    {"option": "a", "name": "Traditional/Structured", "id": "traditional-structured"},
    {"option": "b", "name": "Narrative/Story-driven", "id": "narrative-story-driven"},
    {"option": "c", "name": "Technical/Deep-dive", "id": "technical-deep-dive"}
  ],
  "research_brief_frontmatter": {
    "title": "Research Brief: AI Coding Best Practices",
    "confidence": "HIGH",
    "sources_count": 5
  }
}
```

**Purpose of Materials:**
- **Traceability** - Track what prompts generated each option
- **Debugging** - Understand generation parameters when iterating
- **Transparency** - Show users how options were generated
- **Learning** - Learn what prompts work best for future content

### Step 4: Present Options to User

The script presents options with descriptions:

```
Outline Options Generated:

  [Option A] Traditional/Structured
               Hierarchical, logical progression
               Best for: Technical documentation, tutorials

  [Option B] Narrative/Story-driven
               Storytelling, engaging flow
               Best for: Blog posts, opinion pieces

  [Option C] Technical/Deep-dive
               Comprehensive, detail-oriented
               Best for: In-depth guides, reference docs

Which outline option would you like to approve?
Please enter your selection (a, b, or c):
```

### Step 5: User Selection

In interactive mode, the user selects their preferred option. The selection is made via the `AskUserQuestion` tool when used from within an agent context.

**User Selection Prompts:**
```
Which outline option would you like to approve?

[Option A] Traditional/Structured - Hierarchical, logical progression
[Option B] Narrative/Story-driven - Storytelling, engaging flow
[Option C] Technical/Deep-dive - Comprehensive, detail-oriented
```

### Step 6: Copy to Approved Outline

Once selected, the chosen option is copied to `2-outline/outline-approved.md` with updated frontmatter:

```yaml
---
title: Outline Approved: AI Coding Best Practices
source_research: 1-research/research-brief.md
selected_option: b
selected_style: narrative-story-driven
approved_at: 2026-01-28T10:30:00Z
approved_by: user
status: approved
confidence: HIGH
---
```

## Output File Structure

```
2-outline/
├── outline-option-a.md      # Option A: Traditional/Structured
├── outline-option-b.md      # Option B: Narrative/Story-driven
├── outline-option-c.md      # Option C: Technical/Deep-dive
├── outline-approved.md      # User-selected approved outline
└── materials/
    ├── prompts-used.md      # Prompts for each option
    └── generation-params.json  # Generation parameters
```

## Frontmatter Format

### Outline Option Files

Each generated outline option includes frontmatter:

```yaml
---
title: Outline Option A - Traditional/Structured
source_research: 1-research/research-brief.md
option: a
style: traditional-structured
created_at: 2026-01-28T10:00:00Z
status: draft
confidence: HIGH
---
```

**Fields:**
- `title` - Descriptive title including style name
- `source_research` - Path to research brief
- `option` - Option identifier (a, b, or c)
- `style` - Style identifier
- `created_at` - ISO 8601 timestamp
- `status` - Always "draft" for options
- `confidence` - Confidence level (HIGH/MEDIUM/LOW)

### Approved Outline File

The approved outline has updated frontmatter:

```yaml
---
title: Outline Approved: [Topic]
source_research: 1-research/research-brief.md
selected_option: b
selected_style: narrative-story-driven
approved_at: 2026-01-28T10:30:00Z
approved_by: [user]
status: approved
confidence: HIGH
---
```

**Additional Fields:**
- `selected_option` - Which option was selected
- `selected_style` - Style ID of selected option
- `approved_at` - When approval occurred
- `approved_by` - Who approved (user or agent name)
- `status` - Set to "approved"

## Command-Line Interface

The `outline-generator.py` script provides a full CLI:

### Generate Options

```bash
# Interactive mode (default 3 options, long form)
python3 scripts/outline-generator.py --interactive

# Custom number of options
python3 scripts/outline-generator.py --options 2 --interactive

# Short form outlines
python3 scripts/outline-generator.py --length short --interactive

# Non-interactive (generate only, no selection prompt)
python3 scripts/outline-generator.py --options 3 --length long
```

### Approve Option (Non-Interactive)

```bash
# Approve a specific option
python3 scripts/outline-generator.py --approve b

# Approve with custom approver name
python3 scripts/outline-generator.py --approve a --approved-by "Jane Doe"
```

### List Options

```bash
# List all existing outline options
python3 scripts/outline-generator.py --list
```

**Output:**
```
Outline Options:

  [Option A] traditional-structured
               Status: draft
  [Option B] narrative-story-driven
               Status: draft
  [Option C] technical-deep-dive
               Status: draft

  Approved: Option B
```

### Command Reference

| Argument | Short | Description | Default |
|----------|-------|-------------|---------|
| `--options` | `-o` | Number of options (2 or 3) | 3 |
| `--length` | `-l` | Outline length (short/long) | long |
| `--interactive` | `-i` | Enable interactive selection | False |
| `--approve` | | Approve specific option (a/b/c) | |
| `--list` | | List existing options | |
| `--confidence` | `-c` | Confidence level | MEDIUM |
| `--approved-by` | | Approver name | user |

## Usage from Agent

When invoking from within the technical-content-creation skill or an agent:

### Interactive Mode

```python
# The agent uses AskUserQuestion to present options
prompt = """Which outline option would you like to approve?

[Option A] Traditional/Structured - Hierarchical, logical progression
[Option B] Narrative/Story-driven - Storytelling, engaging flow
[Option C] Technical/Deep-dive - Comprehensive, detail-oriented"""

selection = AskUserQuestion(prompt, options=["a", "b", "c"])

# Then copy the selected option to approved
```

### Non-Interactive Mode

```bash
# Generate options first
python3 scripts/outline-generator.py --options 3

# Later, approve the selected option
python3 scripts/outline-generator.py --approve b
```

## Traceability and Debugging

### Materials Storage

All generation materials are stored in `2-outline/materials/` for:

1. **Traceability** - See exactly what prompts generated each option
2. **Debugging** - Understand why certain outlines were generated
3. **Iteration** - Learn from previous generations to improve prompts
4. **Transparency** - Provide visibility into the generation process

### Reviewing Prompts

To see what prompts were used:

```bash
# View prompts used
cat 2-outline/materials/prompts-used.md

# View generation parameters
cat 2-outline/materials/generation-params.json
```

### Regenerating Options

If options need to be regenerated:

1. Save existing options for comparison:
   ```bash
   mv 2-outline/outline-option-a.md 2-outline/outline-option-a.old.md
   ```

2. Run generator again:
   ```bash
   python3 scripts/outline-generator.py --options 3
   ```

3. Compare old vs new to evaluate prompt changes

### Debug Common Issues

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| Script can't find research brief | Not in topic folder | Run from within a topic directory |
| Options look similar | Prompts not differentiated | Check `materials/prompts-used.md` for prompt differences |
| Confidence level wrong | Default is MEDIUM | Use `--confidence HIGH` flag |
| Can't approve option | Option file doesn't exist | Run list command to verify options |

## Integration with Workflow

### Stage 1 Prerequisites

Before running Stage 2, ensure Stage 1 is complete:

- `1-research/research-brief.md` exists
- Research brief has proper frontmatter
- Confidence level is set appropriately

### Stage 3 Handoff

After Stage 2 completes:

- `2-outline/outline-approved.md` is the input for Stage 3
- Approved outline contains all metadata needed for draft generation
- Materials folder preserves generation history

### Full Workflow Example

```bash
# Stage 0: Extract materials (already done)
# Stage 1: Research (already done)

# Stage 2: Generate outline options
python3 scripts/outline-generator.py --options 3 --length long --interactive

# Stage 3: Write draft from approved outline
python3 scripts/draft-writer.py --source 2-outline/outline-approved.md --style technical-writer
```

## Best Practices

### Choosing Number of Options

| Use Case | Recommended Options | Reason |
|----------|---------------------|--------|
| First time topic | 3 options | Maximum choice to find best fit |
| Follow-up content | 2 options | Faster, reuse known preferences |
| Tight deadline | 2 options | Reduce review time |
| Exploratory content | 3 options | Test different approaches |

### Selecting Outline Length

| Length | Sections | Best For |
|--------|----------|----------|
| `short` | 3-5 | Blog posts, quick tutorials, social media |
| `long` | 8+ | Long-form articles, comprehensive guides, documentation |

### Setting Confidence Level

| Level | Use When | Example |
|-------|----------|---------|
| HIGH | Strong primary sources, verified claims | Official documentation, peer-reviewed research |
| MEDIUM | Multiple decent sources, some synthesis | Industry blogs, aggregated content |
| LOW | Limited sources, uncertain claims | Emerging topics, speculative content |

## References

- **SKILL.md** - Main skill documentation
- **references/stage-details.md** - Detailed stage specifications
- **scripts/outline-generator.py** - Implementation script
- **assets/sample_repository/collections/test-topic-001/2-outline/** - Example outputs
