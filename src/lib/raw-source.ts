/**
 * Raw Notes Source
 *
 * 兼容源配置，用于加载 DocEngineering 等非标准 markdown 文件
 */

import { createCompatSource, type CompatSource } from './compat-engine';

// 缓存源实例
let cachedSource: CompatSource | null = null;

/**
 * 获取 raw notes 源
 * 在生产环境中会缓存结果
 */
export async function getRawSource(): Promise<CompatSource> {
  if (cachedSource && process.env.NODE_ENV === 'production') {
    return cachedSource;
  }

  cachedSource = await createCompatSource({
    dir: 'DocEngineering',
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

