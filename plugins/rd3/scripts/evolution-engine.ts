import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

import type {
    EvolutionAnalysis,
    EvolutionApplyResult,
    EvolutionDataSource,
    EvolutionPattern,
    EvolutionProposal,
    EvolutionResult,
    EvolutionRollbackResult,
    EvolutionVersionSnapshot,
} from './evolution-contract';

export interface GenericEvaluationDimension {
    name: string;
    displayName?: string;
    score: number;
    maxScore: number;
    percentage?: number;
    findings: string[];
    recommendations: string[];
}

export interface GenericEvaluationReport {
    targetPath: string;
    targetName: string;
    percentage: number;
    passed: boolean;
    grade?: string;
    rejected?: boolean;
    rejectReason?: string;
    dimensions: GenericEvaluationDimension[];
}

export interface RefineAction {
    type: 'run-refine';
    flags: string[];
    supportsApply: boolean;
}

export interface RefineBackedProposal extends EvolutionProposal {
    action: RefineAction;
    priority: 'high' | 'medium' | 'low';
}

export interface StoredProposalSet {
    targetPath: string;
    targetName: string;
    evaluationPercentage: number;
    generatedAt: string;
    proposals: RefineBackedProposal[];
}

export interface SnapshotEntry {
    path: string;
    content: string;
}

export interface MultiFileVersionSnapshot extends EvolutionVersionSnapshot<string> {
    rootPath: string;
    entries: SnapshotEntry[];
}

export interface ProposalGenerationOptions {
    defaultFlags: string[];
    migrateFlags?: string[];
    applySupported: boolean;
}

export interface EvolutionStoragePaths {
    rootDir: string;
    proposalsPath: string;
    historyPath: string;
    backupsDir: string;
}

export interface ScriptRunResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}

function findWorkspaceRoot(startDir: string): string {
    let current = resolve(startDir);

    while (true) {
        if (existsSync(join(current, '.git'))) {
            return current;
        }

        const parent = dirname(current);
        if (parent === current) {
            return startDir;
        }
        current = parent;
    }
}

function getTargetKey(targetPath: string): string {
    return basename(targetPath).replace(/\.[^.]+$/, '');
}

function getDimensionPercentage(dimension: GenericEvaluationDimension): number {
    if (typeof dimension.percentage === 'number') {
        return dimension.percentage;
    }

    if (dimension.maxScore <= 0) {
        return 0;
    }

    return Math.round((dimension.score / dimension.maxScore) * 100);
}

function pickSource(targetPath: string): EvolutionDataSource {
    const availability = detectDataSourceAvailability(targetPath);
    if (availability['ci-results']) return 'ci-results';
    if (availability['git-history']) return 'git-history';
    if (availability['user-feedback']) return 'user-feedback';
    if (availability['memory-md']) return 'memory-md';
    return 'interaction-logs';
}

function needsMigration(report: GenericEvaluationReport): boolean {
    if (report.rejected) {
        return true;
    }

    return report.dimensions.some((dimension) => {
        const label = `${dimension.name} ${dimension.displayName ?? ''}`.toLowerCase();
        const pct = getDimensionPercentage(dimension);
        return (label.includes('frontmatter') || label.includes('naming')) && pct < 40;
    });
}

function hasCriticalSignals(report: GenericEvaluationReport): boolean {
    if (report.rejected) {
        return true;
    }

    return report.dimensions.some((dimension) => {
        const label = `${dimension.name} ${dimension.displayName ?? ''}`.toLowerCase();
        const evidence = [...dimension.findings, ...dimension.recommendations].join(' ').toLowerCase();
        return label.includes('security') || evidence.includes('security') || evidence.includes('danger');
    });
}

