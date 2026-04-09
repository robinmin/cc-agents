/**
 * orchestration-v2 — Pipeline YAML JSON Schema
 *
 * Defines validation rules for pipeline.yaml files.
 */

import type { ValidationError, ValidationResult } from '../model';

// Helper to build JSON Schema if/then conditional without triggering noThenProperty lint rule
function jsonSchemaConditional(
    condition: Record<string, unknown>,
    consequence: Record<string, unknown>,
): Record<string, unknown> {
    const obj: Record<string, unknown> = { if: condition };
    Object.defineProperty(obj, 'then', { value: consequence, enumerable: true });
    return obj;
}

const VALID_GATE_TYPES = new Set(['command', 'auto', 'human']);
const VALID_ESCALATIONS = new Set(['pause', 'fail']);
const VALID_EXECUTOR_MODES = new Set(['auto', 'local', 'direct']);
const TIMEOUT_REGEX = /^(\d+h)?(\d+m)?(\d+s)?$/;

/**
 * Validate a raw YAML object against the pipeline schema.
 * Returns a ValidationResult with any errors found.
 */
export function validateSchema(raw: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];

    // schema_version
    if (raw.schema_version !== 1) {
        errors.push({
            rule: 'schema_version',
            message: `schema_version must be 1, got ${JSON.stringify(raw.schema_version)}`,
        });
    }

    // name
    if (!raw.name || typeof raw.name !== 'string') {
        errors.push({
            rule: 'name',
            message: 'name is required and must be a string',
        });
    }

    // phases
    if (!raw.phases || typeof raw.phases !== 'object' || Array.isArray(raw.phases)) {
        errors.push({
            rule: 'phases',
            message: 'phases is required and must be an object',
        });
    } else {
        const phases = raw.phases as Record<string, unknown>;
        for (const [name, phase] of Object.entries(phases)) {
            if (!/^[a-z][a-z0-9-_]*$/.test(name)) {
                errors.push({
                    rule: 'phase_name',
                    message: `Phase name "${name}" must be lowercase alphanumeric with hyphens or underscores`,
                });
            }
            if (typeof phase === 'object' && phase !== null) {
                const p = phase as Record<string, unknown>;
                if (!p.skill || typeof p.skill !== 'string') {
                    errors.push({
                        rule: 'skill',
                        message: `Phase "${name}" must have a skill (string)`,
                    });
                }
                if (p.executor != null) {
                    if (typeof p.executor === 'string') {
                        if ((p.executor as string).trim() === '') {
                            errors.push({
                                rule: 'executor',
                                message: `Phase "${name}" executor string must not be empty`,
                            });
                        }
                    } else if (typeof p.executor === 'object' && !Array.isArray(p.executor)) {
                        const executor = p.executor as Record<string, unknown>;
                        const mode = executor.mode;
                        const channel = executor.channel;
                        const adapter = executor.adapter;
                        const definedKeys = [mode != null, channel != null, adapter != null].filter(Boolean).length;

                        if (definedKeys === 0) {
                            errors.push({
                                rule: 'executor',
                                message: `Phase "${name}" executor must define exactly one of "mode", "channel", or "adapter"`,
                            });
                        } else if (definedKeys > 1) {
                            errors.push({
                                rule: 'executor',
                                message: `Phase "${name}" executor must not mix "mode", "channel", and "adapter"`,
                            });
                        }

                        if (mode != null && !VALID_EXECUTOR_MODES.has(mode as string)) {
                            errors.push({
                                rule: 'executor_mode',
                                message: `Phase "${name}" executor mode must be "auto", "local", or "direct", got "${mode}"`,
                            });
                        }

                        if (channel != null && (typeof channel !== 'string' || channel.trim() === '')) {
                            errors.push({
                                rule: 'executor_channel',
                                message: `Phase "${name}" executor channel must be a non-empty string`,
                            });
                        }

                        if (adapter != null && (typeof adapter !== 'string' || adapter.trim() === '')) {
                            errors.push({
                                rule: 'executor_adapter',
                                message: `Phase "${name}" executor adapter must be a non-empty string`,
                            });
                        }
                    } else {
                        errors.push({
                            rule: 'executor',
                            message: `Phase "${name}" executor must be a string or object`,
                        });
                    }
                }
                if (p.gate && typeof p.gate === 'object') {
                    const gate = p.gate as Record<string, unknown>;
                    if (gate.type && !VALID_GATE_TYPES.has(gate.type as string)) {
                        errors.push({
                            rule: 'gate_type',
                            message: `Phase "${name}" gate type must be "command", "auto", or "human", got "${gate.type}"`,
                        });
                    }
                    if (gate.type === 'command') {
                        if (
                            !gate.command ||
                            typeof gate.command !== 'string' ||
                            (gate.command as string).trim() === ''
                        ) {
                            errors.push({
                                rule: 'gate_command',
                                message: `Phase "${name}" gate type "command" requires a non-empty "command" string`,
                            });
                        }
                        // command gate must not have auto/human-specific fields
                        if (gate.checklist != null) {
                            errors.push({
                                rule: 'gate_checklist',
                                message: `Phase "${name}" gate type "command" must not have a "checklist" field`,
                            });
                        }
                        if (gate.severity != null) {
                            errors.push({
                                rule: 'gate_severity',
                                message: `Phase "${name}" gate type "command" must not have a "severity" field`,
                            });
                        }
                        if (gate.prompt != null) {
                            errors.push({
                                rule: 'gate_prompt',
                                message: `Phase "${name}" gate type "command" must not have a "prompt" field`,
                            });
                        }
                        if (gate.prompt_template != null) {
                            errors.push({
                                rule: 'gate_prompt_template',
                                message: `Phase "${name}" gate type "command" must not have a "prompt_template" field`,
                            });
                        }
                    } else if (gate.type === 'auto') {
                        // auto gate must not have command or prompt
                        if (gate.command != null) {
                            errors.push({
                                rule: 'gate_command',
                                message: `Phase "${name}" gate type "auto" must not have a "command" field`,
                            });
                        }
                        if (gate.prompt != null) {
                            errors.push({
                                rule: 'gate_prompt',
                                message: `Phase "${name}" gate type "auto" must not have a "prompt" field`,
                            });
                        }
                        // checklist must be array of strings if provided
                        if (gate.checklist != null) {
                            if (!Array.isArray(gate.checklist) || gate.checklist.length === 0) {
                                errors.push({
                                    rule: 'gate_checklist',
                                    message: `Phase "${name}" auto gate "checklist" must be a non-empty array`,
                                });
                            } else if (
                                !gate.checklist.every(
                                    (item: unknown) => typeof item === 'string' && item.trim().length > 0,
                                )
                            ) {
                                errors.push({
                                    rule: 'gate_checklist',
                                    message: `Phase "${name}" auto gate "checklist" items must be non-empty strings`,
                                });
                            }
                        }
                        // severity must be blocking or advisory if provided
                        if (gate.severity != null && gate.severity !== 'blocking' && gate.severity !== 'advisory') {
                            errors.push({
                                rule: 'gate_severity',
                                message: `Phase "${name}" auto gate "severity" must be "blocking" or "advisory", got "${gate.severity}"`,
                            });
                        }
                    } else if (gate.type === 'human') {
                        // human gate must not have command, checklist, prompt_template, or severity
                        if (gate.command != null) {
                            errors.push({
                                rule: 'gate_command',
                                message: `Phase "${name}" gate type "human" must not have a "command" field`,
                            });
                        }
                        if (gate.checklist != null) {
                            errors.push({
                                rule: 'gate_checklist',
                                message: `Phase "${name}" gate type "human" must not have a "checklist" field`,
                            });
                        }
                        if (gate.prompt_template != null) {
                            errors.push({
                                rule: 'gate_prompt_template',
                                message: `Phase "${name}" gate type "human" must not have a "prompt_template" field`,
                            });
                        }
                        if (gate.severity != null) {
                            errors.push({
                                rule: 'gate_severity',
                                message: `Phase "${name}" gate type "human" must not have a "severity" field`,
                            });
                        }
                    }
                    if (gate.rework && typeof gate.rework === 'object') {
                        const rework = gate.rework as Record<string, unknown>;
                        if (rework.escalation && !VALID_ESCALATIONS.has(rework.escalation as string)) {
                            errors.push({
                                rule: 'escalation',
                                message: `Phase "${name}" rework escalation must be "pause" or "fail"`,
                            });
                        }
                    }
                }
                if (p.timeout && typeof p.timeout === 'string') {
                    if (!TIMEOUT_REGEX.test(p.timeout) || p.timeout === '') {
                        errors.push({
                            rule: 'timeout',
                            message: `Phase "${name}" timeout "${p.timeout}" is not a valid duration (e.g., "30m", "1h", "2h30m")`,
                        });
                    }
                }
                if (p.after && !Array.isArray(p.after)) {
                    errors.push({
                        rule: 'after',
                        message: `Phase "${name}" after must be an array`,
                    });
                }
            }
        }
    }

    // presets
    if (raw.presets && typeof raw.presets === 'object' && !Array.isArray(raw.presets)) {
        const presets = raw.presets as Record<string, unknown>;
        const phaseNames = new Set(Object.keys((raw.phases as Record<string, unknown>) ?? {}));
        for (const [name, preset] of Object.entries(presets)) {
            if (typeof preset === 'object' && preset !== null) {
                const p = preset as Record<string, unknown>;
                if (!Array.isArray(p.phases)) {
                    errors.push({
                        rule: 'preset_phases',
                        message: `Preset "${name}" must have a phases array`,
                    });
                } else {
                    for (const phase of p.phases as string[]) {
                        if (!phaseNames.has(phase)) {
                            errors.push({
                                rule: 'preset_phase_ref',
                                message: `Preset "${name}" references undefined phase "${phase}"`,
                            });
                        }
                    }
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings: [],
    };
}

/**
 * Generate a JSON Schema for pipeline.yaml files.
 * Used by `orchestrator validate --schema`.
 */
export function getPipelineJsonSchema(): Record<string, unknown> {
    return {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: ['schema_version', 'name', 'phases'],
        properties: {
            schema_version: { type: 'number', const: 1 },
            name: { type: 'string' },
            extends: { type: 'string' },
            stack: {
                type: 'object',
                properties: {
                    language: { type: 'string' },
                    runtime: { type: 'string' },
                    linter: { type: 'string' },
                    test: { type: 'string' },
                    coverage: { type: 'string' },
                },
            },
            phases: {
                type: 'object',
                patternProperties: {
                    '^[a-z][a-z0-9-]*$': {
                        type: 'object',
                        required: ['skill'],
                        properties: {
                            skill: { type: 'string' },
                            gate: {
                                type: 'object',
                                properties: {
                                    type: { enum: ['command', 'auto', 'human'] },
                                    command: { type: 'string', minLength: 1 },
                                    checklist: {
                                        type: 'array',
                                        items: { type: 'string' },
                                        minItems: 1,
                                    },
                                    prompt_template: { type: 'string' },
                                    severity: { enum: ['blocking', 'advisory'] },
                                    prompt: { type: 'string' },
                                    rework: {
                                        type: 'object',
                                        properties: {
                                            max_iterations: { type: 'number' },
                                            escalation: { enum: ['pause', 'fail'] },
                                        },
                                    },
                                },
                                allOf: [
                                    jsonSchemaConditional(
                                        { properties: { type: { const: 'command' } }, required: ['type'] },
                                        {
                                            required: ['command'],
                                            not: {
                                                anyOf: [
                                                    { required: ['checklist'] },
                                                    { required: ['prompt_template'] },
                                                    { required: ['severity'] },
                                                    { required: ['prompt'] },
                                                ],
                                            },
                                        },
                                    ),
                                    jsonSchemaConditional(
                                        { properties: { type: { const: 'auto' } }, required: ['type'] },
                                        {
                                            not: {
                                                anyOf: [{ required: ['command'] }, { required: ['prompt'] }],
                                            },
                                        },
                                    ),
                                    jsonSchemaConditional(
                                        { properties: { type: { const: 'human' } }, required: ['type'] },
                                        {
                                            not: {
                                                anyOf: [
                                                    { required: ['command'] },
                                                    { required: ['checklist'] },
                                                    { required: ['prompt_template'] },
                                                    { required: ['severity'] },
                                                ],
                                            },
                                        },
                                    ),
                                ],
                            },
                            timeout: { type: 'string', pattern: '^(\\d+h)?(\\d+m)?(\\d+s)?$' },
                            after: { type: 'array', items: { type: 'string' } },
                            payload: { type: 'object' },
                            executor: {
                                oneOf: [
                                    { type: 'string', minLength: 1 },
                                    {
                                        type: 'object',
                                        properties: {
                                            mode: { enum: ['auto', 'local', 'direct'] },
                                            channel: { type: 'string', minLength: 1 },
                                            adapter: { type: 'string', minLength: 1 },
                                        },
                                        oneOf: [
                                            { required: ['mode'] },
                                            { required: ['channel'] },
                                            { required: ['adapter'] },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                },
            },
            presets: {
                type: 'object',
                patternProperties: {
                    '.*': {
                        type: 'object',
                        required: ['phases'],
                        properties: {
                            phases: { type: 'array', items: { type: 'string' } },
                            defaults: { type: 'object' },
                        },
                    },
                },
            },
            hooks: { type: 'object' },
        },
    };
}

/**
 * Validation result for skill metadata.
 */
export interface SkillMetadataValidation {
    readonly valid: boolean;
    readonly errors: Array<{ rule: string; message: string }>;
}

/**
 * Validate skill metadata gate_defaults structure.
 *
 * Expected structure:
 * ```yaml
 * metadata:
 *   gate_defaults:
 *     auto:
 *       checklist: string[]
 *       prompt_template: string | null
 * ```
 *
 * @param metadata - The metadata object from a skill's SKILL.md frontmatter
 * @returns Validation result with any errors found
 */
export function validateSkillMetadata(metadata: Record<string, unknown> | undefined): SkillMetadataValidation {
    const errors: Array<{ rule: string; message: string }> = [];

    if (!metadata) {
        // No metadata is valid (optional)
        return { valid: true, errors: [] };
    }

    if (typeof metadata !== 'object' || metadata === null) {
        errors.push({ rule: 'metadata_type', message: 'metadata must be an object' });
        return { valid: false, errors };
    }

    const gateDefaults = (metadata as Record<string, unknown>).gate_defaults;
    if (gateDefaults === undefined) {
        // No gate_defaults is valid (optional)
        return { valid: true, errors: [] };
    }

    if (typeof gateDefaults !== 'object' || gateDefaults === null) {
        errors.push({ rule: 'gate_defaults_type', message: 'gate_defaults must be an object' });
        return { valid: false, errors };
    }

    const gateDefaultsObj = gateDefaults as Record<string, unknown>;
    const auto = gateDefaultsObj.auto;

    if (auto === undefined) {
        // No auto gate defaults is valid (optional)
        return { valid: true, errors: [] };
    }

    if (typeof auto !== 'object' || auto === null) {
        errors.push({ rule: 'gate_defaults.auto_type', message: 'gate_defaults.auto must be an object' });
        return { valid: false, errors };
    }

    const autoObj = auto as Record<string, unknown>;

    // Validate checklist
    const checklist = autoObj.checklist;
    if (checklist !== undefined) {
        if (!Array.isArray(checklist)) {
            errors.push({
                rule: 'gate_defaults.auto.checklist_type',
                message: 'gate_defaults.auto.checklist must be an array of strings',
            });
        } else {
            for (let i = 0; i < checklist.length; i++) {
                if (typeof checklist[i] !== 'string') {
                    errors.push({
                        rule: 'gate_defaults.auto.checklist_item_type',
                        message: `gate_defaults.auto.checklist[${i}] must be a string, got ${typeof checklist[i]}`,
                    });
                }
            }
        }
    }

    // Validate prompt_template
    const promptTemplate = autoObj.prompt_template;
    if (promptTemplate !== undefined && promptTemplate !== null && typeof promptTemplate !== 'string') {
        errors.push({
            rule: 'gate_defaults.auto.prompt_template_type',
            message: 'gate_defaults.auto.prompt_template must be a string or null',
        });
    }

    return { valid: errors.length === 0, errors };
}
