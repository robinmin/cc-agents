import { describe, test, expect, beforeAll } from 'bun:test';
import { validateSchema, getPipelineJsonSchema } from '../scripts/config/schema';
import { validatePipeline, parseYamlString, parsePipelineYaml } from '../scripts/config/parser';
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
