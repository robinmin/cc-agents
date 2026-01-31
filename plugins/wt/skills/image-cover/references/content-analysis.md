# Content Analysis Methodology

This guide details the content analysis process used by the `wt:image-cover` skill to extract relevant information from articles for cover generation.

## Analysis Pipeline

The content analysis follows a four-stage pipeline:

```
Article Input
    ↓
1. Title Extraction
    ↓
2. Theme Extraction
    ↓
3. Content Type Detection
    ↓
4. Style Selection
    ↓
Enhanced Prompt Output
```

## Stage 1: Title Extraction

### Extraction Priority Order

The title is extracted using the following priority order:

1. **Frontmatter** - Check for `title` field in YAML frontmatter
2. **First Heading** - Use first `#` heading in markdown content
3. **Filename** - Use filename without extension
4. **Default** - Use "Cover" if all else fails

### Implementation

```python
def extract_title(article_path: str) -> str:
    """Extract title from article using priority order."""
    # 1. Check frontmatter
    frontmatter = extract_yaml_frontmatter(article_path)
    if "title" in frontmatter:
        return frontmatter["title"]

    # 2. Check first heading
    content = read_markdown_content(article_path)
    first_heading = find_first_heading(content)
    if first_heading:
        return first_heading

    # 3. Use filename
    filename = os.path.basename(article_path)
    return os.path.splitext(filename)[0]

    # 4. Fallback to default
    return "Cover"
```

### Title Formatting

- Clean excess whitespace
- Remove markdown formatting (bold, italic)
- Limit to 80 characters for cover text overlay
- Truncate with ellipsis if too long

## Stage 2: Theme Extraction

### What to Extract

Analyze the article for these key elements:

| Element | Description | Example |
|---------|-------------|---------|
| **Keywords** | Frequently mentioned terms | "microservices", "API", "distributed" |
| **Key phrases** | Important multi-word concepts | "event-driven architecture", "circuit breaker" |
| **Tags** | Tags or categories from frontmatter | tags: [cloud, devops, kubernetes] |
| **Section headings** | Major section titles | "Scaling Strategies", "Fault Tolerance" |
| **Technical terms** | Domain-specific vocabulary | "CAP theorem", "eventual consistency" |
| **Domain vocabulary** | Industry-specific language | "CNCF", "service mesh", "sidecar" |

### Extraction Strategy

```python
def extract_themes(article_path: str) -> List[str]:
    """Extract key themes from article."""
    themes = []

    # 1. Extract from frontmatter tags/categories
    frontmatter = extract_yaml_frontmatter(article_path)
    if "tags" in frontmatter:
        themes.extend(frontmatter["tags"])

    # 2. Extract section headings (## and ###)
    content = read_markdown_content(article_path)
    headings = extract_headings(content, levels=[2, 3])
    themes.extend(headings)

    # 3. Extract technical terms using frequency analysis
    words = tokenize(content)
    technical_terms = filter_technical_terms(words)
    themes.extend(technical_terms[:5])  # Top 5

    # 4. Deduplicate and limit
    return list(set(themes))[:10]
```

### Theme Ranking

Themes are ranked by relevance:

1. **Explicit tags** - Highest priority (user-defined)
2. **Section headings** - High priority (structural)
3. **High-frequency technical terms** - Medium priority (statistical)
4. **General vocabulary** - Low priority (contextual)

## Stage 3: Content Type Detection

### Detection Heuristics

```python
def detect_content_type(article_path: str) -> str:
    """Detect content type using heuristics."""
    content = read_markdown_content(article_path)

    # Technical articles
    if has_code_blocks(content) and has_technical_terms(content):
        return "technical"

    # Tutorial content
    if has_step_by_step_structure(content):
        return "tutorial"

    # News articles
    if has_dateline(content) and has_formal_tone(content):
        return "news"

    # Default: blog
    return "blog"
```

### Content Type Characteristics

| Type | Indicators | Detection Rules |
|------|------------|-----------------|
| **technical** | Code blocks, technical terms | `contains(\`\`\`) AND contains(technical_vocab)` |
| **tutorial** | Step-by-step structure | `contains(/^##?\s*Step\s*\d+/i)` |
| **news** | Dateline, formal tone | `starts_with(date_location) AND formal_language` |
| **blog** | Personal pronouns, informal | First-person pronouns, informal language |

### Detection Code Examples

```python
# Technical article detection
def is_technical(content: str) -> bool:
    code_block_count = len(re.findall(r'```', content)) // 2
    technical_terms = ['API', 'HTTP', 'JSON', 'database', 'algorithm']
    term_count = sum(1 for term in technical_terms if term.lower() in content.lower())
    return code_block_count >= 2 and term_count >= 3

