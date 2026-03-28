import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { setGlobalSilent } from '../../../scripts/logger';
import { createExecutionPlan, generateExecutionPlan, main, validateProfile } from '../scripts/plan';

beforeAll(() => {
    setGlobalSilent(true);
});

const originalExit = process.exit;

afterEach(() => {
    process.exit = originalExit;
    process.chdir('/Users/robin/projects/cc-agents');
});

function stubExit(): void {
    process.exit = ((code?: number) => {
        throw new Error(`EXIT:${code ?? 0}`);
    }) as typeof process.exit;
}

describe('generateExecutionPlan', () => {
    test('uses the previous executed phase as the input dependency', () => {
        const plan = generateExecutionPlan('0266', 'complex');
        const phase2 = plan.phases.find((phase) => phase.number === 2);
        const phase8 = plan.phases.find((phase) => phase.number === 8);

        expect(phase2?.inputs).toEqual(['Phase 1 outputs']);
        expect(phase8?.inputs).toEqual(['Phase 7 outputs']);
    });

    test('uses task_ref inputs when the first executed phase has no predecessor', () => {
        const plan = generateExecutionPlan('0266', 'simple');
        const phase5 = plan.phases.find((phase) => phase.number === 5);
        const phase6 = plan.phases.find((phase) => phase.number === 6);

        expect(phase5?.inputs).toEqual(['task_ref', 'description?']);
        expect(phase6?.inputs).toEqual(['Phase 5 outputs']);
    });

    test('encodes standard-profile phase 8 and 9 special cases', () => {
        const plan = generateExecutionPlan('0266', 'standard');
        const phase8 = plan.phases.find((phase) => phase.number === 8);
        const phase9 = plan.phases.find((phase) => phase.number === 9);

        expect(phase8?.skill).toBe('rd3:bdd-workflow');
        expect(phase8?.outputs).toEqual(['BDD Report']);
        expect(phase8?.gateCriteria).toBe('BDD scenarios generated and executed');

        expect(phase9?.skill).toBe('rd3:code-docs');
        expect(phase9?.outputs).toEqual(['Task References']);
        expect(phase9?.gateCriteria).toBe('Task references generated');
    });

    test('uses full phase 8 and 9 metadata outside the standard profile', () => {
        const plan = generateExecutionPlan('0266', 'complex');
        const phase8 = plan.phases.find((phase) => phase.number === 8);
        const phase9 = plan.phases.find((phase) => phase.number === 9);

        expect(phase8?.skill).toBe('rd3:bdd-workflow + rd3:functional-review');
        expect(phase8?.outputs).toEqual(['Functional Verdict']);
        expect(phase8?.gateCriteria).toBe('Verdict pass or partial with approval');

        expect(phase9?.outputs).toEqual(['Documentation Artifacts']);
        expect(phase9?.gateCriteria).toBe('Documentation artifacts generated');
    });

    test('counts human gates and estimated duration after skipping a trailing suffix', () => {
        const plan = generateExecutionPlan('0266', 'complex', [8, 9]);

        expect(plan.estimated_duration_hours).toBe(14);
        expect(plan.total_gates).toBe(7);
        expect(plan.human_gates).toBe(2);
    });

    test('rejects skip-phases that would break required dependencies', () => {
        expect(() => generateExecutionPlan('0266', 'standard', [5])).toThrow(
            'Invalid skip-phases for profile "standard"',
        );
    });

    test('uses profile-specific default coverage thresholds', () => {
        expect(generateExecutionPlan('0266', 'simple').coverage_threshold).toBe(60);
        expect(generateExecutionPlan('0266', 'standard').coverage_threshold).toBe(80);
        expect(generateExecutionPlan('0266', 'research').coverage_threshold).toBe(60);
    });
});

describe('phase profiles', () => {
    test('refine profile runs only phase 1', () => {
        const plan = generateExecutionPlan('0266', 'refine');
        expect(plan.phases).toHaveLength(1);
        expect(plan.phases[0].number).toBe(1);
        expect(plan.phases[0].name).toBe('Request Intake');
        expect(plan.phases[0].inputs).toEqual(['task_ref', 'description?']);
    });

    test('plan profile runs phases 2, 3, 4', () => {
        const plan = generateExecutionPlan('0266', 'plan');
        expect(plan.phases).toHaveLength(3);
        expect(plan.phases.map((p) => p.number)).toEqual([2, 3, 4]);
        expect(plan.phases[0].inputs).toEqual(['task_ref', 'description?']);
        expect(plan.phases[1].inputs).toEqual(['Phase 2 outputs']);
        expect(plan.phases[2].inputs).toEqual(['Phase 3 outputs']);
    });

    test('unit profile runs only phase 6', () => {
        const plan = generateExecutionPlan('0266', 'unit');
        expect(plan.phases).toHaveLength(1);
        expect(plan.phases[0].number).toBe(6);
        expect(plan.phases[0].name).toBe('Unit Testing');
    });

    test('review profile runs only phase 7', () => {
        const plan = generateExecutionPlan('0266', 'review');
        expect(plan.phases).toHaveLength(1);
        expect(plan.phases[0].number).toBe(7);
        expect(plan.phases[0].name).toBe('Code Review');
        expect(plan.phases[0].gate).toBe('human');
    });

    test('docs profile runs only phase 9', () => {
        const plan = generateExecutionPlan('0266', 'docs');
        expect(plan.phases).toHaveLength(1);
        expect(plan.phases[0].number).toBe(9);
        expect(plan.phases[0].name).toBe('Documentation');
    });
});

