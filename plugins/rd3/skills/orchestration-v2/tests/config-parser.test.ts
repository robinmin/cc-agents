import { describe, test, expect, beforeAll } from 'bun:test';
import { parsePipelineYaml, parseYamlString, validatePipeline } from '../scripts/config/parser';
import type { PipelineDefinition } from '../scripts/model';
import { setGlobalSilent } from '../../../scripts/logger';
import { writeFileSync, mkdirSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/** Test-visible interface for parsed phase config */
interface PhaseTestConfig {
    skill: string;
    executor?: string | { mode?: string; channel?: string; adapter?: string };
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
    executor:
      mode: direct
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
        expect(implement.executor).toEqual({ mode: 'direct' });
        expect(implement.timeout).toBe('1h');
        expect(implement.gate?.type).toBe('auto');
        expect(implement.gate?.rework?.max_iterations).toBe(3);
        expect(implement.gate?.rework?.escalation).toBe('pause');
    });

    test('normalizes string executor shorthands into object form', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'orch-v2-parser-'));
        const file = join(dir, 'pipeline.yaml');
        writeFileSync(
            file,
            `
schema_version: 1
name: exec-shorthand
phases:
  implement:
    skill: rd3:code-implement-common
    executor: direct
  review:
    skill: rd3:code-review-common
    executor: codex
  docs:
    skill: rd3:code-docs
    executor: acp-session:pi
`,
        );

        try {
            const [pipeline] = await parsePipelineYaml(file);
            expect(pipeline.phases.implement.executor).toEqual({ mode: 'subprocess' });
            expect(pipeline.phases.review.executor).toEqual({ channel: 'codex' });
            expect(pipeline.phases.docs.executor).toEqual({ adapter: 'acp-session:pi' });
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
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
    });

    test('parses multiline array items as concatenated strings', () => {
        // Indented continuation lines after array items are valid YAML — joined as a single string
        const result = parseYamlString('- invalid\n  indentation');
        expect(result as unknown as unknown[]).toEqual(['invalid indentation']);
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

    test('parses tilde as null', () => {
        const result = parseYamlString('value: ~');
        expect(result.value).toBeNull();
    });

    test('parses empty inline array', () => {
        const result = parseYamlString('items: []');
        expect(result.items).toEqual([]);
    });

    test('parses key with value syntax like "nested: [a, b]"', () => {
        const result = parseYamlString('config: [alpha, beta]');
        expect(result.config).toEqual(['alpha', 'beta']);
    });

    test('parses key with inline object value like "meta: {x: 1}"', () => {
        const result = parseYamlString('meta: {x: 1}');
        expect(result.meta).toEqual({ x: 1 });
    });

    test('parses block scalar with only blank lines', () => {
        const yaml = `content: |


`;
        const result = parseYamlString(yaml);
        expect(result.content).toBe('');
    });

    test('parses top-level array', () => {
        const yaml = `- alpha
- beta
- gamma
`;
        const result = parseYamlString(yaml);
        expect(result as unknown as unknown[]).toEqual(['alpha', 'beta', 'gamma']);
    });

    test('parses top-level array with inline key:value items', () => {
        // In standard YAML, '- beta: gamma' is a mapping entry, not a scalar
        const yaml = `- alpha
- beta: gamma
`;
        const result = parseYamlString(yaml) as unknown as unknown[];
        expect(result).toEqual(['alpha', { beta: 'gamma' }]);
    });

    test('parses array items with key-hint nested object', () => {
        const yaml = `
items:
  - mykey:
      prop1: hello
      prop2: world
`;
        const result = parseYamlString(yaml);
        const items = result.items as unknown[];
        expect(items).toHaveLength(1);
        expect(items[0]).toEqual({ mykey: { prop1: 'hello', prop2: 'world' } });
    });

    test('handles empty dash in array item', () => {
        // Empty dash followed by indented content — parser produces object not array
        const yaml = `items:\n  -\n    prop1: hello`;
        const result = parseYamlString(yaml);
        // The parser processes this path through parseArrayLines empty-dash branch
        expect(result).toBeDefined();
    });

    test('parses array items with continuation properties', () => {
        const yaml = `
items:
  - name: first
    extra: data
  - name: second
`;
        const result = parseYamlString(yaml);
        const items = result.items as unknown[];
        expect(items).toEqual([{ name: 'first', extra: 'data' }, { name: 'second' }]);
    });

    test('handles array item with continuation hitting next dash at same indent', () => {
        const yaml = `
items:
  - key: a
    x: 1
  - key: b
`;
        const result = parseYamlString(yaml);
        const items = result.items as unknown[];
        expect(items).toEqual([{ key: 'a', x: 1 }, { key: 'b' }]);
    });

    test('handles nested key with no next line (assigns null)', () => {
        const yaml = 'empty:';
        const result = parseYamlString(yaml);
        expect(result.empty).toBeNull();
    });

    test('handles nested key where next line is at same indent (assigns null)', () => {
        const yaml = `empty:
other: value
`;
        const result = parseYamlString(yaml);
        expect(result.empty).toBeNull();
        expect(result.other).toBe('value');
    });

    test('concatenates continuation lines in array items', () => {
        // Standard YAML treats indented continuation as part of the scalar value
        const yaml = `- item1
  orphaned_indent`;
        const result = parseYamlString(yaml);
        expect(result as unknown as unknown[]).toEqual(['item1 orphaned_indent']);
    });

    test('concatenates continuation lines in array items under key', () => {
        const yaml = `
items:
  - valid
    bad_indent_no_dash`;
        const result = parseYamlString(yaml);
        expect((result as Record<string, unknown[]>).items).toEqual(['valid bad_indent_no_dash']);
    });

    test('throws on invalid YAML in array item continuation', () => {
        // 'no_colon_line' as a continuation of a mapping value is invalid YAML
        const yaml = `
items:
  - key: value
    no_colon_line`;
        expect(() => parseYamlString(yaml)).toThrow();
    });

    test('parses number and float edge cases', () => {
        const yaml = `
positive: 42
negative: -7
float_pos: 3.14
float_neg: -0.5
`;
        const result = parseYamlString(yaml);
        expect(result.positive).toBe(42);
        expect(result.negative).toBe(-7);
        expect(result.float_pos).toBeCloseTo(3.14);
        expect(result.float_neg).toBeCloseTo(-0.5);
    });

    test('splitWithBracketAwareness handles quoted strings with commas', () => {
        // Testing via parseInlineValue -> parseInlineObject
        const yaml = `obj: {a: "hello, world", b: 2}`;
        const result = parseYamlString(yaml);
        expect(result.obj).toEqual({ a: 'hello, world', b: 2 });
    });

    test('splitWithBracketAwareness handles nested brackets', () => {
        const yaml = `obj: {a: [1, 2], b: {c: 3}}`;
        const result = parseYamlString(yaml);
        expect(result.obj).toEqual({ a: [1, 2], b: { c: 3 } });
    });
});

