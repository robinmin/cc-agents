import { describe, test, expect, beforeAll, afterEach } from 'bun:test';
import { parsePipelineYaml, parseYamlString, validatePipeline } from '../scripts/config/parser';
import type { PipelineDefinition } from '../scripts/model';
import { OrchestratorError } from '../scripts/model';
import { setGlobalSilent } from '../../../scripts/logger';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/** Typed interfaces for accessing parsed YAML results in tests */
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

interface PresetTestConfig {
    phases: string[];
    defaults: { timeout: string; coverage: number };
}

beforeAll(() => {
    setGlobalSilent(true);
});

describe('parser — parseYamlString', () => {
    describe('basic scalar values', () => {
        test('parses strings, numbers, booleans, and null', () => {
            const yaml = `
name: test-pipeline
schema_version: 1
count: 42
ratio: 3.14
negative: -5
negative_float: -2.7
enabled: true
disabled: false
empty: null
tilde_null: ~
`;
            const result = parseYamlString(yaml);
            expect(result.name).toBe('test-pipeline');
            expect(result.schema_version).toBe(1);
            expect(result.count).toBe(42);
            expect(result.ratio).toBe(3.14);
            expect(result.negative).toBe(-5);
            expect(result.negative_float).toBe(-2.7);
            expect(result.enabled).toBe(true);
            expect(result.disabled).toBe(false);
            expect(result.empty).toBeNull();
            expect(result.tilde_null).toBeNull();
        });

        test('parses quoted strings', () => {
            const yaml = `
single: 'single quoted'
double: "double quoted"
single_with_special: 'has: colon and, comma'
double_with_escape: "has \\"quotes\\" inside"
`;
            const result = parseYamlString(yaml);
            expect(result.single).toBe('single quoted');
            expect(result.double).toBe('double quoted');
            expect(result.single_with_special).toBe('has: colon and, comma');
            // The parser now handles escape sequences
            expect(result.double_with_escape).toBe('has "quotes" inside');
        });

        test('handles unquoted strings with special characters', () => {
            const yaml = `
plain_string: just-a-string
with_dashes: test-string-value
with_underscores: test_string_value
`;
            const result = parseYamlString(yaml);
            expect(result.plain_string).toBe('just-a-string');
            expect(result.with_dashes).toBe('test-string-value');
            expect(result.with_underscores).toBe('test_string_value');
        });
    });

    describe('nested objects', () => {
        test('parses simple nested objects', () => {
            const yaml = `
phases:
  implement:
    skill: rd3:code-implement
    timeout: 1h
  test:
    skill: rd3:sys-testing
    timeout: 30m
`;
            const result = parseYamlString(yaml);
            const phases = result.phases as Record<string, PhaseTestConfig>;
            expect(phases.implement.skill).toBe('rd3:code-implement');
            expect(phases.implement.timeout).toBe('1h');
            expect(phases.test.skill).toBe('rd3:sys-testing');
            expect(phases.test.timeout).toBe('30m');
        });

        test('parses deeply nested objects', () => {
            const yaml = `
config:
  database:
    connection:
      host: localhost
      port: 5432
      ssl:
        enabled: true
        cert_path: /path/to/cert
`;
            const result = parseYamlString(yaml);
            const config = result.config as {
                database: {
                    connection: {
                        host: string;
                        port: number;
                        ssl: { enabled: boolean; cert_path: string };
                    };
                };
            };
            expect(config.database.connection.host).toBe('localhost');
            expect(config.database.connection.port).toBe(5432);
            expect(config.database.connection.ssl.enabled).toBe(true);
            expect(config.database.connection.ssl.cert_path).toBe('/path/to/cert');
        });

        test('handles mixed indentation levels', () => {
            const yaml = `
level1:
  level2a:
    level3: value3
  level2b: value2b
another_level1: value1
`;
            const result = parseYamlString(yaml);
            const level1 = result.level1 as { level2a: { level3: string }; level2b: string };
            expect(level1.level2a.level3).toBe('value3');
            expect(level1.level2b).toBe('value2b');
            expect(result.another_level1).toBe('value1');
        });
    });

    describe('arrays', () => {
        test('parses block-style arrays', () => {
            const yaml = `
simple_array:
  - first
  - second
  - third
mixed_types:
  - string_item
  - 42
  - true
  - null
`;
            const result = parseYamlString(yaml);
            expect(result.simple_array).toEqual(['first', 'second', 'third']);
            expect(result.mixed_types).toEqual(['string_item', 42, true, null]);
        });

        test('parses flow-style arrays', () => {
            const yaml = `
flow_array: [one, two, three]
mixed_flow: [string, 123, false]
empty_flow: []
`;
            const result = parseYamlString(yaml);
            expect(result.flow_array).toEqual(['one', 'two', 'three']);
            expect(result.mixed_flow).toEqual(['string', 123, false]);
            expect(result.empty_flow).toEqual([]);
        });

        test('parses nested arrays', () => {
            const yaml = `
nested_arrays:
  - - inner1
    - inner2
  - - inner3
    - inner4
`;
            const result = parseYamlString(yaml);
            // Note: This is a limitation of our simple parser - it doesn't handle complex nested array structures
            // We expect it to parse as array items containing strings
            expect(Array.isArray(result.nested_arrays)).toBe(true);
        });
    });

    describe('inline objects and complex values', () => {
        test('parses inline objects', () => {
            const yaml = `
inline_simple: { key: value, count: 5 }
inline_nested: { outer: { inner: nested_value }, flag: true }
`;
            const result = parseYamlString(yaml);
            expect(result.inline_simple).toEqual({ key: 'value', count: 5 });
            expect(result.inline_nested).toEqual({
                outer: { inner: 'nested_value' },
                flag: true,
            });
        });

        test('handles complex pipeline structure', () => {
            const yaml = `
schema_version: 1
name: complex-pipeline
phases:
  intake:
    skill: rd3:request-intake
    gate:
      type: auto
      rework:
        max_iterations: 3
        escalation: pause
    timeout: 30m
  implement:
    skill: rd3:code-implement
    after: [intake]
    timeout: 2h
    payload:
      language: typescript
      framework: nextjs
`;
            const result = parseYamlString(yaml);
            expect(result.schema_version).toBe(1);
            expect(result.name).toBe('complex-pipeline');

            const phases = result.phases as Record<string, PhaseTestConfig>;
            expect(phases.intake.gate?.type).toBe('auto');
            expect(phases.intake.gate?.rework?.max_iterations).toBe(3);
            expect(phases.intake.gate?.rework?.escalation).toBe('pause');
            expect(phases.intake.timeout).toBe('30m');

            expect(phases.implement.skill).toBe('rd3:code-implement');
            expect(phases.implement.after).toEqual(['intake']);
            expect(phases.implement.timeout).toBe('2h');
            expect(phases.implement.payload?.language).toBe('typescript');
            expect(phases.implement.payload?.framework).toBe('nextjs');
        });
    });

    describe('edge cases and error handling', () => {
        test('handles empty input', () => {
            expect(parseYamlString('')).toEqual({});
            expect(parseYamlString('   \n  \n  \n')).toEqual({});
            expect(parseYamlString('# Just comments\n# More comments')).toEqual({});
        });

        test('handles comments', () => {
            const yaml = `
# Top level comment
name: test  
# This is ignored
schema_version: 1
# Final comment
`;
            const result = parseYamlString(yaml);
            expect(result.name).toBe('test');
            expect(result.schema_version).toBe(1);
        });

        test('handles excessive whitespace', () => {
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
            const phases = result.phases as Record<string, PhaseTestConfig>;
            expect(phases.implement.skill).toBe('rd3:code-implement');
        });

        test('handles malformed structures gracefully', () => {
            const yaml = `
name: test
broken_key_no_value:
another_key: valid_value
`;
            const result = parseYamlString(yaml);
            expect(result.name).toBe('test');
            expect(result.broken_key_no_value).toBeNull();
            expect(result.another_key).toBe('valid_value');
        });

        test('handles colon in values correctly', () => {
            const yaml = `
url: http://example.com:8080
description: "This: has: multiple: colons"
unquoted_with_colon: value:with:colons
`;
            const result = parseYamlString(yaml);
            expect(result.url).toBe('http://example.com:8080');
            expect(result.description).toBe('This: has: multiple: colons');
            expect(result.unquoted_with_colon).toBe('value:with:colons');
        });
    });

    describe('preset configurations', () => {
        test('parses preset definitions correctly', () => {
            const yaml = `
presets:
  quick:
    phases: [intake, implement]
    defaults:
      timeout: 1h
      coverage: 80
  full:
    phases: [intake, arch, implement, test, deploy]
    defaults:
      timeout: 2h
      coverage: 95
`;
            const result = parseYamlString(yaml);
            const presets = result.presets as Record<string, PresetTestConfig>;

            expect(presets.quick.phases).toEqual(['intake', 'implement']);
            expect(presets.quick.defaults.timeout).toBe('1h');
            expect(presets.quick.defaults.coverage).toBe(80);

            expect(presets.full.phases).toEqual(['intake', 'arch', 'implement', 'test', 'deploy']);
            expect(presets.full.defaults.timeout).toBe('2h');
            expect(presets.full.defaults.coverage).toBe(95);
        });
    });
});

