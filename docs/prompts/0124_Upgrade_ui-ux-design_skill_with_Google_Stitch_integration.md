---
name: Upgrade ui-ux-design skill with Google Stitch integration
description: Enhance rd2:ui-ux-design skill with Google Stitch AI for end-to-end UI design generation, design-to-code pipeline, and design system consistency
status: Done
created_at: 2026-01-30 12:08:03
updated_at: 2026-01-30 12:16:29
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0124. Upgrade ui-ux-design skill with Google Stitch integration

### Background

The `rd2:ui-ux-design` skill currently provides comprehensive UI/UX design patterns (~550 lines) covering:
- WCAG 2.1 AA accessibility guidelines
- Design tokens and component patterns
- Responsive design and layout systems
- Design handoff checklists

However, it lacks integration with AI-powered design generation tools. Google Stitch is now available via MCP, enabling:
- AI-generated UI screens from natural language prompts
- Design-to-code pipeline with production-ready frontend code
- Design context extraction for visual consistency across screens

The goal is to add Stitch capabilities as a new layer while preserving the existing battle-tested patterns as a fallback.

**Architecture Principle**: Fat Skills, Thin Wrappers
- `rd2:ui-ux-design` is the fat skill (core logic)
- `rd2:super-designer` is a thin wrapper that calls it
- Potential `rd2:super-coder` integration for later

### Requirements

**Functional Requirements:**

1. **Stitch Tool Integration**
   - [ ] Integrate all 6 Stitch MCP tools (create_project, get_project, list_projects, list_screens, get_screen, generate_screen_from_text)
   - [ ] Add prerequisites verification section
   - [ ] Document device types (MOBILE, DESKTOP, TABLET) and model options (GEMINI_3_FLASH, GEMINI_3_PRO)

2. **Workflow Modes**
   - [ ] Implement Prompt-First workflow (describe UI → generate → extract code)
   - [ ] Implement Context-First workflow (extract design DNA → generate matching screens)
   - [ ] Implement Iterative Refinement workflow (generate → review → refine loop)

3. **Design Context Management**
   - [ ] Define design-context.json schema (colors, typography, spacing, components)
   - [ ] Hybrid storage: local file + Stitch project
   - [ ] Context extraction, loading, updating, validation operations

4. **Code Output Handling**
   - [ ] Direct file output to project paths
   - [ ] Path conventions for HTML, React, Vue components
   - [ ] Post-processing: format, validate, accessibility check
   - [ ] Output report with component summary and warnings

5. **Error Handling & Fallback**
   - [ ] Detect Stitch unavailability (API errors, auth failures)
   - [ ] Graceful degradation to Layer 1 patterns
   - [ ] Fallback message template with actionable guidance
   - [ ] Recovery detection when Stitch becomes available

**Non-Functional Requirements:**

- [ ] Preserve all existing patterns (~550 lines) intact
- [ ] New content ~250-300 lines
- [ ] Create 3 reference files in `references/` directory
- [ ] Total skill size ~800-850 lines

### Q&A

| Question | Decision |
|----------|----------|
| Primary goal for Stitch integration? | Full workflow: design generation + design-to-code + design system consistency |
| Integration with rd2 workflow? | Fat skill (ui-ux-design) with thin wrapper (super-designer) |
| Workflow modes to support? | All three: prompt-first, context-first, iterative refinement |
| Code output handling? | Direct file output to specified project paths |
| Design context persistence? | Hybrid: local design-context.json + Stitch project |
| Error handling strategy? | Graceful degradation to existing patterns when Stitch unavailable |

### Design

**Layered Architecture:**

```
┌─────────────────────────────────────────────┐
│  Layer 3: Stitch Integration (NEW)          │
│  - generate_screen, extract_context         │
│  - project/screen management                │
│  - code export to files                     │
├─────────────────────────────────────────────┤
│  Layer 2: Workflow Orchestration (NEW)      │
│  - prompt-first, context-first, refinement  │
│  - design context persistence               │
│  - fallback handling                        │
├─────────────────────────────────────────────┤
│  Layer 1: Existing Patterns (KEEP)          │
│  - WCAG, design tokens, components          │
│  - responsive design, accessibility         │
│  - serves as fallback when Stitch fails     │
└─────────────────────────────────────────────┘
```

**File Structure:**

```
plugins/rd2/skills/ui-ux-design/
├── SKILL.md                    # Main skill file (enhanced)
└── references/
    ├── stitch-workflows.md     # Detailed Stitch workflow docs
    ├── design-context-schema.md # Design DNA format spec
    └── fallback-patterns.md    # Degraded mode guidance
```

**Design Context Schema:**

```json
{
  "version": "1.0",
  "projectId": "stitch-project-id",
  "extractedFrom": "screenId",
  "extractedAt": "2026-01-30T12:00:00Z",
  "colors": { "primary": "#3b82f6", "secondary": "#6366f1", ... },
  "typography": { "fontFamily": "Inter", "scale": {...} },
  "spacing": { "unit": "4px", "scale": [...] },
  "components": { "borderRadius": "8px", "buttonStyle": "..." }
}
```

### Plan

1. **Read existing skill** - Understand current structure and content
2. **Add Stitch Integration section** - Prerequisites, tools, parameters
3. **Add Workflow sections** - Prompt-first, context-first, iterative refinement
4. **Add Design Context section** - Schema, operations, persistence
5. **Add Code Output section** - File handling, path conventions, post-processing
6. **Add Fallback Mode section** - Detection, degradation, recovery
7. **Update Overview and Quick Start** - Add Stitch examples
8. **Create reference files** - stitch-workflows.md, design-context-schema.md, fallback-patterns.md
9. **Update sources** - Add Stitch documentation links
10. **Verify skill loads correctly** - Test with Skill tool

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Task File | docs/prompts/0124_*.md | super-planner | 2026-01-30 |
| Updated SKILL.md | plugins/rd2/skills/ui-ux-design/SKILL.md | super-coder | 2026-01-30 |
| Stitch Workflows Reference | plugins/rd2/skills/ui-ux-design/references/stitch-workflows.md | super-coder | 2026-01-30 |
| Design Context Schema Reference | plugins/rd2/skills/ui-ux-design/references/design-context-schema.md | super-coder | 2026-01-30 |
| Fallback Patterns Reference | plugins/rd2/skills/ui-ux-design/references/fallback-patterns.md | super-coder | 2026-01-30 |

### References

- [From idea to app: Introducing Stitch - Google Developers Blog](https://developers.googleblog.com/stitch-a-new-way-to-design-uis/)
- [stitch-mcp on GitHub](https://github.com/Kargatharaakash/stitch-mcp)
- [Google AI Developer Updates at I/O 2025](https://blog.google/technology/developers/google-ai-developer-updates-io-2025/)
- [The Designer Flow for AI - DEV Community](https://dev.to/kargatharaaakash/the-designer-flow-for-ai-why-i-built-a-bridge-to-google-stitch-423k)
- Current skill: `plugins/rd2/skills/ui-ux-design/SKILL.md`
