#!/usr/bin/env bun
/**
 * Markdown to HTML converter for research reports
 * Properly converts markdown sections to HTML while preserving structure and formatting
 */

import { logger } from '../../../scripts/logger';
import { parseCli } from '../../../scripts/libs/cli-args';
import { readFile } from '../../../scripts/utils';

interface ConvertResult {
    contentHtml: string;
    bibliographyHtml: string;
}

function convertMarkdownToHtml(markdownText: string): ConvertResult {
    // Split content and bibliography
    const parts = markdownText.split('## Bibliography');
    const contentMd = parts[0];
    const bibliographyMd = parts.length > 1 ? parts[1] : '';

    // Convert content (everything except bibliography)
    const contentHtml = convertContentSection(contentMd);

    // Convert bibliography separately
    const bibliographyHtml = convertBibliographySection(bibliographyMd);

    return { contentHtml, bibliographyHtml };
}

function convertContentSection(markdown: string): string {
    let html = markdown;

    // Remove title and front matter (first ## heading is handled separately)
    const lines = html.split('\n');
    const processedLines: string[] = [];
    let skipUntilFirstSection = true;

    for (const line of lines) {
        // Skip everything until we hit "## Executive Summary" or first major section
        if (skipUntilFirstSection) {
            if (line.startsWith('## ') && !line.startsWith('### ')) {
                skipUntilFirstSection = false;
                processedLines.push(line);
            }
            continue;
        }
        processedLines.push(line);
    }

    html = processedLines.join('\n');

    // Convert headers
    // ## Section Title → <div class="section"><h2 class="section-title">Section Title</h2>
    html = html.replace(/^## (.+)$/gm, '<div class="section"><h2 class="section-title">$1</h2>');

    // ### Subsection → <h3 class="subsection-title">Subsection</h3>
    html = html.replace(/^### (.+)$/gm, '<h3 class="subsection-title">$1</h3>');

    // #### Subsubsection → <h4 class="subsubsection-title">Title</h4>
    html = html.replace(/^#### (.+)$/gm, '<h4 class="subsubsection-title">$1</h4>');

    // Convert **bold** text
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Convert *italic* text
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Convert inline code `code`
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    // Convert unordered lists
    html = convertLists(html);

    // Convert tables
    html = convertTables(html);

    // Convert paragraphs (wrap non-HTML lines in <p> tags)
    html = convertParagraphs(html);

    // Close all open sections
    html = closeSections(html);

    // Wrap executive summary if present
    const execSummaryTag = '<h2 class="section-title">Executive Summary</h2>';
    const execIdx = html.indexOf(execSummaryTag);
    if (execIdx !== -1) {
        // Insert opening div before the exec summary heading
        html = `${html.slice(0, execIdx)}<div class="executive-summary">${html.slice(execIdx)}`;
        // Find the next <div class="section"> after the exec summary and close before it
        const afterExec = execIdx + '<div class="executive-summary">'.length + execSummaryTag.length;
        const nextSectionIdx = html.indexOf('<div class="section">', afterExec);
        if (nextSectionIdx !== -1) {
            html = `${html.slice(0, nextSectionIdx)}</div>${html.slice(nextSectionIdx)}`;
        } else {
            // No next section — close at the end
            html += '</div>';
        }
    }

    return html;
}

function convertBibliographySection(markdown: string): string {
    if (!markdown.trim()) {
        return '';
    }

    let html = markdown;

    // Convert each [N] citation to a proper bibliography entry
    // Look for patterns like [1] Title - URL
    html = html.replace(
        /\[(\d+)\]\s*(.+?)\s*-\s*(https?:\/\/[^\s)]+)/g,
        '<div class="bib-entry"><span class="bib-number">[$1]</span> <a href="$3" target="_blank">$2</a></div>',
    );

    // Convert any remaining **bold** sections
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Wrap in bibliography content div
    html = `<div class="bibliography-content">${html}</div>`;

    return html;
}

function convertLists(html: string): string {
    const lines = html.split('\n');
    const result: string[] = [];
    let inList = false;
    let listLevel = 0;
    let listType = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const stripped = line.trim();

        // Check for unordered list item
        if (stripped.startsWith('- ') || stripped.startsWith('* ')) {
            if (!inList) {
                result.push('<ul>');
                inList = true;
                listType = 'ul';
                listLevel = line.length - line.trimStart().length;
            }

            // Get the content after the marker
            const content = stripped.slice(2);
            result.push(`<li>${content}</li>`);
        }
        // Check for ordered list item
        else if (/^\d+\.\s/.test(stripped)) {
            if (!inList) {
                result.push('<ol>');
                inList = true;
                listType = 'ol';
                listLevel = line.length - line.trimStart().length;
            }

            // Get the content after the number and period
            const content = stripped.replace(/^\d+\.\s/, '');
            result.push(`<li>${content}</li>`);
        } else {
            // Not a list item
            if (inList) {
                // Check if we're still in the list (indented continuation)
                const currentLevel = line.length - line.trimStart().length;
                if (currentLevel > listLevel && stripped) {
                    // Continuation of previous list item
                    const lastItem = result[result.length - 1];
                    if (lastItem.endsWith('</li>')) {
                        result[result.length - 1] = `${lastItem.slice(0, -5)} ${stripped}</li>`;
                        continue;
                    }
                } else {
                    // End of list
                    result.push(listType === 'ul' ? '</ul>' : '</ol>');
                    inList = false;
                    listLevel = 0;
                    listType = '';
                }
            }

            result.push(line);
        }
    }

    // Close any remaining open list
    if (inList) {
        result.push(listType === 'ul' ? '</ul>' : '</ol>');
    }

    return result.join('\n');
}

function convertTables(html: string): string {
    const lines = html.split('\n');
    const result: string[] = [];
    let inTable = false;

    for (const line of lines) {
        if (line.includes('|') && line.trim().startsWith('|')) {
            if (!inTable) {
                result.push('<table>');
                inTable = true;
                // This is the header row
                const cells = line
                    .split('|')
                    .slice(1, -1)
                    .map((c) => c.trim());
                result.push('<thead><tr>');
                for (const cell of cells) {
                    result.push(`<th>${cell}</th>`);
                }
                result.push('</tr></thead>');
                result.push('<tbody>');
            } else if (line.includes('---')) {
            } else {
                // Data row
                const cells = line
                    .split('|')
                    .slice(1, -1)
                    .map((c) => c.trim());
                result.push('<tr>');
                for (const cell of cells) {
                    result.push(`<td>${cell}</td>`);
                }
                result.push('</tr>');
            }
        } else {
            if (inTable) {
                result.push('</tbody></table>');
                inTable = false;
            }
            result.push(line);
        }
    }

    if (inTable) {
        result.push('</tbody></table>');
    }

    return result.join('\n');
}

function convertParagraphs(html: string): string {
    const lines = html.split('\n');
    const result: string[] = [];
    let inParagraph = false;

    const htmlTags = ['<h', '<div', '<ul', '<ol', '<li', '<table', '<thead', '<tbody', '<tr', '<th', '<td'];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const stripped = line.trim();

        // Skip empty lines
        if (!stripped) {
            if (inParagraph) {
                result.push('</p>');
                inParagraph = false;
            }
            result.push(line);
            continue;
        }

        // Skip lines that are already HTML tags
        const isHtmlTag = stripped.startsWith('<') && stripped.endsWith('>');
        const isClosingTag = stripped.startsWith('</');
        const isHtmlLike = htmlTags.some((tag) => stripped.includes(tag));

        if (isHtmlTag || isClosingTag || isHtmlLike) {
            if (inParagraph) {
                result.push('</p>');
                inParagraph = false;
            }
            result.push(line);
            continue;
        }

        // Regular text line - wrap in paragraph
        if (!inParagraph) {
            result.push(`<p>${line}`);
            inParagraph = true;
        } else {
            result.push(line);
        }
    }

    if (inParagraph) {
        result.push('</p>');
    }

    return result.join('\n');
}