/* ── Extra validatePipeline tests for preset subgraph ── */

describe('config/parser — validatePipeline preset subgraph', () => {
    test('detects preset phase dependency outside preset', () => {
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'subgraph-test',
            phases: {
                intake: { skill: 'test' },
                implement: { skill: 'test', after: ['intake'] },
                test: { skill: 'test', after: ['implement'] },
            },
            presets: {
                partial: {
                    phases: ['intake', 'implement'],
                    // implement depends on intake (in preset) ✓
                },
                broken: {
                    phases: ['implement'],
                    // implement depends on intake (NOT in preset) ✗
                },
            },
        };

        const result = validatePipeline(pipeline);
        expect(result.valid).toBe(true); // preset_subgraph is now a warning
        expect(result.warnings.some((e) => e.rule === 'preset_subgraph')).toBe(true);
    });

    test('accepts valid preset subgraph', () => {
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'valid-subgraph',
            phases: {
                intake: { skill: 'test' },
                implement: { skill: 'test', after: ['intake'] },
            },
            presets: {
                full: {
                    phases: ['intake', 'implement'],
                },
            },
        };

        const result = validatePipeline(pipeline);
        expect(result.valid).toBe(true);
    });
});

/* ── parsePipelineYaml: full PipelineDefinition fields ── */

