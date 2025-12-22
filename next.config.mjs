import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,

  // Deployment mode:
  // - 'standalone': For Docker deployment (default)
  // - 'export': For GitHub Pages (static HTML)
  output: process.env.NEXT_OUTPUT_MODE || 'standalone',

  // Base path for GitHub Pages (e.g., /calvin for github.io/calvin)
  // Only set when deploying to GitHub Pages
  ...(process.env.NEXT_BASE_PATH && {
    basePath: process.env.NEXT_BASE_PATH,
    assetPrefix: process.env.NEXT_BASE_PATH,
  }),

  // Disable image optimization for static export (GitHub Pages)
  ...(process.env.NEXT_OUTPUT_MODE === 'export' && {
    images: { unoptimized: true },
  }),

  // Expose NEXT_BASE_PATH to server components during build
  env: {
    NEXT_BASE_PATH: process.env.NEXT_BASE_PATH || '',
  },
};

export default withMDX(config);
