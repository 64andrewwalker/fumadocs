/**
 * Page Builder Tests
 * 
 * TDD tests for page tree building functionality.
 */
import { describe, it, expect } from 'vitest';
import type { RawPage } from '@/lib/compat-engine/types';
import {
  buildPageTree,
  flattenEmptyFolders,
} from '@/lib/compat-engine/core/page-builder';

// Helper to create mock pages
function createPage(overrides: Partial<RawPage> & { slugs: string[] }): RawPage {
  const slugs = overrides.slugs;
  return {
    filePath: overrides.filePath || slugs.join('/') + '.md',
    slugs,
    url: '/docs/' + slugs.join('/'),
    content: '',
    data: {
      title: overrides.data?.title || slugs[slugs.length - 1] || 'Index',
      description: '',
      frontmatter: {},
    },
    ...overrides,
  };
}

describe('Page Builder', () => {
  describe('buildPageTree', () => {
    it('should create empty tree for no pages', () => {
      const tree = buildPageTree([], '/docs');
      expect(tree.name).toBe('Documents');
      expect(tree.children).toEqual([]);
    });

    it('should create root page for empty slugs', () => {
      const pages = [createPage({ slugs: [], data: { title: 'Home', description: '', frontmatter: {} } })];
      const tree = buildPageTree(pages, '/docs');
      
      expect(tree.children.length).toBe(1);
      expect(tree.children[0]).toMatchObject({
        type: 'page',
        name: 'Home',
        url: '/docs/',
      });
    });

    it('should create top-level pages', () => {
      const pages = [
        createPage({ slugs: ['intro'], data: { title: 'Intro', description: '', frontmatter: {} } }),
        createPage({ slugs: ['guide'], data: { title: 'Guide', description: '', frontmatter: {} } }),
      ];
      const tree = buildPageTree(pages, '/docs');

      expect(tree.children.length).toBe(2);
      // Sorted by URL: guide < intro
      expect(tree.children[0]).toMatchObject({ type: 'page', name: 'Guide' });
      expect(tree.children[1]).toMatchObject({ type: 'page', name: 'Intro' });
    });

    it('should create folder for nested pages', () => {
      const pages = [
        createPage({ slugs: ['guides', 'intro'], data: { title: 'Intro', description: '', frontmatter: {} } }),
      ];
      const tree = buildPageTree(pages, '/docs');

      expect(tree.children.length).toBe(1);
      const folder = tree.children[0];
      expect(folder.type).toBe('folder');
      expect(folder.name).toBe('Guides');
      expect((folder as any).children.length).toBe(1);
    });

    it('should create folder with index page', () => {
      const pages = [
        createPage({
          slugs: ['guides'],
          filePath: 'guides/README.md',
          data: { title: 'Guides Overview', description: '', frontmatter: {} },
        }),
        createPage({
          slugs: ['guides', 'intro'],
          data: { title: 'Getting Started', description: '', frontmatter: {} },
        }),
      ];
      const tree = buildPageTree(pages, '/docs');

      expect(tree.children.length).toBe(1);
      const folder = tree.children[0] as any;
      expect(folder.type).toBe('folder');
      expect(folder.name).toBe('Guides Overview');
      expect(folder.index).toBeDefined();
      expect(folder.index.url).toBe('/docs/guides');
      expect(folder.children.length).toBe(1);
    });

    it('should handle deeply nested structure', () => {
      const pages = [
        createPage({ slugs: ['a', 'b', 'c', 'page'], data: { title: 'Deep Page', description: '', frontmatter: {} } }),
      ];
      const tree = buildPageTree(pages, '/docs');

      let node: any = tree;
      expect(node.children[0].type).toBe('folder');
      expect(node.children[0].name).toBe('A');
      
      node = node.children[0];
      expect(node.children[0].type).toBe('folder');
      expect(node.children[0].name).toBe('B');
      
      node = node.children[0];
      expect(node.children[0].type).toBe('folder');
      expect(node.children[0].name).toBe('C');
      
      node = node.children[0];
      expect(node.children[0].type).toBe('page');
      expect(node.children[0].name).toBe('Deep Page');
    });

    it('should sort pages by URL', () => {
      const pages = [
        createPage({ slugs: ['zebra'], data: { title: 'Zebra', description: '', frontmatter: {} } }),
        createPage({ slugs: ['apple'], data: { title: 'Apple', description: '', frontmatter: {} } }),
        createPage({ slugs: ['mango'], data: { title: 'Mango', description: '', frontmatter: {} } }),
      ];
      const tree = buildPageTree(pages, '/docs');

      expect(tree.children.map((c: any) => c.name)).toEqual(['Apple', 'Mango', 'Zebra']);
    });
  });

  describe('flattenEmptyFolders', () => {
    it('should convert folder with only index to page', () => {
      const tree = {
        name: 'Root',
        children: [
          {
            type: 'folder' as const,
            name: 'Section',
            index: { type: 'page' as const, name: 'Section', url: '/docs/section' },
            children: [],
          },
        ],
      };

      flattenEmptyFolders(tree);

      expect(tree.children[0]).toMatchObject({
        type: 'page',
        name: 'Section',
        url: '/docs/section',
      });
    });

    it('should preserve folder with children', () => {
      const tree = {
        name: 'Root',
        children: [
          {
            type: 'folder' as const,
            name: 'Section',
            index: { type: 'page' as const, name: 'Section', url: '/docs/section' },
            children: [
              { type: 'page' as const, name: 'Child', url: '/docs/section/child' },
            ],
          },
        ],
      };

      flattenEmptyFolders(tree);

      expect(tree.children[0].type).toBe('folder');
      expect((tree.children[0] as any).children.length).toBe(1);
    });

    it('should handle nested empty folders', () => {
      const tree = {
        name: 'Root',
        children: [
          {
            type: 'folder' as const,
            name: 'Outer',
            children: [
              {
                type: 'folder' as const,
                name: 'Inner',
                index: { type: 'page' as const, name: 'Inner', url: '/docs/outer/inner' },
                children: [],
              },
            ],
          },
        ],
      };

      flattenEmptyFolders(tree);

      const outer = tree.children[0] as any;
      expect(outer.type).toBe('folder');
      expect(outer.children[0].type).toBe('page');
      expect(outer.children[0].url).toBe('/docs/outer/inner');
    });

    it('should handle folder without index', () => {
      const tree = {
        name: 'Root',
        children: [
          {
            type: 'folder' as const,
            name: 'Empty',
            children: [],
          },
        ],
      };

      flattenEmptyFolders(tree);

      // Folder without index stays as folder (even if empty)
      expect(tree.children[0].type).toBe('folder');
    });
  });
});

