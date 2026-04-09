/**
 * orchestration-v2 — YAML parser + validator
 *
 * Parses pipeline YAML files and produces validated PipelineDefinition objects.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PipelineDefinition, ValidationResult, PhaseDefinition, PhaseExecutorDefinition } from '../model';
import { validateSchema } from './schema';
import { OrchestratorError } from '../model';
import { resolveSkillDirectory } from '../utils';

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
 * Minimal YAML parser — handles the subset we need.
 * Uses a simple line-by-line parser for flat-ish YAML.
 * For production, consider using a proper YAML library.
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
 * Simple YAML parser. Handles the pipeline.yaml structure:
 * - key: value
 * - nested objects via indentation
 * - arrays with - prefix
 */
export function parseYamlString(content: string): Record<string, unknown> {
    const lines = content.split('\n');
    return parseYamlLines(lines, 0, 0).result;
}

interface ParseResult {
    result: Record<string, unknown>;
    nextLine: number;
}

function parseYamlLines(lines: string[], startLine: number, baseIndent: number): ParseResult {
    const result: Record<string, unknown> = {};
    let i = startLine;

    while (i < lines.length) {
        const line = lines[i];

        // Skip empty lines and comments
        if (!line || line.trim() === '' || line.trimStart().startsWith('#')) {
            i++;
            continue;
        }

        const indent = line.length - line.trimStart().length;
        if (indent < baseIndent && i > startLine) break;

        const trimmed = line.trimStart();

        // Array item
        if (trimmed.startsWith('- ')) {
            // Collect all array items at this indent level
            const items: unknown[] = [];
            while (i < lines.length) {
                const arrLine = lines[i];
                if (!arrLine || arrLine.trim() === '' || arrLine.trimStart().startsWith('#')) {
                    i++;
                    continue;
                }
                const arrIndent = arrLine.length - arrLine.trimStart().length;
                if (arrIndent < indent) break;
                const arrTrimmed = arrLine.trimStart();
                if (arrTrimmed.startsWith('- ')) {
                    const value = arrTrimmed.slice(2).trim();
                    if (value.includes(': ')) {
                        // Inline object or nested
                        items.push(parseInlineValue(value));
                    } else {
                        items.push(parseScalarValue(value));
                    }
                    i++;
                } else {
                    // Orphaned indented content (indent > baseIndent) is invalid YAML
                    if (arrIndent > indent) {
                        throw new Error(`Invalid YAML: orphaned indented content`);
                    }
                    break;
                }
            }
            // At top level, array items become the result directly
            return { result: (items.length > 0 ? items : null) as unknown as Record<string, unknown>, nextLine: i };
        }

        // Key-value pair
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) {
            i++;
            continue;
        }

        const key = trimmed.slice(0, colonIdx).trim();
        const valuePart = trimmed.slice(colonIdx + 1).trim();

        if (valuePart === '|' || valuePart === '>') {
            // Literal or folded block scalar — collect all indented lines as a string
            const blockLines: string[] = [];
            let j = i + 1;
            // Find the indentation level from the first non-empty line
            let blockIndent = -1;
            while (j < lines.length) {
                const line = lines[j];
                if (!line.trim()) {
                    j++;
                    continue;
                }
                blockIndent = line.length - line.trimStart().length;
                break;
            }
            // Collect all lines at or beyond blockIndent
            while (j < lines.length) {
                const line = lines[j];
                if (!line.trim()) {
                    blockLines.push('');
                    j++;
                    continue;
                }
                const lineIndent = line.length - line.trimStart().length;
                if (lineIndent < blockIndent) {
                    break;
                }
                // Strip the block indent and add to collected lines
                blockLines.push(line.slice(blockIndent));
                j++;
            }
            // For literal block (|), preserve newlines; for folded (>), fold newlines
            const blockContent = blockLines.join(valuePart === '|' ? '\n' : ' ');
            result[key] = blockContent;
            i = j;
            continue;
        }

        if (valuePart === '') {
            // Nested block — peek at next non-empty line's indent
            let nextNonEmptyIdx = i + 1;
            while (nextNonEmptyIdx < lines.length && !lines[nextNonEmptyIdx].trim()) {
                nextNonEmptyIdx++;
            }
            if (nextNonEmptyIdx < lines.length) {
                const nextLine = lines[nextNonEmptyIdx];
                const nextIndent = nextLine.length - nextLine.trimStart().length;
                if (nextIndent > indent) {
                    // Check if next lines are array items
                    const nextTrimmed = nextLine.trimStart();
                    if (nextTrimmed.startsWith('- ')) {
                        // Parse as array
                        const arrResult = parseArrayLines(lines, nextNonEmptyIdx, nextIndent);
                        result[key] = arrResult.items;
                        i = arrResult.nextLine;
                        continue;
                    }
                    // Parse as nested object
                    const nested = parseYamlLines(lines, nextNonEmptyIdx, nextIndent);
                    result[key] = nested.result;
                    i = nested.nextLine;
                    continue;
                }
            }
            result[key] = null;
            i++;
        } else {
            result[key] = parseInlineValue(valuePart);
            i++;
        }
    }

    return { result, nextLine: i };
}

