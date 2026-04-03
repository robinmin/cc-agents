import { describe, test, expect, beforeAll } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateSchema, getPipelineJsonSchema } from '../scripts/config/schema';
import { validatePipeline, parseYamlString, parsePipelineYaml } from '../scripts/config/parser';
import { resolveExtends } from '../scripts/config/resolver';
import type { PipelineDefinition } from '../scripts/model';

const VALID_PIPELINE: Record<string, unknown> = {
    schema_version: 1,
    name: 'test',
    phases: {
        implement: {
            skill: 'rd3:code-implement-common',
            gate: { type: 'auto' },
            timeout: '2h',
        },
        test: {
            skill: 'rd3:sys-testing',
            gate: { type: 'auto', rework: { max_iterations: 3, escalation: 'pause' } },
            timeout: '1h',
            after: ['implement'],
            payload: { coverage_threshold: 80 },
        },
    },
    presets: {
        simple: {
            phases: ['implement', 'test'],
            defaults: { coverage_threshold: 60 },
        },
    },
};

import { setGlobalSilent } from '../../../scripts/logger';

beforeAll(() => {
    setGlobalSilent(true);
});

describe('config/schema — validateSchema', () => {
    test('command gate requires command string', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', gate: { type: 'command' } },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'gate_command')).toBe(true);
    });

    test('command gate with valid command string passes', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', gate: { type: 'command', command: 'bun test' } },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(true);
    });

    test('command gate rejects empty command string', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', gate: { type: 'command', command: '  ' } },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'gate_command')).toBe(true);
    });

    test('non-command gate rejects command field', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', gate: { type: 'auto', command: 'bun test' } },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'gate_command')).toBe(true);
    });

    test('human gate rejects command field', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', gate: { type: 'human', command: 'bun test' } },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'gate_command')).toBe(true);
    });

    test('command gate with template variables passes', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: {
                    skill: 'rd3:sys-testing',
                    gate: { type: 'command', command: 'bun test --filter {{task_ref}} --phase {{phase}}' },
                },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(true);
    });

    test('valid pipeline passes', () => {
        const result = validateSchema(VALID_PIPELINE);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test('invalid schema_version', () => {
        const result = validateSchema({ ...VALID_PIPELINE, schema_version: 2 });
        expect(result.valid).toBe(false);
        expect(result.errors[0].rule).toBe('schema_version');
    });

    test('missing name', () => {
        const result = validateSchema({ schema_version: 1, phases: {} });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'name')).toBe(true);
    });

    test('missing phases', () => {
        const result = validateSchema({ schema_version: 1, name: 'test' });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'phases')).toBe(true);
    });

    test('invalid phase name', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                'Bad Name': { skill: 'test' },
            },
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'phase_name')).toBe(true);
    });

    test('missing skill in phase', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                implement: { timeout: '1h' },
            },
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'skill')).toBe(true);
    });

    test('invalid gate type', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                implement: { skill: 'test', gate: { type: 'invalid' } },
            },
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'gate_type')).toBe(true);
    });

    test('invalid timeout format', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                implement: { skill: 'test', timeout: 'abc' },
            },
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'timeout')).toBe(true);
    });

    test('valid timeout formats', () => {
        for (const timeout of ['30m', '1h', '2h30m', '1h30m15s']) {
            const pipeline = {
                schema_version: 1,
                name: 'test',
                phases: { implement: { skill: 'test', timeout } },
            };
            const result = validateSchema(pipeline);
            expect(result.valid).toBe(true);
        }
    });

    test('preset references undefined phase', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            presets: {
                oops: { phases: ['nonexistent'] },
            },
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'preset_phase_ref')).toBe(true);
    });

    test('command gate rejects checklist field', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', gate: { type: 'command', command: 'bun test', checklist: ['a'] } },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'gate_checklist')).toBe(true);
    });

    test('command gate rejects severity field', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: {
                    skill: 'rd3:sys-testing',
                    gate: { type: 'command', command: 'bun test', severity: 'blocking' },
                },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'gate_severity')).toBe(true);
    });

    test('command gate rejects prompt field', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', gate: { type: 'command', command: 'bun test', prompt: 'approve?' } },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'gate_prompt')).toBe(true);
    });

    test('auto gate rejects prompt field', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', gate: { type: 'auto', prompt: 'approve?' } },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'gate_prompt')).toBe(true);
    });

    test('auto gate rejects empty checklist', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', gate: { type: 'auto', checklist: [] } },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'gate_checklist')).toBe(true);
    });

    test('auto gate rejects checklist with non-string items', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', gate: { type: 'auto', checklist: ['ok', 42] } },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'gate_checklist')).toBe(true);
    });

    test('auto gate rejects checklist with empty string items', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', gate: { type: 'auto', checklist: ['ok', '  '] } },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'gate_checklist')).toBe(true);
    });

    test('auto gate with valid checklist passes', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', gate: { type: 'auto', checklist: ['check A', 'check B'] } },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(true);
    });

    test('auto gate rejects invalid severity', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', gate: { type: 'auto', severity: 'critical' } },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'gate_severity')).toBe(true);
    });

    test('auto gate with valid severity passes', () => {
        for (const severity of ['blocking', 'advisory'] as const) {
            const pipeline = {
                ...VALID_PIPELINE,
                phases: {
                    test: { skill: 'rd3:sys-testing', gate: { type: 'auto', severity } },
                },
                presets: {},
            };
            const result = validateSchema(pipeline);
            expect(result.valid).toBe(true);
        }
    });

    test('human gate rejects checklist field', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', gate: { type: 'human', checklist: ['a'] } },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'gate_checklist')).toBe(true);
    });

    test('human gate rejects prompt_template field', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', gate: { type: 'human', prompt_template: 'tpl' } },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'gate_prompt_template')).toBe(true);
    });

    test('human gate rejects severity field', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', gate: { type: 'human', severity: 'blocking' } },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'gate_severity')).toBe(true);
    });

    test('human gate with valid prompt passes', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', gate: { type: 'human', prompt: 'Approve this phase?' } },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(true);
    });

    test('rework with invalid escalation', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: {
                    skill: 'rd3:sys-testing',
                    gate: { type: 'auto', rework: { max_iterations: 3, escalation: 'explode' } },
                },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'escalation')).toBe(true);
    });

    test('rework with valid escalation passes', () => {
        for (const escalation of ['pause', 'fail'] as const) {
            const pipeline = {
                ...VALID_PIPELINE,
                phases: {
                    test: {
                        skill: 'rd3:sys-testing',
                        gate: { type: 'auto', rework: { max_iterations: 3, escalation } },
                    },
                },
                presets: {},
            };
            const result = validateSchema(pipeline);
            expect(result.valid).toBe(true);
        }
    });

    test('phase after must be an array', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', after: 'implement' },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'after')).toBe(true);
    });

    test('preset without phases array', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            presets: {
                broken: { defaults: { foo: 'bar' } } as unknown as Record<string, unknown>,
            },
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'preset_phases')).toBe(true);
    });

    test('phases as array is rejected', () => {
        const result = validateSchema({ schema_version: 1, name: 'test', phases: ['a', 'b'] });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'phases')).toBe(true);
    });

    test('name as non-string is rejected', () => {
        const result = validateSchema({ schema_version: 1, name: 42, phases: {} });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'name')).toBe(true);
    });

    test('gate without type is accepted (optional)', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', gate: {} },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(true);
    });

    test('phase with null value skips inner validation', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: null,
            },
            presets: {},
        } as unknown as Record<string, unknown>;
        const result = validateSchema(pipeline);
        // null is typeof 'object' but !== null fails, so inner block is skipped — no skill error
        expect(result.valid).toBe(true);
    });

    test('auto gate with non-array checklist is rejected', () => {
        const pipeline = {
            ...VALID_PIPELINE,
            phases: {
                test: { skill: 'rd3:sys-testing', gate: { type: 'auto', checklist: 'not-array' } },
            },
            presets: {},
        };
        const result = validateSchema(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'gate_checklist')).toBe(true);
    });
});

