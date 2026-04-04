import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { setGlobalSilent } from '../../../scripts/logger';
import { DOWNSTREAM_EVIDENCE_CONTRACTS, PHASE_WORKER_CONTRACT_VERSION, validateSkipPhases } from '../scripts/contracts';
import { parseOrchestrationArgs } from '../scripts/model';
import { createExecutionPlan, generateExecutionPlan, main, validateProfile } from '../scripts/plan';

beforeAll(() => {
    setGlobalSilent(true);
});

const originalExit = process.exit;
const originalCwd = process.cwd();
const tempDirs: string[] = [];

afterEach(() => {
    process.exit = originalExit;
    process.chdir(originalCwd);
    while (tempDirs.length > 0) {
        rmSync(tempDirs.pop() as string, { recursive: true, force: true });
    }
});

function createTempDir(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
}

describe('generateExecutionPlan', () => {
    test('uses explicit phase contracts instead of implicit previous-phase placeholders', () => {
        const plan = generateExecutionPlan('0266', 'complex');
        const phase2 = plan.phases.find((phase) => phase.number === 2);
        const phase8 = plan.phases.find((phase) => phase.number === 8);

        expect(phase2?.inputs).toEqual(['task_ref', 'requirements', 'constraints']);
        expect(phase8?.inputs).toEqual(['task_ref', 'mode=full', 'source_paths?', 'bdd_report']);
    });

    test('uses explicit phase contracts for profiles that begin mid-pipeline', () => {
        const plan = generateExecutionPlan('0266', 'simple');
        const phase5 = plan.phases.find((phase) => phase.number === 5);
        const phase6 = plan.phases.find((phase) => phase.number === 6);

        expect(phase5?.inputs).toEqual(['task_ref', 'solution', 'design?']);
        expect(phase6?.inputs).toEqual(['task_ref', 'source_paths', 'coverage_threshold']);
        expect(phase5?.prerequisites).toEqual(['Solution section populated']);
    });

    test('routes heavy phases through worker executors while keeping other phases direct', () => {
        const plan = generateExecutionPlan('0266', 'complex');
        const phase1 = plan.phases.find((phase) => phase.number === 1);
        const phase5 = plan.phases.find((phase) => phase.number === 5);
        const phase6 = plan.phases.find((phase) => phase.number === 6);
        const phase7 = plan.phases.find((phase) => phase.number === 7);

        expect(phase1?.execution_mode).toBe('direct-skill');
        expect(phase1?.executor).toBe('rd3:request-intake');

        expect(phase5?.execution_mode).toBe('worker-agent');
        expect(phase5?.executor).toBe('rd3:super-coder');
        expect(phase5?.skill).toBe('rd3:code-implement-common');
        expect(phase5?.worker_contract_version).toBe(PHASE_WORKER_CONTRACT_VERSION);

        expect(phase6?.execution_mode).toBe('worker-agent');
        expect(phase6?.executor).toBe('rd3:super-tester');
        expect(phase6?.skill).toBe('rd3:sys-testing + rd3:advanced-testing');
        expect(phase6?.worker_contract_version).toBe(PHASE_WORKER_CONTRACT_VERSION);

        expect(phase7?.execution_mode).toBe('worker-agent');
        expect(phase7?.executor).toBe('rd3:super-reviewer');
        expect(phase7?.skill).toBe('rd3:code-review-common');
        expect(phase7?.worker_contract_version).toBe(PHASE_WORKER_CONTRACT_VERSION);
    });

    test('encodes standard-profile phase 8 and 9 special cases', () => {
        const plan = generateExecutionPlan('0266', 'standard');
        const phase8 = plan.phases.find((phase) => phase.number === 8);
        const phase9 = plan.phases.find((phase) => phase.number === 9);

        expect(phase8?.skill).toBe('rd3:bdd-workflow');
        expect(phase8?.outputs).toEqual(['BDD Report']);
        expect(phase8?.gateCriteria).toBe('BDD scenarios generated and executed');
        expect(phase8?.gate).toBe('auto');

        expect(phase9?.skill).toBe('rd3:code-docs');
        expect(phase9?.outputs).toEqual(['Refreshed Project Docs']);
        expect(phase9?.gateCriteria).toBe('Relevant project docs refreshed');
    });

    test('uses full phase 8 and 9 metadata outside the standard profile', () => {
        const plan = generateExecutionPlan('0266', 'complex');
        const phase8 = plan.phases.find((phase) => phase.number === 8);
        const phase9 = plan.phases.find((phase) => phase.number === 9);

        expect(phase8?.skill).toBe('rd3:bdd-workflow + rd3:functional-review');
        expect(phase8?.outputs).toEqual(['Functional Verdict']);
        expect(phase8?.gateCriteria).toBe('Verdict pass or partial with approval');

        expect(phase9?.outputs).toEqual(['Refreshed Project Docs']);
        expect(phase9?.gateCriteria).toBe('Relevant project docs refreshed');
    });

    test('counts human gates and estimated duration after skipping a trailing suffix', () => {
        const plan = generateExecutionPlan('0266', 'complex', undefined, [8, 9]);

        expect(plan.estimated_duration_hours).toBe(14);
        expect(plan.total_gates).toBe(7);
        expect(plan.human_gates).toBe(2);
    });

    test('rejects skip-phases that would break required dependencies', () => {
        expect(() => generateExecutionPlan('0266', 'standard', undefined, [5])).toThrow(
            'Invalid skip-phases for profile "standard"',
        );
    });

    test('supports starting from a later phase in the selected profile', () => {
        const plan = generateExecutionPlan('0266', 'complex', 5);
        expect(plan.phases.map((phase) => phase.number)).toEqual([5, 6, 7, 8, 9]);
    });

    test('rejects start-phase values that are outside the selected profile', () => {
        expect(() => generateExecutionPlan('0266', 'simple', 3)).toThrow('Invalid start-phase 3 for profile "simple"');
    });

    test('uses profile-specific default coverage thresholds', () => {
        expect(generateExecutionPlan('0266', 'simple').coverage_threshold).toBe(60);
        expect(generateExecutionPlan('0266', 'standard').coverage_threshold).toBe(80);
        expect(generateExecutionPlan('0266', 'research').coverage_threshold).toBe(60);
        expect(generateExecutionPlan('0266', 'unit').coverage_threshold).toBe(90);
    });

    test('uses stricter default phase-6 gate criteria for the unit profile', () => {
        const plan = generateExecutionPlan('0266', 'unit');
        expect(plan.phases[0].gateCriteria).toBe('Per-file coverage >= 90%, 100% tests pass');
    });
});