interface ArrayParseResult {
    items: unknown[];
    nextLine: number;
}

function parseArrayLines(lines: string[], startLine: number, baseIndent: number): ArrayParseResult {
    const items: unknown[] = [];
    let i = startLine;

    while (i < lines.length) {
        const line = lines[i];
        if (!line || line.trim() === '' || line.trimStart().startsWith('#')) {
            i++;
            continue;
        }
        const indent = line.length - line.trimStart().length;
        if (indent < baseIndent) break;

        const trimmed = line.trimStart();
        if (trimmed.startsWith('- ')) {
            const value = trimmed.slice(2).trim();
            if (value === '' || value.endsWith(':')) {
                // Nested object in array item
                // Check if next lines are properties of this object
                const nestedIndent = indent + 2;
                const nested: Record<string, unknown> = {};
                if (value.endsWith(':')) {
                    // Key hint from the array item line
                    const nestedKey = value.slice(0, -1).trim();
                    // Collect nested properties
                    let j = i + 1;
                    while (j < lines.length) {
                        const nLine = lines[j];
                        if (!nLine || nLine.trim() === '') {
                            j++;
                            continue;
                        }
                        const nIndent = nLine.length - nLine.trimStart().length;
                        if (nIndent < nestedIndent) break;
                        const nTrimmed = nLine.trimStart();
                        const cIdx = nTrimmed.indexOf(':');
                        if (cIdx !== -1) {
                            const nk = nTrimmed.slice(0, cIdx).trim();
                            const nv = nTrimmed.slice(cIdx + 1).trim();
                            nested[nk] = parseInlineValue(nv);
                        }
                        j++;
                    }
                    items.push({ [nestedKey]: nested });
                    i = j;
                } else {
                    items.push(nested);
                    i++;
                }
            } else if (value.includes(': ')) {
                const nestedIndent = indent + 2;
                const nested: Record<string, unknown> = {};
                const colonIdx = value.indexOf(':');
                const firstKey = value.slice(0, colonIdx).trim();
                const firstValue = value.slice(colonIdx + 1).trim();
                nested[firstKey] = parseInlineValue(firstValue);

                let j = i + 1;
                while (j < lines.length) {
                    const nLine = lines[j];
                    if (!nLine || nLine.trim() === '' || nLine.trimStart().startsWith('#')) {
                        j++;
                        continue;
                    }
                    const nIndent = nLine.length - nLine.trimStart().length;
                    if (nIndent < nestedIndent) break;

                    const nTrimmed = nLine.trimStart();
                    if (nTrimmed.startsWith('- ') && nIndent === indent) {
                        break;
                    }

                    const cIdx = nTrimmed.indexOf(':');
                    if (cIdx === -1) {
                        throw new Error(`Invalid YAML: orphaned indented content`);
                    }

                    const nk = nTrimmed.slice(0, cIdx).trim();
                    const nv = nTrimmed.slice(cIdx + 1).trim();
                    nested[nk] = parseInlineValue(nv);
                    j++;
                }

                items.push(nested);
                i = j;
            } else {
                items.push(parseScalarValue(value));
                i++;
            }
        } else {
            // If indent > baseIndent, this is orphaned indented content (invalid YAML)
            if (indent > baseIndent) {
                throw new Error(`Invalid YAML: orphaned indented content`);
            }
            break;
        }
    }

    return { items, nextLine: i };
}