function createProposalId(): string {
    return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function getEvolutionStoragePaths(namespace: string, targetPath: string): EvolutionStoragePaths {
    const resolvedTarget = resolve(targetPath);
    const storageRoot = join(dirname(resolvedTarget), namespace, 'evolution');
    const targetKey = getTargetKey(resolvedTarget);

    return {
        rootDir: storageRoot,
        proposalsPath: join(storageRoot, 'proposals', `${targetKey}.proposals.json`),
        historyPath: join(storageRoot, 'versions', `${targetKey}.history.json`),
        backupsDir: join(storageRoot, 'backups'),
    };
}

export function detectDataSourceAvailability(targetPath: string): Record<EvolutionDataSource, boolean> {
    const resolvedTarget = resolve(targetPath);
    const startDir =
        existsSync(resolvedTarget) && !resolvedTarget.endsWith('.md') ? resolvedTarget : dirname(resolvedTarget);
    const workspaceRoot = findWorkspaceRoot(startDir);

    return {
        'git-history': existsSync(join(workspaceRoot, '.git')),
        'ci-results': existsSync(join(workspaceRoot, '.github', 'workflows')),
        'user-feedback':
            existsSync(join(workspaceRoot, 'FEEDBACK.md')) || existsSync(join(workspaceRoot, 'feedback.md')),
        'memory-md': existsSync(join(workspaceRoot, 'MEMORY.md')),
        'interaction-logs': existsSync(join(workspaceRoot, '.logs')) || existsSync(join(workspaceRoot, 'logs')),
    };
}

export function analyzeEvaluationReport(
    report: GenericEvaluationReport,
): EvolutionAnalysis<EvolutionDataSource, EvolutionPattern<EvolutionDataSource>> {
    const dataSourceAvailability = detectDataSourceAvailability(report.targetPath);
    const patterns: EvolutionPattern<EvolutionDataSource>[] = [];
    const weakDimensions = report.dimensions
        .map((dimension) => ({ dimension, percentage: getDimensionPercentage(dimension) }))
        .filter((entry) => entry.percentage < 70);

    if (report.rejected) {
        patterns.push({
            type: 'failure',
            source: pickSource(report.targetPath),
            description: report.rejectReason || 'Evaluation rejected this target',
            evidence: [report.rejectReason || 'Rejected during evaluation'],
            confidence: 0.95,
            affectedSection: 'security',
        });
    }

    for (const entry of weakDimensions.slice(0, 5)) {
        const label = entry.dimension.displayName || entry.dimension.name;
        patterns.push({
            type: 'gap',
            source: pickSource(report.targetPath),
            description: `${label} is under threshold at ${entry.percentage}%`,
            evidence: [...entry.dimension.findings, ...entry.dimension.recommendations].slice(0, 4),
            confidence: entry.percentage < 40 ? 0.9 : 0.75,
            affectedSection: label,
        });
    }

    if (report.passed && report.percentage >= 90) {
        patterns.push({
            type: 'success',
            source: pickSource(report.targetPath),
            description: `${report.targetName} is currently stable at ${report.percentage}%`,
            evidence: ['Evaluation passed with an A-range score'],
            confidence: 0.7,
            affectedSection: 'overall-quality',
        });
    }

    const summary =
        `Analysis complete for ${report.targetName}: ${patterns.length} pattern(s), ` +
        `${weakDimensions.length} weak dimension(s), overall ${report.percentage}%.`;

    return { patterns, dataSourceAvailability, summary };
}

export function generateRefineBackedProposals(
    report: GenericEvaluationReport,
    analysis: EvolutionAnalysis<EvolutionDataSource, EvolutionPattern<EvolutionDataSource>>,
    options: ProposalGenerationOptions,
): StoredProposalSet {
    const proposals: RefineBackedProposal[] = [];
    const weakDimensions = report.dimensions
        .map((dimension) => ({ dimension, percentage: getDimensionPercentage(dimension) }))
        .filter((entry) => entry.percentage < 70)
        .sort((a, b) => a.percentage - b.percentage);

    if (report.rejected || !report.passed) {
        proposals.push({
            id: createProposalId(),
            targetSection: 'overall-quality',
            changeType: 'modify',
            description: `Run refine to address ${weakDimensions.length || 1} weak area(s)`,
            rationale: report.rejectReason || `Current evaluation is ${report.percentage}%, below the expected bar.`,
            source: pickSource(report.targetPath),
            confidence: report.rejected ? 0.95 : 0.8,
            affectsCritical: hasCriticalSignals(report),
            action: {
                type: 'run-refine',
                flags: options.defaultFlags,
                supportsApply: options.applySupported,
            },
            priority: report.rejected ? 'high' : 'medium',
        });
    }

    for (const entry of weakDimensions.slice(0, 3)) {
        const label = entry.dimension.displayName || entry.dimension.name;
        proposals.push({
            id: createProposalId(),
            targetSection: label,
            changeType: 'modify',
            description: `Improve ${label}`,
            rationale:
                [...entry.dimension.recommendations, ...entry.dimension.findings].slice(0, 2).join(' ') ||
                `${label} scored ${entry.percentage}% in evaluation.`,
            source: pickSource(report.targetPath),
            confidence: entry.percentage < 40 ? 0.9 : 0.7,
            affectsCritical: hasCriticalSignals(report) && label.toLowerCase().includes('security'),
            action: {
                type: 'run-refine',
                flags: options.defaultFlags,
                supportsApply: options.applySupported,
            },
            priority: entry.percentage < 40 ? 'high' : 'medium',
        });
    }

    if (options.migrateFlags && needsMigration(report)) {
        proposals.push({
            id: createProposalId(),
            targetSection: 'migration',
            changeType: 'modify',
            description: 'Run migration-oriented refine flow',
            rationale: 'The evaluation indicates schema or naming issues that usually benefit from migration mode.',
            source: pickSource(report.targetPath),
            confidence: 0.85,
            affectsCritical: false,
            action: {
                type: 'run-refine',
                flags: options.migrateFlags,
                supportsApply: options.applySupported,
            },
            priority: 'high',
        });
    }

    if (analysis.patterns.length === 0) {
        proposals.push({
            id: createProposalId(),
            targetSection: 'maintenance',
            changeType: 'modify',
            description: 'Keep the target under periodic evaluation',
            rationale:
                'No immediate weaknesses were found, but the evolve surface should still record a periodic review proposal.',
            source: pickSource(report.targetPath),
            confidence: 0.5,
            affectsCritical: false,
            action: {
                type: 'run-refine',
                flags: options.defaultFlags,
                supportsApply: options.applySupported,
            },
            priority: 'low',
        });
    }

    return {
        targetPath: report.targetPath,
        targetName: report.targetName,
        evaluationPercentage: report.percentage,
        generatedAt: new Date().toISOString(),
        proposals,
    };
}

export function saveProposalSet(namespace: string, targetPath: string, proposalSet: StoredProposalSet): string {
    const storage = getEvolutionStoragePaths(namespace, targetPath);
    mkdirSync(dirname(storage.proposalsPath), { recursive: true });
    writeFileSync(storage.proposalsPath, JSON.stringify(proposalSet, null, 2), 'utf-8');
    return storage.proposalsPath;
}

export function loadProposalSet(namespace: string, targetPath: string): StoredProposalSet | null {
    const storage = getEvolutionStoragePaths(namespace, targetPath);

    if (!existsSync(storage.proposalsPath)) {
        return null;
    }

    return JSON.parse(readFileSync(storage.proposalsPath, 'utf-8')) as StoredProposalSet;
}

export function loadVersionHistory<T extends EvolutionVersionSnapshot<string> = EvolutionVersionSnapshot<string>>(
    namespace: string,
    targetPath: string,
): T[] {
    const storage = getEvolutionStoragePaths(namespace, targetPath);

    if (!existsSync(storage.historyPath)) {
        return [];
    }

    try {
        return JSON.parse(readFileSync(storage.historyPath, 'utf-8')) as T[];
    } catch {
        return [];
    }
}

export function saveVersionSnapshot<T extends EvolutionVersionSnapshot<string>>(
    namespace: string,
    targetPath: string,
    snapshot: T,
): string {
    const storage = getEvolutionStoragePaths(namespace, targetPath);
    const history = loadVersionHistory<T>(namespace, targetPath);

    mkdirSync(dirname(storage.historyPath), { recursive: true });
    history.push(snapshot);
    writeFileSync(storage.historyPath, JSON.stringify(history, null, 2), 'utf-8');

    return storage.historyPath;
}

function parseVersionNumber(version: string): number | null {
    const match = /^v(\d+)$/.exec(version);
    if (!match) {
        return null;
    }

    const parsed = Number.parseInt(match[1], 10);
    return Number.isNaN(parsed) ? null : parsed;
}

export function getNextVersionId(versions: Array<EvolutionVersionSnapshot<string>>): string {
    const versionNumbers = versions
        .map((entry) => parseVersionNumber(entry.version))
        .filter((entry): entry is number => entry !== null);

    if (versionNumbers.length === 0) {
        return 'v1';
    }

    return `v${Math.max(...versionNumbers) + 1}`;
}

function listRelativeFiles(rootPath: string): string[] {
    if (!existsSync(rootPath)) {
        return [];
    }

    const results: string[] = [];

    function walk(currentDir: string, prefix = ''): void {
        const entries = readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const relativePath = prefix ? join(prefix, entry.name) : entry.name;
            const fullPath = join(currentDir, entry.name);

            if (entry.isDirectory()) {
                walk(fullPath, relativePath);
            } else if (entry.isFile()) {
                results.push(relativePath);
            }
        }
    }

    walk(rootPath);
    return results.sort();
}

