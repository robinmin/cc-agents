#!/usr/bin/env bun
import { join } from 'node:path';
import { PLATFORM_IDS } from './capabilities';
import {
    adaptFile,
    parseCliArgs,
    printResult,
    readWorkspaceFromFile,
    writeGeneratedWorkspace,
    writeGeneratedWorkspaceDirectory,
} from './io';
import { generateWorkspace } from './generator';
import type { GeneratedWorkspace, PlatformId } from './types';

const DEFAULT_ALL_TARGETS: PlatformId[] = PLATFORM_IDS.filter(
    (platform) => platform !== 'generic' && platform !== 'agents-md',
);

export function runAdaptCli(args: string[]): GeneratedWorkspace | GeneratedWorkspace[] {
    const options = parseCliArgs(args);
    if (!options.input || (!options.to && !options.targetAll))
        throw new Error(
            'Usage: adapt.ts <file> --to <platform> [--from platform] [--output path] [--json] [--dry-run]',
        );
    if (options.targetAll) {
        const workspace = readWorkspaceFromFile(options.input, options.from);
        const inferredSource = options.from ?? workspace.documents[0]?.platform ?? 'generic';
        const generated = DEFAULT_ALL_TARGETS.map((target) => generateWorkspace(workspace, inferredSource, target));
        if (!options.dryRun) {
            const root = options.output ?? '.';
            for (const output of generated) {
                writeGeneratedWorkspaceDirectory(output, join(root, output.report.targetPlatform));
            }
        }
        printResult(generated, options.json);
        return generated;
    }
    if (!options.to) throw new Error('Target platform is required.');
    const generated = adaptFile(options.input, options.from, options.to);
    if (!options.dryRun) writeGeneratedWorkspace(generated, options.output);
    printResult(generated, options.json);
    return generated;
}

if (import.meta.main) {
    runAdaptCli(Bun.argv.slice(2));
}

export { adaptFile };
