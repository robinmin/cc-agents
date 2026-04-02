/**
 * orchestration-v2 — DAG Scheduler
 *
 * Dependency resolution, topological sort, and ready-phase evaluation.
 */

import type { DAGPhaseState, PhaseDefinition } from '../model';

export interface MissingDep {
    readonly phase: string;
    readonly missingDependency: string;
}

export interface SubsetValidationResult {
    readonly valid: boolean;
    readonly missingDeps: readonly MissingDep[];
}

export interface DAGNode {
    readonly name: string;
    readonly definition: PhaseDefinition;
    readonly dependencies: readonly string[];
    state: DAGPhaseState;
}

export interface DAGEvaluation {
    readonly ready: readonly string[];
    readonly blocked: readonly string[];
    readonly completed: readonly string[];
    readonly failed: readonly string[];
    readonly paused: readonly string[];
}

/**
 * Validate that a requested subset of phases forms a valid subgraph.
 * For each requested phase, check that all `after:` dependencies are either
 * present in the requested set or have a completed status in the state store.
 */
export function validatePhaseSubset(
    requestedPhases: ReadonlySet<string>,
    phases: Readonly<Record<string, PhaseDefinition>>,
    completedPhases?: ReadonlySet<string>,
): SubsetValidationResult {
    const missingDeps: MissingDep[] = [];
    const completed = completedPhases ?? new Set<string>();

    for (const phaseName of requestedPhases) {
        const phaseDef = phases[phaseName];
        if (!phaseDef?.after) continue;

        for (const dep of phaseDef.after) {
            if (!requestedPhases.has(dep) && !completed.has(dep)) {
                missingDeps.push({ phase: phaseName, missingDependency: dep });
            }
        }
    }

    return { valid: missingDeps.length === 0, missingDeps };
}

export class DAGScheduler {
    private nodes: Map<string, DAGNode> = new Map();

    buildFromPhases(phases: Readonly<Record<string, PhaseDefinition>>): void {
        this.nodes.clear();
        for (const [name, phase] of Object.entries(phases)) {
            this.nodes.set(name, {
                name,
                definition: phase,
                dependencies: phase.after ?? [],
                state: 'pending',
            });
        }
    }

    getNodes(): ReadonlyMap<string, DAGNode> {
        return this.nodes;
    }

    evaluate(): DAGEvaluation {
        const ready: string[] = [];
        const blocked: string[] = [];
        const completed: string[] = [];
        const failed: string[] = [];
        const paused: string[] = [];

        for (const [name, node] of this.nodes) {
            switch (node.state) {
                case 'completed':
                    completed.push(name);
                    break;
                case 'failed':
                    failed.push(name);
                    break;
                case 'paused':
                    paused.push(name);
                    break;
                case 'running':
                    // Running phases are neither ready nor blocked
                    break;
                case 'pending': {
                    // Check all deps are completed
                    const allDepsCompleted = node.dependencies.every((dep) => {
                        const depNode = this.nodes.get(dep);
                        return depNode?.state === 'completed';
                    });
                    if (allDepsCompleted) {
                        ready.push(name);
                    } else {
                        blocked.push(name);
                    }
                    break;
                }
                case 'ready':
                    ready.push(name);
                    break;
                case 'skipped':
                    // Skipped phases are ignored
                    break;
            }
        }

        return { ready, blocked, completed, failed, paused };
    }

    markCompleted(name: string): void {
        const node = this.nodes.get(name);
        if (node) {
            (node as { state: DAGPhaseState }).state = 'completed';
        }
    }

    markFailed(name: string): void {
        const node = this.nodes.get(name);
        if (node) {
            (node as { state: DAGPhaseState }).state = 'failed';
        }
    }

    markPaused(name: string): void {
        const node = this.nodes.get(name);
        if (node) {
            (node as { state: DAGPhaseState }).state = 'paused';
        }
    }

    markRunning(name: string): void {
        const node = this.nodes.get(name);
        if (node) {
            (node as { state: DAGPhaseState }).state = 'running';
        }
    }

    hasCycle(): boolean {
        const WHITE = 0;
        const GRAY = 1;
        const BLACK = 2;
        const color = new Map<string, number>();
        for (const name of this.nodes.keys()) {
            color.set(name, WHITE);
        }

        const dfs = (name: string): boolean => {
            const c = color.get(name);
            if (c === GRAY) return true;
            if (c === BLACK) return false;
            color.set(name, GRAY);
            const deps = this.nodes.get(name)?.dependencies ?? [];
            for (const dep of deps) {
                if (this.nodes.has(dep) && dfs(dep)) return true;
            }
            color.set(name, BLACK);
            return false;
        };

        for (const name of this.nodes.keys()) {
            if (color.get(name) === WHITE) {
                if (dfs(name)) return true;
            }
        }
        return false;
    }

    topologicalSort(): string[] {
        const result: string[] = [];
        const visited = new Set<string>();

        const visit = (name: string) => {
            if (visited.has(name)) return;
            visited.add(name);
            const deps = this.nodes.get(name)?.dependencies ?? [];
            for (const dep of deps) {
                if (this.nodes.has(dep)) {
                    visit(dep);
                }
            }
            result.push(name);
        };

        for (const name of this.nodes.keys()) {
            visit(name);
        }

        return result;
    }
}