export function captureDirectorySnapshot(
    rootPath: string,
    version: string,
    grade: string,
    changeDescription: string,
    proposalsApplied: string[],
): MultiFileVersionSnapshot {
    const resolvedRoot = resolve(rootPath);
    const entries = listRelativeFiles(resolvedRoot).map((relativePath) => ({
        path: relativePath,
        content: readFileSync(join(resolvedRoot, relativePath), 'utf-8'),
    }));

    return {
        version,
        timestamp: new Date().toISOString(),
        content: JSON.stringify(entries),
        grade,
        changeDescription,
        proposalsApplied,
        rootPath: resolvedRoot,
        entries,
    };
}

export function restoreDirectorySnapshot(snapshot: MultiFileVersionSnapshot): void {
    const currentFiles = new Set(listRelativeFiles(snapshot.rootPath));
    const snapshotFiles = new Set(snapshot.entries.map((entry) => entry.path));

    for (const relativePath of currentFiles) {
        if (!snapshotFiles.has(relativePath)) {
            rmSync(join(snapshot.rootPath, relativePath), { force: true });
        }
    }

    for (const entry of snapshot.entries) {
        const fullPath = join(snapshot.rootPath, entry.path);
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, entry.content, 'utf-8');
    }
}

export function captureTargetedSnapshot(
    rootPath: string,
    paths: string[],
    version: string,
    grade: string,
    changeDescription: string,
    proposalsApplied: string[],
): MultiFileVersionSnapshot {
    const resolvedRoot = resolve(rootPath);
    const uniquePaths = Array.from(new Set(paths.map((entry) => resolve(entry))));

    const entries = uniquePaths
        .filter((entry) => existsSync(entry))
        .map((entry) => ({
            path: entry.startsWith(`${resolvedRoot}/`) ? entry.slice(resolvedRoot.length + 1) : basename(entry),
            content: readFileSync(entry, 'utf-8'),
        }));

    return {
        version,
        timestamp: new Date().toISOString(),
        content: JSON.stringify(entries),
        grade,
        changeDescription,
        proposalsApplied,
        rootPath: resolvedRoot,
        entries,
    };
}

