import YAML from 'yaml';

export interface ParsedMarkdownFrontmatter {
    frontmatter: Record<string, unknown> | null;
    body: string;
    raw: string;
    parseError?: string;
}

export interface ParseMarkdownFrontmatterOptions {
    trimBodyWithoutFrontmatter?: boolean;
}

export function parseMarkdownFrontmatter(
    content: string,
    options: ParseMarkdownFrontmatterOptions = {},
): ParsedMarkdownFrontmatter {
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

    if (!fmMatch) {
        return {
            frontmatter: null,
            body: options.trimBodyWithoutFrontmatter ? content.trim() : content,
            raw: content,
        };
    }

    const yamlContent = fmMatch[1];
    const body = content.slice(fmMatch[0].length).trim();

    try {
        const parsed = YAML.parse(yamlContent);

        if (!parsed || typeof parsed !== 'object') {
            return {
                frontmatter: null,
                body,
                raw: content,
            };
        }

        return {
            frontmatter: parsed as Record<string, unknown>,
            body,
            raw: content,
        };
    } catch (error) {
        return {
            frontmatter: null,
            body,
            raw: content,
            parseError: error instanceof Error ? error.message : String(error),
        };
    }
}

export function detectUnknownFields(frontmatter: Record<string, unknown>, validFields: readonly string[]): string[] {
    const validSet = new Set<string>(validFields);
    const unknownFields: string[] = [];

    for (const key of Object.keys(frontmatter)) {
        if (!validSet.has(key)) {
            unknownFields.push(key);
        }
    }

    return unknownFields;
}

export function serializeMarkdownFrontmatter(frontmatter: Record<string, unknown>, body: string): string {
    const cleanFrontmatter: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(frontmatter)) {
        if (value !== undefined) {
            cleanFrontmatter[key] = value;
        }
    }

    const yamlStr = YAML.stringify(cleanFrontmatter, {
        lineWidth: 0,
        defaultKeyType: 'PLAIN',
        defaultStringType: 'QUOTE_DOUBLE',
    }).trim();

    return `---\n${yamlStr}\n---\n\n${body}`;
}
