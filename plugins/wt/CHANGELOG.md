# Changelog

All notable changes to the wt plugin will be documented in this file.

## [1.6.0] - 2026-01-30

### Summary

**Technical Writing & Content Management: Complete Content Lifecycle Support**

Added it-writer subagent for IT technical writing, comprehensive topic lifecycle commands, and image generation skills. Implemented full technical content creation workflow with multi-stage pipeline from research to publication.

### Added

- **it-writer Subagent** (`agents/it-writer.md`):
  - IT technical writing specialist
  - Architecture documentation, API guides, tutorials
  - Code examples and best practices integration

- **Topic Lifecycle Commands** (`commands/topic-*.md`):
  - `topic-init` - Initialize new content topics
  - `topic-create` - Create topic from research brief
  - `topic-outline` - Generate multi-option outlines
  - `topic-draft` - Write first drafts with revisions
  - `topic-illustrate` - Add article illustrations
  - `topic-adapt` - Adapt content for different platforms
  - `topic-publish` - Prepare for publication

- **Information Commands**:
  - `info-seek` - Extract and verify knowledge from files, URLs, or search queries

- **Image Generation Skills**:
  - `image-cover` - Cover image generation for blogs, news, tutorials
  - `image-generate` - Template-based image generation with style presets
  - `image-illustrator` - Automatic article illustration with position detection

- **technical-content-creation Skill** (`skills/technical-content-creation/`):
  - Full workflow: materials → research → outline → draft → illustrate → adapt → publish
  - Sample repository with template collections
  - Complete workflow examples and tests
  - Multi-platform adaptation (Dev.to, LinkedIn, Twitter)

### Changed

- **Plugin Configuration** (`.claude/plugin.json`):
  - Updated version: `1.5.6` → `1.6.0`

### Benefits

- **End-to-End Content Pipeline**: From topic initiation to multi-platform publication
- **IT Writing Excellence**: Specialized agent for technical documentation
- **Visual Enhancement**: Automatic cover and illustration generation
- **Research Integration**: Knowledge extraction and verification built into workflow

---

## [1.5.6] - 2026-01-27

### Summary

**Browser Automation & Research Enhancement: New Subagent and Skills**

Added magent-browser subagent for comprehensive browser automation and lead-research-assistant skill for business lead generation. Enhanced markitdown-browser skill with improved markdown conversion capabilities.

### Added

- **magent-browser Subagent** (`agents/magent-browser.md`):
  - Browser automation using agent-browser skill
  - Screenshot capture, form filling, web scraping
  - JavaScript-rendered content support
  - Interactive element navigation via refs

- **lead-research-assistant Skill** (`skills/lead-research-assistant/`):
  - Identifies high-quality leads for products and services
  - Analyzes business, search patterns, and location data
  - Comprehensive research methodology

- **markitdown-browser Skill** (`skills/markitdown-browser/`):
  - Web content to clean markdown conversion
  - Support for multiple formats (HTML, PDF, Office docs)
  - Agent-browser integration for dynamic content

### Changed

- **Plugin Configuration** (`.claude/plugin.json`):
  - Updated version: `1.5.5` → `1.5.6`
  - Added magent-browser to agents array
  - Added new skills to capabilities

### Benefits

- **Browser Automation**: Complete control over web interactions
- **Research Automation**: Systematic lead identification and qualification
- **Clean Output**: High-quality markdown from web sources

---