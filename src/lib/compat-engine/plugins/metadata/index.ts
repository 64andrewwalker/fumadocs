/**
 * Metadata Plugins
 * 
 * Plugins for extracting and enhancing page metadata from markdown content.
 */

import path from 'path';
import type { MetadataPlugin, PageMetadata, PluginContext } from '../../types';

// ==================== Plugin Definitions ====================

/**
 * Frontmatter Plugin
 * 
 * Applies metadata from parsed frontmatter.
 * This runs first and sets the baseline metadata.
 */
export const frontmatterPlugin: MetadataPlugin = {
  name: 'frontmatter',
  priority: 5,
  extract(metadata: PageMetadata, _content: string, _context: PluginContext): PageMetadata {
    const { frontmatter } = metadata;
    
    return {
      ...metadata,
      title: (frontmatter.title as string) || metadata.title,
      description: (frontmatter.description as string) || metadata.description,
    };
  },
};

/**
 * Title from H1 Plugin
 * 
 * Extracts title from the first H1 heading in the document.
 * Only applies if no title is already set.
 */
export const titleFromH1Plugin: MetadataPlugin = {
  name: 'title-from-h1',
  priority: 20,
  extract(metadata: PageMetadata, content: string, _context: PluginContext): PageMetadata {
    // Don't override existing title
    if (metadata.title) {
      return metadata;
    }

    // Match first H1 at start of line
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return {
        ...metadata,
        title: h1Match[1].trim(),
      };
    }

    return metadata;
  },
};

/**
 * Title from Filename Plugin
 * 
 * Generates title from the file name as a fallback.
 * Converts kebab-case and snake_case to Title Case.
 */
export const titleFromFilenamePlugin: MetadataPlugin = {
  name: 'title-from-filename',
  priority: 30,
  extract(metadata: PageMetadata, _content: string, context: PluginContext): PageMetadata {
    // Don't override existing title
    if (metadata.title) {
      return metadata;
    }

    const fileName = path.basename(context.filePath, path.extname(context.filePath));
    const title = fileName
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    return {
      ...metadata,
      title,
    };
  },
};

/**
 * Description from Paragraph Plugin
 * 
 * Extracts description from the first non-heading paragraph.
 * Limits to 200 characters.
 */
export const descriptionFromParagraphPlugin: MetadataPlugin = {
  name: 'description-from-paragraph',
  priority: 25,
  extract(metadata: PageMetadata, content: string, _context: PluginContext): PageMetadata {
    // Don't override existing description
    if (metadata.description) {
      return metadata;
    }

    // Remove frontmatter
    const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, '');

    // Parse lines
    const lines = contentWithoutFrontmatter.split('\n');
    const paragraphLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines, headings, and blockquote markers
      if (!trimmed || trimmed.startsWith('#') || trimmed === '>') {
        if (paragraphLines.length > 0) break;
        continue;
      }
      
      // Skip blockquote content but collect text after >
      if (trimmed.startsWith('>')) {
        const quoteContent = trimmed.slice(1).trim();
        if (quoteContent && !quoteContent.startsWith('**')) {
          paragraphLines.push(quoteContent);
        }
        continue;
      }
      
      paragraphLines.push(trimmed);
    }

    const description = paragraphLines.join(' ').slice(0, 200);
    
    return {
      ...metadata,
      description: description || 'No description available',
    };
  },
};

// ==================== Pipeline Runner ====================

/**
 * Run the metadata plugin pipeline
 * 
 * Executes plugins in priority order (lower numbers first).
 * Each plugin can enhance the metadata object.
 * 
 * @param plugins - Array of metadata plugins
 * @param initialMetadata - Initial metadata (with frontmatter)
 * @param content - File content (without frontmatter)
 * @param context - Plugin context
 * @returns Final metadata object
 */
export async function runMetadataPipeline(
  plugins: MetadataPlugin[],
  initialMetadata: PageMetadata,
  content: string,
  context: PluginContext
): Promise<PageMetadata> {
  if (plugins.length === 0) {
    return initialMetadata;
  }

  // Sort by priority (lower first)
  const sorted = [...plugins].sort((a, b) => a.priority - b.priority);

  let metadata = initialMetadata;
  for (const plugin of sorted) {
    metadata = await plugin.extract(metadata, content, context);
  }

  return metadata;
}

// ==================== Default Plugins ====================

/**
 * Default metadata plugins
 * 
 * Applied in this order:
 * 1. frontmatter (priority 5) - Apply frontmatter values
 * 2. title-from-h1 (priority 20) - Extract from H1
 * 3. description-from-paragraph (priority 25) - Extract first paragraph
 * 4. title-from-filename (priority 30) - Fallback to filename
 */
export const defaultMetadataPlugins: MetadataPlugin[] = [
  frontmatterPlugin,
  titleFromH1Plugin,
  descriptionFromParagraphPlugin,
  titleFromFilenamePlugin,
];


