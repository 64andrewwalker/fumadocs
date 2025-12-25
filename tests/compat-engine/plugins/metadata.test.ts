/**
 * Metadata Plugin Tests
 * 
 * TDD tests for metadata extraction plugins.
 */
import { describe, it, expect } from 'vitest';
import type { PageMetadata, PluginContext } from '@/lib/compat-engine/types';
import {
  titleFromH1Plugin,
  titleFromFilenamePlugin,
  descriptionFromParagraphPlugin,
  frontmatterPlugin,
  runMetadataPipeline,
  defaultMetadataPlugins,
} from '@/lib/compat-engine/plugins/metadata';

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

// Helper to create empty metadata
function createEmptyMetadata(): PageMetadata {
  return {
    title: '',
    description: '',
    frontmatter: {},
  };
}

describe('Metadata Plugins', () => {
  describe('titleFromH1Plugin', () => {
    it('should have correct name and priority', () => {
      expect(titleFromH1Plugin.name).toBe('title-from-h1');
      expect(titleFromH1Plugin.priority).toBeGreaterThan(0);
    });

    it('should extract title from first H1', () => {
      const ctx = createContext();
      const content = '# Hello World\n\nSome content';
      const result = titleFromH1Plugin.extract(createEmptyMetadata(), content, ctx);
      expect(result.title).toBe('Hello World');
    });

    it('should handle H1 with leading whitespace', () => {
      const ctx = createContext();
      const content = '  # Indented Title\n\nContent';
      const result = titleFromH1Plugin.extract(createEmptyMetadata(), content, ctx);
      // Should not match due to leading whitespace (not valid markdown)
      expect(result.title).toBe('');
    });

    it('should extract only first H1 in document', () => {
      const ctx = createContext();
      const content = '# First Title\n\nText\n\n# Second Title';
      const result = titleFromH1Plugin.extract(createEmptyMetadata(), content, ctx);
      expect(result.title).toBe('First Title');
    });

    it('should not override existing title', () => {
      const ctx = createContext();
      const metadata = { ...createEmptyMetadata(), title: 'Existing' };
      const content = '# New Title';
      const result = titleFromH1Plugin.extract(metadata, content, ctx);
      expect(result.title).toBe('Existing');
    });

    it('should trim whitespace from title', () => {
      const ctx = createContext();
      const content = '#   Spaced Title   \n';
      const result = titleFromH1Plugin.extract(createEmptyMetadata(), content, ctx);
      expect(result.title).toBe('Spaced Title');
    });
  });

  describe('titleFromFilenamePlugin', () => {
    it('should have correct name and priority', () => {
      expect(titleFromFilenamePlugin.name).toBe('title-from-filename');
      expect(titleFromFilenamePlugin.priority).toBeGreaterThan(titleFromH1Plugin.priority);
    });

    it('should generate title from filename', () => {
      const ctx = createContext({ filePath: 'getting-started.md' });
      const result = titleFromFilenamePlugin.extract(createEmptyMetadata(), '', ctx);
      expect(result.title).toBe('Getting Started');
    });

    it('should handle underscores', () => {
      const ctx = createContext({ filePath: 'my_document.md' });
      const result = titleFromFilenamePlugin.extract(createEmptyMetadata(), '', ctx);
      expect(result.title).toBe('My Document');
    });

    it('should handle nested paths', () => {
      const ctx = createContext({ filePath: 'guides/advanced/performance.md' });
      const result = titleFromFilenamePlugin.extract(createEmptyMetadata(), '', ctx);
      expect(result.title).toBe('Performance');
    });

    it('should not override existing title', () => {
      const ctx = createContext({ filePath: 'file.md' });
      const metadata = { ...createEmptyMetadata(), title: 'Existing' };
      const result = titleFromFilenamePlugin.extract(metadata, '', ctx);
      expect(result.title).toBe('Existing');
    });

    it('should capitalize each word', () => {
      const ctx = createContext({ filePath: 'how-to-use-this.md' });
      const result = titleFromFilenamePlugin.extract(createEmptyMetadata(), '', ctx);
      expect(result.title).toBe('How To Use This');
    });
  });

  describe('descriptionFromParagraphPlugin', () => {
    it('should have correct name and priority', () => {
      expect(descriptionFromParagraphPlugin.name).toBe('description-from-paragraph');
    });

    it('should extract first paragraph as description', () => {
      const ctx = createContext();
      const content = 'This is the first paragraph.\n\nThis is the second.';
      const result = descriptionFromParagraphPlugin.extract(createEmptyMetadata(), content, ctx);
      expect(result.description).toBe('This is the first paragraph.');
    });

    it('should skip headings', () => {
      const ctx = createContext();
      const content = '# Title\n\nActual description here.';
      const result = descriptionFromParagraphPlugin.extract(createEmptyMetadata(), content, ctx);
      expect(result.description).toBe('Actual description here.');
    });

    it('should skip frontmatter', () => {
      const ctx = createContext();
      const content = '---\ntitle: Test\n---\n\nReal content here.';
      const result = descriptionFromParagraphPlugin.extract(createEmptyMetadata(), content, ctx);
      expect(result.description).toBe('Real content here.');
    });

    it('should limit description length', () => {
      const ctx = createContext();
      const longText = 'A'.repeat(300);
      const result = descriptionFromParagraphPlugin.extract(createEmptyMetadata(), longText, ctx);
      expect(result.description.length).toBeLessThanOrEqual(200);
    });

    it('should not override existing description', () => {
      const ctx = createContext();
      const metadata = { ...createEmptyMetadata(), description: 'Existing' };
      const result = descriptionFromParagraphPlugin.extract(metadata, 'New text', ctx);
      expect(result.description).toBe('Existing');
    });

    it('should return default for empty content', () => {
      const ctx = createContext();
      const result = descriptionFromParagraphPlugin.extract(createEmptyMetadata(), '', ctx);
      expect(result.description).toBe('No description available');
    });
  });

  describe('frontmatterPlugin', () => {
    it('should have correct name and highest priority (lowest number)', () => {
      expect(frontmatterPlugin.name).toBe('frontmatter');
      expect(frontmatterPlugin.priority).toBeLessThan(titleFromH1Plugin.priority);
    });

    it('should use frontmatter title if available', () => {
      const ctx = createContext();
      const metadata = {
        ...createEmptyMetadata(),
        frontmatter: { title: 'FM Title' },
      };
      const result = frontmatterPlugin.extract(metadata, '', ctx);
      expect(result.title).toBe('FM Title');
    });

    it('should use frontmatter description if available', () => {
      const ctx = createContext();
      const metadata = {
        ...createEmptyMetadata(),
        frontmatter: { description: 'FM Description' },
      };
      const result = frontmatterPlugin.extract(metadata, '', ctx);
      expect(result.description).toBe('FM Description');
    });

    it('should preserve existing values if frontmatter is empty', () => {
      const ctx = createContext();
      const metadata = {
        title: 'Existing Title',
        description: 'Existing Desc',
        frontmatter: {},
      };
      const result = frontmatterPlugin.extract(metadata, '', ctx);
      expect(result.title).toBe('Existing Title');
      expect(result.description).toBe('Existing Desc');
    });
  });

  describe('runMetadataPipeline', () => {
    it('should execute plugins in priority order', async () => {
      const order: string[] = [];
      const plugin1 = {
        name: 'first',
        priority: 10,
        extract: (m: PageMetadata) => { order.push('first'); return m; },
      };
      const plugin2 = {
        name: 'second',
        priority: 50,
        extract: (m: PageMetadata) => { order.push('second'); return m; },
      };

      const ctx = createContext();
      await runMetadataPipeline([plugin1, plugin2], createEmptyMetadata(), '', ctx);
      expect(order).toEqual(['first', 'second']);
    });

    it('should accumulate metadata from plugins', async () => {
      const plugin1 = {
        name: 'title-setter',
        priority: 10,
        extract: (m: PageMetadata) => ({ ...m, title: 'Title' }),
      };
      const plugin2 = {
        name: 'desc-setter',
        priority: 20,
        extract: (m: PageMetadata) => ({ ...m, description: 'Desc' }),
      };

      const ctx = createContext();
      const result = await runMetadataPipeline([plugin1, plugin2], createEmptyMetadata(), '', ctx);
      expect(result.title).toBe('Title');
      expect(result.description).toBe('Desc');
    });

    it('should respect priority for title resolution', async () => {
      // Higher priority (lower number) should NOT override
      // because later plugins should defer if value exists
      const ctx = createContext({ filePath: 'test.md' });
      const result = await runMetadataPipeline(
        defaultMetadataPlugins,
        { ...createEmptyMetadata(), frontmatter: { title: 'FM Title' } },
        '# H1 Title',
        ctx
      );
      expect(result.title).toBe('FM Title');
    });
  });
});


