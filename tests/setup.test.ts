/**
 * Test Setup Verification
 * 
 * This file verifies that the test environment is properly configured.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import { getFixturePath, createTempDir, cleanupTempDir, writeFixture } from './utils';

describe('Test Environment', () => {
  it('can import vitest functions', () => {
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(expect).toBeDefined();
  });

  it('can access fixtures directory', async () => {
    const fixturePath = getFixturePath('single-file');
    const stat = await fs.stat(fixturePath);
    expect(stat.isDirectory()).toBe(true);
  });

  it('can read fixture files', async () => {
    const fixturePath = getFixturePath('single-file');
    const content = await fs.readFile(`${fixturePath}/test.md`, 'utf-8');
    expect(content).toContain('# Test Document');
  });

  it('can create and cleanup temp directories', async () => {
    const tempDir = await createTempDir();
    expect(tempDir).toBeTruthy();
    
    // Write a file
    await writeFixture(tempDir, 'test.md', '# Test');
    const content = await fs.readFile(`${tempDir}/test.md`, 'utf-8');
    expect(content).toBe('# Test');
    
    // Cleanup
    await cleanupTempDir(tempDir);
    
    // Verify cleanup
    await expect(fs.stat(tempDir)).rejects.toThrow();
  });
});

describe('Fixtures Verification', () => {
  it('has empty-dir fixture', async () => {
    const path = getFixturePath('empty-dir');
    const stat = await fs.stat(path);
    expect(stat.isDirectory()).toBe(true);
  });

  it('has nested fixture with deep files', async () => {
    const path = getFixturePath('nested/level1/level2/deep.md');
    const content = await fs.readFile(path, 'utf-8');
    expect(content).toContain('Deep Document');
  });

  it('has special-dirs fixture with .promptpack', async () => {
    const path = getFixturePath('special-dirs/.promptpack/actions/action.md');
    const content = await fs.readFile(path, 'utf-8');
    expect(content).toContain('Action Document');
  });

  it('has syntax fixtures for JSX testing', async () => {
    const path = getFixturePath('syntax/table-jsx.md');
    const content = await fs.readFile(path, 'utf-8');
    expect(content).toContain('<16Ω');
    expect(content).toContain('{value}');
  });

  it('has metadata fixtures', async () => {
    const withFm = await fs.readFile(getFixturePath('metadata/with-frontmatter.md'), 'utf-8');
    expect(withFm).toContain('title: Custom Title');
    
    const withH1 = await fs.readFile(getFixturePath('metadata/with-h1.md'), 'utf-8');
    expect(withH1).toContain('[0-DISC] Project Analysis');
  });

  it('has mixed-types fixture', async () => {
    const dir = getFixturePath('mixed-types');
    const files = await fs.readdir(dir);
    expect(files).toContain('document.md');
    expect(files).toContain('document.mdx');
    expect(files).toContain('config.yaml');
    expect(files).toContain('data.json');
  });
});


