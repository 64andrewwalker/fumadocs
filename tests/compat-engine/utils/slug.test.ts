/**
 * Slug Utility Tests
 * 
 * TDD tests for the slug generation functions that will be extracted to utils/slug.ts
 * These tests define the expected behavior before refactoring.
 */

import { describe, it, expect } from 'vitest';

// =============================================================================
// Note: These tests are written BEFORE the refactoring.
// The actual functions are currently in src/lib/compat-engine/index.ts
// We'll import them after extraction.
// =============================================================================

// Temporary inline implementations to test against
// These will be removed after extraction

const DEFAULT_INDEX_FILES = ['readme.md', 'readme.mdx', 'index.md', 'index.mdx'];

function isIndexFile(fileName: string): boolean {
  const name = fileName.toLowerCase();
  return DEFAULT_INDEX_FILES.includes(name);
}

function filePathToSlugs(filePath: string): string[] {
  const withoutExt = filePath.replace(/\.(md|mdx)$/i, '');
  const parts = withoutExt.split(/[/\\]/).filter(Boolean);
  const fileName = filePath.split(/[/\\]/).pop() || '';

  // If it's an index file, remove the last part
  if (isIndexFile(fileName)) {
    parts.pop();
  }

  return parts.map((part) =>
    part
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '')
  );
}

function slugToDisplayName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// =============================================================================
// TC-SLUG-01: Index File Detection
// =============================================================================
describe('isIndexFile', () => {
  describe('README files', () => {
    it('should detect README.md', () => {
      expect(isIndexFile('README.md')).toBe(true);
      expect(isIndexFile('readme.md')).toBe(true);
      expect(isIndexFile('Readme.md')).toBe(true);
    });

    it('should detect README.mdx', () => {
      expect(isIndexFile('README.mdx')).toBe(true);
      expect(isIndexFile('readme.mdx')).toBe(true);
    });
  });

  describe('index files', () => {
    it('should detect index.md', () => {
      expect(isIndexFile('index.md')).toBe(true);
      expect(isIndexFile('Index.md')).toBe(true);
    });

    it('should detect index.mdx', () => {
      expect(isIndexFile('index.mdx')).toBe(true);
    });
  });

  describe('non-index files', () => {
    it('should not detect regular files', () => {
      expect(isIndexFile('guide.md')).toBe(false);
      expect(isIndexFile('tutorial.mdx')).toBe(false);
    });

    it('should not detect files with similar names', () => {
      expect(isIndexFile('README-old.md')).toBe(false);
      expect(isIndexFile('index-backup.md')).toBe(false);
      expect(isIndexFile('my-readme.md')).toBe(false);
    });
  });
});

