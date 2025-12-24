/**
 * Compat Source Factory
 * 
 * Creates a compat source using the plugin pipeline architecture.
 * This is the main entry point for the compatibility engine.
 */

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import type { CompatSourceOptions, CompatSource, RawPage, PageMetadata, PluginContext } from './types';

// Plugins
import { runContentPipeline, defaultContentPlugins } from './plugins/content';
import { runMetadataPipeline, defaultMetadataPlugins } from './plugins/metadata';
import { buildPageTree } from './core/page-builder';
import { shouldIncludeFile } from './utils/patterns';
import { filePathToSlugs, isIndexFile } from './utils/slug';

// ==================== Constants ====================

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_EXTENSIONS = ['.md', '.mdx'];
const DEFAULT_INDEX_FILES = ['README.md', 'readme.md', 'index.md', 'index.mdx'];
const DEFAULT_IGNORE = ['_*', '.*'];

// ==================== Main Factory ====================

/**
 * Create a compat source from a directory
 * 
 * Scans the directory for markdown files and creates a source
 * that can be used with fumadocs.
 * 
 * @param options - Source configuration
 * @returns CompatSource object
 */
export async function createCompatSource(options: CompatSourceOptions): Promise<CompatSource> {
  const {
    dir,
    baseUrl,
    extensions = DEFAULT_EXTENSIONS,
    indexFiles = DEFAULT_INDEX_FILES,
    ignore = DEFAULT_IGNORE,
    include = [],
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    transformLinks = true,
    imageBasePath = '',
    preprocessor,
    titleExtractor,
    descriptionExtractor,
  } = options;

  // Resolve absolute path
  const absoluteDir = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);

  // Scan and sort files
  const unsortedFiles = await scanDirectory(absoluteDir, extensions, ignore, include);
  const files = sortFiles(unsortedFiles);

  // Process files
  const pages: Map<string, RawPage> = new Map();
  const warnings: string[] = [];

  for (const file of files) {
    const filePath = path.join(absoluteDir, file);

    // Check file size
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > maxFileSize) {
        warnings.push(`File ${file} exceeds max size (${stats.size} > ${maxFileSize}), skipping`);
        continue;
      }
    } catch {
      continue;
    }

    // Read content
    const content = await fs.readFile(filePath, 'utf-8');

    // Parse frontmatter
    let frontmatter: Record<string, unknown> = {};
    let rawContent = content;

    try {
      const parsed = matter(content);
      frontmatter = parsed.data;
      rawContent = parsed.content;
    } catch (error) {
      warnings.push(`Invalid frontmatter in ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      const match = content.match(/^---[\s\S]*?---\n?([\s\S]*)$/);
      if (match) {
        rawContent = match[1] || content;
      }
    }

    // Create context
    const context: PluginContext = {
      filePath: file,
      baseUrl,
      sourceDir: absoluteDir,
      options: {
        ...options,
        imageBasePath,
        transformLinks,
      },
    };

    // Generate slugs
    const slugs = filePathToSlugs(file, indexFiles);
    const slugKey = slugs.join('/') || 'index';

    // Check for conflicts
    if (pages.has(slugKey)) {
      const existingPage = pages.get(slugKey);
      warnings.push(
        `Slug conflict: "${file}" conflicts with "${existingPage?.filePath}". Using first file.`
      );
      continue;
    }

    // Extract metadata using plugins
    const initialMetadata: PageMetadata = {
      title: '',
      description: '',
      frontmatter,
    };

    // Legacy extractors or plugins
    let metadata: PageMetadata;
    if (titleExtractor || descriptionExtractor) {
      // Legacy mode: use custom extractors
      metadata = {
        ...initialMetadata,
        title: (frontmatter.title as string) || titleExtractor?.(rawContent, filePath) || '',
        description: (frontmatter.description as string) || descriptionExtractor?.(rawContent, filePath) || '',
      };
    } else {
      // Plugin mode
      metadata = await runMetadataPipeline(defaultMetadataPlugins, initialMetadata, rawContent, context);
    }

    // Process content using plugins
    let processedContent = rawContent;

    // Legacy preprocessor
    if (preprocessor) {
      processedContent = preprocessor(processedContent, filePath);
    }

    // Run content plugins (only link and image transform need special handling)
    // The markdownPreprocess and jsxEscape plugins are included in default
    processedContent = await runContentPipeline(defaultContentPlugins, processedContent, context);

    // Create page
    pages.set(slugKey, {
      filePath,
      slugs,
      url: slugs.length > 0 ? `${baseUrl}/${slugs.join('/')}` : baseUrl,
      content: processedContent,
      data: metadata,
    });
  }

  // Build page tree
  const pageTree = buildPageTree(Array.from(pages.values()), baseUrl);

  return {
    getPage(slugs: string[] | undefined): RawPage | undefined {
      const key = slugs?.join('/') || 'index';
      return pages.get(key);
    },

    getPages(): RawPage[] {
      return Array.from(pages.values());
    },

    generateParams() {
      return Array.from(pages.values()).map((page) => ({
        slug: page.slugs,
      }));
    },

    pageTree,
    baseUrl,
    warnings,

    async reload(): Promise<CompatSource> {
      return createCompatSource(options);
    },
  };
}

// ==================== Helper Functions ====================

/**
 * Scan directory for matching files
 */
async function scanDirectory(
  dir: string,
  extensions: string[],
  ignorePatterns: string[],
  includePatterns: string[],
  basePath: string = ''
): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        const subFiles = await scanDirectory(fullPath, extensions, ignorePatterns, includePatterns, relativePath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!extensions.includes(ext)) continue;

        if (shouldIncludeFile(relativePath, ignorePatterns, includePatterns)) {
          files.push(relativePath);
        }
      }
    }
  } catch {
    // Directory doesn't exist or can't be accessed
  }

  return files;
}

/**
 * Sort files with README/index first
 */
function sortFiles(files: string[]): string[] {
  return files.sort((a, b) => {
    const aName = path.basename(a).toLowerCase();
    const bName = path.basename(b).toLowerCase();

    if (aName.startsWith('readme')) return -1;
    if (bName.startsWith('readme')) return 1;
    if (aName.startsWith('index')) return -1;
    if (bName.startsWith('index')) return 1;

    return a.localeCompare(b);
  });
}

