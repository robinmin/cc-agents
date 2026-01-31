---
name: create wt-generate-image command
description: Create slash command for AI image generation using HuggingFace MCP tool
status: Done
created_at: 2026-01-28
updated_at: 2026-01-28
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
dependencies: [0091]
tags: [wt-plugin, slash-command, technical-content-workflow, image-generation]
---

## 0094. Create /wt:doc-image Command

### Background

The `/wt:doc-image` command generates AI images for technical content illustrations. It uses the HuggingFace MCP tool (gr1_z_image_turbo_generate) to create images based on text prompts, with optional context from article content. Generated images are saved to 4-illustration/images/ and referenced in the article.

This command enables content creators to quickly generate relevant illustrations without leaving their workflow.

### Requirements

**Functional Requirements:**
- Accept prompt string as input
- Support optional `--file` parameter for article context
- Use mcp__huggingface__gr1_z_image_turbo_generate MCP tool
- Support `--resolution` parameter for different formats
- Save images to 4-illustration/images/
- Update article with image references
- Save image metadata to 4-illustration/ folder

**Non-Functional Requirements:**
- Image generation should complete within reasonable time
- Error messages must indicate generation failures
- Generated images must be appropriate for technical content

**Acceptance Criteria:**
- [ ] Command accepts prompt string as input
- [ ] --file parameter reads article for context prompts
- [ ] --resolution supports common formats (1024x1024, 1920x1080, 800x600)
- [ ] Image saved to 4-illustration/images/[filename].png
- [ ] Image metadata saved to 4-illustration/images.json
- [ ] Article updated with image reference syntax
- [ ] Command reports generation status and file path

### Design

**Command Interface:**

```bash
/wt:generate-image "A server architecture diagram showing microservices" [--file article.md] [--resolution 1024x1024]
```

**Arguments:**

| Argument | Required | Description | Default |
|----------|----------|-------------|---------|
| `<prompt>` | Yes | Text description of image to generate | - |
| `--file` | No | Article file for context (generates contextual prompts) | - |
| `--resolution` | No | Image resolution: 1024x1024 (square), 1920x1080 (landscape), 800x600 (portrait) | `1024x1024` |
| `--output` | No | Custom output filename (without extension) | Auto-generated |
| `--help` | No | Show help message | - |

**Resolution Options:**

| Resolution | Aspect Ratio | Use Case |
|------------|--------------|----------|
| 1024x1024 | 1:1 | Social media, square images |
| 1920x1080 | 16:9 | Blog headers, wide images |
| 800x600 | 4:3 | Inline illustrations |
| 1280x720 | 16:9 | YouTube thumbnails |
| 1080x1080 | 1:1 | Instagram, LinkedIn |

**Workflow:**

```
1. Parse command arguments (prompt, --file, --resolution)
2. If --file provided:
   - Read article content
   - Extract article title, key topics, sections
   - Generate contextual prompt variations
3. Prepare image generation prompt:
   - Base prompt from command argument
   - Add technical content style hints
   - Apply resolution-specific adjustments
4. Call mcp__huggingface__gr1_z_image_turbo_generate
5. Save generated image to 4-illustration/images/
6. Update 4-illustration/images.json with metadata
7. Generate image reference for article
8. Report success with file path and reference syntax
```

**Output File: Image Generation:**

```
4-illustration/images/article-title-001.png
```

**Output File: images.json:**

```json
{
  "images": [
    {
      "id": "img-001",
      "filename": "article-title-001.png",
      "prompt": "A server architecture diagram showing microservices with containers and load balancers",
      "resolution": "1024x1024",
      "created_at": "2026-01-28T10:30:00Z",
      "article_context": "article.md",
      "used_in": "4-illustration/article-images.md"
    }
  ]
}
```

**Article Image Reference Format:**

```markdown
![Image: Server Architecture Diagram](4-illustration/images/article-title-001.png)

*Figure: High-level server architecture showing microservices communication patterns.*
```

**Prompt Enhancement Strategy:**

For technical content, prompts should include:
- Content type (diagram, illustration, icon, flowchart)
- Style (minimalist, detailed, schematic)
- Color scheme (if specified)
- Technical context (from --file)

### Plan

**Phase 1: Command Structure**
- [ ] Create plugins/wt/commands/generate-image.md file
- [ ] Define command frontmatter with parameters
- [ ] Document HuggingFace MCP integration

**Phase 2: Image Generation Logic**
- [ ] Implement prompt parsing and validation
- [ ] Implement --file context extraction
- [ ] Implement prompt enhancement for technical content
- [ ] Implement resolution-specific adjustments

**Phase 3: File Operations**
- [ ] Implement 4-illustration/images/ path resolution
- [ ] Implement image file saving
- [ ] Implement images.json metadata updating
- [ ] Implement article reference generation

**Phase 4: MCP Integration**
- [ ] Document mcp__huggingface__gr1_z_image_turbo_generate usage
- [ ] Handle generation success/failure
- [ ] Implement retry logic for transient failures

**Phase 5: Testing**
- [ ] Test with simple prompts
- [ ] Test with --file context
- [ ] Test different resolutions
- [ ] Verify image references in articles
- [ ] Test error handling

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Command | plugins/wt/commands/generate-image.md | This task | 2026-01-28 |

### References

- [Task 0001](/docs/prompts/0001_repository_structure_setup.md) - Folder structure prerequisite
- [Task 0005](/docs/prompts/0005_create_wt-publish_command.md) - Uses images for publishing
- [HuggingFace MCP Tool](mcp__huggingface__gr1_z_image_turbo_generate) - Image generation tool
- [Existing /wt:magent-browser](/plugins/wt/agents/magent-browser.md) - Browser automation reference
