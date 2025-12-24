/**
 * Raw Notes Source
 *
 * 兼容源配置，用于加载 DocEngineering 等非标准 markdown 文件
 * 
 * 支持环境变量:
 *   - COMPAT_SOURCE_DIR: 兼容层源目录 (默认: DocEngineering)
 *   - COMPAT_SOURCE_ENABLED: 是否启用兼容层 (默认: true, 设为 'false' 禁用)
 */

import { createCompatSource, type CompatSource } from './compat-engine';
import fs from 'fs';
import path from 'path';

// 缓存源实例
let cachedSource: CompatSource | null = null;

// 空的 CompatSource 实现
const emptyCompatSource: CompatSource = {
  getPages: () => [],
  getPage: () => undefined,
  generateParams: () => [],
  pageTree: { name: 'Documents', children: [] },
  baseUrl: '/raw-notes',
  warnings: [],
  reload: async () => emptyCompatSource,
};

/**
 * 获取 raw notes 源
 * 在生产环境中会缓存结果
 * 如果目录不存在或被禁用，返回空源
 */
export async function getRawSource(): Promise<CompatSource> {
  if (cachedSource && process.env.NODE_ENV === 'production') {
    return cachedSource;
  }

  // 检查是否禁用
  if (process.env.COMPAT_SOURCE_ENABLED === 'false') {
    cachedSource = emptyCompatSource;
    return cachedSource;
  }

  // 获取目录路径
  const sourceDir = process.env.COMPAT_SOURCE_DIR || 'DocEngineering';
  const absoluteDir = path.isAbsolute(sourceDir)
    ? sourceDir
    : path.join(process.cwd(), sourceDir);

  // 检查目录是否存在
  if (!fs.existsSync(absoluteDir)) {
    // 目录不存在，返回空源
    cachedSource = emptyCompatSource;
    return cachedSource;
  }

  cachedSource = await createCompatSource({
    dir: sourceDir,
    baseUrl: '/raw-notes',
    extensions: ['.md', '.mdx'],
    transformLinks: true,
    ignore: ['_*', 'tests/*', 'scripts/*'],
    include: ['.promptpack/**'],
  });

  return cachedSource;
}

/**
 * 清除缓存（用于开发模式热更新）
 */
export function clearRawSourceCache() {
  cachedSource = null;
}

