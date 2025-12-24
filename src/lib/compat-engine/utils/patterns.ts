/**
 * Pattern Matching Utilities
 * 
 * Functions for file path pattern matching used in the compat engine.
 */

/**
 * Check if a file path matches a glob-like pattern.
 * 
 * Supported patterns:
 * - `_*`, `.*` - Prefix wildcards (matches any part starting with prefix)
 * - `tests/*` - Single directory wildcard
 * - `scripts/**` - Recursive directory wildcard
 * - `README.md` - Exact filename match (matches in any directory)
 * 
 * @param filePath - The file path to check (can use / or \ separators)
 * @param pattern - The pattern to match against
 * @returns true if the path matches the pattern
 */
export function matchesPattern(filePath: string, pattern: string): boolean {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');
  const parts = normalizedPath.split('/');
  
  // Pattern: starts with specific prefix (e.g., '_*', '.*')
  if (pattern.endsWith('*') && !pattern.includes('/')) {
    const prefix = pattern.slice(0, -1);
    // Check if any part of the path starts with the prefix
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
  
  // Exact match - either full path or any part of the path
  return normalizedPath === pattern || parts.includes(pattern);
}

/**
 * Determine if a file should be included based on ignore and include patterns.
 * 
 * Logic: include patterns take priority over ignore patterns.
 * If a file matches an include pattern, it's included regardless of ignore patterns.
 * 
 * @param relativePath - The relative file path to check
 * @param ignorePatterns - Patterns for files to ignore
 * @param includePatterns - Patterns for files to explicitly include (overrides ignore)
 * @returns true if the file should be included
 */
export function shouldIncludeFile(
  relativePath: string,
  ignorePatterns: string[],
  includePatterns: string[]
): boolean {
  // First check if explicitly included
  for (const pattern of includePatterns) {
    if (matchesPattern(relativePath, pattern)) {
      return true; // Explicitly included, override ignore
    }
  }
  
  // Then check if ignored
  for (const pattern of ignorePatterns) {
    if (matchesPattern(relativePath, pattern)) {
      return false; // Ignored
    }
  }
  
  return true; // Default: include
}

