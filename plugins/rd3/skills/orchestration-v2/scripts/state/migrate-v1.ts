/**
 * orchestration-v2 — V1 state migration
 *
 * Migrates JSON state files from orchestration-v1 (legacy) to SQLite (v2).
 * Scans docs/.workflow-runs/rd3-orchestration-v1/ for JSON state files
 * and converts them to v2 database records.
 */

import type { Database } from 'bun:sqlite';
import { logger } from '../../../../scripts/logger';

// ─── V1 JSON Types ─────────────────────────────────────────────────────────

interface V1PhaseEvidence {
    readonly kind: string;
    readonly detail: string;
    readonly payload?: Record<string, unknown>;
}

interface V1Phase {
    readonly number: number;
    readonly name: string;
    readonly skill: string;
    readonly executor?: string;
    readonly gate: string;
    readonly gateCriteria?: string;
    readonly status: string;
    readonly evidence?: V1PhaseEvidence[];
    readonly started_at?: string;
    readonly completed_at?: string;
    readonly rework_iterations?: number;
    readonly error?: string;
}

interface V1State {
    readonly task_ref: string;
    readonly task_path?: string;
    readonly profile: string;
    readonly execution_channel?: string;
    readonly coverage_threshold?: number;
    readonly status: string;
    readonly auto_approve_human_gates?: boolean;
    readonly rework_config?: {
        readonly max_iterations?: number;
        readonly feedback_injection?: boolean;
        readonly escalation_state?: string;
    };
    readonly refine_mode?: boolean;
    readonly dry_run?: boolean;
    readonly created_at?: string;
    readonly updated_at?: string;
    readonly schema_version?: number;
    readonly phases: V1Phase[];
    readonly current_phase?: number;
}

// ─── Phase number to v2 name mapping ───────────────────────────────────────

const PHASE_NUMBER_TO_NAME: Record<number, string> = {
    1: 'intake',
    2: 'arch',
    3: 'design',
    4: 'decompose',
    5: 'implement',
    6: 'test',
    7: 'review',
    8: 'verify-bdd',
    9: 'docs',
};

const V1_STATUS_MAP: Record<string, string> = {
    pending: 'pending',
    running: 'running',
    completed: 'completed',
    failed: 'failed',
    skipped: 'skipped',
    paused: 'paused',
};

const V1_RUN_STATUS_MAP: Record<string, string> = {
    idle: 'IDLE',
    running: 'RUNNING',
    completed: 'COMPLETED',
    failed: 'FAILED',
    paused: 'PAUSED',
};

// ─── Migration Result ──────────────────────────────────────────────────────

export interface MigrationResult {
    readonly totalFiles: number;
    readonly migrated: number;
    readonly skipped: number;
    readonly errors: string[];
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Scan a directory for v1 JSON state files and migrate them to SQLite.
 *
 * @param db - Target SQLite database
 * @param v1Dir - Directory containing v1 JSON state files (e.g. docs/.workflow-runs/rd3-orchestration-v1/)
 * @returns Migration statistics
 */
export async function migrateFromV1(db: Database, v1Dir: string): Promise<MigrationResult> {
    const result: MutableMigrationResult = {
        totalFiles: 0,
        migrated: 0,
        skipped: 0,
        errors: [],
    };

    const glob = new Bun.Glob('**/*.json');
    const files = [...glob.scanSync({ cwd: v1Dir, absolute: true })].sort();

    result.totalFiles = files.length;

    if (files.length === 0) {
        logger.info(`No v1 state files found in ${v1Dir}`);
        return result;
    }

    logger.info(`Found ${files.length} v1 state file(s) to migrate`);

    const insertRun = db.prepare(`
    INSERT OR IGNORE INTO runs (id, task_ref, preset, phases_requested, status, config_snapshot, pipeline_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'default', ?, ?)
  `);

    const insertPhase = db.prepare(`
    INSERT OR IGNORE INTO phases (run_id, name, status, skill, started_at, completed_at, error_message, rework_iteration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const insertEvent = db.prepare(`
    INSERT INTO events (run_id, event_type, payload, timestamp)
    VALUES (?, ?, ?, ?)
  `);

    for (const filePath of files) {
        try {
            const content = await Bun.file(filePath).text();
            const state = JSON.parse(content) as V1State;

            if (!state.task_ref || !Array.isArray(state.phases)) {
                result.skipped++;
                result.errors.push(`${filePath}: invalid v1 state (missing task_ref or phases)`);
                continue;
            }

            const runId = `v1-${state.task_ref}-${extractRunId(filePath)}`;
            const phasesRequested = state.phases
                .map((p) => PHASE_NUMBER_TO_NAME[p.number] ?? `phase-${p.number}`)
                .join(',');
            const runStatus = V1_RUN_STATUS_MAP[state.status] ?? 'FAILED';
            const preset = state.profile ?? 'standard';
            const createdAt = state.created_at ?? new Date().toISOString();
            const updatedAt = state.updated_at ?? createdAt;

            const configSnapshot = {
                task_path: state.task_path,
                execution_channel: state.execution_channel,
                coverage_threshold: state.coverage_threshold,
                auto_approve_human_gates: state.auto_approve_human_gates,
                rework_config: state.rework_config,
                refine_mode: state.refine_mode,
                dry_run: state.dry_run,
                current_phase: state.current_phase,
            };

            // Use a transaction for atomicity per file
            const migrateFile = db.transaction(() => {
                insertRun.run(
                    runId,
                    state.task_ref,
                    preset,
                    phasesRequested,
                    runStatus,
                    JSON.stringify(configSnapshot),
                    createdAt,
                    updatedAt,
                );

                for (const phase of state.phases) {
                    const phaseName = PHASE_NUMBER_TO_NAME[phase.number] ?? `phase-${phase.number}`;
                    const phaseStatus = V1_STATUS_MAP[phase.status] ?? 'failed';
                    const skill = phase.skill ?? phase.executor ?? 'unknown';
                    const startedAt = phase.started_at ?? null;
                    const completedAt = phase.completed_at ?? null;
                    const errorMsg = phase.error ?? null;
                    const reworkIter = phase.rework_iterations ?? 0;

                    insertPhase.run(runId, phaseName, phaseStatus, skill, startedAt, completedAt, errorMsg, reworkIter);

                    // Migrate evidence as events
                    if (phase.evidence && phase.evidence.length > 0) {
                        for (const ev of phase.evidence) {
                            insertEvent.run(
                                runId,
                                `v1.migrated.${ev.kind}`,
                                JSON.stringify({
                                    phase_name: phaseName,
                                    detail: ev.detail,
                                    ...(ev.payload != null && { payload: ev.payload }),
                                }),
                                completedAt ?? updatedAt,
                            );
                        }
                    }
                }
            });

            migrateFile();
            result.migrated++;
            logger.info(`  ✓ Migrated: ${state.task_ref} (${state.profile}) → ${runId}`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            result.errors.push(`${filePath}: ${msg}`);
            result.skipped++;
            logger.error(`  ✗ Failed: ${filePath}: ${msg}`);
        }
    }

    logger.info(
        `Migration complete: ${result.migrated} migrated, ${result.skipped} skipped, ${result.errors.length} errors`,
    );

    return result;
}

/**
 * Extract a short identifier from a v1 file path.
 */
function extractRunId(filePath: string): string {
    const parts = filePath.replace(/\\/g, '/').split('/');
    const filename = parts.at(-1) ?? 'unknown';
    return filename.replace('.json', '');
}

// Mutable helper for building result
interface MutableMigrationResult {
    totalFiles: number;
    migrated: number;
    skipped: number;
    errors: string[];
}
