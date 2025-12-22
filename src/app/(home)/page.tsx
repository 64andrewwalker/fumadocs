import Link from 'next/link';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Site configuration type
interface SiteConfig {
  name: string;
  title: string;
  description: string;
  hero?: {
    title: string;
    subtitle?: string;
    cta?: {
      text: string;
      href: string;
    };
    secondaryCta?: {
      text: string;
      href: string;
    };
  };
  features?: Array<{
    title: string;
    description: string;
    icon?: string;
  }>;
  links?: {
    github?: string;
    docs?: string;
  };
}

// Default configuration
const defaultConfig: SiteConfig = {
  name: 'My App',
  title: 'Documentation',
  description: 'Welcome to the documentation',
  hero: {
    title: 'Welcome',
    subtitle: 'Get started by reading the documentation.',
    cta: {
      text: 'Get Started',
      href: '/docs',
    },
  },
};

// Load site config from docs directory
function loadSiteConfig(): SiteConfig {
  const configPath = join(process.cwd(), 'content/docs/site.config.json');

  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8');
      return { ...defaultConfig, ...JSON.parse(content) };
    } catch (e) {
      console.warn('Failed to parse site.config.json:', e);
    }
  }

  return defaultConfig;
}

export default function HomePage() {
  const config = loadSiteConfig();
  const { hero, features, links } = config;

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-4 py-24 flex-1 bg-gradient-to-b from-fd-background to-fd-secondary/20">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-fd-foreground to-fd-foreground/70 bg-clip-text text-transparent">
          {hero?.title || config.title}
        </h1>

        {hero?.subtitle && (
          <p className="text-lg md:text-xl text-fd-muted-foreground max-w-2xl mb-8">
            {hero.subtitle}
          </p>
        )}

        <div className="flex gap-4 flex-wrap justify-center">
          {hero?.cta && (
            <Link
              href={hero.cta.href}
              className="px-6 py-3 bg-fd-primary text-fd-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              {hero.cta.text}
            </Link>
          )}

          {hero?.secondaryCta && (
            <Link
              href={hero.secondaryCta.href}
              className="px-6 py-3 border border-fd-border rounded-lg font-medium hover:bg-fd-secondary transition-colors"
            >
              {hero.secondaryCta.text}
            </Link>
          )}

          {links?.github && (
            <a
              href={links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-fd-border rounded-lg font-medium hover:bg-fd-secondary transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
          )}
        </div>
      </section>

      {/* Features Section */}
      {features && features.length > 0 && (
        <section className="py-16 px-4 bg-fd-secondary/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-12">Features</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, i) => (
                <div key={i} className="p-6 rounded-xl bg-fd-card border border-fd-border">
                  {feature.icon && (
                    <div className="text-3xl mb-4">{feature.icon}</div>
                  )}
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-fd-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-fd-muted-foreground border-t border-fd-border">
        <p>Built with Fumadocs</p>
      </footer>
    </div>
  );
}
