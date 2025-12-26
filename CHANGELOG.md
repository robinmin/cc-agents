# CHANGELOG

## [1.1.4] - 2025-12-26

### Summary

**Tasks Management Tool - Complete Implementation**

The Tasks Management Tool (`prompts.sh` script, accessed via `tasks` command) provides a complete task prompt management system with Kanban board integration. This release encompasses the initial implementation (v1.1.2) and the command rename (v1.1.3) into a single, cohesive feature release.

### Added

- **Tasks Management Tool**: Complete task prompt management system (`plugins/rd/scripts/prompts.sh`)
  - `tasks init`: Initialize tasks directory, Kanban board, template, and create symlink at `/opt/homebrew/bin/tasks`
  - `tasks create <name>`: Create new tasks from template with automatic WBS numbering (4-digit sequence)
  - `tasks list [stage]`: List tasks by stage (`Backlog`, `Todo`, `WIP`, `Testing`, `Done`) or view entire board
  - `tasks update <WBS> <stage>`: Update task status and automatically refresh Kanban board
  - `tasks refresh`: Sync Kanban board with task files (extracts `status` from each task file)
  - `tasks help`: Show usage information
  - Dynamic template support with placeholders: `{{PROMPT_NAME}}`, `{{CREATED_AT}}`, `{{UPDATED_AT}}`
  - Obsidian Kanban plugin integration with `docs/prompts/.kanban.md`
  - Requires `glow` for terminal markdown rendering

### Changed

- **Command Name**: Unified all references to use `tasks` command (previously `prompts`) for clarity
  - Symlink location: `/opt/homebrew/bin/tasks` (previously `/usr/local/bin/prompts`)
  - Script location remains at `plugins/rd/scripts/prompts.sh` for backward compatibility
  - Updated all documentation files with new command references

### Documentation

- **New Guide**: `docs/about_tasks.md` - Comprehensive usage guide with command reference
- **Updated**: `docs/prompt.md` - Design documentation with tool overview
- **Updated**: `plugins/rd/commands/task-run.md` - Integration examples using `tasks` command
- **Template**: `docs/prompts/.template.md` - Task file template with frontmatter structure

## [1.1.2] - 2025-11-25

> **Note**: See v1.1.4 for complete Tasks Management Tool documentation. This version entry is preserved for historical reference.

### Added

- **Tasks Management Tool**: Initial implementation of task prompt management system
- **Documentation**: Initial guide (later replaced by `docs/about_tasks.md`)

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
