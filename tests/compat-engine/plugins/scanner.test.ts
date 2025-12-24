/**
 * Scanner Plugin Tests (TDD - RED Phase)
 *
 * Tests for scanner plugins that filter files during directory scanning.
 */

import { describe, it, expect } from 'vitest';
import {
  extensionFilterPlugin,
  ignorePatternPlugin,
  includePatternPlugin,
  createScannerPlugins,
} from '@/lib/compat-engine/plugins/scanner';
import { runScannerPipeline } from '@/lib/compat-engine/core/pipeline';
import { createMockContext } from '../../utils';

describe('extensionFilterPlugin', () => {
  const plugin = extensionFilterPlugin;

  it('has correct name and priority', () => {
    expect(plugin.name).toBe('extension-filter');
    expect(plugin.priority).toBe(5); // Runs first as hard constraint
  });

  it('accepts .md files', () => {
    const ctx = createMockContext({ options: { dir: '', baseUrl: '', extensions: ['.md', '.mdx'] } });
    const result = plugin.filter('test.md', ctx);
    expect(result).toBe(true);
  });

  it('accepts .mdx files', () => {
    const ctx = createMockContext({ options: { dir: '', baseUrl: '', extensions: ['.md', '.mdx'] } });
    const result = plugin.filter('test.mdx', ctx);
    expect(result).toBe(true);
  });

  it('rejects .yaml files', () => {
    const ctx = createMockContext({ options: { dir: '', baseUrl: '', extensions: ['.md', '.mdx'] } });
    const result = plugin.filter('test.yaml', ctx);
    expect(result).toBe(false);
  });

  it('rejects .json files', () => {
    const ctx = createMockContext({ options: { dir: '', baseUrl: '', extensions: ['.md', '.mdx'] } });
    const result = plugin.filter('data.json', ctx);
    expect(result).toBe(false);
  });

  it('rejects .ts files', () => {
    const ctx = createMockContext({ options: { dir: '', baseUrl: '', extensions: ['.md', '.mdx'] } });
    const result = plugin.filter('script.ts', ctx);
    expect(result).toBe(false);
  });

  it('handles files without extension', () => {
    const ctx = createMockContext({ options: { dir: '', baseUrl: '', extensions: ['.md', '.mdx'] } });
    const result = plugin.filter('Makefile', ctx);
    expect(result).toBe(false);
  });

  it('uses custom extensions from options', () => {
    const ctx = createMockContext({ options: { dir: '', baseUrl: '', extensions: ['.txt'] } });
    const result = plugin.filter('readme.txt', ctx);
    expect(result).toBe(true);
  });
});

describe('ignorePatternPlugin', () => {
  const plugin = ignorePatternPlugin;

  it('has correct name and priority', () => {
    expect(plugin.name).toBe('ignore-pattern');
    expect(plugin.priority).toBe(15);
  });

  it('ignores files starting with _', () => {
    const ctx = createMockContext({ options: { dir: '', baseUrl: '', ignore: ['_*'] } });
    const result = plugin.filter('_draft.md', ctx);
    expect(result).toBe(false);
  });

  it('ignores directories starting with _', () => {
    const ctx = createMockContext({ options: { dir: '', baseUrl: '', ignore: ['_*'] } });
    const result = plugin.filter('_private/secret.md', ctx);
    expect(result).toBe(false);
  });

  it('ignores files starting with .', () => {
    const ctx = createMockContext({ options: { dir: '', baseUrl: '', ignore: ['.*'] } });
    const result = plugin.filter('.hidden.md', ctx);
    expect(result).toBe(false);
  });

  it('ignores directories starting with .', () => {
    const ctx = createMockContext({ options: { dir: '', baseUrl: '', ignore: ['.*'] } });
    const result = plugin.filter('.git/config', ctx);
    expect(result).toBe(false);
  });

  it('ignores specific directory patterns', () => {
    const ctx = createMockContext({ options: { dir: '', baseUrl: '', ignore: ['tests/*'] } });
    const result = plugin.filter('tests/unit/test.md', ctx);
    expect(result).toBe(false);
  });

  it('allows files not matching ignore patterns', () => {
    const ctx = createMockContext({ options: { dir: '', baseUrl: '', ignore: ['_*', '.*'] } });
    const result = plugin.filter('normal.md', ctx);
    expect(result).toBeUndefined(); // Defer to other plugins
  });

  it('handles empty ignore array', () => {
    const ctx = createMockContext({ options: { dir: '', baseUrl: '', ignore: [] } });
    const result = plugin.filter('anything.md', ctx);
    expect(result).toBeUndefined();
  });
});

