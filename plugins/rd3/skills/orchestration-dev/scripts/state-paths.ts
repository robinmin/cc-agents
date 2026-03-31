import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

function sanitizeTaskRef(taskRef: string): string {
    return taskRef.replace(/[^\w.-]+/g, '_');
}

function extractTaskFolderName(taskRef: string): string {
    if (!taskRef.endsWith('.md')) {
        return sanitizeTaskRef(taskRef);
    }

    const stem = basename(taskRef, '.md');
    const wbsMatch = stem.match(/^(\d+)/);
    return sanitizeTaskRef(wbsMatch?.[1] ?? stem);
}

export function getWorkflowRunsRoot(stateDir = '.'): string {
    return join(stateDir, 'docs', '.workflow-runs', 'rd3-orchestration-dev');
}

export function getOrchestrationRunDir(taskRef: string, stateDir = '.'): string {
    return join(getWorkflowRunsRoot(stateDir), extractTaskFolderName(taskRef));
}

export function getOrchestrationRunArtifactsDir(taskRef: string, runId: string, stateDir = '.'): string {
    return join(getOrchestrationRunDir(taskRef, stateDir), runId);
}

export function getRunIdFromStatePath(statePath: string): string {
    return basename(statePath, '.json');
}

export function getOrchestrationArtifactsRootFromStatePath(statePath: string): string {
    return join(dirname(statePath), getRunIdFromStatePath(statePath));
}

export function findOrchestrationStatePath(taskRef: string, stateDir = '.'): string | null {
    const runDir = getOrchestrationRunDir(taskRef, stateDir);
    if (existsSync(runDir)) {
        const runCandidates = readdirSync(runDir)
            .filter((name) => name.endsWith('.json'))
            .sort();
        if (runCandidates.length > 0) {
            return join(runDir, runCandidates[runCandidates.length - 1]);
        }
    }
    return null;
}