export function restoreTargetedSnapshot(snapshot: MultiFileVersionSnapshot, currentPaths: string[]): void {
    const snapshotFiles = new Set(snapshot.entries.map((entry) => join(snapshot.rootPath, entry.path)));

    for (const currentPath of currentPaths.map((entry) => resolve(entry))) {
        if (existsSync(currentPath) && !snapshotFiles.has(currentPath)) {
            rmSync(currentPath, { force: true });
        }
    }

    for (const entry of snapshot.entries) {
        const fullPath = join(snapshot.rootPath, entry.path);
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, entry.content, 'utf-8');
    }
}

export function saveSnapshotBackup(
    namespace: string,
    targetPath: string,
    snapshot: MultiFileVersionSnapshot,
    label: string,
): string {
    const storage = getEvolutionStoragePaths(namespace, targetPath);
    mkdirSync(storage.backupsDir, { recursive: true });

    const backupPath = join(storage.backupsDir, `${getTargetKey(targetPath)}-${label}-${Date.now()}.snapshot.json`);
    writeFileSync(backupPath, JSON.stringify(snapshot, null, 2), 'utf-8');
    return backupPath;
}

export function createBackup(namespace: string, targetPath: string, content: string): string {
    const storage = getEvolutionStoragePaths(namespace, targetPath);
    mkdirSync(storage.backupsDir, { recursive: true });

    const backupPath = join(storage.backupsDir, `${getTargetKey(targetPath)}-${Date.now()}.bak`);
    writeFileSync(backupPath, content, 'utf-8');

    return backupPath;
}

