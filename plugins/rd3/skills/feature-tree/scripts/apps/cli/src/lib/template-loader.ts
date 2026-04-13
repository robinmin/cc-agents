import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TemplateNode } from '@ftree/core';

export const BUILTIN_TEMPLATES = ['web-app', 'cli-tool', 'api-service'] as const;

type BuiltinTemplateName = (typeof BUILTIN_TEMPLATES)[number];

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../');
const templatesDir = resolve(skillRoot, 'templates');

export function isBuiltinTemplateName(name: string): name is BuiltinTemplateName {
    return BUILTIN_TEMPLATES.includes(name as BuiltinTemplateName);
}

export function resolveBuiltinTemplatePath(name: BuiltinTemplateName): string {
    return resolve(templatesDir, `${name}.json`);
}

export function loadTemplateNodesFromFile(filePath: string): TemplateNode[] {
    const content = readFileSync(resolve(filePath), 'utf-8');
    const parsed = JSON.parse(content) as unknown;

    return Array.isArray(parsed) ? (parsed as TemplateNode[]) : [parsed as TemplateNode];
}

export function loadBuiltinTemplate(name: BuiltinTemplateName): TemplateNode[] {
    return loadTemplateNodesFromFile(resolveBuiltinTemplatePath(name));
}