describe('phase profiles', () => {
    test('refine profile runs only phase 1', () => {
        const plan = generateExecutionPlan('0266', 'refine');
        expect(plan.phases).toHaveLength(1);
        expect(plan.phases[0].number).toBe(1);
        expect(plan.phases[0].name).toBe('Request Intake');
        expect(plan.phases[0].inputs).toEqual(['task_ref', 'description?', 'domain_hints?']);
    });

    test('plan profile runs phases 2, 3, 4', () => {
        const plan = generateExecutionPlan('0266', 'plan');
        expect(plan.phases).toHaveLength(3);
        expect(plan.phases.map((p) => p.number)).toEqual([2, 3, 4]);
        expect(plan.phases[0].inputs).toEqual(['task_ref', 'requirements', 'constraints']);
        expect(plan.phases[1].inputs).toEqual(['task_ref', 'architecture', 'requirements']);
        expect(plan.phases[2].inputs).toEqual(['task_ref', 'requirements', 'design?']);
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

describe('phase contract helpers', () => {
    test('allows trailing suffix skips through the exported validator', () => {
        expect(() => validateSkipPhases('complex', [8, 9])).not.toThrow();
    });

    test('rejects non-trailing skips through the exported validator', () => {
        expect(() => validateSkipPhases('complex', [7, 9])).toThrow('Invalid skip-phases for profile "complex"');
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

describe('parseOrchestrationArgs', () => {
    test('parses --undo with valid phase number', () => {
        const result = parseOrchestrationArgs(['0292', '--undo', '5'], validateProfile);
        expect(result).not.toBeNull();
        expect(result?.undo).toBe(5);
    });

    test('rejects --undo with out-of-range phase number', () => {
        expect(() => parseOrchestrationArgs(['0292', '--undo', '11'], validateProfile)).toThrow(
            'Invalid undo phase: 11. Must be 1-9.',
        );
    });

    test('rejects --undo with zero phase number', () => {
        expect(() => parseOrchestrationArgs(['0292', '--undo', '0'], validateProfile)).toThrow(
            'Invalid undo phase: 0. Must be 1-9.',
        );
    });

    test('parses --undo-dry-run flag', () => {
        const result = parseOrchestrationArgs(['0292', '--undo-dry-run'], validateProfile);
        expect(result).not.toBeNull();
        expect(result?.undoDryRun).toBe(true);
    });

    test('parses --undo and --undo-dry-run together', () => {
        const result = parseOrchestrationArgs(['0292', '--undo', '3', '--undo-dry-run'], validateProfile);
        expect(result).not.toBeNull();
        expect(result?.undo).toBe(3);
        expect(result?.undoDryRun).toBe(true);
    });

    test('undo is undefined when --undo is not provided', () => {
        const result = parseOrchestrationArgs(['0292'], validateProfile);
        expect(result).not.toBeNull();
        expect(result?.undo).toBeUndefined();
        expect(result?.undoDryRun).toBe(false);
    });

    test('parses --start-phase with valid phase number', () => {
        const result = parseOrchestrationArgs(['0292', '--start-phase', '5'], validateProfile);
        expect(result).not.toBeNull();
        expect(result?.startPhase).toBe(5);
    });

    test('parses --coverage with valid number', () => {
        const result = parseOrchestrationArgs(['0292', '--coverage', '90'], validateProfile);
        expect(result).not.toBeNull();
        expect(result?.coverageOverride).toBe(90);
    });

    test('parses --stack-profile', () => {
        const result = parseOrchestrationArgs(['0292', '--stack-profile', 'typescript-bun-biome'], validateProfile);
        expect(result).not.toBeNull();
        expect(result?.stackProfile).toBe('typescript-bun-biome');
    });

    test('parses --rework-max-iterations', () => {
        const result = parseOrchestrationArgs(['0292', '--rework-max-iterations', '4'], validateProfile);
        expect(result).not.toBeNull();
        expect(result?.reworkMaxIterations).toBe(4);
    });

    test('rejects invalid --rework-max-iterations values', () => {
        expect(() => parseOrchestrationArgs(['0292', '--rework-max-iterations', '0'], validateProfile)).toThrow(
            'Invalid rework max iterations: 0. Must be >= 1.',
        );
    });
});

describe('createExecutionPlan', () => {
    test('reads task profile from a task file path when no override is provided', () => {
        const tempDir = createTempDir('orchestration-plan-');
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
        expect(plan.execution_channel).toBe('current');
    });

    test('reads task profile from WBS-resolved task files', () => {
        const tempDir = createTempDir('orchestration-wbs-');
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
    });

    test('falls back to standard when the task path does not exist', () => {
        const plan = createExecutionPlan('/tmp/does-not-exist/0266_missing.md');
        expect(plan.profile).toBe('standard');
        expect(plan.task_path).toBeUndefined();
    });

    test('falls back to standard when task frontmatter is missing or lacks profile', () => {
        const tempDir = createTempDir('orchestration-frontmatter-');
        const noFrontmatterPath = join(tempDir, '0266_no_frontmatter.md');
        const noProfilePath = join(tempDir, '0266_no_profile.md');

        writeFileSync(noFrontmatterPath, '## 0266. example\n', 'utf-8');
        writeFileSync(
            noProfilePath,
            `---
name: example
description: example
status: Backlog
created_at: 2026-03-28T00:00:00.000Z
updated_at: 2026-03-28T00:00:00.000Z
---
`,
            'utf-8',
        );

        expect(createExecutionPlan(noFrontmatterPath).profile).toBe('standard');
        expect(createExecutionPlan(noProfilePath).profile).toBe('standard');
    });

    test('falls back to standard when task profile cannot be read from a directory path', () => {
        const tempDir = createTempDir('orchestration-profile-read-');
        const taskDirPath = join(tempDir, '0266_directory.md');
        mkdirSync(taskDirPath, { recursive: true });

        const plan = createExecutionPlan(taskDirPath);

        expect(plan.profile).toBe('standard');
        expect(plan.task_path).toBe(taskDirPath);
    });

    test('surfaces auto, dry-run, refine, and execution-channel flags in the generated plan', () => {
        const plan = createExecutionPlan('0266', {
            profile: 'standard',
            auto: true,
            dryRun: true,
            refine: true,
            executionChannel: 'codex',
        });
        const phase1 = plan.phases.find((phase) => phase.number === 1);

        expect(plan.auto_approve_human_gates).toBe(true);
        expect(plan.dry_run).toBe(true);
        expect(plan.refine_mode).toBe(true);
        expect(plan.execution_channel).toBe('codex');
        expect(phase1?.inputs).toContain('mode=refine');
    });

    test('normalizes execution-channel aliases in the generated plan', () => {
        const plan = createExecutionPlan('0266', {
            profile: 'review',
            executionChannel: 'claude-code',
        });

        expect(plan.execution_channel).toBe('claude');
    });

    test('rejects unknown execution-channel values in the generated plan', () => {
        expect(() => createExecutionPlan('0266', { profile: 'unit', executionChannel: 'unknown-agent' })).toThrow(
            'Unknown execution channel',
        );
    });

    test('supports startPhase in createExecutionPlan', () => {
        const plan = createExecutionPlan('0266', {
            profile: 'complex',
            startPhase: 6,
        });

        expect(plan.phases.map((phase) => phase.number)).toEqual([6, 7, 8, 9]);
    });

    test('rejects refine mode when the selected profile does not include phase 1', () => {
        expect(() => createExecutionPlan('0266', { profile: 'unit', refine: true })).toThrow(
            'Refine mode requires phase 1 to be in the execution plan.',
        );
    });
});

describe('plan main', () => {
    test('generates a plan for valid CLI args', () => {
        expect(() =>
            main(['0266', '--profile', 'complex', '--skip', '8,9', '--auto', '--refine', '--channel', 'codex']),
        ).not.toThrow();
    });

    test('exits with code 1 when task_ref is missing', () => {
        expect(main([])).toBe(1);
    });

    test('exits with code 1 when profile is invalid', () => {
        expect(main(['0266', '--profile', 'invalid'])).toBe(1);
    });

    test('exits with code 1 when skip phases break required dependencies', () => {
        expect(main(['0266', '--profile', 'standard', '--skip-phases', '5'])).toBe(1);
    });

    test('exits with code 1 when start-phase is invalid', () => {
        expect(main(['0266', '--start-phase', '11'])).toBe(1);
    });

    test('exits with code 1 when coverage is invalid', () => {
        expect(main(['0266', '--coverage', '101'])).toBe(1);
    });

    test('uses coverage override in gate criteria and plan output', () => {
        const plan = generateExecutionPlan('0266', 'standard', undefined, [], 90);
        const phase6 = plan.phases.find((phase) => phase.number === 6);

        expect(phase6?.gateCriteria).toContain('90');
        expect(plan.coverage_threshold).toBe(90);
        expect(plan.execution_channel).toBe('current');
    });

    test('phase 8 gate remains hybrid outside the standard profile', () => {
        const plan = generateExecutionPlan('0266', 'complex');
        const phase8 = plan.phases.find((phase) => phase.number === 8);
        expect(phase8?.gate).toBe('auto/human');
    });

    test('parses channel flag through the CLI plan builder', () => {
        const plan = createExecutionPlan('0266', { profile: 'review', executionChannel: 'opencode' });
        expect(plan.execution_channel).toBe('opencode');
    });

    test('normalizes claude-code channel through the CLI plan builder', () => {
        const plan = createExecutionPlan('0266', { profile: 'review', executionChannel: 'claude-code' });
        expect(plan.execution_channel).toBe('claude');
    });

    test('accepts start-phase through the CLI plan builder', () => {
        const plan = createExecutionPlan('0266', { profile: 'complex', startPhase: 7 });
        expect(plan.phases.map((phase) => phase.number)).toEqual([7, 8, 9]);
    });

    test('accepts dry-run through the CLI path', () => {
        expect(() => main(['0266', '--profile', 'unit', '--dry-run'])).not.toThrow();
    });
});

describe('downstream evidence contracts', () => {
    test('defines predictable evidence envelopes for verification-aware skills', () => {
        expect(DOWNSTREAM_EVIDENCE_CONTRACTS['rd3:request-intake'].required_fields).toEqual([
            'background',
            'requirements',
            'constraints',
            'profile',
        ]);
        expect(DOWNSTREAM_EVIDENCE_CONTRACTS['rd3:bdd-workflow'].kind).toBe('bdd-execution-report');
        expect(DOWNSTREAM_EVIDENCE_CONTRACTS['rd3:functional-review'].required_fields).toContain(
            'covered_requirements',
        );
    });

    test('defines worker-phase evidence envelopes for heavy-phase workers', () => {
        expect(DOWNSTREAM_EVIDENCE_CONTRACTS['rd3:super-coder'].kind).toBe('worker-phase-result');
        expect(DOWNSTREAM_EVIDENCE_CONTRACTS['rd3:super-coder'].required_fields).toContain('status');
        expect(DOWNSTREAM_EVIDENCE_CONTRACTS['rd3:super-coder'].required_fields).toContain('artifacts');

        expect(DOWNSTREAM_EVIDENCE_CONTRACTS['rd3:super-tester'].kind).toBe('worker-phase-result');
        expect(DOWNSTREAM_EVIDENCE_CONTRACTS['rd3:super-tester'].required_fields).toContain('evidence_summary');

        expect(DOWNSTREAM_EVIDENCE_CONTRACTS['rd3:super-reviewer'].kind).toBe('worker-phase-result');
        expect(DOWNSTREAM_EVIDENCE_CONTRACTS['rd3:super-reviewer'].required_fields).toContain('findings');
        expect(DOWNSTREAM_EVIDENCE_CONTRACTS['rd3:super-reviewer'].optional_fields).toContain('failed_stage');
    });
});
