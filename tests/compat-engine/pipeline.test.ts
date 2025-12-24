/**
 * Plugin Pipeline Tests (TDD - RED Phase)
 *
 * These tests define the expected behavior of the plugin pipeline.
 */

import { describe, it, expect } from 'vitest';
import {
  createPipeline,
  runContentPipeline,
  runMetadataPipeline,
  runScannerPipeline,
} from '@/lib/compat-engine/core/pipeline';
import type {
  ContentPlugin,
  MetadataPlugin,
  ScannerPlugin,
  PluginContext,
  PageMetadata,
} from '@/lib/compat-engine/types';
import { createMockContext } from '../utils';

describe('createPipeline', () => {
  it('sorts plugins by priority ascending', () => {
    const plugins: ContentPlugin[] = [
      { name: 'b', priority: 20, transform: (x) => x },
      { name: 'a', priority: 10, transform: (x) => x },
      { name: 'c', priority: 15, transform: (x) => x },
    ];
    const sorted = createPipeline(plugins);
    expect(sorted.map((p) => p.name)).toEqual(['a', 'c', 'b']);
  });

  it('handles empty plugin array', () => {
    const sorted = createPipeline([]);
    expect(sorted).toEqual([]);
  });

  it('preserves order for same priority', () => {
    const plugins: ContentPlugin[] = [
      { name: 'first', priority: 10, transform: (x) => x },
      { name: 'second', priority: 10, transform: (x) => x },
    ];
    const sorted = createPipeline(plugins);
    expect(sorted.map((p) => p.name)).toEqual(['first', 'second']);
  });

  it('filters out disabled plugins via override', () => {
    const plugins = [
      { name: 'a', priority: 10, transform: (x: string) => x },
      { name: 'a', enabled: false },
    ];
    const result = createPipeline(plugins as ContentPlugin[]);
    expect(result.find((p) => p.name === 'a')).toBeUndefined();
  });

  it('keeps enabled plugins with override', () => {
    const plugins = [
      { name: 'a', priority: 10, transform: (x: string) => x },
      { name: 'a', enabled: true },
    ];
    const result = createPipeline(plugins as ContentPlugin[]);
    expect(result.find((p) => p.name === 'a')).toBeDefined();
  });

  it('merges builtin and custom plugins', () => {
    const builtin: ContentPlugin[] = [
      { name: 'builtin', priority: 10, transform: (x) => x + '-builtin' },
    ];
    const custom: ContentPlugin[] = [
      { name: 'custom', priority: 5, transform: (x) => x + '-custom' },
    ];
    const merged = createPipeline([...builtin, ...custom]);
    expect(merged[0].name).toBe('custom');
    expect(merged[1].name).toBe('builtin');
  });
});

describe('runContentPipeline', () => {
  it('runs plugins in priority order', async () => {
    const plugins: ContentPlugin[] = [
      { name: 'add-a', priority: 10, transform: (s) => s + 'A' },
      { name: 'add-b', priority: 20, transform: (s) => s + 'B' },
    ];
    const ctx = createMockContext();
    const result = await runContentPipeline(plugins, '', ctx);
    expect(result).toBe('AB');
  });

  it('passes content through the pipeline', async () => {
    const plugins: ContentPlugin[] = [
      { name: 'wrap', priority: 10, transform: (s) => `[${s}]` },
      { name: 'prefix', priority: 20, transform: (s) => `PREFIX:${s}` },
    ];
    const ctx = createMockContext();
    const result = await runContentPipeline(plugins, 'content', ctx);
    expect(result).toBe('PREFIX:[content]');
  });

  it('passes context to plugins', async () => {
    let capturedCtx: PluginContext | null = null;
    const plugins: ContentPlugin[] = [
      {
        name: 'capture',
        priority: 10,
        transform: (s, c) => {
          capturedCtx = c;
          return s;
        },
      },
    ];
    const ctx = createMockContext({ filePath: 'test-file.md', baseUrl: '/custom' });
    await runContentPipeline(plugins, '', ctx);
    expect(capturedCtx).not.toBeNull();
    expect(capturedCtx!.filePath).toBe('test-file.md');
    expect(capturedCtx!.baseUrl).toBe('/custom');
  });

  it('handles async plugins', async () => {
    const plugins: ContentPlugin[] = [
      {
        name: 'async',
        priority: 10,
        transform: async (s) => {
          await new Promise((r) => setTimeout(r, 1));
          return s + 'ASYNC';
        },
      },
    ];
    const ctx = createMockContext();
    const result = await runContentPipeline(plugins, '', ctx);
    expect(result).toBe('ASYNC');
  });

  it('handles mixed sync and async plugins', async () => {
    const plugins: ContentPlugin[] = [
      { name: 'sync', priority: 10, transform: (s) => s + 'SYNC' },
      {
        name: 'async',
        priority: 20,
        transform: async (s) => {
          await new Promise((r) => setTimeout(r, 1));
          return s + '-ASYNC';
        },
      },
    ];
    const ctx = createMockContext();
    const result = await runContentPipeline(plugins, '', ctx);
    expect(result).toBe('SYNC-ASYNC');
  });

  it('returns original content if no plugins', async () => {
    const ctx = createMockContext();
    const result = await runContentPipeline([], 'original', ctx);
    expect(result).toBe('original');
  });
});

