/**
 * Fumadocs Compat Engine
 *
 * 兼容层引擎，用于处理非标准的 markdown 文件
 * 允许渲染没有标准 frontmatter 的原始 markdown 文档
 */

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import type { Root, Folder, Item } from 'fumadocs-core/page-tree';

// 默认最大文件大小：10MB
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * 转换相对链接为正确的 URL 路径
 * 例如: [link](./other.md) → [link](/raw-notes/other)
 */
function transformRelativeLinks(
  content: string,
  baseUrl: string,
  currentFilePath: string
): string {
  // 匹配 markdown 链接 [text](path)
  return content.replace(
    /\[([^\]]*)\]\(([^)]+)\)/g,
    (match, text, href) => {
      // 跳过外部链接、锚点链接、绝对路径
      if (
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('#') ||
        href.startsWith('/')
      ) {
        return match;
      }

      // 处理相对 .md/.mdx 链接
      if (href.endsWith('.md') || href.endsWith('.mdx')) {
        const currentDir = path.dirname(currentFilePath);
        const targetPath = path.join(currentDir, href);
        const slugs = filePathToSlugsStatic(targetPath);
        const newUrl = slugs.length > 0 ? `${baseUrl}/${slugs.join('/')}` : baseUrl;
        return `[${text}](${newUrl})`;
      }

      return match;
    }
  );
}

/**
 * 转换相对图片路径
 * 例如: ![](./images/photo.png) → ![](/images/photo.png)
 */
function transformImagePaths(
  content: string,
  imageBasePath: string,
  currentFilePath: string
): string {
  // 匹配 markdown 图片 ![alt](path)
  return content.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (match, alt, src) => {
      // 跳过外部链接和绝对路径
      if (
        src.startsWith('http://') ||
        src.startsWith('https://') ||
        src.startsWith('/')
      ) {
        return match;
      }

      // 处理相对路径图片
      const currentDir = path.dirname(currentFilePath);
      const resolvedPath = path.join(currentDir, src);
      const newSrc = `${imageBasePath}/${resolvedPath}`;
      return `![${alt}](${newSrc})`;
    }
  );
}

/**
 * 预处理 markdown 内容，使其与 MDX 兼容
 * - 转义 JSX 敏感字符（< > { }）在代码块和表格中
 * - 处理表格中的特殊字符
 */
