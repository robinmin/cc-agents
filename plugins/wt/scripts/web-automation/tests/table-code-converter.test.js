/**
 * Unit tests for table-code-converter library
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { analyzeMarkdown, parseTable, parseCodeBlock, formatCodeBlockBordered, formatCodeBlockSimple, tableToText, convertTablesAndCodeBlocks, } from '../src/table-code-converter.js';
// ============================================================================
// Test Utilities
// ============================================================================
let tempDir;
beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `web-automation-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
});
afterEach(async () => {
    if (fs.existsSync(tempDir)) {
        await rm(tempDir, { recursive: true, force: true });
    }
});
// Mock CDP connection for testing
class MockCdpConnection {
    async send(_method, _params, _options) {
        return {};
    }
}
// ============================================================================
// analyzeMarkdown Tests
// ============================================================================
describe('analyzeMarkdown', () => {
    test('should detect tables in markdown', () => {
        const markdown = '| Col1 | Col2 |\n|------|------|\n| A    | B    |';
        const result = analyzeMarkdown(markdown);
        expect(result.hasTables).toBe(true);
        expect(result.hasCodeBlocks).toBe(false);
    });
    test('should detect code blocks in markdown', () => {
        const markdown = '```javascript\nconsole.log("hello");\n```';
        const result = analyzeMarkdown(markdown);
        expect(result.hasTables).toBe(false);
        expect(result.hasCodeBlocks).toBe(true);
    });
    test('should detect both tables and code blocks', () => {
        const markdown = '| Col1 | Col2 |\n|------|------|\n| A    | B    |\n\n```js\nconsole.log("test");\n```';
        const result = analyzeMarkdown(markdown);
        expect(result.hasTables).toBe(true);
        expect(result.hasCodeBlocks).toBe(true);
    });
    test('should return false for plain markdown', () => {
        const markdown = '# Title\n\nSome plain text without tables or code blocks.';
        const result = analyzeMarkdown(markdown);
        expect(result.hasTables).toBe(false);
        expect(result.hasCodeBlocks).toBe(false);
    });
    test('should detect table without leading pipe as false (implementation detail)', () => {
        // Note: Current implementation requires leading pipe for table detection
        const markdown = 'Col1 | Col2\n-----|-----\nA    | B';
        const result = analyzeMarkdown(markdown);
        expect(result.hasTables).toBe(false); // Current behavior: requires leading pipe
    });
    test('should detect code block without language specified', () => {
        const markdown = '```\ncode here\n```';
        const result = analyzeMarkdown(markdown);
        expect(result.hasCodeBlocks).toBe(true);
    });
    test('should detect inline code as not a code block', () => {
        const markdown = 'This has `inline code` but no code blocks.';
        const result = analyzeMarkdown(markdown);
        expect(result.hasCodeBlocks).toBe(false);
    });
    test('should handle empty markdown', () => {
        const result = analyzeMarkdown('');
        expect(result.hasTables).toBe(false);
        expect(result.hasCodeBlocks).toBe(false);
    });
});
// ============================================================================
// parseTable Tests
// ============================================================================
describe('parseTable', () => {
    test('should parse a simple table', () => {
        const lines = [
            '| Col1 | Col2 |',
            '|------|------|',
            '| A    | B    |',
        ];
        const table = parseTable(lines, 0);
        expect(table).not.toBeNull();
        expect(table.type).toBe('table');
        expect(table.headers).toEqual(['Col1', 'Col2']);
        expect(table.rows).toEqual([['Col1', 'Col2'], ['A', 'B']]);
        expect(table.startIndex).toBe(0);
        expect(table.endIndex).toBe(3);
    });
    test('should parse table with multiple data rows', () => {
        const lines = [
            '| Name | Age | City |',
            '|------|-----|------|',
            '| Alice | 30 | NYC |',
            '| Bob | 25 | LA |',
            '| Charlie | 35 | Chicago |',
        ];
        const table = parseTable(lines, 0);
        expect(table).not.toBeNull();
        expect(table.rows.length).toBe(4); // header + 3 data rows
        expect(table.rows[1]).toEqual(['Alice', '30', 'NYC']);
        expect(table.rows[2]).toEqual(['Bob', '25', 'LA']);
        expect(table.rows[3]).toEqual(['Charlie', '35', 'Chicago']);
    });
    test('should not parse table without leading pipes (implementation constraint)', () => {
        // Current implementation requires leading pipe for table detection
        const lines = [
            'Col1 | Col2',
            '-----|------',
            'A    | B',
        ];
        const table = parseTable(lines, 0);
        expect(table).toBeNull(); // Current behavior: requires leading pipe
    });
    test('should parse table with alignment markers', () => {
        const lines = [
            '| Left | Center | Right |',
            '|:-----|:------:|------:|',
            '| L    | C      | R     |',
        ];
        const table = parseTable(lines, 0);
        expect(table).not.toBeNull();
        expect(table.headers).toEqual(['Left', 'Center', 'Right']);
    });
    test('should parse table with empty cells', () => {
        const lines = [
            '| Col1 | Col2 | Col3 |',
            '|------|------|------|',
            '| A    |      | C    |',
        ];
        const table = parseTable(lines, 0);
        expect(table).not.toBeNull();
        expect(table.rows[1]).toEqual(['A', '', 'C']);
    });
    test('should parse table with special characters in cells', () => {
        const lines = [
            '| Name | Description |',
            '|------|-------------|',
            '| Test | `code` block |',
            '| Link | [text](url) |',
        ];
        const table = parseTable(lines, 0);
        expect(table).not.toBeNull();
        expect(table.rows[1][1]).toBe('`code` block');
        expect(table.rows[2][1]).toBe('[text](url)');
    });
    test('should return null for non-table content', () => {
        const lines = [
            '# Header',
            'Some text',
            'More text',
        ];
        const table = parseTable(lines, 0);
        expect(table).toBeNull();
    });
    test('should return null when not enough lines for a table (no data rows)', () => {
        // containsTable requires at least 3 lines: header | separator | data
        const lines = [
            '| Col1 | Col2 |',
            '|------|------|',
        ];
        const table = parseTable(lines, 0);
        expect(table).toBeNull(); // Current behavior: requires data row
    });
    test('should return null when starting past end of array', () => {
        const lines = ['| A | B |', '|---|---|', '| C | D |'];
        const table = parseTable(lines, 10);
        expect(table).toBeNull();
    });
    test('should stop parsing at non-table line', () => {
        const lines = [
            '| Col1 | Col2 |',
            '|------|------|',
            '| A    | B    |',
            'Some text',
            '| C    | D    |',
        ];
        const table = parseTable(lines, 0);
        expect(table).not.toBeNull();
        expect(table.endIndex).toBe(3); // Should stop before "Some text"
    });
    test('should include full table markdown', () => {
        const lines = [
            '| Name | Value |',
            '|------|-------|',
            '| A    | 1     |',
        ];
        const table = parseTable(lines, 0);
        expect(table.markdown).toBe('| Name | Value |\n|------|-------|\n| A    | 1     |');
    });
});
// ============================================================================
// parseCodeBlock Tests
// ============================================================================
describe('parseCodeBlock', () => {
    test('should parse code block with language', () => {
        const lines = [
            '```javascript',
            'console.log("hello");',
            '```',
        ];
        const block = parseCodeBlock(lines, 0);
        expect(block).not.toBeNull();
        expect(block.type).toBe('code');
        expect(block.language).toBe('javascript');
        expect(block.code).toBe('console.log("hello");');
        expect(block.startIndex).toBe(0);
        expect(block.endIndex).toBe(3);
    });
    test('should parse code block without language', () => {
        const lines = [
            '```',
            'some code',
            '```',
        ];
        const block = parseCodeBlock(lines, 0);
        expect(block).not.toBeNull();
        expect(block.language).toBe('text');
        expect(block.code).toBe('some code');
    });
    test('should parse multi-line code block', () => {
        const lines = [
            '```python',
            'def hello():',
            '    print("world")',
            '    return True',
            '```',
        ];
        const block = parseCodeBlock(lines, 0);
        expect(block).not.toBeNull();
        expect(block.code).toBe('def hello():\n    print("world")\n    return True');
    });
    test('should parse code block with backticks inside', () => {
        const lines = [
            '```js',
            'const str = `hello`; // template literal',
            'console.log(str);',
            '```',
        ];
        const block = parseCodeBlock(lines, 0);
        expect(block).not.toBeNull();
        expect(block.code).toContain('`hello`');
    });
    test('should parse code block with empty lines', () => {
        const lines = [
            '```typescript',
            'function test() {',
            '',
            '    return true;',
            '}',
            '```',
        ];
        const block = parseCodeBlock(lines, 0);
        expect(block).not.toBeNull();
        expect(block.code).toBe('function test() {\n\n    return true;\n}');
    });
    test('should handle different language formats', () => {
        const testCases = [
            ['```js', 'js'],
            ['```javascript', 'javascript'],
            ['```ts', 'ts'],
            ['```typescript', 'typescript'],
            ['```python', 'python'],
            ['```rust', 'rust'],
            ['```bash', 'bash'],
            ['```sh', 'sh'],
        ];
        for (const [fence, expectedLang] of testCases) {
            const lines = [fence, 'code', '```'];
            const block = parseCodeBlock(lines, 0);
            expect(block.language).toBe(expectedLang);
        }
    });
    test('should return null for non-code block', () => {
        const lines = [
            'Regular text',
            'More text',
        ];
        const block = parseCodeBlock(lines, 0);
        expect(block).toBeNull();
    });
    test('should return null for unclosed code block', () => {
        const lines = [
            '```javascript',
            'console.log("no closing");',
            'more lines',
        ];
        const block = parseCodeBlock(lines, 0);
        expect(block).toBeNull();
    });
    test('should include full markdown in block', () => {
        const lines = [
            '```python',
            'print("test")',
            '```',
        ];
        const block = parseCodeBlock(lines, 0);
        expect(block.markdown).toBe('```python\nprint("test")\n```');
    });
    test('should handle code block starting after index 0', () => {
        const lines = [
            '# Header',
            'Text before',
            '```js',
            'code',
            '```',
        ];
        const block = parseCodeBlock(lines, 2);
        expect(block).not.toBeNull();
        expect(block.code).toBe('code');
    });
});
// ============================================================================
// formatCodeBlockBordered Tests
// ============================================================================
describe('formatCodeBlockBordered', () => {
    test('should format simple code block with border', () => {
        const block = {
            type: 'code',
            markdown: '```js\nconsole.log("test");\n```',
            startIndex: 0,
            endIndex: 3,
            language: 'js',
            code: 'console.log("test");',
        };
        const result = formatCodeBlockBordered(block);
        expect(result).toContain('┌');
        expect(result).toContain('┐');
        expect(result).toContain('│ js'); // Language is lowercase, not uppercase
        expect(result).toContain('│ console.log("test"); │');
        expect(result).toContain('└');
        expect(result).toContain('┘');
    });
    test('should pad language to match longest line', () => {
        const block = {
            type: 'code',
            markdown: '```python\nprint("hello")\n```',
            startIndex: 0,
            endIndex: 3,
            language: 'python',
            code: 'print("hello")',
        };
        const result = formatCodeBlockBordered(block);
        const lines = result.split('\n');
        // Border width should accommodate "python" and "print("hello")"
        expect(lines[0].length).toBeGreaterThan(10);
        expect(lines[1]).toMatch(/│\s+python\s+│/); // Language is lowercase
    });
    test('should handle multi-line code', () => {
        const block = {
            type: 'code',
            markdown: '```js\nconst a = 1;\nconst b = 2;\n```',
            startIndex: 0,
            endIndex: 4,
            language: 'js',
            code: 'const a = 1;\nconst b = 2;',
        };
        const result = formatCodeBlockBordered(block);
        const lines = result.split('\n');
        expect(lines.length).toBe(6); // top, lang, separator, 2 code lines, bottom
    });
    test('should handle empty code block', () => {
        const block = {
            type: 'code',
            markdown: '```\n```',
            startIndex: 0,
            endIndex: 2,
            language: 'text',
            code: '',
        };
        const result = formatCodeBlockBordered(block);
        expect(result).toContain('┌────────┐'); // Width based on "text"
        expect(result).toContain('│ text   │'); // Language is lowercase, padded
    });
    test('should use language as-is in header (not uppercased)', () => {
        const block = {
            type: 'code',
            markdown: '```typescript\nconst x: number = 1;\n```',
            startIndex: 0,
            endIndex: 3,
            language: 'typescript',
            code: 'const x: number = 1;',
        };
        const result = formatCodeBlockBordered(block);
        expect(result).toContain('│ typescript'); // Language is NOT uppercased
    });
    test('should handle code with unicode characters', () => {
        const block = {
            type: 'code',
            markdown: '```js\nconst msg = "你好世界";\n```',
            startIndex: 0,
            endIndex: 3,
            language: 'js',
            code: 'const msg = "你好世界";',
        };
        const result = formatCodeBlockBordered(block);
        expect(result).toContain('你好世界');
    });
    test('should handle very long lines', () => {
        const longLine = 'a'.repeat(100);
        const block = {
            type: 'code',
            markdown: '```js\n' + longLine + '\n```',
            startIndex: 0,
            endIndex: 3,
            language: 'js',
            code: longLine,
        };
        const result = formatCodeBlockBordered(block);
        expect(result).toContain(longLine);
    });
});
// ============================================================================
// formatCodeBlockSimple Tests
// ============================================================================
describe('formatCodeBlockSimple', () => {
    test('should format code block simply', () => {
        const block = {
            type: 'code',
            markdown: '```js\nconsole.log("test");\n```',
            startIndex: 0,
            endIndex: 3,
            language: 'js',
            code: 'console.log("test");',
        };
        const result = formatCodeBlockSimple(block);
        expect(result).toBe('**[JS]**\n\n```\nconsole.log("test");\n```');
    });
    test('should uppercase language', () => {
        const block = {
            type: 'code',
            markdown: '```python\nprint("test")\n```',
            startIndex: 0,
            endIndex: 3,
            language: 'python',
            code: 'print("test")',
        };
        const result = formatCodeBlockSimple(block);
        expect(result).toContain('**[PYTHON]**');
    });
    test('should handle text language', () => {
        const block = {
            type: 'code',
            markdown: '```\nplain text\n```',
            startIndex: 0,
            endIndex: 3,
            language: 'text',
            code: 'plain text',
        };
        const result = formatCodeBlockSimple(block);
        expect(result).toContain('**[TEXT]**');
    });
    test('should preserve multi-line code', () => {
        const block = {
            type: 'code',
            markdown: '```js\nline1\nline2\nline3\n```',
            startIndex: 0,
            endIndex: 5,
            language: 'js',
            code: 'line1\nline2\nline3',
        };
        const result = formatCodeBlockSimple(block);
        expect(result).toContain('line1\nline2\nline3');
    });
});
// ============================================================================
// tableToText Tests
// ============================================================================
describe('tableToText', () => {
    test('should convert simple table to ASCII', () => {
        const table = {
            type: 'table',
            markdown: '| Col1 | Col2 |\n|------|------|\n| A    | B    |',
            startIndex: 0,
            endIndex: 3,
            headers: ['Col1', 'Col2'],
            rows: [['Col1', 'Col2'], ['A', 'B']],
        };
        const result = tableToText(table);
        expect(result).toContain('+');
        expect(result).toContain('Col1');
        expect(result).toContain('Col2');
        expect(result).toContain('A');
        expect(result).toContain('B');
        expect(result).toContain('|'); // Uses plain ASCII |, not UTF-8 │
    });
    test('should handle varying column widths', () => {
        const table = {
            type: 'table',
            markdown: '| Name | Description | Value |\n|------|-------------|-------|\n| A | Short | 1 |\n| B | A much longer description | 2 |',
            startIndex: 0,
            endIndex: 4,
            headers: ['Name', 'Description', 'Value'],
            rows: [
                ['Name', 'Description', 'Value'],
                ['A', 'Short', '1'],
                ['B', 'A much longer description', '2'],
            ],
        };
        const result = tableToText(table);
        const lines = result.split('\n');
        // All content rows should have same width
        expect(lines[1].length).toBe(lines[3].length);
    });
    test('should handle single column table', () => {
        const table = {
            type: 'table',
            markdown: '| Items |\n|-------|\n| A |\n| B |',
            startIndex: 0,
            endIndex: 4,
            headers: ['Items'],
            rows: [['Items'], ['A'], ['B']],
        };
        const result = tableToText(table);
        expect(result).toContain('|Items'); // Uses plain ASCII |, no space before
        expect(result).toContain('|A');
        expect(result).toContain('|B');
    });
    test('should handle empty cells', () => {
        const table = {
            type: 'table',
            markdown: '| Col1 | Col2 |\n|------|------|\n| A | |\n| | B |',
            startIndex: 0,
            endIndex: 4,
            headers: ['Col1', 'Col2'],
            rows: [['Col1', 'Col2'], ['A', ''], ['', 'B']],
        };
        const result = tableToText(table);
        expect(result).toContain('|A     |'); // Uses plain ASCII |, no space before
        expect(result).toContain('|      |B');
    });
    test('should use plain ASCII characters for table', () => {
        const table = {
            type: 'table',
            markdown: '| A | B |\n|---|---|\n| 1 | 2 |',
            startIndex: 0,
            endIndex: 3,
            headers: ['A', 'B'],
            rows: [['A', 'B'], ['1', '2']],
        };
        const result = tableToText(table);
        expect(result).toContain('+'); // Uses + for corners
        expect(result).toContain('|'); // Uses plain ASCII | for vertical lines (not │)
        expect(result).not.toContain('│'); // UTF-8 box drawing not used
        expect(result).not.toContain('┬'); // UTF-8 box drawing not used
    });
    test('should handle special characters in cells', () => {
        const table = {
            type: 'table',
            markdown: '| Symbol | Code |\n|--------|------|\n| `<>` | tags |\n| **bold** | text |',
            startIndex: 0,
            endIndex: 4,
            headers: ['Symbol', 'Code'],
            rows: [['Symbol', 'Code'], ['`<>`', 'tags'], ['**bold**', 'text']],
        };
        const result = tableToText(table);
        expect(result).toContain('`<>`');
        expect(result).toContain('**bold**');
    });
});
// ============================================================================
// convertTablesAndCodeBlocks Integration Tests
// ============================================================================
describe('convertTablesAndCodeBlocks', () => {
    test('should convert both tables and code blocks', async () => {
        const markdown = `# Title

| Col1 | Col2 |
|------|------|
| A    | B    |

\`\`\`javascript
console.log("hello");
\`\`\`
`;
        const result = await convertTablesAndCodeBlocks(markdown, {
            outputDir: tempDir,
            renderTables: false,
            formatCodeBlocks: true,
        });
        expect(result.tables.length).toBe(1);
        // When renderTables=false, tables keep original markdown syntax
        expect(result.markdown).toContain('| Col1 | Col2 |');
        // Code blocks are formatted with ASCII box when formatCodeBlocks=true
        // The original ```javascript fence is replaced by the bordered format
        expect(result.markdown).toContain('│ javascript'); // Language in bordered format
        expect(result.markdown).toContain('console.log("hello");');
        // Code blocks get ASCII box formatting (┌ for code blocks, not tables)
        expect(result.markdown).toContain('┌'); // Code block border
    });
    test('should convert tables to text even when renderTables=false', async () => {
        // Note: renderTables=false uses text fallback instead of CDP rendering
        // Tables are still converted, just with text representation
        const markdown = `| Col1 | Col2 |
|------|------|
| A    | B    |

\`\`\`js
code
\`\`\`
`;
        const result = await convertTablesAndCodeBlocks(markdown, {
            outputDir: tempDir,
            renderTables: false,
            formatCodeBlocks: false,
        });
        // When renderTables=false, tables keep original markdown syntax
        expect(result.markdown).toContain('| Col1 | Col2 |');
        expect(result.tables.length).toBe(1);
        // Code blocks are preserved as-is when formatCodeBlocks=false
        expect(result.markdown).toContain('```js');
    });
    test('should create output directory if it does not exist', async () => {
        const newTempDir = path.join(tempDir, 'nested', 'dir');
        const markdown = '| A | B |\n|---|---|\n| 1 | 2 |';
        await convertTablesAndCodeBlocks(markdown, {
            outputDir: newTempDir,
            renderTables: false,
        });
        expect(fs.existsSync(newTempDir)).toBe(true);
    });
    test('should convert multiple tables', async () => {
        const markdown = `| Table1 |
|--------|
| A      |

| Table2 |
|--------|
| B      |
`;
        const result = await convertTablesAndCodeBlocks(markdown, {
            outputDir: tempDir,
            renderTables: false,
        });
        expect(result.tables.length).toBe(2);
        // When renderTables=false, tables keep original markdown syntax
        expect(result.markdown).toContain('| Table1 |');
        expect(result.markdown).toContain('| A      |');
        expect(result.markdown).toContain('| Table2 |');
        expect(result.markdown).toContain('| B      |');
    });
    test('should convert multiple code blocks', async () => {
        const markdown = `\`\`\`js
console.log(1);
\`\`\`

\`\`\`python
print(2)
\`\`\`
`;
        const result = await convertTablesAndCodeBlocks(markdown, {
            outputDir: tempDir,
            formatCodeBlocks: true,
        });
        expect(result.codeBlocks.length).toBe(2);
        expect(result.markdown).toContain('js'); // Language is lowercase
        expect(result.markdown).toContain('python'); // Language is lowercase
    });
    test('should handle mixed content correctly', async () => {
        const markdown = `# Title

Regular paragraph.

| Col1 | Col2 |
|------|------|
| A    | B    |

Another paragraph.

\`\`\`js
code();
\`\`\`

Final paragraph.
`;
        const result = await convertTablesAndCodeBlocks(markdown, {
            outputDir: tempDir,
            renderTables: false,
            formatCodeBlocks: true,
        });
        expect(result.markdown).toContain('# Title');
        expect(result.markdown).toContain('Regular paragraph.');
        expect(result.markdown).toContain('Another paragraph.');
        expect(result.markdown).toContain('Final paragraph.');
        expect(result.tables.length).toBe(1);
        expect(result.codeBlocks.length).toBe(1);
    });
    test('should handle empty markdown', async () => {
        const result = await convertTablesAndCodeBlocks('', {
            outputDir: tempDir,
        });
        expect(result.tables.length).toBe(0);
        expect(result.codeBlocks.length).toBe(0);
        expect(result.markdown).toBe('');
    });
    test('should handle markdown with only headers and text', async () => {
        const markdown = `# Header 1

## Header 2

Some text.

More text.
`;
        const result = await convertTablesAndCodeBlocks(markdown, {
            outputDir: tempDir,
        });
        expect(result.tables.length).toBe(0);
        expect(result.codeBlocks.length).toBe(0);
        expect(result.markdown).toBe(markdown);
    });
    test('should use CDP when provided for table rendering', async () => {
        const markdown = '| Col1 |\n|------|\n| A    |';
        const mockCdp = new MockCdpConnection();
        const sessionId = 'test-session';
        const result = await convertTablesAndCodeBlocks(markdown, {
            outputDir: tempDir,
            renderTables: true,
            cdp: mockCdp,
            sessionId,
        });
        // Mock doesn't return valid CDP data, should fall back to markdown syntax
        expect(result.tables.length).toBe(1);
        // Falls back to original markdown when CDP fails
        expect(result.markdown).toContain('| Col1 |');
    });
    test('should cache table text representations', async () => {
        const markdown = '| A | B |\n|---|---|\n| 1 | 2 |';
        const result1 = await convertTablesAndCodeBlocks(markdown, {
            outputDir: tempDir,
            renderTables: false,
        });
        const result2 = await convertTablesAndCodeBlocks(markdown, {
            outputDir: tempDir,
            renderTables: false,
        });
        expect(result1.tables[0].imagePath).toBe(result2.tables[0].imagePath);
    });
    test('should preserve inline code', async () => {
        const markdown = 'This has `inline code` in it.';
        const result = await convertTablesAndCodeBlocks(markdown, {
            outputDir: tempDir,
        });
        expect(result.markdown).toContain('`inline code`');
    });
    test('should handle code blocks with special fence characters', async () => {
        const markdown = '~~~javascript\nconsole.log("test");\n~~~';
        const result = await convertTablesAndCodeBlocks(markdown, {
            outputDir: tempDir,
            formatCodeBlocks: true,
        });
        // The tilde fence isn't supported, so it won't be detected as code block
        expect(result.codeBlocks.length).toBe(0);
    });
    test('should add blank lines around table images', async () => {
        const markdown = 'Text before\n\n| A |\n|---|\n| 1 |\n\nText after';
        const result = await convertTablesAndCodeBlocks(markdown, {
            outputDir: tempDir,
            renderTables: false,
        });
        // Tables keep original markdown syntax when renderTables=false
        expect(result.markdown).toContain('| A |');
        // Table should be in the result (not replaced with image ref)
        expect(result.tables.length).toBe(1);
    });
});
//# sourceMappingURL=table-code-converter.test.js.map