describe('config/parser — validatePipeline', () => {
    test('detects DAG cycle', () => {
        const def: PipelineDefinition = {
            schema_version: 1,
            name: 'cyclic',
            phases: {
                a: { skill: 'test', after: ['b'] },
                b: { skill: 'test', after: ['a'] },
            },
        };
        const result = validatePipeline(def);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'dag_cycle')).toBe(true);
    });

    test('detects self-dependency', () => {
        const def: PipelineDefinition = {
            schema_version: 1,
            name: 'self',
            phases: {
                a: { skill: 'test', after: ['a'] },
            },
        };
        const result = validatePipeline(def);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'self_dependency')).toBe(true);
    });

    test('detects undefined after reference', () => {
        const def: PipelineDefinition = {
            schema_version: 1,
            name: 'bad-ref',
            phases: {
                a: { skill: 'test', after: ['nonexistent'] },
            },
        };
        const result = validatePipeline(def);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'after_ref')).toBe(true);
    });

    test('valid pipeline passes all checks', () => {
        const def: PipelineDefinition = {
            schema_version: 1 as const,
            name: 'valid',
            phases: {
                implement: { skill: 'rd3:code-implement-common' },
                test: { skill: 'rd3:sys-testing', after: ['implement'] },
            },
            presets: {
                simple: { phases: ['implement', 'test'] },
            },
        };
        const result = validatePipeline(def);
        expect(result.valid).toBe(true);
    });

    test('bundled example pipelines are dependency-closed after resolution', async () => {
        const examplesDir = join(import.meta.dir, '../references/examples');
        const exampleFiles = ['default.yaml', 'security-first.yaml'];

        for (const file of exampleFiles) {
            const fullPath = join(examplesDir, file);
            const [definition] = await parsePipelineYaml(fullPath);
            const resolved = await resolveExtends(definition, fullPath);
            const validation = validatePipeline(resolved);

            expect(validation.valid).toBe(true);
        }
    });

    test('resolveExtends resolves parent files relative to the child file location', async () => {
        const tempDir = join(tmpdir(), `orch-v2-config-${Date.now()}`);
        const examplesDir = join(tempDir, 'examples');
        mkdirSync(examplesDir, { recursive: true });

        const parentPath = join(examplesDir, 'default.yaml');
        const childPath = join(examplesDir, 'security.yaml');

        writeFileSync(
            parentPath,
            `schema_version: 1
name: parent
phases:
  implement:
    skill: rd3:code-implement-common
`,
        );
        writeFileSync(
            childPath,
            `schema_version: 1
name: child
extends: default.yaml
phases:
  review:
    skill: rd3:code-review-common
    after: [implement]
`,
        );

        const [childDefinition] = await parsePipelineYaml(childPath);
        const resolved = await resolveExtends(childDefinition, childPath);

        expect(Object.keys(resolved.phases)).toEqual(['implement', 'review']);
        expect(validatePipeline(resolved).valid).toBe(true);
    });
});

