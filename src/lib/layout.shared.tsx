import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface SiteConfig {
  name: string;
  links?: {
    github?: string;
  };
}

// Load site config - check multiple possible locations
function loadSiteConfig(): SiteConfig {
  const possiblePaths = [
    join(process.cwd(), 'content/site.config.json'),      // New: content/site.config.json
    join(process.cwd(), 'content/docs/site.config.json'), // Legacy: content/docs/site.config.json
  ];

  for (const configPath of possiblePaths) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf-8');
        return JSON.parse(content);
      } catch (e) {
        console.warn(`Failed to parse ${configPath}:`, e);
      }
    }
  }

  return { name: 'My App' };
}

export function baseOptions(): BaseLayoutProps {
  const config = loadSiteConfig();

  return {
    nav: {
      title: config.name,
    },
    links: config.links?.github
      ? [
        {
          text: 'GitHub',
          url: config.links.github,
        },
      ]
      : [],
  };
}
