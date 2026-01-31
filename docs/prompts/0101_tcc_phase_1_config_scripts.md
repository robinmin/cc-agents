---
name: TCC Phase 1 - Configuration & Scripts Foundation
description: Phase 1: Create configuration utilities and repository management scripts for technical-content-creation skill
status: Done
created_at: 2026-01-30
updated_at: 2026-01-30 15:50:26
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0101. TCC Phase 1 - Configuration & Scripts Foundation

### Background

The technical-content-creation skill needs helper scripts to manage repository configuration and topic initialization. Currently, there's no centralized configuration mechanism, and users must manually create folder structures.

Configuration should be centralized in `~/.claude/wt/config.jsonc` under a `technical-content-creation` key, following the pattern used by other wt plugin skills.

### Requirements

**Deliverables:**

1. **`scripts/shared/config.py`**
   - `get_wt_config()` - Load ~/.claude/wt/config.jsonc
   - `get_tcc_config()` - Get technical-content-creation section
   - `set_tcc_config(key, value)` - Update TCC configuration
   - Handle JSONC (JSON with comments) parsing
   - Create config directory/file if not exists

2. **`scripts/repo-config.py`**
   - `--detect` - Read TCC_REPO_ROOT from config
   - `--set-root <path>` - Update config.jsonc with repo root
   - `--validate` - Verify repository structure exists
   - `--list-collections` - Show all available collections
   - `--list-topics <collection>` - Show topics in a collection
   - `--set-default-collection <name>` - Set default collection

3. **`scripts/topic-init.py`**
   - `--topic <name>` - Topic identifier (required)
   - `--collection <name>` - Collection name (required)
   - `--title <title>` - Human-readable title
   - `--description <text>` - Topic description
   - Creates 7-stage folder structure (0-materials/ through 6-publish/)
   - Creates topic.md with proper frontmatter
   - Registers topic in collections.json
   - Auto-creates collection if `auto_create_collections: true`

4. **`scripts/context-validator.py`**
   - `--validate` - Check if in valid topic folder
   - `--status` - Show completion status of all 7 stages
   - `--detect-stage` - Output current stage based on folder contents
   - `--verify-dependencies` - Ensure previous stages complete

**Acceptance Criteria:**
- All scripts run without errors
- Config reads from ~/.claude/wt/config.jsonc
- TCC_REPO_ROOT properly detected and validated
- Topic initialization creates all 7 folders
- Context validator correctly detects stage status

### Q&A

**Q: What format does the config file use?**
A: JSONC (JSON with Comments) format, stored at `~/.claude/wt/config.jsonc`. Supports `//` single-line comments, `/* */` multi-line comments, and trailing commas.

**Q: What happens if the config file doesn't exist?**
A: The scripts auto-create the config directory and file with default values when first accessed.

**Q: Can topic-init.py create collections automatically?**
A: Yes, if `auto_create_collections: true` in config (default is true). The collection ID is slugified from the collection name.

**Q: How does context-validator.py detect the current stage?**
A: It analyzes folder contents to find the highest incomplete stage. If all stages are complete, it returns stage 6 (Publish).

**Q: What validation does repo-config.py perform on --set-root?**
A: It verifies the directory exists and contains `collections.json` and a `collections/` folder.

### Design

[Architecture/specs added by specialists]

### Plan

1. Create scripts/shared/ directory
2. Implement config.py with JSONC support
3. Implement repo-config.py with all commands
4. Implement topic-init.py with folder creation
5. Implement context-validator.py with stage detection
6. Test each script individually
7. Test integration between scripts

### Implementation Summary

All four Phase 1 deliverables have been implemented:

1. **`scripts/shared/config.py`** - Configuration utilities module
   - `get_wt_config()` - Loads ~/.claude/wt/config.jsonc
   - `get_tcc_config()` - Returns TCC section with defaults
   - `set_tcc_config(key, value)` - Updates specific config key
   - `strip_json_comments()` - Handles JSONC (comments + trailing commas)
   - `ensure_config_exists()` - Auto-creates config if needed
   - Also includes `get_tcc_repo_root()` and `set_tcc_repo_root()` helpers

2. **`scripts/repo-config.py`** - Repository configuration CLI
   - `--detect` - Shows current repository root
   - `--set-root <path>` - Sets and validates repository root
   - `--validate` - Verifies repository structure
   - `--list-collections` - Lists all collections
   - `--list-topics <collection>` - Shows topics in a collection
   - `--set-default-collection <name>` - Sets default collection

3. **`scripts/topic-init.py`** - Topic initialization script
   - `--topic <name>` - Topic identifier (required)
   - `--collection <name>` - Collection name (required)
   - `--title <title>` - Human-readable title
   - `--description <text>` - Topic description
   - `--author <name>` - Author name
   - `--email <email>` - Author email
   - `--tag <tag>` - Primary tag
   - `--notes <text>` - Additional notes
   - Creates all 7 stage folders with proper subdirectories
   - Creates topic.md with proper frontmatter
   - Registers topic in collections.json (increments topic_count)
   - Auto-creates collection if `auto_create_collections: true`

4. **`scripts/context-validator.py`** - Context validation script
   - `--validate` - Checks if in valid topic folder
   - `--status` - Shows completion status of all 7 stages
   - `--detect-stage` - Outputs current stage number
   - `--detect-stage --json` - JSON output for scripting
   - `--verify-dependencies` - Checks prerequisites for target stage
   - `--verify-dependencies --stage N` - Checks prerequisites for specific stage

**Additional files created:**
- `scripts/shared/__init__.py` - Package initialization
- `scripts/test-all-scripts.sh` - Test suite for all scripts

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Script | scripts/shared/config.py | Phase 1 | 2026-01-30 |
| Script | scripts/repo-config.py | Phase 1 | 2026-01-30 |
| Script | scripts/topic-init.py | Phase 1 | 2026-01-30 |
| Script | scripts/context-validator.py | Phase 1 | 2026-01-30 |
| Module | scripts/shared/__init__.py | Phase 1 | 2026-01-30 |
| Test | scripts/test-all-scripts.sh | Phase 1 | 2026-01-30 |

### References

- wt plugin config pattern: ~/.claude/wt/config.jsonc
- Existing task: 0090_technical_content_creattion_tool_set.md
