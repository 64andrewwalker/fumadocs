import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Required for Docker deployment - creates optimized standalone build
  output: 'standalone',
};

export default withMDX(config);
