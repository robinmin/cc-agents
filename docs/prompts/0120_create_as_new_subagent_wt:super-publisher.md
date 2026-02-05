---
name: create as new subagent wt:super-publisher
description: Task: create as new subagent wt:super-publisher
status: Done
created_at: 2026-02-03 14:34:38
updated_at: 2026-02-03 15:30:00
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: pending
---

## 0120. create as new subagent wt:super-publisher

### Background

As we already created a set of Agent Skills to publish contents to specific platforms, we need to create a new subagent with the ability to publish contents via these Agent Skills, including:

- publish-to-juejin
- publish-to-qiita
- publish-to-surfing
- publish-to-x
- publish-to-zenn
- publish-to-infoq
- publish-to-medium
- publish-to-substack
- publish-to-wechatmp
- publish-to-xhs

Meanwhile, we also need to follow the output structure of Agent Skills `wt:technical-content-creation`. You can refer to `~/tcc/repo` for the details.

### Requirements

We hope this new subagent can:

- Provide content category and topic based platform selection functionality. We need to provide a decision table to implement this feature. Within this table, we will see each platform's preference for content categories and topics and languages. That will help subagent to make decition, you can design the table first, I will help you to complete the table content after we finish this Agent Skill.

- Define a simple orchestration workflow to enable publishing to multiple platforms in a single run, one by one no matter what happens we can handle errors gracefully and continue with the next platform.

- Generate a summary of the publishing results based on the predefined template

If we will design a slash command to trigger this subagent, we need to ensure we can use AskUserQuestion to ask user confirmation or adjustment for the destination platforms.

### Q&A

**Q:** Should the platform decision table be fully populated or just provide the structure?
**A:** Provide the table structure with example entries. The user will complete the detailed content mapping based on their expertise with each platform's preferences.

**Q:** How should the agent handle platforms that don't have available skills or credentials?
**A:** The agent should filter platforms by availability during the selection phase and exclude unavailable platforms with clear reasoning in the selection report.

**Q:** Should publishing be parallel or sequential?
**A:** Sequential (one-by-one) for error isolation. This allows graceful degradation where individual platform failures don't affect others, and enables checkpoint-based recovery.

**Q:** How should content be adapted for different platforms?
**A:** Content should be adapted for platform-specific requirements including character limits (X threads), formatting (YAML frontmatter), and metadata (tags/categories). Original content file should never be modified.

### Design

**Agent Architecture:**

The `wt:super-publisher` agent follows the 8-section agent structure:
1. METADATA - Namespace, role, purpose
2. PERSONA - Senior Multi-Platform Publishing Orchestration Expert
3. PHILOSOPHY - Platform-first selection, graceful degradation, sequential orchestration
4. VERIFICATION PROTOCOL - Content validation, platform availability checks
5. COMPETENCY LISTS - 50+ items across 8 categories
6. ORCHESTRATION PROCESS - 4-phase workflow (Analyze → Plan → Execute → Report)
7. ABSOLUTE RULES - Always do / Never do lists
8. OUTPUT FORMAT - Template-based reporting

**Platform Decision Table Structure:**

| Platform | Content Categories | Topics | Languages | Character Limit | Special Requirements |
|----------|-------------------|--------|-----------|-----------------|---------------------|
| Juejin | Technical | Backend, Frontend, AI, Android, iOS | Chinese (Simplified) | No strict limit | Category selection required |
| Qiita | Technical | Programming, Software Engineering | Japanese, English | No strict limit | YAML frontmatter required |
| Zenn | Technical | Programming, Software Engineering | Japanese | No strict limit | Markdown with YAML frontmatter |
| Medium | Technical, General | All tech topics, Business | English, Multilingual | No strict limit | Integration token required |
| X (Twitter) | Social, Technical | All topics, Threads | English, Multilingual | 280/tweet | Thread support for long content |
| Substack | Newsletter | All topics | English | No strict limit | Email subscription model |
| InfoQ | Enterprise Technical | Java, Architecture, Microservices | English, Chinese | No strict limit | Editorial review process |
| WeChat MP | General, Technical | All topics | Chinese (Simplified) | No strict limit | Official Account required |
| XHS | Lifestyle, Technical | Tech, Shopping, Lifestyle | Chinese (Simplified) | 1000+ characters | Image-rich content encouraged |
| Surfing (Dev.to) | Technical | Programming, Tutorials | English | No strict limit | Developer community focus |

