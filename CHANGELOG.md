# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `indexFiles` configuration option - customize which files are treated as index pages ✓ verified
- `ignore` configuration option - customize file ignore patterns with glob support ✓ verified
- `matchesIgnorePattern()` helper function for pattern matching ✓ verified
- `createIndexFileChecker()` for customizable index file detection ✓ verified
- 3 new test cases for ignore pattern functionality ✓ verified

### Changed
- Moved scripts to `scripts/` directory ✓ verified
  - `preview-docs.sh` → `scripts/preview-docker.sh`
  - `docker-entrypoint.sh` → `scripts/docker-entrypoint.sh`
- Added `scripts/preview-local.sh` for running without Docker ✓ verified
- Updated Dockerfile to reference new script paths ✓ verified
- Added npm scripts: `preview` and `preview:docker` ✓ verified

### Documentation
- Added `scripts/README.md` with usage documentation ✓ verified
- Added `docs/sync-audit-report.md` - documentation-code sync audit ✓ verified

---

## [0.1.0] - 2024-12-23

### Added

#### Core Engine
- **Compat Engine** - Compatibility layer for raw markdown files ✓ verified
- Automatic metadata extraction (title from H1, description from first paragraph) ✓ verified
- MDX preprocessing (JSX-safe character escaping) ✓ verified
- README.md as index page support ✓ verified
- File sorting (README > index > alphabetical) ✓ verified
- Hidden/draft file filtering (`_*` and `.*` prefixes) ✓ verified
- Relative link transformation ✓ verified
- Image path handling ✓ verified
- File size limits (default 10MB) ✓ verified
- Conflict detection with warnings ✓ verified
- Multi-level folder hierarchy support ✓ verified

#### Plugin Support
- Math formula support (remark-math + rehype-katex) ✓ verified
- GFM extensions (tables, task lists, strikethrough, autolinks) ✓ verified
- Footnotes (via remark-gfm) ✓ verified
- Mermaid diagram rendering (client-side component) ✓ verified
- Code syntax highlighting (12+ languages) ✓ verified

#### Configuration Options
- `dir` - Content directory path ✓ verified
- `baseUrl` - URL base path ✓ verified
- `extensions` - File extensions to process ✓ verified
- `maxFileSize` - Maximum file size limit ✓ verified
- `transformLinks` - Enable/disable link transformation ✓ verified
- `imageBasePath` - Base path for images ✓ verified
- `titleExtractor` - Custom title extraction ✓ verified
- `descriptionExtractor` - Custom description extraction ✓ verified
- `preprocessor` - Custom content preprocessing ✓ verified

### Testing
- 91 test cases (all passing) ✓ verified
- 28 fixture files ✓ verified
- Performance benchmarks ✓ verified

### Documentation
- PRD (Product Requirements Document) ✓ verified
- TDD Session Log ✓ verified
- Self-Review Report ✓ verified

### Dependencies
- fumadocs-core 16.3.2
- fumadocs-mdx 14.2.2
- fumadocs-ui 16.3.2
- @fumadocs/mdx-remote ^1.4.3
- gray-matter ^4.0.3
- remark-math ^6.0.0
- rehype-katex ^7.0.1
- remark-gfm ^4.0.1
- mermaid ^11.12.2
- next-themes ^0.4.6
- katex ^0.16.27

---

[Unreleased]: https://github.com/64andrewwalker/fumadocs/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/64andrewwalker/fumadocs/releases/tag/v0.1.0

