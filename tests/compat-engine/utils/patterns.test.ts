/**
 * Pattern Matching Utility Tests
 * 
 * TDD tests for the pattern matching functions that will be extracted to utils/patterns.ts
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

function matchesPattern(filePath: string, pattern: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const parts = normalizedPath.split('/');
  
  // Pattern: starts with specific prefix (e.g., '_*', '.*')
  if (pattern.endsWith('*') && !pattern.includes('/')) {
    const prefix = pattern.slice(0, -1);
    return parts.some(part => part.startsWith(prefix));
  }
  
  // Pattern: directory wildcard (e.g., 'tests/*', 'scripts/*')
  if (pattern.endsWith('/*')) {
    const dir = pattern.slice(0, -2);
    return normalizedPath.startsWith(dir + '/') || parts[0] === dir;
  }
  
  // Pattern: recursive directory wildcard (e.g., '.promptpack/**')
  if (pattern.endsWith('/**')) {
    const dir = pattern.slice(0, -3);
    return normalizedPath.startsWith(dir + '/') || normalizedPath === dir;
  }
  
  // Exact match
  return normalizedPath === pattern || parts.includes(pattern);
}

function shouldIncludeFile(
  relativePath: string,
  ignorePatterns: string[],
  includePatterns: string[]
): boolean {
  // First check if explicitly included
  for (const pattern of includePatterns) {
    if (matchesPattern(relativePath, pattern)) {
      return true;
    }
  }
  
  // Then check if ignored
  for (const pattern of ignorePatterns) {
    if (matchesPattern(relativePath, pattern)) {
      return false;
    }
  }
  
  return true;
}

// =============================================================================
// TC-PATTERN-01: Prefix Wildcard Patterns
// =============================================================================
describe('matchesPattern: Prefix Wildcards', () => {
  describe('underscore prefix (_*)', () => {
    it('should match files starting with underscore', () => {
      expect(matchesPattern('_draft.md', '_*')).toBe(true);
      expect(matchesPattern('_private/doc.md', '_*')).toBe(true);
    });

    it('should not match files not starting with underscore', () => {
      expect(matchesPattern('normal.md', '_*')).toBe(false);
      expect(matchesPattern('docs/file.md', '_*')).toBe(false);
    });

    it('should match nested files with underscore directory', () => {
      expect(matchesPattern('docs/_drafts/file.md', '_*')).toBe(true);
    });
  });

  describe('dot prefix (.*)', () => {
    it('should match files starting with dot', () => {
      expect(matchesPattern('.hidden.md', '.*')).toBe(true);
      expect(matchesPattern('.git/config', '.*')).toBe(true);
    });

    it('should not match files not starting with dot', () => {
      expect(matchesPattern('visible.md', '.*')).toBe(false);
    });

    it('should match nested dot directories', () => {
      expect(matchesPattern('docs/.hidden/file.md', '.*')).toBe(true);
    });
  });
});

// =============================================================================
// TC-PATTERN-02: Directory Wildcard Patterns
// =============================================================================
describe('matchesPattern: Directory Wildcards', () => {
  describe('single level (tests/*)', () => {
    it('should match files in specified directory', () => {
      expect(matchesPattern('tests/unit.test.ts', 'tests/*')).toBe(true);
      expect(matchesPattern('tests/integration.test.ts', 'tests/*')).toBe(true);
    });

    it('should match directory itself', () => {
      expect(matchesPattern('tests', 'tests/*')).toBe(true);
    });

    it('should not match files in other directories', () => {
      expect(matchesPattern('src/file.ts', 'tests/*')).toBe(false);
    });
  });

  describe('recursive (scripts/**)', () => {
    it('should match files at any depth', () => {
      expect(matchesPattern('scripts/build.sh', 'scripts/**')).toBe(true);
      expect(matchesPattern('scripts/utils/helper.sh', 'scripts/**')).toBe(true);
      expect(matchesPattern('scripts/a/b/c/deep.sh', 'scripts/**')).toBe(true);
    });

    it('should match directory itself', () => {
      expect(matchesPattern('scripts', 'scripts/**')).toBe(true);
    });
  });
});

// =============================================================================
// TC-PATTERN-03: Exact Match Patterns
// =============================================================================
describe('matchesPattern: Exact Match', () => {
  it('should match exact file path', () => {
    expect(matchesPattern('README.md', 'README.md')).toBe(true);
  });

  it('should match file in any directory', () => {
    expect(matchesPattern('docs/README.md', 'README.md')).toBe(true);
  });

  it('should not match partial names', () => {
    expect(matchesPattern('README.mdx', 'README.md')).toBe(false);
  });
});

// =============================================================================
// TC-PATTERN-04: Path Normalization
// =============================================================================
describe('matchesPattern: Path Normalization', () => {
  it('should handle Windows-style paths', () => {
    expect(matchesPattern('docs\\file.md', 'docs/*')).toBe(true);
    expect(matchesPattern('tests\\unit\\test.ts', 'tests/**')).toBe(true);
  });

  it('should handle mixed separators', () => {
    expect(matchesPattern('docs/sub\\file.md', 'docs/**')).toBe(true);
  });
});

// =============================================================================
// TC-INCLUDE-01: Include/Ignore Priority
// =============================================================================
describe('shouldIncludeFile: Include Priority', () => {
  it('should include files by default', () => {
    expect(shouldIncludeFile('normal.md', [], [])).toBe(true);
  });

  it('should exclude files matching ignore pattern', () => {
    expect(shouldIncludeFile('_draft.md', ['_*'], [])).toBe(false);
  });

  it('should include files matching include pattern even if ignored', () => {
    // .promptpack is normally ignored by .* pattern
    // but explicitly included by .promptpack/**
    expect(shouldIncludeFile(
      '.promptpack/actions/test.md',
      ['.*'],
      ['.promptpack/**']
    )).toBe(true);
  });

  it('should prefer include over ignore for conflicting patterns', () => {
    expect(shouldIncludeFile(
      '_special/doc.md',
      ['_*'],
      ['_special/**']
    )).toBe(true);
  });
});

// =============================================================================
// TC-INCLUDE-02: Multiple Patterns
// =============================================================================
describe('shouldIncludeFile: Multiple Patterns', () => {
  it('should check all ignore patterns', () => {
    expect(shouldIncludeFile('_draft.md', ['_*', '.*', 'tests/*'], [])).toBe(false);
    expect(shouldIncludeFile('.hidden.md', ['_*', '.*', 'tests/*'], [])).toBe(false);
    expect(shouldIncludeFile('tests/test.ts', ['_*', '.*', 'tests/*'], [])).toBe(false);
    expect(shouldIncludeFile('normal.md', ['_*', '.*', 'tests/*'], [])).toBe(true);
  });

  it('should check all include patterns', () => {
    expect(shouldIncludeFile(
      '.promptpack/test.md',
      ['.*'],
      ['.hidden/**', '.promptpack/**']
    )).toBe(true);
    
    expect(shouldIncludeFile(
      '.hidden/secret.md',
      ['.*'],
      ['.hidden/**', '.promptpack/**']
    )).toBe(true);
  });
});

// =============================================================================
// TC-INCLUDE-03: Edge Cases
// =============================================================================
describe('shouldIncludeFile: Edge Cases', () => {
  it('should handle empty patterns', () => {
    expect(shouldIncludeFile('any-file.md', [], [])).toBe(true);
  });

  it('should handle root level files', () => {
    expect(shouldIncludeFile('README.md', ['_*'], [])).toBe(true);
    expect(shouldIncludeFile('_draft.md', ['_*'], [])).toBe(false);
  });

  it('should handle deeply nested paths', () => {
    expect(shouldIncludeFile(
      'a/b/c/d/e/f/file.md',
      ['_*'],
      []
    )).toBe(true);
    
    expect(shouldIncludeFile(
      'a/b/c/d/_hidden/file.md',
      ['_*'],
      []
    )).toBe(false);
  });

  it('should handle special characters in paths', () => {
    expect(shouldIncludeFile('docs/file-with-dash.md', ['_*'], [])).toBe(true);
    expect(shouldIncludeFile('docs/中文文件.md', ['_*'], [])).toBe(true);
  });
});

