/**
 * orchestration-v2 — Config resolver
 *
 * Resolves `extends:` chains in pipeline YAML files.
 * Max 2 levels, no circular inheritance.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { PipelineDefinition, PhaseDefinition, PipelineHooks } from '../model';
import { parseYamlString } from './parser';
import { OrchestratorError } from '../model';

const MAX_EXTENDS_DEPTH = 2;

/**
 * Resolve a pipeline's extends chain, merging parent phases.
 */
export async function resolveExtends(def: PipelineDefinition, basePath: string): Promise<PipelineDefinition> {
    if (!def.extends) return def;
    const visited = new Set<string>();
    return resolveChain(def, basePath, 0, visited);
}

async function resolveChain(
    def: PipelineDefinition,
    basePath: string,
    depth: number,
    visited: Set<string>,
): Promise<PipelineDefinition> {
    if (!def.extends) return def;

    if (depth >= MAX_EXTENDS_DEPTH) {
        throw new OrchestratorError(
            'EXTENDS_DEPTH_EXCEEDED',
            `Extends chain exceeds max depth of ${MAX_EXTENDS_DEPTH}`,
        );
    }

    const extendsPath = resolve(dirname(basePath), def.extends);
    if (visited.has(extendsPath)) {
        throw new OrchestratorError('EXTENDS_CIRCULAR', `Circular extends detected: ${extendsPath}`);
    }
    visited.add(extendsPath);

    const parentRaw = loadParentYaml(extendsPath);
    let parent = rawToDefinition(parentRaw);
    parent = await resolveChain(parent, extendsPath, depth + 1, visited);

    return mergePipeline(parent, def);
}

function mergePipeline(parent: PipelineDefinition, child: PipelineDefinition): PipelineDefinition {
    // Merge phases: child overrides parent, deep merge payload
    const phases: Record<string, PhaseDefinition> = { ...parent.phases };
    for (const [name, phase] of Object.entries(child.phases)) {
        if (phases[name]) {
            phases[name] = {
                ...phases[name],
                ...phase,
                payload: {
                    ...(phases[name].payload ?? {}),
                    ...(phase.payload ?? {}),
                },
            };
        } else {
            phases[name] = phase;
        }
    }

    const presets = { ...(parent.presets ?? {}), ...(child.presets ?? {}) };
    const hooks = mergeHooks(parent.hooks, child.hooks);
    const mergedStack = child.stack ?? parent.stack;

    return {
        schema_version: child.schema_version,
        name: child.name,
        phases,
        ...(mergedStack != null && { stack: mergedStack }),
        ...(Object.keys(presets).length > 0 && { presets }),
        ...(hooks != null && { hooks }),
    };
}

function mergeHooks(parent?: PipelineHooks, child?: PipelineHooks): PipelineHooks | undefined {
    if (!parent && !child) return undefined;
    if (!parent) return child;
    if (!child) return parent;

    const hookKeys = [
        'on-phase-start',
        'on-phase-complete',
        'on-phase-failure',
        'on-rework',
        'on-pause',
        'on-resume',
    ] as const;

    const merged: Record<string, import('../model').HookAction[]> = {};
    for (const key of hookKeys) {
        const parentActions = parent[key] ?? [];
        const childActions = child[key] ?? [];
        if (parentActions.length > 0 || childActions.length > 0) {
            merged[key] = [...parentActions, ...childActions];
        }
    }
    return Object.keys(merged).length > 0 ? (merged as unknown as PipelineHooks) : undefined;
}

function loadParentYaml(path: string): Record<string, unknown> {
    try {
        const content = readFileSync(path, 'utf-8');
        return parseYamlString(content);
    } catch (err) {
        throw new OrchestratorError('PIPELINE_NOT_FOUND', `Cannot read extends file: ${path}`, err as Error);
    }
}

function rawToDefinition(raw: Record<string, unknown>): PipelineDefinition {
    const phases: Record<string, PhaseDefinition> = {};
    const rawPhases = raw.phases as Record<string, Record<string, unknown>> | undefined;
    if (rawPhases) {
        for (const [name, p] of Object.entries(rawPhases)) {
            const phase: Record<string, unknown> = { skill: p.skill };
            if (p.gate != null) phase.gate = p.gate;
            if (p.timeout != null) phase.timeout = p.timeout;
            if (p.after != null) phase.after = p.after;
            if (p.payload != null) phase.payload = p.payload;
            phases[name] = phase as unknown as PhaseDefinition;
        }
    }

    const result: Record<string, unknown> = {
        schema_version: 1,
        name: raw.name,
        phases,
    };
    if (raw.extends != null) result.extends = raw.extends;
    if (raw.stack != null) result.stack = raw.stack;
    if (raw.presets != null) result.presets = raw.presets;
    if (raw.hooks != null) result.hooks = raw.hooks;

    return result as unknown as PipelineDefinition;
}
