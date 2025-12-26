/**
 * Search API Route
 * 
 * 为 fumadocs 提供搜索功能，支持 docs 和 raw-notes 两个源
 */

import { source } from '@/lib/source';
import { getRawSource } from '@/lib/raw-source';
import { createSearchAPI, type AdvancedIndex } from 'fumadocs-core/search/server';

export const { GET } = createSearchAPI('advanced', {
    // Support Chinese with english tokenizer as fallback
    language: 'english',
    indexes: async (): Promise<AdvancedIndex[]> => {
        const indexes: AdvancedIndex[] = [];

        // Add docs pages (if any)
        try {
            const docsPages = source.getPages();
            for (const page of docsPages) {
                if (page.data.structuredData) {
                    indexes.push({
                        title: page.data.title ?? 'Untitled',
                        description: page.data.description ?? '',
                        url: page.url,
                        id: page.url,
                        structuredData: page.data.structuredData,
                    });
                }
            }
        } catch {
            // docs source may be empty or not available
        }

        // Add raw-notes pages
        try {
            const rawSource = await getRawSource();
            const rawPages = rawSource.getPages();
            for (const page of rawPages) {
                // Raw pages don't have structuredData, so we create a simple index
                indexes.push({
                    title: page.data.title || 'Untitled',
                    description: page.data.description || '',
                    url: page.url,
                    id: page.url,
                    // Create minimal structured data from content
                    structuredData: {
                        headings: [],
                        contents: [
                            {
                                heading: page.data.title || 'Content',
                                content: page.content.slice(0, 1000), // First 1000 chars for search
                            },
                        ],
                    },
                });
            }
        } catch {
            // raw source may be empty or not available
        }

        return indexes;
    },
});
