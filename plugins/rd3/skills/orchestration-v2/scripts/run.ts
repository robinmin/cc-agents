#!/usr/bin/env bun
/**
 * orchestration-v2 — CLI entry point
 *
 * Usage: orchestrator <command> [options]
 *
 * Commands: run, resume, status, report, validate, list, history, undo, inspect, prune, migrate
 */

import { parseArgs, validateCommand } from './cli/commands';
import { formatStatusOutput, formatStatusJson } from './cli/status';
import { outputReport } from './cli/report';
import { PipelineRunner } from './engine/runner';
import { parsePipelineYaml, parseYamlString, validatePipeline } from './config/parser';
import { resolveExtends } from './config/resolver';
import { StateManager } from './state/manager';
import { Queries } from './state/queries';
import { Reporter } from './observability/reporter';
import { logger } from '../../../scripts/logger';
import {
    EXIT_SUCCESS,
    EXIT_PIPELINE_FAILED,
    EXIT_PIPELINE_PAUSED,
    EXIT_INVALID_ARGS,
    EXIT_VALIDATION_FAILED,
    EXIT_TASK_NOT_FOUND,
    EXIT_STATE_ERROR,
} from './model';
import { migrateFromV1 } from './state/migrate-v1';
import type { RunOptions, ResumeOptions, ReportFormat } from './model';

const DB_PATH = '.orchestrator/state.db';
const PRESETS_DIR = 'references/examples';

function printHelp(): void {
    logger.info(`orchestrator — DAG-based pipeline orchestration engine

Usage:
  orchestrator <command> [options]

Commands:
  run <task-ref>           Run a pipeline
  resume <task-ref>        Resume paused pipeline
  status [<task-ref>]      Show pipeline status
  report <task-ref>        Generate detailed report
  validate [<file>]        Validate pipeline YAML
  list                     List available pipelines
  history                  Show run history
  undo <task-ref> <phase>  Rollback a phase
  inspect <task-ref> <ph>  Show phase detail
  prune                    Compact event store
  migrate                  Migrate v1 state to v2

Options:
  --help, -h               Show this help
  --version                Show version
  --verbose                Verbose output
  --quiet                  Suppress non-essential output

Run 'orchestrator <command> --help' for command-specific options.`);
}

async function main(): Promise<void> {
    const argv = process.argv.slice(2);

    if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
        printHelp();
        process.exit(EXIT_SUCCESS);
    }

    if (argv.includes('--version')) {
        logger.info('orchestrator v0.1.0');
        process.exit(EXIT_SUCCESS);
    }

    const parsed = parseArgs(argv);
    const error = validateCommand(parsed);

    if (error) {
        logger.error(`Error: ${error}`);
        process.exit(EXIT_INVALID_ARGS);
    }

    const state = new StateManager({ dbPath: DB_PATH });
    try {
        await state.init();
        const queries = new Queries(state.getDb());

        switch (parsed.command) {
            case 'run':
                await handleRun(parsed.options, state);
                break;
            case 'resume':
                await handleResume(parsed.options, state);
                break;
            case 'status':
                await handleStatus(parsed.options, queries);
                break;
            case 'report':
                await handleReport(parsed.options, queries);
                break;
            case 'validate':
                await handleValidate(parsed.options);
                break;
            case 'list':
                await handleList();
                break;
            case 'history':
                await handleHistory(parsed.options, queries);
                break;
            case 'undo':
                await handleUndo(parsed.options, state);
                break;
            case 'inspect':
                await handleInspect(parsed.options, queries);
                break;
            case 'prune':
                await handlePrune(state);
                break;
            case 'migrate':
                await handleMigrate(parsed.options, state);
                break;
            default:
                logger.error(`Unknown command: ${parsed.command}`);
                process.exit(EXIT_INVALID_ARGS);
        }
    } finally {
        await state.close();
    }
}

