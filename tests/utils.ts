/**
 * Test Utilities for Compat Engine
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Get the path to a test fixture directory
 */
export function getFixturePath(name: string): string {
  return path.join(process.cwd(), 'tests', 'fixtures', name);
}

/**
 * Create a temporary directory for tests
 */
export async function createTempDir(prefix = 'compat-test-'): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  return tempDir;
}

/**
 * Clean up a temporary directory
 */
export async function cleanupTempDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch {
    // Ignore errors during cleanup
  }
}

/**
 * Write a fixture file to a directory
 */
export async function writeFixture(
  dirPath: string,
  relativePath: string,
  content: string
): Promise<string> {
  const fullPath = path.join(dirPath, relativePath);
  const dir = path.dirname(fullPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(fullPath, content, 'utf-8');
  return fullPath;
}

/**
 * Read a fixture file
 */
export async function readFixture(name: string, filePath: string): Promise<string> {
  const fullPath = path.join(getFixturePath(name), filePath);
  return fs.readFile(fullPath, 'utf-8');
}

/**
 * Create a mock PluginContext
 */
export function createMockContext(overrides: Partial<MockContext> = {}): MockContext {
  return {
    filePath: 'test.md',
    baseUrl: '/docs',
    sourceDir: '/mock/source',
    options: {
      dir: '/mock/source',
      baseUrl: '/docs',
      extensions: ['.md', '.mdx'],
      ignore: ['_*'],
      include: [],
    },
    ...overrides,
  };
}

interface MockContext {
  filePath: string;
  baseUrl: string;
  sourceDir: string;
  options: {
    dir: string;
    baseUrl: string;
    extensions?: string[];
    ignore?: string[];
    include?: string[];
  };
}

/**
 * Create a mock page for testing
 */
export function createMockPage(overrides: Partial<MockPage> = {}): MockPage {
  return {
    filePath: '/mock/test.md',
    slugs: ['test'],
    url: '/docs/test',
    content: '# Test\n\nContent',
    data: {
      title: 'Test',
      description: 'Test description',
      frontmatter: {},
    },
    ...overrides,
  };
}

interface MockPage {
  filePath: string;
  slugs: string[];
  url: string;
  content: string;
  data: {
    title: string;
    description: string;
    frontmatter: Record<string, unknown>;
  };
}


