/**
 * Compat Engine Type Definitions
 *
 * Core types and plugin interfaces for the compatibility layer.
 */

import type { Root, Folder, Item } from 'fumadocs-core/page-tree';

// ==================== Core Types ====================

/**
 * Represents a page in the compatibility layer
 */
export interface RawPage {
  /** Absolute file path */
  filePath: string;
  /** URL path segments */
  slugs: string[];
  /** Full URL path */
  url: string;
  /** Processed markdown content */
  content: string;
  /** Page metadata */
  data: PageMetadata;
}

/**
 * Page metadata extracted from content
 */
export interface PageMetadata {
  /** Page title */
  title: string;
  /** Page description */
  description: string;
  /** Raw frontmatter data */
  frontmatter: Record<string, unknown>;
  /** Allow plugins to add custom fields */
  [key: string]: unknown;
}

/**
 * Configuration options for creating a compat source
 */
export interface CompatSourceOptions {
  /** Content directory path (relative to project root) */
  dir: string;
  /** Base URL path */
  baseUrl: string;

  // File filtering
  /** Supported file extensions. Default: ['.md', '.mdx'] */
  extensions?: string[];
  /** Index file names. Default: ['README.md', 'readme.md', 'index.md', 'index.mdx'] */
  indexFiles?: string[];
  /** Ignore patterns (glob). Default: ['_*'] */
  ignore?: string[];
  /** Include patterns (glob), overrides ignore. Default: [] */
  include?: string[];
  /** Maximum file size in bytes. Default: 10MB */
  maxFileSize?: number;

  // Link processing
  /** Transform relative .md links. Default: true */
  transformLinks?: boolean;
  /** Base path for relative images */
  imageBasePath?: string;

  // Plugins
  /** Plugin configuration */
  plugins?: PluginsConfig;

  // Legacy options (for backward compatibility)
  /** @deprecated Use metadata plugins instead */
  titleExtractor?: (content: string, filePath: string) => string;
  /** @deprecated Use metadata plugins instead */
  descriptionExtractor?: (content: string, filePath: string) => string;
  /** @deprecated Use content plugins instead */
  preprocessor?: (content: string, filePath: string) => string;
}

/**
 * The compat source object returned by createCompatSource
 */
export interface CompatSource {
  /** Get a page by slugs */
  getPage(slugs: string[] | undefined): RawPage | undefined;
  /** Get all pages */
  getPages(): RawPage[];
  /** Generate static params for Next.js */
  generateParams(): { slug: string[] }[];
  /** Page tree for navigation */
  pageTree: Root;
  /** Base URL */
  baseUrl: string;
  /** Warnings generated during processing */
  warnings: string[];
  /** Reload the source (for development) */
  reload(): Promise<CompatSource>;
}

// ==================== Plugin Types ====================

/**
 * Context passed to plugins
 */
export interface PluginContext {
  /** Current file path (relative to source dir) */
  filePath: string;
  /** Base URL for the source */
  baseUrl: string;
  /** Absolute path to source directory */
  sourceDir: string;
  /** Full options */
  options: CompatSourceOptions;
}

/**
 * Context for tree plugins
 */
export interface TreeContext extends PluginContext {
  /** All pages in the source */
  pages: RawPage[];
}

/**
 * Content transformation plugin
 *
 * Transforms markdown content before rendering.
 * Plugins are executed in priority order (lower numbers first).
 */
export interface ContentPlugin {
  /** Plugin name (must be unique) */
  name: string;
  /**
   * Execution priority (lower = earlier)
   * Recommended ranges:
   * - 0-30: Preprocessing (JSX escape)
   * - 31-60: Content transformation (links, images)
   * - 61-100: Post-processing
   */
  priority: number;
  /**
   * Transform content
   * @param content - Current content
   * @param context - Plugin context
   * @returns Transformed content
   */
  transform: (content: string, context: PluginContext) => string | Promise<string>;
}

