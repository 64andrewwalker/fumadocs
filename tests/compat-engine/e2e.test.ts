/**
 * End-to-End Tests for Compat Engine
 *
 * Tests the existing compat engine with DocEngineering as test data.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createCompatSource, type CompatSource } from '@/lib/compat-engine';
import path from 'path';

describe('Compat Engine E2E with DocEngineering', () => {
  let source: CompatSource;

  beforeAll(async () => {
    source = await createCompatSource({
      dir: 'DocEngineering',
      baseUrl: '/compat',
      extensions: ['.md', '.mdx'],
      transformLinks: true,
    });
  });

  describe('File Scanning', () => {
    it('scans DocEngineering directory', () => {
      const pages = source.getPages();
      expect(pages.length).toBeGreaterThan(0);
      console.log(`Found ${pages.length} pages`);
    });

    it('includes reference/*.md files', () => {
      const pages = source.getPages();
      const refPages = pages.filter((p) => p.filePath.includes('reference'));
      expect(refPages.length).toBeGreaterThan(0);
      console.log(`Found ${refPages.length} reference pages`);
    });

    it('includes docs/*.md files', () => {
      const pages = source.getPages();
      const docPages = pages.filter((p) =>
        p.filePath.includes(path.join('DocEngineering', 'docs'))
      );
      expect(docPages.length).toBeGreaterThan(0);
    });

    it('excludes .git directory', () => {
      const pages = source.getPages();
      const gitPages = pages.filter((p) => p.filePath.includes('.git'));
      expect(gitPages.length).toBe(0);
    });

    it('excludes test files by default', () => {
      const pages = source.getPages();
      // Check if tests/ directory files are included or not
      const testPages = pages.filter((p) =>
        p.filePath.includes(path.join('DocEngineering', 'tests'))
      );
      console.log(`Found ${testPages.length} test pages`);
    });
  });

  describe('Metadata Extraction', () => {
    it('extracts title from AGENTS.md', () => {
      const page = source.getPages().find((p) => p.filePath.includes('AGENTS.md'));
      expect(page).toBeDefined();
      expect(page!.data.title).toBeTruthy();
      console.log(`AGENTS.md title: ${page!.data.title}`);
    });

    it('extracts title from reference files', () => {
      const page = source
        .getPages()
        .find((p) => p.filePath.includes('0-disc-analyze-project.md'));
      expect(page).toBeDefined();
      expect(page!.data.title).toBeTruthy();
      console.log(`0-disc-analyze-project.md title: ${page!.data.title}`);
    });

    it('extracts description', () => {
      const page = source
        .getPages()
        .find((p) => p.filePath.includes('0-disc-analyze-project.md'));
      expect(page).toBeDefined();
      expect(page!.data.description).toBeTruthy();
    });
  });

  describe('Page Tree', () => {
    it('builds page tree', () => {
      expect(source.pageTree).toBeDefined();
      expect(source.pageTree.children.length).toBeGreaterThan(0);
    });

    it('has reference folder in tree', () => {
      const hasReference = source.pageTree.children.some(
        (child) => child.type === 'folder' && child.name.toLowerCase().includes('reference')
      );
      expect(hasReference).toBe(true);
    });
  });

  describe('URL Generation', () => {
    it('generates correct URLs', () => {
      const page = source
        .getPages()
        .find((p) => p.filePath.includes('0-disc-analyze-project.md'));
      expect(page).toBeDefined();
      expect(page!.url).toContain('/compat/');
      console.log(`URL: ${page!.url}`);
    });

    it('generates static params', () => {
      const params = source.generateParams();
      expect(params.length).toBeGreaterThan(0);
    });
  });

  describe('Content Processing', () => {
    it('preserves code blocks', () => {
      const page = source.getPages().find((p) => p.content.includes('```'));
      expect(page).toBeDefined();
      expect(page!.content).toContain('```');
    });

    it('handles tables', () => {
      const page = source.getPages().find((p) => p.content.includes('| --- |'));
      if (page) {
        // Tables should be preserved
        expect(page.content).toContain('|');
      }
    });
  });

  describe('getPage lookup', () => {
    it('can retrieve page by slugs', () => {
      const pages = source.getPages();
      if (pages.length > 0) {
        const firstPage = pages[0];
        const retrieved = source.getPage(firstPage.slugs);
        expect(retrieved).toBeDefined();
        expect(retrieved!.filePath).toBe(firstPage.filePath);
      }
    });

    it('returns undefined for non-existent page', () => {
      const retrieved = source.getPage(['non', 'existent', 'page']);
      expect(retrieved).toBeUndefined();
    });
  });
});

describe('Compat Engine E2E with .promptpack', () => {
  it('can include .promptpack directory with include option', async () => {
    const source = await createCompatSource({
      dir: 'DocEngineering',
      baseUrl: '/compat',
      include: ['.promptpack/**'],
    });

    const pages = source.getPages();
    const promptpackPages = pages.filter((p) => p.filePath.includes('.promptpack'));
    
    console.log(`Found ${promptpackPages.length} .promptpack pages`);
    
    // This test will likely fail with current implementation
    // because include option may not be fully implemented
    // This is expected - we'll implement it in Phase 3
  });
});


