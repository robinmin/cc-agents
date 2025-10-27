# CHANGELOG

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
