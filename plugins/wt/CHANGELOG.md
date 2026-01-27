# Changelog

All notable changes to the wt plugin will be documented in this file.

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