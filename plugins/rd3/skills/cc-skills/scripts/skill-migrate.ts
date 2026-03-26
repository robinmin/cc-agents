#!/usr/bin/env bun
/**
 * skill-migrate.ts
 *
 * Multi-source skill migration tool. Extracts content from one or more
 * source skills, merges them into a destination skill using the
 * knowledge-extraction reconciliation engine.
 *
 * Usage:
 *   bun skill-migrate.ts --from <path> [--from <path>...] --to <path> [--dry-run] [--apply] [--strict]
 *
 * Path resolution (--from):
 *   rd2:<skill>          → plugins/rd2/skills/<skill>/
 *   rd3:<skill>          → plugins/rd3/skills/<skill>/
 *   <bare-name>          → searches rd3 then rd2; errors if ambiguous
 *   path:<path>          → exact filesystem path
 *   ~/..., ~              → tilde expansion to user home directory
 *   vendors/..., ./, ../  → relative to cwd (any path with / is a filesystem path)
 *
 * Path resolution (--to): Always a filesystem path — never a skill lookup.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { logger } from '../../../scripts/logger';
import { reconcileMultiSource } from '../../knowledge-extraction/scripts/reconcile';
import type { ReconciliationResult, SourceContent } from '../../knowledge-extraction/scripts/types';

// ============================================================================
// Path Resolution
// ============================================================================

/**
 * Resolve a source skill path from various input formats.
 * Supports rd2:/rd3: prefixes, bare names, path:/absolute/relative paths.
 */
export function resolveSkillPath(input: string): string {
    // rd2:<skill> or rd3:<skill> prefix
    const prefixMatch = input.match(/^(rd[23]):(.+)$/);
    if (prefixMatch) {
        const [, prefix, skill] = prefixMatch;
        return resolve(`plugins/${prefix}/skills/${skill}`);
    }

    // path: prefix
    if (input.startsWith('path:')) {
        return resolve(input.slice(5));
    }

    // Tilde expansion (~/path or ~)
    if (input.startsWith('~/') || input === '~') {
        const home = homedir();
        return resolve(join(home, input.slice(1)));
    }

    // Absolute path
    if (input.startsWith('/')) {
        return input;
    }

    // Relative path (./, ../, vendors/, plugins/, or any path containing / that isn't absolute)
    if (input.startsWith('./') || input.startsWith('../') || (input.includes('/') && !input.startsWith('/'))) {
        return resolve(input);
    }

    // Bare name — search known plugin bases
    const rd3Path = resolve(`plugins/rd3/skills/${input}`);
    const rd2Path = resolve(`plugins/rd2/skills/${input}`);
    const rd3Exists = existsSync(rd3Path);
    const rd2Exists = existsSync(rd2Path);

    if (rd3Exists && rd2Exists) {
        logger.error(
            `Ambiguous: "${input}" exists in both rd3 and rd2. Use "rd2:${input}" or "rd3:${input}" explicitly.`,
        );
        process.exit(1);
    }

    if (rd3Exists) return rd3Path;
    if (rd2Exists) return rd2Path;

    logger.error(`Skill "${input}" not found in plugins/rd3/skills/ or plugins/rd2/skills/.`);
    process.exit(1);
}

/**
 * Resolve a destination path — always as a filesystem path.
 * Never attempts skill-name lookup. Supports absolute, relative, and path: prefix.
 */
function resolveDestinationPath(input: string): string {
    if (input.startsWith('path:')) {
        return resolve(input.slice(5));
    }
    // Tilde expansion (~/path or ~)
    if (input.startsWith('~/') || input === '~') {
        return resolve(join(homedir(), input.slice(1)));
    }
    if (input.startsWith('/')) {
        return input;
    }
    // All other forms (relative paths like ./, vendors/, plugins/rd3/, etc.) are filesystem paths
    return resolve(input);
}

// ============================================================================
// Inventory
// ============================================================================

interface InventoryItem {
    relativePath: string;
    absolutePath: string;
    size: number;
    isDirectory: boolean;
}

interface SkillInventory {
    sourcePath: string;
    sourceName: string;
    items: InventoryItem[];
    hasSkillMd: boolean;
    hasScripts: boolean;
    hasTests: boolean;
    hasReferences: boolean;
}

