import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import './global.css';
import { Inter } from 'next/font/google';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const inter = Inter({
  subsets: ['latin'],
});

// Load site config for metadata
function loadSiteConfig() {
  const possiblePaths = [
    join(process.cwd(), 'content/site.config.json'),
    join(process.cwd(), 'content/docs/site.config.json'),
  ];

  for (const configPath of possiblePaths) {
    if (existsSync(configPath)) {
      try {
        return JSON.parse(readFileSync(configPath, 'utf-8'));
      } catch {
        // ignore parse errors
      }
    }
  }
  return {};
}

const siteConfig = loadSiteConfig();
const basePath = process.env.NEXT_BASE_PATH || '';

export const metadata: Metadata = {
  title: {
    template: `%s | ${siteConfig.name || 'Fumadocs'}`,
    default: siteConfig.name || 'Fumadocs',
  },
  description: siteConfig.description || 'Documentation Engine powered by Fumadocs',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  ),
  icons: {
    icon: `${basePath}/favicon.svg`,
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