function parseInlineObject(s: string): Record<string, unknown> {
    // Handle { key: value, key2: value2 } format
    const inner = s.startsWith('{') && s.endsWith('}') ? s.slice(1, -1) : s;
    const result: Record<string, unknown> = {};
    for (const part of splitWithBracketAwareness(inner)) {
        const colonIdx = part.indexOf(':');
        if (colonIdx !== -1) {
            const key = part.slice(0, colonIdx).trim();
            const value = part.slice(colonIdx + 1).trim();
            result[key] = parseInlineValue(value);
        }
    }
    return result;
}

/**
 * Split a string by comma, but respect brackets (parentheses, square brackets, curly braces).
 * This ensures we don't split on commas that are inside arrays or nested objects.
 */
function splitWithBracketAwareness(s: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < s.length; i++) {
        const char = s[i];

        if (inString) {
            current += char;
            if (char === stringChar && s[i - 1] !== '\\') {
                inString = false;
            }
            continue;
        }

        if (char === '"' || char === "'") {
            inString = true;
            stringChar = char;
            current += char;
            continue;
        }

        if (char === '[' || char === '(' || char === '{') {
            depth++;
            current += char;
        } else if (char === ']' || char === ')' || char === '}') {
            depth--;
            current += char;
        } else if (char === ',' && depth === 0) {
            parts.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    if (current.trim()) {
        parts.push(current.trim());
    }

    return parts;
}

function parseInlineValue(value: string): unknown {
    let trimmed = value.trim();

    // Strip inline comments from plain strings (before any processing)
    // This handles "value  # comment" but not inside quoted strings
    const commentIdx = trimmed.indexOf(' #');
    if (commentIdx !== -1 && !trimmed.startsWith('"') && !trimmed.startsWith("'")) {
        trimmed = trimmed.slice(0, commentIdx).trim();
    }

    // Quoted string
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        let inner = trimmed.slice(1, -1);
        // Unescape double-quoted string escapes
        if (value.trim().startsWith('"')) {
            inner = inner.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        return inner;
    }

    // Boolean
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;

    // Null
    if (trimmed === 'null' || trimmed === '~') return null;

    // Number
    if (/^-?\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
    if (/^-?\d+\.\d+$/.test(trimmed)) return Number.parseFloat(trimmed);

    // Inline object { ... } - check BEFORE invalid YAML check to avoid regex matching inside braces
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        return parseInlineObject(trimmed);
    }

    // Inline array [ ... ] - check before invalid YAML check
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const inner = trimmed.slice(1, -1);
        if (inner.trim() === '') {
            return [];
        }
        return splitWithBracketAwareness(inner).map((s) => parseInlineValue(s.trim()));
    }

    // Check for inline object/array with key:value syntax: "key: [array]" or "key: {object}"
    // This handles cases like "nested: [a, b, c]" where the value is an array/object
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx !== -1 && colonIdx < trimmed.length - 1) {
        const afterColon = trimmed.slice(colonIdx + 1).trim();
        if (afterColon.startsWith('[') || afterColon.startsWith('{')) {
            return parseInlineObject(trimmed);
        }
    }

    // Check for invalid YAML: multiple colons in unquoted string (only if not already matched above)
    if (/^[^:]*: [^:]*:/.test(trimmed)) {
        throw new Error(`Invalid YAML syntax: multiple colons in value "${trimmed}"`);
    }

    // Plain string
    return trimmed;
}

function parseScalarValue(value: string): unknown {
    return parseInlineValue(value);
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

        if (trimmed === 'auto' || trimmed === 'local' || trimmed === 'direct') {
            return { mode: trimmed };
        }

        if (
            trimmed.startsWith('acp:') ||
            trimmed.startsWith('acp-stateless:') ||
            trimmed.startsWith('acp-sessioned:')
        ) {
            return { adapter: trimmed };
        }

        return { channel: trimmed };
    }

    if (typeof raw !== 'object' || Array.isArray(raw)) {
        return undefined;
    }

    const value = raw as Record<string, unknown>;
    const mode = value.mode === 'auto' || value.mode === 'local' || value.mode === 'direct' ? value.mode : undefined;
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
