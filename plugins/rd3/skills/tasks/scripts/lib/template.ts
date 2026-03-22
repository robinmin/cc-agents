// Template loading and variable substitution

import { existsSync, readFileSync } from 'node:fs';

export interface TemplateVars {
    WBS: string;
    PROMPT_NAME: string;
    DESCRIPTION: string;
    CREATED_AT: string;
    UPDATED_AT: string;
    FOLDER: string;
}

export function renderTemplate(content: string, vars: TemplateVars): string {
    let rendered = content;
    rendered = rendered.replace(/\{\{\s*WBS\s*\}\}/g, vars.WBS);
    rendered = rendered.replace(/\{\{\s*PROMPT_NAME\s*\}\}/g, vars.PROMPT_NAME);
    rendered = rendered.replace(/\{\{\s*DESCRIPTION\s*\}\}/g, vars.DESCRIPTION);
    rendered = rendered.replace(/\{\{\s*CREATED_AT\s*\}\}/g, vars.CREATED_AT);
    rendered = rendered.replace(/\{\{\s*UPDATED_AT\s*\}\}/g, vars.UPDATED_AT);
    rendered = rendered.replace(/\{\{\s*FOLDER\s*\}\}/g, vars.FOLDER);
    // Clean up any remaining placeholders
    rendered = rendered.replace(/\{\{[^}]+\}\}/g, '');
    return rendered;
}

export function loadTemplate(templatePath: string): string | null {
    if (!existsSync(templatePath)) return null;
    try {
        return readFileSync(templatePath, 'utf-8');
    } catch {
        return null;
    }
}

export function getTemplateVars(name: string, wbs: string, folder: string, description = ''): TemplateVars {
    const now = new Date().toISOString();
    return {
        WBS: wbs,
        PROMPT_NAME: name,
        DESCRIPTION: description,
        CREATED_AT: now,
        UPDATED_AT: now,
        FOLDER: folder,
    };
}
