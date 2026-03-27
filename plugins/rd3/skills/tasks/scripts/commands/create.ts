// create command — create a new task file

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { err, ok, type Result } from '../lib/result';
import { loadConfig, resolveFolderPath, getMetaDir } from '../lib/config';
import { getNextWbs, formatWbs } from '../lib/wbs';
import { getTemplateVars, substituteTemplateVars, stripInputTips } from '../lib/template';
import { logger } from '../../../../scripts/logger';

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
        profile?: string;
        quiet?: boolean;
    } = {},
): Result<{ wbs: string; path: string }> {
    const config = loadConfig(projectRoot);
    const folder = cliFolder || config.active_folder;
    const folderPath = resolveFolderPath(config, projectRoot, cliFolder);

    if (!existsSync(folderPath)) {
        mkdirSync(folderPath, { recursive: true });
        if (!options.quiet) {
            logger.info(`Created folder: ${folder}`);
        }
    }

    // Get next WBS
    const nextNum = getNextWbs(config, projectRoot);
    const wbs = formatWbs(nextNum);

    // Load template
    const templatePath = resolve(getMetaDir(projectRoot), 'task.md');
    let templateContent: string;
    try {
        templateContent = readFileSync(templatePath, 'utf-8');
    } catch {
        templateContent = getDefaultTemplate();
    }

    // Render template with placeholder cleanup first so section overrides work on both
    // the built-in template and customized project templates.
    const vars = getTemplateVars(name, wbs, folder, name);
    let content = substituteTemplateVars(templateContent, vars);
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
    if (options.profile !== undefined) {
        const validProfiles = ['simple', 'standard', 'complex', 'research'];
        if (!validProfiles.includes(options.profile)) {
            return err(`Invalid profile: "${options.profile}". Valid values: ${validProfiles.join(', ')}`);
        }
    }
    content = upsertFrontmatterField(content, 'profile', options.profile);

    // Write file
    const fileName = `${wbs}_${name.replace(/\s+/g, '_')}.md`;
    const filePath = resolve(folderPath, fileName);

    if (existsSync(filePath)) {
        return err(`Task already exists: ${fileName}`);
    }

    try {
        writeFileSync(filePath, content, 'utf-8');
    } catch (e) {
        return err(`Failed to write task file: ${e}`);
    }

    if (!options.quiet) {
        logger.success(`Created ${wbs} ${name} → ${folder}/${fileName}`);
    }
    return ok({ wbs, path: filePath });
}

function replaceSectionContent(content: string, section: string, newContent: string): string {
    const sectionPattern = new RegExp(`(### ${section}\\n\\n)[\\s\\S]*?(?=\\n### |$)`, 'm');
    if (!sectionPattern.test(content)) {
        return content;
    }

    return content.replace(sectionPattern, `$1${newContent.trim()}\n`);
}

function upsertFrontmatterField(content: string, field: string, value: string | number | string[] | undefined): string {
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

function renderFrontmatterValue(value: string | number | string[]): string {
    if (Array.isArray(value)) {
        return JSON.stringify(value);
    }

    if (typeof value === 'number') {
        return String(value);
    }

    return JSON.stringify(value);
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