export function rollbackSingleFile(
    namespace: string,
    targetPath: string,
    versionId: string,
): EvolutionRollbackResult & { backupPath?: string } {
    const resolvedTarget = resolve(targetPath);
    const history = loadVersionHistory(namespace, resolvedTarget);
    const targetVersion = history.find((entry) => entry.version === versionId);

    if (!targetVersion) {
        return { success: false, error: `Version ${versionId} not found` };
    }

    if (!existsSync(resolvedTarget)) {
        return { success: false, error: `Target does not exist: ${resolvedTarget}` };
    }

    const currentContent = readFileSync(resolvedTarget, 'utf-8');
    const backupPath = createBackup(namespace, resolvedTarget, currentContent);
    writeFileSync(resolvedTarget, targetVersion.content, 'utf-8');

    return { success: true, content: targetVersion.content, backupPath };
}

export async function runScript(scriptPath: string, args: string[]): Promise<ScriptRunResult> {
    const proc = Bun.spawn(['bun', 'run', scriptPath, ...args], {
        stdout: 'pipe',
        stderr: 'pipe',
    });

    const [exitCode, stdout, stderr] = await Promise.all([
        proc.exited,
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
    ]);

    return { exitCode, stdout, stderr };
}

export function formatAnalysis(
    report: GenericEvaluationReport,
    analysis: EvolutionAnalysis<EvolutionDataSource, EvolutionPattern<EvolutionDataSource>>,
): string {
    const lines = [
        '=== Evolution Analysis ===',
        '',
        `Target: ${report.targetName}`,
        `Score: ${report.percentage}%${report.grade ? ` (${report.grade})` : ''}`,
        `Status: ${report.passed ? 'PASS' : 'FAIL'}`,
        analysis.summary,
        '',
        'Available data sources:',
    ];

    for (const [source, available] of Object.entries(analysis.dataSourceAvailability)) {
        lines.push(`- ${source}: ${available ? 'available' : 'missing'}`);
    }

    lines.push('', 'Patterns:');

    if (analysis.patterns.length === 0) {
        lines.push('- No significant patterns detected.');
    } else {
        for (const pattern of analysis.patterns) {
            lines.push(`- [${pattern.type}] ${pattern.description}`);
        }
    }

    return lines.join('\n');
}

export function formatProposals(proposalSet: StoredProposalSet): string {
    const lines = [
        '=== Evolution Proposals ===',
        '',
        `Target: ${proposalSet.targetName}`,
        `Generated: ${proposalSet.generatedAt}`,
        `Evaluation score: ${proposalSet.evaluationPercentage}%`,
        '',
    ];

    if (proposalSet.proposals.length === 0) {
        lines.push('No proposals generated.');
        return lines.join('\n');
    }

    for (const proposal of proposalSet.proposals) {
        lines.push(`${proposal.id} [${proposal.priority}] ${proposal.description}`);
        lines.push(`  Section: ${proposal.targetSection}`);
        lines.push(`  Rationale: ${proposal.rationale}`);
        lines.push(`  Apply support: ${proposal.action.supportsApply ? 'yes' : 'no'}`);
        lines.push('');
    }

    return lines.join('\n').trimEnd();
}

export function formatHistory(versions: Array<EvolutionVersionSnapshot<string>>): string {
    if (versions.length === 0) {
        return 'No version history available.';
    }

    const lines = ['=== Evolution History ===', ''];

    for (const version of versions) {
        lines.push(`${version.version} (${version.grade}) ${version.timestamp}`);
        lines.push(`  Change: ${version.changeDescription}`);
        lines.push(`  Proposals: ${version.proposalsApplied.join(', ') || 'none'}`);
        lines.push('');
    }

    return lines.join('\n').trimEnd();
}

export function formatUnsupportedApply(message: string): EvolutionApplyResult {
    return { success: false, error: message };
}
