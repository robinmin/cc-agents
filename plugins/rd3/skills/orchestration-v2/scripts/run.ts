#!/usr/bin/env bun
/**
 * orchestration-v2 — CLI entry point
 *
 * Usage: orchestrator <command> [options]
 *
 * Commands: run, resume, status, report, validate, list, history, undo, inspect, prune, migrate
 */

import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs, validateCommand } from './cli/commands';
import { formatStatusOutput, formatStatusJson, formatStatusListOutput, formatStatusListJson } from './cli/status';
import { outputReport } from './cli/report';
import { PipelineRunner } from './engine/runner';
import { parsePipelineYaml, validatePipeline } from './config/parser';
import { resolveExtends } from './config/resolver';
import { StateManager } from './state/manager';
import { Queries } from './state/queries';
import { Reporter } from './observability/reporter';
import { logger, setGlobalSilent } from '../../../scripts/logger';
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
import { Pruner } from './state/prune';
import type { RunOptions, ResumeOptions, ReportFormat, PipelineDefinition, ValidationResult } from './model';

const DEFAULT_STATE_DIR = 'docs/.workflow-runs';
const DB_FILENAME = 'state.db';
const PRESETS_DIR = resolve(import.meta.dir, '../references/examples');
const PROJECT_PIPELINE = 'docs/.workflows/pipeline.yaml';

function printHelp(): void {
    process.stdout.write(`Usage:
  orchestrator <command> [options]
  orchestrator <command> --help

DAG-based pipeline orchestration engine for AI agent workflows.
State is stored in docs/.workflow-runs/ relative to CWD.

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

Global options:
  --state-dir <path>       State directory (default: docs/.workflow-runs)
                           Env: ORCHESTRATOR_STATE_DIR
  --pipeline <path>        Pipeline YAML (default: docs/.workflows/pipeline.yaml)
                           Alias: --file
  --verbose                Verbose output
  --quiet                  Suppress non-essential output
  --json                   Output as JSON where supported
  --help, -h               Show this help
  --version                Show version

Command-specific options:
  run:
    --preset <name>         Named preset from pipeline YAML
    --phases <a,b>          Comma-separated phase names (DAG resolves order)
    --channel <name>        Execution channel (default: current)
    --coverage <n>          Override coverage threshold (1-100)
    --auto                  Auto-approve all human gates
    --dry-run               Show execution plan without running

  resume:
    --approve               Approve pending human gate (default)
    --reject                Reject pending human gate
    --auto                  Continue with auto gates after resume

  status:
    --run <id>              Show specific run by ID
    --all                   Show all runs
    --json                  JSON output

  report:
    --format <fmt>          Output format: markdown, json, summary, table (default: table)
    --output <path>         Write to file

  validate:
    --schema                Output pipeline YAML JSON Schema and exit

  history:
    --limit <n>             Number of runs (default: 10)
    --last <n>              Alias for --limit
    --preset <name>         Filter by preset
    --since <date>          Filter since date
    --failed                Only failed runs
    --json                  JSON output

  undo:
    --dry-run               Preview without changes
    --force                 Force even with uncommitted changes

  inspect:
    --evidence              Show gate evidence
    --json                  JSON output

  prune:
    --older-than <dur>      Delete events older than duration (e.g., 30d)
    --keep-last <n>         Keep only last N runs
    --dry-run               Preview without changes

  migrate:
    --from-v1 [dir]         Migrate from v1 state (default dir: docs/.workflow-runs/rd3-orchestration-dev)
    --dir <path>            Source directory for v1 state

Run 'orchestrator <command> --help' for command-specific options.
`);
}

