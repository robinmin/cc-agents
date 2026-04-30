#!/usr/bin/env bun
import { getCapability } from './capabilities';
import { parseCliArgs, printResult, readWorkspaceFromFile, writeJsonResult } from './io';
import type { MainAgentWorkspace, PlatformId, RefineSuggestion } from './types';

export function suggestRefinements(workspace: MainAgentWorkspace, targetPlatform?: PlatformId): RefineSuggestion[] {
    const suggestions: RefineSuggestion[] = [];
    if (workspace.permissions.length === 0) {
        suggestions.push({
            kind: 'safety',
            message:
                'Add explicit approval boundaries for destructive actions, shell commands, secrets, and network use.',
        });
    }
    if (!workspace.rules.some((rule) => rule.globs.length > 0)) {
        suggestions.push({
            kind: 'scope',
            message: 'Split broad instructions into path-scoped rules where the target platform supports globs.',
        });
    }
    if (workspace.sourceEvidence.length === 0) {
        suggestions.push({
            kind: 'evidence',
            message: 'Attach platform source URLs and verification dates to generated outputs or registry metadata.',
        });
    }
    if (targetPlatform) {
        const capability = getCapability(targetPlatform);
        if (capability.modularity.includes('config_instructions')) {
            suggestions.push({
                kind: 'modularity',
                targetPlatform,
                message: `Use ${capability.displayName} config-listed instruction files instead of embedding every rule in one markdown file.`,
            });
        }
        if (capability.supports.includes('multi_file')) {
            suggestions.push({
                kind: 'split',
                targetPlatform,
                message: `Generate native multi-file output for ${capability.displayName}.`,
            });
        }
    }
    return suggestions;
}

export function runRefineCli(args: string[]): RefineSuggestion[] {
    const options = parseCliArgs(args);
    if (!options.input) throw new Error('Usage: refine.ts <file> [--from platform] [--to platform] [--json]');
    const result = suggestRefinements(readWorkspaceFromFile(options.input, options.from), options.to);
    writeJsonResult(result, options.output);
    printResult(result, options.json);
    return result;
}

if (import.meta.main) {
    runRefineCli(Bun.argv.slice(2));
}
