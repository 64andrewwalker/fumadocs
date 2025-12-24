/**
 * Markdown Preprocessor
 * 
 * Functions for preprocessing markdown content to be MDX-compatible.
 * Handles escaping of JSX-sensitive characters while preserving code blocks,
 * inline code, and math formulas.
 */

/**
 * Escape JSX-sensitive characters in table content.
 * 
 * Tables require more aggressive escaping because they can contain
 * arbitrary comparison operators and expressions.
 * 
 * @param text - The table line to process
 * @returns Escaped text safe for MDX
 */
export function escapeJsxInTable(text: string): string {
  // Protect inline code, don't escape its contents
  const codeSegments: string[] = [];
  let processed = text.replace(/`[^`]+`/g, (match) => {
    codeSegments.push(match);
    return `__CODE_SEGMENT_${codeSegments.length - 1}__`;
  });

  // In tables, aggressively escape < characters
  // Only preserve clear HTML tags (like <strong>, </em>, <a href>)
  // Escape all other < characters (like <16, <something not followed by valid tag name)
  processed = processed.replace(/<(?![a-zA-Z][a-zA-Z0-9]*[\s>\/]|\/[a-zA-Z])/g, '&lt;');
  // Use HTML entities for curly braces to avoid MDX Unicode escape issues
  processed = processed.replace(/{/g, '&#123;');
  processed = processed.replace(/}/g, '&#125;');

  // Restore inline code
  codeSegments.forEach((segment, index) => {
    processed = processed.replace(`__CODE_SEGMENT_${index}__`, segment);
  });

  return processed;
}

/**
 * Escape JSX-sensitive characters in non-code text.
 * 
 * Protects:
 * - Inline code (`code`)
 * - Inline math ($formula$)
 * - Block math ($$formula$$)
 * 
 * Transforms:
 * - HTML comments to MDX comments
 * - Invalid JSX tag starts (<3, <>, <=) to HTML entities
 * - Standalone curly braces to escaped versions
 * 
 * @param text - The text line to process
 * @returns Escaped text safe for MDX
 */
export function escapeJsxInNonCodeText(text: string): string {
  // Protect inline code
  const protectedSegments: string[] = [];
  let processed = text.replace(/`[^`]+`/g, (match) => {
    protectedSegments.push(match);
    return `__PROTECTED_${protectedSegments.length - 1}__`;
  });

  // Protect inline math $...$ (but not $$)
  processed = processed.replace(/(?<!\$)\$(?!\$)([^$]+)\$(?!\$)/g, (match) => {
    protectedSegments.push(match);
    return `__PROTECTED_${protectedSegments.length - 1}__`;
  });

  // Protect block math $$...$$ (may span lines, but in single-line mode only process same line)
  processed = processed.replace(/\$\$([^$]*)\$\$/g, (match) => {
    protectedSegments.push(match);
    return `__PROTECTED_${protectedSegments.length - 1}__`;
  });

  // Protect HTML comments - will be converted to MDX format at the end
  // We need to protect them BEFORE escaping < characters
  const htmlComments: string[] = [];
  processed = processed.replace(/<!--([\s\S]*?)-->/g, (match, content) => {
    htmlComments.push(content);
    return `__HTML_COMMENT_${htmlComments.length - 1}__`;
  });

  // Escape < not followed by letter (invalid JSX tag start)
  // MDX requires tag names to start with a letter, so <3 <> <= etc need escaping
  processed = processed.replace(/<(?![a-zA-Z_/])/g, '&lt;');

  // Escape standalone { and } (not JSX expressions or MDX comments)
  // Use HTML entities instead of backslash to avoid MDX Unicode escape issues
  // Match { not followed by letter, slash (for comments), or *
  processed = processed.replace(/{(?![a-zA-Z_$/*])/g, '&#123;');
  // Match } not preceded by letter, number, $, *, or / (for comment end */)
  processed = processed.replace(/(?<![a-zA-Z0-9_$*/])}/g, '&#125;');

  // Convert protected HTML comments to MDX comment format
  // <!-- comment --> becomes {/* comment */}
  htmlComments.forEach((content, index) => {
    processed = processed.replace(`__HTML_COMMENT_${index}__`, `{/* ${content} */}`);
  });

  // Restore protected content
  protectedSegments.forEach((segment, index) => {
    processed = processed.replace(`__PROTECTED_${index}__`, segment);
  });

  return processed;
}

/**
 * Preprocess markdown content for MDX compatibility.
 * 
 * Handles:
 * - Code block protection (content inside ``` is not modified)
 * - Block math protection (content inside $$ is not modified)
 * - Table processing (aggressive JSX escaping)
 * - Regular text processing (smart JSX escaping)
 * 
 * @param content - The full markdown content
 * @returns Preprocessed content safe for MDX parsing
 */
export function preprocessMarkdown(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;
  let inTable = false;
  let inBlockMath = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Detect code block boundaries
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
      continue;
    }

    // Don't process inside code blocks (MDX handles them specially)
    if (inCodeBlock) {
      result.push(line);
      continue;
    }

    // Detect block math $$ boundaries
    if (line.trim() === '$$') {
      inBlockMath = !inBlockMath;
      result.push(line);
      continue;
    }

    // Don't process inside block math
    if (inBlockMath) {
      result.push(line);
      continue;
    }

    // Detect table (starts with | or contains |---|)
    const isTableLine = line.trim().startsWith('|') || /\|[\s-]+\|/.test(line);
    if (isTableLine) {
      inTable = true;
      // Use aggressive JSX escaping for tables
      line = escapeJsxInTable(line);
    } else if (inTable && line.trim() === '') {
      inTable = false;
    }

    // Process inline code and regular text
    if (!isTableLine) {
      line = escapeJsxInNonCodeText(line);
    }

    result.push(line);
  }

  return result.join('\n');
}

