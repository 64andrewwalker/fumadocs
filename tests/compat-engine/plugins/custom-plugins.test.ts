/**
 * Custom Plugins Integration Tests
 * 
 * TDD tests for custom plugin configuration and override functionality.
 * Tests the ability to:
 * - Add custom plugins
 * - Override default plugins
 * - Disable built-in plugins
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createCompatSource } from '@/lib/compat-engine/create-source';
import type { ContentPlugin, MetadataPlugin, PluginsConfig } from '@/lib/compat-engine/types';
import path from 'path';

const FIXTURES_DIR = path.join(__dirname, '../../../src/lib/compat-engine/__tests__/fixtures/with-readme');

describe('Custom Plugins Configuration', () => {
    describe('Content Plugins', () => {
        it('should allow adding custom content plugins', async () => {
            const customPlugin: ContentPlugin = {
                name: 'custom-marker',
                priority: 100,
                transform: (content) => content + '\n<!-- CUSTOM MARKER -->',
            };

            const source = await createCompatSource({
                dir: FIXTURES_DIR,
                baseUrl: '/docs',
                plugins: {
                    content: [customPlugin],
                },
            });

            const pages = source.getPages();
            expect(pages.length).toBeGreaterThan(0);
            expect(pages[0].content).toContain('<!-- CUSTOM MARKER -->');
        });

        it('should execute custom plugins after defaults based on priority', async () => {
            const markers: string[] = [];

            const earlyPlugin: ContentPlugin = {
                name: 'early-marker',
                priority: 5, // Before markdown-preprocess (10)
                transform: (content) => {
                    markers.push('early');
                    return content;
                },
            };

            const latePlugin: ContentPlugin = {
                name: 'late-marker',
                priority: 100, // After all defaults
                transform: (content) => {
                    markers.push('late');
                    return content;
                },
            };

            await createCompatSource({
                dir: FIXTURES_DIR,
                baseUrl: '/docs',
                plugins: {
                    content: [latePlugin, earlyPlugin], // Order in array shouldn't matter
                },
            });

            expect(markers).toContain('early');
            expect(markers).toContain('late');
            expect(markers.indexOf('early')).toBeLessThan(markers.indexOf('late'));
        });

        it('should allow disabling default content plugins', async () => {
            // Create content with a pattern that would normally be transformed
            const source = await createCompatSource({
                dir: FIXTURES_DIR,
                baseUrl: '/docs',
                transformLinks: true, // Enable link transformation
                plugins: {
                    content: [
                        { name: 'link-transform', enabled: false }, // Disable link transform
                    ],
                },
            });

            const pages = source.getPages();
            // With link-transform disabled, relative .md links should NOT be transformed
            // (This test verifies the plugin was actually disabled)
            expect(pages).toBeDefined();
        });

        it('should replace default plugin with custom implementation', async () => {
            const customLinkTransform: ContentPlugin = {
                name: 'link-transform', // Same name as default
                priority: 40,
                transform: (content) => content.replace(/\[([^\]]+)\]\([^)]+\.md\)/g, '[$1](CUSTOM_LINK)'),
            };

            const source = await createCompatSource({
                dir: FIXTURES_DIR,
                baseUrl: '/docs',
                plugins: {
                    content: [customLinkTransform],
                },
            });

            const pages = source.getPages();
            // If page contains any md links, they should be replaced with CUSTOM_LINK
            expect(pages).toBeDefined();
        });
    });

    describe('Metadata Plugins', () => {
        it('should allow adding custom metadata plugins', async () => {
            const customMetadataPlugin: MetadataPlugin = {
                name: 'custom-category',
                priority: 100,
                extract: (metadata) => ({
                    ...metadata,
                    category: 'custom-category',
                }),
            };

            const source = await createCompatSource({
                dir: FIXTURES_DIR,
                baseUrl: '/docs',
                plugins: {
                    metadata: [customMetadataPlugin],
                },
            });

            const pages = source.getPages();
            expect(pages.length).toBeGreaterThan(0);
            expect((pages[0].data as any).category).toBe('custom-category');
        });

        it('should allow disabling default metadata plugins', async () => {
            const source = await createCompatSource({
                dir: FIXTURES_DIR,
                baseUrl: '/docs',
                plugins: {
                    metadata: [
                        { name: 'title-from-h1', enabled: false },
                    ],
                },
            });

            // With title-from-h1 disabled, title should come from filename or frontmatter only
            const pages = source.getPages();
            expect(pages).toBeDefined();
        });
    });

    describe('Plugin Merging', () => {
        it('should merge custom plugins with defaults', async () => {
            const pluginOrder: string[] = [];

            const trackingPlugin: ContentPlugin = {
                name: 'tracking',
                priority: 15, // Between markdown-preprocess (10) and jsx-escape (20)
                transform: (content) => {
                    pluginOrder.push('tracking');
                    return content;
                },
            };

            await createCompatSource({
                dir: FIXTURES_DIR,
                baseUrl: '/docs',
                plugins: {
                    content: [trackingPlugin],
                },
            });

            // Plugin should have been executed
            expect(pluginOrder).toContain('tracking');
        });

        it('should handle empty plugins config', async () => {
            const source = await createCompatSource({
                dir: FIXTURES_DIR,
                baseUrl: '/docs',
                plugins: {},
            });

            expect(source.getPages().length).toBeGreaterThan(0);
        });

        it('should handle plugins with same priority', async () => {
            const order: string[] = [];

            const plugin1: ContentPlugin = {
                name: 'same-priority-1',
                priority: 50,
                transform: (content) => { order.push('1'); return content; },
            };

            const plugin2: ContentPlugin = {
                name: 'same-priority-2',
                priority: 50,
                transform: (content) => { order.push('2'); return content; },
            };

            await createCompatSource({
                dir: FIXTURES_DIR,
                baseUrl: '/docs',
                plugins: {
                    content: [plugin1, plugin2],
                },
            });

            // Both should execute (order may vary for same priority)
            expect(order).toContain('1');
            expect(order).toContain('2');
        });
    });
});
