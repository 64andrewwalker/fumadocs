/**
 * Plugin Merger Tests
 * 
 * Unit tests for the plugin merging utility functions.
 */
import { describe, it, expect } from 'vitest';
import { mergeContentPlugins, mergeMetadataPlugins } from '@/lib/compat-engine/core/plugin-merger';
import type { ContentPlugin, MetadataPlugin, PluginOverride } from '@/lib/compat-engine/types';

describe('Plugin Merger', () => {
    describe('mergeContentPlugins', () => {
        const defaultPlugins: ContentPlugin[] = [
            { name: 'plugin-a', priority: 10, transform: (c) => c + '-a' },
            { name: 'plugin-b', priority: 20, transform: (c) => c + '-b' },
            { name: 'plugin-c', priority: 30, transform: (c) => c + '-c' },
        ];

        it('should return defaults when no custom plugins', () => {
            const result = mergeContentPlugins(defaultPlugins, []);
            expect(result).toEqual(defaultPlugins);
        });

        it('should add new custom plugins', () => {
            const customPlugin: ContentPlugin = {
                name: 'custom',
                priority: 15,
                transform: (c) => c + '-custom',
            };
            const result = mergeContentPlugins(defaultPlugins, [customPlugin]);

            expect(result.length).toBe(4);
            expect(result.map(p => p.name)).toContain('custom');
        });

        it('should replace plugin with same name', () => {
            const replacement: ContentPlugin = {
                name: 'plugin-b',
                priority: 20,
                transform: (c) => c + '-replaced',
            };
            const result = mergeContentPlugins(defaultPlugins, [replacement]);

            expect(result.length).toBe(3);
            const pluginB = result.find(p => p.name === 'plugin-b');
            expect(pluginB).toBe(replacement);
        });

        it('should disable plugin via override', () => {
            const override: PluginOverride = { name: 'plugin-b', enabled: false };
            const result = mergeContentPlugins(defaultPlugins, [override]);

            expect(result.length).toBe(2);
            expect(result.map(p => p.name)).not.toContain('plugin-b');
        });

        it('should sort by priority', () => {
            const highPriority: ContentPlugin = {
                name: 'high',
                priority: 5,
                transform: (c) => c,
            };
            const lowPriority: ContentPlugin = {
                name: 'low',
                priority: 100,
                transform: (c) => c,
            };
            const result = mergeContentPlugins(defaultPlugins, [lowPriority, highPriority]);

            expect(result[0].name).toBe('high');
            expect(result[result.length - 1].name).toBe('low');
        });

        it('should handle multiple operations', () => {
            const customs: (ContentPlugin | PluginOverride)[] = [
                { name: 'plugin-a', enabled: false }, // Disable
                { name: 'plugin-b', priority: 5, transform: (c) => c + '-new-b' }, // Replace with higher priority
                { name: 'new-plugin', priority: 15, transform: (c) => c + '-new' }, // Add
            ];
            const result = mergeContentPlugins(defaultPlugins, customs);

            expect(result.length).toBe(3); // a disabled, b replaced, c kept, new added
            expect(result.map(p => p.name)).toEqual(['plugin-b', 'new-plugin', 'plugin-c']);
        });
    });

    describe('mergeMetadataPlugins', () => {
        const defaultPlugins: MetadataPlugin[] = [
            { name: 'meta-a', priority: 10, extract: (m) => m },
            { name: 'meta-b', priority: 20, extract: (m) => m },
        ];

        it('should return defaults when no custom plugins', () => {
            const result = mergeMetadataPlugins(defaultPlugins, []);
            expect(result).toEqual(defaultPlugins);
        });

        it('should add custom metadata plugins', () => {
            const customPlugin: MetadataPlugin = {
                name: 'custom-meta',
                priority: 15,
                extract: (m) => ({ ...m, custom: true }),
            };
            const result = mergeMetadataPlugins(defaultPlugins, [customPlugin]);

            expect(result.length).toBe(3);
            expect(result.map(p => p.name)).toContain('custom-meta');
        });

        it('should disable metadata plugin via override', () => {
            const override: PluginOverride = { name: 'meta-a', enabled: false };
            const result = mergeMetadataPlugins(defaultPlugins, [override]);

            expect(result.length).toBe(1);
            expect(result[0].name).toBe('meta-b');
        });
    });
});
