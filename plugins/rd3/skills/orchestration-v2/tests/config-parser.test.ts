import { describe, test, expect, beforeAll } from 'bun:test';
import { parsePipelineYaml, parseYamlString, validatePipeline } from '../scripts/config/parser';
import type { PipelineDefinition } from '../scripts/model';
import { setGlobalSilent } from '../../../scripts/logger';

/** Test-visible interface for parsed phase config */
interface PhaseTestConfig {
    skill: string;
    gate?: {
        type: string;
        rework?: { max_iterations: number; escalation: string };
    };
    timeout?: string;
    after?: string[];
    payload?: Record<string, unknown>;
}

beforeAll(() => {
    setGlobalSilent(true);
});

describe('config/parser — parseYamlString', () => {
    test('parses simple scalar values', () => {
        const yaml = `
name: test-pipeline
schema_version: 1
count: 42
ratio: 3.14
enabled: true
disabled: false
empty: null
`;
        const result = parseYamlString(yaml);
        expect(result.name).toBe('test-pipeline');
        expect(result.schema_version).toBe(1);
        expect(result.count).toBe(42);
        expect(result.ratio).toBe(3.14);
        expect(result.enabled).toBe(true);
        expect(result.disabled).toBe(false);
        expect(result.empty).toBeNull();
    });

    test('parses nested objects with proper indentation', () => {
        const yaml = `
phases:
  implement:
    skill: rd3:code-implement
    timeout: 1h
    gate:
      type: auto
      rework:
        max_iterations: 3
        escalation: pause
`;
        const result = parseYamlString(yaml);
        const phases = result.phases as Record<string, PhaseTestConfig>;
        const implement = phases.implement;

        expect(implement.skill).toBe('rd3:code-implement');
        expect(implement.timeout).toBe('1h');
        expect(implement.gate?.type).toBe('auto');
        expect(implement.gate?.rework?.max_iterations).toBe(3);
        expect(implement.gate?.rework?.escalation).toBe('pause');
    });

    test('parses arrays with different syntax styles', () => {
        const yaml = `
flow_style: [one, two, three]
block_style:
  - first
  - second  
  - third
mixed:
  - item1
  - nested: [a, b, c]
  - item3
`;
        const result = parseYamlString(yaml);

        expect(result.flow_style).toEqual(['one', 'two', 'three']);
        expect(result.block_style).toEqual(['first', 'second', 'third']);
        expect(result.mixed).toHaveLength(3);
        expect((result.mixed as unknown[])[1]).toEqual({ nested: ['a', 'b', 'c'] });
    });

    test('parses inline objects and arrays', () => {
        const yaml = `
gate: { type: auto, timeout: 30m }
phases: [implement, test, deploy]
mixed: { items: [a, b], count: 3 }
`;
        const result = parseYamlString(yaml);

        expect(result.gate).toEqual({ type: 'auto', timeout: '30m' });
        expect(result.phases).toEqual(['implement', 'test', 'deploy']);
        expect(result.mixed).toEqual({ items: ['a', 'b'], count: 3 });
    });

    test('handles empty input gracefully', () => {
        expect(parseYamlString('')).toEqual({});
        expect(parseYamlString('   \n  \n')).toEqual({});
    });

    test('handles comments and ignores them', () => {
        const yaml = `
# This is a comment
name: test  # Inline comment
# Another comment
schema_version: 1
`;
        const result = parseYamlString(yaml);
        expect(result.name).toBe('test');
        expect(result.schema_version).toBe(1);
    });

    test('handles quoted strings with special characters', () => {
        const yaml = `
single: 'single quoted: with colon'
double: "double quoted: with \\"escapes\\""
multiline: |
  This is a
  multiline string
  with line breaks
folded: >
  This is a folded
  string that becomes
  one line
`;
        const result = parseYamlString(yaml);

        expect(result.single).toBe('single quoted: with colon');
        expect(result.double).toBe('double quoted: with "escapes"');
        expect(result.multiline).toContain('This is a\nmultiline');
        expect(result.folded).toContain('This is a folded');
    });

    test('parses complex nested structure', () => {
        const yaml = `
presets:
  security-first:
    phases: [intake, threat-model, implement, security-test]
    defaults:
      coverage_threshold: 90
      security_scan: true
    overrides:
      implement:
        timeout: 2h
      security-test:
        payload:
          tools: [sast, dast, dependency-check]
`;
        const result = parseYamlString(yaml) as Record<string, Record<string, Record<string, unknown>>>;
        const preset = result.presets['security-first'] as Record<string, unknown>;
        const defaults = preset.defaults as Record<string, unknown>;
        const overrides = preset.overrides as Record<string, Record<string, unknown>>;

        expect(preset.phases).toHaveLength(4);
        expect(defaults.coverage_threshold).toBe(90);
        expect(overrides.implement.timeout).toBe('2h');
        expect((overrides['security-test'] as Record<string, unknown>).payload).toBeDefined();
    });

    test('throws on invalid YAML syntax', () => {
        expect(() => parseYamlString('invalid: yaml: syntax:')).toThrow();
        expect(() => parseYamlString('- invalid\n  indentation')).toThrow();
    });

    test('handles edge cases with whitespace and formatting', () => {
        const yaml = `

name:    test-pipeline   


schema_version:   1  

phases:

  implement:
    skill:  rd3:code-implement  
    

`;
        const result = parseYamlString(yaml);
        expect(result.name).toBe('test-pipeline');
        expect(result.schema_version).toBe(1);
        expect((result.phases as Record<string, Record<string, string>>).implement.skill).toBe('rd3:code-implement');
    });
});

