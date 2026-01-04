---
description: Apply a saved writing style profile to content generation
allowed-tools: Read, Write, Edit
argument-hint: <profile_id> [content_topic]
---

# Style Apply - Use Saved Writing Style Profile

## Purpose

Apply a previously extracted writing style profile to generate new content or rewrite existing content in that style.

## Usage

```bash
# List available style profiles
/wt:style-apply --list

# Apply style to new content
/wt:style-apply {profile_id} "topic to write about"

# Rewrite existing content using style
/wt:style-apply {profile_id} --file path/to/content.md

# Preview style profile
/wt:style-apply {profile_id} --preview
```

## Parameters

- `profile_id`: The unique identifier from a saved style profile
- `content_topic`: Optional topic/prompt for new content generation
- `--list`: List all available style profiles
- `--file <path>`: Path to existing content to rewrite in the style
- `--preview`: Display the style profile without generating content

## Workflow

### Option 1: List Profiles (`--list`)

1. Read `~/.claude/wt/styles/registry.json`
2. Display formatted table:
   ```
   📚 Available Style Profiles

   ID                          | Author    | Confidence | Tags
   ----------------------------|-----------|------------|------------------
   technical-blogger-casual    | John Doe  | High       | developer, casual
   academic-researcher-formal  | Unknown   | Medium     | academic, formal

   Usage: /wt:style-apply {profile_id} "your topic"
   ```

### Option 2: Preview Profile (`--preview`)

1. Validate profile_id exists in registry
2. Read `~/.claude/wt/styles/{profile_id}.style.md`
3. Display complete profile to user
4. Show usage examples

### Option 3: Generate New Content

**Step 1: Load Style Profile**
1. Validate profile_id exists in `~/.claude/wt/styles/registry.json`
2. Read `~/.claude/wt/styles/{profile_id}.style.md`
3. Extract all style instructions from the profile
4. If profile not found, error: "Profile '{profile_id}' not found. Use --list to see available profiles."

**Step 2: Compose Generation Prompt**

Internally construct a prompt combining:
```
You must write about the following topic using the EXACT style defined below.

## Topic
{content_topic or file content}

## Writing Style Instructions
{Complete content from the style profile, excluding YAML frontmatter and source samples}

## Requirements
- Follow ALL syntax, vocabulary, tone, and formatting rules from the style profile
- Maintain the specified burstiness, sentence patterns, and voice distribution
- Use the signature transitions and domain terminology
- Match the punctuation personality and rhetorical patterns
- Apply the formatting preferences

Now write about the topic in this style.
```

**Step 3: Generate Content**

Execute the generation and present result to user.

**Step 4: Offer Actions**

After generation, use AskUserQuestion:
- Save to file
- Iterate/refine
- Generate more content in same style
- Done

### Option 4: Rewrite Existing Content (`--file`)

**Step 1: Load Inputs**
1. Load style profile (same as Option 3, Step 1)
2. Read existing content from specified file path
3. Validate file exists and is readable

**Step 2: Compose Rewrite Prompt**

```
Rewrite the following content using the EXACT style defined below.

## Original Content
{file content}

## Writing Style Instructions
{Complete style profile}

## Requirements
- Preserve the core message and key information
- Transform the writing style to match ALL rules in the style profile
- Maintain original structure unless style profile dictates otherwise
- Apply all syntax, vocabulary, tone, and formatting transformations

Now rewrite the content in this style.
```

**Step 3: Present Rewrite**

Show original vs. rewritten side-by-side or sequentially.

**Step 4: Offer Actions**

Use AskUserQuestion:
- Replace original file
- Save as new file
- Show diff
- Iterate/refine
- Cancel

## Error Handling

**Profile not found:**
```
❌ Error: Style profile '{profile_id}' not found

Available profiles:
- technical-blogger-casual
- academic-researcher-formal

Use: /wt:style-apply --list
```

**Registry missing:**
```
❌ Error: No style profiles found

Create a profile first using: /wt:style-extractor <folder_path>
```

**File not found (--file option):**
```
❌ Error: File not found: {file_path}

Please provide a valid file path.
```

## Examples

### Example 1: List Available Styles
```bash
/wt:style-apply --list
```

**Output**: Table of all saved profiles with metadata

### Example 2: Generate Blog Post
```bash
/wt:style-apply technical-blogger-casual "How to optimize React performance"
```

**Output**: New blog post written in the technical-blogger-casual style

### Example 3: Rewrite Documentation
```bash
/wt:style-apply developer-docs-practical --file README.md
```

**Output**: Rewritten README.md in practical developer documentation style

### Example 4: Preview Style
```bash
/wt:style-apply academic-researcher-formal --preview
```

**Output**: Complete style profile displayed for review

## Integration with Other Commands

**Typical workflow:**
1. `/wt:style-extractor ~/writing-samples` - Extract style
2. `/wt:style-apply {profile_id} --preview` - Review profile
3. `/wt:style-apply {profile_id} "new topic"` - Generate content

**Storage location**: `~/.claude/wt/styles/` (user-level, shared across all projects)

## Best Practices

- **Test profiles**: Use `--preview` to verify profile quality before generating
- **Iterate**: Generated content may need refinement; style replication is 90%+ not 100%
- **Combine with editing**: Use generated content as a starting point
- **Update profiles**: Re-extract if writing style evolves
- **Share profiles**: User-level storage means profiles work across all your projects

## Technical Notes

- Style profiles are user-scoped (`~/.claude/wt/styles/`)
- Profiles are available across ALL projects for the current user
- Registry uses JSON for easy parsing and extension
- Profile files use markdown with YAML frontmatter for human readability
- All file operations use absolute paths with `~` expansion