// =============================================================================
// TC-SLUG-02: File Path to Slugs Conversion
// =============================================================================
describe('filePathToSlugs', () => {
  describe('simple files', () => {
    it('should convert simple file path to slug', () => {
      expect(filePathToSlugs('guide.md')).toEqual(['guide']);
      expect(filePathToSlugs('tutorial.mdx')).toEqual(['tutorial']);
    });

    it('should handle file with spaces', () => {
      expect(filePathToSlugs('getting started.md')).toEqual(['getting-started']);
    });

    it('should handle uppercase', () => {
      expect(filePathToSlugs('GUIDE.md')).toEqual(['guide']);
      expect(filePathToSlugs('MyGuide.md')).toEqual(['myguide']);
    });
  });

  describe('nested paths', () => {
    it('should preserve directory structure', () => {
      expect(filePathToSlugs('docs/guide.md')).toEqual(['docs', 'guide']);
      expect(filePathToSlugs('api/v1/endpoints.md')).toEqual(['api', 'v1', 'endpoints']);
    });

    it('should handle deeply nested paths', () => {
      expect(filePathToSlugs('a/b/c/d/e/deep.md')).toEqual(['a', 'b', 'c', 'd', 'e', 'deep']);
    });
  });

  describe('index files (special handling)', () => {
    it('should remove file part for README.md', () => {
      expect(filePathToSlugs('docs/README.md')).toEqual(['docs']);
      expect(filePathToSlugs('README.md')).toEqual([]);
    });

    it('should remove file part for index.md', () => {
      expect(filePathToSlugs('guides/index.md')).toEqual(['guides']);
      expect(filePathToSlugs('index.md')).toEqual([]);
    });
  });

  describe('special characters', () => {
    it('should remove special characters', () => {
      expect(filePathToSlugs('guide@v2.md')).toEqual(['guidev2']);
      expect(filePathToSlugs('file#1.md')).toEqual(['file1']);
    });

    it('should handle dots in directory names', () => {
      expect(filePathToSlugs('.promptpack/actions/test.md')).toEqual(['promptpack', 'actions', 'test']);
    });

    it('should preserve hyphens and underscores', () => {
      expect(filePathToSlugs('getting-started.md')).toEqual(['getting-started']);
      expect(filePathToSlugs('my_guide.md')).toEqual(['my_guide']);
    });
  });

  describe('Windows paths', () => {
    it('should handle backslashes', () => {
      expect(filePathToSlugs('docs\\guide.md')).toEqual(['docs', 'guide']);
      expect(filePathToSlugs('api\\v1\\endpoints.md')).toEqual(['api', 'v1', 'endpoints']);
    });
  });
});

// =============================================================================
// TC-SLUG-03: Slug to Display Name Conversion
// =============================================================================
describe('slugToDisplayName', () => {
  it('should capitalize words', () => {
    expect(slugToDisplayName('guide')).toBe('Guide');
    expect(slugToDisplayName('getting-started')).toBe('Getting Started');
  });

  it('should handle multiple hyphens', () => {
    expect(slugToDisplayName('api-reference-v2')).toBe('Api Reference V2');
  });

  it('should handle single character words', () => {
    expect(slugToDisplayName('a-b-c')).toBe('A B C');
  });

  it('should handle underscores in words', () => {
    expect(slugToDisplayName('my_guide')).toBe('My_guide');
  });

  it('should handle numbers', () => {
    expect(slugToDisplayName('version-2')).toBe('Version 2');
  });
});

// =============================================================================
// TC-SLUG-04: Edge Cases
// =============================================================================
describe('filePathToSlugs: Edge Cases', () => {
  it('should handle empty string', () => {
    expect(filePathToSlugs('')).toEqual([]);
  });

  it('should handle only extension', () => {
    expect(filePathToSlugs('.md')).toEqual([]);
  });

  it('should handle multiple dots', () => {
    expect(filePathToSlugs('file.test.md')).toEqual(['filetest']);
  });

  it('should handle unicode characters', () => {
    expect(filePathToSlugs('中文.md')).toEqual(['']);
    expect(filePathToSlugs('日本語/ファイル.md')).toEqual(['', '']);
  });

  it('should handle mixed unicode and ascii', () => {
    expect(filePathToSlugs('docs/中文file.md')).toEqual(['docs', 'file']);
  });
});

// =============================================================================
// TC-SLUG-05: URL Generation Integration
// =============================================================================
describe('URL Generation', () => {
  const baseUrl = '/docs';
  
  function generateUrl(filePath: string): string {
    const slugs = filePathToSlugs(filePath);
    return slugs.length > 0 ? `${baseUrl}/${slugs.join('/')}` : baseUrl;
  }

  it('should generate correct URLs for simple files', () => {
    expect(generateUrl('guide.md')).toBe('/docs/guide');
    expect(generateUrl('api/endpoints.md')).toBe('/docs/api/endpoints');
  });

  it('should generate correct URLs for index files', () => {
    expect(generateUrl('README.md')).toBe('/docs');
    expect(generateUrl('guides/index.md')).toBe('/docs/guides');
  });

  it('should generate correct URLs for nested files', () => {
    expect(generateUrl('api/v1/auth/login.md')).toBe('/docs/api/v1/auth/login');
  });
});