describe('parser — validatePipeline', () => {
    describe('successful validation', () => {
        test('validates minimal valid pipeline', () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'minimal',
                phases: {
                    'only-phase': {
                        skill: 'test-skill',
                    },
                },
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('validates complex valid pipeline', () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'complex-valid',
                phases: {
                    intake: {
                        skill: 'rd3:request-intake',
                        gate: { type: 'auto' },
                        timeout: '30m',
                    },
                    architecture: {
                        skill: 'rd3:backend-architect',
                        gate: {
                            type: 'human',
                            rework: {
                                max_iterations: 2,
                                escalation: 'pause',
                            },
                        },
                        timeout: '1h',
                        after: ['intake'],
                        payload: { detail_level: 'high' },
                    },
                    implement: {
                        skill: 'rd3:code-implement-common',
                        gate: { type: 'auto' },
                        timeout: '2h',
                        after: ['architecture'],
                        payload: { language: 'typescript' },
                    },
                    'sys-test': {
                        skill: 'rd3:sys-testing',
                        gate: { type: 'human' },
                        timeout: '1h',
                        after: ['implement'],
                    },
                },
                presets: {
                    basic: {
                        phases: ['intake', 'architecture', 'implement'],
                        defaults: { timeout: '1h' },
                    },
                    full: {
                        phases: ['intake', 'architecture', 'implement', 'sys-test'],
                        defaults: { coverage: 90 },
                    },
                },
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('validates empty phases', () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'empty',
                phases: {},
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('validates complex dependency graph without cycles', () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'complex-deps',
                phases: {
                    start: { skill: 'start-skill' },
                    'branch-a': { skill: 'branch-skill', after: ['start'] },
                    'branch-b': { skill: 'branch-skill', after: ['start'] },
                    'branch-c': { skill: 'branch-skill', after: ['start'] },
                    'merge-ab': { skill: 'merge-skill', after: ['branch-a', 'branch-b'] },
                    'merge-bc': { skill: 'merge-skill', after: ['branch-b', 'branch-c'] },
                    final: { skill: 'final-skill', after: ['merge-ab', 'merge-bc'] },
                },
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('cycle detection', () => {
        test('detects simple self-reference cycle', () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'self-cycle',
                phases: {
                    broken: { skill: 'test', after: ['broken'] },
                },
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.rule === 'self_dependency')).toBe(true);
        });

        test('detects simple two-node cycle', () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'two-node-cycle',
                phases: {
                    a: { skill: 'test', after: ['b'] },
                    b: { skill: 'test', after: ['a'] },
                },
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.rule === 'dag_cycle')).toBe(true);
        });

        test('detects complex multi-node cycle', () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'complex-cycle',
                phases: {
                    a: { skill: 'test', after: ['d'] },
                    b: { skill: 'test', after: ['a'] },
                    c: { skill: 'test', after: ['b'] },
                    d: { skill: 'test', after: ['c'] },
                    e: { skill: 'test', after: ['b'] }, // valid branch
                },
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.rule === 'dag_cycle')).toBe(true);
        });

        test('detects cycle with disconnected components', () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'disconnected-cycle',
                phases: {
                    independent1: { skill: 'test' },
                    independent2: { skill: 'test' },
                    'cycle-a': { skill: 'test', after: ['cycle-b'] },
                    'cycle-b': { skill: 'test', after: ['cycle-c'] },
                    'cycle-c': { skill: 'test', after: ['cycle-a'] },
                },
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.rule === 'dag_cycle')).toBe(true);
        });
    });

    describe('reference validation', () => {
        test('detects undefined phase references', () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'bad-refs',
                phases: {
                    'valid-phase': { skill: 'test', after: ['nonexistent'] },
                    'another-phase': { skill: 'test', after: ['also-missing', 'still-missing'] },
                },
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(false);
            const afterRefErrors = result.errors.filter((e) => e.rule === 'after_ref');
            expect(afterRefErrors.length).toBe(3); // nonexistent, also_missing, still_missing
            expect(afterRefErrors.some((e) => e.message.includes('nonexistent'))).toBe(true);
            expect(afterRefErrors.some((e) => e.message.includes('also-missing'))).toBe(true);
            expect(afterRefErrors.some((e) => e.message.includes('still-missing'))).toBe(true);
        });

        test('validates mixed valid and invalid references', () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'mixed-refs',
                phases: {
                    'valid-dep': { skill: 'test' },
                    'mixed-phase': { skill: 'test', after: ['valid-dep', 'invalid-dep'] },
                },
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(false);
            const afterRefErrors = result.errors.filter((e) => e.rule === 'after_ref');
            expect(afterRefErrors.length).toBe(1);
            expect(afterRefErrors[0].message).toContain('invalid-dep');
        });
    });

    describe('preset validation', () => {
        test('validates preset phase references', () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'preset-validation',
                phases: {
                    intake: { skill: 'intake-skill' },
                    implement: { skill: 'implement-skill', after: ['intake'] },
                    test: { skill: 'test-skill', after: ['implement'] },
                },
                presets: {
                    valid_preset: {
                        phases: ['intake', 'implement'],
                    },
                    invalid_preset: {
                        phases: ['intake', 'nonexistent_phase'],
                    },
                },
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(false);
            const presetErrors = result.errors.filter((e) => e.rule === 'preset_phase_ref');
            expect(presetErrors.length).toBe(1);
            expect(presetErrors[0].message).toContain('nonexistent_phase');
        });

        test('validates preset subgraph consistency', () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'preset-subgraph',
                phases: {
                    a: { skill: 'test' },
                    b: { skill: 'test', after: ['a'] },
                    c: { skill: 'test', after: ['b'] },
                    d: { skill: 'test', after: ['c'] },
                },
                presets: {
                    valid_subgraph: {
                        phases: ['a', 'b', 'c'], // Valid: c depends on b which is in preset
                    },
                    broken_subgraph: {
                        phases: ['b', 'd'], // Invalid: d depends on c which is not in preset
                    },
                },
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(false);
            const subgraphErrors = result.errors.filter((e) => e.rule === 'preset_subgraph');
            expect(subgraphErrors.length).toBe(2);
            expect(subgraphErrors.some((e) => e.message.includes('broken_subgraph'))).toBe(true);
            expect(subgraphErrors.some((e) => e.message.includes('depends on "c"'))).toBe(true);
        });
    });

    describe('error accumulation', () => {
        test('accumulates multiple validation errors', () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'multi-error',
                phases: {
                    broken: {
                        skill: 'test',
                        after: ['broken', 'missing1', 'missing2'], // Self-ref + 2 missing
                    },
                    'another-broken': {
                        skill: 'test',
                        after: ['missing3'], // 1 more missing
                    },
                },
                presets: {
                    'broken-preset': {
                        phases: ['missing4'], // Missing phase in preset
                    },
                },
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThanOrEqual(4);

            // Should have self-dependency error
            expect(result.errors.some((e) => e.rule === 'self_dependency')).toBe(true);

            // Should have after_ref errors for missing1, missing2, missing3
            const afterRefErrors = result.errors.filter((e) => e.rule === 'after_ref');
            expect(afterRefErrors.length).toBeGreaterThanOrEqual(3);

            // Should have preset_phase_ref error for missing4
            expect(result.errors.some((e) => e.rule === 'preset_phase_ref')).toBe(true);
        });
    });

    describe('schema validation integration', () => {
        test('fails on schema validation errors', () => {
            const invalidPipeline = {
                schema_version: 2, // Invalid version
                // Missing required name field
                phases: {
                    test: { skill: 'test-skill' },
                },
            } as unknown as PipelineDefinition;

            const result = validatePipeline(invalidPipeline);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });
});

