import { docs } from 'fumadocs-mdx:collections/server';
import { type InferPageType, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';

// Helper to extract title from first H1 heading in content
function extractTitleFromContent(content: string): string | undefined {
  const h1Match = content.match(/^#\s+(.+)$/m);
  return h1Match?.[1]?.trim();
}

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
  // Transform pages to add title from H1 if not provided in frontmatter
  transformPage: (page) => {
    if (!page.data.title) {
      // Try to get title from the raw content
      const rawContent = page.data.content || '';
      const extractedTitle = extractTitleFromContent(rawContent);
      if (extractedTitle) {
        return {
          ...page,
          data: {
            ...page.data,
            title: extractedTitle,
          },
        };
      }
      // Fallback to filename-based title
      const slug = page.slugs[page.slugs.length - 1] || 'untitled';
      return {
        ...page,
        data: {
          ...page.data,
          title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        },
      };
    }
    return page;
  },
});

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, 'image.png'];

  return {
    segments,
    url: `/og/docs/${segments.join('/')}`,
  };
}

export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title}

${processed}`;
}
