# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- Future changes go here -->

---

## [0.2.0] - 2024-12-24

### 🏗️ Major Refactoring: Modular Plugin Architecture

This release introduces a complete architectural overhaul of the Compat Engine, transforming it from a monolithic design (~790 lines in `index.ts`) to a modular, plugin-based architecture (63 lines in `index.ts`).

### ✨ Added

#### Custom Plugin System

- **Plugin Configuration** - Pass custom plugins via `options.plugins` ✓ verified
- **Plugin Override** - Replace or disable default plugins by name ✓ verified
- **Plugin Merging** - Custom plugins merge with defaults and sort by priority ✓ verified
- `mergeContentPlugins()` - Utility for merging content plugins ✓ verified
- `mergeMetadataPlugins()` - Utility for merging metadata plugins ✓ verified

```typescript
// Example: Add custom plugin and disable default
const source = await createCompatSource({
  dir: 'docs',
  baseUrl: '/docs',
  plugins: {
    content: [
      customMarkerPlugin,
      { name: 'link-transform', enabled: false },
    ],
  },
});
```

#### New Exports

- `PluginsConfig` type - Configuration for custom plugins ✓ verified
- `PluginOverride` type - Override or disable plugins ✓ verified
- `mergeContentPlugins()` function ✓ verified
- `mergeMetadataPlugins()` function ✓ verified

### 🔧 Changed

#### Modular Architecture (Phase 1-6)

- **Phase 1**: Extracted utility functions to `utils/patterns.ts` and `utils/slug.ts`
- **Phase 2**: Created content plugins in `plugins/content/index.ts`
  - `jsxEscapePlugin` - JSX character escaping
  - `linkTransformPlugin` - Relative link transformation
  - `imageTransformPlugin` - Image path handling
  - `markdownPreprocessPlugin` - Code block protection
- **Phase 3**: Created metadata plugins in `plugins/metadata/index.ts`
  - `frontmatterPlugin` - Frontmatter extraction
  - `titleFromH1Plugin` - Title from first heading
  - `titleFromFilenamePlugin` - Title from filename fallback
  - `descriptionFromParagraphPlugin` - Description from first paragraph
- **Phase 4**: Extracted `buildPageTree` and `flattenEmptyFolders` to `core/page-builder.ts`
- **Phase 5**: Rewrote `create-source.ts` to orchestrate plugin pipelines
- **Phase 6**: Reduced `index.ts` to exports only (63 lines, 92% reduction)

### 🐛 Fixed

- **MDX Unicode Escape Error** - Fixed parsing error "Expecting Unicode escape sequence \uXXXX" ✓ verified
  - Changed curly brace escaping from `\{` to HTML entities `&#123;`
  - This ensures MDX parser doesn't confuse backslash with Unicode escape
- **HTML Comment Conversion** - Fixed HTML comments being incorrectly escaped ✓ verified
  - Protect HTML comments before escaping, then convert to MDX format

### 📊 Testing

- **339 tests** (all passing) - up from 91 in v0.1.0
- **13 test files** covering all modules
- **TDD development** for all new features
- Full E2E validation with DocEngineering content

### 📁 New File Structure

```text
src/lib/compat-engine/
├── index.ts              # Main entry (63 lines)
├── types.ts              # Core types
├── create-source.ts      # Factory function
├── core/
│   ├── pipeline.ts       # Plugin pipeline
│   ├── page-builder.ts   # Page tree building
│   └── plugin-merger.ts  # Plugin merging utility
├── plugins/
│   ├── content/index.ts  # Content transformation plugins
│   ├── metadata/index.ts # Metadata extraction plugins
│   └── scanner/index.ts  # File scanning plugins
├── preprocessor/index.ts # Low-level preprocessing
└── utils/
    ├── patterns.ts       # File pattern matching
    └── slug.ts           # Slug generation
```

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

[Unreleased]: https://github.com/64andrewwalker/fumadocs/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/64andrewwalker/fumadocs/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/64andrewwalker/fumadocs/releases/tag/v0.1.0