**Orchestration Workflow:**

```
Phase 1: Analyze
├── Parse content file (title, content, tags, language)
├── Analyze content characteristics (topic, tone, audience)
├── Query platform decision table for matches
├── Filter by availability (skills, credentials)
└── Present via AskUserQuestion for confirmation

Phase 2: Plan
├── Determine execution order
├── Plan content adaptations per platform
├── Prepare error recovery strategy
├── Set checkpoint strategy
└── Configure dry-run mode (optional)

Phase 3: Execute
├── For each platform sequentially:
│   ├── Adapt content for platform requirements
│   ├── Invoke wt:publish-to-* skill
│   ├── Capture result (URL or error)
│   ├── Save checkpoint
│   └── Continue to next platform
├── Handle errors gracefully
└── Save intermediate state

Phase 4: Report
├── Aggregate all results
├── Generate summary report
├── Categorize outcomes (success/failure)
├── Provide recovery suggestions
└── Save report file
```

### Plan

**Step 1: Create Agent File**
- File: `plugins/wt/agents/super-publisher.md`
- Follow 8-section agent structure
- Reference existing patterns from `wt:tc-writer` and `wt:super-researcher`

**Step 2: Define Core Competencies**
- Platform decision table structure
- Sequential publishing orchestration
- Graceful error handling patterns
- Content adaptation strategies
- Summary report templates

**Step 3: Implement Orchestration Process**
- Phase 1: Analyze (content parsing, platform matching)
- Phase 2: Plan (execution order, adaptations)
- Phase 3: Execute (sequential publishing with checkpoints)
- Phase 4: Report (result aggregation)

**Step 4: Create Output Templates**
- Platform selection output
- Publishing progress output
- Summary report output
- Error recovery output

**Step 5: Define Verification Protocol**
- Content validation checklist
- Platform availability checks
- Pre-publishing verification
- Red flags and stop conditions

**Step 6: Document Integration Points**
- Orchestrates: All `wt:publish-to-*` skills
- Uses: AskUserQuestion for platform confirmation
- Tools: Read, Write, Edit, Grep, Glob

**Step 7: Add Examples and Anti-Patterns**
- Multi-platform publishing example
- Selective platform publishing example
- Language-based recommendation example
- Common anti-patterns to avoid

### Artifacts

| Type | Path | Generated By | Date |
| ---- | ---- | ------------ | ---- |
| Agent Definition | /Users/robin/projects/cc-agents/plugins/wt/agents/super-publisher.md | rd2:super-coder (via rd2:coder-claude) | 2026-02-03 |

### References

**Internal References:**
- `plugins/wt/agents/tc-writer.md` - Agent structure and orchestration patterns
- `plugins/wt/agents/super-researcher.md` - 8-section agent format reference
- `plugins/wt/skills/technical-content-creation/SKILL.md` - 7-stage workflow pattern
- `plugins/wt/skills/publish-to-medium/SKILL.md` - Example publish-to-* skill structure
- `plugins/wt/skills/publish-to-juejin/SKILL.md` - Example publish-to-* skill structure
- `plugins/wt/skills/publish-to-qiita/SKILL.md` - Example publish-to-* skill structure

**Related Tasks:**
- Task 0120: Create wt:super-publisher agent (this task)

**All Publish-To Skills:**
- `wt:publish-to-juejin` - Juejin (稀土掘金) publishing
- `wt:publish-to-qiita` - Qiita publishing
- `wt:publish-to-surfing` - Surfing (Dev.to) publishing
- `wt:publish-to-x` - X (Twitter) publishing
- `wt:publish-to-zenn` - Zenn publishing
- `wt:publish-to-infoq` - InfoQ publishing
- `wt:publish-to-medium` - Medium publishing
- `wt:publish-to-substack` - Substack publishing
- `wt:publish-to-wechatmp` - WeChat MP (公众号) publishing
- `wt:publish-to-xhs` - XHS (小红书) publishing
