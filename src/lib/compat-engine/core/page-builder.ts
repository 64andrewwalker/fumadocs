/**
 * Page Tree Builder
 * 
 * Builds the page tree structure for navigation from a list of pages.
 */

import path from 'path';
import type { Root, Folder, Item } from 'fumadocs-core/page-tree';
import type { RawPage } from '../types';
import { isIndexFile, slugToDisplayName } from '../utils/slug';

// ==================== Tree Building ====================

/**
 * Build a page tree from a list of pages
 * 
 * Creates a hierarchical structure with folders and pages.
 * 
 * @param pages - List of all pages
 * @param baseUrl - Base URL for the pages
 * @returns Page tree root
 */
export function buildPageTree(pages: RawPage[], baseUrl: string): Root {
  const root: Root = {
    name: 'Documents',
    children: [],
  };

  if (pages.length === 0) {
    return root;
  }

  const folders: Map<string, Folder> = new Map();
  const folderIndexPages: Map<string, RawPage> = new Map();

  // Sort pages by URL
  const sortedPages = [...pages].sort((a, b) => a.url.localeCompare(b.url));

  // First pass: identify folder index pages
  for (const page of sortedPages) {
    const fileName = path.basename(page.filePath).toLowerCase();
    if (isIndexFile(fileName) && page.slugs.length > 0) {
      const folderKey = page.slugs.join('/');
      folderIndexPages.set(folderKey, page);
    }
  }

  // Second pass: build tree
  for (const page of sortedPages) {
    const fileName = path.basename(page.filePath).toLowerCase();
    const isIndex = isIndexFile(fileName);

    // Root index page
    if (page.slugs.length === 0) {
      const node: Item = {
        type: 'page',
        name: page.data.title,
        url: page.url,
      };
      root.children.unshift(node);
      continue;
    }

    // Folder index page - create folder entry
    if (isIndex && page.slugs.length > 0) {
      ensureFolderPath(page.slugs, root, folders, folderIndexPages);
      continue;
    }

    // Regular page
    const node: Item = {
      type: 'page',
      name: page.data.title,
      url: page.url,
    };

    if (page.slugs.length === 1) {
      // Top-level page
      root.children.push(node);
    } else {
      // Nested page - ensure folder exists
      const folderSlugs = page.slugs.slice(0, -1);
      const folder = ensureFolderPath(folderSlugs, root, folders, folderIndexPages);
      folder.children.push(node);
    }
  }

  // Post-process: flatten empty folders
  flattenEmptyFolders(root);

  return root;
}

/**
 * Ensure a folder path exists, creating folders as needed
 * 
 * @param slugs - Folder path as slugs
 * @param root - Tree root
 * @param folders - Folder cache
 * @param folderIndexPages - Index pages by folder key
 * @returns The deepest folder in the path
 */
function ensureFolderPath(
  slugs: string[],
  root: Root,
  folders: Map<string, Folder>,
  folderIndexPages: Map<string, RawPage>
): Folder {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currentParent: { children: any[] } = root;

  for (let i = 0; i < slugs.length; i++) {
    const folderKey = slugs.slice(0, i + 1).join('/');

    let folder = folders.get(folderKey);
    if (!folder) {
      const folderName = slugs[i];
      const indexPage = folderIndexPages.get(folderKey);

      folder = {
        type: 'folder',
        name: indexPage?.data.title || slugToDisplayName(folderName),
        children: [],
        ...(indexPage && {
          index: {
            type: 'page' as const,
            name: indexPage.data.title,
            url: indexPage.url,
          },
        }),
      };

      folders.set(folderKey, folder);
      currentParent.children.push(folder);
    }

    currentParent = folder;
  }

  return folders.get(slugs.join('/'))!;
}

// ==================== Tree Transformations ====================

/**
 * Flatten empty folders
 * 
 * Converts folders with only an index page (no children) into page nodes.
 * This prevents empty collapsible sections in the sidebar.
 * 
 * @param node - Tree node with children array
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function flattenEmptyFolders(node: { children: any[] }): void {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];

    if (child.type === 'folder') {
      // Recursively process children first
      flattenEmptyFolders(child);

      // If folder has no children but has index, convert to page
      if (child.children.length === 0 && child.index) {
        node.children[i] = {
          type: 'page',
          name: child.name,
          url: child.index.url,
        };
      }
    }
  }
}


