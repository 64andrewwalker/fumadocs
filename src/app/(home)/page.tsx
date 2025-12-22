import Link from 'next/link';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { compileMDX } from 'next-mdx-remote/rsc';
import defaultMdxComponents from 'fumadocs-ui/mdx';

// Custom components available in homepage MDX
const customComponents = {
  ...defaultMdxComponents,
  // Hero component
  Hero: ({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) => (
    <section className="flex flex-col items-center justify-center text-center px-4 py-24 bg-gradient-to-b from-fd-background to-fd-secondary/20">
      <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-fd-foreground to-fd-foreground/70 bg-clip-text text-transparent">
        {title}
      </h1>
      {subtitle && (
        <p className="text-lg md:text-xl text-fd-muted-foreground max-w-2xl mb-8">
          {subtitle}
        </p>
      )}
      <div className="flex gap-4 flex-wrap justify-center">
        {children}
      </div>
    </section>
  ),
  // Button component
  Button: ({ href, variant = 'primary', children }: { href: string; variant?: 'primary' | 'secondary' | 'outline'; children: React.ReactNode }) => {
    const styles = {
      primary: 'bg-fd-primary text-fd-primary-foreground hover:opacity-90',
      secondary: 'bg-fd-secondary text-fd-secondary-foreground hover:opacity-90',
      outline: 'border border-fd-border hover:bg-fd-secondary',
    };
    return (
      <Link href={href} className={`px-6 py-3 rounded-lg font-medium transition-all ${styles[variant]}`}>
        {children}
      </Link>
    );
  },
  // Features grid
  Features: ({ children }: { children: React.ReactNode }) => (
    <section className="py-16 px-4 bg-fd-secondary/30">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children}
      </div>
    </section>
  ),
  // Feature card with optional icon or image
  Feature: ({ icon, image, title, description }: { icon?: string; image?: string; title: string; description: string }) => (
    <div className="p-6 rounded-xl bg-fd-card border border-fd-border hover:border-fd-primary/50 transition-colors">
      {image && (
        <div className="w-full h-40 rounded-lg mb-4 bg-fd-secondary/50 flex items-center justify-center p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.startsWith('/') ? image : `/images/${image}`}
            alt={title}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
      {icon && !image && <div className="text-3xl mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-fd-muted-foreground">{description}</p>
    </div>
  ),
  // Image with automatic path resolution
  Img: ({ src, alt, className = '' }: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src.startsWith('/') ? src : `/docs/images/${src}`}
      alt={alt}
      className={`max-w-full ${className}`}
    />
  ),
  // Section wrapper
  Section: ({ className = '', children }: { className?: string; children: React.ReactNode }) => (
    <section className={`py-16 px-6 md:px-12 ${className}`}>
      <div className="max-w-4xl mx-auto">{children}</div>
    </section>
  ),
  // Grid layout
  Grid: ({ cols = 3, children }: { cols?: number; children: React.ReactNode }) => (
    <div className={`grid gap-6 md:grid-cols-${cols}`}>{children}</div>
  ),
  // Center wrapper
  Center: ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-col items-center text-center">{children}</div>
  ),
  // GitHub button with icon
  GitHubButton: ({ href }: { href: string }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="px-6 py-3 border border-fd-border rounded-lg font-medium hover:bg-fd-secondary transition-colors flex items-center gap-2"
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
      GitHub
    </a>
  ),
};

// Default homepage content
const defaultHomepage = `
<Hero title="Welcome" subtitle="Get started by reading the documentation.">
  <Button href="/docs">Get Started</Button>
</Hero>
`;

async function renderMdxHomepage(source: string) {
  const { content } = await compileMDX({
    source,
    components: customComponents,
  });
  return content;
}

export default async function HomePage() {
  // Check for custom homepage MDX (in content/, NOT content/docs/ to avoid fumadocs processing)
  const homepagePath = join(process.cwd(), 'content/_home.mdx');

  let source = defaultHomepage;

  if (existsSync(homepagePath)) {
    source = readFileSync(homepagePath, 'utf-8');
  }

  const content = await renderMdxHomepage(source);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {content}

      {/* Footer */}
      <footer className="mt-auto py-8 px-4 text-center text-fd-muted-foreground border-t border-fd-border">
        <p>Built with Fumadocs</p>
      </footer>
    </div>
  );
}
