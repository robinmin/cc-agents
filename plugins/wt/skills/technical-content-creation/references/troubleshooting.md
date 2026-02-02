# Technical Content Creation Troubleshooting

Common issues and solutions for the Technical Content Creation workflow.

## Repository Issues

### TCC_REPO_ROOT Not Set

**Error**: `TCC_REPO_ROOT environment variable not set`

**Cause**: The content repository root path is not configured.

**Solution**:
```bash
# Set the environment variable
export TCC_REPO_ROOT="/path/to/your/content/repository"

# Add to ~/.bashrc or ~/.zshrc for persistence
echo 'export TCC_REPO_ROOT="/path/to/your/content/repository"' >> ~/.bashrc
source ~/.bashrc
```

**Verification**:
```bash
echo $TCC_REPO_ROOT
# Should output: /path/to/your/content/repository
```

### Collection Not Found

**Error**: `Collection not found: {collection-name}`

**Cause**: The specified collection doesn't exist in the repository.

**Solution**:
```bash
# List available collections
ls "$TCC_REPO_ROOT/collections/"

# Create the collection if needed
mkdir -p "$TCC_REPO_ROOT/collections/{collection-name}"

# Or initialize topic with a new collection
wt:topic-init --collection "New Collection" --name "my-topic"
```

### Topic Folder Not Found

**Error**: `Topic folder not found. Are you in a valid topic directory?`

**Cause**: Command is being run from outside a topic folder.

**Solution**:
```bash
# Navigate to the topic folder
cd "$TCC_REPO_ROOT/collections/{collection}/{topic-name}"

# Or verify current directory
pwd
# Should show: /path/to/repository/collections/{collection}/{topic}
```

---

## Stage 0: Materials Extraction Issues

### File Not Found

**Error**: `File not found: /path/to/document.pdf`

**Cause**: Incorrect file path or file doesn't exist.

**Solution**:
```bash
# Verify file exists
test -f /path/to/document.pdf && echo "File exists" || echo "File not found"

# Use absolute path
Extract materials from /full/path/to/document.pdf focusing on architecture --save

# Check current working directory
pwd
ls -la
```

### URL Inaccessible

**Error**: `Failed to fetch URL: {url}`

**Cause**: URL is invalid, requires authentication, or server is unreachable.

**Solution**:
```bash
# Verify URL is accessible
curl -I {url}

# Try alternative source
Extract materials from https://alternative-source.com/article focusing on architecture --save

# Use description-based extraction as fallback
Extract materials on "topic description" focusing on architecture --save
```

### No Materials Extracted

**Error**: `No materials could be extracted from source`

**Cause**: Source format not supported or content extraction failed.

**Solution**:
```bash
# Try different aspect filter
Extract materials from {source} focusing on examples --save

# Use description-based extraction
Extract materials on "detailed topic description" focusing on architecture --save

# Check if materials-extracted.md was created
ls -la 0-materials/
cat 0-materials/materials-extracted.md
```

### Materials JSON Missing

**Error**: `materials.json not found in 0-materials/`

**Cause**: Materials extraction was incomplete or failed.

**Solution**:
```bash
# Re-run materials extraction
Extract materials from {source} focusing on {aspect} --save

# Verify materials.json was created
cat 0-materials/materials.json

# Check frontmatter in materials-extracted.md
head -20 0-materials/materials-extracted.md
```

---

## Stage 1: Research Issues

### No Sources Found

**Error**: `No sources could be found for the given topic`

**Cause**: Search terms too specific, no relevant sources, or search tool unavailable.

**Solution**:
```bash
# Broaden search terms
Perform rapid research on "broader topic area"

# Try different research type
Perform fact-check research on extracted materials

# Add more context to materials
Extract materials on "topic with more context" focusing on {aspect} --save
```

### Research Brief Not Generated

**Error**: `research-brief.md not found in 1-research/`

**Cause**: Research stage failed or was interrupted.

**Solution**:
```bash
# Check research stage folder
ls -la 1-research/

# Check if sources.json exists
cat 1-research/sources.json

# Re-run research with different type
Perform systematic research on extracted materials with sources 20-50

# Verify research brief content
cat 1-research/research-brief.md
```

### Low Confidence Score

**Warning**: `Research confidence: LOW - consider additional sources`

**Cause**: Limited sources, low evidence quality, or uncertain claims.

