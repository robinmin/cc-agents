# CHANGELOG

## [1.1.2] - 2025-11-25

### Added

- **Prompts Management Tool:** `prompts.sh` script for managing LLM prompts.
  - `init`: Initialize prompts directory, Kanban board, and template.
  - `create`: Create new prompts from template with automatic WBS numbering.
  - `list`: List prompts by stage.
  - `update`: Update prompt status and move cards on Kanban board.
  - `refresh`: Sync Kanban board with prompt files.
  - Automatic symlink creation (`/usr/local/bin/prompts`) for easy access.
  - Dynamic template support with placeholders (`{{PROMPT_NAME}}`, `{{WBS}}`, etc.).
  - Obsidian Kanban plugin integration.
- **Documentation:** `docs/about_prompts.md` guide.

## [1.1.0] - 2025-10-26

### Added

- **Meta-skill system for skill management:** `cc-skills` skill with comprehensive best practices
  - SKILL.md: Core domain knowledge for Claude Code Agent Skills
  - BEST_PRACTICES.md: Detailed guidelines and examples
  - EXAMPLES.md: Complete skill examples (code review, API docs, test automation, data processing)
  - TEMPLATES.md: Starter templates (basic, complete, workflow, analysis)
- **Skill creation automation:** `/rd:add-skill` command
  - Creates skill with proper structure and frontmatter
  - Supports 4 templates: basic, complete, workflow, analysis
  - Validates skill name and generates README with next steps
  - Bash script (`addskill.sh`) for file generation
- **Skill refinement:** `/rd:refine-skill` command
  - Analyzes skills against best practices
  - Identifies issues and generates improvement plan
  - Applies refinements with user approval
- **Skill evaluation:** `/rd:evaluate-skill` command
  - Read-only comprehensive quality assessment
  - Evaluates 6 categories: frontmatter, content, structure, efficiency, best practices, code
  - Generates detailed report with scoring and recommendations
  - Prioritized improvement suggestions

### Changed

- **Reorganized commands by prefix for better grouping:**
  - Skill management commands now grouped with `skill-*` prefix:
    - `add-skill` → `skill-add`
    - `evaluate-skill` → `skill-evaluate`
    - `refine-skill` → `skill-refine`
  - 10-stage workflow commands now grouped with `10-dev-*` prefix:
    - `apply-10-dev` → `10-dev-apply`
    - `check-10-dev` → `10-dev-check`
    - `init-10-dev` → `10-dev-init`
    - `integrate-10-dev` → `10-dev-integrate`

## [1.0.0] - 2025-10-26

### Added

- Production-ready `rd` plugin (v1.0.0) for 10-stage TDD workflow
- Multi-plugin architecture with separate directories (`plugins/hello/`, `plugins/rd/`)
- Flattened command structure: `/rd:apply-10-dev` instead of `/rd:10-stages-developing:apply-10-dev`

### Changed

- Streamlined command documentation (36% reduction: 1,521 → 979 lines)
- Restructured project to support multiple plugins cleanly
- Updated all documentation to use `/rd:` command prefix

### Fixed

- Plugin namespace conflicts resolved through separate source directories
- Command reference consistency across all documentation files

## [0.0.1] - 2025-10-25

### Added

- Initial project structure
- Example plugin (my-first-plugin)
- 10-stage development workflow skill