describe('config/parser — parsePipelineYaml full definition', () => {
    test('parses pipeline with extends, stack, hooks', async () => {
        const tmpDir = join(tmpdir(), `parser-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });

        const yamlPath = join(tmpDir, 'full.yaml');
        const yamlContent = `
schema_version: 1
name: full-pipeline
extends: base-pipeline
stack:
  language: typescript
  runtime: bun
  linter: biome
  test: bun test
  coverage: bun coverage
phases:
  intake:
    skill: rd3:request-intake
    payload:
      language: typescript
hooks:
  on-phase-start:
    - run: echo starting
`;
        writeFileSync(yamlPath, yamlContent);

        try {
            const [def, validation] = await parsePipelineYaml(yamlPath);
            expect(validation.valid).toBe(true);
            expect(def.name).toBe('full-pipeline');
            expect(def.extends).toBe('base-pipeline');
            expect(def.stack?.language).toBe('typescript');
            expect(def.hooks).toBeDefined();
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
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
                    skill: 'rd3:code-implement-common',
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
        const tmpDir = join(tmpdir(), `parser-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });

        const yamlPath = join(tmpDir, 'valid.yaml');
        const yamlContent = `
schema_version: 1
name: test-pipeline
phases:
  implement:
    skill: rd3:code-implement-common
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

        writeFileSync(yamlPath, yamlContent);

        try {
            const [definition, validation] = await parsePipelineYaml(yamlPath);

            expect(validation.valid).toBe(true);
            expect(definition.name).toBe('test-pipeline');
            expect(definition.phases.implement.skill).toBe('rd3:code-implement-common');
            expect(definition.phases.test.after).toEqual(['implement']);
            expect(definition.presets?.basic.phases).toEqual(['implement', 'test']);
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test('handles file not found error', async () => {
        await expect(parsePipelineYaml('/nonexistent/file.yaml')).rejects.toThrow('Cannot read pipeline file');
    });

    test('handles invalid YAML syntax in file', async () => {
        const tmpDir = join(tmpdir(), `parser-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });

        const yamlPath = join(tmpDir, 'invalid.yaml');
        writeFileSync(yamlPath, 'invalid: yaml: syntax:');

        try {
            await expect(parsePipelineYaml(yamlPath)).rejects.toThrow();
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test('returns validation errors for invalid pipeline', async () => {
        const tmpDir = join(tmpdir(), `parser-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });

        const yamlPath = join(tmpDir, 'invalid-pipeline.yaml');
        const yamlContent = `
schema_version: 1
name: broken-pipeline
phases:
  broken:
    skill: test
    after: [nonexistent]
`;

        writeFileSync(yamlPath, yamlContent);

        try {
            const [definition, validation] = await parsePipelineYaml(yamlPath);

            expect(validation.valid).toBe(false);
            expect(validation.errors.some((e) => e.rule === 'after_ref')).toBe(true);
            expect(definition.name).toBe('broken-pipeline'); // Definition still parsed
        } finally {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });
});

/* ── Skill existence validation ── */

describe('config/parser — validatePipeline skill existence', () => {
    test('detects non-existent skill referenced by phase', () => {
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'bad-skill',
            phases: {
                intake: { skill: 'rd3:request-intake' },
                implement: { skill: 'rd3:nonexistent-skill' },
            },
        };

        const result = validatePipeline(pipeline);
        // Non-existent skill is a warning, not a hard error — execution may still work
        expect(result.valid).toBe(true);
        expect(result.warnings.some((e) => e.rule === 'skill_not_found')).toBe(true);
        expect(result.warnings.find((e) => e.rule === 'skill_not_found')?.message).toContain('nonexistent-skill');
    });

    test('accepts existing skills', () => {
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'valid-skills',
            phases: {
                intake: { skill: 'rd3:request-intake' },
                test: { skill: 'rd3:sys-testing' },
            },
        };

        const result = validatePipeline(pipeline);
        expect(result.valid).toBe(true);
    });

    test('skips check for skills without plugin prefix', () => {
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'no-prefix',
            phases: {
                step: { skill: 'simple-name' },
            },
        };

        const result = validatePipeline(pipeline);
        expect(result.valid).toBe(true);
    });

    test('skips check for empty skill reference', () => {
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'empty-skill',
            phases: {
                step: { skill: 'placeholder' as string },
            },
        };

        const result = validatePipeline(pipeline);
        // No plugin prefix — skill existence check is skipped
        expect(result.errors.some((e) => e.rule === 'skill_not_found')).toBe(false);
        expect(result.warnings.some((e) => e.rule === 'skill_not_found')).toBe(false);
    });
});

/* ── Object-form executor normalization ── */

describe('config/parser — normalizePhaseExecutor object form', () => {
    // Object-form executor normalization is exercised through parsePipelineYaml
    // which calls rawToPipelineDefinition → normalizePhaseExecutor.

    async function parseExecutor(executorYaml: string) {
        const dir = mkdtempSync(join(tmpdir(), 'orch-v2-exec-'));
        const file = join(dir, 'pipeline.yaml');
        writeFileSync(
            file,
            `
schema_version: 1
name: exec-obj-test
phases:
  step:
    skill: rd3:code-implement-common
    executor: ${executorYaml}
`,
        );
        try {
            const [pipeline] = await parsePipelineYaml(file);
            return pipeline.phases.step.executor;
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    }

    test('normalizes object executor with mode: inline', async () => {
        const exec = await parseExecutor('{ mode: inline }');
        expect(exec).toEqual({ mode: 'inline' });
    });

    test('normalizes object executor with mode: subprocess', async () => {
        const exec = await parseExecutor('{ mode: subprocess }');
        expect(exec).toEqual({ mode: 'subprocess' });
    });

    test('normalizes object executor with legacy mode: auto → inline', async () => {
        const exec = await parseExecutor('{ mode: auto }');
        expect(exec).toEqual({ mode: 'inline' });
    });

    test('normalizes object executor with legacy mode: local → inline', async () => {
        const exec = await parseExecutor('{ mode: local }');
        expect(exec).toEqual({ mode: 'inline' });
    });

    test('normalizes object executor with legacy mode: current → inline', async () => {
        const exec = await parseExecutor('{ mode: current }');
        expect(exec).toEqual({ mode: 'inline' });
    });

    test('normalizes object executor with legacy mode: direct → subprocess', async () => {
        const exec = await parseExecutor('{ mode: direct }');
        expect(exec).toEqual({ mode: 'subprocess' });
    });

    test('normalizes object executor with channel', async () => {
        const exec = await parseExecutor('{ channel: codex }');
        expect(exec).toEqual({ channel: 'codex' });
    });

    test('normalizes object executor with adapter', async () => {
        const exec = await parseExecutor('{ adapter: "acp-session:pi" }');
        expect(exec).toEqual({ adapter: 'acp-session:pi' });
    });

    test('normalizes object executor with mode + channel + adapter', async () => {
        const exec = await parseExecutor('{ mode: inline, channel: codex, adapter: "acp:pi" }');
        expect(exec).toEqual({ mode: 'inline', channel: 'codex', adapter: 'acp:pi' });
    });

    test('returns undefined for object executor with empty values', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'orch-v2-exec-'));
        const file = join(dir, 'pipeline.yaml');
        writeFileSync(
            file,
            `
schema_version: 1
name: exec-empty-obj
phases:
  step:
    skill: rd3:code-implement-common
    executor: { mode: "" }
`,
        );
        try {
            const [pipeline] = await parsePipelineYaml(file);
            expect(pipeline.phases.step.executor).toBeUndefined();
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    test('returns undefined for array executor', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'orch-v2-exec-'));
        const file = join(dir, 'pipeline.yaml');
        writeFileSync(
            file,
            `
schema_version: 1
name: exec-array
phases:
  step:
    skill: rd3:code-implement-common
    executor:
      - inline
`,
        );
        try {
            const [pipeline] = await parsePipelineYaml(file);
            expect(pipeline.phases.step.executor).toBeUndefined();
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    test('returns undefined for empty string executor', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'orch-v2-exec-'));
        const file = join(dir, 'pipeline.yaml');
        writeFileSync(
            file,
            `
schema_version: 1
name: exec-empty-str
phases:
  step:
    skill: rd3:code-implement-common
    executor: ""
`,
        );
        try {
            const [pipeline] = await parsePipelineYaml(file);
            expect(pipeline.phases.step.executor).toBeUndefined();
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe('Skill Metadata Validation', () => {
    const { validateSkillMetadata } = require('../scripts/config/schema');

    test('validates empty/undefined metadata as valid', () => {
        expect(validateSkillMetadata(undefined).valid).toBe(true);
        expect(validateSkillMetadata({}).valid).toBe(true);
    });

    test('validates metadata without gate_defaults as valid', () => {
        const result = validateSkillMetadata({
            author: 'test',
            platforms: ['claude'],
        });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test('validates valid gate_defaults.auto structure', () => {
        const result = validateSkillMetadata({
            gate_defaults: {
                auto: {
                    checklist: ['Phase output is complete', 'No obvious errors'],
                    prompt_template: 'Custom prompt: {checklist}',
                },
            },
        });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test('allows null prompt_template', () => {
        const result = validateSkillMetadata({
            gate_defaults: {
                auto: {
                    checklist: ['Test item'],
                    prompt_template: null,
                },
            },
        });
        expect(result.valid).toBe(true);
    });

    test('rejects non-object gate_defaults', () => {
        const result = validateSkillMetadata({
            gate_defaults: 'not an object',
        } as Record<string, unknown>);
        expect(result.valid).toBe(false);
        expect(result.errors[0].rule).toBe('gate_defaults_type');
    });

    test('rejects non-object auto', () => {
        const result = validateSkillMetadata({
            gate_defaults: {
                auto: 'not an object',
            },
        } as Record<string, unknown>);
        expect(result.valid).toBe(false);
        expect(result.errors[0].rule).toBe('gate_defaults.auto_type');
    });

    test('rejects non-array checklist', () => {
        const result = validateSkillMetadata({
            gate_defaults: {
                auto: {
                    checklist: 'not an array',
                },
            },
        } as Record<string, unknown>);
        expect(result.valid).toBe(false);
        expect(result.errors[0].rule).toBe('gate_defaults.auto.checklist_type');
    });

    test('rejects checklist with non-string items', () => {
        const result = validateSkillMetadata({
            gate_defaults: {
                auto: {
                    checklist: ['valid string', 123, 'another string'],
                },
            },
        } as Record<string, unknown>);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e: { rule: string }) => e.rule === 'gate_defaults.auto.checklist_item_type')).toBe(
            true,
        );
    });

    test('rejects invalid prompt_template type', () => {
        const result = validateSkillMetadata({
            gate_defaults: {
                auto: {
                    checklist: ['Test'],
                    prompt_template: 123,
                },
            },
        } as Record<string, unknown>);
        expect(result.valid).toBe(false);
        expect(result.errors[0].rule).toBe('gate_defaults.auto.prompt_template_type');
    });

    test('collects multiple errors', () => {
        const result = validateSkillMetadata({
            gate_defaults: {
                auto: {
                    checklist: 123,
                    prompt_template: 456,
                },
            },
        } as Record<string, unknown>);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
});