**Solution**:
```bash
# Run systematic research for more sources
Perform systematic research on extracted materials with sources 30-50

# Add specific high-quality sources
Extract materials from https://authoritative-source.com/article focusing on {aspect} --save
Perform rapid research on materials-extracted.md

# Verify confidence improved
head -30 1-research/research-brief.md | grep confidence
```

### Research Type Not Recognized

**Error**: `Invalid research type: {type}`

**Cause**: Incorrect research type specified.

**Solution**:
```bash
# Use valid research types
# Valid: systematic, rapid, meta-analysis, fact-check

Perform systematic research on extracted materials
Perform rapid research on extracted materials
Perform meta-analysis research on extracted materials
Perform fact-check research on extracted materials
```

---

## Stage 2: Outline Generation Issues

### Research Brief Not Found

**Error**: `research-brief.md not found. Has Stage 1 been completed?`

**Cause**: Stage 1 research not completed or file in wrong location.

**Solution**:
```bash
# Verify research brief exists
cat 1-research/research-brief.md

# Check from topic root
ls -la 1-research/research-brief.md

# If missing, complete Stage 1 first
Perform systematic research on extracted materials
```

### Outline Generator Script Not Found

**Error**: `outline-generator.py not found in scripts/`

**Cause**: Script not installed or wrong working directory.

**Solution**:
```bash
# Verify script exists
ls -la scripts/outline-generator.py

# Check skill installation
ls -la ~/.claude/plugins/wt/skills/technical-content-creation/

# Run from topic root directory
cd "$TCC_REPO_ROOT/collections/{collection}/{topic}"
python3 scripts/outline-generator.py --options 3
```

### Only One Outline Option Generated

**Issue**: Expected 2-3 options but only got one.

**Cause**: Script parameters incorrect or generation failed.

**Solution**:
```bash
# Specify number of options explicitly
python3 scripts/outline-generator.py --options 3 --length long

# Check for errors in generation
cat 2-outline/materials/generation-params.json

# Verify all option files exist
ls -la 2-outline/outline-option-*.md
```

### User Selection Timeout

**Issue**: Interactive selection prompt doesn't appear or times out.

**Cause**: Non-interactive environment or tool not supported.

**Solution**:
```bash
# Use non-interactive mode
python3 scripts/outline-generator.py --options 3 --length long

# Approve option separately
python3 scripts/outline-generator.py --approve b

# List options to see what was generated
python3 scripts/outline-generator.py --list
```

### Approved Outline Not Created

**Error**: `outline-approved.md not found after selection`

**Cause**: Approval step failed or file write error.

**Solution**:
```bash
# Manually copy selected option
cp 2-outline/outline-option-b.md 2-outline/outline-approved.md

# Update frontmatter to approved status
# Edit outline-approved.md and set:
# status: approved
# approved_at: {timestamp}
# approved_by: manual

# Verify approved outline
cat 2-outline/outline-approved.md
```

---

## Stage 3: Draft Writing Issues

### Approved Outline Not Found

**Error**: `outline-approved.md not found. Has Stage 2 been completed?`

**Cause**: Stage 2 not completed or outline not approved.

**Solution**:
```bash
# Verify approved outline exists
cat 2-outline/outline-approved.md

# Check if only draft options exist
ls -la 2-outline/

# Approve an option if needed
python3 scripts/outline-generator.py --approve b
```

### Style Profile Not Found

**Error**: `Style profile not found: {profile-name}`

**Cause**: Style profile doesn't exist in styles directory.

**Solution**:
```bash
# List available style profiles
ls -la ~/.claude/wt/styles/

# Or check plugin styles
ls -la plugins/wt/styles/

# Use a valid profile name
# Common profiles: technical-writer, blogger, academic-writer, tutorial-writer

Write draft using technical-writer style profile based on approved outline
```

### Draft Generation Failed

**Error**: `Failed to generate draft from outline`

**Cause**: Outline format invalid or content generation error.

**Solution**:
```bash
# Verify outline format
head -30 2-outline/outline-approved.md

# Check outline has required sections
grep "##" 2-outline/outline-approved.md

# Try with different style profile
Write draft using blogger style profile based on approved outline

# Check draft folder
ls -la 3-draft/
```

### Draft is Empty or Too Short

**Issue**: Generated draft has minimal content.

