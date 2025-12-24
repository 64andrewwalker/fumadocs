/**
 * Plugin Pipeline
 *
 * Core plugin execution engine for the compat layer.
 */

import type {
  ContentPlugin,
  MetadataPlugin,
  ScannerPlugin,
  PluginContext,
  PageMetadata,
  PluginOverride,
} from '../types';
import { isPluginOverride } from '../types';

/**
 * Generic plugin type for pipeline operations
 */
type AnyPlugin = ContentPlugin | MetadataPlugin | ScannerPlugin;

/**
 * Create a sorted and filtered plugin pipeline
 *
 * - Sorts plugins by priority (ascending)
 * - Filters out disabled plugins (via PluginOverride)
 * - Preserves order for same priority (stable sort)
 */
export function createPipeline<T extends AnyPlugin>(
  plugins: (T | PluginOverride)[]
): T[] {
  // Separate actual plugins from overrides
  const actualPlugins: T[] = [];
  const overrides = new Map<string, PluginOverride>();

  for (const item of plugins) {
    if (isPluginOverride(item)) {
      overrides.set(item.name, item);
    } else {
      actualPlugins.push(item as T);
    }
  }

  // Filter out disabled plugins
  const enabledPlugins = actualPlugins.filter((plugin) => {
    const override = overrides.get(plugin.name);
    if (override && override.enabled === false) {
      return false;
    }
    return true;
  });

  // Sort by priority (stable sort to preserve order for same priority)
  return enabledPlugins.sort((a, b) => a.priority - b.priority);
}

/**
 * Run content plugins in sequence
 *
 * Each plugin receives the output of the previous plugin.
 */
export async function runContentPipeline(
  plugins: ContentPlugin[],
  content: string,
  context: PluginContext
): Promise<string> {
  // Sort plugins by priority
  const sorted = createPipeline(plugins);

  let result = content;
  for (const plugin of sorted) {
    result = await plugin.transform(result, context);
  }
  return result;
}

/**
 * Run metadata plugins in sequence
 *
 * Each plugin can modify the metadata object.
 */
export async function runMetadataPipeline(
  plugins: MetadataPlugin[],
  initialMetadata: PageMetadata,
  content: string,
  context: PluginContext
): Promise<PageMetadata> {
  // Sort plugins by priority
  const sorted = createPipeline(plugins);

  let metadata = { ...initialMetadata };
  for (const plugin of sorted) {
    metadata = await plugin.extract(metadata, content, context);
  }
  return metadata;
}

/**
 * Run scanner plugins to determine if a file should be included
 *
 * Logic (in priority order):
 * - Plugins run in priority order (lower number = earlier)
 * - Each plugin can return: true (include), false (exclude), or undefined (defer)
 * - Later plugins can override earlier plugins' decisions
 * - If include-pattern (priority 15) returns true, it overrides ignore-pattern (priority 20)
 * - If extension-filter (priority 5) returns false, nothing can override it
 * 
 * The key insight: plugins with LOWER priority numbers run FIRST, 
 * so their decisions can be overridden by later plugins with HIGHER priority.
 * But extension-filter (priority 5) runs first - if it says false, the file is rejected.
 */
export async function runScannerPipeline(
  plugins: ScannerPlugin[],
  filePath: string,
  context: Omit<PluginContext, 'filePath'>
): Promise<boolean> {
  // Sort plugins by priority (lower = first)
  const sorted = createPipeline(plugins);

  // Track the current decision
  let decision: boolean | undefined = undefined;

  for (const plugin of sorted) {
    const result = plugin.filter(filePath, context);
    
    if (result !== undefined) {
      // Early exit for first false (hard constraint like extension-filter)
      // If a plugin with low priority (runs first) says false, nothing can override
      if (result === false && decision === undefined) {
        return false;
      }
      
      // Otherwise, update the decision
      decision = result;
    }
  }

  // If we have a decision, use it; otherwise default to include
  return decision ?? true;
}