/**
 * Metadata extraction plugin
 *
 * Extracts or enhances page metadata.
 * Plugins are executed in priority order (lower numbers first).
 */
export interface MetadataPlugin {
  /** Plugin name (must be unique) */
  name: string;
  /** Execution priority (lower = earlier) */
  priority: number;
  /**
   * Extract or enhance metadata
   * @param metadata - Current metadata (may be partially filled)
   * @param content - File content (without frontmatter)
   * @param context - Plugin context
   * @returns Enhanced metadata
   */
  extract: (
    metadata: PageMetadata,
    content: string,
    context: PluginContext
  ) => PageMetadata | Promise<PageMetadata>;
}

/**
 * Scanner filter plugin
 *
 * Filters files during directory scanning.
 * Plugins are executed in priority order (lower numbers first).
 */
export interface ScannerPlugin {
  /** Plugin name (must be unique) */
  name: string;
  /** Execution priority (lower = earlier) */
  priority: number;
  /**
   * Filter a file
   * @param filePath - Relative file path
   * @param context - Plugin context (limited, no content yet)
   * @returns true = include, false = exclude, undefined = defer to next plugin
   */
  filter: (filePath: string, context: Omit<PluginContext, 'filePath'>) => boolean | undefined;
}

/**
 * Tree transformation plugin
 *
 * Transforms page tree nodes during tree building.
 */
export interface TreePlugin {
  /** Plugin name (must be unique) */
  name: string;
  /** Execution priority (lower = earlier) */
  priority: number;
  /**
   * Transform a tree node
   * @param node - Current node (page, folder, or root)
   * @param context - Tree context
   * @returns Transformed node
   */
  transform: (node: TreeNode, context: TreeContext) => TreeNode;
}

/**
 * Tree node types
 */
export type TreeNode = Root | Folder | Item;

// ==================== Plugin Configuration ====================

/**
 * Plugin configuration object
 */
export interface PluginsConfig {
  /** Content plugins */
  content?: (ContentPlugin | PluginOverride)[];
  /** Metadata plugins */
  metadata?: (MetadataPlugin | PluginOverride)[];
  /** Scanner plugins */
  scanner?: (ScannerPlugin | PluginOverride)[];
  /** Tree plugins */
  tree?: (TreePlugin | PluginOverride)[];
}

/**
 * Override configuration for disabling or configuring built-in plugins
 */
export interface PluginOverride {
  /** Plugin name to override */
  name: string;
  /** Set to false to disable the plugin */
  enabled?: boolean;
  /** Plugin-specific options */
  options?: Record<string, unknown>;
}

// ==================== Type Guards ====================

/**
 * Check if a value is a plugin override
 */
export function isPluginOverride(
  value: ContentPlugin | MetadataPlugin | ScannerPlugin | TreePlugin | PluginOverride
): value is PluginOverride {
  return 'enabled' in value || (!('transform' in value) && !('extract' in value) && !('filter' in value));
}

/**
 * Check if a value is a content plugin
 */
export function isContentPlugin(value: ContentPlugin | PluginOverride): value is ContentPlugin {
  return 'transform' in value && typeof value.transform === 'function';
}

/**
 * Check if a value is a metadata plugin
 */
export function isMetadataPlugin(value: MetadataPlugin | PluginOverride): value is MetadataPlugin {
  return 'extract' in value && typeof value.extract === 'function';
}

/**
 * Check if a value is a scanner plugin
 */
export function isScannerPlugin(value: ScannerPlugin | PluginOverride): value is ScannerPlugin {
  return 'filter' in value && typeof value.filter === 'function';
}

/**
 * Check if a value is a tree plugin
 */
export function isTreePlugin(value: TreePlugin | PluginOverride): value is TreePlugin {
  return 'transform' in value && typeof value.transform === 'function' && !('priority' in value && value.priority === undefined);
}


