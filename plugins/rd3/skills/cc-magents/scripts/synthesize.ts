#!/usr/bin/env bun
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateWorkspace } from './generator';
import { parseCliArgs, printResult, writeGeneratedWorkspace } from './io';
import { parseInstructionDocument, workspaceFromDocuments } from './parser';
import type { GeneratedWorkspace, PlatformId } from './types';

const templateDir = new URL('../templates/', import.meta.url);

export function synthesizeWorkspace(templateName = 'dev-agent', targetPlatform: PlatformId = 'agents-md') {
    const templatePath = join(templateDir.pathname, `${templateName}.md`);
    const content = readFileSync(templatePath, 'utf-8');
    const workspace = workspaceFromDocuments([parseInstructionDocument('AGENTS.md', content, 'agents-md')]);
    return generateWorkspace(workspace, 'agents-md', targetPlatform);
}

export function runSynthesizeCli(args: string[]): GeneratedWorkspace {
    const options = parseCliArgs(args);
    const template = options.input ?? 'dev-agent';
    const target = options.to ?? 'agents-md';
    const generated = synthesizeWorkspace(template, target);
    if (!options.dryRun) writeGeneratedWorkspace(generated, options.output);
    printResult(generated, options.json);
    return generated;
}

if (import.meta.main) {
    runSynthesizeCli(Bun.argv.slice(2));
}
