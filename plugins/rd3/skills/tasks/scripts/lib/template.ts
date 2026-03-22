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

/**
 * Substitute template variables in content.
 * Supports multiple placeholder formats: {{ VARIABLE }}, {{VARIABLE}}, and { { VARIABLE } }
 */
export function substituteTemplateVars(content: string, vars: TemplateVars): string {
    let rendered = content;

    for (const [key, value] of Object.entries(vars)) {
        const upperKey = key.toUpperCase();
        // Match {{VARIABLE}} or {{ VARIABLE }} (with optional spaces inside braces)
        rendered = rendered.replace(new RegExp(`\\{\\{\\s*${upperKey}\\s*\\}\\}`, 'g'), value);
        // Match { { VARIABLE } } (with spaces between braces, note the \s* before final })
        rendered = rendered.replace(new RegExp(`\\{\\s*\\{\\s*${upperKey}\\s*\\}\\s*\\}`, 'g'), value);
    }

    // Clean up any remaining placeholders
    rendered = rendered.replace(/\{\{[^}]+\}\}/g, '');
    rendered = rendered.replace(/\{\s*\{[^}]+\}\s*\}/g, '');

    return rendered;
}

/**
 * Strip input tip placeholders like [Context and motivation — why this task exists]
 * from the content body. Only strips bracketed content that looks like placeholder tips
 * (single-line text without structural markers like pipes or dashes).
 */
export function stripInputTips(content: string): string {
    return content.replace(/\[([^\]]+)\]/g, (_, bracketContent) => {
        // Don't strip if content has newlines (e.g., table cells)
        if (bracketContent.includes('\n')) return _;
        // Don't strip if content looks like table formatting (----)
        if (bracketContent.trim().startsWith('-')) return _;
        // Strip placeholder tips like [Context and motivation — why this task exists]
        return '';
    });
}

/**
 * Full template rendering: substitute variables and strip input tips.
 */
export function renderTemplate(content: string, vars: TemplateVars): string {
    const substituted = substituteTemplateVars(content, vars);
    return stripInputTips(substituted);
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
