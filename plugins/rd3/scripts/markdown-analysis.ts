const SECOND_PERSON_PATTERNS = [
    /\byou\s+(?:should|must|need|can|will|may)\b/i,
    /\byour\b/i,
    /\byou're\b/i,
    /\byou've\b/i,
];

export function extractMarkdownHeadings(markdown: string, maxLevel = 3): string[] {
    const sections: string[] = [];

    for (const line of markdown.split('\n')) {
        const sectionMatch = line.match(/^#{1,6}\s+(.+)/);
        if (!sectionMatch) {
            continue;
        }

        const level = line.match(/^#+/)?.[0].length ?? 0;
        if (level > 0 && level <= maxLevel) {
            sections.push(sectionMatch[1].trim());
        }
    }

    return sections;
}

export function filterNonCodeAndCommentLines(lines: string[]): string[] {
    const result: string[] = [];
    let inCodeBlock = false;
    let inComment = false;

    for (const line of lines) {
        if (line.trimStart().startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            continue;
        }
        if (inCodeBlock) continue;

        if (line.includes('<!--')) {
            inComment = true;
        }
        if (line.includes('-->')) {
            inComment = false;
            continue;
        }
        if (inComment) continue;

        result.push(line);
    }

    return result;
}

export function hasSecondPersonLanguage(content: string | string[]): boolean {
    const lines = Array.isArray(content) ? content : content.split('\n');
    const textLines = filterNonCodeAndCommentLines(lines);
    return textLines.some((line) => SECOND_PERSON_PATTERNS.some((pattern) => pattern.test(line)));
}

export function countTodoMarkers(content: string): number {
    return (content.match(/\bTODO\b/gi) || []).length;
}