async function handleRun(options: Record<string, unknown>, state: StateManager): Promise<void> {
    const taskRef = options.taskRef as string;
    const preset = (options.preset as string | undefined) ?? 'default';
    const pipelineFile = `${PRESETS_DIR}/${preset}.yaml`;

    let pipelineDef: import('./model').PipelineDefinition;
    try {
        const [def, validation] = await parsePipelineYaml(pipelineFile);
        if (!validation.valid) {
            logger.error(`Pipeline validation failed: ${validation.errors.map((e) => e.message).join(', ')}`);
            process.exit(EXIT_VALIDATION_FAILED);
        }
        pipelineDef = await resolveExtends(def, PRESETS_DIR);
    } catch {
        // Try parsing without extends
        const content = await Bun.file(pipelineFile).text();
        const raw = parseYamlString(content);
        const validation = validatePipeline(raw as unknown as import('./model').PipelineDefinition);
        if (!validation.valid) {
            logger.error(`Pipeline validation failed: ${validation.errors.map((e) => e.message).join(', ')}`);
            process.exit(EXIT_VALIDATION_FAILED);
        }
        pipelineDef = raw as unknown as import('./model').PipelineDefinition;
    }

    if (options.dryRun) {
        logger.info('[dry-run] Pipeline valid. Would execute:');
        const phases = (pipelineDef as unknown as { phases: { name: string }[] }).phases;
        for (const phase of phases) {
            logger.info(`  - ${phase.name}`);
        }
        process.exit(EXIT_SUCCESS);
    }

    const runOptions: RunOptions = {
        taskRef,
        ...(options.preset != null && { preset: options.preset as string }),
        ...(options.phases != null && { phases: options.phases as readonly string[] }),
        ...(options.channel != null && { channel: options.channel as string }),
        ...(options.coverage != null && { coverage: options.coverage as number }),
        ...(options.auto != null && { auto: true }),
    };

    const runner = new PipelineRunner(state);
    const result = await runner.run(runOptions, pipelineDef as unknown as import('./model').PipelineDefinition);

    if (result.status === 'COMPLETED') {
        process.exit(EXIT_SUCCESS);
    } else if (result.status === 'PAUSED') {
        process.exit(EXIT_PIPELINE_PAUSED);
    } else {
        process.exit(EXIT_PIPELINE_FAILED);
    }
}

async function handleResume(options: Record<string, unknown>, state: StateManager): Promise<void> {
    const taskRef = options.taskRef as string;
    const run = await state.getRunByTaskRef(taskRef);
    if (!run) {
        logger.error(`No run found for task ref: ${taskRef}`);
        process.exit(EXIT_TASK_NOT_FOUND);
    }

    if (run.status !== 'PAUSED') {
        logger.error(`Run ${run.id} is not paused (status: ${run.status})`);
        process.exit(EXIT_STATE_ERROR);
    }

    const resumeOptions: ResumeOptions = {
        taskRef,
        approve: true,
    };

    const runner = new PipelineRunner(state);
    const result = await runner.resume(resumeOptions);

    if (result.status === 'COMPLETED') {
        process.exit(EXIT_SUCCESS);
    } else if (result.status === 'PAUSED') {
        process.exit(EXIT_PIPELINE_PAUSED);
    } else {
        process.exit(EXIT_PIPELINE_FAILED);
    }
}

async function handleStatus(options: Record<string, unknown>, queries: Queries): Promise<void> {
    // For status without taskRef, show latest run
    const taskRef = options.taskRef as string | undefined;
    if (!taskRef) {
        const history = await queries.getHistory(1);
        if (history.length === 0) {
            logger.info('No runs found.');
            process.exit(EXIT_SUCCESS);
        }
        const latest = history[0];
        const summary = latest.runId ? await queries.getRunSummary(latest.runId) : null;
        if (!summary) {
            logger.info('No run data available.');
            process.exit(EXIT_SUCCESS);
        }
        if (options.json) {
            process.stdout.write(`${formatStatusJson(summary)}\n`);
        } else {
            process.stdout.write(`${formatStatusOutput(summary)}\n`);
        }
        process.exit(EXIT_SUCCESS);
    }

    // With taskRef — find run by task ref
    const history = await queries.getHistory(100);
    const match = history.find((h) => h.taskRef === taskRef);
    if (!match) {
        logger.error(`No run found for task ref: ${taskRef}`);
        process.exit(EXIT_TASK_NOT_FOUND);
    }
    const summary = match.runId ? await queries.getRunSummary(match.runId) : null;
    if (!summary) {
        logger.error('Could not load run summary.');
        process.exit(EXIT_STATE_ERROR);
    }
    if (options.json) {
        process.stdout.write(`${formatStatusJson(summary)}\n`);
    } else {
        process.stdout.write(`${formatStatusOutput(summary)}\n`);
    }
    process.exit(EXIT_SUCCESS);
}