describe('runMetadataPipeline', () => {
  it('runs plugins in priority order', async () => {
    const plugins: MetadataPlugin[] = [
      {
        name: 'set-title',
        priority: 10,
        extract: (m) => ({ ...m, title: 'Title' }),
      },
      {
        name: 'append-suffix',
        priority: 20,
        extract: (m) => ({ ...m, title: m.title + ' - Suffix' }),
      },
    ];
    const initial: PageMetadata = { title: '', description: '', frontmatter: {} };
    const ctx = createMockContext();
    const result = await runMetadataPipeline(plugins, initial, 'content', ctx);
    expect(result.title).toBe('Title - Suffix');
  });

  it('passes content to plugins', async () => {
    const plugins: MetadataPlugin[] = [
      {
        name: 'extract-title',
        priority: 10,
        extract: (m, content) => {
          const match = content.match(/^# (.+)$/m);
          return { ...m, title: match?.[1] || 'Untitled' };
        },
      },
    ];
    const initial: PageMetadata = { title: '', description: '', frontmatter: {} };
    const ctx = createMockContext();
    const result = await runMetadataPipeline(plugins, initial, '# My Title', ctx);
    expect(result.title).toBe('My Title');
  });

  it('preserves existing metadata if plugin returns unchanged', async () => {
    const plugins: MetadataPlugin[] = [
      {
        name: 'conditional',
        priority: 10,
        extract: (m) => {
          if (m.title) return m; // Don't override if already set
          return { ...m, title: 'Fallback' };
        },
      },
    ];
    const initial: PageMetadata = { title: 'Existing', description: '', frontmatter: {} };
    const ctx = createMockContext();
    const result = await runMetadataPipeline(plugins, initial, '', ctx);
    expect(result.title).toBe('Existing');
  });

  it('allows plugins to add custom fields', async () => {
    const plugins: MetadataPlugin[] = [
      {
        name: 'reading-time',
        priority: 10,
        extract: (m, content) => ({
          ...m,
          readingTime: Math.ceil(content.split(/\s+/).length / 200),
        }),
      },
    ];
    const initial: PageMetadata = { title: '', description: '', frontmatter: {} };
    const content = Array(400).fill('word').join(' ');
    const ctx = createMockContext();
    const result = await runMetadataPipeline(plugins, initial, content, ctx);
    expect(result.readingTime).toBe(2);
  });
});

describe('runScannerPipeline', () => {
  it('first false is hard rejection (like extension filter)', async () => {
    // If first definitive answer is false, nothing can override it
    const plugins: ScannerPlugin[] = [
      { name: 'deny', priority: 10, filter: () => false },
      { name: 'allow', priority: 20, filter: () => true },
    ];
    const ctx = createMockContext();
    const result = await runScannerPipeline(plugins, 'test.md', ctx);
    expect(result).toBe(false); // First false wins
  });

  it('returns false if all plugins return false', async () => {
    const plugins: ScannerPlugin[] = [
      { name: 'deny1', priority: 10, filter: () => false },
      { name: 'deny2', priority: 20, filter: () => false },
    ];
    const ctx = createMockContext();
    const result = await runScannerPipeline(plugins, 'test.md', ctx);
    expect(result).toBe(false);
  });

  it('later true can override earlier true (not first false)', async () => {
    // If first answer is defer, later plugins can set the decision
    const plugins: ScannerPlugin[] = [
      { name: 'defer', priority: 10, filter: () => undefined },
      { name: 'allow', priority: 20, filter: () => true },
      { name: 'deny', priority: 30, filter: () => false },
    ];
    const ctx = createMockContext();
    const result = await runScannerPipeline(plugins, 'test.md', ctx);
    expect(result).toBe(false); // Last definitive answer wins (deny)
  });

  it('include can override ignore when extension passes first', async () => {
    // Real-world scenario: extension passes, ignore denies, include allows
    const plugins: ScannerPlugin[] = [
      { name: 'extension', priority: 5, filter: () => true },    // Pass
      { name: 'ignore', priority: 15, filter: () => false },      // Deny
      { name: 'include', priority: 20, filter: () => true },      // Allow (overrides)
    ];
    const ctx = createMockContext();
    const result = await runScannerPipeline(plugins, '.promptpack/test.md', ctx);
    expect(result).toBe(true);
  });

  it('returns true if all plugins defer (undefined)', async () => {
    const plugins: ScannerPlugin[] = [
      { name: 'defer1', priority: 10, filter: () => undefined },
      { name: 'defer2', priority: 20, filter: () => undefined },
    ];
    const ctx = createMockContext();
    const result = await runScannerPipeline(plugins, 'test.md', ctx);
    expect(result).toBe(true); // Default to include
  });

  it('returns true for empty plugin array', async () => {
    const ctx = createMockContext();
    const result = await runScannerPipeline([], 'test.md', ctx);
    expect(result).toBe(true);
  });

  it('passes filePath to plugins', async () => {
    let capturedPath = '';
    const plugins: ScannerPlugin[] = [
      {
        name: 'capture',
        priority: 10,
        filter: (path) => {
          capturedPath = path;
          return true;
        },
      },
    ];
    const ctx = createMockContext();
    await runScannerPipeline(plugins, 'my/file.md', ctx);
    expect(capturedPath).toBe('my/file.md');
  });
});

