/**
 * Slug Utilities
 * 
 * Functions for generating URL slugs and display names from file paths.
 */

/**
 * Default list of index file names.
 * These files are treated as directory indexes (their slug is the parent directory).
 */
export const DEFAULT_INDEX_FILES = ['readme.md', 'readme.mdx', 'index.md', 'index.mdx'];

/**
 * Check if a filename is an index file (README or index).
 * 
 * @param fileName - The filename to check (case insensitive)
 * @returns true if the file is an index file
 */
export function isIndexFile(fileName: string): boolean {
  const name = fileName.toLowerCase();
  return DEFAULT_INDEX_FILES.includes(name);
}

/**
 * Create a custom index file checker with specific index files.
 * 
 * @param indexFiles - Custom list of index file names
 * @returns A function that checks if a filename is an index file
 */
export function createIndexFileChecker(indexFiles: string[]): (fileName: string) => boolean {
  const normalizedIndexFiles = indexFiles.map(f => f.toLowerCase());
  return (fileName: string): boolean => {
    return normalizedIndexFiles.includes(fileName.toLowerCase());
  };
}

/**
 * Convert a file path to URL slugs.
 * 
 * - Removes file extension (.md, .mdx)
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Removes special characters (keeps a-z, 0-9, -, _)
 * - For index files (README, index), removes the file part
 * 
 * @param filePath - The file path to convert
 * @returns Array of slug parts
 */
export function filePathToSlugs(filePath: string): string[] {
  // Handle empty path
  if (!filePath) return [];

  // Remove extension
  const withoutExt = filePath.replace(/\.(md|mdx)$/i, '');

  // Split by path separators (both / and \)
  const parts = withoutExt.split(/[/\\]/).filter(Boolean);

  // Get the original filename for index file check
  const fileName = filePath.split(/[/\\]/).pop() || '';

  // If it's an index file, remove the last part (directory index)
  if (isIndexFile(fileName) && parts.length > 0) {
    parts.pop();
  }

  // Convert each part to a valid slug
  return parts.map((part) =>
    part
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '')
  );
}

/**
 * Static version of filePathToSlugs (for use in link transformation).
 * Identical behavior but named differently for clarity.
 * 
 * @param filePath - The file path to convert
 * @returns Array of slug parts
 */
export function filePathToSlugsStatic(filePath: string): string[] {
  return filePathToSlugs(filePath);
}

/**
 * Convert a slug to a display name.
 * 
 * Capitalizes each word separated by hyphens.
 * 
 * @param slug - The slug to convert
 * @returns Human-readable display name
 */
export function slugToDisplayName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}


