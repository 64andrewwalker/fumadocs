/**
 * Content Plugins
 * 
 * Plugins for transforming markdown content for MDX compatibility.
 */

import path from 'path';
import type { ContentPlugin, PluginContext } from '../../types';
import { preprocessMarkdown, escapeJsxInNonCodeText } from '../../preprocessor';

// ==================== Plugin Definitions ====================

/**
 * JSX Escape Plugin
 * 
 * Escapes JSX-sensitive characters in markdown content.
 * - Converts HTML comments to MDX comments
 * - Escapes < not followed by letter (e.g., <3, <=)
 * - Escapes standalone curly braces
 */
export const jsxEscapePlugin: ContentPlugin = {
  name: 'jsx-escape',
  priority: 20,
  transform(content: string, _context: PluginContext): string {
    // This plugin processes line by line, handling code blocks specially
    const lines = content.split('\n');
    const result: string[] = [];
    let inCodeBlock = false;
    let inBlockMath = false;

    for (const line of lines) {
      // Detect code block boundaries
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        result.push(line);
        continue;
      }

      // Don't process inside code blocks
      if (inCodeBlock) {
        result.push(line);
        continue;
      }

      // Detect block math boundaries
      if (line.trim() === '$$') {
        inBlockMath = !inBlockMath;
        result.push(line);
        continue;
      }

      // Don't process inside block math
      if (inBlockMath) {
        result.push(line);
        continue;
      }

      // Apply JSX escaping to non-code text
      result.push(escapeJsxInNonCodeText(line));
    }

    return result.join('\n');
  },
};

/**
 * Link Transform Plugin
 * 
 * Transforms relative .md/.mdx links to proper URL paths.
 * Respects the `transformLinks` option.
 */
export const linkTransformPlugin: ContentPlugin = {
  name: 'link-transform',
  priority: 40,
  transform(content: string, context: PluginContext): string {
    // Skip if link transformation is disabled
    if (context.options.transformLinks === false) {
      return content;
    }

    const { baseUrl, filePath } = context;

    // Match markdown links [text](path)
    return content.replace(
      /\[([^\]]*)\]\(([^)]+)\)/g,
      (match, text, href) => {
        // Skip external links, anchors, absolute paths
        if (
          href.startsWith('http://') ||
          href.startsWith('https://') ||
          href.startsWith('#') ||
          href.startsWith('/')
        ) {
          return match;
        }

        // Process relative .md/.mdx links
        if (href.endsWith('.md') || href.endsWith('.mdx')) {
          const currentDir = path.dirname(filePath);
          const targetPath = path.join(currentDir, href);
          const slugs = pathToSlugs(targetPath);
          const newUrl = slugs.length > 0 ? `${baseUrl}/${slugs.join('/')}` : baseUrl;
          return `[${text}](${newUrl})`;
        }

        return match;
      }
    );
  },
};

/**
 * Image Transform Plugin
 * 
 * Transforms relative image paths to use the configured image base path.
 */
export const imageTransformPlugin: ContentPlugin = {
  name: 'image-transform',
  priority: 45,
  transform(content: string, context: PluginContext): string {
    const { options, filePath } = context;
    const imageBasePath = options.imageBasePath;

    // Skip if no image base path configured
    if (!imageBasePath) {
      return content;
    }

    // Match markdown images ![alt](path)
    return content.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      (match, alt, src) => {
        // Skip external and absolute paths
        if (
          src.startsWith('http://') ||
          src.startsWith('https://') ||
          src.startsWith('/')
        ) {
          return match;
        }

        // Transform relative paths
        const currentDir = path.dirname(filePath);
        const resolvedPath = path.join(currentDir, src);
        const newSrc = `${imageBasePath}/${resolvedPath}`.replace(/\/\//g, '/');
        return `![${alt}](${newSrc})`;
      }
    );
  },
};

/**
 * Markdown Preprocess Plugin
 * 
 * Main preprocessing plugin that handles:
 * - Code block protection
 * - Table content escaping
 * - Block math protection
 */
export const markdownPreprocessPlugin: ContentPlugin = {
  name: 'markdown-preprocess',
  priority: 10,
  transform(content: string, _context: PluginContext): string {
    return preprocessMarkdown(content);
  },
};

// ==================== Pipeline Runner ====================

/**
 * Run the content plugin pipeline
 * 
 * Executes plugins in priority order (lower numbers first).
 * 
 * @param plugins - Array of content plugins
 * @param content - Initial content
 * @param context - Plugin context
 * @returns Transformed content
 */
export async function runContentPipeline(
  plugins: ContentPlugin[],
  content: string,
  context: PluginContext
): Promise<string> {
  if (plugins.length === 0) {
    return content;
  }

  // Sort by priority (lower first)
  const sorted = [...plugins].sort((a, b) => a.priority - b.priority);

  let result = content;
  for (const plugin of sorted) {
    result = await plugin.transform(result, context);
  }

  return result;
}

// ==================== Default Plugins ====================

/**
 * Default content plugins
 * 
 * Applied in this order:
 * 1. markdown-preprocess (priority 10) - Table escaping, code protection
 * 2. jsx-escape (priority 20) - HTML comments, JSX chars
 * 3. link-transform (priority 40) - Relative links
 * 4. image-transform (priority 45) - Image paths
 */
export const defaultContentPlugins: ContentPlugin[] = [
  markdownPreprocessPlugin,
  jsxEscapePlugin,
  linkTransformPlugin,
  imageTransformPlugin,
];

// ==================== Helper Functions ====================

/**
 * Convert file path to URL slugs
 * (Copied from slug utils to avoid circular dependencies)
 */
function pathToSlugs(filePath: string): string[] {
  const normalized = filePath.replace(/\\/g, '/');
  const withoutExt = normalized.replace(/\.(md|mdx)$/i, '');
  const parts = withoutExt.split('/').filter(Boolean);

  // Handle index files
  const lastPart = parts[parts.length - 1]?.toLowerCase();
  if (lastPart === 'readme' || lastPart === 'index') {
    parts.pop();
  }

  return parts;
}

