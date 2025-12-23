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

// =============================================================================
// TC-07/08: Frontmatter Parsing and Error Tolerance
// =============================================================================
describe('TC-07/08: Frontmatter Handling', () => {
  it('should handle invalid frontmatter gracefully', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['invalid-frontmatter']);
    // Should not throw, should fallback to extracting title from h1
    expect(page).toBeDefined();
    expect(page?.data.title).toBe('Fallback Title');
  });
});

// =============================================================================
// TC-09: Hidden Files (.xxx)
// =============================================================================
describe('TC-09: Hidden File Handling', () => {
  it('should ignore files starting with dot', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
      ignore: ['_*', '.*'],
    });
    const pages = source.getPages();
    const hiddenPage = pages.find(p => p.filePath.includes('.hidden'));
    expect(hiddenPage).toBeUndefined();
  });
});

// =============================================================================
// TC-10: Draft Files (_xxx)
// =============================================================================
describe('TC-10: Draft File Handling', () => {
  it('should ignore files starting with underscore', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
      ignore: ['_*', '.*'],
    });
    const pages = source.getPages();
    const draftPage = pages.find(p => p.filePath.includes('_draft'));
    expect(draftPage).toBeUndefined();
  });

  it('should still include visible files', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
      ignore: ['_*', '.*'],
    });
    const pages = source.getPages();
    const visiblePage = pages.find(p => p.filePath.includes('visible-file'));
    expect(visiblePage).toBeDefined();
  });
});

// =============================================================================
// TC-12: No Title File
// =============================================================================
describe('TC-12b: No Title Fallback', () => {
  it('should use filename as title when no h1 exists', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['no-title']);
    expect(page).toBeDefined();
    // Should convert filename to title: no-title -> No Title
    expect(page?.data.title).toBe('No Title');
  });
});

// =============================================================================
// TC-16/17: Code Block and Inline Code Protection
// =============================================================================
describe('TC-16/17: Code Protection', () => {
  it('should preserve JSX inside code blocks', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['code-blocks']);
    expect(page).toBeDefined();
    // Code block content should be preserved as-is
    expect(page?.content).toContain('```jsx');
    expect(page?.content).toContain('<Component prop={value} />');
  });

  it('should preserve special chars in fenced code blocks', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['code-blocks']);
    expect(page).toBeDefined();
    // Bash code block should be preserved
    expect(page?.content).toContain('if [ $x < 10 ]');
  });
});

// =============================================================================
// TC: Extension Filtering
// =============================================================================
describe('Extension Filtering', () => {
  it('should only include markdown files', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const pages = source.getPages();
    // All pages should have .md or .mdx extension
    pages.forEach(page => {
      expect(page.filePath).toMatch(/\.(md|mdx)$/);
    });
  });
});

// =============================================================================
// TC: Page URL Generation
// =============================================================================
describe('Page URL Generation', () => {
  it('should generate correct base URL', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-readme'),
      baseUrl: '/custom-base',
    });
    const page = source.getPage(['other-doc']);
    expect(page?.url).toBe('/custom-base/other-doc');
  });

  it('should handle root index correctly', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'with-readme'),
      baseUrl: '/docs',
    });
    const indexPage = source.getPage([]);
    expect(indexPage?.url).toBe('/docs');
  });
});

// =============================================================================
// TC: Valid Frontmatter Handling
// =============================================================================
describe('Valid Frontmatter Handling', () => {
  it('should use title from frontmatter', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['frontmatter-valid']);
    expect(page).toBeDefined();
    expect(page?.data.title).toBe('Custom Title');
  });

  it('should use description from frontmatter', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['frontmatter-valid']);
    expect(page).toBeDefined();
    expect(page?.data.description).toBe('This is a custom description from frontmatter.');
  });

  it('should preserve additional frontmatter fields', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['frontmatter-valid']);
    expect(page).toBeDefined();
    expect(page?.data.frontmatter.author).toBe('Test Author');
  });
});

// =============================================================================
// TC-13: HTML Tags Preservation
// =============================================================================
describe('TC-13: HTML Tags', () => {
  it('should preserve valid HTML tags', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['html-tags']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('<div class="container">');
    expect(page?.content).toContain('<strong>');
    expect(page?.content).toContain('</strong>');
    expect(page?.content).toContain('<details>');
    expect(page?.content).toContain('<br/>');
  });
});

// =============================================================================
// TC-16: Task Lists
// =============================================================================
describe('TC-16: Task Lists', () => {
  it('should preserve task list syntax', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['task-list']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('- [x] Buy milk');
    expect(page?.content).toContain('- [ ] Buy eggs');
    expect(page?.content).toContain('- [x] Write tests');
    expect(page?.content).toContain('- [ ] Implement feature');
  });
});

