/**
 * Content Plugin Tests
 * 
 * TDD tests for content transformation plugins.
 */
import { describe, it, expect } from 'vitest';
import type { PluginContext } from '@/lib/compat-engine/types';

// Test plugins will be imported after implementation
import {
  jsxEscapePlugin,
  linkTransformPlugin,
  imageTransformPlugin,
  markdownPreprocessPlugin,
  runContentPipeline,
} from '@/lib/compat-engine/plugins/content';

// Helper to create test context
function createContext(overrides?: Partial<PluginContext>): PluginContext {
  return {
    filePath: 'test.md',
    baseUrl: '/docs',
    sourceDir: '/project/content',
    options: {
      dir: 'content',
      baseUrl: '/docs',
    },
    ...overrides,
  };
}

describe('Content Plugins', () => {
  describe('jsxEscapePlugin', () => {
    it('should have correct name and priority', () => {
      expect(jsxEscapePlugin.name).toBe('jsx-escape');
      expect(jsxEscapePlugin.priority).toBeLessThan(30);
    });

    it('should escape < not followed by letter', () => {
      const ctx = createContext();
      const result = jsxEscapePlugin.transform('I <3 JavaScript', ctx);
      expect(result).toContain('&lt;3');
    });

    it('should preserve valid HTML tags', () => {
      const ctx = createContext();
      const result = jsxEscapePlugin.transform('<strong>bold</strong>', ctx);
      expect(result).toBe('<strong>bold</strong>');
    });

    it('should convert HTML comments to MDX comments', () => {
      const ctx = createContext();
      const result = jsxEscapePlugin.transform('<!-- comment -->', ctx);
      // Note: After conversion, the { gets escaped since it's followed by /*
      expect(result).toContain('/*');
      expect(result).toContain('*/');
    });

    it('should escape curly braces not followed by identifier', () => {
      const ctx = createContext();
      // { followed by letter is preserved (valid JSX)
      const result1 = jsxEscapePlugin.transform('Use {placeholder} here', ctx);
      expect(result1).toBe('Use {placeholder} here');
      
      // { not followed by letter is escaped
      const result2 = jsxEscapePlugin.transform('Use { } here', ctx);
      expect(result2).toContain('\\{');
    });

    it('should preserve code blocks', () => {
      const ctx = createContext();
      const input = '```js\nconst x = <div>{y}</div>;\n```';
      const result = jsxEscapePlugin.transform(input, ctx);
      expect(result).toContain('const x = <div>{y}</div>;');
    });

    it('should preserve inline code', () => {
      const ctx = createContext();
      const result = jsxEscapePlugin.transform('Use `<div>` tag', ctx);
      expect(result).toContain('`<div>`');
    });

    it('should preserve math formulas', () => {
      const ctx = createContext();
      const result = jsxEscapePlugin.transform('Formula: $x < y$', ctx);
      expect(result).toContain('$x < y$');
    });
  });

  describe('linkTransformPlugin', () => {
    it('should have correct name and priority', () => {
      expect(linkTransformPlugin.name).toBe('link-transform');
      expect(linkTransformPlugin.priority).toBeGreaterThan(30);
      expect(linkTransformPlugin.priority).toBeLessThan(60);
    });

    it('should transform relative .md links', () => {
      const ctx = createContext({ filePath: 'guides/intro.md', baseUrl: '/docs' });
      const result = linkTransformPlugin.transform('[Link](./other.md)', ctx);
      expect(result).toBe('[Link](/docs/guides/other)');
    });

    it('should transform .mdx links', () => {
      const ctx = createContext({ filePath: 'intro.md', baseUrl: '/docs' });
      const result = linkTransformPlugin.transform('[Link](./page.mdx)', ctx);
      expect(result).toBe('[Link](/docs/page)');
    });

    it('should preserve external links', () => {
      const ctx = createContext();
      const input = '[Google](https://google.com)';
      const result = linkTransformPlugin.transform(input, ctx);
      expect(result).toBe(input);
    });

    it('should preserve anchor links', () => {
      const ctx = createContext();
      const input = '[Section](#section)';
      const result = linkTransformPlugin.transform(input, ctx);
      expect(result).toBe(input);
    });

    it('should preserve absolute links', () => {
      const ctx = createContext();
      const input = '[Page](/other/page)';
      const result = linkTransformPlugin.transform(input, ctx);
      expect(result).toBe(input);
    });

    it('should handle nested directory links', () => {
      const ctx = createContext({ filePath: 'a/b/page.md', baseUrl: '/raw' });
      const result = linkTransformPlugin.transform('[Link](../other.md)', ctx);
      expect(result).toBe('[Link](/raw/a/other)');
    });

    it('should handle multiple links in content', () => {
      const ctx = createContext({ filePath: 'intro.md', baseUrl: '/docs' });
      const input = 'See [A](./a.md) and [B](./b.md)';
      const result = linkTransformPlugin.transform(input, ctx);
      expect(result).toBe('See [A](/docs/a) and [B](/docs/b)');
    });
  });

  describe('imageTransformPlugin', () => {
    it('should have correct name and priority', () => {
      expect(imageTransformPlugin.name).toBe('image-transform');
      expect(imageTransformPlugin.priority).toBeGreaterThan(30);
      expect(imageTransformPlugin.priority).toBeLessThan(60);
    });

    it('should transform relative image paths', () => {
      const ctx = createContext({
        filePath: 'guides/intro.md',
        options: {
          dir: 'content',
          baseUrl: '/docs',
          imageBasePath: '/images',
        },
      });
      const result = imageTransformPlugin.transform('![Alt](./photo.png)', ctx);
      expect(result).toBe('![Alt](/images/guides/photo.png)');
    });

    it('should preserve external images', () => {
      const ctx = createContext({
        options: { dir: 'content', baseUrl: '/docs', imageBasePath: '/images' },
      });
      const input = '![Alt](https://example.com/img.png)';
      const result = imageTransformPlugin.transform(input, ctx);
      expect(result).toBe(input);
    });

    it('should preserve absolute image paths', () => {
      const ctx = createContext({
        options: { dir: 'content', baseUrl: '/docs', imageBasePath: '/images' },
      });
      const input = '![Alt](/static/img.png)';
      const result = imageTransformPlugin.transform(input, ctx);
      expect(result).toBe(input);
    });

    it('should skip transformation if no imageBasePath', () => {
      const ctx = createContext();
      const input = '![Alt](./photo.png)';
      const result = imageTransformPlugin.transform(input, ctx);
      expect(result).toBe(input);
    });
  });

  describe('markdownPreprocessPlugin', () => {
    it('should have correct name and priority', () => {
      expect(markdownPreprocessPlugin.name).toBe('markdown-preprocess');
      expect(markdownPreprocessPlugin.priority).toBeLessThanOrEqual(10);
    });

    it('should preserve code blocks during preprocessing', () => {
      const ctx = createContext();
      const input = '```\n<3 {test}\n```';
      const result = markdownPreprocessPlugin.transform(input, ctx);
      expect(result).toContain('<3 {test}');
    });

    it('should process table content', () => {
      const ctx = createContext();
      const input = '| x < 10 | y |\n|---|---|\n| <3 | ok |';
      const result = markdownPreprocessPlugin.transform(input, ctx);
      expect(result).toContain('&lt;');
    });
  });

  describe('runContentPipeline', () => {
    it('should execute plugins in priority order', async () => {
      const order: string[] = [];
      const plugin1 = {
        name: 'first',
        priority: 10,
        transform: (c: string) => { order.push('first'); return c + '-first'; },
      };
      const plugin2 = {
        name: 'second',
        priority: 50,
        transform: (c: string) => { order.push('second'); return c + '-second'; },
      };
      const plugin3 = {
        name: 'third',
        priority: 30,
        transform: (c: string) => { order.push('third'); return c + '-third'; },
      };

      const ctx = createContext();
      const result = await runContentPipeline([plugin1, plugin2, plugin3], 'start', ctx);

      expect(order).toEqual(['first', 'third', 'second']);
      expect(result).toBe('start-first-third-second');
    });

    it('should handle async plugins', async () => {
      const plugin = {
        name: 'async',
        priority: 10,
        transform: async (c: string) => {
          await new Promise((r) => setTimeout(r, 10));
          return c + '-async';
        },
      };

      const ctx = createContext();
      const result = await runContentPipeline([plugin], 'content', ctx);
      expect(result).toBe('content-async');
    });

    it('should return original content if no plugins', async () => {
      const ctx = createContext();
      const result = await runContentPipeline([], 'original', ctx);
      expect(result).toBe('original');
    });
  });
});