describe('validateProfile', () => {
    test('accepts task profiles', () => {
        expect(validateProfile('simple')).toBe(true);
        expect(validateProfile('standard')).toBe(true);
        expect(validateProfile('complex')).toBe(true);
        expect(validateProfile('research')).toBe(true);
    });

    test('accepts phase profiles', () => {
        expect(validateProfile('refine')).toBe(true);
        expect(validateProfile('plan')).toBe(true);
        expect(validateProfile('unit')).toBe(true);
        expect(validateProfile('review')).toBe(true);
        expect(validateProfile('docs')).toBe(true);
    });

    test('rejects invalid profiles', () => {
        expect(validateProfile('invalid')).toBe(false);
    });
});

describe('createExecutionPlan', () => {
    test('reads task profile from a task file path when no override is provided', () => {
        const tempDir = mkdtempSync(join(tmpdir(), 'orchestration-plan-'));
        const taskPath = join(tempDir, '0266_example.md');

        writeFileSync(
            taskPath,
            `---
name: example
description: example
status: Backlog
created_at: 2026-03-28T00:00:00.000Z
updated_at: 2026-03-28T00:00:00.000Z
profile: "research"
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0266. example
`,
            'utf-8',
        );

        const plan = createExecutionPlan(taskPath);

        expect(plan.profile).toBe('research');
        expect(plan.task_path).toBe(taskPath);
        expect(plan.coverage_threshold).toBe(60);

        rmSync(tempDir, { recursive: true, force: true });
    });

    test('reads task profile from WBS-resolved task files', () => {
        const tempDir = mkdtempSync(join(tmpdir(), 'orchestration-wbs-'));
        mkdirSync(join(tempDir, 'docs', '.tasks'), { recursive: true });
        mkdirSync(join(tempDir, 'docs', 'tasks'), { recursive: true });
        writeFileSync(
            join(tempDir, 'docs', '.tasks', 'config.jsonc'),
            `{
  "active_folder": "docs/tasks",
  "folders": {
    "docs/tasks": { "base_counter": 0 }
  }
}
`,
            'utf-8',
        );
        writeFileSync(
            join(tempDir, 'docs', 'tasks', '0266_example.md'),
            `---
name: example
description: example
status: Backlog
created_at: 2026-03-28T00:00:00.000Z
updated_at: 2026-03-28T00:00:00.000Z
profile: "simple"
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0266. example
`,
            'utf-8',
        );

        process.chdir(tempDir);
        const plan = createExecutionPlan('0266');

        expect(plan.profile).toBe('simple');
        expect(plan.coverage_threshold).toBe(60);

        rmSync(tempDir, { recursive: true, force: true });
    });

    test('surfaces auto, dry-run, and refine flags in the generated plan', () => {
        const plan = createExecutionPlan('0266', { profile: 'standard', auto: true, dryRun: true, refine: true });
        const phase1 = plan.phases.find((phase) => phase.number === 1);

        expect(plan.auto_approve_human_gates).toBe(true);
        expect(plan.dry_run).toBe(true);
        expect(plan.refine_mode).toBe(true);
        expect(phase1?.inputs).toContain('mode=refine');
    });

    test('rejects refine mode when the selected profile does not include phase 1', () => {
        expect(() => createExecutionPlan('0266', { profile: 'unit', refine: true })).toThrow(
            'Refine mode requires phase 1 to be in the execution plan.',
        );
    });
});

describe('plan main', () => {
    test('generates a plan for valid CLI args', () => {
        expect(() => main(['0266', '--profile', 'complex', '--skip', '8,9', '--auto', '--refine'])).not.toThrow();
    });

    test('exits with code 1 when task_ref is missing', () => {
        stubExit();

        expect(() => main([])).toThrow('EXIT:1');
    });

    test('exits with code 1 when profile is invalid', () => {
        stubExit();

        expect(() => main(['0266', '--profile', 'invalid'])).toThrow('EXIT:1');
    });

    test('exits with code 1 when skip phases break required dependencies', () => {
        stubExit();

        expect(() => main(['0266', '--profile', 'standard', '--skip-phases', '5'])).toThrow('EXIT:1');
    });

    test('uses coverage override in gate criteria and plan output', () => {
        const plan = generateExecutionPlan('0266', 'standard', [], 90);
        const phase6 = plan.phases.find((phase) => phase.number === 6);

        expect(phase6?.gateCriteria).toContain('90');
        expect(plan.coverage_threshold).toBe(90);
    });

    test('phase 8 gate is auto/human hybrid', () => {
        const plan = generateExecutionPlan('0266', 'complex');
        const phase8 = plan.phases.find((phase) => phase.number === 8);
        expect(phase8?.gate).toBe('auto/human');
    });
});
