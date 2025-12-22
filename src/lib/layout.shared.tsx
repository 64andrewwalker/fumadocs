import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface SiteConfig {
  name: string;
  links?: {
    github?: string;
  };
}

// Load site config
function loadSiteConfig(): SiteConfig {
  const configPath = join(process.cwd(), 'content/docs/site.config.json');

  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.warn('Failed to parse site.config.json:', e);
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
