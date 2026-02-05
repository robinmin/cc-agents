# PostSurfing CLI Reference

Reference documentation for the postsurfing CLI tool used for publishing content to the Surfing platform.

## Location

```bash
~/projects/surfing/scripts/postsurfing/postsurfing.mjs
```

## Usage

```bash
postsurfing <file-path> --type <content-type> [options]
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<file-path>` | Yes | Path to the content file to publish |

## Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--type <type>` | `-t` | - | Content type: articles, showcase, documents, cheatsheets |
| `--lang <lang>` | `-l` | `en` | Content language: en, cn, jp |
| `--interactive` | `-i` | - | Prompt for missing required fields |
| `--auto-convert` | - | - | Auto-convert HTML files to Surfing format |
| `--dry-run` | - | - | Preview changes without applying them |
| `--no-build` | - | - | Skip build validation step |
| `--no-commit` | - | - | Skip git commit and push |
| `--commit-message <msg>` | - | - | Custom commit message |
| `--pdf-url <url>` | - | - | PDF URL for cheatsheets |
| `--force` | - | - | Overwrite existing files without warning |
| `--verbose` | `-v` | - | Enable detailed logging |
| `--help` | `-h` | - | Show help message |

## Content Types

| Type | Description |
|------|-------------|
| `articles` | AI insights, research, and technical content |
| `showcase` | Project portfolios with live demos and source links |
| `documents` | HTML content for legacy or rich-formatted pieces |
| `cheatsheets` | AI-generated reference materials and quick guides |

## Languages

| Code | Language |
|------|----------|
| `en` | English |
| `cn` | Chinese (Simplified) |
| `jp` | Japanese |

## Examples

### Basic Usage

```bash
# Publish a markdown article (English by default)
postsurfing ./my-article.md --type articles

# Publish content in Chinese
postsurfing ./my-article.md --type articles --lang cn

# Publish content in Japanese
postsurfing ./my-article.md --type articles --lang jp
```

### Advanced Usage

```bash
# Convert and publish HTML document
postsurfing ./legacy-page.html --type documents --auto-convert

# Interactive mode for showcase project
postsurfing ./project.md --type showcase --interactive

# Dry run to preview changes
postsurfing ./content.md --type articles --dry-run

# Skip build validation and git operations
postsurfing ./content.md --type articles --no-build --no-commit

# Publish an AI-generated cheatsheet
postsurfing ./javascript-cheatsheet.md --type cheatsheets

# Publish interactive HTML cheatsheet
postsurfing ./css-grid-guide.html --type cheatsheets --auto-convert
```

### With Custom Options

```bash
# Custom commit message
postsurfing ./article.md --type articles --commit-message "Add: My new article"

# With PDF URL for cheatsheet
postsurfing ./guide.md --type cheatsheets --pdf-url "/downloads/guide.pdf"

# Verbose output for debugging
postsurfing ./content.md --type articles --verbose
```

## Output

### Success

```
🏄 PostSurfing CLI Tool
📁 Processing: ./article.md
📝 Content Type: articles
📋 Step 1: Processing content file...
📋 Step 2: Processing frontmatter...
📋 Step 3: Writing processed content...
📋 Step 4: Validating build...
📋 Step 5: Committing changes...
✅ Content published successfully!
📄 File: contents/articles/en/article.md
🌐 Content will be available after deployment at https://surfing.salty.vip/
```

### Dry Run

```
🔍 Dry run mode - no changes will be applied
...
✅ Dry run completed successfully!
```

## Error Handling

The CLI provides detailed error messages with actionable suggestions:

| Error | Solution |
|-------|----------|
| File not found | Check file path and try again |
| Invalid content type | Use: articles, showcase, documents, cheatsheets |
| Missing frontmatter | Add required frontmatter fields to source file |
| Build validation failed | Fix content errors and try again |
| Git operation failed | Check git remote and authentication |

## File Placement

Content is automatically placed in the appropriate directory:

```
contents/
├── articles/
│   ├── en/
│   │   └── article.md
│   ├── cn/
│   │   └── article.md
│   └── jp/
│       └── article.md
├── showcase/
├── documents/
└── cheatsheets/
```

## Build Validation

The CLI runs `npm run build` to ensure the site builds successfully before committing. If validation fails, you'll see detailed error messages.

## Git Integration

The CLI automatically:
1. Stages the processed file
2. Creates a commit with a descriptive message
3. Pushes to the remote repository

Commit messages follow the pattern:
```
Add article: "Article Title"
Add showcase: "Project Name"
Add document: "Document Title"
Add cheatsheet: "Cheatsheet Title"
```

## Related Documentation

- **Surfing Project**: `~/projects/surfing`
- **Content Specification**: See `content-specification.md`
- **Surfing Website**: https://surfing.salty.vip/