function closeSections(html: string): string {
    const lines = html.split('\n');
    const result: string[] = [];
    let sectionOpen = false;

    for (const line of lines) {
        if (line.includes('<div class="section">')) {
            if (sectionOpen) {
                result.push('</div>'); // Close previous section
            }
            sectionOpen = true;
        }
        result.push(line);
    }

    // Close final section if still open
    if (sectionOpen) {
        result.push('</div>');
    }

    return result.join('\n');
}

function main(): void {
    const { positionals } = parseCli(
        {
            name: 'md_to_html.ts',
            description: 'Convert markdown research reports to structured HTML',
            options: {},
            allowPositionals: true,
            examples: ['bun md_to_html.ts report.md'],
        },
    );

    const mdFile = positionals[0];
    if (!mdFile) {
        logger.error('Error: markdown file path is required');
        process.exit(1);
    }

    try {
        const markdownText = readFile(mdFile);
        const { contentHtml, bibliographyHtml } = convertMarkdownToHtml(markdownText);

        logger.log('=== CONTENT HTML ===');
        logger.log(contentHtml.slice(0, 1000));
        logger.log('\n=== BIBLIOGRAPHY HTML ===');
        logger.log(bibliographyHtml.slice(0, 500));
    } catch (_e) {
        logger.error(`Error: File not found or cannot be read: ${mdFile}`);
        process.exit(1);
    }
}

export type { ConvertResult };
export { convertMarkdownToHtml };

if (import.meta.main) {
    main();
}