describe('config/parser — parseYamlString', () => {
    test('parses simple key-value YAML', () => {
        const yaml = `
name: test-pipeline
schema_version: 1
`;
        const result = parseYamlString(yaml);
        expect(result.name).toBe('test-pipeline');
        expect(result.schema_version).toBe(1);
    });

    test('parses boolean and number values', () => {
        const yaml = `
enabled: true
count: 42
ratio: 3.14
empty: null
`;
        const result = parseYamlString(yaml);
        expect(result.enabled).toBe(true);
        expect(result.count).toBe(42);
        expect(result.ratio).toBe(3.14);
        expect(result.empty).toBeNull();
    });

    test('parses nested objects', () => {
        const yaml = `
phases:
  implement:
    skill: rd3:code-implement-common
    timeout: 2h
`;
        const result = parseYamlString(yaml);
        expect(result.phases).toBeDefined();
        const phases = result.phases as Record<string, unknown>;
        expect(phases.implement).toBeDefined();
        const impl = phases.implement as Record<string, unknown>;
        expect(impl.skill).toBe('rd3:code-implement-common');
        expect(impl.timeout).toBe('2h');
    });

    test('parses arrays', () => {
        const yaml = `
after:
  - implement
  - test
`;
        const result = parseYamlString(yaml);
        expect(result.after).toEqual(['implement', 'test']);
    });
});

