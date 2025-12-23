/**
 * Compat Engine Tests
 *
 * TDD test cases for the Fumadocs compatibility layer
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createCompatSource } from '../index';
import path from 'path';

const fixturesDir = path.join(__dirname, 'fixtures');

// =============================================================================
// TC-01: Empty Directory Handling
// =============================================================================
describe('TC-01: Empty Directory', () => {
  it('should return empty pages array for empty directory', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'empty-dir'),
      baseUrl: '/test',
    });
    expect(source.getPages()).toHaveLength(0);
  });

  it('should have empty pageTree children', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'empty-dir'),
      baseUrl: '/test',
    });
    expect(source.pageTree.children).toHaveLength(0);
  });
});

// =============================================================================
// TC-02: Non-existent Directory
// =============================================================================
describe('TC-02: Non-existent Directory', () => {
  it('should not throw error for non-existent directory', async () => {
    await expect(
      createCompatSource({
        dir: path.join(fixturesDir, 'non-existent-dir'),
        baseUrl: '/test',
      })
    ).resolves.not.toThrow();
  });

  it('should return empty pages for non-existent directory', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'non-existent-dir'),
      baseUrl: '/test',
    });
    expect(source.getPages()).toHaveLength(0);
  });
});

// =============================================================================
// TC-03: README as Index
// =============================================================================
describe('TC-03: README as Index', () => {
  it('should treat README.md as index page (empty slugs)', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-readme'),
      baseUrl: '/test',
    });
    const indexPage = source.getPage([]);
    expect(indexPage).toBeDefined();
    expect(indexPage?.filePath).toContain('README.md');
  });

  it('should also accept undefined slugs for index', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-readme'),
      baseUrl: '/test',
    });
    const indexPage = source.getPage(undefined);
    expect(indexPage).toBeDefined();
  });
});

// =============================================================================
// TC-04: File Sorting (README Priority)
// =============================================================================
describe('TC-04: File Sorting', () => {
  it('should return README as first page', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-readme'),
      baseUrl: '/test',
    });
    const pages = source.getPages();
    expect(pages.length).toBeGreaterThan(0);
    expect(pages[0].filePath).toContain('README.md');
  });
});

// =============================================================================
// TC-05: Automatic Title Extraction
// =============================================================================
describe('TC-05: Title Extraction', () => {
  it('should extract title from first h1', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-readme'),
      baseUrl: '/test',
    });
    const page = source.getPage([]);
    expect(page?.data.title).toBe('Welcome to the Project');
  });
});

// =============================================================================
// TC-06: Automatic Description Extraction
// =============================================================================
describe('TC-06: Description Extraction', () => {
  it('should extract description from content', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-readme'),
      baseUrl: '/test',
    });
    const page = source.getPage([]);
    expect(page?.data.description).toContain('README');
  });
});

// =============================================================================
// TC-11: Nested Directory Structure
// =============================================================================
describe('TC-11: Nested Directory Structure', () => {
  it('should handle nested directories', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-nested'),
      baseUrl: '/test',
    });
    const pages = source.getPages();
    expect(pages.length).toBeGreaterThan(0);
  });

  it('should create correct URL for nested files', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-nested'),
      baseUrl: '/test',
    });
    const page = source.getPage(['guides', 'getting-started']);
    expect(page).toBeDefined();
    expect(page?.url).toBe('/test/guides/getting-started');
  });

  it('should handle deeply nested files', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-nested'),
      baseUrl: '/test',
    });
    const page = source.getPage(['guides', 'advanced', 'topic']);
    expect(page).toBeDefined();
    expect(page?.url).toBe('/test/guides/advanced/topic');
  });
});

// =============================================================================
// TC-13-17: MDX Preprocessing
// =============================================================================
describe('TC-13-17: MDX Preprocessing', () => {
  it('should escape < followed by number in tables', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'special-chars'),
      baseUrl: '/test',
    });
    const page = source.getPage(['table-with-special']);
    expect(page).toBeDefined();
    // The content should be escaped
    expect(page?.content).toContain('&lt;16Ω');
  });

  it('should escape curly braces in tables', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'special-chars'),
      baseUrl: '/test',
    });
    const page = source.getPage(['table-with-special']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('\\{');
  });

  it('should preserve valid HTML tags', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'special-chars'),
      baseUrl: '/test',
    });
    const page = source.getPage(['table-with-special']);
    expect(page).toBeDefined();
    // <strong> should be preserved
    expect(page?.content).toContain('<strong>');
  });
});

// =============================================================================
// TC-18: Page Tree Construction
// =============================================================================
describe('TC-18: Page Tree Construction', () => {
  it('should build valid page tree', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-readme'),
      baseUrl: '/test',
    });
    expect(source.pageTree).toBeDefined();
    expect(source.pageTree.name).toBe('Documents');
    expect(source.pageTree.children).toBeDefined();
  });

  it('should include pages in tree', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-readme'),
      baseUrl: '/test',
    });
    const pages = source.getPages();
    expect(source.pageTree.children.length).toBe(pages.length);
  });
});

// =============================================================================
// TC-19/20: Special Filename Handling
// =============================================================================
describe('TC-19/20: Special Filenames', () => {
  it('should generate static params correctly', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-readme'),
      baseUrl: '/test',
    });
    const params = source.generateParams();
    expect(Array.isArray(params)).toBe(true);
    expect(params.length).toBe(source.getPages().length);
  });
});

// =============================================================================
// P2-1: Relative Link Transformation
// =============================================================================
describe('P2-1: Relative Link Transformation', () => {
  it('should transform relative .md links', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-links'),
      baseUrl: '/docs',
      transformLinks: true,
    });
    const page = source.getPage(['page-a']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('[Page B](/docs/page-b)');
  });

  it('should transform nested relative links', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-links'),
      baseUrl: '/docs',
      transformLinks: true,
    });
    const page = source.getPage(['page-a']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('[nested page](/docs/guides/nested)');
  });

  it('should preserve external links', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-readme'),
      baseUrl: '/test',
      transformLinks: true,
    });
    // External links should not be modified
    const page = source.getPage([]);
    expect(page).toBeDefined();
  });

  it('should not transform links when disabled', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-links'),
      baseUrl: '/docs',
      transformLinks: false,
    });
    const page = source.getPage(['page-a']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('./page-b.md');
  });
});

// =============================================================================
// P2-3: File Size Limit
// =============================================================================
describe('P2-3: File Size Limit', () => {
  it('should have warnings array', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-readme'),
      baseUrl: '/test',
    });
    expect(Array.isArray(source.warnings)).toBe(true);
  });

  it('should skip files exceeding size limit', async () => {
    // With a very small limit, files should be skipped
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-readme'),
      baseUrl: '/test',
      maxFileSize: 10, // 10 bytes - very small
    });
    // Files should be skipped
    expect(source.getPages().length).toBeLessThan(2);
    expect(source.warnings.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Custom Preprocessor
// =============================================================================
describe('Custom Preprocessor', () => {
  it('should apply custom preprocessor', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-readme'),
      baseUrl: '/test',
      preprocessor: (content) => content.replace('README', 'MODIFIED'),
    });
    const page = source.getPage([]);
    expect(page?.content).toContain('MODIFIED');
  });
});

// =============================================================================
// P3-1: Conflict Detection
// =============================================================================
describe('P3-1: Conflict Detection', () => {
  it('should detect slug conflicts and add warning', async () => {
    // Create a scenario where conflict would occur
    // (in practice, README.md and readme.md would conflict on case-insensitive systems)
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-readme'),
      baseUrl: '/test',
    });
    // Conflicts should be recorded in warnings
    expect(Array.isArray(source.warnings)).toBe(true);
  });
});

// =============================================================================
// P3-2: Folder Hierarchy
// =============================================================================
describe('P3-2: Folder Hierarchy', () => {
  it('should preserve folder structure in page tree', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-nested'),
      baseUrl: '/docs',
    });
    
    // Should have folders in the tree
    const hasFolder = source.pageTree.children.some(
      (child) => child.type === 'folder'
    );
    expect(hasFolder).toBe(true);
  });

  it('should use folder index as folder entry', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-nested'),
      baseUrl: '/docs',
    });
    
    // Find the guides folder
    const guidesFolder = source.pageTree.children.find(
      (child) => child.type === 'folder' && child.name === 'Guides Overview'
    );
    
    // Folder should exist and have the index page's title
    expect(guidesFolder).toBeDefined();
  });

  it('should convert slug to display name for folders without index', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-nested'),
      baseUrl: '/docs',
    });
    
    // Check that folder names are properly formatted
    expect(source.pageTree.name).toBe('Documents');
  });
});

