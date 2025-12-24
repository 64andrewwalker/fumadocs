/**
 * Fumadocs Compat Engine
 *
 * Compatibility layer for processing non-standard markdown files.
 * Allows rendering raw markdown documents without strict frontmatter requirements.
 * 
 * @example
 * ```ts
 * import { createCompatSource } from '@/lib/compat-engine';
 * 
 * const source = await createCompatSource({
 *   dir: 'docs',
 *   baseUrl: '/docs',
 * });
 * ```
 */

// Main factory
export { createCompatSource } from './create-source';

// Types
export type {
  CompatSourceOptions,
  CompatSource,
  RawPage,
  PageMetadata,
  PluginContext,
  ContentPlugin,
  MetadataPlugin,
  ScannerPlugin,
  TreePlugin,
  PluginsConfig,
  PluginOverride,
} from './types';

// Plugins
export {
  jsxEscapePlugin,
  linkTransformPlugin,
  imageTransformPlugin,
  markdownPreprocessPlugin,
  defaultContentPlugins,
  runContentPipeline,
} from './plugins/content';

export {
  frontmatterPlugin,
  titleFromH1Plugin,
  titleFromFilenamePlugin,
  descriptionFromParagraphPlugin,
  defaultMetadataPlugins,
  runMetadataPipeline,
} from './plugins/metadata';

// Core utilities
export { buildPageTree, flattenEmptyFolders } from './core/page-builder';
export { mergeContentPlugins, mergeMetadataPlugins } from './core/plugin-merger';

// Utilities
export { shouldIncludeFile, matchesPattern } from './utils/patterns';
export { filePathToSlugs, isIndexFile, slugToDisplayName } from './utils/slug';
export { preprocessMarkdown, escapeJsxInNonCodeText, escapeJsxInTable } from './preprocessor';
