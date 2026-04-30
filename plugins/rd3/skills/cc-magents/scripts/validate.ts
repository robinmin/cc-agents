#!/usr/bin/env bun
import { getCapability, PLATFORM_IDS } from './capabilities';
import { parseCliArgs, printResult, readWorkspaceFromFile, writeJsonResult } from './io';
import type { MainAgentWorkspace, ValidationIssue, ValidationResult } from './types';

export function validateWorkspace(workspace: MainAgentWorkspace): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (workspace.documents.length === 0)
        issues.push({ severity: 'error', message: 'No instruction documents parsed.' });
    for (const document of workspace.documents) {
        if (document.sections.length === 0) {
            issues.push({
                severity: 'error',
                message: 'Document has no usable instruction sections.',
                path: document.path,
            });
        }
        const capability = getCapability(document.platform);
        if (capability.confidence !== 'high') {
            issues.push({
                severity: 'warning',
                message: `${capability.displayName} support is ${capability.confidence}; verify manually.`,
                path: document.path,
            });
        }
        if (document.content.length > 32000 && ['codex', 'agents-md'].includes(document.platform)) {
            issues.push({
                severity: 'warning',
                message: 'Large AGENTS.md content may exceed practical model context budgets.',
                path: document.path,
            });
        }
    }
    if (workspace.permissions.length === 0) {
        issues.push({ severity: 'warning', message: 'No explicit permission or destructive-action policy detected.' });
    }
    return { ok: !hasError(issues), issues };
}

export function validatePlatformRegistry(): ValidationResult {
    const issues: ValidationIssue[] = [];
    for (const platform of PLATFORM_IDS) {
        const capability = getCapability(platform);
        if (capability.nativeFiles.length === 0)
            issues.push({ severity: 'error', message: `${platform} has no native files.` });
    }
    return { ok: !hasError(issues), issues };
}

function hasError(issues: ValidationIssue[]): boolean {
    for (const issue of issues) {
        if (issue.severity === 'error') return true;
    }
    return false;
}

export function runValidateCli(args: string[]): ValidationResult {
    const options = parseCliArgs(args);
    const result = options.input
        ? validateWorkspace(readWorkspaceFromFile(options.input, options.from))
        : validatePlatformRegistry();
    writeJsonResult(result, options.output);
    printResult(result, options.json);
    return result;
}

if (import.meta.main) runValidateCli(Bun.argv.slice(2));