async function main(): Promise<void> {
    const argv = process.argv.slice(2);

    if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
        printHelp();
        process.exit(EXIT_SUCCESS);
    }

    if (argv.includes('--version')) {
        process.stdout.write('orchestrator v0.1.0\n');
        process.exit(EXIT_SUCCESS);
    }

    const parsed = parseArgs(argv);
    const error = validateCommand(parsed);

    if (error) {
        logger.error(`Error: ${error}`);
        process.exit(EXIT_INVALID_ARGS);
    }

    // Resolve state directory: --state-dir > env var > default
    const stateDir =
        (parsed.options.stateDir as string | undefined) ?? process.env.ORCHESTRATOR_STATE_DIR ?? DEFAULT_STATE_DIR;
    const dbPath = resolve(stateDir, DB_FILENAME);

    // Resolve verbose/quiet flags to adjust logging
    if (parsed.options.quiet) {
        setGlobalSilent(true);
    }

    let state: StateManager | null = null;
    let queries: Queries | null = null;

    const getStateContext = async (): Promise<{ state: StateManager; queries: Queries }> => {
        if (!state) {
            state = new StateManager({ dbPath });
            await state.init();
            queries = new Queries(state.getDb());
        }

        return { state, queries: queries as Queries };
    };

    try {
        switch (parsed.command) {
            case 'run': {
                const ctx = await getStateContext();
                await handleRun(parsed.options, ctx.state);
                break;
            }
            case 'resume': {
                const ctx = await getStateContext();
                await handleResume(parsed.options, ctx.state);
                break;
            }
            case 'status': {
                const ctx = await getStateContext();
                await handleStatus(parsed.options, ctx.queries);
                break;
            }
            case 'report': {
                const ctx = await getStateContext();
                await handleReport(parsed.options, ctx.queries);
                break;
            }
            case 'validate':
                await handleValidate(parsed.options);
                break;
            case 'list':
                await handleList();
                break;
            case 'history': {
                const ctx = await getStateContext();
                await handleHistory(parsed.options, ctx.queries);
                break;
            }
            case 'undo': {
                const ctx = await getStateContext();
                await handleUndo(parsed.options, ctx.state);
                break;
            }
            case 'inspect': {
                const ctx = await getStateContext();
                await handleInspect(parsed.options, ctx.state, ctx.queries);
                break;
            }
            case 'prune': {
                const ctx = await getStateContext();
                await handlePrune(parsed.options, ctx.state);
                break;
            }
            case 'migrate': {
                const ctx = await getStateContext();
                await handleMigrate(parsed.options, ctx.state);
                break;
            }
            default:
                logger.error(`Unknown command: ${parsed.command}`);
                process.exit(EXIT_INVALID_ARGS);
        }
    } finally {
        const currentState = state as StateManager | null;
        if (currentState) {
            await currentState.close();
        }
    }
}