describe('includePatternPlugin', () => {
  const plugin = includePatternPlugin;

  it('has correct name and priority', () => {
    expect(plugin.name).toBe('include-pattern');
    expect(plugin.priority).toBe(20); // Runs after ignore (15), can override
  });

  it('includes .promptpack/** files when specified', () => {
    const ctx = createMockContext({ options: { dir: '', baseUrl: '', include: ['.promptpack/**'] } });
    const result = plugin.filter('.promptpack/actions/test.md', ctx);
    expect(result).toBe(true);
  });

  it('includes .hidden/** files when specified', () => {
    const ctx = createMockContext({ options: { dir: '', baseUrl: '', include: ['.hidden/**'] } });
    const result = plugin.filter('.hidden/secret.md', ctx);
    expect(result).toBe(true);
  });

  it('defers for non-matching files', () => {
    const ctx = createMockContext({ options: { dir: '', baseUrl: '', include: ['.promptpack/**'] } });
    const result = plugin.filter('regular/file.md', ctx);
    expect(result).toBeUndefined();
  });

  it('handles empty include array', () => {
    const ctx = createMockContext({ options: { dir: '', baseUrl: '', include: [] } });
    const result = plugin.filter('.hidden/secret.md', ctx);
    expect(result).toBeUndefined();
  });

  it('handles multiple include patterns', () => {
    const ctx = createMockContext({ options: { dir: '', baseUrl: '', include: ['.promptpack/**', '.actions/**'] } });
    const result1 = plugin.filter('.promptpack/test.md', ctx);
    const result2 = plugin.filter('.actions/run.md', ctx);
    expect(result1).toBe(true);
    expect(result2).toBe(true);
  });
});

describe('Scanner Pipeline Integration', () => {
  it('include overrides ignore for .promptpack', async () => {
    const plugins = createScannerPlugins({
      extensions: ['.md', '.mdx'],
      ignore: ['.*'], // Ignore dot files
      include: ['.promptpack/**'], // But include .promptpack
    });
    const ctx = createMockContext();

    const result = await runScannerPipeline(plugins, '.promptpack/actions/test.md', ctx);
    expect(result).toBe(true);
  });

  it('rejects non-md files even with include', async () => {
    const plugins = createScannerPlugins({
      extensions: ['.md', '.mdx'],
      ignore: [],
      include: ['.promptpack/**'],
    });
    const ctx = createMockContext();

    const result = await runScannerPipeline(plugins, '.promptpack/config.toml', ctx);
    expect(result).toBe(false);
  });

  it('rejects _ files even with include', async () => {
    const plugins = createScannerPlugins({
      extensions: ['.md', '.mdx'],
      ignore: ['_*'],
      include: ['.promptpack/**'],
    });
    const ctx = createMockContext();

    const result = await runScannerPipeline(plugins, '_drafts/test.md', ctx);
    expect(result).toBe(false);
  });

  it('accepts normal md files', async () => {
    const plugins = createScannerPlugins({
      extensions: ['.md', '.mdx'],
      ignore: ['_*', '.*'],
      include: [],
    });
    const ctx = createMockContext();

    const result = await runScannerPipeline(plugins, 'docs/readme.md', ctx);
    expect(result).toBe(true);
  });

  it('correctly handles DocEngineering-like structure', async () => {
    const plugins = createScannerPlugins({
      extensions: ['.md', '.mdx'],
      ignore: ['_*', 'tests/*', 'scripts/*'],
      include: ['.promptpack/**'],
    });
    const ctx = createMockContext();

    // Should include
    expect(await runScannerPipeline(plugins, 'AGENTS.md', ctx)).toBe(true);
    expect(await runScannerPipeline(plugins, 'reference/0-disc-analyze.md', ctx)).toBe(true);
    expect(await runScannerPipeline(plugins, '.promptpack/actions/test.md', ctx)).toBe(true);

    // Should exclude
    expect(await runScannerPipeline(plugins, 'tests/unit/test.md', ctx)).toBe(false);
    expect(await runScannerPipeline(plugins, 'scripts/build.ts', ctx)).toBe(false);
    expect(await runScannerPipeline(plugins, 'facts/config.yaml', ctx)).toBe(false);
  });
});

