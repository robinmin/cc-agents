// Task file read/write operations with frontmatter parsing

import { readFileSync, writeFileSync } from 'node:fs';
import type {
    TaskFrontmatter,
    TaskStatus,
    TaskType,
    ImplPhase,
    ArtifactEntry,
    TaskFile,
    ValidationResult,
    ValidationIssue,
} from '../types';
import { VALID_STATUSES, VALID_PHASES, normalizeStatus } from '../types';
import { err, ok, type Result } from './result';

const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n/;

export function parseFrontmatter(content: string): TaskFrontmatter | null {
    const match = content.match(FRONTMATTER_REGEX);
    if (!match) return null;

    const yaml = match[1];
    const fm: Record<string, string> = {};

    for (const line of yaml.split('\n')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        fm[key] = value;
    }

    const implProgress: TaskFrontmatter['impl_progress'] = {
        planning: 'pending',
        design: 'pending',
        implementation: 'pending',
        review: 'pending',
        testing: 'pending',
    };

    const implMatch = content.match(/impl_progress:\n([\s\S]*?)(?=\n---|\n###|\n$)/);
    if (implMatch) {
        for (const phase of VALID_PHASES) {
            const phaseMatch = implMatch[1].match(new RegExp(`(?:^|\\n)${phase}: (\\w+)`, 'm'));
            if (phaseMatch) {
                implProgress[phase] = phaseMatch[1] as TaskFrontmatter['impl_progress'][typeof phase];
            }
        }
    }

    const frontmatter: TaskFrontmatter = {
        name: fm.name || '',
        description: fm.description || '',
        status: fm.status ? normalizeStatus(fm.status).status : 'Backlog',
        created_at: fm.created_at || '',
        updated_at: fm.updated_at || '',
        folder: fm.folder,
        type: (fm.type as TaskType) || 'task',
        impl_progress: implProgress,
    };

    if (fm.priority !== undefined) {
        frontmatter.priority = fm.priority;
    }

    const estimatedHours = parseOptionalNumber(fm.estimated_hours);
    if (estimatedHours !== undefined) {
        frontmatter.estimated_hours = estimatedHours;
    }

    const tags = parseOptionalArray(fm.tags);
    if (tags !== undefined) {
        frontmatter.tags = tags;
    }

    const dependencies = parseOptionalArray(fm.dependencies);
    if (dependencies !== undefined) {
        frontmatter.dependencies = dependencies;
    }

    if (fm.profile !== undefined) {
        const normalizedProfile = stripWrappingQuotes(fm.profile);
        if (isValidProfile(normalizedProfile)) {
            frontmatter.profile = normalizedProfile;
        }
    }

    return frontmatter;
}

function parseOptionalNumber(value?: string): number | undefined {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalArray(value?: string): string[] | undefined {
    if (!value) return undefined;

    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
            return parsed;
        }
    } catch {
        // Fall back to a single-value array for plain strings.
    }

    return value ? [value] : undefined;
}

function stripWrappingQuotes(value: string): string {
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }

    return value;
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isValidProfile(value: string): value is NonNullable<TaskFrontmatter['profile']> {
    return value === 'simple' || value === 'standard' || value === 'complex' || value === 'research';
}

export function parseSection(content: string, section: string): string {
    const headerPattern = new RegExp(`^### ${escapeRegex(section)}\\n(?:\\n)?`, 'm');
    const headerMatch = content.match(headerPattern);
    if (!headerMatch || headerMatch.index === undefined) {
        return '';
    }

    const start = headerMatch.index + headerMatch[0].length;
    const remainder = content.slice(start);
    const nextHeadingIndex = remainder.search(/\n### /);
    const sectionContent = nextHeadingIndex === -1 ? remainder : remainder.slice(0, nextHeadingIndex);

    return sectionContent.trim();
}

export function getWbsFromPath(path: string): string {
    const stem = path.split('/').pop() || '';
    return stem.split('_')[0];
}

export function readTaskFile(path: string): TaskFile | null {
    try {
        const content = readFileSync(path, 'utf-8');
        const frontmatter = parseFrontmatter(content);
        if (!frontmatter) return null;

        const wbs = getWbsFromPath(path);
        const name = frontmatter.name || '';
        const status = frontmatter.status || 'Backlog';
        const folder = frontmatter.folder || '';

        return { wbs, name, status, folder, path, frontmatter, content };
    } catch {
        return null;
    }
}

export function updateFrontmatterField(path: string, field: string, value: string): Result<boolean> {
    try {
        const content = readFileSync(path, 'utf-8');
        const frontmatterMatch = content.match(FRONTMATTER_REGEX);
        if (!frontmatterMatch) {
            return err('Frontmatter block not found');
        }

        const frontmatterBlock = frontmatterMatch[1];
        const fieldPattern = new RegExp(`^${field}: .*$`, 'm');
        const nextContent = fieldPattern.test(frontmatterBlock)
            ? content.replace(new RegExp(`^(${field}: ).+$`, 'm'), `$1${value}`)
            : content.replace(FRONTMATTER_REGEX, `---\n${frontmatterBlock}\n${field}: ${value}\n---\n`);
        writeFileSync(path, nextContent, 'utf-8');
        return ok(true);
    } catch (e) {
        return err(`Failed to update frontmatter: ${e}`);
    }
}

export function updateStatus(path: string, status: TaskStatus): Result<boolean> {
    const now = new Date().toISOString();
    try {
        const content = readFileSync(path, 'utf-8');
        const updated = content.replace(/^(status: ).+$/m, `$1${status}`).replace(/^(updated_at: ).+$/m, `$1${now}`);
        writeFileSync(path, updated, 'utf-8');
        return ok(true);
    } catch (e) {
        return err(`Failed to update status: ${e}`);
    }
}

export function updateSection(path: string, section: string, newContent: string): Result<boolean> {
    try {
        const content = readFileSync(path, 'utf-8');
        const headerPattern = new RegExp(`^### ${escapeRegex(section)}\\n(?:\\n)?`, 'm');
        const headerMatch = content.match(headerPattern);
        if (!headerMatch || headerMatch.index === undefined) {
            return err(`Section '### ${section}' not found`);
        }

        const start = headerMatch.index + headerMatch[0].length;
        const remainder = content.slice(start);
        const nextHeadingIndex = remainder.search(/\n### /);
        const end = nextHeadingIndex === -1 ? content.length : start + nextHeadingIndex;
        const updated = `${content.slice(0, start)}${newContent}\n${content.slice(end)}`;
        writeFileSync(path, updated, 'utf-8');
        return ok(true);
    } catch (e) {
        return err(`Failed to update section: ${e}`);
    }
}

export function updateImplPhase(path: string, phase: ImplPhase, phaseStatus: string): Result<boolean> {
    try {
        const content = readFileSync(path, 'utf-8');
        const phasePattern = new RegExp(`^(\\s{2}${phase}: ).+$`, 'm');
        if (!phasePattern.test(content)) {
            return err(`impl_progress phase '${phase}' not found`);
        }
        const updated = content.replace(phasePattern, `$1${phaseStatus}`);
        writeFileSync(path, updated, 'utf-8');
        return ok(true);
    } catch (e) {
        return err(`Failed to update impl_progress phase: ${e}`);
    }
}

export function appendArtifactRow(path: string, entry: ArtifactEntry): Result<boolean> {
    try {
        const content = readFileSync(path, 'utf-8');
        const newRow = `| ${entry.type} | ${entry.path} | ${entry.agent || ''} | ${entry.date} |`;
        const artifactsSection = content.match(/^### Artifacts\n\n([|\s\S]*?)(?=^### |\n*$)/m);
        if (!artifactsSection) return err('Artifacts section not found');

        const tableMatch = artifactsSection[1].match(/\| Type \|/);
        if (!tableMatch) return err('Artifacts table not found');

        const updated = content.replace(/(### Artifacts\n\n\| Type \|.*\n\|[- :|]+\n)/, `$1${newRow}\n`);
        writeFileSync(path, updated, 'utf-8');
        return ok(true);
    } catch (e) {
        return err(`Failed to append artifact row: ${e}`);
    }
}

/**
 * Phase-aware section requirements per status transition.
 * - `required`: missing sections produce hard errors (block without --force)
 * - `warning`: missing sections produce warnings (block with --force)
 */
const STATUS_GUARD: Record<string, { required: string[]; warning: string[] }> = {
    WIP: {
        required: ['Background', 'Requirements'],
        warning: ['Solution', 'Design', 'Plan'],
    },
    Testing: {
        required: ['Background', 'Requirements', 'Solution', 'Plan'],
        warning: ['Design'],
    },
    Done: {
        required: ['Background', 'Requirements', 'Solution', 'Design', 'Plan'],
        warning: [],
    },
};

export function validateTaskForTransition(task: TaskFile, newStatus: TaskStatus): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Tier 1: structural errors (always block)
    if (!VALID_STATUSES.includes(task.status)) {
        issues.push({ type: 'error', message: 'Missing or invalid frontmatter status' });
    }

    // Phase-aware section validation
    const guard = STATUS_GUARD[newStatus];
    if (guard) {
        for (const section of guard.required) {
            const content = parseSection(task.content, section);
            if (!content || content.startsWith('[')) {
                issues.push({ type: 'error', message: `${section} section is empty or placeholder-only` });
            }
        }
        for (const section of guard.warning) {
            const content = parseSection(task.content, section);
            if (!content || content.startsWith('[')) {
                issues.push({ type: 'warning', message: `${section} section is empty or placeholder-only` });
            }
        }
    }

    // Tier 3: suggestions (informational)
    const refs = parseSection(task.content, 'References');
    if (!refs || refs.startsWith('[')) {
        issues.push({ type: 'suggestion', message: 'References section is empty' });
    }

    return {
        errors: issues.filter((i) => i.type === 'error'),
        warnings: issues.filter((i) => i.type === 'warning'),
        suggestions: issues.filter((i) => i.type === 'suggestion'),
        hasErrors: issues.some((i) => i.type === 'error'),
        hasWarnings: issues.some((i) => i.type === 'warning'),
    };
}
