/**
 * Raw Notes Page
 *
 * 使用兼容层渲染非标准 markdown 文件
 */

import { getRawSource } from '@/lib/raw-source';
import { compileMDX } from '@fumadocs/mdx-remote';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/mdx-components';
import type { Metadata } from 'next';

// Remark/Rehype plugins for enhanced markdown support
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const source = await getRawSource();
  const pages = source.getPages();

  // 处理空目录情况
  if (pages.length === 0) {
    return (
      <DocsPage>
        <DocsTitle>No Documents Found</DocsTitle>
        <DocsDescription>
          The document source directory is empty or contains no markdown files.
        </DocsDescription>
        <DocsBody>
          <p>Please add markdown files (.md or .mdx) to the configured directory.</p>
        </DocsBody>
      </DocsPage>
    );
  }

  let page = source.getPage(slug);

  // 如果没有找到页面且是根路径，显示第一个可用页面（优先 README）
  if (!page && (!slug || slug.length === 0)) {
    // 第一个页面已经是 README（如果存在），因为我们在 sortFiles 中排序了
    page = pages[0];
  }

  if (!page) notFound();

  // 使用 mdx-remote 编译 markdown 内容
  // 添加 remark/rehype 插件支持数学公式、GFM、Mermaid 图表
  const compiled = await compileMDX({
    source: page.content,
    mdxOptions: {
      remarkPlugins: [remarkGfm, remarkMath, remarkMdxMermaid],
      rehypePlugins: [rehypeKatex],
    },
  });

  const MDXContent = compiled.body;

  return (
    <DocsPage toc={compiled.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDXContent components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  const source = await getRawSource();
  return source.generateParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const source = await getRawSource();
  const page = source.getPage(slug);

  if (!page) {
    return {
      title: 'Not Found',
    };
  }

  return {
    title: page.data.title,
    description: page.data.description,
  };
}