/**
 * Recursively list all files in a directory.
 */
function listFilesRecursive(dir: string, basePath: string): InventoryItem[] {
    const items: InventoryItem[] = [];
    if (!existsSync(dir)) return items;

    const entries = readdirSync(dir);
    for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        const relPath = relative(basePath, fullPath);

        if (stat.isDirectory()) {
            // Skip node_modules, .git, etc.
            if (entry === 'node_modules' || entry === '.git' || entry === '__pycache__') {
                continue;
            }
            items.push({
                relativePath: relPath,
                absolutePath: fullPath,
                size: 0,
                isDirectory: true,
            });
            items.push(...listFilesRecursive(fullPath, basePath));
        } else {
            items.push({
                relativePath: relPath,
                absolutePath: fullPath,
                size: stat.size,
                isDirectory: false,
            });
        }
    }
    return items;
}

/**
 * Build an inventory of a source skill (file or directory).
 */
function inventorySource(sourcePath: string): SkillInventory {
    const stat = statSync(sourcePath);

    // Handle single-file sources (e.g. mobile-backend.md)
    if (stat.isFile()) {
        const fileName = basename(sourcePath);
        return {
            sourcePath,
            sourceName: fileName,
            items: [
                {
                    relativePath: fileName,
                    absolutePath: sourcePath,
                    size: stat.size,
                    isDirectory: false,
                },
            ],
            hasSkillMd: fileName === 'SKILL.md',
            hasScripts: false,
            hasTests: false,
            hasReferences: false,
        };
    }

    const items = listFilesRecursive(sourcePath, sourcePath);
    const files = items.filter((i) => !i.isDirectory);

    return {
        sourcePath,
        sourceName: basename(sourcePath),
        items: files,
        hasSkillMd: files.some((f) => f.relativePath === 'SKILL.md'),
        hasScripts: files.some((f) => f.relativePath.startsWith('scripts/')),
        hasTests: files.some((f) => f.relativePath.startsWith('tests/')),
        hasReferences: files.some((f) => f.relativePath.startsWith('references/')),
    };
}

// ============================================================================
// Python-to-TypeScript Conversion
// ============================================================================

/**
 * Convert a Python script to TypeScript/Bun (basic structural conversion).
 * This handles common patterns; complex Python is left for manual review.
 */
