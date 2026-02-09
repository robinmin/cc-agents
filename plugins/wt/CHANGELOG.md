# Changelog

All notable changes to the wt plugin will be documented in this file.

## [1.7.4] - 2026-02-07

### Summary

**Browser Automation Enhancement & New Image Generation: Playwright Integration, Unified Web Automation, and Image Generator Subagent**

Major refactoring of web automation infrastructure with Playwright integration, new CDP module, and comprehensive unit tests. Added wt:image-generator subagent for AI image generation and appwrite application support.

### Added

- **wt:image-generator Subagent** (`agents/image-generator.md`):
  - AI-powered image generation with multiple backends (HuggingFace, Gemini)
  - Template-based generation with style presets
  - Configurable resolution, steps, and seed parameters
  - Support for cover images and article illustrations

- **wt:image-generate Command** (`commands/image-generate.md`):
  - Slash command interface for image generation
  - Preset templates (blog, news, tutorial, technical)
  - Style options (realistic, artistic, minimalist, vibrant, dark, light)
  - Backend selection (z-image-turbo, stable-diffusion, flux)

- **web-automation Package** (`scripts/web-automation/`):
  - **CDP Module** (`src/cdp.ts`): Chrome DevTools Protocol integration for browser control
  - **Playwright Integration** (`src/playwright.ts`): Modern browser automation framework
  - **Async Utilities** (`src/async.ts`): Timeout handling, retry logic, sleep utilities
  - **Config System** (`src/config.ts`): Centralized configuration with XDG paths
  - **Selectors Module** (`src/selectors.ts`): Helper functions for element selection
  - **Sanitize Module** (`src/sanitize.ts`): Content sanitization for safe HTML generation
  - **Error Types** (`src/errors.ts`): Custom error classes for better error handling
  - **Logger** (`src/logger.ts`): Structured logging for debugging

- **Appwrite Application**:
  - New application added to plugin capabilities
  - Serverless backend and authentication support

### Changed

- **publish-to-x Enhancements**:
  - Migrated from browser.js CDP wrapper to unified web-automation package
  - Added `x-playwright.ts` for Playwright-based publishing
  - Enhanced `x-article-playwright.ts` with better content processing
  - Improved quote handling and content consistency

- **publish-to-wechatmp Enhancements**:
  - Adapted to use Playwright via web-automation package
  - Replaced CDP-based approach with modern Playwright integration
  - Improved article formatting and content processing

- **publish-to-surfing Enhancements**:
  - Fixed script exit issues with proper cleanup
  - Added advanced options for content publishing
  - Improved error handling and async patterns

- **Publish-to Skills Migration**:
  - All publish-to-* skills migrated to use `@wt/web-automation` workspace package
  - Unified module resolution with proper package.json exports
  - Removed code duplication across publish-to skills

### Fixed

- **Module Resolution Issues**:
  - Fixed imports from `@wt/web-automation/dist/*.js` to use package exports
  - Added missing `@wt/web-automation` workspace dependencies
  - Corrected function name imports (e.g., `readWtConfig` → `getZennConfig`)

- **Unit Test Infrastructure**:
  - Fixed environment variable handling in test lifecycle hooks
  - Achieved 100% pass rate for web-automation tests (678 pass / 0 fail)
  - Achieved 100% pass rate for all publish-to skills (288 tests)
  - Fixed test imports and outdated test expectations

- **Content Processing**:
  - Fixed MathJax type safety issues
  - Fixed command injection vulnerabilities in shell escaping
  - Improved table-code-converter reliability

- **Browser Automation**:
  - Fixed CDP connection cleanup and resource management
  - Fixed browser launch failures with proper error handling
  - Fixed clipboard paste operations for cross-platform compatibility

### Technical Improvements

- **Test Coverage**: Enhanced unit tests for WT publish-to skills with comprehensive coverage
- **Code Quality**: Improved type safety, error handling, and async patterns
- **Package Structure**: Reorganized web-automation as shared workspace package
- **Documentation**: Added task files documenting refactoring process and migration steps

### Benefits

- **Modern Browser Automation**: Playwright integration provides more reliable cross-browser support
- **Unified Infrastructure**: Shared web-automation package reduces code duplication
- **Better Image Generation**: New subagent with configurable backends and templates
- **Improved Reliability**: Comprehensive test coverage ensures publish-to skills work correctly
- **Enhanced Developer Experience**: Centralized configuration and better error messages

---

## [1.6.4] - 2026-02-02

### Summary

**Configuration & Image Generation: Centralized Config, Language Support, Bug Fixes**

Added centralized configuration system for wt plugin settings, implemented multi-language filename support for articles, fixed image path references, and resolved MCP tool parameter type validation errors.

### Added

- **Centralized Configuration System** (`~/.claude/wt/config.jsonc`):
  - Unified configuration for all wt plugin settings
  - Environment variables for API keys (HuggingFace, Gemini)
  - Image generation settings (backend, resolution, steps)
  - Content generation settings (default language)

- **Multi-Language Filename Support**:
  - Automatic language suffix for article outputs (`article_en.md`, `article_cn.md`, `article_jp.md`)
  - Language code mapping with aliases (zh→cn, ja→jp)
  - Configurable default language in config file

- **Configuration Loader** (`scripts/config_loader.py`):
  - JSONC format support (JSON with comments)
  - Deep merge of user config with defaults
  - Auto-injection of environment variables
  - CLI utilities for validation and inspection

### Fixed

- **Image Path References**:
  - Corrected relative paths from `6-publish/` to `4-illustration/` using `../4-illustration/`
  - Fixed in `stage-details.md` and `troubleshooting.md`
  - Ensures proper image linking in published articles

- **MCP Tool Seed Parameter Error**:
  - Fixed type validation error where seed value was serialized as string "42" instead of integer 42
  - Added explicit integer seed parameter in `NanoBananaBackend.get_mcp_params()`
  - Resolves `Input validation error: '42' is not of type 'integer'`

- **Configuration File JSON Errors**:
  - Fixed multiple trailing comma errors in `config.jsonc`
  - Proper JSONC validation with `config_loader.py validate`

### Changed

- **Documentation Structure**:
  - Renamed `CONFIG.md` → `README.md` for better discoverability
  - Added language support documentation section
  - Updated configuration setup instructions

- **Image Generator Integration**:
  - Added config loader import with fallback handling
  - Auto-loading of backend preference from config
  - Config-based default resolution and steps

### Benefits

- **Centralized Configuration**: All wt plugin settings in one location
- **Multi-Language Support**: Automatic filename suffixing for international content
- **Improved Reliability**: Fixed MCP tool validation errors and path references
- **Better Developer Experience**: Easier configuration with validation CLI

---

## [1.6.0] - 2026-01-30

### Summary

**Technical Writing & Content Management: Complete Content Lifecycle Support**

Added tc-writer subagent (formerly it-writer) for technical content orchestration, comprehensive topic lifecycle commands, and image generation skills. Implemented full technical content creation workflow with multi-stage pipeline from research to publication.

### Added

- **tc-writer Subagent** (`agents/tc-writer.md`):
  - Technical content orchestration specialist (formerly it-writer)
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