**Cause**: Outline too brief or generation incomplete.

**Solution**:
```bash
# Verify outline has sufficient content
wc -l 2-outline/outline-approved.md

# Re-generate outline with more detail
python3 scripts/outline-generator.py --options 2 --length long

# Try different outline option
python3 scripts/outline-generator.py --approve c

# Re-write draft
Write draft using technical-writer style profile based on approved outline
```

### Revision Mode Not Working

**Issue**: Revision doesn't incorporate feedback properly.

**Cause**: Feedback not provided or revision mode unclear.

**Solution**:
```bash
# Specify revision clearly
Write revision-002 using technical-writer style profile based on approved outline
  Feedback: "Add more code examples, expand section 3, clarify architecture diagram"

# Verify revision was created
ls -la 3-draft/draft-revisions/

# Compare revisions
diff 3-draft/draft-revisions/revision-001.md 3-draft/draft-revisions/revision-002.md
```

---

## Stage 4: Illustration Issues

### Article Not Found

**Error**: `Article not found: {path}`

**Cause**: Draft not generated or incorrect path.

**Solution**:
```bash
# Verify draft exists
cat 3-draft/draft-article.md

# Use correct relative path
wt:image-cover --article 3-draft/draft-article.md --output 4-illustration/cover.png

# Create illustration folder if needed
mkdir -p 4-illustration/images/
```

### wt:image-cover Command Not Found

**Error**: `Command not found: wt:image-cover`

**Cause**: Image skills not installed or not in PATH.

**Solution**:
```bash
# Verify image skills are installed
ls -la plugins/wt/skills/image-cover/
ls -la plugins/wt/commands/image-cover.md

# Check command is available
ls -la ~/.claude/plugins/cache/cc-agents/wt/

# Try full path or reinstall skill
```

### Image Generation Failed

**Error**: `Failed to generate image: {error message}`

**Cause**: Backend unavailable, invalid prompt, or API error.

**Solution**:
```bash
# Check which backend is configured
cat ~/.claude/wt/config.json | grep image_backend

# Try simpler prompt
wt:image-generate "simple diagram" --style technical-diagram

# Check backend status
# For DALL-E: Check API key
# For Gemini: Check quota
# For local: Check model is running

# Enable debug mode
DEBUG=1 wt:image-generate "test" --output test.png
```

### Invalid Resolution Format

**Error**: `Invalid resolution: {resolution}`

**Cause**: Resolution format incorrect or not supported.

**Solution**:
```bash
# Use valid resolution format: WIDTHxHEIGHT
wt:image-generate "test" --resolution 1280x720 --output test.png

# Common resolutions (Z-Image Turbo MCP):
# 1024x1024 (1:1 square)
# 1344x576 (21:9 ultrawide cover)
# 1280x720 (16:9 wide)
# 1152x864 (4:3 inline)

# Check valid resolutions in stage-details.md
cat references/stage-details.md | grep -A 10 "Resolution Options"
```

### captions.json Not Created

**Issue**: Image generated but captions.json is missing.

**Cause**: Image skill doesn't create captions or write failed.

**Solution**:
```bash
# Check if captions.json exists
cat 4-illustration/captions.json

# Create manually if needed
cat > 4-illustration/captions.json << 'EOF'
{
  "version": "1.0.0",
  "last_updated": "2026-01-30T12:00:00Z",
  "article": "3-draft/draft-article.md",
  "images": [
    {
      "id": "img-001",
      "file": "cover.png",
      "alt_text": "Article cover image",
      "created_at": "2026-01-30T12:00:00Z"
    }
  ]
}
EOF

# Verify format
cat 4-illustration/captions.json | python3 -m json.tool
```

### wt:image-illustrator Detects No Positions

**Issue**: No illustration positions detected in article.

**Cause**: Article too short or position detection criteria not met.

**Solution**:
```bash
# Lower minimum positions threshold
wt:image-illustrator --article 3-draft/draft-article.md \
  --image-dir 4-illustration/images/ --min-positions 1

# Generate custom images instead
wt:image-generate "concept explanation" --style technical-diagram \
  --output 4-illustration/images/concept.png

# Manually insert into article
# Add: ![Concept explanation](4-illustration/images/concept.png)
```

---

## Stage 5: Adaptation Issues

### Source Article Not Found

**Error**: `Source article not found: {path}`

