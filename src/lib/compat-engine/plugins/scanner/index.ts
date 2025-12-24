/**
 * Scanner Plugins
 *
 * Built-in plugins for filtering files during directory scanning.
 */

import type { ScannerPlugin, PluginContext, CompatSourceOptions } from '../../types';
import { defineScannerPlugin } from '../../define';
import path from 'path';

/**
 * Extension Filter Plugin
 *
 * Filters files by their extension.
 * Only allows files with extensions specified in options.extensions.
 * 
 * Priority 5 = runs first (hard constraint, can't be overridden by include)
 * Returns false for non-matching extensions, which is a hard rejection.
 */
export const extensionFilterPlugin: ScannerPlugin = defineScannerPlugin({
  name: 'extension-filter',
  priority: 5, // Runs first - hard constraint
  filter: (filePath: string, context: Omit<PluginContext, 'filePath'>) => {
    const extensions = context.options.extensions || ['.md', '.mdx'];
    const ext = path.extname(filePath).toLowerCase();
    
    if (extensions.includes(ext)) {
      return true; // Accept, but can still be rejected by later plugins
    }
    
    // Explicit rejection for non-matching extensions (hard constraint)
    return false;
  },
});

/**
 * Ignore Pattern Plugin
 *
 * Filters out files matching ignore patterns.
 * Supports simple glob patterns like '_*', '.*', 'tests/*'.
 */
export const ignorePatternPlugin: ScannerPlugin = defineScannerPlugin({
  name: 'ignore-pattern',
  priority: 15,
  filter: (filePath: string, context: Omit<PluginContext, 'filePath'>) => {
    const ignorePatterns = context.options.ignore || ['_*'];
    
    if (ignorePatterns.length === 0) {
      return undefined; // Defer to other plugins
    }
    
    for (const pattern of ignorePatterns) {
      if (matchesPattern(filePath, pattern)) {
        return false; // Exclude this file
      }
    }
    
    return undefined; // Defer to other plugins
  },
});

/**
 * Include Pattern Plugin
 *
 * Explicitly includes files matching include patterns.
 * Runs AFTER ignore, so can override ignore rules.
 */
export const includePatternPlugin: ScannerPlugin = defineScannerPlugin({
  name: 'include-pattern',
  priority: 20, // Runs after ignore (15), so can override it
  filter: (filePath: string, context: Omit<PluginContext, 'filePath'>) => {
    const includePatterns = context.options.include || [];
    
    if (includePatterns.length === 0) {
      return undefined; // Defer to other plugins
    }
    
    for (const pattern of includePatterns) {
      if (matchesPattern(filePath, pattern)) {
        return true; // Explicitly include this file
      }
    }
    
    return undefined; // Defer to other plugins
  },
});

/**
 * Simple pattern matching for file paths
 *
 * Supports:
 * - '_*' matches files/dirs starting with _
 * - '.*' matches files/dirs starting with .
 * - 'dir/*' matches files in dir/
 * - 'dir/**' matches files in dir/ and subdirs
 */
function matchesPattern(filePath: string, pattern: string): boolean {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');
  const parts = normalizedPath.split('/');
  
  // Pattern: starts with specific prefix (e.g., '_*', '.*')
  if (pattern.endsWith('*') && !pattern.includes('/')) {
    const prefix = pattern.slice(0, -1);
    // Check if any part of the path starts with the prefix
    return parts.some(part => part.startsWith(prefix));
  }
  
  // Pattern: directory wildcard (e.g., 'tests/*', 'scripts/*')
  if (pattern.endsWith('/*')) {
    const dir = pattern.slice(0, -2);
    // Check if path starts with the directory
    return normalizedPath.startsWith(dir + '/') || parts[0] === dir;
  }
  
  // Pattern: recursive directory wildcard (e.g., '.promptpack/**')
  if (pattern.endsWith('/**')) {
    const dir = pattern.slice(0, -3);
    // Check if path starts with the directory
    return normalizedPath.startsWith(dir + '/') || normalizedPath === dir;
  }
  
  // Exact match
  return normalizedPath === pattern || parts.includes(pattern);
}

/**
 * Create scanner plugins with the given options
 */
export function createScannerPlugins(options: {
  extensions?: string[];
  ignore?: string[];
  include?: string[];
}): ScannerPlugin[] {
  // Create a minimal context for the plugins
  const mockOptions: CompatSourceOptions = {
    dir: '',
    baseUrl: '',
    extensions: options.extensions || ['.md', '.mdx'],
    ignore: options.ignore || ['_*'],
    include: options.include || [],
  };

  // The plugins themselves don't need modification,
  // they read from context.options at runtime
  return [
    {
      ...extensionFilterPlugin,
      filter: (filePath: string, context: Omit<PluginContext, 'filePath'>) => {
        // Merge provided options with context options
        const mergedContext = {
          ...context,
          options: { ...context.options, ...mockOptions },
        };
        return extensionFilterPlugin.filter(filePath, mergedContext);
      },
    },
    {
      ...includePatternPlugin,
      filter: (filePath: string, context: Omit<PluginContext, 'filePath'>) => {
        const mergedContext = {
          ...context,
          options: { ...context.options, ...mockOptions },
        };
        return includePatternPlugin.filter(filePath, mergedContext);
      },
    },
    {
      ...ignorePatternPlugin,
      filter: (filePath: string, context: Omit<PluginContext, 'filePath'>) => {
        const mergedContext = {
          ...context,
          options: { ...context.options, ...mockOptions },
        };
        return ignorePatternPlugin.filter(filePath, mergedContext);
      },
    },
  ];
}

// Re-export all plugins
export const builtinScannerPlugins = [
  extensionFilterPlugin,
  includePatternPlugin,
  ignorePatternPlugin,
];