async function handleRun(options: Record<string, unknown>, state: StateManager): Promise<void> {
    const taskRef = options.taskRef as string;
    const preset = (options.preset as string | undefined) ?? 'default';
    try {
        const pipelineFile = resolvePipelineFile(options.file as string | undefined, preset);
        const [pipelineDef, validation] = await loadValidatedPipeline(pipelineFile);
        if (!validation.valid) {
            logger.error(`Pipeline validation failed: ${validation.errors.map((e) => e.message).join(', ')}`);
            process.exit(EXIT_VALIDATION_FAILED);
        }

        if (options.dryRun) {
            logger.info('[dry-run] Pipeline valid. Would execute:');
            for (const phaseName of Object.keys(pipelineDef.phases)) {
                logger.info(`  - ${phaseName}`);
            }
            process.exit(EXIT_SUCCESS);
        }

        const runOptions: RunOptions = {
            taskRef,
            ...(options.preset != null && { preset: options.preset as string }),
            ...(options.phases != null && { phases: options.phases as readonly string[] }),
            ...(options.channel != null && { channel: options.channel as string }),
            ...(options.coverage != null && { coverage: options.coverage as number }),
            ...(options.auto === true && { auto: true }),
        };

        const runner = new PipelineRunner(state);
        const result = await runner.run(runOptions, pipelineDef);

        if (result.status === 'COMPLETED') {
            process.exit(EXIT_SUCCESS);
        } else if (result.status === 'PAUSED') {
            process.exit(EXIT_PIPELINE_PAUSED);
        } else {
            process.exit(EXIT_PIPELINE_FAILED);
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to load pipeline: ${msg}`);
        process.exit(EXIT_VALIDATION_FAILED);
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
        ...(options.reject === true ? { reject: true } : { approve: options.approve !== false }),
        ...(options.auto === true && { auto: true }),
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
    const runId = options.run as string | undefined;
    const showAll = options.all === true;
    const taskRef = options.taskRef as string | undefined;

    // --run <run-id>: show a specific run by ID
    if (runId) {
        const summary = await queries.getRunSummary(runId);
        if (!summary) {
            logger.error(`No run found with ID: ${runId}`);
            process.exit(EXIT_TASK_NOT_FOUND);
        }
        if (options.json) {
            process.stdout.write(`${formatStatusJson(summary)}\n`);
        } else {
            process.stdout.write(`${formatStatusOutput(summary)}\n`);
        }
        process.exit(EXIT_SUCCESS);
    }

    // --all: list all runs
    if (showAll) {
        const history = await queries.getHistory(1000);
        if (history.length === 0) {
            logger.info('No runs found.');
            process.exit(EXIT_SUCCESS);
        }
        const summaries: import('./state/queries').RunSummary[] = [];
        for (const entry of history) {
            if (entry.runId) {
                const s = await queries.getRunSummary(entry.runId);
                if (s) summaries.push(s);
            }
        }
        if (options.json) {
            process.stdout.write(`${formatStatusListJson(summaries)}\n`);
        } else {
            process.stdout.write(`${formatStatusListOutput(summaries)}\n`);
        }
        process.exit(EXIT_SUCCESS);
    }

    // With taskRef — find run by task ref
    if (taskRef) {
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

    // Default: show latest run
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
    if (options.schema) {
        const { getPipelineJsonSchema } = await import('./config/schema');
        const schema = getPipelineJsonSchema();
        process.stdout.write(JSON.stringify(schema, null, 2));
        process.stdout.write('\n');
        process.exit(EXIT_SUCCESS);
    }

    const file = resolvePipelineFile(options.file as string | undefined, 'default');
    try {
        const [def, validation] = await loadValidatedPipeline(file);
        if (validation.valid) {
            process.stdout.write(`\u2713 Pipeline valid: ${file}\n`);
            for (const phaseName of Object.keys(def.phases)) {
                process.stdout.write(`  \u2713 ${phaseName}\n`);
            }
            for (const warn of validation.warnings) {
                process.stderr.write(`  \u26A0 ${warn.message}\n`);
            }
            process.exit(EXIT_SUCCESS);
        } else {
            process.stderr.write(`\u2717 Pipeline invalid: ${file}\n`);
            for (const err of validation.errors) {
                process.stderr.write(`  \u2717 ${err.message}\n`);
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
        process.stdout.write('No pipeline presets found.\n');
        process.exit(EXIT_SUCCESS);
    }
    process.stdout.write('Available pipelines:\n');
    for (const f of files) {
        process.stdout.write(`  ${f.replace('.yaml', '')}\n`);
    }
    process.exit(EXIT_SUCCESS);
}

async function handleHistory(options: Record<string, unknown>, queries: Queries): Promise<void> {
    const limit = (options.limit as number | undefined) ?? 10;
    const filters: import('./state/queries').HistoryFilters = {};
    if (options.preset) filters.preset = options.preset as string;
    if (options.since) filters.since = options.since as string;
    if (options.failed) filters.failed = true;

    const history = await queries.getHistory(limit, Object.keys(filters).length > 0 ? filters : undefined);
    if (history.length === 0) {
        if (options.json) {
            process.stdout.write('[]\n');
        } else {
            process.stdout.write('No run history.\n');
        }
        process.exit(EXIT_SUCCESS);
    }

    // --json mode: output history as JSON array
    if (options.json) {
        const entries = history.map((entry) => ({
            runId: entry.runId,
            taskRef: entry.taskRef,
            preset: entry.preset ?? null,
            status: entry.status,
            durationMs: entry.durationMs,
            totalTokens: entry.totalTokens,
            createdAt: entry.createdAt?.toISOString() ?? null,
        }));
        process.stdout.write(JSON.stringify(entries, null, 2));
        process.stdout.write('\n');
        process.exit(EXIT_SUCCESS);
    }

    // Text mode: display run list
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

    // Trends section (skip if fewer than 2 runs — aggregation is meaningless)
    if (history.length >= 2) {
        const trends = await queries.getTrends();
        if (trends.totalRuns > 0) {
            process.stdout.write(reporter.formatTrendReport(trends));
            process.stdout.write('\n');
        }
    }

    process.exit(EXIT_SUCCESS);
}

async function handleUndo(options: Record<string, unknown>, state: StateManager): Promise<void> {
    const taskRef = options.taskRef as string;
    const phaseName = options.phaseName as string;

    const run = await state.getRunByTaskRef(taskRef);
    if (!run) {
        logger.error(`No run found for task ref: ${taskRef}`);
        process.exit(EXIT_TASK_NOT_FOUND);
    }

    const runner = new PipelineRunner(state);
    const result = await runner.undo(run.id, phaseName, {
        force: options.force === true,
        dryRun: options.dryRun === true,
    });

    if (!result.success) {
        logger.error(result.error ?? 'Undo failed');
        process.exit(result.exitCode);
    }

    process.exit(EXIT_SUCCESS);
}

async function handleInspect(options: Record<string, unknown>, state: StateManager, queries: Queries): Promise<void> {
    const taskRef = options.taskRef as string;
    const phaseName = ((options.phaseName as string | undefined) ?? (options.phase as string | undefined))?.trim();
    if (!phaseName) {
        logger.error('Missing required argument: phase');
        process.exit(EXIT_INVALID_ARGS);
    }

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

    const phase = summary.phases.find((entry) => entry.name === phaseName);
    if (!phase) {
        logger.error(`Phase "${phaseName}" not found in run ${summary.run.id}`);
        process.exit(EXIT_INVALID_ARGS);
    }

    const gateResults = await state.getGateResults(summary.run.id, phaseName);
    const detail = {
        runId: summary.run.id,
        taskRef: summary.run.task_ref,
        pipeline: summary.run.pipeline_name,
        preset: summary.run.preset ?? 'default',
        phase: {
            name: phase.name,
            status: phase.status,
            skill: phase.skill,
            reworkIteration: phase.rework_iteration,
            ...(phase.started_at && { startedAt: phase.started_at.toISOString() }),
            ...(phase.completed_at && { completedAt: phase.completed_at.toISOString() }),
            ...(phase.error_code && { errorCode: phase.error_code }),
            ...(phase.error_message && { errorMessage: phase.error_message }),
        },
        gateResults: gateResults.map((result) => ({
            step: result.step_name,
            checker: result.checker_method,
            passed: result.passed,
            ...(result.duration_ms != null && { durationMs: result.duration_ms }),
            ...(result.created_at && { createdAt: result.created_at.toISOString() }),
            ...(result.evidence && { evidence: result.evidence }),
        })),
    };

    if (options.json) {
        process.stdout.write(`${JSON.stringify(detail, null, 2)}\n`);
        process.exit(EXIT_SUCCESS);
    }

    const lines = [
        `Run: ${detail.taskRef} (${detail.runId})`,
        `Pipeline: ${detail.pipeline}  Preset: ${detail.preset}`,
        `Phase: ${detail.phase.name}`,
        `Status: ${detail.phase.status}`,
        `Skill: ${detail.phase.skill}`,
        `Rework: ${detail.phase.reworkIteration}`,
    ];

    if (detail.phase.startedAt) {
        lines.push(`Started: ${detail.phase.startedAt}`);
    }
    if (detail.phase.completedAt) {
        lines.push(`Completed: ${detail.phase.completedAt}`);
    }
    if (detail.phase.errorCode || detail.phase.errorMessage) {
        lines.push(
            `Error: ${detail.phase.errorCode ?? 'UNKNOWN'}${detail.phase.errorMessage ? ` — ${detail.phase.errorMessage}` : ''}`,
        );
    }

    if (options.evidence) {
        lines.push('');
        lines.push('Evidence:');
        if (detail.gateResults.length === 0) {
            lines.push('  none');
        } else {
            for (const result of detail.gateResults) {
                lines.push(`  - ${result.step} (${result.checker}): ${result.passed ? 'pass' : 'fail'}`);
                if (result.evidence) {
                    lines.push(`    ${JSON.stringify(result.evidence)}`);
                }
            }
        }
    }

    process.stdout.write(`${lines.join('\n')}\n`);
    process.exit(EXIT_SUCCESS);
}

async function handlePrune(options: Record<string, unknown>, state: StateManager): Promise<void> {
    const pruner = new Pruner(state.getDb());
    const pruneOptions = {
        ...(options.olderThan != null && { olderThan: options.olderThan as string }),
        ...(options.keepLast != null && { keepLast: options.keepLast as number }),
        ...(options.dryRun === true && { dryRun: true }),
    };

    const result = pruner.prune(pruneOptions);

    if (options.dryRun) {
        process.stdout.write('[dry-run] Would prune:\n');
        process.stdout.write(`  Runs affected: ${result.runsAffected}\n`);
        process.stdout.write(`  Events: ${result.eventsDeleted}\n`);
        process.stdout.write(`  Gate results: ${result.gateResultsDeleted}\n`);
        process.stdout.write(`  Resource usage: ${result.resourceUsageDeleted}\n`);
        process.stdout.write(`  Rollback snapshots: ${result.rollbackSnapshotsDeleted}\n`);
        process.exit(EXIT_SUCCESS);
    }

    process.stdout.write(`Pruned ${result.runsAffected} run(s):\n`);
    process.stdout.write(`  Events deleted: ${result.eventsDeleted}\n`);
    process.stdout.write(`  Gate results deleted: ${result.gateResultsDeleted}\n`);
    process.stdout.write(`  Resource usage deleted: ${result.resourceUsageDeleted}\n`);
    process.stdout.write(`  Rollback snapshots deleted: ${result.rollbackSnapshotsDeleted}\n`);
    process.exit(EXIT_SUCCESS);
}

async function handleMigrate(options: Record<string, unknown>, state: StateManager): Promise<void> {
    const v1Dir =
        (options.dir as string | undefined) ??
        (options.fromV1Path as string | undefined) ??
        'docs/.workflow-runs/rd3-orchestration-dev';
    const result = await migrateFromV1(state.getDb(), v1Dir);
    if (result.errors.length > 0) {
        logger.error(`Migration completed with ${result.errors.length} error(s)`);
        for (const err of result.errors) {
            logger.error(`  ${err}`);
        }
        process.exit(EXIT_VALIDATION_FAILED);
    }
    process.stdout.write(`Successfully migrated ${result.migrated} run(s)\n`);
    process.exit(EXIT_SUCCESS);
}

function resolvePipelineFile(file: string | undefined, preset: string): string {
    if (file) return resolve(file);

    // Check for project-local pipeline first
    const projectPipeline = resolve(PROJECT_PIPELINE);
    if (existsSync(projectPipeline) && statSync(projectPipeline).size > 0) return projectPipeline;

    return resolve(PRESETS_DIR, `${preset}.yaml`);
}

async function loadValidatedPipeline(file: string): Promise<[PipelineDefinition, ValidationResult]> {
    const [definition] = await parsePipelineYaml(file);
    const resolvedDefinition = await resolveExtends(definition, file);
    return [resolvedDefinition, validatePipeline(resolvedDefinition)];
}

main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Fatal: ${msg}`);
    process.exit(EXIT_PIPELINE_FAILED);
});
