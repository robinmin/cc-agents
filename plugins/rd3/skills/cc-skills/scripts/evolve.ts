#!/usr/bin/env bun
/**
 * Skill evolution workflow for rd3:cc-skills.
 *
 * Analyze and persist proposal-driven improvements around deterministic
 * refine flows, including snapshot-backed apply and rollback for skill
 * directories and generated companions.
 */

import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import type {
    EvolutionAnalysis,
    EvolutionPlaceholderResultBase,
    EvolutionRunOptionsBase,
    EvolutionRunResultBase,
} from '../../../scripts/evolution-contract';
import {
    analyzeEvaluationReport,
    captureDirectorySnapshot,
    formatAnalysis,
    formatHistory,
    formatProposals,
    getNextVersionId,
    generateRefineBackedProposals,
    loadVersionHistory,
    loadProposalSet,
    restoreDirectorySnapshot,
    runScript,
    saveProposalSet,
    saveSnapshotBackup,
    saveVersionSnapshot,
    type GenericEvaluationReport,
    type MultiFileVersionSnapshot,
    type StoredProposalSet,
} from '../../../scripts/evolution-engine';
import { logger } from '../../../scripts/logger';

const EVOLUTION_NAMESPACE = '.cc-skills';

type SkillPatternAnalysis = EvolutionAnalysis;

export interface SkillEvolveOptions extends EvolutionRunOptionsBase {
    skillPath: string;
}

export interface SkillEvolveResult
    extends EvolutionRunResultBase<SkillPatternAnalysis, StoredProposalSet, MultiFileVersionSnapshot> {}

export interface SkillEvolvePlaceholderResult extends EvolutionPlaceholderResultBase {
    skill: 'rd3:cc-skills';
    skillPath: string;
}

function getSkillGrade(percentage: number): string {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
}

export function printUsage(): void {
    logger.log('Usage: evolve.ts <skill-path> --analyze|--propose|--apply <id>|--history|--rollback <ver>');
    logger.log('');
    logger.log('Arguments:');
    logger.log('  <skill-path>        Path to the skill directory');
    logger.log('');
    logger.log('Commands:');
    logger.log('  --analyze           Analyze longitudinal improvement signals');
    logger.log('  --propose           Generate refine-backed improvement proposals');
    logger.log('  --apply <id>        Apply a saved proposal (requires --confirm)');
    logger.log('  --history           Show applied version history');
    logger.log('  --rollback <ver>    Restore a previous version (requires --confirm)');
    logger.log('');
    logger.log('Options:');
    logger.log('  --confirm           Required for apply and rollback');
    logger.log('  -h, --help          Show this help message');
}

function exitWithUsage(message: string): never {
    logger.error(message);
    printUsage();
    process.exit(1);
}

export function parseCliArgs(argv: string[] = process.argv.slice(2)): SkillEvolveOptions {
    const args = parseArgs({
        args: argv,
        allowPositionals: true,
        options: {
            analyze: { type: 'boolean', default: false },
            propose: { type: 'boolean', default: false },
            apply: { type: 'string', default: '' },
            history: { type: 'boolean', default: false },
            rollback: { type: 'string', default: '' },
            confirm: { type: 'boolean', default: false },
            help: { type: 'boolean', short: 'h', default: false },
        },
    });

    if (args.values.help) {
        printUsage();
        process.exit(0);
    }

    const skillPath = args.positionals[0];
    if (!skillPath) {
        exitWithUsage('Missing required argument <skill-path>.');
    }

    const resolvedPath = resolve(skillPath);
    if (!existsSync(resolvedPath)) {
        exitWithUsage(`Skill path does not exist: ${resolvedPath}`);
    }

    const commandFlags = [
        { active: args.values.analyze, command: 'analyze' as const },
        { active: args.values.propose, command: 'propose' as const },
        { active: Boolean(args.values.apply), command: 'apply' as const },
        { active: args.values.history, command: 'history' as const },
        { active: Boolean(args.values.rollback), command: 'rollback' as const },
    ];

    const activeCommands = commandFlags.filter((entry) => entry.active);
    if (activeCommands.length !== 1) {
        exitWithUsage('Specify exactly one evolve command.');
    }
    const [activeCommand] = activeCommands;
    if (!activeCommand) {
        exitWithUsage('Specify exactly one evolve command.');
    }

    return {
        skillPath: resolvedPath,
        command: activeCommand.command,
        confirm: args.values.confirm,
        ...(args.values.apply ? { proposalId: args.values.apply } : {}),
        ...(args.values.rollback ? { versionId: args.values.rollback } : {}),
    };
}

async function buildEvaluationReport(skillPath: string): Promise<GenericEvaluationReport> {
    const evaluateScript = join(import.meta.dir, 'evaluate.ts');
    const result = await runScript(evaluateScript, [skillPath, '--scope', 'full', '--json']);

    if (result.exitCode > 1) {
        throw new Error((result.stderr || result.stdout || 'evaluate.ts failed').trim());
    }

    const report = JSON.parse(result.stdout) as {
        skillPath: string;
        skillName: string;
        percentage: number;
        passed: boolean;
        rejected?: boolean;
        rejectReason?: string;
        dimensions: Array<{
            name: string;
            category?: string;
            score: number;
            maxScore: number;
            percentage?: number;
            findings: string[];
            recommendations: string[];
        }>;
    };

    return {
        targetPath: report.skillPath,
        targetName: report.skillName,
        percentage: report.percentage,
        passed: report.passed,
        grade: getSkillGrade(report.percentage),
        dimensions: report.dimensions.map((dimension) => ({
            name: dimension.name,
            displayName: dimension.category ? `${dimension.category}: ${dimension.name}` : dimension.name,
            score: dimension.score,
            maxScore: dimension.maxScore,
            findings: dimension.findings,
            recommendations: dimension.recommendations,
            ...(typeof dimension.percentage === 'number' ? { percentage: dimension.percentage } : {}),
        })),
        ...(typeof report.rejected === 'boolean' ? { rejected: report.rejected } : {}),
        ...(report.rejectReason ? { rejectReason: report.rejectReason } : {}),
    };
}

