/**
 * orchestration-v2 — YAML parser + validator
 *
 * Parses pipeline YAML files and produces validated PipelineDefinition objects.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as YAML from 'yaml';
import type { PipelineDefinition, ValidationResult, PhaseDefinition, PhaseExecutorDefinition } from '../model';
import { validateSchema } from './schema';
import { OrchestratorError } from '../model';
import { resolveSkillDirectory } from '../utils';
import { logger } from '../../../../scripts/logger';

/**
 * Parse a pipeline YAML file and validate it.
 *
 * @param path - Path to the YAML file
 * @returns Tuple of [PipelineDefinition, ValidationResult]
 */
export async function parsePipelineYaml(path: string): Promise<[PipelineDefinition, ValidationResult]> {
    const absPath = resolve(path);
    const raw = loadYaml(absPath);
    const def = rawToPipelineDefinition(raw);
    const result = validatePipeline(def);
    return [def, result];
}

/**
 * Validate a parsed PipelineDefinition.
 * Checks DAG cycles, preset subgraphs, skill existence, etc.
 */
export function validatePipeline(def: PipelineDefinition): ValidationResult {
    const schemaResult = validateSchema({
        schema_version: def.schema_version,
        name: def.name,
        phases: def.phases,
        presets: def.presets,
    });
    const errors: import('../model').ValidationError[] = [...schemaResult.errors];
    const warnings: import('../model').ValidationError[] = [...(schemaResult.warnings ?? [])];

    // Check DAG cycles
    if (hasCycle(def.phases)) {
        errors.push({
            rule: 'dag_cycle',
            message: 'Pipeline phases have circular dependencies',
        });
    }

    // Check after references
    const phaseNames = new Set(Object.keys(def.phases));
    for (const [name, phase] of Object.entries(def.phases)) {
        for (const dep of phase.after ?? []) {
            if (!phaseNames.has(dep)) {
                errors.push({
                    rule: 'after_ref',
                    message: `Phase "${name}" depends on undefined phase "${dep}"`,
                });
            }
            if (dep === name) {
                errors.push({
                    rule: 'self_dependency',
                    message: `Phase "${name}" cannot depend on itself`,
                });
            }
        }
    }

    // Check preset subgraphs (warning only — runtime validates with completed-phase context)
    if (def.presets) {
        for (const [presetName, preset] of Object.entries(def.presets)) {
            const presetPhases = new Set(preset.phases);
            for (const phaseName of preset.phases) {
                const phase = def.phases[phaseName];
                if (phase?.after) {
                    for (const dep of phase.after) {
                        if (!presetPhases.has(dep)) {
                            warnings.push({
                                rule: 'preset_subgraph',
                                message: `Preset "${presetName}" phase "${phaseName}" depends on "${dep}" which is not in the preset — ensure dependencies are completed in a prior run`,
                            });
                        }
                    }
                }
            }
        }
    }

    // Check skill existence (non-fatal: executors only need the string alias)
    // Only check skills with plugin:skill format (colon separator)
    for (const [name, phase] of Object.entries(def.phases)) {
        const skillRef = phase.skill;
        if (!skillRef) continue;
        if (!skillRef.includes(':')) continue; // Skip non-plugin refs like 'placeholder'

        const skillDir = resolveSkillDirectory(skillRef);
        if (!skillDir) {
            warnings.push({
                rule: 'skill_not_found',
                message: `Phase "${name}" references skill "${skillRef}" but directory not found`,
            });
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Load and parse a YAML file using the mature `yaml` package.
 */
function loadYaml(path: string): Record<string, unknown> {
    try {
        const content = readFileSync(path, 'utf-8');
        return parseYamlString(content);
    } catch (err) {
        throw new OrchestratorError('PIPELINE_NOT_FOUND', `Cannot read pipeline file: ${path}`, err as Error);
    }
}

/**
 * Parse a YAML string into a JS object using the `yaml` package.
 * Returns `{}` for empty or comment-only content.
 */
export function parseYamlString(content: string): Record<string, unknown> {
    const parsed = YAML.parse(content);
    // YAML.parse returns null for empty strings and comment-only content
    if (parsed == null || typeof parsed !== 'object') {
        return {} as Record<string, unknown>;
    }
    return parsed as Record<string, unknown>;
}

function normalizePhaseExecutor(raw: unknown): PhaseExecutorDefinition | undefined {
    if (raw == null) {
        return undefined;
    }

    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed === '') {
            return undefined;
        }

        if (trimmed === 'inline' || trimmed === 'subprocess') {
            return { mode: trimmed };
        }

        // Legacy compat: normalize old executor mode names
        if (trimmed === 'auto' || trimmed === 'local' || trimmed === 'direct' || trimmed === 'current') {
            const normalized = trimmed === 'direct' ? 'subprocess' : 'inline';
            logger.warn(`[parser] Executor mode "${trimmed}" is deprecated, use "${normalized}" instead.`);
            return { mode: normalized };
        }

        if (
            trimmed.startsWith('acp:') ||
            trimmed.startsWith('acp-oneshot:') ||
            trimmed.startsWith('acp-session:') ||
            trimmed.startsWith('acp-stateless:') || // legacy compat
            trimmed.startsWith('acp-sessioned:') // legacy compat
        ) {
            return { adapter: trimmed };
        }

        return { channel: trimmed };
    }

    if (typeof raw !== 'object' || Array.isArray(raw)) {
        return undefined;
    }

    const value = raw as Record<string, unknown>;
    let mode =
        value.mode === 'inline' || value.mode === 'subprocess' ? (value.mode as 'inline' | 'subprocess') : undefined;
    // Legacy compat: normalize old executor mode names in object form
    if (!mode && typeof value.mode === 'string') {
        const trimmedMode = (value.mode as string).trim();
        if (trimmedMode === 'auto' || trimmedMode === 'local' || trimmedMode === 'current') {
            mode = 'inline';
            logger.warn(`[parser] Executor mode "${trimmedMode}" is deprecated, use "inline" instead.`);
        } else if (trimmedMode === 'direct') {
            mode = 'subprocess';
            logger.warn(`[parser] Executor mode "${trimmedMode}" is deprecated, use "subprocess" instead.`);
        }
    }
    const channel = typeof value.channel === 'string' && value.channel.trim() !== '' ? value.channel.trim() : undefined;
    const adapter = typeof value.adapter === 'string' && value.adapter.trim() !== '' ? value.adapter.trim() : undefined;

    if (!mode && !channel && !adapter) {
        return undefined;
    }

    return {
        ...(mode && { mode }),
        ...(channel && { channel }),
        ...(adapter && { adapter }),
    };
}

function rawToPipelineDefinition(raw: Record<string, unknown>): PipelineDefinition {
    const phases: Record<string, PhaseDefinition> = {};
    const rawPhases = raw.phases as Record<string, Record<string, unknown>> | undefined;
    if (rawPhases) {
        for (const [name, p] of Object.entries(rawPhases)) {
            const executor = normalizePhaseExecutor(p.executor);
            phases[name] = {
                skill: p.skill as string,
                ...(p.gate != null ? { gate: p.gate as PhaseDefinition['gate'] } : {}),
                ...(p.timeout != null ? { timeout: p.timeout as string } : {}),
                ...(p.after != null ? { after: p.after as string[] } : {}),
                ...(p.payload != null ? { payload: p.payload as Record<string, unknown> } : {}),
                ...(executor != null ? { executor } : {}),
            } as PhaseDefinition;
        }
    }

    return {
        schema_version: 1 as const,
        name: raw.name as string,
        phases,
        ...(raw.extends != null ? { extends: raw.extends as string } : {}),
        ...(raw.stack != null ? { stack: raw.stack as PipelineDefinition['stack'] } : {}),
        ...(raw.presets != null ? { presets: raw.presets as PipelineDefinition['presets'] } : {}),
        ...(raw.hooks != null ? { hooks: raw.hooks as PipelineDefinition['hooks'] } : {}),
    } as PipelineDefinition;
}

function hasCycle(phases: Readonly<Record<string, PhaseDefinition>>): boolean {
    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;

    const color = new Map<string, number>();
    for (const name of Object.keys(phases)) {
        color.set(name, WHITE);
    }

    function dfs(node: string): boolean {
        color.set(node, GRAY);
        const deps = phases[node]?.after ?? [];
        for (const dep of deps) {
            const c = color.get(dep);
            if (c === GRAY) return true; // cycle
            if (c === WHITE && dfs(dep)) return true;
        }
        color.set(node, BLACK);
        return false;
    }

    for (const name of Object.keys(phases)) {
        if (color.get(name) === WHITE) {
            if (dfs(name)) return true;
        }
    }
    return false;
}