# Tutorial detection
def is_tutorial(content: str) -> bool:
    step_patterns = [
        r'^##?\s*Step\s*\d+',
        r'^\d+\.\s',
        r'First,.*Then,.*Finally'
    ]
    return any(re.search(pattern, content, re.MULTILINE | re.IGNORECASE)
               for pattern in step_patterns)

# News detection
def is_news(content: str) -> bool:
    # Has dateline like "January 15, 2024 —"
    has_dateline = bool(re.match(r'^[A-Z][a-z]+ \d{1,2}, \d{4}\s*[-–]', content))
    # Formal tone (few first-person pronouns)
    first_person = len(re.findall(r'\b(I|we|my|our)\b', content, re.IGNORECASE))
    word_count = len(content.split())
    formal_ratio = first_person / max(word_count, 1)
    return has_dateline and formal_ratio < 0.01
```

## Stage 4: Style Selection

### Style Mapping

Map detected content type to visual style:

| Content Type | Default Style | Rationale |
|--------------|---------------|-----------|
| `technical` | `technical-diagram` | Clean, precise, professional |
| `tutorial` | `tutorial` | Instructional, step-by-step cues |
| `news` | `news` | Professional, headline-focused |
| `blog` | `blog` | Engaging, personal, readable |
| `unknown` | `minimalist` | Safe, clean default |

### Override Behavior

User can override auto-detected style:

```bash
# Auto-detection (default)
wt:image-cover --article article.md --output cover.png

# Manual override
wt:image-cover --article article.md --style vibrant --output cover.png
```

## Prompt Enhancement

### Template Construction

```python
def build_enhanced_prompt(article_path: str, style: str, no_text: bool) -> str:
    """Build enhanced prompt from article analysis."""
    title = extract_title(article_path)
    themes = extract_themes(article_path)

    # Base prompt with title and themes
    prompt = f"{title}, {', '.join(themes[:5])}"

    # Add style-specific modifiers
    style_modifiers = get_style_modifiers(style)
    prompt += f", {style_modifiers}"

    # Add text overlay request
    if not no_text:
        prompt += f", with title text: '{title}'"

    return prompt
```

### Style Modifiers

| Style | Modifiers |
|-------|-----------|
| `technical` | "clean technical illustration, professional, precise, architectural diagram style" |
| `blog` | "engaging, readable, personal touch, modern blog aesthetic" |
| `tutorial` | "step-by-step visual cues, instructional, clear progression" |
| `news` | "professional, headline-focused, journalistic, clean" |
| `minimalist` | "clean, simple aesthetic, minimal elements" |

## Error Handling

### Article Not Found

```python
if not os.path.exists(article_path):
    return {
        "status": "error",
        "error": f"Article not found: {article_path}",
        "suggestion": "Check the article path and try again"
    }
```

### No Title Detected

When title extraction fails:

1. Log warning for debugging
2. Use filename without extension
3. Fall back to "Cover" as last resort
4. Continue with generation (don't fail)

### Empty Content

When article is empty or too short:

```python
word_count = len(content.split())
if word_count < 50:
    logger.warning(f"Article too short for analysis ({word_count} words)")
    # Use minimal themes
    themes = ["article", "cover"]
    content_type = "blog"
```

## Best Practices

1. **Always provide a fallback** - Never fail analysis completely
2. **Limit theme count** - 5-10 themes maximum for prompt clarity
3. **Preserve title integrity** - Clean but don't over-modify
4. **Log analysis results** - Store in `materials/analysis/` for debugging
5. **Allow user override** - Auto-detection is a suggestion, not requirement

## Debugging

### Enable Analysis Logging

```bash
# Analysis results stored in materials/
wt:image-cover --article article.md --output cover.png --debug

# Check analysis logs
cat skills/image-cover/materials/analysis/analysis-*.md
```

### Analysis Log Format

```markdown
# Content Analysis Log

**Article**: article.md
**Timestamp**: 2024-01-15T10:30:00Z

## Extraction Results

- **Title**: "Introduction to Microservices"
- **Content Type**: technical
- **Selected Style**: technical-diagram
- **Themes**: microservices, API, distributed systems, scalability, containers

## Detection Details

- Code blocks found: 8
- Technical terms: 42
- Section headings: 12
- Tags: [cloud, devops, architecture]

## Enhanced Prompt

"Introduction to Microservices, microservices, API, distributed systems, scalability, containers, clean technical illustration, professional, precise, architectural diagram style, with title text: 'Introduction to Microservices'"
```
