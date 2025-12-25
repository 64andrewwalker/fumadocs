/**
 * Plugin Definition Helpers
 *
 * Type-safe helper functions for defining plugins.
 */

import type {
  ContentPlugin,
  MetadataPlugin,
  ScannerPlugin,
  TreePlugin,
} from './types';

/**
 * Define a content transformation plugin
 *
 * @example
 * ```ts
 * const myPlugin = defineContentPlugin({
 *   name: 'my-plugin',
 *   priority: 50,
 *   transform: (content, ctx) => {
 *     return content.replace(/foo/g, 'bar');
 *   },
 * });
 * ```
 */
export function defineContentPlugin(plugin: ContentPlugin): ContentPlugin {
  return plugin;
}

/**
 * Define a metadata extraction plugin
 *
 * @example
 * ```ts
 * const myPlugin = defineMetadataPlugin({
 *   name: 'reading-time',
 *   priority: 50,
 *   extract: (metadata, content, ctx) => {
 *     const words = content.split(/\s+/).length;
 *     return {
 *       ...metadata,
 *       readingTime: Math.ceil(words / 200),
 *     };
 *   },
 * });
 * ```
 */
export function defineMetadataPlugin(plugin: MetadataPlugin): MetadataPlugin {
  return plugin;
}

/**
 * Define a scanner filter plugin
 *
 * @example
 * ```ts
 * const myPlugin = defineScannerPlugin({
 *   name: 'skip-large-files',
 *   priority: 50,
 *   filter: (filePath, ctx) => {
 *     // Return true to include, false to exclude, undefined to defer
 *     if (filePath.includes('large')) return false;
 *     return undefined;
 *   },
 * });
 * ```
 */
export function defineScannerPlugin(plugin: ScannerPlugin): ScannerPlugin {
  return plugin;
}

/**
 * Define a tree transformation plugin
 *
 * @example
 * ```ts
 * const myPlugin = defineTreePlugin({
 *   name: 'add-icons',
 *   priority: 50,
 *   transform: (node, ctx) => {
 *     if (node.type === 'page') {
 *       return { ...node, icon: 'file' };
 *     }
 *     return node;
 *   },
 * });
 * ```
 */
export function defineTreePlugin(plugin: TreePlugin): TreePlugin {
  return plugin;
}


