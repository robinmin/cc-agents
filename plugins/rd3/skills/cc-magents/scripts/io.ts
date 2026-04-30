import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { logger } from '../../../scripts/logger';
import { isPlatformId } from './capabilities';
import { generateWorkspace } from './generator';
import { parseInstructionDocument, workspaceFromDocuments } from './parser';
import type { GeneratedWorkspace, PlatformId } from './types';

export interface CliOptions {
    input?: string;
    output?: string;
    to?: PlatformId;
    from?: PlatformId;
    json: boolean;
    dryRun: boolean;
    targetAll: boolean;
}

export function parseCliArgs(args: string[]): CliOptions {
    const options: CliOptions = { json: false, dryRun: false, targetAll: false };
    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (arg === '--json') options.json = true;
        else if (arg === '--dry-run') options.dryRun = true;
        else if (arg === '--to' || arg === '--platform') {
            const value = args[index + 1];
            if (value === 'all') {
                options.targetAll = true;
                index += 1;
                continue;
            }
            const platform = normalizePlatform(value);
            if (!platform) throw new Error(`Unknown target platform: ${value ?? '<missing>'}`);
            options.to = platform;
            index += 1;
        } else if (arg === '--from') {
            const value = args[index + 1];
            const platform = normalizePlatform(value);
            if (!platform) throw new Error(`Unknown source platform: ${value ?? '<missing>'}`);
            options.from = platform;
            index += 1;
        } else if (arg === '--output' || arg === '-o') {
            options.output = args[index + 1];
            index += 1;
        } else if (!options.input) {
            options.input = arg;
        }
    }
    return options;
}

function normalizePlatform(value: string | undefined): PlatformId | undefined {
    if (!value) return undefined;
    const aliases: Record<string, PlatformId> = {
        claude: 'claude-code',
        'claude-md': 'claude-code',
        gemini: 'gemini-cli',
        'gemini-md': 'gemini-cli',
        cursorrules: 'cursor',
        'cursor-rules': 'cursor',
        windsurfrules: 'windsurf',
        'opencode-rules': 'opencode',
        'vscode-instructions': 'copilot',
    };
    if (isPlatformId(value)) return value;
    return aliases[value];
}

export function readWorkspaceFromFile(input: string, platform?: PlatformId) {
    const resolved = resolve(input);
    if (!existsSync(resolved)) throw new Error(`Input file does not exist: ${input}`);
    const content = readFileSync(resolved, 'utf-8');
    return workspaceFromDocuments([parseInstructionDocument(input, content, platform)]);
}

export function adaptFile(
    input: string,
    sourcePlatform: PlatformId | undefined,
    targetPlatform: PlatformId,
): GeneratedWorkspace {
    const workspace = readWorkspaceFromFile(input, sourcePlatform);
    const inferredSource = sourcePlatform ?? workspace.documents[0]?.platform ?? 'generic';
    return generateWorkspace(workspace, inferredSource, targetPlatform);
}

export function writeGeneratedWorkspace(generated: GeneratedWorkspace, output?: string): void {
    if (output && generated.files.length === 1) {
        ensureParent(output);
        writeFileSync(output, generated.files[0].content);
        return;
    }
    const root = output ?? '.';
    for (const file of generated.files) {
        const path = resolve(root, file.path);
        ensureParent(path);
        writeFileSync(path, file.content);
    }
}

export function writeGeneratedWorkspaceDirectory(generated: GeneratedWorkspace, outputDirectory: string): void {
    for (const file of generated.files) {
        const path = resolve(outputDirectory, file.path);
        ensureParent(path);
        writeFileSync(path, file.content);
    }
}

export function printResult(result: unknown, json: boolean): void {
    if (json) {
        logger.info(JSON.stringify(result, null, 2));
        return;
    }
    logger.info(formatHumanResult(result));
}

export function writeJsonResult(result: unknown, output?: string): void {
    if (!output) return;
    ensureParent(output);
    writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
}

function ensureParent(path: string): void {
    mkdirSync(dirname(path), { recursive: true });
}

function formatHumanResult(result: unknown): string {
    if (typeof result === 'string') return result;
    if (result && typeof result === 'object' && 'files' in result) {
        const generated = result as GeneratedWorkspace;
        return [
            `Generated ${generated.files.length} file(s):`,
            ...generated.files.map((file) => `- ${file.path}`),
            `Warnings: ${generated.report.warnings.length}`,
        ].join('\n');
    }
    return JSON.stringify(result, null, 2);
}
