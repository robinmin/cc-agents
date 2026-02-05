---
name: create new Agent Skills publish-to-xhs
description: Task: create new Agent Skills publish-to-xhs
status: Done
created_at: 2026-02-03 09:36:43
updated_at: 2026-02-03 12:00:00
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0118. create new Agent Skills publish-to-xhs

### Background

We need to create a new Agent Skill(into plugins/wt/skills/publish-to-xhs) that allows agents to publish content to XHS (Xiaohongshu), a popular social media platform in China. This skill will enable agents to share their insights, products, or services with a wider audience on XHS.

And, we already have the following Agent Skills to publish content to other platforms, we should consider to use the same architecture and design principles and technologies stack:

- plugins/wt/skills/publish-to-infoq/
- plugins/wt/skills/publish-to-juejin/
- plugins/wt/skills/publish-to-medium/
- plugins/wt/skills/publish-to-qiita/
- plugins/wt/skills/publish-to-substack/
- plugins/wt/skills/publish-to-surfing/
- plugins/wt/skills/publish-to-wechatmp/
- plugins/wt/skills/publish-to-x/
- plugins/wt/skills/publish-to-zenn/

And,I already collected and downloaded a few sample Agent Skills publish contents to XHS. You can find them in the following directory:

- vendors/byheaven-skills/plugins/xhs-publisher/skills/xhs-publisher
- vendors/DeepAgents-AutoGLM/examples/skills/xiaohongshu-posting
- vendors/fully-automatic-article-generation-skill/skills/xiaohongshu-publisher

One thing you **MUST** know, all these files/folders under folder @vendors are just for reference and in development environment only, you should not add any reference to them. If you need any content from them, you should copy them to your own project and modify them as needed.

### Requirements

- Use the same architecture and design principles and technologies stack as the existing Agent Skills to publish content to other platforms.
- Then invoke subagents `rd2:skill-expert` and `rd2:skill-doctor` to evaluate and fine tune the Agent Skills.

### Q&A

**Q:** Should publish-to-xhs follow the same architecture as publish-to-juejin or publish-to-x?
**A:** Since XHS (Xiaohongshu) is a Chinese social media platform similar to Juejin with browser-based publishing (no official API), it should follow the publish-to-juejin architecture using Chrome DevTools Protocol (CDP) for browser automation.

**Q:** What about the vendor reference implementations mentioned in the task?
**A:** The vendor implementations are for copy-only reference. I copied relevant patterns (CDP utilities, DOM selectors, workflow) and adapted them for XHS, without directly referencing the vendor folders.

**Q:** After implementation, should I invoke skill-expert and skill-doctor for evaluation?
**A:** Yes, per the task requirements. After implementation is complete, invoke `rd2:skill-expert` and `rd2:skill-doctor` for quality evaluation and fine-tuning.

### Design

**Architecture:** Browser automation via Chrome DevTools Protocol (CDP)

**Components:**

1. **SKILL.md** - Main skill documentation with frontmatter
2. **scripts/xhs-article.ts** - Main publishing workflow script
3. **scripts/xhs-utils.ts** - XHS-specific utilities (config, URLs, parsing)
4. **scripts/cdp.ts** - Chrome DevTools Protocol abstraction layer
5. **references/** - Documentation (technical-details, troubleshooting, usage-examples)

**Technology Stack:**

- TypeScript (same as existing publish-to-\* skills)
- Chrome DevTools Protocol for browser automation
- bun runtime for script execution
- YAML frontmatter for markdown metadata

**Design Patterns:**

- Follows publish-to-juejin architecture closely (both Chinese platforms with no official API)
- Multiple DOM selector fallbacks for robustness
- Session persistence via Chrome user profile
- WT plugin configuration pattern (~/.claude/wt/config.jsonc)

### Plan

**Step 1: Create Skill Structure** - COMPLETED

- Created `/Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-xhs/` directory
- Created SKILL.md with proper frontmatter and documentation

**Step 2: Implement Core Utilities** - COMPLETED

- Created scripts/xhs-utils.ts with XHS-specific configuration
- Created scripts/cdp.ts with CDP abstraction layer

**Step 3: Implement Publishing Workflow** - COMPLETED

- Created scripts/xhs-article.ts with main publishing logic
- DOM selectors for XHS UI elements
- Login detection and session management
- Article field filling (title, content, category, tags)
- Submit/publish workflow

**Step 4: Create Reference Documentation** - COMPLETED

- Created references/technical-details.md
- Created references/troubleshooting.md
- Created references/usage-examples.md

**Step 5: Invoke rd2:skill-expert for Evaluation** - PENDING

- Evaluate skill structure and quality
- Fine-tune based on feedback

**Step 6: Invoke rd2:skill-doctor for Validation** - PENDING

- Validate skill against best practices
- Apply final polish

### Artifacts

| Type                  | Path                                                             | Generated By     | Date       |
| --------------------- | ---------------------------------------------------------------- | ---------------- | ---------- |
| Skill Documentation   | plugins/wt/skills/publish-to-xhs/SKILL.md                        | rd2:coder-claude | 2025-02-03 |
| Publishing Script     | plugins/wt/skills/publish-to-xhs/scripts/xhs-article.ts          | rd2:coder-claude | 2025-02-03 |
| XHS Utilities         | plugins/wt/skills/publish-to-xhs/scripts/xhs-utils.ts            | rd2:coder-claude | 2025-02-03 |
| CDP Utilities         | plugins/wt/skills/publish-to-xhs/scripts/cdp.ts                  | rd2:coder-claude | 2025-02-03 |
| Technical Details     | plugins/wt/skills/publish-to-xhs/references/technical-details.md | rd2:coder-claude | 2025-02-03 |
| Troubleshooting Guide | plugins/wt/skills/publish-to-xhs/references/troubleshooting.md   | rd2:coder-claude | 2025-02-03 |
| Usage Examples        | plugins/wt/skills/publish-to-xhs/references/usage-examples.md    | rd2:coder-claude | 2025-02-03 |

### References

**Existing publish-to-\* skills (for architecture patterns):**

- plugins/wt/skills/publish-to-qiita/SKILL.md
- plugins/wt/skills/publish-to-juejin/SKILL.md
- plugins/wt/skills/publish-to-medium/SKILL.md
- plugins/wt/skills/publish-to-x/SKILL.md
- plugins/wt/skills/publish-to-zenn/SKILL.md

**Key Implementation References:**

- juejin-article.ts - Main publishing workflow pattern
- juejin-utils.ts - Configuration and utilities pattern
- cdp.ts - Chrome DevTools Protocol abstraction

**XHS Platform Documentation:**

- https://www.xiaohongshu.com - Official XHS website
- https://www.xiaohongshu.com/creator - Creator center
- https://help.xiaohongshu.com - Help/Documentation

**WT Plugin Patterns:**

- SKILL.md frontmatter format
- scripts/ directory structure
- CLAUDE_PLUGIN_ROOT variable usage
- ~/.claude/wt/config.jsonc configuration pattern