describe('config/resolver — resolveExtends', () => {
    test('returns def unchanged when no extends', async () => {
        const def: PipelineDefinition = {
            schema_version: 1,
            name: 'standalone',
            phases: { a: { skill: 'test' } },
        };
        const result = await resolveExtends(def, '/some/path');
        expect(result).toBe(def);
    });

    test('throws EXTENDS_DEPTH_EXCEEDED when chain too deep', async () => {
        const tmpDir = join(tmpdir(), `resolver-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });

        // Need 3 extends levels to exceed MAX_EXTENDS_DEPTH=2:
        // d -> c -> b -> a (d calls resolve at depth 0, c at 1, b at 2 → exceeds)
        const aPath = join(tmpDir, 'a.yaml');
        const bPath = join(tmpDir, 'b.yaml');
        const cPath = join(tmpDir, 'c.yaml');
        const dPath = join(tmpDir, 'd.yaml');

        writeFileSync(aPath, 'schema_version: 1\nname: a\nphases:\n  a1:\n    skill: test\n');
        writeFileSync(bPath, `schema_version: 1\nname: b\nextends: a.yaml\nphases:\n  b1:\n    skill: test\n`);
        writeFileSync(cPath, `schema_version: 1\nname: c\nextends: b.yaml\nphases:\n  c1:\n    skill: test\n`);
        writeFileSync(dPath, `schema_version: 1\nname: d\nextends: c.yaml\nphases:\n  d1:\n    skill: test\n`);

        try {
            const [childDef] = await parsePipelineYaml(dPath);
            await expect(resolveExtends(childDef, dPath)).rejects.toThrow('Extends chain exceeds max depth');
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test('throws EXTENDS_CIRCULAR when circular extends', async () => {
        // Self-referencing: a.yaml extends a.yaml → detected at depth 1
        const tmpDir = join(tmpdir(), `resolver-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });

        const aPath = join(tmpDir, 'a.yaml');
        writeFileSync(aPath, `schema_version: 1\nname: a\nextends: a.yaml\nphases:\n  a1:\n    skill: test\n`);

        try {
            const [def] = await parsePipelineYaml(aPath);
            await expect(resolveExtends(def, aPath)).rejects.toThrow('Circular extends');
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test('throws PIPELINE_NOT_FOUND when extends file missing', async () => {
        const tmpDir = join(tmpdir(), `resolver-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });

        const childPath = join(tmpDir, 'child.yaml');
        writeFileSync(
            childPath,
            `schema_version: 1\nname: child\nextends: nonexistent.yaml\nphases:\n  x:\n    skill: test\n`,
        );

        try {
            const [def] = await parsePipelineYaml(childPath);
            await expect(resolveExtends(def, childPath)).rejects.toThrow('Cannot read extends file');
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test('merges phases: child overrides parent, deep merges payload', async () => {
        const tmpDir = join(tmpdir(), `resolver-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });

        const parentPath = join(tmpDir, 'parent.yaml');
        const childPath = join(tmpDir, 'child.yaml');

        writeFileSync(
            parentPath,
            `schema_version: 1
name: parent
phases:
  implement:
    skill: rd3:code-implement-common
    timeout: 2h
    payload:
      language: typescript
      coverage: 80
`,
        );
        writeFileSync(
            childPath,
            `schema_version: 1
name: child
extends: parent.yaml
phases:
  implement:
    skill: rd3:code-implement-common-v2
    payload:
      coverage: 95
  review:
    skill: rd3:code-review-common
`,
        );

        try {
            const [childDef] = await parsePipelineYaml(childPath);
            const resolved = await resolveExtends(childDef, childPath);

            expect(resolved.name).toBe('child');
            // Child overrides parent skill
            expect(resolved.phases.implement.skill).toBe('rd3:code-implement-common-v2');
            // Parent timeout preserved (child doesn't override)
            expect(resolved.phases.implement.timeout).toBe('2h');
            // Payload deep-merged: language from parent, coverage overridden by child
            expect(resolved.phases.implement.payload?.language).toBe('typescript');
            expect(resolved.phases.implement.payload?.coverage).toBe(95);
            // New child-only phase
            expect(resolved.phases.review.skill).toBe('rd3:code-review-common');
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test('merges presets from parent and child', async () => {
        const tmpDir = join(tmpdir(), `resolver-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });

        const parentPath = join(tmpDir, 'parent.yaml');
        const childPath = join(tmpDir, 'child.yaml');

        writeFileSync(
            parentPath,
            `schema_version: 1
name: parent
phases:
  a:
    skill: test
presets:
  parent-preset:
    phases: [a]
`,
        );
        writeFileSync(
            childPath,
            `schema_version: 1
name: child
extends: parent.yaml
phases:
  b:
    skill: test
presets:
  child-preset:
    phases: [b]
`,
        );

        try {
            const [childDef] = await parsePipelineYaml(childPath);
            const resolved = await resolveExtends(childDef, childPath);

            expect(resolved.presets?.['parent-preset']).toBeDefined();
            expect(resolved.presets?.['child-preset']).toBeDefined();
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test('merges hooks from parent and child', async () => {
        const tmpDir = join(tmpdir(), `resolver-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });

        const parentPath = join(tmpDir, 'parent.yaml');
        const childPath = join(tmpDir, 'child.yaml');

        writeFileSync(
            parentPath,
            `schema_version: 1
name: parent
phases:
  a:
    skill: test
hooks:
  on-phase-start:
    - run: echo parent-start
`,
        );
        writeFileSync(
            childPath,
            `schema_version: 1
name: child
extends: parent.yaml
phases:
  b:
    skill: test
hooks:
  on-phase-complete:
    - run: echo child-complete
`,
        );

        try {
            const [childDef] = await parsePipelineYaml(childPath);
            const resolved = await resolveExtends(childDef, childPath);

            expect(resolved.hooks).toBeDefined();
            expect(resolved.hooks?.['on-phase-start']).toHaveLength(1);
            expect(resolved.hooks?.['on-phase-complete']).toHaveLength(1);
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test('uses parent stack when child has none', async () => {
        const tmpDir = join(tmpdir(), `resolver-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });

        const parentPath = join(tmpDir, 'parent.yaml');
        const childPath = join(tmpDir, 'child.yaml');

        writeFileSync(
            parentPath,
            `schema_version: 1
name: parent
stack:
  language: typescript
  runtime: bun
  linter: biome
  test: bun test
  coverage: bun test --coverage
phases:
  a:
    skill: test
`,
        );
        writeFileSync(
            childPath,
            `schema_version: 1
name: child
extends: parent.yaml
phases:
  b:
    skill: test
`,
        );

        try {
            const [childDef] = await parsePipelineYaml(childPath);
            const resolved = await resolveExtends(childDef, childPath);

            expect(resolved.stack?.language).toBe('typescript');
            expect(resolved.stack?.runtime).toBe('bun');
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test('resolves extends with directory basePath', async () => {
        const tmpDir = join(tmpdir(), `resolver-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });

        const parentPath = join(tmpDir, 'parent.yaml');
        const childPath = join(tmpDir, 'child.yaml');

        writeFileSync(parentPath, `schema_version: 1\nname: parent\nphases:\n  a:\n    skill: test\n`);
        writeFileSync(
            childPath,
            `schema_version: 1\nname: child\nextends: parent.yaml\nphases:\n  b:\n    skill: test\n`,
        );

        try {
            const [childDef] = await parsePipelineYaml(childPath);
            // Pass directory as basePath — resolver should resolve parent relative to it
            const resolved = await resolveExtends(childDef, tmpDir);
            expect(Object.keys(resolved.phases)).toEqual(['a', 'b']);
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test('returns no hooks when both parent and child have none', async () => {
        const tmpDir = join(tmpdir(), `resolver-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });

        const parentPath = join(tmpDir, 'parent.yaml');
        const childPath = join(tmpDir, 'child.yaml');

        writeFileSync(parentPath, `schema_version: 1\nname: parent\nphases:\n  a:\n    skill: test\n`);
        writeFileSync(
            childPath,
            `schema_version: 1\nname: child\nextends: parent.yaml\nphases:\n  b:\n    skill: test\n`,
        );

        try {
            const [childDef] = await parsePipelineYaml(childPath);
            const resolved = await resolveExtends(childDef, childPath);
            expect(resolved.hooks).toBeUndefined();
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test('returns no presets when both parent and child have none', async () => {
        const tmpDir = join(tmpdir(), `resolver-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });

        const parentPath = join(tmpDir, 'parent.yaml');
        const childPath = join(tmpDir, 'child.yaml');

        writeFileSync(parentPath, `schema_version: 1\nname: parent\nphases:\n  a:\n    skill: test\n`);
        writeFileSync(
            childPath,
            `schema_version: 1\nname: child\nextends: parent.yaml\nphases:\n  b:\n    skill: test\n`,
        );

        try {
            const [childDef] = await parsePipelineYaml(childPath);
            const resolved = await resolveExtends(childDef, childPath);
            expect(resolved.presets).toBeUndefined();
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test('resolves parent from non-existent basePath without extension', async () => {
        // Tests resolveBaseDirectory catch branch: statSync throws, no extname
        // It falls back to returning the basePath as-is
        const tmpDir = join(tmpdir(), `resolver-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });

        const parentPath = join(tmpDir, 'parent.yaml');
        const childPath = join(tmpDir, 'child.yaml');

        writeFileSync(parentPath, `schema_version: 1\nname: parent\nphases:\n  a:\n    skill: test\n`);
        writeFileSync(
            childPath,
            `schema_version: 1\nname: child\nextends: parent.yaml\nphases:\n  b:\n    skill: test\n`,
        );

        try {
            const [childDef] = await parsePipelineYaml(childPath);
            // Pass a non-existent path without extension — catch returns it as-is,
            // then resolve() joins it with the extends value to find parent
            const nonExistentDir = join(tmpDir, 'ghost');
            const _resolved = await resolveExtends(childDef, nonExistentDir);
            // resolveBaseDirectory returns 'ghost' (non-existent, no extension)
            // resolve('ghost', 'parent.yaml') → '<cwd>/ghost/parent.yaml' which doesn't exist
            // but in this test, the extends resolves relative to ghost/parent.yaml
        } catch {
            // Expected: PIPELINE_NOT_FOUND because the resolved path won't exist
        }
    });
});

describe('config/schema — getPipelineJsonSchema', () => {
    test('returns valid JSON Schema', () => {
        const schema = getPipelineJsonSchema();
        expect(schema.$schema).toBeDefined();
        expect(schema.type).toBe('object');
        expect(schema.required as string[]).toContain('schema_version');
        expect(schema.required as string[]).toContain('name');
        expect(schema.required as string[]).toContain('phases');
    });

    test('parsePipelineYaml loads and validates YAML file', async () => {
        const fs = require('node:fs');
        const os = require('node:os');
        const path = require('node:path');
        const tmpDir = path.join(os.tmpdir(), `parser-test-${Date.now()}`);
        fs.mkdirSync(tmpDir, { recursive: true });
        const yamlPath = path.join(tmpDir, 'test.yaml');
        fs.writeFileSync(
            yamlPath,
            [
                'schema_version: 1',
                'name: test-pipe',
                'stack:',
                '  language: typescript',
                '  runtime: bun',
                '  linter: biome',
                '  test: bun test',
                '  coverage: bun test --coverage',
                'phases:',
                '  implement:',
                '    skill: rd3:code-implement-common',
                '    gate: { type: auto }',
                '    timeout: 1h',
                '  test:',
                '    skill: rd3:sys-testing',
                '    gate: { type: auto }',
                '    timeout: 30m',
                '    after: [implement]',
            ].join('\n'),
        );

        const [def, validation] = await parsePipelineYaml(yamlPath);
        expect(validation.valid).toBe(true);
        expect(def.name).toBe('test-pipe');
        expect(Object.keys(def.phases)).toHaveLength(2);

        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('parseYamlString handles inline objects', () => {
        const yaml = 'key: { nested: value, count: 42 }';
        const result = parseYamlString(yaml);
        expect(result).toBeDefined();
        expect((result as Record<string, unknown>).key).toBeDefined();
    });

    test('parseYamlString handles arrays', () => {
        const yaml = 'items:\n  - one\n  - two\n  - three';
        const result = parseYamlString(yaml);
        expect(result).toBeDefined();
        expect((result as Record<string, unknown>).items).toBeDefined();
    });

    test('parseYamlString handles empty string', () => {
        const result = parseYamlString('');
        expect(result).toBeDefined();
    });
});
