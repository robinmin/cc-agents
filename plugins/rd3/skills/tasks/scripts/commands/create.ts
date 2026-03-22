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
    options: { background?: string; requirements?: string; quiet?: boolean } = {},
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

    // Render template (substitute variables first, strip input tips after override)
    const vars = getTemplateVars(name, wbs, folder, options.requirements || '');
    let content = substituteTemplateVars(templateContent, vars);

    // Override Background if provided (before stripping input tips)
    if (options.background) {
        content = content.replace(/(#+\s*Background\n\n)\[.*?\]/s, `$1${options.background}`);
    }

    // Strip input tips like [Context and motivation — why this task exists]
    content = stripInputTips(content);

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

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

[Links to docs, related tasks, external resources]
`;
}
