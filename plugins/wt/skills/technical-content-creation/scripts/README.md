# Technical Content Creation Scripts

Helper scripts for the technical-content-creation skill.

## Installation

Dependencies are managed in the centralized `pyproject.toml` at the project root.

```bash
# From project root - install all dependencies
uv sync

# Or install just the TCC scripts dependency
uv pip install json-comment>=1.0.0
```

**Required Dependencies:**
- `json-comment>=1.0.0` - For safe JSONC (JSON with Comments) parsing

**Note:** The scripts will provide clear error messages if dependencies are missing.

## Scripts Overview

### 1. `outline-generator.py` - Outline Generator (Stage 2)

Generate 2-3 alternative outline options from a research brief with user selection.

```bash
# Generate 3 outline options with interactive selection
python3 outline-generator.py --options 3 --length long --interactive

# Generate 2 outline options (non-interactive)
python3 outline-generator.py --options 2 --length short

# Approve a specific option
python3 outline-generator.py --approve b

# List existing outline options
python3 outline-generator.py --list
```

**Features:**
- Reads research brief from `1-research/research-brief.md`
- Generates 2-3 outline options in parallel:
  - Option A: Traditional/Structured (hierarchical, logical)
  - Option B: Narrative/Story-driven (engaging flow)
  - Option C: Technical/Deep-dive (comprehensive, detailed)
- Saves options to `2-outline/outline-option-{a,b,c}.md`
- Stores generation materials in `2-outline/materials/`
- Interactive or non-interactive mode
- Copies selected option to `2-outline/outline-approved.md`

See `../references/outline-multi-option.md` for complete documentation.

### 2. `repo-config.py` - Repository Configuration

Manage repository root detection, validation, and collection listing.

```bash
# Detect current repository root
python3 repo-config.py --detect

# Set repository root (validates structure)
python3 repo-config.py --set-root /path/to/repo

# Validate repository structure
python3 repo-config.py --validate

# List all collections
python3 repo-config.py --list-collections

# List topics in a collection
python3 repo-config.py --list-topics technical-tutorials

# Set default collection
python3 repo-config.py --set-default-collection technical-tutorials
```

### 2. `topic-init.py` - Topic Initialization

Create new topics with the 7-stage folder structure.

```bash
# Create a new topic (minimal)
python3 topic-init.py --topic microservices-guide --collection technical-tutorials

# Create with full metadata
python3 topic-init.py \
  --topic ai-coding-best-practices \
  --collection tutorials \
  --title "AI Coding Best Practices" \
  --description "A comprehensive guide for using AI coding assistants" \
  --author "Your Name" \
  --email "you@example.com" \
  --tag "ai" \
  --notes "Focus on Claude Code and GitHub Copilot"
```

Creates the following structure:
```
<collection>/<topic-id>/
├── topic.md
├── 0-materials/
├── 1-research/
├── 2-outline/
│   └── materials/
├── 3-draft/
│   └── draft-revisions/
├── 4-illustration/
│   └── images/
├── 5-adaptation/
└── 6-publish/
    ├── published/
    └── assets/
```

### 3. `context-validator.py` - Context Validation

Validate current directory and check stage completion status.

```bash
# Check if in valid topic folder
python3 context-validator.py --validate

# Show completion status of all stages
python3 context-validator.py --status

# Detect current stage (outputs number)
python3 context-validator.py --detect-stage

# Detect current stage (JSON output)
python3 context-validator.py --detect-stage --json

# Verify dependencies for next stage
python3 context-validator.py --verify-dependencies

# Verify dependencies for specific stage
python3 context-validator.py --verify-dependencies --stage 3
```

### 4. `shared/config.py` - Configuration Module

Python module for configuration management.

```python
from shared.config import (
    get_wt_config,
    get_tcc_config,
    set_tcc_config,
    get_tcc_repo_root,
    set_tcc_repo_root,
)

# Get TCC configuration
config = get_tcc_config()
print(config["tcc_repo_root"])
print(config["default_collection"])

# Set configuration
set_tcc_config("default_collection", "technical-tutorials")
set_tcc_repo_root("/path/to/repo")
```

## Configuration

Configuration is stored in `~/.claude/wt/config.jsonc`:

```jsonc
// wt Plugin Configuration
{
  "version": "1.0.0",
  "last_updated": "2026-01-30T...",
  "technical-content-creation": {
    "tcc_repo_root": "/path/to/repo",
    "default_collection": "technical-tutorials",
    "auto_create_collections": true,
    "collections_path": "collections"
  }
}
```

### Configuration Keys

| Key | Type | Description |
|-----|------|-------------|
| `tcc_repo_root` | string | Absolute path to TCC repository |
| `default_collection` | string | Default collection ID |
| `auto_create_collections` | boolean | Auto-create collections when needed |
| `collections_path` | string | Relative path to collections folder |

## Testing

Run the test suite:

```bash
# Quick integration test
python3 quick-test.py

# Full test suite
bash test-all-scripts.sh
```

## File Structure

```
scripts/
├── README.md                 # This file
├── quick-test.py             # Quick integration test
├── test-all-scripts.sh       # Full test suite
├── outline-generator.py      # Stage 2: Outline generation
├── repo-config.py            # Repository configuration
├── topic-init.py             # Topic initialization
├── context-validator.py      # Context validation
└── shared/
    ├── __init__.py
    └── config.py             # Configuration module
```

## Stage Reference

| Stage | Name | Folder | Key Output Files |
|-------|------|--------|------------------|
| 0 | Materials | `0-materials/` | `materials-extracted.md` |
| 1 | Research | `1-research/` | `research-brief.md` |
| 2 | Outline | `2-outline/` | `outline-approved.md` |
| 3 | Draft | `3-draft/` | `draft-article.md` |
| 4 | Illustration | `4-illustration/` | `captions.json` |
| 5 | Adaptation | `5-adaptation/` | `article-twitter.md`, `article-linkedin.md` |
| 6 | Publish | `6-publish/` | `article.md`, `publish-log.json` |