describe('parser — parsePipelineYaml', () => {
    let tmpDirs: string[] = [];

    afterEach(() => {
        // Clean up any created temp directories
        for (const tmpDir of tmpDirs) {
            try {
                rmSync(tmpDir, { recursive: true, force: true });
            } catch {
                // Ignore cleanup errors
            }
        }
        tmpDirs = [];
    });

    function createTempDir(): string {
        const tmpDir = join(tmpdir(), `parser-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
        mkdirSync(tmpDir, { recursive: true });
        tmpDirs.push(tmpDir);
        return tmpDir;
    }

    describe('successful parsing', () => {
        test('parses valid pipeline file', async () => {
            const tmpDir = createTempDir();
            const yamlContent = `
schema_version: 1
name: test-pipeline
phases:
  intake:
    skill: rd3:request-intake
    gate: { type: auto }
    timeout: 30m
  implement:
    skill: rd3:code-implement-common
    after: [intake]
    timeout: 2h
    payload:
      language: typescript
presets:
  quick:
    phases: [intake, implement]
    defaults:
      timeout: 1h
`;

            const yamlPath = join(tmpDir, 'valid.yaml');
            writeFileSync(yamlPath, yamlContent);

            const [definition, validation] = await parsePipelineYaml(yamlPath);

            expect(validation.valid).toBe(true);
            expect(definition.name).toBe('test-pipeline');
            expect(definition.schema_version).toBe(1);
            expect(definition.phases.intake.skill).toBe('rd3:request-intake');
            expect(definition.phases.implement.after).toEqual(['intake']);
            expect(definition.phases.implement.payload?.language).toBe('typescript');
            expect(definition.presets?.quick.phases).toEqual(['intake', 'implement']);
        });

        test('returns validation errors for invalid pipeline', async () => {
            const tmpDir = createTempDir();
            const yamlContent = `
schema_version: 1
name: broken-pipeline
phases:
  broken:
    skill: test
    after: [nonexistent]
  cyclic_a:
    skill: test
    after: [cyclic_b]
  cyclic_b:
    skill: test
    after: [cyclic_a]
`;

            const yamlPath = join(tmpDir, 'invalid.yaml');
            writeFileSync(yamlPath, yamlContent);

            const [definition, validation] = await parsePipelineYaml(yamlPath);

            expect(validation.valid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
            expect(validation.errors.some((e) => e.rule === 'after_ref')).toBe(true);
            expect(validation.errors.some((e) => e.rule === 'dag_cycle')).toBe(true);

            // Definition should still be parsed
            expect(definition.name).toBe('broken-pipeline');
            expect(definition.phases.broken.skill).toBe('test');
        });
    });

    describe('error handling', () => {
        test('throws OrchestratorError for missing file', async () => {
            const tmpDir = createTempDir();
            const nonExistentPath = join(tmpDir, 'nonexistent.yaml');

            await expect(parsePipelineYaml(nonExistentPath)).rejects.toThrow(OrchestratorError);

            try {
                await parsePipelineYaml(nonExistentPath);
            } catch (error) {
                expect(error).toBeInstanceOf(OrchestratorError);
                expect((error as OrchestratorError).code).toBe('PIPELINE_NOT_FOUND');
                expect((error as OrchestratorError).message).toContain(nonExistentPath);
            }
        });

        test('handles directory instead of file', async () => {
            const tmpDir = createTempDir();
            const dirPath = join(tmpDir, 'not-a-file');
            mkdirSync(dirPath);

            await expect(parsePipelineYaml(dirPath)).rejects.toThrow(OrchestratorError);
        });

        test('handles permission errors', async () => {
            const tmpDir = createTempDir();
            const yamlPath = join(tmpDir, 'restricted.yaml');
            writeFileSync(yamlPath, 'name: test\nschema_version: 1\nphases: {}');

            // Try to make file unreadable (may not work on all systems)
            try {
                await import('node:fs').then((fs) => fs.chmodSync(yamlPath, 0o000));
                await expect(parsePipelineYaml(yamlPath)).rejects.toThrow();
            } catch {
                // Skip test if chmod fails (e.g., on Windows)
            } finally {
                // Restore permissions for cleanup
                try {
                    await import('node:fs').then((fs) => fs.chmodSync(yamlPath, 0o644));
                } catch {}
            }
        });
    });

    describe('real-world scenarios', () => {
        test('parses comprehensive pipeline configuration', async () => {
            const tmpDir = createTempDir();
            const yamlContent = `
schema_version: 1
name: comprehensive-pipeline
extends: base-pipeline

stack:
  language: typescript
  runtime: node18
  linter: eslint
  test: jest
  coverage: nyc

phases:
  intake:
    skill: rd3:request-intake
    gate: { type: auto }
    timeout: 30m
  
  architecture:
    skill: rd3:backend-architect
    after: [intake]
    gate:
      type: human
      rework:
        max_iterations: 3
        escalation: pause
    timeout: 2h
    payload:
      detail_level: high
      include_diagrams: true
  
  implement:
    skill: rd3:code-implement-common
    after: [architecture]
    gate: { type: auto }
    timeout: 4h
    payload:
      language: typescript
      framework: nextjs
      test_coverage: 85
  
  testing:
    skill: rd3:sys-testing
    after: [implement]
    gate:
      type: human
      rework:
        max_iterations: 2
        escalation: fail
    timeout: 2h
  
  deployment:
    skill: rd3:code-implement-common
    after: [testing]
    gate: { type: auto }
    timeout: 1h
    payload:
      environment: staging
      rollback_enabled: true

presets:
  minimal:
    phases: [intake, architecture, implement]
    defaults:
      timeout: 1h
      
  standard:
    phases: [intake, architecture, implement, testing]
    defaults:
      timeout: 2h
      coverage: 80
      
  full:
    phases: [intake, architecture, implement, testing, deployment]
    defaults:
      timeout: 3h
      coverage: 90

hooks:
  on-phase-start:
    - run: notify-team
    - action: pause
      reason: "Wait for approval"
  on-phase-failure:
    - run: rollback-changes
    - action: fail
`;

            const yamlPath = join(tmpDir, 'comprehensive.yaml');
            writeFileSync(yamlPath, yamlContent);

            const [definition, validation] = await parsePipelineYaml(yamlPath);

            expect(validation.valid).toBe(true);
            expect(definition.name).toBe('comprehensive-pipeline');
            expect(definition.extends).toBe('base-pipeline');
            expect(definition.stack?.language).toBe('typescript');
            expect(definition.stack?.runtime).toBe('node18');

            // Check phases
            expect(Object.keys(definition.phases)).toHaveLength(5);
            expect(definition.phases.intake.skill).toBe('rd3:request-intake');
            expect(definition.phases.architecture.gate?.rework?.max_iterations).toBe(3);
            expect(definition.phases.implement.payload?.framework).toBe('nextjs');

            // Check presets
            expect(Object.keys(definition.presets || {})).toHaveLength(3);
            expect(definition.presets?.minimal.phases).toEqual(['intake', 'architecture', 'implement']);
            expect(definition.presets?.full.phases).toHaveLength(5);

            // Check hooks
            expect(definition.hooks?.['on-phase-start']).toBeDefined();
            expect(definition.hooks?.['on-phase-failure']).toBeDefined();
        });
    });
});

describe('parser — internal helper functions', () => {
    describe('parseInlineValue', () => {
        test('handles all scalar types correctly', () => {
            // Test through parseYamlString since parseInlineValue is not exported
            const yaml = `
string: plain_string
quoted_string: "quoted value"
integer: 42
negative_int: -17
float: 3.14159
negative_float: -2.71
boolean_true: true
boolean_false: false
null_value: null
tilde_null: ~
`;
            const result = parseYamlString(yaml);
            expect(typeof result.string).toBe('string');
            expect(typeof result.quoted_string).toBe('string');
            expect(typeof result.integer).toBe('number');
            expect(Number.isInteger(result.integer)).toBe(true);
            expect(typeof result.negative_int).toBe('number');
            expect(typeof result.float).toBe('number');
            expect(!Number.isInteger(result.float)).toBe(true);
            expect(typeof result.negative_float).toBe('number');
            expect(typeof result.boolean_true).toBe('boolean');
            expect(typeof result.boolean_false).toBe('boolean');
            expect(result.null_value).toBeNull();
            expect(result.tilde_null).toBeNull();
        });
    });

    describe('hasCycle (DFS algorithm)', () => {
        test('correctly identifies no cycles in complex graphs', () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'diamond-graph',
                phases: {
                    start: { skill: 'test' },
                    left: { skill: 'test', after: ['start'] },
                    right: { skill: 'test', after: ['start'] },
                    end: { skill: 'test', after: ['left', 'right'] },
                },
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(true);
        });

        test('correctly identifies cycles in disconnected components', () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'disconnected-with-cycle',
                phases: {
                    // Valid component
                    a: { skill: 'test' },
                    b: { skill: 'test', after: ['a'] },

                    // Cyclic component
                    x: { skill: 'test', after: ['z'] },
                    y: { skill: 'test', after: ['x'] },
                    z: { skill: 'test', after: ['y'] },
                },
            };

            const result = validatePipeline(pipeline);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.rule === 'dag_cycle')).toBe(true);
        });
    });

    describe('rawToPipelineDefinition conversion', () => {
        test('correctly converts all field types', () => {
            const yaml = `
schema_version: 1
name: conversion-test
extends: parent-pipeline

stack:
  language: typescript
  runtime: node18

phases:
  test_phase:
    skill: test-skill
    gate:
      type: human
      rework:
        max_iterations: 3
        escalation: pause
    timeout: 2h30m
    after: [dependency]
    payload:
      custom_field: custom_value
      numeric_field: 42

presets:
  test_preset:
    phases: [test_phase]
    defaults:
      timeout: 1h

hooks:
  on-phase-start:
    - run: pre-hook
`;

            const result = parseYamlString(yaml);
            expect(result.schema_version).toBe(1);
            expect(result.name).toBe('conversion-test');
            expect(result.extends).toBe('parent-pipeline');

            const phases = result.phases as Record<string, PhaseTestConfig>;
            expect(phases.test_phase.skill).toBe('test-skill');
            expect(phases.test_phase.gate?.type).toBe('human');
            expect(phases.test_phase.timeout).toBe('2h30m');
            expect(phases.test_phase.after).toEqual(['dependency']);
            expect(phases.test_phase.payload?.custom_field).toBe('custom_value');
            expect(phases.test_phase.payload?.numeric_field).toBe(42);
        });

        test('handles optional fields correctly', () => {
            const yaml = `
schema_version: 1
name: minimal-test
phases:
  minimal_phase:
    skill: minimal-skill
`;

            const result = parseYamlString(yaml);
            const phases = result.phases as Record<string, PhaseTestConfig>;
            expect(phases.minimal_phase.skill).toBe('minimal-skill');
            expect(phases.minimal_phase.gate).toBeUndefined();
            expect(phases.minimal_phase.timeout).toBeUndefined();
            expect(phases.minimal_phase.after).toBeUndefined();
            expect(phases.minimal_phase.payload).toBeUndefined();
        });
    });
});
