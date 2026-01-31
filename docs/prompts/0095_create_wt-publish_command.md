---
name: create wt-publish command
description: Create slash command for publishing content to blogs and social platforms
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
tags: [wt-plugin, slash-command, technical-content-workflow, publishing]
---

## 0095. Create /wt:doc-publish Command

### Background

The `/wt:doc-publish` command handles the publication of content to various platforms. For blog platforms, it executes git add/commit/push workflow. For social platforms (Twitter, LinkedIn, Dev.to, Medium), it converts Markdown to HTML and copies to clipboard for manual posting. This command also generates publish-log.json entries to track publication history.

This command provides infrastructure for multi-platform publishing with audit trail support.

### Requirements

**Functional Requirements:**
- Accept Markdown file(s) as input
- Support `--platform` parameter: `blog` | `twitter` | `linkedin` | `devto` | `medium` | `all`
- For blog: execute git add/commit/push workflow
- For social platforms: convert to HTML and copy to clipboard
- Generate publish-log.json entries
- Save to 6-publish/ folder

**Non-Functional Requirements:**
- Git operations must be safe (dry-run option)
- HTML conversion must preserve formatting
- Clipboard operations must have user confirmation
- Publication logging must be append-only

**Acceptance Criteria:**
- [ ] Command accepts Markdown file path(s) as input
- [ ] --platform blog triggers git workflow (add, commit, push)
- [ ] --platform twitter/linkedin/devto/medium converts to HTML and copies to clipboard
- [ ] --platform all processes all configured platforms
- [ ] publish-log.json updated with publication entry
- [ ] Output saved to 6-publish/ folder
- [ ] Git workflow includes commit message generation
- [ ] HTML conversion preserves Markdown formatting

### Design

**Command Interface:**

```bash
/wt:publish path/to/article.md --platform <platform> [--dry-run]
```

**Arguments:**

| Argument | Required | Description | Default |
|----------|----------|-------------|---------|
| `<file>` | Yes | Path to Markdown file(s) to publish | - |
| `--platform` | Yes | Target platform: blog, twitter, linkedin, devto, medium, all | - |
| `--dry-run` | No | Show actions without executing (for git) | false |
| `--message` | No | Custom commit message (blog platform) | Auto-generated |
| `--help` | No | Show help message | - |

**Platform Behaviors:**

| Platform | Action | Output |
|----------|--------|--------|
| **blog** | Git add → commit → push | Blog repository updated |
| **twitter** | Convert to HTML → copy to clipboard | Ready for manual tweet |
| **linkedin** | Convert to HTML → copy to clipboard | Ready for manual post |
| **devto** | Convert to HTML → copy to clipboard | Ready for manual article |
| **medium** | Convert to HTML → copy to clipboard | Ready for manual import |
| **all** | Execute all above | Multi-platform ready |

**Git Workflow (Blog Platform):**

```
1. Validate file is in git repository
2. Stage file: git add <file>
3. Generate commit message:
   - Format: "Publish: [Title] ($(date +%Y-%m-%d))"
   - Or use --message if provided
4. Commit: git commit -m "<message>"
5. Push: git push origin <branch>
6. Update publish-log.json
```

**HTML Conversion (Social Platforms):**

```
1. Parse Markdown to HTML
2. Apply platform-specific styling:
   - Twitter: Extract main points, limit to 3000 chars
   - LinkedIn: Professional formatting, add spacing
   - Dev.to: Preserve code blocks, add tags section
   - Medium: Clean HTML, preserve headers
3. Copy HTML to clipboard
4. Update publish-log.json
```

**publish-log.json Update:**

```json
{
  "publications": [
    {
      "id": "pub-001",
      "file": "6-publish/article.md",
      "platform": "blog",
      "url": "https://example.com/blog/article-slug",
      "published_at": "2026-01-28T10:00:00Z",
      "git_commit": "abc123def",
      "status": "published"
    },
    {
      "id": "pub-002",
      "file": "6-publish/article.md",
      "platform": "linkedin",
      "published_at": "2026-01-28T10:05:00Z",
      "clipboard_copied": true,
      "status": "ready"
    }
  ]
}
```

**Output File: Published Article (6-publish/article.md):**

```markdown
---
title: [Article Title]
source: 3-draft/draft-article.md
published:
  blog:
    commit: abc123def
    url: https://example.com/blog/article-slug
    date: 2026-01-28
  platforms:
    twitter: ready
    linkedin: ready
    devto: ready
    medium: ready
---

# [Article Title]

[Full article content]

---
*Published via /wt:publish on 2026-01-28*
```

### Plan

**Phase 1: Command Structure**
- [ ] Create plugins/wt/commands/publish.md file
- [ ] Define command frontmatter with platform options
- [ ] Document all platform behaviors

**Phase 2: Git Workflow (Blog)**
- [ ] Implement repository detection
- [ ] Implement git add operation
- [ ] Implement commit message generation
- [ ] Implement git commit operation
- [ ] Implement git push operation
- [ ] Add --dry-run option for safety

**Phase 3: HTML Conversion (Social Platforms)**
- [ ] Implement Markdown to HTML conversion
- [ ] Implement Twitter-specific formatting
- [ ] Implement LinkedIn-specific formatting
- [ ] Implement Dev.to-specific formatting
- [ ] Implement Medium-specific formatting
- [ ] Implement clipboard copy operation

**Phase 4: Publication Logging**
- [ ] Implement publish-log.json reading
- [ ] Implement publication entry generation
- [ ] Implement publish-log.json writing
- [ ] Add publication metadata to output file

**Phase 5: Testing**
- [ ] Test git workflow with --dry-run
- [ ] Test HTML conversion for each platform
- [ ] Test clipboard operations
- [ ] Test publish-log.json updates
- [ ] Test error handling

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Command | plugins/wt/commands/publish.md | This task | 2026-01-28 |

### References

- [Task 0001](/docs/prompts/0001_repository_structure_setup.md) - Folder structure prerequisite
- [Task 0003](/docs/prompts/0003_create_wt-adapt_command.md) - Platform adaptations
- [Existing /wt:info-research](/plugins/wt/commands/info-research.md) - Content creation workflow
- [Git Documentation](https://git-scm.com/docs) - Git command reference
- [CommonMark Spec](https://spec.commonmark.org/) - Markdown specification