async function analyzeSkill(skillPath: string): Promise<SkillPatternAnalysis> {
    const report = await buildEvaluationReport(skillPath);
    return analyzeEvaluationReport(report);
}

async function proposeSkillEvolution(skillPath: string): Promise<StoredProposalSet> {
    const report = await buildEvaluationReport(skillPath);
    const analysis = analyzeEvaluationReport(report);
    const proposalSet = generateRefineBackedProposals(report, analysis, {
        defaultFlags: ['--best-practices'],
        migrateFlags: ['--migrate'],
        applySupported: true,
    });

    saveProposalSet(EVOLUTION_NAMESPACE, skillPath, proposalSet);
    return proposalSet;
}

async function applySkillProposal(skillPath: string, proposalId?: string) {
    if (!proposalId) {
        return { success: false, error: 'Proposal id is required' };
    }

    const proposalSet = loadProposalSet(EVOLUTION_NAMESPACE, skillPath);
    if (!proposalSet) {
        return { success: false, error: 'No saved proposals found. Run --propose first.' };
    }

    const proposal = proposalSet.proposals.find((entry) => entry.id === proposalId);
    if (!proposal) {
        return { success: false, error: `Proposal ${proposalId} not found` };
    }

    const baselineReport = await buildEvaluationReport(skillPath);
    let history = loadVersionHistory<MultiFileVersionSnapshot>(EVOLUTION_NAMESPACE, skillPath);
    if (history.length === 0) {
        saveVersionSnapshot(
            EVOLUTION_NAMESPACE,
            skillPath,
            captureDirectorySnapshot(
                skillPath,
                'v0',
                baselineReport.grade || 'unknown',
                'Baseline before first evolve apply',
                [],
            ),
        );
        history = loadVersionHistory<MultiFileVersionSnapshot>(EVOLUTION_NAMESPACE, skillPath);
    }

    const refineScript = join(import.meta.dir, 'refine.ts');
    const refineResult = await runScript(refineScript, [skillPath, ...proposal.action.flags]);

    if (refineResult.exitCode !== 0) {
        return {
            success: false,
            error: (refineResult.stderr || refineResult.stdout || 'refine.ts failed').trim(),
        };
    }

    const updatedReport = await buildEvaluationReport(skillPath);
    const snapshot = captureDirectorySnapshot(
        skillPath,
        getNextVersionId(history),
        updatedReport.grade || 'unknown',
        proposal.description,
        [proposal.id],
    );
    saveVersionSnapshot(EVOLUTION_NAMESPACE, skillPath, snapshot);

    return { success: true };
}

function rollbackSkillVersion(skillPath: string, versionId?: string) {
    if (!versionId) {
        return { success: false, error: 'Version id is required' };
    }

    const history = loadVersionHistory<MultiFileVersionSnapshot>(EVOLUTION_NAMESPACE, skillPath);
    const snapshot = history.find((entry) => entry.version === versionId);
    if (!snapshot) {
        return { success: false, error: `Version ${versionId} not found` };
    }

    saveSnapshotBackup(
        EVOLUTION_NAMESPACE,
        skillPath,
        captureDirectorySnapshot(skillPath, 'rollback-backup', 'unknown', `Backup before rollback to ${versionId}`, []),
        'rollback',
    );
    restoreDirectorySnapshot(snapshot);
    return { success: true, content: snapshot.content };
}

export async function runEvolve(options: SkillEvolveOptions): Promise<SkillEvolveResult> {
    switch (options.command) {
        case 'analyze':
            return { analysis: await analyzeSkill(options.skillPath) };
        case 'propose':
            return { proposals: await proposeSkillEvolution(options.skillPath) };
        case 'history':
            return { versions: loadVersionHistory<MultiFileVersionSnapshot>(EVOLUTION_NAMESPACE, options.skillPath) };
        case 'apply':
            return { applyResult: await applySkillProposal(options.skillPath, options.proposalId) };
        case 'rollback':
            return { rollbackResult: rollbackSkillVersion(options.skillPath, options.versionId) };
        default:
            return { applyResult: { success: false, error: 'Unsupported evolve command' } };
    }
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
    const options = parseCliArgs(argv);

    if ((options.command === 'apply' || options.command === 'rollback') && !options.confirm) {
        logger.error(`--${options.command} requires --confirm for safety.`);
        process.exit(1);
    }

    const result = await runEvolve(options);

    if (result.analysis) {
        const report = await buildEvaluationReport(options.skillPath);
        logger.log(formatAnalysis(report, result.analysis));
        process.exit(0);
    }

    if (result.proposals) {
        logger.log(formatProposals(result.proposals));
        process.exit(0);
    }

    if (result.versions) {
        logger.log(formatHistory(result.versions));
        process.exit(0);
    }

    if (result.applyResult) {
        if (!result.applyResult.success) {
            logger.error(result.applyResult.error || 'Failed to apply proposal');
            process.exit(1);
        }
        logger.log(`Proposal ${options.proposalId} applied successfully.`);
        process.exit(0);
    }

    if (result.rollbackResult) {
        if (!result.rollbackResult.success) {
            logger.error(result.rollbackResult.error || 'Failed to rollback version');
            process.exit(1);
        }
        logger.log(`Rolled back to ${options.versionId} successfully.`);
        process.exit(0);
    }

    logger.error('No evolve result produced.');
    process.exit(1);
}

if (import.meta.main) {
    await main();
}
