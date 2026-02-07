/**
 * Table and Code Block Converter for Markdown
 *
 * Many publishing platforms don't support:
 * - Markdown tables
 * - Code blocks with syntax highlighting
 *
 * This module converts:
 * - Tables → Images (via CDP) or ASCII art
 * - Code blocks → Formatted text blocks
 *
 * @packageDocumentation
 */

import fs from 'node:fs';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';

// ============================================================================
// Types
// ============================================================================

/**
 * CDP Connection interface (minimal type for table rendering)
 * This allows the library to work without a direct CDP dependency
 */
export interface CdpConnection {
  send<T = unknown>(method: string, params?: Record<string, unknown>, options?: { sessionId?: string; timeoutMs?: number }): Promise<T>;
}

// ============================================================================
// Types
// ============================================================================

export interface TableBlock {
  type: 'table';
  markdown: string;
  startIndex: number;
  endIndex: number;
  rows: string[][];
  headers: string[];
}

export interface CodeBlock {
  type: 'code';
  markdown: string;
  startIndex: number;
  endIndex: number;
  language: string;
  code: string;
}

export interface ConvertedContent {
  markdown: string;
  tables: Array<{
    original: string;
    imagePath: string;
  }>;
  codeBlocks: Array<{
    original: string;
    converted: string;
  }>;
}

export interface ConverterOptions {
  outputDir?: string;
  renderTables?: boolean;
  formatCodeBlocks?: boolean;
  cdp?: CdpConnection;
  sessionId?: string;
  verbose?: boolean;
}

// ============================================================================
// Table Detection and Parsing
// ============================================================================

/**
 * Detect if a line looks like a table row or separator
 */
function isTableLine(line: string): boolean {
  // Table separator line: |---|---|
  // Use a simpler regex that matches pipes, dashes, and colons
  if (/^\|?[\-:| ]+\|?$/.test(line.trim())) return true;
  // Table row: | col1 | col2 |
  if (line.includes('|') && line.trim().startsWith('|')) return true;
  return false;
}

/**
 * Check if a line is a table separator (e.g., |---|---|)
 */
function isSeparatorLine(line: string): boolean {
  return /^\|?[\-:| ]+\|?$/.test(line.trim());
}

/**
 * Check if lines contain a markdown table
 */
function containsTable(lines: string[], startIdx: number): boolean {
  if (startIdx >= lines.length) return false;

  // Need at least 3 lines for a table: header | separator | data
  if (startIdx + 2 >= lines.length) return false;

  const line1 = lines[startIdx]!;
  const line2 = lines[startIdx + 1]!;

  // First line must be a table row (but not a separator)
  if (!isTableLine(line1) || isSeparatorLine(line1)) return false;

  // Second line must be a separator
  if (!isSeparatorLine(line2)) return false;

  return true;
}

/**
 * Parse a markdown table from the given lines
 */
export function parseTable(lines: string[], startIdx: number): TableBlock | null {
  if (!containsTable(lines, startIdx)) return null;

  const tableLines: string[] = [];
  let endIdx = startIdx;

  // Read header
  const headerLine = lines[startIdx]!;
  const headers = parseTableRow(headerLine);
  tableLines.push(headerLine);
  endIdx++;

  // Skip separator
  if (endIdx < lines.length && isSeparatorLine(lines[endIdx]!)) {
    tableLines.push(lines[endIdx]!);
    endIdx++;
  }

  // Read data rows (skip separator lines)
  const rows: string[][] = [headers];
  while (endIdx < lines.length && isTableLine(lines[endIdx]!)) {
    const line = lines[endIdx]!;
    // Skip separator lines in data rows
    if (isSeparatorLine(line)) {
      tableLines.push(line);
      endIdx++;
      continue;
    }
    const row = parseTableRow(line);
    rows.push(row);
    tableLines.push(line);
    endIdx++;
  }

  return {
    type: 'table',
    markdown: tableLines.join('\n'),
    startIndex: startIdx,
    endIndex: endIdx,
    rows,
    headers,
  };
}