function preprocessMarkdown(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;
  let inTable = false;
  let inBlockMath = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 检测代码块边界
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
      continue;
    }

    // 在代码块中不做处理（代码块内容由 MDX 特殊处理）
    if (inCodeBlock) {
      result.push(line);
      continue;
    }

    // 检测块级数学公式 $$ 边界
    if (line.trim() === '$$') {
      inBlockMath = !inBlockMath;
      result.push(line);
      continue;
    }

    // 在块级数学公式中不做处理
    if (inBlockMath) {
      result.push(line);
      continue;
    }

    // 检测表格（以 | 开头或包含 |---|）
    const isTableLine = line.trim().startsWith('|') || /\|[\s-]+\|/.test(line);
    if (isTableLine) {
      inTable = true;
      // 在表格中转义 JSX 敏感字符
      line = escapeJsxInText(line);
    } else if (inTable && line.trim() === '') {
      inTable = false;
    }

    // 处理内联代码和普通文本中的特殊字符
    if (!isTableLine) {
      line = escapeJsxInNonCodeText(line);
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * 转义表格中的 JSX 敏感字符
 */
function escapeJsxInText(text: string): string {
  // 保护内联代码，不要转义其中的内容
  const codeSegments: string[] = [];
  let processed = text.replace(/`[^`]+`/g, (match) => {
    codeSegments.push(match);
    return `__CODE_SEGMENT_${codeSegments.length - 1}__`;
  });

  // 在表格中，更激进地转义 < 字符
  // 只保留明确的 HTML 标签（如 <strong>, </em>, <a href>）
  // 转义其他所有 < 字符（如 <16, <something 后面不是有效标签名的）
  processed = processed.replace(/<(?![a-zA-Z][a-zA-Z0-9]*[\s>\/]|\/[a-zA-Z])/g, '&lt;');
  processed = processed.replace(/{/g, '\\{');
  processed = processed.replace(/}/g, '\\}');

  // 恢复内联代码
  codeSegments.forEach((segment, index) => {
    processed = processed.replace(`__CODE_SEGMENT_${index}__`, segment);
  });

  return processed;
}

/**
 * 在非代码文本中转义单独的 < > { } 字符
 * 保护内联代码和数学公式
 */
function escapeJsxInNonCodeText(text: string): string {
  // 保护内联代码
  const protectedSegments: string[] = [];
  let processed = text.replace(/`[^`]+`/g, (match) => {
    protectedSegments.push(match);
    return `__PROTECTED_${protectedSegments.length - 1}__`;
  });

  // 保护内联数学公式 $...$（但不是 $$）
  // 匹配 $...$ 但不匹配 $$...$$
  processed = processed.replace(/(?<!\$)\$(?!\$)([^$]+)\$(?!\$)/g, (match) => {
    protectedSegments.push(match);
    return `__PROTECTED_${protectedSegments.length - 1}__`;
  });

  // 保护块级数学公式 $$...$$（可能跨行，但在单行模式下只处理同一行的）
  processed = processed.replace(/\$\$([^$]*)\$\$/g, (match) => {
    protectedSegments.push(match);
    return `__PROTECTED_${protectedSegments.length - 1}__`;
  });

  // 只转义明显不是 HTML/JSX 标签的 < 和 {
  // 例如: "<3" 或 "< 16Ω" 需要转义
  // 但 "<div>" 不需要转义
  
  // 转换 HTML 注释为 MDX 注释格式
  // <!-- comment --> 转换为 {/* comment */}
  processed = processed.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');
  
  // 转义 < 后面跟着非字母的情况（无效的 JSX 标签名开始）
  // MDX 要求标签名以字母开头，所以 <3 <> <= 等都需要转义
  processed = processed.replace(/<(?![a-zA-Z_/])/g, '&lt;');
  
  // 转义独立的 { 和 }（不是 JSX 表达式）
  // 匹配 { 后面跟着非字母或换行的情况
  processed = processed.replace(/{(?![a-zA-Z_$])/g, '\\{');
  processed = processed.replace(/(?<![a-zA-Z0-9_$])}/g, '\\}');

  // 恢复保护的内容
  protectedSegments.forEach((segment, index) => {
    processed = processed.replace(`__PROTECTED_${index}__`, segment);
  });

  return processed;
}

export interface RawPage {
  /** 文件路径 */
  filePath: string;
  /** URL slugs */
  slugs: string[];
  /** 完整 URL */
  url: string;
  /** 原始文件内容 */
  content: string;
  /** 页面数据 */
  data: {
    title: string;
    description: string;
    /** 原始 frontmatter（如果有） */
    frontmatter: Record<string, unknown>;
  };
}

export interface CompatSourceOptions {
  /** 内容目录路径（相对于项目根目录） */
  dir: string;
  /** URL 基础路径 */
  baseUrl: string;
  /** 支持的文件扩展名，默认 ['.md', '.mdx'] */
  extensions?: string[];
  /** 索引文件名，默认 ['README.md', 'readme.md', 'index.md', 'index.mdx'] */
  indexFiles?: string[];
  /** 忽略的文件模式，默认 ['_*', '.*'] - 匹配以 _ 或 . 开头的文件 */
  ignore?: string[];
  /** 显式包含的文件模式，优先级高于 ignore，例如 ['.promptpack/**'] */
  include?: string[];
  /** 最大文件大小（字节），默认 10MB */
  maxFileSize?: number;
  /** 是否转换相对链接，默认 true */
  transformLinks?: boolean;
  /** 图片基础路径，用于处理相对图片路径 */
  imageBasePath?: string;
  /** 自定义标题提取器 */
  titleExtractor?: (content: string, filePath: string) => string;
  /** 自定义描述提取器 */
  descriptionExtractor?: (content: string, filePath: string) => string;
  /** 自定义预处理器 */
  preprocessor?: (content: string, filePath: string) => string;
}

/**
 * 从 markdown 内容中提取标题
 * 优先级：frontmatter.title > 第一个 # 标题 > 文件名
 */
function extractTitle(content: string, filePath: string): string {
  // 尝试从第一个 # 标题提取
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // 回退到文件名
  const fileName = path.basename(filePath, path.extname(filePath));
  return fileName
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * 从 markdown 内容中提取描述
 * 优先级：frontmatter.description > 第一段非标题文本
 */
function extractDescription(content: string, _filePath: string): string {
  // 移除 frontmatter
  const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, '');

  // 移除标题行
  const lines = contentWithoutFrontmatter.split('\n');
  const paragraphLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // 跳过空行、标题、引用块标记
    if (!trimmed || trimmed.startsWith('#') || trimmed === '>') {
      if (paragraphLines.length > 0) break; // 已经收集了一段内容
      continue;
    }
    // 跳过引用块内容（以 > 开头），但收集其内容
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
  return description || 'No description available';
}

// Import utilities
import { shouldIncludeFile } from './utils/patterns';
import { 
  isIndexFile, 
  filePathToSlugs, 
  filePathToSlugsStatic,
  slugToDisplayName,
  createIndexFileChecker,
  DEFAULT_INDEX_FILES
} from './utils/slug';

/**
 * 扫描目录获取所有 markdown 文件
 */
async function scanDirectory(
  dir: string,
  extensions: string[],
  ignorePatterns: string[],
  includePatterns: string[] = [],
  basePath: string = ''
): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        // For directories: check if this directory path should be traversed
        // Always traverse if any include pattern might match files inside
        const shouldTraverse = 
          shouldIncludeFile(relativePath, ignorePatterns, includePatterns) ||
          includePatterns.some(p => p.startsWith(relativePath) || relativePath.match(new RegExp('^' + p.replace('**', '.*').replace('*', '[^/]*'))));
        
        // Always traverse directories that might contain included files
        const subFiles = await scanDirectory(fullPath, extensions, ignorePatterns, includePatterns, relativePath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        // First check extension
        if (!extensions.includes(ext)) continue;
        
        // Then check include/ignore patterns
        if (shouldIncludeFile(relativePath, ignorePatterns, includePatterns)) {
          files.push(relativePath);
        }
      }
    }
  } catch {
    // 目录不存在或无法访问
  }

  return files;
}