export function convertPythonToTypeScript(
    pyContent: string,
    originalPath: string,
): { tsContent: string; warnings: string[] } {
    const warnings: string[] = [];
    let ts = pyContent;

    // Add Bun shebang
    ts = `#!/usr/bin/env bun\n/**\n * Auto-converted from ${originalPath}\n * Manual review recommended.\n */\n\nimport { logger } from "../../../scripts/logger";\n\n`;

    // Basic conversions
    const lines = pyContent.split('\n');
    const convertedLines: string[] = [];

    for (const line of lines) {
        let converted = line;

        // Skip shebang and encoding declarations
        if (converted.startsWith('#!') || converted.startsWith('# -*-')) continue;

        // Convert imports
        if (converted.match(/^from\s+(\S+)\s+import\s+(.+)/)) {
            converted = `// TODO: Convert import — ${converted.trim()}`;
            warnings.push(`Manual import conversion needed: ${line.trim()}`);
        } else if (converted.match(/^import\s+(\S+)/)) {
            converted = `// TODO: Convert import — ${converted.trim()}`;
            warnings.push(`Manual import conversion needed: ${line.trim()}`);
        }

        // Convert print() to logger.log()
        converted = converted.replace(/\bprint\s*\(/g, 'logger.log(');

        // Convert def to function
        converted = converted.replace(/^(\s*)def\s+(\w+)\s*\((.*?)\)\s*(?:->.*)?:/, '$1function $2($3) {');

        // Convert class to class
        converted = converted.replace(/^(\s*)class\s+(\w+)(?:\(.*?\))?:/, '$1class $2 {');

        // Convert if/elif/else
        converted = converted.replace(/^(\s*)if\s+(.+):/, '$1if ($2) {');
        converted = converted.replace(/^(\s*)elif\s+(.+):/, '$1} else if ($2) {');
        converted = converted.replace(/^(\s*)else:/, '$1} else {');

        // Convert for loops
        converted = converted.replace(/^(\s*)for\s+(\w+)\s+in\s+(.+):/, '$1for (const $2 of $3) {');

        // Convert f-strings to template literals
        converted = converted.replace(/f"([^"]*)"/, '`$1`');
        converted = converted.replace(/f'([^']*)'/, '`$1`');

        // Convert None/True/False
        converted = converted.replace(/\bNone\b/g, 'null');
        converted = converted.replace(/\bTrue\b/g, 'true');
        converted = converted.replace(/\bFalse\b/g, 'false');

        // Convert console.* to logger.*
        converted = converted.replace(/console\.log\(/g, 'logger.log(');
        converted = converted.replace(/console\.error\(/g, 'logger.error(');
        converted = converted.replace(/console\.warn\(/g, 'logger.warn(');

        convertedLines.push(converted);
    }

    ts += convertedLines.join('\n');

    if (warnings.length > 0) {
        ts += `\n\n// ===== CONVERSION WARNINGS =====\n`;
        for (const w of warnings) {
            ts += `// WARNING: ${w}\n`;
        }
    }

    return { tsContent: ts, warnings };
}

// ============================================================================
// Merge Planning
// ============================================================================

interface MergePlan {
    filesToAdd: { relativePath: string; sourcePath: string; sourceName: string }[];
    filesToMerge: {
        relativePath: string;
        sources: { name: string; path: string; content: string }[];
    }[];
    filesToMergeWithDest: {
        relativePath: string;
        sourceContent: string;
        destContent: string;
    }[];
    filesToConvert: { relativePath: string; sourcePath: string; sourceName: string }[];
    reconciliationResults: Map<string, ReconciliationResult>;
    filesWithDestConflicts: string[];
}

/**
 * Create a merge plan from multiple source inventories.
 * destinationPath is the existing destination skill directory (may be empty or non-existent).
 */
function createMergePlan(inventories: SkillInventory[], destinationPath: string): MergePlan {
    const fileMap: Record<string, { sourceName: string; absolutePath: string }[]> = {};

    for (const inv of inventories) {
        for (const item of inv.items) {
            if (!fileMap[item.relativePath]) {
                fileMap[item.relativePath] = [];
            }
            fileMap[item.relativePath].push({
                sourceName: inv.sourceName,
                absolutePath: item.absolutePath,
            });
        }
    }

    const plan: MergePlan = {
        filesToAdd: [],
        filesToMerge: [],
        filesToMergeWithDest: [],
        filesToConvert: [],
        reconciliationResults: new Map(),
        filesWithDestConflicts: [],
    };

    for (const [relPath, sources] of Object.entries(fileMap)) {
        const ext = extname(relPath).toLowerCase();

        // Check for Python files that need conversion
        if (ext === '.py') {
            plan.filesToConvert.push({
                relativePath: relPath,
                sourcePath: sources[0].absolutePath,
                sourceName: sources[0].sourceName,
            });
            continue;
        }

        // Check if this file already exists at the destination
        const destFilePath = join(destinationPath, relPath);
        const destExists = destinationPath && existsSync(destFilePath);

        if (sources.length === 1 && !destExists) {
            // No conflict — add directly
            plan.filesToAdd.push({
                relativePath: relPath,
                sourcePath: sources[0].absolutePath,
                sourceName: sources[0].sourceName,
            });
        } else if (sources.length === 1 && destExists) {
            // Source file conflicts with existing destination file — needs merge
            try {
                const sourceContent = readFileSync(sources[0].absolutePath, 'utf-8');
                const destContent = readFileSync(destFilePath, 'utf-8');
                plan.filesToMergeWithDest.push({
                    relativePath: relPath,
                    sourceContent,
                    destContent,
                });
                plan.filesWithDestConflicts.push(relPath);
            } catch {
                logger.warn(`Could not read ${destFilePath}, treating as add.`);
                plan.filesToAdd.push({
                    relativePath: relPath,
                    sourcePath: sources[0].absolutePath,
                    sourceName: sources[0].sourceName,
                });
            }
        } else {
            // Multiple sources have this file — needs merge
            const sourceContents: { name: string; path: string; content: string }[] = [];
            for (const src of sources) {
                try {
                    const content = readFileSync(src.absolutePath, 'utf-8');
                    sourceContents.push({
                        name: src.sourceName,
                        path: relPath,
                        content,
                    });
                } catch {
                    logger.warn(`Could not read ${src.absolutePath}, skipping.`);
                }
            }

            if (sourceContents.length > 1) {
                plan.filesToMerge.push({
                    relativePath: relPath,
                    sources: sourceContents,
                });
            } else if (sourceContents.length === 1) {
                plan.filesToAdd.push({
                    relativePath: relPath,
                    sourcePath: sources[0].absolutePath,
                    sourceName: sources[0].sourceName,
                });
            }
        }
    }

    // Run reconciliation for files that need merging
    for (const mergeItem of plan.filesToMerge) {
        const sourceContents: SourceContent[] = mergeItem.sources.map((s) => ({
            name: s.name,
            path: s.path,
            content: s.content,
        }));

        const result = reconcileMultiSource(sourceContents);
        plan.reconciliationResults.set(mergeItem.relativePath, result);
    }

    // Run reconciliation for source-vs-destination conflicts
    for (const item of plan.filesToMergeWithDest) {
        const sourceContents: SourceContent[] = [
            { name: 'source', path: item.relativePath, content: item.sourceContent },
            { name: 'destination', path: item.relativePath, content: item.destContent },
        ];
        const result = reconcileMultiSource(sourceContents);
        plan.reconciliationResults.set(item.relativePath, result);
    }

    return plan;
}

// ============================================================================
// Report Generation
// ============================================================================

interface MigrationReport {
    timestamp: string;
    mode: 'dry-run' | 'apply';
    sources: string[];
    destination: string;
    filesAdded: number;
    filesMerged: number;
    filesConverted: number;
    conflictsResolved: number;
    avgQualityScore: number;
    details: string;
}

function generateReport(
    inventories: SkillInventory[],
    plan: MergePlan,
    destination: string,
    mode: 'dry-run' | 'apply',
): MigrationReport {
    const timestamp = new Date().toISOString();
    const sources = inventories.map((inv) => inv.sourcePath);

    let qualitySum = 0;
    let qualityCount = 0;
    for (const result of plan.reconciliationResults.values()) {
        qualitySum += result.qualityScore;
        qualityCount++;
    }

    const avgQuality = qualityCount > 0 ? qualitySum / qualityCount : 100;

    const lines: string[] = [];
    lines.push('# Skill Migration Report\n');
    lines.push(`**Generated**: ${timestamp}`);
    lines.push(`**Sources**: ${sources.join(', ')}`);
    lines.push(`**Destination**: ${destination}`);
    lines.push(`**Mode**: ${mode}\n`);

    lines.push('## Summary\n');
    lines.push('| Metric | Count |');
    lines.push('|--------|-------|');
    lines.push(`| Sources scanned | ${inventories.length} |`);
    lines.push(`| Files added | ${plan.filesToAdd.length} |`);
    lines.push(`| Files merged | ${plan.filesToMerge.length} |`);
    lines.push(`| Files merged (source vs dest) | ${plan.filesToMergeWithDest.length} |`);
    lines.push(`| Files converted (PY→TS) | ${plan.filesToConvert.length} |`);
    lines.push(
        `| Conflicts resolved | ${[...plan.reconciliationResults.values()].reduce((sum, r) => sum + r.conflictManifest.summary.totalConflicts, 0)} |`,
    );
    lines.push(`| Average quality score | ${avgQuality.toFixed(1)}/100 |`);

    lines.push('\n## File Change Log\n');
    lines.push('| File | Action | Details |');
    lines.push('|------|--------|---------|');

    for (const item of plan.filesToAdd) {
        lines.push(`| ${item.relativePath} | added | from ${item.sourceName} |`);
    }

    for (const item of plan.filesToMerge) {
        const result = plan.reconciliationResults.get(item.relativePath);
        const score = result ? `quality: ${result.qualityScore}/100` : '';
        lines.push(`| ${item.relativePath} | merged | ${item.sources.length} sources reconciled, ${score} |`);
    }

    for (const item of plan.filesToMergeWithDest) {
        const result = plan.reconciliationResults.get(item.relativePath);
        const score = result ? `quality: ${result.qualityScore}/100` : '';
        lines.push(`| ${item.relativePath} | merged (source vs dest) | reconciled with existing destination file, ${score} |`);
    }

    for (const item of plan.filesToConvert) {
        const tsPath = item.relativePath.replace(/\.py$/, '.ts');
        lines.push(`| ${tsPath} | converted | py→ts from ${item.sourceName} |`);
    }

    // Conflict resolution log
    if (plan.reconciliationResults.size > 0) {
        lines.push('\n## Conflict Resolution Log\n');

        for (const [filePath, result] of plan.reconciliationResults) {
            lines.push(`### ${filePath}\n`);

            for (const conflict of result.conflictManifest.conflicts) {
                lines.push(`- **Conflict** (${conflict.type}): ${conflict.location}`);
                lines.push(`- **Resolution**: ${conflict.resolution}`);

                for (const [source, attr] of Object.entries(conflict.attribution)) {
                    lines.push(`  - ${source}: ${attr}`);
                }

                lines.push('');
            }

            if (result.warnings.length > 0) {
                lines.push('**Warnings:**');
                for (const w of result.warnings) {
                    lines.push(`- ${w}`);
                }
                lines.push('');
            }
        }
    }

    if (mode === 'dry-run') {
        lines.push('\n## Dry-Run Mode\n');
        lines.push('No files were written. Run with `--apply` to execute this migration plan.');
    }

    return {
        timestamp,
        mode,
        sources,
        destination,
        filesAdded: plan.filesToAdd.length,
        filesMerged: plan.filesToMerge.length,
        filesConverted: plan.filesToConvert.length,
        conflictsResolved: [...plan.reconciliationResults.values()].reduce(
            (sum, r) => sum + r.conflictManifest.summary.totalConflicts,
            0,
        ),
        avgQualityScore: avgQuality,
        details: lines.join('\n'),
    };
}

// ============================================================================
// Apply Phase
// ============================================================================

function applyMigration(plan: MergePlan, destination: string): { success: boolean; errors: string[] } {
    const errors: string[] = [];

    // Ensure destination directory exists
    mkdirSync(destination, { recursive: true });

    // Write added files
    for (const item of plan.filesToAdd) {
        const destPath = join(destination, item.relativePath);
        const destDir = dirname(destPath);
        try {
            mkdirSync(destDir, { recursive: true });
            copyFileSync(item.sourcePath, destPath);
        } catch (err) {
            errors.push(`Failed to copy ${item.relativePath}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    // Write merged files
    for (const item of plan.filesToMerge) {
        const result = plan.reconciliationResults.get(item.relativePath);
        if (result) {
            const destPath = join(destination, item.relativePath);
            const destDir = dirname(destPath);
            try {
                mkdirSync(destDir, { recursive: true });
                writeFileSync(destPath, result.mergedContent, 'utf-8');
            } catch (err) {
                errors.push(
                    `Failed to write merged ${item.relativePath}: ${err instanceof Error ? err.message : String(err)}`,
                );
            }
        }
    }

    // Write merged files (source vs destination conflicts)
    for (const item of plan.filesToMergeWithDest) {
        const result = plan.reconciliationResults.get(item.relativePath);
        if (result) {
            const destPath = join(destination, item.relativePath);
            const destDir = dirname(destPath);
            try {
                mkdirSync(destDir, { recursive: true });
                writeFileSync(destPath, result.mergedContent, 'utf-8');
            } catch (err) {
                errors.push(
                    `Failed to write merged ${item.relativePath}: ${err instanceof Error ? err.message : String(err)}`,
                );
            }
        }
    }

    // Write converted files
    for (const item of plan.filesToConvert) {
        const pyContent = readFileSync(item.sourcePath, 'utf-8');
        const { tsContent } = convertPythonToTypeScript(pyContent, item.relativePath);
        const tsRelPath = item.relativePath.replace(/\.py$/, '.ts');
        const destPath = join(destination, tsRelPath);
        const destDir = dirname(destPath);
        try {
            mkdirSync(destDir, { recursive: true });
            writeFileSync(destPath, tsContent, 'utf-8');
        } catch (err) {
            errors.push(`Failed to write converted ${tsRelPath}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    return { success: errors.length === 0, errors };
}

// ============================================================================
// Evaluation (Phase 6)
// ============================================================================

interface EvaluateResult {
    score: number;
    error?: string;
}

/**
 * Run evaluate.ts --scope full --json on the migrated skill.
 * Reuses the same evaluate.ts engine as the evaluate and refine operations.
 */
async function runEvaluateForMigration(skillPath: string): Promise<EvaluateResult> {
    const scriptDir = dirname(fileURLToPath(import.meta.url));
    const evaluateScript = join(scriptDir, 'evaluate.ts');

    try {
        const proc = Bun.spawn(['bun', evaluateScript, skillPath, '--scope', 'full', '--json'], {
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const output = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        const exitCode = proc.exitCode;

        if (exitCode !== 0) {
            return { score: -1, error: stderr || `exit code ${exitCode}` };
        }

        const report = JSON.parse(output) as { percentage?: number; overallScore?: number };
        const score = report.percentage ?? report.overallScore ?? -1;
        return { score };
    } catch (err) {
        return { score: -1, error: err instanceof Error ? err.message : String(err) };
    }
}

// ============================================================================
// CLI
// ============================================================================

function showHelp(): void {
    logger.log('Usage: skill-migrate.ts [options]');
    logger.log('');
    logger.log('Options:');
    logger.log('  --from <path>    Source skill path (may be repeated)');
    logger.log('  --to <path>      Destination skill path (always a filesystem path)');
    logger.log('  --dry-run        Plan migration without writing files (default)');
    logger.log('  --apply          Execute the migration plan');
    logger.log('  --strict         Block apply if evaluate.ts score < 70 (runs evaluate.ts --scope full --json)');
    logger.log('  --force          Allow overwriting existing destination files');
    logger.log('  --help, -h       Show this help message');
    logger.log('');
    logger.log('Path resolution (--from only):');
    logger.log('  rd2:<skill>      → plugins/rd2/skills/<skill>/');
    logger.log('  rd3:<skill>      → plugins/rd3/skills/<skill>/');
    logger.log('  <bare-name>      → searches rd3 then rd2');
    logger.log('  path:<path>      → exact filesystem path');
    logger.log('  ~/..., ~          → tilde expansion to user home directory');
    logger.log('  vendors/..., ./   → relative to cwd (any path with / is a filesystem path)');
    logger.log('');
    logger.log('Path resolution (--to):');
    logger.log('  Always a filesystem path (absolute, relative, or path: prefix)');
    logger.log('  Never a skill name lookup');
    logger.log('');
    logger.log('Examples:');
    logger.log('  bun skill-migrate.ts --from rd2:tasks --to rd3:tasks-new --dry-run');
    logger.log('  bun skill-migrate.ts --from vendors/my-skill --to plugins/rd3/skills/my-skill --apply');
    logger.log('  bun skill-migrate.ts --from rd3:cc-skills --from rd3:cc-commands --to /tmp/merged --apply --force');
}

function parseCliArgs(argv: string[]): {
    fromPaths: string[];
    toPath: string;
    dryRun: boolean;
    apply: boolean;
    strict: boolean;
    force: boolean;
    help: boolean;
} {
    const fromPaths: string[] = [];
    let toPath = '';
    let dryRun = false;
    let apply = false;
    let strict = false;
    let force = false;
    let help = false;

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        switch (arg) {
            case '--from':
                if (i + 1 < argv.length) {
                    fromPaths.push(argv[++i]);
                }
                break;
            case '--to':
                if (i + 1 < argv.length) {
                    toPath = argv[++i];
                }
                break;
            case '--dry-run':
                dryRun = true;
                break;
            case '--apply':
                apply = true;
                break;
            case '--strict':
                strict = true;
                break;
            case '--force':
                force = true;
                break;
            case '--help':
            case '-h':
                help = true;
                break;
            default:
                // Handle --from=value and --to=value forms
                if (arg.startsWith('--from=')) {
                    fromPaths.push(arg.slice(7));
                } else if (arg.startsWith('--to=')) {
                    toPath = arg.slice(5);
                }
                break;
        }
    }

    // Default to dry-run if neither specified
    if (!apply && !dryRun) {
        dryRun = true;
    }

    return { fromPaths, toPath, dryRun, apply, strict, force, help };
}

async function main(): Promise<void> {
    const args = parseCliArgs(Bun.argv.slice(2));

    if (args.help) {
        showHelp();
        return;
    }

    if (args.fromPaths.length === 0) {
        logger.error('At least one --from source is required.');
        showHelp();
        process.exit(1);
    }

    if (!args.toPath && !args.dryRun) {
        logger.error('--to is required unless --dry-run is used.');
        showHelp();
        process.exit(1);
    }

    // Phase 1: Resolve paths
    logger.info('Phase 1: Resolving paths...');
    const resolvedSources = args.fromPaths.map((p) => resolveSkillPath(p));
    const resolvedDest = args.toPath ? resolveDestinationPath(args.toPath) : '';

    // Validate sources exist
    for (const src of resolvedSources) {
        if (!existsSync(src)) {
            logger.error(`Source path does not exist: ${src}`);
            process.exit(1);
        }
    }

    // Phase 2: Inventory
    logger.info('Phase 2: Inventorying sources...');
    const inventories = resolvedSources.map((src) => inventorySource(src));

    for (const inv of inventories) {
        logger.info(
            `  ${inv.sourceName}: ${inv.items.length} files (SKILL.md: ${inv.hasSkillMd}, scripts: ${inv.hasScripts}, tests: ${inv.hasTests}, refs: ${inv.hasReferences})`,
        );
    }

    // Phase 3: Merge Planning
    logger.info('Phase 3: Creating merge plan...');
    const plan = createMergePlan(inventories, resolvedDest);

    logger.info(
        `  Files to add: ${plan.filesToAdd.length}, merge: ${plan.filesToMerge.length}, merge-with-dest: ${plan.filesToMergeWithDest.length}, convert: ${plan.filesToConvert.length}`,
    );

    // Warn about destination conflicts (non-blocking)
    if (plan.filesWithDestConflicts.length > 0) {
        logger.warn(`WARNING: ${plan.filesWithDestConflicts.length} file(s) exist at destination with same path — will be merged via reconciliation:`);
        for (const f of plan.filesWithDestConflicts) {
            logger.warn(`  - ${f}`);
        }
        if (!args.force) {
            logger.error('Use --force to overwrite destination files without confirmation, or merge manually before migrating.');
            logger.error('Alternatively, use --dry-run first to review the plan.');
            process.exit(1);
        } else {
            logger.warn('--force set: proceeding with reconciliation merge for conflicting files.');
        }
    }

    // Phase 4: Generate Report
    const mode = args.apply ? 'apply' : 'dry-run';
    const report = generateReport(inventories, plan, resolvedDest || '(dry-run)', mode);

    // Phase 5: Apply
    if (args.apply && resolvedDest) {
        logger.info('Phase 5: Applying migration...');
        const { success, errors } = applyMigration(plan, resolvedDest);

        if (!success) {
            logger.error('Migration completed with errors:');
            for (const err of errors) {
                logger.error(`  ${err}`);
            }
            process.exit(1);
        }

        logger.success(`Migration applied to ${resolvedDest}`);

        // Write report to destination
        const reportPath = join(resolvedDest, `migration-report-${new Date().toISOString().replace(/[:.]/g, '-')}.md`);
        writeFileSync(reportPath, report.details, 'utf-8');
        logger.info(`Report written to ${reportPath}`);
    } else {
        logger.info('Dry-run mode — no files written.');
    }

    // Phase 6: Validate via evaluate.ts --scope full (strict mode)
    // Reuses the same evaluate.ts engine as the evaluate and refine operations
    if (args.strict && args.apply && resolvedDest) {
        logger.info('Phase 6: Running quality evaluation...');
        const { score, error } = await runEvaluateForMigration(resolvedDest);

        if (error) {
            logger.error(`Evaluation failed: ${error}`);
            logger.log(`\n${report.details}`);
            process.exit(1);
        }

        if (score < 70) {
            logger.error(
                `Quality gate failed: evaluation score ${score.toFixed(1)}/100 is below 70. Use without --strict to override.`,
            );
            logger.log(`\n${report.details}`);
            process.exit(1);
        }

        logger.success(`Quality check passed: ${score.toFixed(1)}/100`);
    }

    // Always output the migration report
    logger.log(`\n${report.details}`);
}

if (import.meta.main) {
    await main();
}
