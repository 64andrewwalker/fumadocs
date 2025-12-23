/**
 * Raw Notes Layout
 *
 * 为兼容文档提供导航布局
 */

import { getRawSource } from '@/lib/raw-source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import type { ReactNode } from 'react';

// KaTeX CSS for math formula rendering
import 'katex/dist/katex.min.css';

export default async function Layout({ children }: { children: ReactNode }) {
  const source = await getRawSource();

  return (
    <DocsLayout
      tree={source.pageTree}
      {...baseOptions()}
      sidebar={{
        tabs: {
          transform(option, node) {
            // 自定义侧边栏标签样式
            return {
              ...option,
              icon: node.icon,
            };
          },
        },
      }}
    >
      {children}
    </DocsLayout>
  );
}