describe('config/parser — validatePipeline', () => {
    test('validates complete pipeline successfully', () => {
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'complete-pipeline',
            phases: {
                intake: {
                    skill: 'rd3:request-intake',
                    gate: { type: 'auto' },
                    timeout: '30m',
                },
                implement: {
                    skill: 'rd3:code-implement',
                    gate: { type: 'auto' },
                    timeout: '2h',
                    after: ['intake'],
                    payload: { language: 'typescript' },
                },
                test: {
                    skill: 'rd3:sys-testing',
                    gate: { type: 'human' },
                    timeout: '1h',
                    after: ['implement'],
                },
            },
            presets: {
                quick: {
                    phases: ['intake', 'implement'],
                    defaults: { timeout: '1h' },
                },
            },
        };

        const result = validatePipeline(pipeline);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test('detects complex cycle in dependency graph', () => {
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'cyclic-pipeline',
            phases: {
                a: { skill: 'test', after: ['c'] },
                b: { skill: 'test', after: ['a'] },
                c: { skill: 'test', after: ['d'] },
                d: { skill: 'test', after: ['b'] },
            },
        };

        const result = validatePipeline(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'dag_cycle')).toBe(true);
    });

    test('detects self-referencing phase', () => {
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'self-ref',
            phases: {
                broken: { skill: 'test', after: ['broken'] },
            },
        };

        const result = validatePipeline(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.rule === 'self_dependency')).toBe(true);
    });

    test('detects multiple undefined dependencies', () => {
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'bad-refs',
            phases: {
                implement: { skill: 'test', after: ['nonexistent', 'also-missing'] },
            },
        };

        const result = validatePipeline(pipeline);
        expect(result.valid).toBe(false);
        const afterRefErrors = result.errors.filter((e) => e.rule === 'after_ref');
        expect(afterRefErrors.length).toBeGreaterThan(0);
    });

    test('validates empty phases list', () => {
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'empty',
            phases: {},
        };

        const result = validatePipeline(pipeline);
        expect(result.valid).toBe(true);
    });

    test('validates complex dependency tree', () => {
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'complex-deps',
            phases: {
                intake: { skill: 'test' },
                arch: { skill: 'test', after: ['intake'] },
                implement_a: { skill: 'test', after: ['arch'] },
                implement_b: { skill: 'test', after: ['arch'] },
                test_a: { skill: 'test', after: ['implement_a'] },
                test_b: { skill: 'test', after: ['implement_b'] },
                integration: { skill: 'test', after: ['test_a', 'test_b'] },
                deploy: { skill: 'test', after: ['integration'] },
            },
        };

        const result = validatePipeline(pipeline);
        expect(result.valid).toBe(true);
    });

    test('accumulates all validation errors', () => {
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'multi-error',
            phases: {
                broken: {
                    skill: 'test',
                    after: ['broken', 'missing1', 'missing2'],
                },
            },
        };

        const result = validatePipeline(pipeline);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(2); // Self-ref + missing deps
    });
});

describe('config/parser — parsePipelineYaml', () => {
    test('loads and validates YAML file successfully', async () => {
        const fs = require('node:fs');
        const os = require('node:os');
        const path = require('node:path');

        const tmpDir = path.join(os.tmpdir(), `parser-test-${Date.now()}`);
        fs.mkdirSync(tmpDir, { recursive: true });

        const yamlPath = path.join(tmpDir, 'valid.yaml');
        const yamlContent = `
schema_version: 1
name: test-pipeline
phases:
  implement:
    skill: rd3:code-implement
    gate: { type: auto }
    timeout: 1h
  test:
    skill: rd3:sys-testing
    after: [implement]
    timeout: 30m
presets:
  basic:
    phases: [implement, test]
`;

        fs.writeFileSync(yamlPath, yamlContent);

        try {
            const [definition, validation] = await parsePipelineYaml(yamlPath);

            expect(validation.valid).toBe(true);
            expect(definition.name).toBe('test-pipeline');
            expect(definition.phases.implement.skill).toBe('rd3:code-implement');
            expect(definition.phases.test.after).toEqual(['implement']);
            expect(definition.presets?.basic.phases).toEqual(['implement', 'test']);
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test('handles file not found error', async () => {
        await expect(parsePipelineYaml('/nonexistent/file.yaml')).rejects.toThrow();
    });

    test('handles invalid YAML syntax in file', async () => {
        const fs = require('node:fs');
        const os = require('node:os');
        const path = require('node:path');

        const tmpDir = path.join(os.tmpdir(), `parser-test-${Date.now()}`);
        fs.mkdirSync(tmpDir, { recursive: true });

        const yamlPath = path.join(tmpDir, 'invalid.yaml');
        fs.writeFileSync(yamlPath, 'invalid: yaml: syntax:');

        try {
            await expect(parsePipelineYaml(yamlPath)).rejects.toThrow();
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test('returns validation errors for invalid pipeline', async () => {
        const fs = require('node:fs');
        const os = require('node:os');
        const path = require('node:path');

        const tmpDir = path.join(os.tmpdir(), `parser-test-${Date.now()}`);
        fs.mkdirSync(tmpDir, { recursive: true });

        const yamlPath = path.join(tmpDir, 'invalid-pipeline.yaml');
        const yamlContent = `
schema_version: 1
name: broken-pipeline
phases:
  broken:
    skill: test
    after: [nonexistent]
`;

        fs.writeFileSync(yamlPath, yamlContent);

        try {
            const [definition, validation] = await parsePipelineYaml(yamlPath);

            expect(validation.valid).toBe(false);
            expect(validation.errors.some((e) => e.rule === 'after_ref')).toBe(true);
            expect(definition.name).toBe('broken-pipeline'); // Definition still parsed
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });
});
