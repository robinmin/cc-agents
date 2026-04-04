import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
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
        const jsonFiles = readdirSync(runDir).filter((name) => name.endsWith('.json'));
        if (jsonFiles.length === 0) return null;

        // Sort by created_at timestamp from file content, newest last
        const sorted = jsonFiles
            .map((name) => {
                const fullPath = join(runDir, name);
                let createdAt = '';
                try {
                    const content = readFileSync(fullPath, 'utf-8');
                    const parsed = JSON.parse(content) as { created_at?: string };
                    createdAt = parsed.created_at ?? '';
                } catch {
                    // Fall back to empty string — will sort before dated entries
                }
                return { name, createdAt };
            })
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

        return join(runDir, sorted[sorted.length - 1].name);
    }
    return null;
}

export function getLockPath(runDir: string): string {
    return join(runDir, '.run.lock');
}

export function createRunLock(runDir: string): string | null {
    const lockPath = getLockPath(runDir);
    if (existsSync(lockPath)) {
        try {
            const lockContent = readFileSync(lockPath, 'utf-8').trim();
            const pid = Number.parseInt(lockContent, 10);
            if (!Number.isNaN(pid)) {
                // Check if the process is still running
                try {
                    process.kill(pid, 0); // throws if process doesn't exist
                    return null; // locked by active process
                } catch {
                    // Stale lock — fall through to create new one
                }
            }
        } catch {
            // Corrupt lock — fall through to create new one
        }
    }
    // Ensure directory exists before writing lock file
    if (!existsSync(runDir)) {
        mkdirSync(runDir, { recursive: true });
    }
    writeFileSync(lockPath, String(process.pid), 'utf-8');
    return lockPath;
}

export function releaseRunLock(runDir: string): void {
    const lockPath = getLockPath(runDir);
    if (existsSync(lockPath)) {
        unlinkSync(lockPath);
    }
}

export function isRunLocked(runDir: string): boolean {
    const lockPath = getLockPath(runDir);
    if (!existsSync(lockPath)) return false;
    try {
        const lockContent = readFileSync(lockPath, 'utf-8').trim();
        const pid = Number.parseInt(lockContent, 10);
        if (Number.isNaN(pid)) return false;
        process.kill(pid, 0); // throws if not running
        return true;
    } catch {
        return false;
    }
}
