/**
 * Plugin Merger Utility
 * 
 * Merges custom plugins with default plugins, supporting:
 * - Adding new plugins
 * - Replacing plugins by name
 * - Disabling plugins via override config
 */

import type {
    ContentPlugin,
    MetadataPlugin,
    PluginOverride,
    isPluginOverride,
    isContentPlugin,
    isMetadataPlugin,
} from '../types';

type AnyPlugin = ContentPlugin | MetadataPlugin;
type PluginOrOverride = AnyPlugin | PluginOverride;

/**
 * Check if a value is a plugin override configuration
 */
function isOverride(value: PluginOrOverride): value is PluginOverride {
    return 'enabled' in value ||
        (!('transform' in value) && !('extract' in value));
}

/**
 * Merge custom plugins with default plugins
 * 
 * Rules:
 * 1. If custom plugin has same name as default, it replaces the default
 * 2. If override config with enabled=false, remove that plugin
 * 3. New plugins are added to the list
 * 4. Final list is sorted by priority
 * 
 * @param defaults - Default plugins
 * @param customs - Custom plugins or overrides
 * @returns Merged and sorted plugin list
 */
export function mergeContentPlugins(
    defaults: ContentPlugin[],
    customs: (ContentPlugin | PluginOverride)[]
): ContentPlugin[] {
    // Start with defaults as a map for easy lookup
    const pluginMap = new Map<string, ContentPlugin>();
    for (const plugin of defaults) {
        pluginMap.set(plugin.name, plugin);
    }

    // Process custom plugins/overrides
    for (const item of customs) {
        if (isOverride(item)) {
            // It's an override config
            if (item.enabled === false) {
                // Disable (remove) the plugin
                pluginMap.delete(item.name);
            }
        } else {
            // It's a plugin - replace or add
            pluginMap.set(item.name, item);
        }
    }

    // Convert back to array and sort by priority
    return Array.from(pluginMap.values()).sort((a, b) => a.priority - b.priority);
}

/**
 * Merge custom metadata plugins with default plugins
 * 
 * Same rules as content plugins
 */
export function mergeMetadataPlugins(
    defaults: MetadataPlugin[],
    customs: (MetadataPlugin | PluginOverride)[]
): MetadataPlugin[] {
    const pluginMap = new Map<string, MetadataPlugin>();
    for (const plugin of defaults) {
        pluginMap.set(plugin.name, plugin);
    }

    for (const item of customs) {
        if (isOverride(item)) {
            if (item.enabled === false) {
                pluginMap.delete(item.name);
            }
        } else {
            pluginMap.set(item.name, item);
        }
    }

    return Array.from(pluginMap.values()).sort((a, b) => a.priority - b.priority);
}

/**
 * Check if item is an override (not a real plugin)
 */
function isMetadataOverride(item: MetadataPlugin | PluginOverride): item is PluginOverride {
    return 'enabled' in item || !('extract' in item);
}