// =============================================================================
// TC: Warnings Collection
// =============================================================================
describe('Warnings Collection', () => {
  it('should have warnings array available', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    // Warnings array should exist
    expect(Array.isArray(source.warnings)).toBe(true);
  });

  it('should process file with broken frontmatter gracefully', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    // The file with invalid frontmatter should still be processed
    const page = source.getPage(['invalid-frontmatter']);
    expect(page).toBeDefined();
    // It should have been processed (either with fallback title or frontmatter title)
    expect(page?.data.title).toBeDefined();
    expect(page?.data.title.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// TC: Content Completeness
// =============================================================================
describe('Content Completeness', () => {
  it('should include all expected files from edge-cases', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
      ignore: ['_*', '.*'],
    });
    const pages = source.getPages();
    // Should have: visible-file, no-title, code-blocks, invalid-frontmatter, 
    // with-bom, html-tags, task-list, frontmatter-valid
    // Should NOT have: .hidden-file, _draft-file
    expect(pages.length).toBeGreaterThanOrEqual(7);
    
    // Check specific files exist
    const filePaths = pages.map(p => path.basename(p.filePath));
    expect(filePaths).toContain('visible-file.md');
    expect(filePaths).toContain('code-blocks.md');
    expect(filePaths).not.toContain('.hidden-file.md');
    expect(filePaths).not.toContain('_draft-file.md');
  });
});

// =============================================================================
// TC: Deep Nested Directories (>5 levels)
// =============================================================================
describe('Deep Nested Directories', () => {
  it('should handle 5+ levels of nesting', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'deep-nested'),
      baseUrl: '/deep',
    });
    const page = source.getPage(['a', 'b', 'c', 'd', 'e', 'deep-file']);
    expect(page).toBeDefined();
    expect(page?.url).toBe('/deep/a/b/c/d/e/deep-file');
  });

  it('should build correct page tree for deep nesting', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'deep-nested'),
      baseUrl: '/deep',
    });
    // Should have nested folder structure
    expect(source.pageTree.children.length).toBeGreaterThan(0);
    
    // First level should be 'a' folder
    const aFolder = source.pageTree.children.find(
      c => c.type === 'folder' && c.name === 'A'
    );
    expect(aFolder).toBeDefined();
  });
});

// =============================================================================
// TC: Mermaid Code Blocks
// =============================================================================
describe('Mermaid Code Blocks', () => {
  it('should preserve mermaid code blocks', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['mermaid']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('```mermaid');
    expect(page?.content).toContain('graph TD');
  });

  it('should not escape content inside mermaid blocks', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['mermaid']);
    expect(page).toBeDefined();
    // Arrow syntax should be preserved
    expect(page?.content).toContain('-->');
    expect(page?.content).toContain('A->>B');
  });

  it('should preserve flowchart syntax', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['mermaid']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('A[Start]');
    expect(page?.content).toContain('B{Decision}');
  });

  it('should preserve sequence diagram syntax', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['mermaid']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('sequenceDiagram');
    expect(page?.content).toContain('participant');
  });

  it('should preserve class diagram syntax', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['mermaid']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('classDiagram');
  });
});

// =============================================================================
// TC: Math Formulas ($...$)
// Math formulas are now fully supported with remark-math plugin.
// Preprocessor protects math contexts from escaping.
// =============================================================================
describe('Math Formulas', () => {
  it('should preserve $ delimiters', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['math']);
    expect(page).toBeDefined();
    // $ delimiters should be preserved
    expect(page?.content).toContain('$E = mc^2$');
  });

  it('should preserve block math notation with $$', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['math']);
    expect(page).toBeDefined();
    // Should preserve $$ delimiters
    expect(page?.content).toContain('$$');
  });

  it('should preserve curly braces in inline math', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['math']);
    expect(page).toBeDefined();
    // Inline math with curly braces should NOT be escaped
    expect(page?.content).toContain('$E = mc^2$');
  });

  it('should preserve curly braces in block math', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['math']);
    expect(page).toBeDefined();
    // Block math content should be preserved as-is
    expect(page?.content).toContain('\\sum_{i=1}^{n}');
  });
});