/**
 * Parse a single table row, extracting cell contents
 */
function parseTableRow(line: string): string[] {
  // Remove leading/trailing pipes and split
  const trimmed = line.trim();
  const withoutEdges = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
  const withoutTrailing = withoutEdges.endsWith('|') ? withoutEdges.slice(0, -1) : withoutEdges;

  return withoutTrailing.split('|').map(cell => cell.trim());
}

/**
 * Generate HTML for a table (for rendering)
 */
function tableToHtml(table: TableBlock): string {
  const cells: string[][] = table.rows;

  let html = '<table style="border-collapse: collapse; width: 100%; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif; font-size: 14px;">';

  // Header row
  html += '<thead><tr style="background: #1d9bf0; color: white;">';
  for (const cell of cells[0] ?? []) {
    html += `<th style="border: 1px solid #38444d; padding: 12px; text-align: left; font-weight: 600;">${escapeHtml(cell)}</th>`;
  }
  html += '</tr></thead>';

  // Data rows
  html += '<tbody>';
  for (let i = 1; i < cells.length; i++) {
    const isEven = i % 2 === 0;
    html += `<tr style="background: ${isEven ? '#f7f9fa' : 'white'};">`;
    for (const cell of cells[i] ?? []) {
      html += `<td style="border: 1px solid #38444d; padding: 10px;">${escapeHtml(cell)}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';

  return html;
}

// ============================================================================
// Code Block Detection and Formatting
// ============================================================================

/**
 * Parse a markdown code block
 */
export function parseCodeBlock(lines: string[], startIdx: number): CodeBlock | null {
  const line = lines[startIdx]!;
  const match = line.match(/^```(\w+)?/);

  if (!match) return null;

  const language = match[1] ?? 'text';
  const codeLines: string[] = [];
  let endIdx = startIdx + 1;

  // Find closing ```
  while (endIdx < lines.length) {
    if (lines[endIdx]!.startsWith('```')) {
      break;
    }
    codeLines.push(lines[endIdx]!);
    endIdx++;
  }

  if (endIdx >= lines.length) {
    // No closing fence found, treat as regular text
    return null;
  }

  return {
    type: 'code',
    markdown: lines.slice(startIdx, endIdx + 1).join('\n'),
    startIndex: startIdx,
    endIndex: endIdx + 1,
    language,
    code: codeLines.join('\n'),
  };
}

/**
 * Convert a code block to a bordered text block format
 * This format works well in plain text environments
 */
export function formatCodeBlockBordered(codeBlock: CodeBlock): string {
  const { language, code } = codeBlock;
  const lines = code.split('\n');

  // Calculate max line length for border
  const maxLen = Math.max(
    `[${language.toUpperCase()}]`.length,
    ...lines.map(l => l.length)
  );

  const border = '─'.repeat(maxLen + 2);

  const result = [
    `┌${border}┐`,
    `│ ${language.padEnd(maxLen)} │`,
    `├${border}┤`,
  ];

  for (const line of lines) {
    result.push(`│ ${line.padEnd(maxLen)} │`);
  }

  result.push(`└${border}┘`);

  return result.join('\n');
}

/**
 * Convert code block to simple markdown with language tag
 */
export function formatCodeBlockSimple(codeBlock: CodeBlock): string {
  const { language, code } = codeBlock;
  return `**[${language.toUpperCase()}]**\n\n\`\`\`\n${code}\n\`\`\``;
}

// ============================================================================
// HTML Helpers
// ============================================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================================
// Table-to-Image Conversion via CDP
// ============================================================================

/**
 * Generate a hash for table content (for caching)
 */
function hashTableContent(tableMarkdown: string): string {
  return createHash('md5').update(tableMarkdown).digest('hex').slice(0, 12);
}

/**
 * Convert a table to an image using CDP
 * @throws Error if CDP connection is not provided or rendering fails
 */
export async function renderTableAsImage(
  table: TableBlock,
  outputDir: string,
  cdp: CdpConnection,
  sessionId: string,
  verbose = false
): Promise<string> {
  const hash = hashTableContent(table.markdown);
  const imagePath = path.join(outputDir, `table_${hash}.png`);

  // Check if already exists
  if (fs.existsSync(imagePath)) {
    if (verbose) console.log(`[web-automation] Using cached table image: ${imagePath}`);
    return imagePath;
  }

  if (verbose) console.log(`[web-automation] Rendering table as image...`);

  const html = tableToHtml(table);
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

  try {
    // Navigate to the HTML content
    await cdp.send('Page.navigate', { url: dataUrl }, { sessionId });
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get the table element dimensions
    const { result: { value: dims } } = await cdp.send<{ result: { value: { width: number; height: number } } }>(
      'Runtime.evaluate',
      {
        expression: `(() => {
          const table = document.querySelector('table');
          if (!table) return { width: 800, height: 600 };
          return {
            width: Math.ceil(table.offsetWidth + 40),
            height: Math.ceil(table.offsetHeight + 40)
          };
        })()`,
        returnByValue: true,
      },
      { sessionId }
    );

    const width = Math.max(400, Math.min(dims?.width ?? 800, 2000));
    const height = Math.max(200, Math.min(dims?.height ?? 600, 4000));

    if (verbose) {
      console.log(`[web-automation] Table dimensions: ${width}x${height}`);
    }

    // Set viewport size
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2, // Retina quality
      mobile: false,
    }, { sessionId });

    // Capture screenshot
    const { data: screenshotData } = await cdp.send<{ data: string }>('Page.captureScreenshot', {
      format: 'png',
      quality: 95,
      clip: {
        x: 0,
        y: 0,
        width,
        height,
        scale: 1,
      },
    }, { sessionId });

    // Save screenshot
    const buffer = Buffer.from(screenshotData, 'base64');
    fs.writeFileSync(imagePath, buffer);

    if (verbose) console.log(`[web-automation] Table image saved: ${imagePath}`);

    return imagePath;
  } catch (error) {
    throw new Error(`Failed to render table as image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a text-based table representation (fallback)
 */
export function createTableTextRepresentation(
  table: TableBlock,
  outputDir: string
): { textPath: string; text: string } {
  const hash = hashTableContent(table.markdown);
  const textPath = path.join(outputDir, `table_${hash}.txt`);
  const text = tableToText(table);

  // Cache the text representation
  if (!fs.existsSync(textPath)) {
    fs.writeFileSync(textPath, text);
  }

  return { textPath, text };
}

/**
 * Convert table to ASCII text representation
 */
export function tableToText(table: TableBlock): string {
  const cells: string[][] = table.rows;

  // Calculate column widths
  const colWidths: number[] = [];
  for (let col = 0; col < cells[0]!.length; col++) {
    let maxLen = 0;
    for (const row of cells) {
      maxLen = Math.max(maxLen, row[col]?.length ?? 0);
    }
    colWidths.push(maxLen + 2);
  }

  const lines: string[] = [];

  // Separator line
  const separator = '+' + colWidths.map(w => '─'.repeat(w)).join('+') + '+';
  lines.push(separator);

  // Header
  lines.push('|' + cells[0]!.map((cell, i) => cell.padEnd(colWidths[i]!)).join('|') + '|');
  lines.push(separator);

  // Data rows
  for (let i = 1; i < cells.length; i++) {
    lines.push('|' + cells[i]!.map((cell, i) => cell.padEnd(colWidths[i]!)).join('|') + '|');
    lines.push(separator);
  }

  return lines.join('\n');
}

// ============================================================================
// Main Conversion Function
// ============================================================================

/**
 * Convert markdown tables and code blocks to platform-friendly formats
 *
 * @example
 * ```ts
 * import { convertTablesAndCodeBlocks } from '@wt/web-automation/table-code-converter';
 *
 * const converted = await convertTablesAndCodeBlocks(markdown, {
 *   outputDir: './images',
 *   renderTables: true,
 *   formatCodeBlocks: true,
 *   cdp: myCdpConnection,
 *   sessionId: mySessionId,
 * });
 * ```
 */
export async function convertTablesAndCodeBlocks(
  markdown: string,
  options: ConverterOptions = {}
): Promise<ConvertedContent> {
  const {
    outputDir = path.join(os.tmpdir(), 'web-automation-images'),
    renderTables = true,
    formatCodeBlocks = true,
    cdp,
    sessionId,
    verbose = false,
  } = options;

  // Create output directory
  await mkdir(outputDir, { recursive: true });

  const lines = markdown.split('\n');
  const convertedLines: string[] = [];
  const tables: ConvertedContent['tables'] = [];
  const codeBlocks: ConvertedContent['codeBlocks'] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;

    // Check for code block first (they take precedence)
    if (line.startsWith('```')) {
      const codeBlock = parseCodeBlock(lines, i);
      if (codeBlock) {
        const converted = formatCodeBlocks
          ? formatCodeBlockBordered(codeBlock)
          : codeBlock.markdown;

        codeBlocks.push({
          original: codeBlock.markdown,
          converted,
        });

        convertedLines.push(converted);
        i = codeBlock.endIndex;
        continue;
      }
    }

    // Check for table
    if (isTableLine(line) && containsTable(lines, i)) {
      if (verbose) {
        console.log(`[web-automation] Table detected at line ${i}: "${line}"`);
      }
      const table = parseTable(lines, i);
      if (table) {
        if (verbose) {
          console.log(`[web-automation] Parsed table with ${table.rows.length} rows`);
        }
        let imagePath = '';

        let fallback: { textPath: string; text: string } | undefined;
        let isTextFile = false;

        if (renderTables && cdp && sessionId) {
          // Use CDP to render table as image
          try {
            imagePath = await renderTableAsImage(table, outputDir, cdp, sessionId, verbose);
            if (imagePath.endsWith('.txt')) {
              isTextFile = true;
              fallback = createTableTextRepresentation(table, outputDir);
            }
          } catch (error) {
            if (verbose) {
              console.warn(`[web-automation] CDP render failed, using fallback: ${error}`);
            }
            fallback = createTableTextRepresentation(table, outputDir);
            imagePath = fallback.textPath;
            isTextFile = true;
          }
        } else {
          // No CDP available, use text fallback
          fallback = createTableTextRepresentation(table, outputDir);
          imagePath = fallback.textPath;
          isTextFile = true;
          if (verbose) {
            console.log(`[web-automation] Created text table at: ${imagePath}`);
          }
        }

        // If we have a real image (not .txt), use image reference
        // Otherwise, keep the original markdown table syntax
        if (isTextFile) {
          // Keep the original markdown table syntax - X Articles may render this better
          for (const line of table.markdown.split('\n')) {
            convertedLines.push(line);
          }
        } else {
          // Use image reference for actual image files
          convertedLines.push(``);
          convertedLines.push(`![Table](${imagePath})`);
          convertedLines.push(``);
        }

        tables.push({
          original: table.markdown,
          imagePath,
        });

        i = table.endIndex;
        continue;
      }
    }

    // Regular line, keep as-is
    convertedLines.push(line);
    i++;
  }

  return {
    markdown: convertedLines.join('\n'),
    tables,
    codeBlocks,
  };
}

/**
 * Detect if markdown contains tables or code blocks
 */
export function analyzeMarkdown(markdown: string): { hasTables: boolean; hasCodeBlocks: boolean } {
  const hasTables = /^\|.+?\|.*$/m.test(markdown);
  const hasCodeBlocks = /```[\s\S]*?```/.test(markdown);
  return { hasTables, hasCodeBlocks };
}
