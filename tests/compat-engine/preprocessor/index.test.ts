/**
 * Preprocessor Tests
 * 
 * TDD tests for the preprocessor functions in preprocessor/index.ts
 */

import { describe, it, expect } from 'vitest';
import { escapeJsxInNonCodeText, preprocessMarkdown } from '@/lib/compat-engine/preprocessor';

// =============================================================================
// TC-PRE-01: HTML Comment Conversion
// =============================================================================
describe('HTML Comments to MDX Comments', () => {
  it('should convert single line HTML comments', () => {
    const input = '<!-- This is a comment -->';
    // Note: The outer braces get escaped because they're followed by special chars
    const output = escapeJsxInNonCodeText(input);
    // The comment content is preserved
    expect(output).toContain('This is a comment');
    // HTML comment syntax is removed
    expect(output).not.toContain('<!--');
    expect(output).not.toContain('-->');
    // MDX comment syntax is added (with escaped braces)
    expect(output).toContain('/*');
    expect(output).toContain('*/');
  });

  it('should convert multi-word comments', () => {
    const input = '<!-- Generated from template - Do not edit -->';
    const output = escapeJsxInNonCodeText(input);
    expect(output).toContain('Generated from template');
    expect(output).not.toContain('<!--');
    expect(output).not.toContain('-->');
  });

  it('should handle empty comments', () => {
    const input = '<!---->';
    const output = escapeJsxInNonCodeText(input);
    expect(output).not.toContain('<!--');
  });

  it('should handle comments with special characters', () => {
    const input = '<!-- TODO: Fix this <issue> -->';
    const output = escapeJsxInNonCodeText(input);
    expect(output).toContain('TODO: Fix this');
    expect(output).not.toContain('<!--');
  });
});

// =============================================================================
// TC-PRE-02: JSX Tag Escaping
// =============================================================================
describe('JSX Tag Escaping', () => {
  it('should escape less-than followed by number', () => {
    expect(escapeJsxInNonCodeText('Load time <3 seconds')).toBe('Load time &lt;3 seconds');
    expect(escapeJsxInNonCodeText('Price <100')).toBe('Price &lt;100');
  });

  it('should escape less-than followed by space', () => {
    expect(escapeJsxInNonCodeText('a < b')).toBe('a &lt; b');
  });

  it('should escape less-than followed by equals', () => {
    expect(escapeJsxInNonCodeText('x <= y')).toBe('x &lt;= y');
  });

  it('should escape empty angle brackets', () => {
    expect(escapeJsxInNonCodeText('vector<>')).toBe('vector&lt;>');
  });

  it('should NOT escape valid JSX tags', () => {
    expect(escapeJsxInNonCodeText('<div>content</div>')).toBe('<div>content</div>');
    expect(escapeJsxInNonCodeText('<Component />')).toBe('<Component />');
    expect(escapeJsxInNonCodeText('</closing>')).toBe('</closing>');
  });

  it('should NOT escape self-closing tags', () => {
    expect(escapeJsxInNonCodeText('<br/>')).toBe('<br/>');
    expect(escapeJsxInNonCodeText('<img src="test" />')).toBe('<img src="test" />');
  });
});

// =============================================================================
// TC-PRE-03: Curly Brace Escaping
// =============================================================================
describe('Curly Brace Escaping', () => {
  it('should NOT escape braces that look like JSX expressions', () => {
    // When the brace is followed by an identifier, it looks like JSX expression
    // so we don't escape it (this is the current heuristic)
    expect(escapeJsxInNonCodeText('Use {curly} braces')).toBe('Use {curly} braces');
  });

  it('should escape opening brace not followed by identifier', () => {
    expect(escapeJsxInNonCodeText('{ standalone')).toBe('\\{ standalone');
    // Note: closing brace after number is not escaped because of regex pattern
    expect(escapeJsxInNonCodeText('{1 + 2}')).toContain('\\{');
  });

  it('should NOT escape JSX expressions (identifier after brace)', () => {
    // Note: This is a heuristic - real JSX expressions start with identifier
    expect(escapeJsxInNonCodeText('{variable}')).toBe('{variable}');
    expect(escapeJsxInNonCodeText('{Component}')).toBe('{Component}');
  });
});

