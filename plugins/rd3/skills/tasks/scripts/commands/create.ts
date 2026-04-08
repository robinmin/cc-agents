// create command — create a new task file

import { closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { err, ok, type Result } from '../lib/result';
import { loadConfig, resolveFolderPath, getMetaDir } from '../lib/config';
import { getNextWbs, formatWbs } from '../lib/wbs';
import { getTemplateVars, substituteTemplateVars, stripInputTips } from '../lib/template';
import { VALID_PROFILES } from '../types';
import { logger } from '../../../../scripts/logger';

const CREATE_LOCK_RETRY_MS = 10;
const CREATE_LOCK_TIMEOUT_MS = 5_000;
const CREATE_LOCK_STALE_MS = 30_000;

interface CreateLockOptions {
    retryMs?: number;
    timeoutMs?: number;
    staleMs?: number;
}

export function sanitizeTaskFileNameSegment(name: string): string {
    return name
        .trim()
        .replace(/[\\/]+/g, '_')
        .replace(/\s+/g, '_')
        .replace(/[^A-Za-z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
}

export function createTask(
    projectRoot: string,
    name: string,
    cliFolder?: string,
    options: {
        background?: string;
        requirements?: string;
        solution?: string;
        priority?: string;
        estimatedHours?: number;
        dependencies?: string[];
        tags?: string[];
        preset?: string;
        profile?: string;
        quiet?: boolean;
        content?: string;
    } = {},
): Result<{ wbs: string; path: string }> {
    const config = loadConfig(projectRoot);
    const folder = cliFolder || config.active_folder;
    const folderPath = resolveFolderPath(config, projectRoot, cliFolder);

    const resolvedPreset = options.preset ?? options.profile;

    if (resolvedPreset !== undefined) {
        if (!VALID_PROFILES.includes(resolvedPreset as (typeof VALID_PROFILES)[number])) {
            return err(`Invalid preset: "${resolvedPreset}". Valid values: ${VALID_PROFILES.join(', ')}`);
        }
    }

    if (!existsSync(folderPath)) {
        mkdirSync(folderPath, { recursive: true });
        if (!options.quiet) {
            logger.info(`Created folder: ${folder}`);
        }
    }

    // Load template
    const templatePath = resolve(getMetaDir(projectRoot), 'task.md');
    let templateContent: string;
    try {
        templateContent = readFileSync(templatePath, 'utf-8');
    } catch {
        templateContent = getDefaultTemplate();
    }

    const lockPath = resolve(getMetaDir(projectRoot), '.create-task.lock');
    const lockResult = acquireCreateLock(lockPath);
    if (!lockResult.ok) {
        return err(lockResult.error);
    }

    let created: Result<{ wbs: string; path: string }>;
    try {
        // Serialize WBS allocation and file creation so concurrent CLI invocations
        // cannot observe the same "next" number before either write lands.
        const nextNum = getNextWbs(config, projectRoot);
        const wbs = formatWbs(nextNum);

        // Render template with placeholder cleanup after WBS allocation so the
        // generated content and filename stay consistent inside the critical section.
        let content: string;
        if (options.content) {
            content = options.content;
            if (resolvedPreset !== undefined) {
                content = removeFrontmatterField(content, 'profile');
                content = upsertFrontmatterField(content, 'preset', resolvedPreset);
            }
        } else {
            const vars = getTemplateVars(name, wbs, folder, name);
            content = substituteTemplateVars(templateContent, vars);
            content = stripInputTips(content);

            if (options.background) {
                content = replaceSectionContent(content, 'Background', options.background);
            }
            if (options.requirements) {
                content = replaceSectionContent(content, 'Requirements', options.requirements);
            }
            if (options.solution) {
                content = replaceSectionContent(content, 'Solution', options.solution);
            }

            content = upsertFrontmatterField(content, 'priority', options.priority);
            content = upsertFrontmatterField(content, 'estimated_hours', options.estimatedHours);
            content = upsertFrontmatterField(content, 'dependencies', options.dependencies);
            content = upsertFrontmatterField(content, 'tags', options.tags);
            content = removeFrontmatterField(content, 'profile');
            content = upsertFrontmatterField(content, 'preset', resolvedPreset);
        }

        const safeName = sanitizeTaskFileNameSegment(name);
        if (safeName.length === 0) {
            created = err('Task name must contain at least one filename-safe character');
        } else {
            const fileName = `${wbs}_${safeName}.md`;
            const filePath = resolve(folderPath, fileName);

            if (existsSync(filePath)) {
                created = err(`Task already exists: ${fileName}`);
            } else {
                try {
                    writeFileSync(filePath, content, 'utf-8');
                    created = ok({ wbs, path: filePath });
                } catch (e) {
                    created = err(`Failed to write task file: ${e}`);
                }
            }
        }
    } finally {
        releaseCreateLock(lockPath, lockResult.value);
    }

    if (!created.ok) {
        return created;
    }

    if (!options.quiet) {
        const relativePath = `${folder}/${created.value.path.split('/').pop() ?? ''}`;
        logger.success(`Created ${created.value.wbs} ${name} → ${relativePath}`);
    }
    return created;
}

export function acquireCreateLock(lockPath: string, options: CreateLockOptions = {}): Result<number> {
    const retryMs = options.retryMs ?? CREATE_LOCK_RETRY_MS;
    const timeoutMs = options.timeoutMs ?? CREATE_LOCK_TIMEOUT_MS;
    const staleMs = options.staleMs ?? CREATE_LOCK_STALE_MS;

    mkdirSync(dirname(lockPath), { recursive: true });
    const deadline = Date.now() + timeoutMs;

    while (Date.now() <= deadline) {
        try {
            const fd = openSync(lockPath, 'wx');
            return ok(fd);
        } catch (error) {
            const code = getErrorCode(error);
            if (code !== 'EEXIST') {
                return err(`Failed to acquire task creation lock: ${error}`);
            }

            if (isStaleLock(lockPath, staleMs)) {
                try {
                    unlinkSync(lockPath);
                    continue;
                } catch (unlinkError) {
                    const unlinkCode = getErrorCode(unlinkError);
                    if (unlinkCode !== 'ENOENT') {
                        return err(`Failed to clear stale task creation lock: ${unlinkError}`);
                    }
                }
            }

            sleepSync(retryMs);
        }
    }

    return err(`Timed out acquiring task creation lock: ${lockPath}`);
}

export function releaseCreateLock(lockPath: string, fd: number): void {
    closeSync(fd);
    try {
        unlinkSync(lockPath);
    } catch (error) {
        const code = getErrorCode(error);
        if (code !== 'ENOENT') {
            throw error;
        }
    }
}

export function isStaleLock(lockPath: string, staleMs = CREATE_LOCK_STALE_MS): boolean {
    try {
        const stats = statSync(lockPath);
        return Date.now() - stats.mtimeMs > staleMs;
    } catch (error) {
        return getErrorCode(error) === 'ENOENT';
    }
}

export function sleepSync(durationMs: number): void {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, durationMs);
}

export function getErrorCode(error: unknown): string | undefined {
    return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : undefined;
}

export function replaceSectionContent(content: string, section: string, newContent: string): string {
    const sectionPattern = new RegExp(`(### ${section}\\n\\n)[\\s\\S]*?(?=\\n### |$)`, 'm');
    if (!sectionPattern.test(content)) {
        return content;
    }

    return content.replace(sectionPattern, `$1${newContent.trim()}\n`);
}

export function upsertFrontmatterField(
    content: string,
    field: string,
    value: string | number | string[] | undefined,
): string {
    if (value === undefined) {
        return content;
    }

    const renderedValue = renderFrontmatterValue(value);
    const fieldPattern = new RegExp(`^${field}: .+$`, 'm');
    if (fieldPattern.test(content)) {
        return content.replace(fieldPattern, `${field}: ${renderedValue}`);
    }

    if (/^impl_progress:\n/m.test(content)) {
        return content.replace(/^impl_progress:\n/m, `${field}: ${renderedValue}\nimpl_progress:\n`);
    }

    return content.replace(/\n---\n/, `\n${field}: ${renderedValue}\n---\n`);
}

export function removeFrontmatterField(content: string, field: string): string {
    return content.replace(new RegExp(`^${field}: .+$\\n?`, 'm'), '');
}

export function renderFrontmatterValue(value: string | number | string[]): string {
    if (Array.isArray(value)) {
        return JSON.stringify(value);
    }

    if (typeof value === 'number') {
        return String(value);
    }

    return JSON.stringify(value);
}

export function getTaskTemplate(projectRoot: string): string {
    const templatePath = resolve(getMetaDir(projectRoot), 'task.md');
    try {
        return readFileSync(templatePath, 'utf-8');
    } catch {
        return getDefaultTemplate();
    }
}

function getDefaultTemplate(): string {
    return `---
name: {{ PROMPT_NAME }}
description: {{ DESCRIPTION }}
status: Backlog
created_at: {{ CREATED_AT }}
updated_at: {{ UPDATED_AT }}
folder: {{ FOLDER }}
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## {{ WBS }}. {{ PROMPT_NAME }}

### Background

[Context and motivation — why this task exists]

### Requirements

[What needs to be done — acceptance criteria]

### Q&A

[Clarifications added during planning phase]

### Design

[Architecture/UI specs added by specialists]

### Solution

[Solution added by specialists — must exist before transitioning to WIP/Testing/Done]

### Plan

[Step-by-step implementation plan with checkbox markers]

### Review

[Review findings, risks, and approval notes]

### Testing

[Verification evidence, commands run, and outcomes]

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

[Links to docs, related tasks, external resources]
`;
}