async function handleReport(options: Record<string, unknown>, queries: Queries): Promise<void> {
    const taskRef = options.taskRef as string;
    const fmt = (options.format as ReportFormat | undefined) ?? 'table';

    const history = await queries.getHistory(100);
    const match = history.find((h) => h.taskRef === taskRef);
    if (!match) {
        logger.error(`No run found for task ref: ${taskRef}`);
        process.exit(EXIT_TASK_NOT_FOUND);
    }

    const summary = match.runId ? await queries.getRunSummary(match.runId) : null;
    if (!summary) {
        logger.error('Could not load run summary.');
        process.exit(EXIT_STATE_ERROR);
    }

    outputReport(summary, fmt, options.output as string | undefined);
    process.exit(EXIT_SUCCESS);
}

async function handleValidate(options: Record<string, unknown>): Promise<void> {
    const file = (options.file as string | undefined) ?? `${PRESETS_DIR}/default.yaml`;
    try {
        const [def, validation] = await parsePipelineYaml(file);
        if (validation.valid) {
            logger.info(`✓ Pipeline valid: ${file}`);
            const phases = (def as unknown as { phases: { name: string }[] }).phases;
            for (const phase of phases) {
                logger.info(`  ✓ ${phase.name}`);
            }
            process.exit(EXIT_SUCCESS);
        } else {
            logger.error(`✗ Pipeline invalid: ${file}`);
            for (const err of validation.errors) {
                logger.error(`  ✗ ${err.message}`);
            }
            process.exit(EXIT_VALIDATION_FAILED);
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to parse: ${msg}`);
        process.exit(EXIT_VALIDATION_FAILED);
    }
}

async function handleList(): Promise<void> {
    const glob = new Bun.Glob('*.yaml');
    const files = [...glob.scanSync({ cwd: PRESETS_DIR })].sort();
    if (files.length === 0) {
        logger.info('No pipeline presets found.');
        process.exit(EXIT_SUCCESS);
    }
    logger.info('Available pipelines:');
    for (const f of files) {
        logger.info(`  ${f.replace('.yaml', '')}`);
    }
    process.exit(EXIT_SUCCESS);
}

async function handleHistory(options: Record<string, unknown>, queries: Queries): Promise<void> {
    const limit = (options.limit as number | undefined) ?? 10;
    const history = await queries.getHistory(limit);
    if (history.length === 0) {
        logger.info('No run history.');
        process.exit(EXIT_SUCCESS);
    }
    const reporter = new Reporter();
    for (const entry of history) {
        const summary = entry.runId ? await queries.getRunSummary(entry.runId) : null;
        if (summary) {
            process.stdout.write(`${reporter.formatSummary(summary)}\n\n`);
        } else {
            const status = entry.status;
            const date = entry.createdAt?.toISOString() ?? 'unknown';
            logger.info(`${entry.taskRef}  ${status}  ${date}`);
        }
    }
    process.exit(EXIT_SUCCESS);
}

async function handleUndo(_options: Record<string, unknown>, _state: StateManager): Promise<void> {
    logger.info('Undo not yet implemented (requires Phase 6 rollback support)');
    process.exit(EXIT_SUCCESS);
}

async function handleInspect(options: Record<string, unknown>, queries: Queries): Promise<void> {
    const taskRef = options.taskRef as string;
    const history = await queries.getHistory(100);
    const match = history.find((h) => h.taskRef === taskRef);
    if (!match) {
        logger.error(`No run found for task ref: ${taskRef}`);
        process.exit(EXIT_TASK_NOT_FOUND);
    }
    const summary = match.runId ? await queries.getRunSummary(match.runId) : null;
    if (!summary) {
        logger.error('Could not load run data.');
        process.exit(EXIT_STATE_ERROR);
    }
    const reporter = new Reporter();
    process.stdout.write(`${reporter.formatStatusTable(summary)}\n`);
    process.exit(EXIT_SUCCESS);
}

async function handlePrune(_state: StateManager): Promise<void> {
    logger.info('Prune not yet implemented (Phase 6 compact support)');
    process.exit(EXIT_SUCCESS);
}

async function handleMigrate(options: Record<string, unknown>, state: StateManager): Promise<void> {
    const v1Dir = (options.dir as string | undefined) ?? 'docs/.workflow-runs/rd3-orchestration-dev';
    const result = await migrateFromV1(state.getDb(), v1Dir);
    if (result.errors.length > 0) {
        logger.error(`Migration completed with ${result.errors.length} error(s)`);
        for (const err of result.errors) {
            logger.error(`  ${err}`);
        }
        process.exit(EXIT_VALIDATION_FAILED);
    }
    logger.info(`Successfully migrated ${result.migrated} run(s)`);
    process.exit(EXIT_SUCCESS);
}

main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Fatal: ${msg}`);
    process.exit(EXIT_PIPELINE_FAILED);
});
