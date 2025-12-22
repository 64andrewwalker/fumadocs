import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { ReactNode } from 'react';

interface NavItem {
  label: string;
  href: string;
}

interface SiteConfig {
  name: string;
  logo?: {
    image?: string;
    imageDark?: string;
    text?: string;
  };
  nav?: NavItem[];
  social?: {
    github?: string;
  };
  // Legacy format support
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

// Build nav title with optional logo image (supports light/dark mode)
function buildNavTitle(config: SiteConfig): ReactNode {
  const basePath = process.env.NEXT_BASE_PATH || '';
  
  if (config.logo?.image) {
    const imageSrc = config.logo.image.startsWith('/') 
      ? `${basePath}${config.logo.image}` 
      : config.logo.image;
    
    const imageDarkSrc = config.logo.imageDark 
      ? (config.logo.imageDark.startsWith('/') 
          ? `${basePath}${config.logo.imageDark}` 
          : config.logo.imageDark)
      : imageSrc;
    
    return (
      <span className="flex items-center gap-2">
        {/* Light mode logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={imageSrc} 
          alt={config.logo.text || config.name} 
          className="h-6 w-6 dark:hidden"
        />
        {/* Dark mode logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={imageDarkSrc} 
          alt={config.logo.text || config.name} 
          className="h-6 w-6 hidden dark:block"
        />
        <span className="font-semibold">{config.logo.text || config.name}</span>
      </span>
    );
  }
  
  return config.logo?.text || config.name;
}

export function baseOptions(): BaseLayoutProps {
  const config = loadSiteConfig();
  const githubUrl = config.social?.github || config.links?.github;
  const basePath = process.env.NEXT_BASE_PATH || '';

  // Build links array from nav config
  const links: Array<{ text: string; url: string }> = [];
  
  // Add custom nav items (like Docs, API, Guides)
  // Note: fumadocs handles basePath internally for internal links,
  // so we don't need to prepend basePath here
  if (config.nav) {
    for (const item of config.nav) {
      links.push({
        text: item.label,
        url: item.href,
      });
    }
  }
  
  // Add GitHub link at the end
  if (githubUrl) {
    links.push({
      text: 'GitHub',
      url: githubUrl,
    });
  }

  return {
    nav: {
      title: buildNavTitle(config),
    },
    links,
  };
}
