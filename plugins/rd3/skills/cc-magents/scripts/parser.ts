import { inferPlatformFromPath, getCapability } from './capabilities';
import type {
    AgentRule,
    DocumentMetadata,
    InstructionDocument,
    MainAgentWorkspace,
    MarkdownSection,
    MemoryPolicy,
    PermissionPolicy,
    PersonaProfile,
    PlatformId,
} from './types';

export function parseFrontmatter(content: string): { data: Record<string, unknown>; body: string } {
    if (!content.startsWith('---\n')) return { data: {}, body: content };
    const end = content.indexOf('\n---', 4);
    if (end === -1) return { data: {}, body: content };
    const raw = content.slice(4, end).trim();
    const body = content.slice(end + 4).replace(/^\n/, '');
    const data: Record<string, unknown> = {};
    for (const line of raw.split('\n')) {
        const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!match) continue;
        const [, key, value = ''] = match;
        if (value === 'true') data[key] = true;
        else if (value === 'false') data[key] = false;
        else data[key] = value.replace(/^["']|["']$/g, '');
    }
    return { data, body };
}

export function parseMarkdownSections(content: string): MarkdownSection[] {
    const sections: MarkdownSection[] = [];
    const headingPattern = /^(#{1,6})\s+(.+)$/gm;
    const matches = [...content.matchAll(headingPattern)];
    for (let index = 0; index < matches.length; index += 1) {
        const match = matches[index];
        const next = matches[index + 1];
        const level = match[1].length;
        const heading = match[2].trim();
        const start = (match.index ?? 0) + match[0].length;
        const end = next?.index ?? content.length;
        sections.push({ level, heading, content: content.slice(start, end).trim() });
    }
    if (sections.length === 0 && content.trim().length > 0) {
        sections.push({ level: 1, heading: 'Instructions', content: content.trim() });
    }
    return sections;
}

export function extractImports(content: string): string[] {
    const imports = new Set<string>();
    for (const match of content.matchAll(/(^|\s)@([~./A-Za-z0-9_-][^\s)`]+)/g)) {
        imports.add(match[2].replace(/[.,;:]+$/, ''));
    }
    return [...imports];
}

export function parseInstructionDocument(path: string, content: string, platform?: PlatformId): InstructionDocument {
    const resolvedPlatform = platform ?? inferPlatformFromPath(path);
    const { data, body } = parseFrontmatter(content);
    const sections = parseMarkdownSections(body);
    const metadata: DocumentMetadata = {
        imports: extractImports(body),
        ...(sections[0]?.heading ? { title: sections[0].heading } : {}),
        ...(Object.keys(data).length > 0 ? { frontmatter: data } : {}),
    };
    return {
        path,
        platform: resolvedPlatform,
        content,
        sections,
        metadata,
    };
}

export function workspaceFromDocuments(documents: InstructionDocument[]): MainAgentWorkspace {
    const rules = documents.flatMap(extractRules);
    const personas = documents.flatMap(extractPersonas);
    const memories = documents.flatMap(extractMemories);
    const permissions = documents.flatMap(extractPermissions);
    const platformIds = new Set<PlatformId>(documents.map((document) => document.platform));
    const platformBindings = [...platformIds].map((platform) => ({
        platform,
        capability: getCapability(platform),
    }));
    const sourceEvidence = platformBindings.flatMap((binding) => binding.capability.sources);
    return {
        documents,
        rules,
        personas,
        memories,
        permissions,
        platformBindings,
        sourceEvidence,
    };
}

function extractRules(document: InstructionDocument): AgentRule[] {
    return document.sections.map((section) => {
        const frontmatter = document.metadata.frontmatter ?? {};
        const globs = extractGlobs(frontmatter, section.content);
        return {
            name: section.heading,
            content: section.content,
            activation: globs.length > 0 ? 'glob' : 'always',
            scope: globs.length > 0 ? 'path' : document.platform === 'agents-md' ? 'directory' : 'project',
            globs,
            sourcePath: document.path,
        };
    });
}

function extractGlobs(frontmatter: Record<string, unknown>, content: string): string[] {
    const values: string[] = [];
    for (const key of ['globs', 'glob', 'paths', 'applyTo']) {
        const value = frontmatter[key];
        if (typeof value === 'string')
            values.push(
                ...value
                    .split(',')
                    .map((entry) => entry.trim())
                    .filter(Boolean),
            );
    }
    for (const match of content.matchAll(/`([^`*]*(?:\*|\*\*)[^`]*)`/g)) {
        values.push(match[1]);
    }
    return [...new Set(values)];
}

function extractPersonas(document: InstructionDocument): PersonaProfile[] {
    const text = document.content;
    const hasPersona =
        /persona|identity|role|tone|soul/i.test(text) ||
        ['SOUL.md', 'IDENTITY.md'].some((name) => document.path.endsWith(name));
    if (!hasPersona) return [];
    const role = text.match(/(?:role|title):\s*(.+)/i)?.[1]?.trim();
    const tone = text.match(/(?:tone|vibe):\s*(.+)/i)?.[1]?.trim();
    return [{ sourcePath: document.path, ...(role ? { role } : {}), ...(tone ? { tone } : {}) }];
}

function extractMemories(document: InstructionDocument): MemoryPolicy[] {
    const text = document.content;
    if (!/memory|remember|persistent|long-term/i.test(text) && !document.path.endsWith('MEMORY.md')) return [];
    const files = [...new Set(text.match(/[A-Za-z0-9_./-]*MEMORY\.md|memory\/YYYY-MM-DD\.md/g) ?? ['MEMORY.md'])];
    return [{ files, updatePolicy: 'Preserve durable facts and avoid secrets.', sourcePath: document.path }];
}

function extractPermissions(document: InstructionDocument): PermissionPolicy[] {
    const policies: PermissionPolicy[] = [];
    const text = document.content;
    if (/destructive|force-push|reset --hard|approval|permission/i.test(text)) {
        policies.push({ tool: 'destructive-actions', policy: 'ask', sourcePath: document.path });
    }
    if (/shell|bash|terminal|command/i.test(text)) {
        policies.push({ tool: 'shell', policy: 'documented', sourcePath: document.path });
    }
    if (/network|web|internet/i.test(text)) {
        policies.push({ tool: 'network', policy: 'documented', sourcePath: document.path });
    }
    return policies;
}