**Cause**: Draft not in expected location.

**Solution**:
```bash
# Verify article exists
cat 3-draft/draft-article.md

# Use correct path
Adapt draft article for blog platform

# Check draft folder
ls -la 3-draft/
```

### Invalid Platform Specified

**Error**: `Invalid platform: {platform-name}`

**Cause**: Platform name not recognized.

**Solution**:
```bash
# Use valid platform names
# Valid: blog, twitter, linkedin, devto, medium

Adapt draft article for blog platform
Adapt draft article for twitter platform
Adapt draft article for linkedin platform
Adapt draft article for devto platform
Adapt draft article for medium platform
```

### Platform Adaptation Empty

**Issue**: Adapted file exists but has no content.

**Cause**: Source article empty or adaptation failed.

**Solution**:
```bash
# Check source article has content
wc -l 3-draft/draft-article.md

# Check adapted file
cat 5-adaptation/article-blog.md

# Re-run adaptation
Adapt draft article for blog platform

# Check platform specifications
cat references/platform-guide.md
```

### Image References Not Preserved

**Issue**: Adapted content missing image references.

**Cause**: Platform doesn't support images or adaptation skipped images.

**Solution**:
```bash
# Check platform-specific handling
cat references/platform-guide.md | grep -A 10 "Image"

# For platforms that support images, ensure image-aware adaptation
Adapt draft article for blog platform --image-aware

# Manually add image references if needed
# Edit 5-adaptation/article-{platform}.md and add:
# ![Cover image](../4-illustration/cover.png)
```

### Character Limit Exceeded

**Warning**: `Adapted content exceeds platform character limit`

**Cause**: Content too long for target platform (Twitter, LinkedIn).

**Solution**:
```bash
# For Twitter: Content should be split into thread
cat 5-adaptation/article-twitter.md | wc -c
# Should be < 280 per tweet, thread format expected

# For LinkedIn: Content should be < 3000 chars
head -c 3000 3-draft/draft-article.md > temp.md
Adapt temp.md for linkedin platform

# Re-adapt with length consideration
Adapt draft article for twitter platform --max-length 280
```

---

## Stage 6: Publishing Issues

### Not in Git Repository

**Error**: `Not in a git repository. Cannot publish to blog.`

**Cause**: Content folder not tracked by git or repository not initialized.

**Solution**:
```bash
# Initialize git repository
cd "$TCC_REPO_ROOT"
git init

# Or use social platform publishing (doesn't require git)
Publish article-twitter.md to twitter
Publish article-linkedin.md to linkedin

# For blog publishing, ensure git repo exists
git status
git remote -v
```

### Source File Not Found

**Error**: `Source file not found: {path}`

**Cause**: Adapted file doesn't exist or incorrect path.

**Solution**:
```bash
# Verify adapted file exists
ls -la 5-adaptation/
cat 5-adaptation/article-blog.md

# Publish with correct path
Publish 5-adaptation/article-blog.md to blog

# Or use article.md if copied to publish folder
cp 5-adaptation/article-blog.md 6-publish/article.md
Publish article.md to blog
```

### Dry Run Failed

**Error**: `Dry run failed: {error}`

**Cause**: Validation failed or commit message generation error.

**Solution**:
```bash
# Check article has proper frontmatter
head -20 5-adaptation/article-blog.md

# Verify git status
git status

# Try without dry-run
Publish article.md to blog

# Check publish log for details
cat 6-publish/publish-log.json
```

### Commit Failed

**Error**: `Git commit failed: {error}`

**Cause**: Git configuration issue or pre-commit hook failure.

**Solution**:
```bash
# Check git configuration
git config user.name
git config user.email

# Configure if missing
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Check for pre-commit hooks
ls -la .git/hooks/

# Try manual commit
git add 6-publish/article.md
git commit -m "Publish: Article Title"
git push origin main
```

### Publish Log Not Updated

**Issue**: Article published but publish-log.json not updated.

**Cause**: Log write failed or permissions issue.

**Solution**:
```bash
# Manually update publish log
cat > 6-publish/publish-log.json << 'EOF'
{
  "version": "1.0.0",
  "last_updated": "2026-01-30T12:00:00Z",
  "publications": [
    {
      "platform": "blog",
      "article": "article.md",
      "url": "https://blog.example.com/article-url",
      "published_at": "2026-01-30T12:00:00Z",
      "commit": "abc123"
    }
  ]
}
EOF

# Verify log format
cat 6-publish/publish-log.json | python3 -m json.tool
```

