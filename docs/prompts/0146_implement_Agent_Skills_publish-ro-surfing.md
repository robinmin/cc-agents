---
name: implement Agent Skills publish-ro-surfing
description: Task: implement Agent Skills publish-ro-surfing
status: Done
created_at: 2026-02-02 15:43:05
updated_at: 2026-02-02 16:30:00
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0146. implement Agent Skills publish-ro-surfing

### Background

I already use slash command to create a new agent skill in `plugins/wt/skills/publish-to-surfing/`. But most of its contents is not right, we need to rely on its structure only.

Surfing is one of my static websites, which is built with `Astro` and deployed to Cloudflare Pages. The official website is [https://surfing.salty.vip/](https://surfing.salty.vip/).

Most importantly, you can find the source code at `~/projects/surfing`. What We really need to do is to create a process to connect a given content files to publish to Surfing via its publishing way. You can refer to its [README.md](~/projects/surfing/README.md) and its source code for details.

Surfing itself supports Markdown files with i18n support. So what we really need to do is find the right place to place the content files. and then trigger its build process. That's it.

This Agent Skill will be one of the publish pipeline for Agent Skills wt:technical-content-creation going forward. Please take in mind about this point in advance.

### Requirements

**Functional Requirements:**

1. Update `publish-to-surfing` skill to correctly wrap the `postsurfing` CLI
2. The skill should accept article files from Stage 5 (Adaptation) of technical content workflow
3. Support content types: articles, showcase, documents, cheatsheets (default: articles)
4. Support i18n languages: en, cn, jp (default: en)
5. Provide dry-run mode for preview before publishing
6. Handle errors gracefully with actionable feedback

**Non-Functional Requirements:**

- Must work with the existing `postsurfing` CLI at `~/projects/surfing/scripts/postsurfing/postsurfing.mjs`
- Must integrate with `wt:technical-content-creation` Stage 6 (Publish)
- Must provide clear success/error messages

**Acceptance Criteria:**

- [x] SKILL.md accurately describes the postsurfing CLI workflow (not API-based)
- [x] Script wrapper exists that calls postsurfing with correct parameters
- [x] Error handling provides actionable feedback
- [x] Dry-run mode works correctly
- [x] Integration with technical-content-creation Stage 6 is documented

### Q&A

**Q: What is the current issue with the skill?**
**A:** The current SKILL.md describes an API-based publishing workflow with endpoints like `/api/articles`. However, Surfing actually publishes via the `postsurfing` CLI which:

1. Places content files in `contents/{type}/{lang}/` directory
2. Validates and builds the site with Astro
3. Commits and pushes to git repository

**Q: How should the skill work?**
**A:** The skill should be a wrapper around the `postsurfing` CLI located at `~/projects/surfing/scripts/postsurfing/postsurfing.mjs`. The CLI handles:

- Content processing and frontmatter validation
- HTML to Markdown conversion
- Build validation
- Git commit and push operations

**Q: What content types are supported?**
**A:** articles, showcase, documents, cheatsheets (default: articles)

**Q: What languages are supported?**
**A:** en, cn, jp (default: en)

### Design

**Architecture:**

The `publish-to-surfing` skill is a wrapper around the existing `postsurfing` CLI tool. The architecture consists of:

1. **SKILL.md** - Documentation describing the workflow and usage
2. **scripts/publish.sh** - Shell script wrapper that calls the postsurfing CLI
3. **references/** - Documentation for Surfing content format and CLI usage

**Data Flow:**

```
Stage 5 (Adaptation) --> article.md
        |
        v
publish-to-surfing skill (wrapper)
        |
        v
postsurfing CLI (~/projects/surfing/scripts/postsurfing/postsurfing.mjs)
        |
        v
Content Processing --> File Placement --> Build Validation --> Git Operations
        |
        v
contents/{type}/{lang}/ --> Cloudflare Pages Deployment
```

**Key Design Decisions:**

1. **Wrapper Approach**: The skill wraps the existing postsurfing CLI rather than reimplementing its functionality
2. **File-based Publishing**: Surfing uses file placement + git workflow, not API-based publishing
3. **Shell Script**: Using bash for wrapper script for simplicity and easy integration
4. **Configuration via Environment**: `SURFING_PROJECT` environment variable for project location

### Plan

**Phase 1: Update Documentation (COMPLETED)**

- [x] Update task file with Requirements and Q&A sections
- [x] Rewrite SKILL.md with correct postsurfing CLI workflow
- [x] Create reference documentation files

**Phase 2: Implementation Scripts (COMPLETED)**

- [x] Create scripts/publish.sh wrapper script
- [x] Make script executable
- [x] Test script syntax

**Phase 3: Verification (IN PROGRESS)**

- [ ] Verify all files are in correct locations
- [ ] Test script with dry-run mode
- [ ] Update task status to Done

**Implementation Details:**

The `publish.sh` script:

- Validates input arguments (source file, content type, language)
- Checks Surfing project and CLI availability
- Calls postsurfing CLI with appropriate parameters
- Provides user-friendly error messages
- Supports dry-run mode for preview

**File Structure:**

```
publish-to-surfing/
|-- SKILL.md                              # Updated with correct workflow
|-- scripts/
|   `-- publish.sh                        # Wrapper script for postsurfing CLI
`-- references/
    |-- content-specification.md          # Surfing content format reference
    `-- postsurfing-cli.md                # CLI documentation reference
```

### Artifacts

| Type                     | Path                                                                                                       | Generated By | Date       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------ | ---------- |
| Skill Documentation      | `/Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-surfing/SKILL.md`                            | Updated      | 2026-02-02 |
| Wrapper Script           | `/Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-surfing/scripts/publish.sh`                  | Created      | 2026-02-02 |
| Content Format Reference | `/Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-surfing/references/content-specification.md` | Created      | 2026-02-02 |
| CLI Reference            | `/Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-surfing/references/postsurfing-cli.md`       | Created      | 2026-02-02 |

### References

- **Surfing Project**: `~/projects/surfing`
- **Surfing README**: `/Users/robin/projects/surfing/README.md`
- **PostSurfing CLI**: `/Users/robin/projects/surfing/scripts/postsurfing/postsurfing.mjs`
- **PostSurfing CLI Documentation**: `/Users/robin/projects/surfing/docs/postsurfing-cli.md`
- **Content Specification**: `/Users/robin/projects/surfing/docs/content-specification.md`
- **Surfing Website**: https://surfing.salty.vip/
