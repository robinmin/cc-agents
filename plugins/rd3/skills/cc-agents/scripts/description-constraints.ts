export const AGENT_DESCRIPTION_MIN_LENGTH = 20;
export const AGENT_DESCRIPTION_RECOMMENDED_MAX_LENGTH = 1000;
export const CODEX_AGENT_DESCRIPTION_MAX_LENGTH = 1024;

const EXAMPLE_OPEN = '<example>';
const EXAMPLE_CLOSE = '</example>';
const COMMENTARY_OPEN = '<commentary>';
const COMMENTARY_CLOSE = '</commentary>';
const ELLIPSIS = '...';

export interface AgentDescriptionConstraintResult {
    value: string;
    changed: boolean;
    originalLength: number;
    truncated: boolean;
    preservedExample: boolean;
}

export function normalizeAgentDescription(description: string): string {
    return description.replace(/\r\n/g, '\n').trim();
}

export function truncateAgentDescriptionForCodex(description: string): AgentDescriptionConstraintResult {
    const normalized = normalizeAgentDescription(description);

    if (normalized.length <= CODEX_AGENT_DESCRIPTION_MAX_LENGTH) {
        return {
            value: normalized,
            changed: normalized !== description,
            originalLength: description.length,
            truncated: false,
            preservedExample: normalized.includes(EXAMPLE_OPEN),
        };
    }

    const intro = normalized.split(EXAMPLE_OPEN)[0].trim();
    const examples = normalized.match(/<example>[\s\S]*?<\/example>/g) || [];

    if (examples.length === 0) {
        const value = truncateInline(normalized, CODEX_AGENT_DESCRIPTION_MAX_LENGTH);
        return {
            value,
            changed: true,
            originalLength: description.length,
            truncated: true,
            preservedExample: false,
        };
    }

    let example = (examples[0] ?? '').trim();
    let value = [intro, example].filter(Boolean).join('\n\n');

    if (value.length > CODEX_AGENT_DESCRIPTION_MAX_LENGTH) {
        const separatorLength = intro ? 2 : 0;
        const minExampleBudget = Math.min(900, CODEX_AGENT_DESCRIPTION_MAX_LENGTH - 80);
        const introBudget = Math.max(80, CODEX_AGENT_DESCRIPTION_MAX_LENGTH - minExampleBudget - separatorLength);
        const compactIntro = truncateInline(intro, introBudget);
        const exampleBudget = CODEX_AGENT_DESCRIPTION_MAX_LENGTH - compactIntro.length - separatorLength;
        example = compactExampleBlock(example, exampleBudget);
        value = [compactIntro, example].filter(Boolean).join('\n\n');
    }

    if (value.length > CODEX_AGENT_DESCRIPTION_MAX_LENGTH) {
        value = truncateInline(value, CODEX_AGENT_DESCRIPTION_MAX_LENGTH);
        return {
            value,
            changed: true,
            originalLength: description.length,
            truncated: true,
            preservedExample: false,
        };
    }

    return {
        value,
        changed: true,
        originalLength: description.length,
        truncated: true,
        preservedExample: value.includes(EXAMPLE_OPEN),
    };
}

export function replaceDescriptionInMarkdownFrontmatter(content: string, description: string): string {
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatterMatch) {
        return content;
    }

    const frontmatter = frontmatterMatch[1];
    const lines = frontmatter.split(/\r?\n/);
    const descriptionIndex = lines.findIndex((line) => /^description:\s*/.test(line));

    if (descriptionIndex === -1) {
        return content;
    }

    let endIndex = descriptionIndex + 1;
    const isBlockScalar = /^description:\s*[>|]/.test(lines[descriptionIndex]);

    if (isBlockScalar) {
        while (
            endIndex < lines.length &&
            (lines[endIndex].startsWith(' ') || lines[endIndex].startsWith('\t') || lines[endIndex] === '')
        ) {
            endIndex += 1;
        }
    }

    const replacementLines = ['description: |', ...description.split('\n').map((line) => `  ${line}`)];
    lines.splice(descriptionIndex, endIndex - descriptionIndex, ...replacementLines);

    const updatedFrontmatter = lines.join('\n');
    return content.replace(frontmatterMatch[0], `---\n${updatedFrontmatter}\n---`);
}

function compactExampleBlock(block: string, maxLength: number): string {
    if (block.length <= maxLength) {
        return block;
    }

    const userLine = firstMatch(block, /^\s*user:\s*.+$/m);
    const assistantLine = firstMatch(block, /^\s*assistant:\s*.+$/m);
    const commentaryLine = firstMatch(block, /<commentary>[\s\S]*?<\/commentary>/m);

    let compact = [
        EXAMPLE_OPEN,
        userLine || 'user: "[Example user request]"',
        assistantLine || 'assistant: "[Example routing response]"',
        commentaryLine || `${COMMENTARY_OPEN}[Why this agent fits]${COMMENTARY_CLOSE}`,
        EXAMPLE_CLOSE,
    ].join('\n');

    if (compact.length <= maxLength) {
        return compact;
    }

    compact = [
        EXAMPLE_OPEN,
        truncateInline(userLine || 'user: "[Example user request]"', Math.max(40, maxLength - 80)),
        truncateInline(assistantLine || 'assistant: "[Example routing response]"', Math.max(40, maxLength - 80)),
        EXAMPLE_CLOSE,
    ].join('\n');

    if (compact.length <= maxLength) {
        return compact;
    }

    const available = Math.max(0, maxLength - (EXAMPLE_OPEN.length + EXAMPLE_CLOSE.length + 2));
    const fallbackBody = truncateInline(
        `${userLine || 'user: "[Example request]"'} ${assistantLine || 'assistant: "[Example response]"'}`,
        available,
    );

    return [EXAMPLE_OPEN, fallbackBody, EXAMPLE_CLOSE].join('\n');
}

function truncateInline(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
        return text;
    }

    if (maxLength <= ELLIPSIS.length) {
        return ELLIPSIS.slice(0, maxLength);
    }

    const budget = maxLength - ELLIPSIS.length;
    const sliced = text.slice(0, budget);
    const lastWhitespace = sliced.search(/\s\S*$/);
    const candidate = lastWhitespace > 40 ? sliced.slice(0, lastWhitespace) : sliced;
    return `${candidate.trimEnd().replace(/[,:;.\s-]+$/, '')}${ELLIPSIS}`;
}

function firstMatch(text: string, pattern: RegExp): string {
    const match = text.match(pattern);
    return match?.[0]?.trim() || '';
}