---

## Debug Mode

### Enable Debug Logging

```bash
# Set debug environment variable
export TCC_DEBUG=1

# Or for individual commands
TCC_DEBUG=1 Publish article.md to blog

# Check debug log
tail -f ~/.claude/logs/tcc-debug.log
```

### Check Stage Status

```bash
# Quick status check for all stages
for stage in 0-materials 1-research 2-outline 3-draft 4-illustration 5-adaptation 6-publish; do
  echo "=== $stage ==="
  ls -la $stage/ 2>/dev/null || echo "Not found"
done
```

### Verify File Chain

```bash
# Verify the complete workflow chain
echo "Stage 0:" && ls 0-materials/materials*.md
echo "Stage 1:" && ls 1-research/research-brief.md
echo "Stage 2:" && ls 2-outline/outline-approved.md
echo "Stage 3:" && ls 3-draft/draft-article.md
echo "Stage 4:" && ls 4-illustration/cover.png
echo "Stage 5:" && ls 5-adaptation/article-*.md
echo "Stage 6:" && ls 6-publish/article.md
```

---

## Common Error Messages Reference

| Error Message | Stage | Likely Cause | Quick Fix |
|---------------|-------|--------------|-----------|
| `TCC_REPO_ROOT not set` | All | Environment not configured | Set TCC_REPO_ROOT variable |
| `Collection not found` | All | Collection doesn't exist | Create collection or check name |
| `File not found` | 0 | Invalid path | Verify file path exists |
| `URL inaccessible` | 0 | URL unreachable | Check URL or try alternative |
| `No sources found` | 1 | Search failed | Broaden search terms |
| `Research brief not found` | 2 | Stage 1 incomplete | Complete Stage 1 first |
| `Invalid research type` | 1 | Wrong type name | Use: systematic, rapid, meta-analysis, fact-check |
| `Outline generator not found` | 2 | Script missing | Check skill installation |
| `Approved outline not found` | 3 | Stage 2 incomplete | Approve an outline option |
| `Style profile not found` | 3 | Profile doesn't exist | List available profiles |
| `Command not found: wt:image-*` | 4 | Image skills not installed | Install image skills |
| `Image generation failed` | 4 | Backend error | Check backend status |
| `Invalid resolution` | 4 | Wrong format | Use WIDTHxHEIGHT format |
| `Invalid platform` | 5 | Platform name wrong | Use: blog, twitter, linkedin, devto, medium |
| `Not in git repository` | 6 | No git repo | Initialize git or use social platform |
| `Commit failed` | 6 | Git config issue | Configure git user.name and user.email |

---

## Getting Help

### Check Documentation

```bash
# Main skill documentation
cat SKILL.md

# Stage details
cat references/stage-details.md

# Platform guide
cat references/platform-guide.md

# Workflows
cat references/workflows.md
```

### Verify Installation

```bash
# Check skill is installed
ls -la ~/.claude/plugins/wt/skills/technical-content-creation/

# Check all commands are available
ls -la ~/.claude/plugins/wt/commands/

# Check image skills are installed
ls -la ~/.claude/plugins/wt/skills/image-*/
```

### Reset Topic (Last Resort)

```bash
# WARNING: This deletes all progress in the topic
# Only use if topic is corrupted beyond repair

rm -rf "$TCC_REPO_ROOT/collections/{collection}/{topic}"

# Start fresh
wt:topic-init --collection "{collection}" --name "{topic}" \
  --title "Topic Title"
```

---

## Prevention Best Practices

1. **Always run from topic root directory** - Most commands expect to be run from within a topic folder
2. **Complete stages sequentially** - Don't skip stages without understanding dependencies
3. **Verify outputs before proceeding** - Check that expected files were created
4. **Use descriptive commit messages** - Helps track publish history
5. **Keep backups of important drafts** - Use revision system for major changes
6. **Test with dry-run first** - Especially for publishing to live platforms
7. **Monitor character limits** - Check platform limits before adaptation
8. **Preserve image metadata** - Keep captions.json updated for accessibility
9. **Log issues as they occur** - Document errors for future reference
10. **Regular git commits** - Commit after each major stage completion