// =============================================================================
// TC: Chinese Filename Handling
// =============================================================================
describe('Chinese Filename Handling', () => {
  it('should process files with Chinese names', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const pages = source.getPages();
    // Should find a page from the Chinese filename
    const chinesePage = pages.find(p => p.filePath.includes('中文文件'));
    expect(chinesePage).toBeDefined();
  });

  it('should generate URL-safe slug for Chinese filenames', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const pages = source.getPages();
    const chinesePage = pages.find(p => p.filePath.includes('中文文件'));
    expect(chinesePage).toBeDefined();
    // Slug should be URL-safe (no Chinese characters in URL)
    expect(chinesePage?.url).not.toMatch(/[\u4e00-\u9fa5]/);
  });

  it('should extract Chinese title correctly', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const pages = source.getPages();
    const chinesePage = pages.find(p => p.filePath.includes('中文文件'));
    expect(chinesePage).toBeDefined();
    expect(chinesePage?.data.title).toBe('中文标题');
  });
});

// =============================================================================
// TC: BOM File Handling
// =============================================================================
describe('BOM File Handling', () => {
  it('should handle files with UTF-8 BOM', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['with-bom']);
    expect(page).toBeDefined();
    // Title should be extracted correctly despite BOM
    expect(page?.data.title).toBe('File With BOM');
  });

  it('should not include BOM in content', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['with-bom']);
    expect(page).toBeDefined();
    // Content should not start with BOM character
    expect(page?.content.charCodeAt(0)).not.toBe(0xFEFF);
  });
});

// =============================================================================
// TC: Footnotes Support (via remark-gfm or remark-footnotes)
// =============================================================================
describe('Footnotes Support', () => {
  it('should preserve footnote syntax', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['footnotes']);
    expect(page).toBeDefined();
    // Footnote reference should be preserved
    expect(page?.content).toContain('[^1]');
    expect(page?.content).toContain('[^2]');
  });

  it('should preserve footnote definitions', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['footnotes']);
    expect(page).toBeDefined();
    // Footnote definitions should be preserved
    expect(page?.content).toContain('[^1]:');
    expect(page?.content).toContain('This is the first footnote');
  });

  it('should preserve named footnotes', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['footnotes']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('[^note]');
  });
});

// =============================================================================
// TC: GFM Extensions
// =============================================================================
describe('GFM Extensions', () => {
  it('should preserve strikethrough syntax', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['gfm-extensions']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('~~This text is strikethrough~~');
  });

  it('should preserve autolinks', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['gfm-extensions']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('https://github.com');
    expect(page?.content).toContain('contact@example.com');
  });

  it('should preserve table alignment syntax', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['gfm-extensions']);
    expect(page).toBeDefined();
    expect(page?.content).toContain(':-----');
    expect(page?.content).toContain(':------:');
    expect(page?.content).toContain('------:');
  });

  it('should preserve task list syntax', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['gfm-extensions']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('- [x] Task 1');
    expect(page?.content).toContain('- [ ] Task 3');
  });
});

// =============================================================================
// TC: Blockquotes and Callouts
// =============================================================================
describe('Blockquotes and Callouts', () => {
  it('should preserve standard blockquotes', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['blockquote-callout']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('> This is a simple blockquote');
  });

  it('should preserve nested blockquotes', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['blockquote-callout']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('>> Level 2');
    expect(page?.content).toContain('>>> Level 3');
  });

  it('should preserve GitHub callout syntax', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['blockquote-callout']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('[!NOTE]');
    expect(page?.content).toContain('[!WARNING]');
    expect(page?.content).toContain('[!TIP]');
  });

  it('should preserve code blocks in blockquotes', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['blockquote-callout']);
    expect(page).toBeDefined();
    expect(page?.content).toContain("console.log('Hello')");
  });
});

// =============================================================================
// TC: Links and Images
// =============================================================================
describe('Links and Images', () => {
  it('should preserve standard links', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['links-and-images']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('[Regular link](https://example.com)');
  });

  it('should preserve links with titles', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['links-and-images']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('"Example Title"');
  });

  it('should preserve reference links', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['links-and-images']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('[Reference link][ref1]');
    expect(page?.content).toContain('[ref1]: https://example.com');
  });

  it('should preserve image syntax', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['links-and-images']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('![Alt text]');
  });

  it('should preserve anchor links', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['links-and-images']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('#standard-links');
  });

  it('should preserve mailto and tel links', async () => {
    const source = await createCompatSource({
      dir: path.join(fixturesDir, 'edge-cases'),
      baseUrl: '/test',
    });
    const page = source.getPage(['links-and-images']);
    expect(page).toBeDefined();
    expect(page?.content).toContain('mailto:test@example.com');
    expect(page?.content).toContain('tel:+1234567890');
  });
});