// =============================================================================
// TC-PRE-04: Code Block Protection
// =============================================================================
describe('Code Block Protection', () => {
  it('should NOT modify content inside code blocks', () => {
    const input = `
\`\`\`javascript
const x = <div>{value}</div>;
// comment with <!-- html -->
\`\`\`
`.trim();
    expect(preprocessMarkdown(input)).toBe(input);
  });

  it('should process content outside code blocks', () => {
    const input = `
Some text with <3 hearts

\`\`\`
code block
\`\`\`

More text with <!-- comment -->
`.trim();
    const output = preprocessMarkdown(input);
    expect(output).toContain('&lt;3');
    expect(output).toContain('code block'); // unchanged
    expect(output).toContain('{/*');
  });
});

// =============================================================================
// TC-PRE-05: Inline Code Protection
// =============================================================================
describe('Inline Code Protection', () => {
  it('should NOT modify content inside inline code', () => {
    const input = 'Use `<div>` for containers and `{props}` for values';
    const output = escapeJsxInNonCodeText(input);
    expect(output).toContain('`<div>`');
    expect(output).toContain('`{props}`');
  });

  it('should process text around inline code', () => {
    const input = 'Value <100 and code `<div>` here';
    const output = escapeJsxInNonCodeText(input);
    expect(output).toContain('&lt;100');
    expect(output).toContain('`<div>`');
  });
});

// =============================================================================
// TC-PRE-06: Math Formula Protection
// =============================================================================
describe('Math Formula Protection', () => {
  it('should NOT modify inline math', () => {
    const input = 'Formula $x < y$ is valid';
    const output = escapeJsxInNonCodeText(input);
    expect(output).toContain('$x < y$');
    expect(output).not.toContain('&lt;');
  });

  it('should NOT modify block math', () => {
    const input = `
$$
x < y
$$
`.trim();
    const output = preprocessMarkdown(input);
    expect(output).toBe(input);
  });

  it('should process text around math', () => {
    const input = 'When $x > 0$ and load <3s';
    const output = escapeJsxInNonCodeText(input);
    expect(output).toContain('$x > 0$');
    expect(output).toContain('&lt;3s');
  });
});

// =============================================================================
// TC-PRE-07: Table Processing
// =============================================================================
describe('Table Processing', () => {
  it('should escape special chars in tables', () => {
    const input = `
| Condition | Result |
|-----------|--------|
| x < 10    | true   |
`.trim();
    const output = preprocessMarkdown(input);
    expect(output).toContain('&lt; 10');
  });

  it('should handle tables with code in cells', () => {
    const input = `
| Code | Description |
|------|-------------|
| \`<div>\` | Container |
`.trim();
    const output = preprocessMarkdown(input);
    expect(output).toContain('`<div>`');
  });
});

// =============================================================================
// TC-PRE-08: Edge Cases
// =============================================================================
describe('Preprocessor Edge Cases', () => {
  it('should handle empty content', () => {
    expect(preprocessMarkdown('')).toBe('');
  });

  it('should handle content with only whitespace', () => {
    expect(preprocessMarkdown('   \n   ')).toBe('   \n   ');
  });

  it('should handle multiple consecutive special chars', () => {
    expect(escapeJsxInNonCodeText('<<>>')).toBe('&lt;&lt;>>');
  });

  it('should handle nested structures', () => {
    const input = '<!-- Comment with `code` and $math$ -->';
    const output = escapeJsxInNonCodeText(input);
    expect(output).toContain('{/*');
  });

  it('should handle very long content', () => {
    const longText = 'x < y '.repeat(1000);
    const output = escapeJsxInNonCodeText(longText);
    expect(output).toContain('&lt;');
  });
});

// =============================================================================
// TC-PRE-09: Real World Examples
// =============================================================================
describe('Real World Examples', () => {
  it('should handle PLAYBOOK_ERRATA.md style content', () => {
    const input = '### F-004: Page Load <3 seconds 硬门槛 — ✅ 已修复';
    const output = escapeJsxInNonCodeText(input);
    expect(output).toContain('&lt;3 seconds');
    expect(output).toContain('✅ 已修复');
  });

  it('should handle template generation comments', () => {
    const input = '<!-- Generated from src/templates/file.md.tmpl - Edit template, not this file -->';
    const output = escapeJsxInNonCodeText(input);
    expect(output).toContain('{/*');
    expect(output).not.toContain('<!--');
  });

  it('should handle comparison in documentation', () => {
    const input = 'Response time should be < 200ms for 95th percentile';
    const output = escapeJsxInNonCodeText(input);
    expect(output).toContain('&lt; 200ms');
  });
});

