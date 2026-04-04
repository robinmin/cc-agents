#!/usr/bin/env bun
/**
 * rollback.ts — Git-based rollback and safe state resets
 *
 * Provides two operations:
 * 1. Sandbox Restoration: Auto-restore workspace on phase failure with exhausted rework
 * 2. CLI Undo: Manual undo of a completed phase, reverting git changes and clearing state
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '../../../scripts/logger';
import type { PhaseNumber, RollbackSnapshot, UndoOptions } from './model';
import { findOrchestrationStatePath, getOrchestrationRunDir } from './state-paths';

function gitCommand(cwd: string, args: string): string {
    try {
        return execSync(`git ${args}`, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    } catch (error) {
        throw new Error(`Git command failed: git ${args}\n${error instanceof Error ? error.message : String(error)}`);
    }
}

function getTrackedFiles(cwd: string): string[] {
    const output = gitCommand(cwd, 'ls-files');
    return output.split('\n').filter(Boolean);
}

function getUntrackedFiles(cwd: string): string[] {
    try {
        const output = execSync('git ls-files --others --exclude-standard', {
            cwd,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
        return output.split('\n').filter(Boolean);
    } catch {
        return [];
    }
}

function getModifiedFiles(cwd: string): string[] {
    try {
        // Use HEAD diff to catch both staged and unstaged changes
        const output = execSync('git diff HEAD --name-only', {
            cwd,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
        return output.split('\n').filter(Boolean);
    } catch {
        return [];
    }
}

function getHeadCommit(cwd: string): string {
    return gitCommand(cwd, 'rev-parse HEAD');
}

export function captureSnapshot(cwd: string, phase: PhaseNumber): RollbackSnapshot {
    const trackedBefore = getTrackedFiles(cwd);
    const untrackedBefore = getUntrackedFiles(cwd);
    return {
        phase,
        files_before: [...trackedBefore, ...untrackedBefore],
        files_after: [],
        tracked_before: trackedBefore,
        untracked_before: untrackedBefore,
        modified_before: getModifiedFiles(cwd),
        git_head_before: getHeadCommit(cwd),
        created_at: new Date().toISOString(),
    };
}

export function finalizeSnapshot(cwd: string, snapshot: RollbackSnapshot): RollbackSnapshot {
    const trackedAfter = getTrackedFiles(cwd);
    const untrackedAfter = getUntrackedFiles(cwd);
    return {
        ...snapshot,
        files_after: [...trackedAfter, ...untrackedAfter],
        tracked_after: trackedAfter,
        untracked_after: untrackedAfter,
    };
}

export interface RestoreResult {
    restored: string[];
    removed: string[];
    errors: string[];
}

interface RestorePlan {
    filesToRestore: string[];
    filesToRemove: string[];
}

export function checkDirtyFiles(cwd: string, snapshot: RollbackSnapshot): string[] {
    const modifiedBefore = new Set(snapshot.modified_before ?? []);
    const modifiedNow = getModifiedFiles(cwd);
    return modifiedNow.filter((f) => !modifiedBefore.has(f));
}

function getRestorePlan(cwd: string, snapshot: RollbackSnapshot): RestorePlan {
    const filesBefore = new Set(snapshot.files_before);
    const filesAfter = new Set(
        snapshot.files_after.length > 0 ? snapshot.files_after : [...getTrackedFiles(cwd), ...getUntrackedFiles(cwd)],
    );
    const trackedBefore = new Set(snapshot.tracked_before ?? snapshot.files_before);
    const modifiedBefore = new Set(snapshot.modified_before ?? []);
    const modifiedNow = getModifiedFiles(cwd);

    return {
        filesToRemove: [...filesAfter].filter((file) => !filesBefore.has(file)),
        filesToRestore: modifiedNow.filter((file) => trackedBefore.has(file) && !modifiedBefore.has(file)),
    };
}

export function restoreSnapshot(cwd: string, snapshot: RollbackSnapshot, force?: boolean): RestoreResult {
    const result: RestoreResult = { restored: [], removed: [], errors: [] };

    // Check for dirty files that would be lost
    if (!force) {
        const dirtyFiles = checkDirtyFiles(cwd, snapshot);
        if (dirtyFiles.length > 0) {
            throw new Error(
                `Cannot restore snapshot: uncommitted changes detected in files that were clean before the phase started: ${dirtyFiles.join(', ')}. Use force=true to override.`,
            );
        }
    }

    const restorePlan = getRestorePlan(cwd, snapshot);

    // New files created during the phase — remove them
    for (const file of restorePlan.filesToRemove) {
        const filePath = join(cwd, file);
        if (existsSync(filePath)) {
            try {
                rmSync(filePath, { force: true });
                result.removed.push(file);
            } catch (error) {
                result.errors.push(
                    `Failed to remove ${file}: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
        }
    }

    // Restore only files that were clean before the phase started.
    if (restorePlan.filesToRestore.length > 0) {
        try {
            gitCommand(cwd, `checkout -- ${restorePlan.filesToRestore.map((f) => `"${f}"`).join(' ')}`);
            result.restored.push(...restorePlan.filesToRestore);
        } catch (error) {
            result.errors.push(`Git checkout failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    return result;
}

export interface UndoResult {
    phase: PhaseNumber;
    task_ref: string;
    dry_run: boolean;
    files_to_restore: string[];
    files_to_remove: string[];
    phases_cleared: number[];
    state_cleared: boolean;
    errors: string[];
}

function clearPhaseState(phaseRecord: Record<string, unknown>): void {
    phaseRecord.status = 'pending';
    delete phaseRecord.completed_at;
    delete phaseRecord.result;
    delete phaseRecord.error;
    delete phaseRecord.rollback_snapshot;
}

export function executeUndo(options: UndoOptions, stateDir: string): UndoResult {
    const { task_ref, phase, dry_run, force } = options;
    const result: UndoResult = {
        phase,
        task_ref,
        dry_run,
        files_to_restore: [],
        files_to_remove: [],
        phases_cleared: [],
        state_cleared: false,
        errors: [],
    };

    const runDir = getOrchestrationRunDir(task_ref, stateDir);
    if (!existsSync(runDir)) {
        result.errors.push(`No orchestration state directory found at ${runDir}`);
        return result;
    }

    // Load the state
    const statePath = findOrchestrationStatePath(task_ref, stateDir);
    if (!statePath) {
        result.errors.push(`No orchestration state found for task "${task_ref}"`);
        return result;
    }

    const state = JSON.parse(readFileSync(statePath, 'utf-8')) as {
        status?: string;
        updated_at?: string;
        phases: Array<{
            number: number;
            status: string;
            rollback_snapshot?: RollbackSnapshot;
        }>;
    };

    const phaseRecord = state.phases.find((p) => p.number === phase);
    if (!phaseRecord) {
        result.errors.push(`Phase ${phase} not found in orchestration state`);
        return result;
    }

    if (phaseRecord.status !== 'completed') {
        result.errors.push(
            `Phase ${phase} is not completed (status: ${phaseRecord.status}). Can only undo completed phases.`,
        );
        return result;
    }

    if (!phaseRecord.rollback_snapshot) {
        result.errors.push(`No rollback snapshot found for phase ${phase}. Cannot undo without a snapshot.`);
        return result;
    }

    const snapshot = phaseRecord.rollback_snapshot;
    const restorePlan = getRestorePlan(stateDir, snapshot);

    // Calculate what would be restored
    result.files_to_remove = restorePlan.filesToRemove;
    result.files_to_restore = restorePlan.filesToRestore;

    if (dry_run) {
        return result;
    }

    // Perform the actual restore
    try {
        const restoreResult = restoreSnapshot(stateDir, snapshot, force);
        result.files_to_restore = restoreResult.restored;
        result.files_to_remove = restoreResult.removed;
        result.errors.push(...restoreResult.errors);
    } catch (error) {
        result.errors.push(error instanceof Error ? error.message : String(error));
        return result;
    }

    // Clear the selected phase and any downstream state that is now stale.
    for (const downstreamPhase of state.phases) {
        if (downstreamPhase.number < phase || downstreamPhase.status === 'pending') {
            continue;
        }

        clearPhaseState(downstreamPhase as Record<string, unknown>);
        result.phases_cleared.push(downstreamPhase.number as PhaseNumber);
    }

    // Update run status to paused — pipeline needs to continue from undone phase
    state.status = 'paused';
    state.updated_at = new Date().toISOString();
    writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
    result.state_cleared = true;

    logger.info(`Undo completed for phase ${phase} of task ${task_ref}`);
    return result;
}
export async function main(args = process.argv.slice(2)): Promise<number> {
    if (args.length < 2 || (args[0] !== '--undo' && args[0] !== '0292' && !args.includes('--undo'))) {
        // Simple heuristic for usage error
        if (args.length === 0 || (args.length === 1 && !args[0].startsWith('--'))) {
            logger.error('Usage: rollback.ts --undo <task-ref> <phase> [--dry-run]');
            return 1;
        }
    }

    const undoIdx = args.indexOf('--undo');
    const taskRef = undoIdx !== -1 ? args[undoIdx + 1] : args[0];
    const phaseStr = undoIdx !== -1 ? args[undoIdx + 2] : args[1];
    const phase = Number.parseInt(phaseStr ?? '0', 10);
    const dryRun = args.includes('--dry-run');

    if (!taskRef || Number.isNaN(phase) || phase < 1 || phase > 9) {
        if (!taskRef) logger.error('Missing task reference.');
        else logger.error(`Invalid phase: ${phase}. Must be 1-9.`);
        return 1;
    }

    try {
        const result = executeUndo({ task_ref: taskRef, phase: phase as PhaseNumber, dry_run: dryRun }, process.cwd());
        logger.log(JSON.stringify(result, null, 2));

        if (result.errors.length > 0) {
            return 1;
        }
        return 0;
    } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        return 1;
    }
}

if (import.meta.main) {
    main().then((code) => process.exit(code));
}