/**
 * 文件排序：README > index > 其他按字母顺序
 */
function sortFiles(files: string[]): string[] {
  return files.sort((a, b) => {
    const aName = path.basename(a).toLowerCase();
    const bName = path.basename(b).toLowerCase();
    
    // README 优先
    if (aName.startsWith('readme')) return -1;
    if (bName.startsWith('readme')) return 1;
    
    // index 次之
    if (aName.startsWith('index')) return -1;
    if (bName.startsWith('index')) return 1;
    
    // 其他按字母顺序
    return a.localeCompare(b);
  });
}

/**
 * 创建兼容源
 */
export async function createCompatSource(options: CompatSourceOptions) {
  const {
    dir,
    baseUrl,
    extensions = ['.md', '.mdx'],
    indexFiles = ['README.md', 'readme.md', 'index.md', 'index.mdx'],
    ignore = ['_*', '.*'],
    include = [],
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    transformLinks = true,
    imageBasePath = '',
    titleExtractor = extractTitle,
    descriptionExtractor = extractDescription,
    preprocessor,
  } = options;

  const absoluteDir = path.isAbsolute(dir)
    ? dir
    : path.join(process.cwd(), dir);

  // 扫描所有文件并排序（README 优先）
  const unsortedFiles = await scanDirectory(absoluteDir, extensions, ignore, include);
  const files = sortFiles(unsortedFiles);
  const pages: Map<string, RawPage> = new Map();
  const warnings: string[] = [];

  // 解析每个文件
  for (const file of files) {
    const filePath = path.join(absoluteDir, file);
    
    // 检查文件大小
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > maxFileSize) {
        warnings.push(`File ${file} exceeds max size (${stats.size} > ${maxFileSize}), skipping`);
        continue;
      }
    } catch {
      continue; // 文件不存在或无法访问
    }

    const content = await fs.readFile(filePath, 'utf-8');
    
    // 解析 frontmatter，如果解析失败则回退到空 frontmatter
    let frontmatter: Record<string, unknown> = {};
    let rawContent: string = content;
    
    try {
      const parsed = matter(content);
      frontmatter = parsed.data;
      rawContent = parsed.content;
    } catch (error) {
      // Frontmatter 解析失败，使用原始内容
      warnings.push(`Invalid frontmatter in ${file}: ${error instanceof Error ? error.message : 'Unknown error'}. Using content as-is.`);
      // 尝试移除无效的 frontmatter 块
      const match = content.match(/^---[\s\S]*?---\n?([\s\S]*)$/);
      if (match) {
        rawContent = match[1] || content;
      }
    }

    const slugs = filePathToSlugs(file);
    const slugKey = slugs.join('/') || 'index';

    const title =
      (frontmatter.title as string) || titleExtractor(rawContent, filePath);
    const description =
      (frontmatter.description as string) ||
      descriptionExtractor(rawContent, filePath);

    // 处理内容
    let processedContent = rawContent;

    // 1. 应用自定义预处理器（如果有）
    if (preprocessor) {
      processedContent = preprocessor(processedContent, filePath);
    }

    // 2. 转换相对链接
    if (transformLinks) {
      processedContent = transformRelativeLinks(processedContent, baseUrl, file);
    }

    // 3. 转换图片路径
    if (imageBasePath) {
      processedContent = transformImagePaths(processedContent, imageBasePath, file);
    }

    // 4. 预处理 markdown 内容，使其与 MDX 兼容
    processedContent = preprocessMarkdown(processedContent);

    // 5. 冲突检测：检查是否有同名 slug
    if (pages.has(slugKey)) {
      const existingPage = pages.get(slugKey);
      warnings.push(
        `Slug conflict detected: "${file}" conflicts with "${existingPage?.filePath}". ` +
        `Using first file encountered.`
      );
      continue; // 跳过冲突的文件，保留第一个
    }

    pages.set(slugKey, {
      filePath,
      slugs,
      url: slugs.length > 0 ? `${baseUrl}/${slugs.join('/')}` : baseUrl,
      content: processedContent,
      data: {
        title,
        description,
        frontmatter,
      },
    });
  }

  // 构建页面树
  /**
   * 构建页面树，保留文件夹层级结构
   */
  function buildPageTree(): Root {
    const root: Root = {
      name: 'Documents',
      children: [],
    };

    const folders: Map<string, Folder> = new Map();
    const folderIndexPages: Map<string, RawPage> = new Map();

    // 排序页面
    const sortedPages = Array.from(pages.values()).sort((a, b) =>
      a.url.localeCompare(b.url)
    );

    // 第一遍：识别文件夹 index 页面
    for (const page of sortedPages) {
      const fileName = path.basename(page.filePath).toLowerCase();
      if (isIndexFile(fileName) && page.slugs.length > 0) {
        // 这是一个文件夹的 index 页面
        const folderKey = page.slugs.join('/');
        folderIndexPages.set(folderKey, page);
      }
    }

    // 第二遍：构建树
    for (const page of sortedPages) {
      const fileName = path.basename(page.filePath).toLowerCase();
      const isIndex = isIndexFile(fileName);

      // 根目录的 index 页面
      if (page.slugs.length === 0) {
        const node: Item = {
          type: 'page',
          name: page.data.title,
          url: page.url,
        };
        root.children.unshift(node); // 放在最前面
        continue;
      }

      // 文件夹的 index 页面 - 作为文件夹的入口
      if (isIndex && page.slugs.length > 0) {
        // 确保文件夹存在
        ensureFolderPath(page.slugs, root, folders, folderIndexPages);
        continue;
      }

      // 普通页面
      const node: Item = {
        type: 'page',
        name: page.data.title,
        url: page.url,
      };

      if (page.slugs.length === 1) {
        // 顶级页面
        root.children.push(node);
      } else {
        // 嵌套页面 - 创建文件夹结构
        const folderSlugs = page.slugs.slice(0, -1);
        const folder = ensureFolderPath(folderSlugs, root, folders, folderIndexPages);
        folder.children.push(node);
      }
    }

    // 后处理：将只有 index 且没有子页面的文件夹转换为普通页面
    flattenEmptyFolders(root);

    return root;
  }

  /**
   * 递归地将只有 index 且没有子页面的文件夹转换为普通页面
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function flattenEmptyFolders(node: { children: any[] }): void {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      
      if (child.type === 'folder') {
        // 先递归处理子文件夹
        flattenEmptyFolders(child);
        
        // 如果文件夹没有子页面但有 index，将其转换为普通页面
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

  /**
   * 确保文件夹路径存在，返回最深层的文件夹
   */
  function ensureFolderPath(
    slugs: string[],
    root: Root,
    folders: Map<string, Folder>,
    folderIndexPages: Map<string, RawPage>
  ): Folder {
    // 使用 any 来绕过类型检查，因为 Root.children 和 Folder.children 类型略有不同
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
          // 如果有 index 页面，添加入口链接
          ...(indexPage && { index: { type: 'page' as const, name: indexPage.data.title, url: indexPage.url } }),
        };
        folders.set(folderKey, folder);
        currentParent.children.push(folder);
      }
      
      currentParent = folder;
    }

    return folders.get(slugs.join('/'))!;
  }

  return {
    /**
     * 获取单个页面
     */
    getPage(slugs: string[] | undefined): RawPage | undefined {
      const key = slugs?.join('/') || 'index';
      return pages.get(key);
    },

    /**
     * 获取所有页面
     */
    getPages(): RawPage[] {
      return Array.from(pages.values());
    },

    /**
     * 生成静态参数
     */
    generateParams() {
      return Array.from(pages.values()).map((page) => ({
        slug: page.slugs,
      }));
    },

    /**
     * 页面树（用于导航）
     */
    pageTree: buildPageTree(),

    /**
     * 基础 URL
     */
    baseUrl,

    /**
     * 处理过程中的警告信息
     */
    warnings,

    /**
     * 重新加载源（用于开发模式）
     */
    async reload() {
      return createCompatSource(options);
    },
  };
}

export type CompatSource = Awaited<ReturnType<typeof createCompatSource>>;

