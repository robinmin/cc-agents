#!/usr/bin/env bun
/**
 * Command evolution workflow for rd3:cc-commands.
 *
 * Analyze and persist proposal-driven improvements around deterministic
 * refine flows, including snapshot-backed apply and rollback for command
 * companions generated during refinement.
 */

import { existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import type {
    EvolutionAnalysis,
    EvolutionRunOptionsBase,
    EvolutionRunResultBase,
} from '../../../scripts/evolution-contract';
import {
    analyzeEvaluationReport,
    captureTargetedSnapshot,
    formatAnalysis,
    formatHistory,
    formatProposals,
    getNextVersionId,
    generateRefineBackedProposals,
    loadVersionHistory,
    loadProposalSet,
    restoreTargetedSnapshot,
    runScript,
    saveProposalSet,
    saveSnapshotBackup,
    saveVersionSnapshot,
    type GenericEvaluationReport,
    type MultiFileVersionSnapshot,
    type StoredProposalSet,
} from '../../../scripts/evolution-engine';
import { logger } from '../../../scripts/logger';

const EVOLUTION_NAMESPACE = '.cc-commands';

type CommandPatternAnalysis = EvolutionAnalysis;

export interface CommandEvolveOptions extends EvolutionRunOptionsBase {
    commandPath: string;
}

export interface CommandEvolveResult
    extends EvolutionRunResultBase<CommandPatternAnalysis, StoredProposalSet, MultiFileVersionSnapshot> {}

export function printUsage(): void {
    logger.log('Usage: evolve.ts <command-path> --analyze|--propose|--apply <id>|--history|--rollback <ver>');
    logger.log('');
    logger.log('Arguments:');
    logger.log('  <command-path>      Path to the command .md file');
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

export function parseCliArgs(argv: string[] = process.argv.slice(2)): CommandEvolveOptions {
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

    const commandPath = args.positionals[0];
    if (!commandPath) {
        exitWithUsage('Missing required argument <command-path>.');
    }

    const resolvedPath = resolve(commandPath);
    if (!existsSync(resolvedPath)) {
        exitWithUsage(`Command path does not exist: ${resolvedPath}`);
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
        commandPath: resolvedPath,
        command: activeCommand.command,
        confirm: args.values.confirm,
        ...(args.values.apply ? { proposalId: args.values.apply } : {}),
        ...(args.values.rollback ? { versionId: args.values.rollback } : {}),
    };
}

async function buildEvaluationReport(commandPath: string): Promise<GenericEvaluationReport> {
    const evaluateScript = join(import.meta.dir, 'evaluate.ts');
    const result = await runScript(evaluateScript, [commandPath, '--scope', 'full', '--json']);

    if (result.exitCode > 1) {
        throw new Error((result.stderr || result.stdout || 'evaluate.ts failed').trim());
    }

    const report = JSON.parse(result.stdout) as {
        commandPath: string;
        commandName: string;
        percentage: number;
        passed: boolean;
        grade?: string;
        rejected?: boolean;
        rejectReason?: string;
        dimensions: Array<{
            name: string;
            displayName: string;
            score: number;
            maxScore: number;
            findings: string[];
            recommendations: string[];
        }>;
    };

    return {
        targetPath: report.commandPath,
        targetName: report.commandName,
        percentage: report.percentage,
        passed: report.passed,
        dimensions: report.dimensions.map((dimension) => ({
            name: dimension.name,
            displayName: dimension.displayName,
            score: dimension.score,
            maxScore: dimension.maxScore,
            findings: dimension.findings,
            recommendations: dimension.recommendations,
        })),
        ...(report.grade ? { grade: report.grade } : {}),
        ...(typeof report.rejected === 'boolean' ? { rejected: report.rejected } : {}),
        ...(report.rejectReason ? { rejectReason: report.rejectReason } : {}),
    };
}

async function analyzeCommand(commandPath: string): Promise<CommandPatternAnalysis> {
    const report = await buildEvaluationReport(commandPath);
    return analyzeEvaluationReport(report);
}

async function proposeCommandEvolution(commandPath: string): Promise<StoredProposalSet> {
    const report = await buildEvaluationReport(commandPath);
    const analysis = analyzeEvaluationReport(report);
    const proposalSet = generateRefineBackedProposals(report, analysis, {
        defaultFlags: [],
        migrateFlags: ['--migrate'],
        applySupported: true,
    });

    saveProposalSet(EVOLUTION_NAMESPACE, commandPath, proposalSet);
    return proposalSet;
}

function getCommandManagedPaths(commandPath: string): string[] {
    const resolvedPath = resolve(commandPath);
    const commandDir = dirname(resolvedPath);
    const commandName = basename(resolvedPath, '.md');

    return [
        resolvedPath,
        join(commandDir, 'metadata.openclaw'),
        join(commandDir, 'commands.toml'),
        join(commandDir, `${commandName}.openclaw.md`),
        join(commandDir, `${commandName}.opencode.md`),
        join(commandDir, `${commandName}.permissions.yaml`),
        join(commandDir, `${commandName}.ag.md`),
        join(commandDir, 'agents', 'openai.yaml'),
        join(commandDir, 'skills', commandName, 'SKILL.md'),
    ];
}

async function applyCommandProposal(commandPath: string, proposalId?: string) {
    if (!proposalId) {
        return { success: false, error: 'Proposal id is required' };
    }

    const proposalSet = loadProposalSet(EVOLUTION_NAMESPACE, commandPath);
    if (!proposalSet) {
        return { success: false, error: 'No saved proposals found. Run --propose first.' };
    }

    const proposal = proposalSet.proposals.find((entry) => entry.id === proposalId);
    if (!proposal) {
        return { success: false, error: `Proposal ${proposalId} not found` };
    }

    const baselineReport = await buildEvaluationReport(commandPath);
    let history = loadVersionHistory<MultiFileVersionSnapshot>(EVOLUTION_NAMESPACE, commandPath);
    if (history.length === 0) {
        saveVersionSnapshot(
            EVOLUTION_NAMESPACE,
            commandPath,
            captureTargetedSnapshot(
                dirname(commandPath),
                getCommandManagedPaths(commandPath),
                'v0',
                baselineReport.grade || 'unknown',
                'Baseline before first evolve apply',
                [],
            ),
        );
        history = loadVersionHistory<MultiFileVersionSnapshot>(EVOLUTION_NAMESPACE, commandPath);
    }

    const refineScript = join(import.meta.dir, 'refine.ts');
    const refineResult = await runScript(refineScript, [commandPath, ...proposal.action.flags]);

    if (refineResult.exitCode !== 0) {
        return {
            success: false,
            error: (refineResult.stderr || refineResult.stdout || 'refine.ts failed').trim(),
        };
    }

    const updatedReport = await buildEvaluationReport(commandPath);
    const snapshot = captureTargetedSnapshot(
        dirname(commandPath),
        getCommandManagedPaths(commandPath),
        getNextVersionId(history),
        updatedReport.grade || 'unknown',
        proposal.description,
        [proposal.id],
    );
    saveVersionSnapshot(EVOLUTION_NAMESPACE, commandPath, snapshot);

    return { success: true };
}

function rollbackCommandVersion(commandPath: string, versionId?: string) {
    if (!versionId) {
        return { success: false, error: 'Version id is required' };
    }

    const history = loadVersionHistory<MultiFileVersionSnapshot>(EVOLUTION_NAMESPACE, commandPath);
    const snapshot = history.find((entry) => entry.version === versionId);
    if (!snapshot) {
        return { success: false, error: `Version ${versionId} not found` };
    }

    saveSnapshotBackup(
        EVOLUTION_NAMESPACE,
        commandPath,
        captureTargetedSnapshot(
            dirname(commandPath),
            getCommandManagedPaths(commandPath),
            'rollback-backup',
            'unknown',
            `Backup before rollback to ${versionId}`,
            [],
        ),
        'rollback',
    );
    restoreTargetedSnapshot(snapshot, getCommandManagedPaths(commandPath));
    return { success: true, content: snapshot.content };
}

export async function runEvolve(options: CommandEvolveOptions): Promise<CommandEvolveResult> {
    switch (options.command) {
        case 'analyze':
            return { analysis: await analyzeCommand(options.commandPath) };
        case 'propose':
            return { proposals: await proposeCommandEvolution(options.commandPath) };
        case 'history':
            return { versions: loadVersionHistory<MultiFileVersionSnapshot>(EVOLUTION_NAMESPACE, options.commandPath) };
        case 'apply':
            return { applyResult: await applyCommandProposal(options.commandPath, options.proposalId) };
        case 'rollback':
            return { rollbackResult: rollbackCommandVersion(options.commandPath, options.versionId) };
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
        const report = await buildEvaluationReport(options.commandPath);
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
