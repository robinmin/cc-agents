import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
    chmodSync,
    existsSync,
    mkdirSync,
    openSync,
    readFileSync,
    rmSync,
    unlinkSync,
    utimesSync,
    writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import {
    acquireCreateLock,
    createTask,
    getErrorCode,
    isStaleLock,
    sanitizeTaskFileNameSegment,
    releaseCreateLock,
    renderFrontmatterValue,
    replaceSectionContent,
    sleepSync,
    upsertFrontmatterField,
} from '../scripts/commands/create';
import { setGlobalSilent } from '../../../scripts/logger';

describe('createTask', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `tasks-create-test-${Date.now()}`);

    beforeEach(() => {
        mkdirSync(join(tempDir, 'docs', '.tasks'), { recursive: true });
        setGlobalSilent(true);
    });

    afterEach(() => {
        setGlobalSilent(false);
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('creates the target folder on demand and falls back to the built-in template', () => {
        writeFileSync(
            join(tempDir, 'docs', '.tasks', 'config.jsonc'),
            JSON.stringify(
                {
                    $schema_version: 1,
                    active_folder: 'docs/tasks/nested',
                    folders: {
                        'docs/tasks/nested': { base_counter: 0 },
                    },
                },
                null,
                2,
            ),
        );

        const result = createTask(tempDir, 'Fallback Template');
        expect(result.ok).toBe(true);

        const taskPath = join(tempDir, 'docs', 'tasks', 'nested', '0001_Fallback_Template.md');
        const content = readFileSync(taskPath, 'utf-8');
        expect(content).toContain('name: Fallback Template');
        expect(content).toContain('folder: docs/tasks/nested');
    });

    test('overrides the Background section when background content is provided', () => {
        writeFileSync(
            join(tempDir, 'docs', '.tasks', 'config.jsonc'),
            JSON.stringify(
                {
                    $schema_version: 1,
                    active_folder: 'docs/tasks',
                    folders: {
                        'docs/tasks': { base_counter: 0 },
                    },
                },
                null,
                2,
            ),
        );
        writeFileSync(
            join(tempDir, 'docs', '.tasks', 'template.md'),
            `---
name: {{ PROMPT_NAME }}
description: {{ DESCRIPTION }}
status: Backlog
created_at: {{ CREATED_AT }}
updated_at: {{ UPDATED_AT }}
folder: {{ FOLDER }}
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

### Background

[Context and motivation — why this task exists]

### Requirements

[What needs to be done — acceptance criteria]
`,
        );

        const result = createTask(tempDir, 'Background Override', undefined, {
            background: 'Specific background content.',
            quiet: true,
        });
        expect(result.ok).toBe(true);

        const content = readFileSync(join(tempDir, 'docs', 'tasks', '0001_Background_Override.md'), 'utf-8');
        expect(content).toContain('### Background\n\nSpecific background content.');
    });

    test('persists structured planning fields when richer creation content is provided', () => {
        writeFileSync(
            join(tempDir, 'docs', '.tasks', 'config.jsonc'),
            JSON.stringify(
                {
                    $schema_version: 1,
                    active_folder: 'docs/tasks',
                    folders: {
                        'docs/tasks': { base_counter: 0 },
                    },
                },
                null,
                2,
            ),
        );

        const result = createTask(tempDir, 'Rich Metadata', undefined, {
            background: 'Why the work exists.',
            requirements: '- Requirement A\n- Requirement B',
            solution: 'Implement the core flow and verify it with tests.',
            priority: 'high',
            estimatedHours: 6,
            dependencies: ['0001', '0002'],
            tags: ['planning', 'workflow-core'],
            quiet: true,
        });
        expect(result.ok).toBe(true);

        const content = readFileSync(join(tempDir, 'docs', 'tasks', '0001_Rich_Metadata.md'), 'utf-8');
        expect(content).toContain('priority: high');
        expect(content).toContain('estimated_hours: 6');
        expect(content).toContain('dependencies: ["0001","0002"]');
        expect(content).toContain('tags: ["planning","workflow-core"]');
        expect(content).toContain('### Requirements\n\n- Requirement A\n- Requirement B');
        expect(content).toContain('### Solution\n\nImplement the core flow and verify it with tests.');
    });

    test('sanitizes task names before deriving the output file path', () => {
        writeFileSync(
            join(tempDir, 'docs', '.tasks', 'config.jsonc'),
            JSON.stringify(
                {
                    $schema_version: 1,
                    active_folder: 'docs/tasks',
                    folders: {
                        'docs/tasks': { base_counter: 0 },
                    },
                },
                null,
                2,
            ),
        );

        const result = createTask(tempDir, '../../../notes', undefined, { quiet: true });
        expect(result.ok).toBe(true);

        const escapedPath = join(tempDir, 'notes.md');
        expect(existsSync(escapedPath)).toBe(false);
        if (result.ok) {
            expect(result.value.path).toBe(join(tempDir, 'docs', 'tasks', '0001_.._.._.._notes.md'));
        }
    });

    test('returns an error when the configured task folder is not writable as a directory', () => {
        writeFileSync(
            join(tempDir, 'docs', '.tasks', 'config.jsonc'),
            JSON.stringify(
                {
                    $schema_version: 1,
                    active_folder: 'docs/tasks',
                    folders: {
                        'docs/tasks': { base_counter: 0 },
                    },
                },
                null,
                2,
            ),
        );
        mkdirSync(join(tempDir, 'docs', 'tasks'), { recursive: true });
        chmodSync(join(tempDir, 'docs', 'tasks'), 0o555);

        const result = createTask(tempDir, 'Write Failure', undefined, { quiet: true });
        chmodSync(join(tempDir, 'docs', 'tasks'), 0o755);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('Failed to write task file');
        }
    });

    test('returns an error when the lock file cannot be created in the meta directory', () => {
        writeFileSync(
            join(tempDir, 'docs', '.tasks', 'config.jsonc'),
            JSON.stringify(
                {
                    $schema_version: 1,
                    active_folder: 'docs/tasks',
                    folders: {
                        'docs/tasks': { base_counter: 0 },
                    },
                },
                null,
                2,
            ),
        );

        chmodSync(join(tempDir, 'docs', '.tasks'), 0o555);
        const result = createTask(tempDir, 'Lock Failure', undefined, { quiet: true });
        chmodSync(join(tempDir, 'docs', '.tasks'), 0o755);

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('Failed to acquire task creation lock');
        }
    });

    test('persists profile field when provided during task creation', () => {
        writeFileSync(
            join(tempDir, 'docs', '.tasks', 'config.jsonc'),
            JSON.stringify(
                {
                    $schema_version: 1,
                    active_folder: 'docs/tasks',
                    folders: {
                        'docs/tasks': { base_counter: 0 },
                    },
                },
                null,
                2,
            ),
        );

        const result = createTask(tempDir, 'Profile Test', undefined, {
            profile: 'complex',
            quiet: true,
        });
        expect(result.ok).toBe(true);

        const content = readFileSync(join(tempDir, 'docs', 'tasks', '0001_Profile_Test.md'), 'utf-8');
        expect(content).toContain('preset: complex');
        expect(content).not.toContain('profile: ');
    });

    test('persists feature-id when provided during task creation', () => {
        writeFileSync(
            join(tempDir, 'docs', '.tasks', 'config.jsonc'),
            JSON.stringify(
                {
                    $schema_version: 1,
                    active_folder: 'docs/tasks',
                    folders: {
                        'docs/tasks': { base_counter: 0 },
                    },
                },
                null,
                2,
            ),
        );

        const result = createTask(tempDir, 'Feature Linked Task', undefined, {
            featureId: 'feat_auth_google_oauth',
            quiet: true,
        });
        expect(result.ok).toBe(true);

        const content = readFileSync(join(tempDir, 'docs', 'tasks', '0001_Feature_Linked_Task.md'), 'utf-8');
        expect(content).toContain('feature-id: feat_auth_google_oauth');
    });

    test('accepts all valid preset values during task creation', () => {
        writeFileSync(
            join(tempDir, 'docs', '.tasks', 'config.jsonc'),
            JSON.stringify(
                {
                    $schema_version: 1,
                    active_folder: 'docs/tasks',
                    folders: {
                        'docs/tasks': { base_counter: 0 },
                    },
                },
                null,
                2,
            ),
        );

        for (const profileVal of [
            'simple',
            'standard',
            'complex',
            'research',
            'refine',
            'plan',
            'unit',
            'review',
            'review-only',
            'docs',
            'docs-only',
        ]) {
            const result = createTask(tempDir, `Profile ${profileVal}`, undefined, {
                profile: profileVal,
                quiet: true,
            });
            expect(result.ok).toBe(true);
            const content = readFileSync(join(tempDir, 'docs', 'tasks', `0001_Profile_${profileVal}.md`), 'utf-8');
            expect(content).toContain(`preset: ${profileVal}`);
            expect(content).not.toContain('profile: ');
            // Clean up for next iteration
            rmSync(join(tempDir, 'docs', 'tasks', `0001_Profile_${profileVal}.md`), { force: true });
        }
    });

    test('backward compatible - tasks without preset remain valid', () => {
        writeFileSync(
            join(tempDir, 'docs', '.tasks', 'config.jsonc'),
            JSON.stringify(
                {
                    $schema_version: 1,
                    active_folder: 'docs/tasks',
                    folders: {
                        'docs/tasks': { base_counter: 0 },
                    },
                },
                null,
                2,
            ),
        );

        const result = createTask(tempDir, 'No Profile', undefined, {
            quiet: true,
        });
        expect(result.ok).toBe(true);

        const content = readFileSync(join(tempDir, 'docs', 'tasks', '0001_No_Profile.md'), 'utf-8');
        // Orchestration preset should not be present when not specified.
        expect(content).not.toContain('profile:');
    });

    test('rejects invalid preset values', () => {
        writeFileSync(
            join(tempDir, 'docs', '.tasks', 'config.jsonc'),
            JSON.stringify(
                {
                    $schema_version: 1,
                    active_folder: 'docs/tasks',
                    folders: {
                        'docs/tasks': { base_counter: 0 },
                    },
                },
                null,
                2,
            ),
        );

        const result = createTask(tempDir, 'Bad Profile', undefined, {
            profile: 'invalid',
            quiet: true,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('Invalid preset');
        }
    });

    test('acquireCreateLock reclaims stale lock files', () => {
        const lockPath = join(tempDir, 'docs', '.tasks', '.create-task.lock');
        writeFileSync(lockPath, '');
        utimesSync(lockPath, new Date(0), new Date(0));

        const result = acquireCreateLock(lockPath, { timeoutMs: 20, retryMs: 0, staleMs: 1 });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(existsSync(lockPath)).toBe(true);
            releaseCreateLock(lockPath, result.value);
        }
        expect(existsSync(lockPath)).toBe(false);
    });

    test('acquireCreateLock times out while active lock remains fresh', () => {
        const lockPath = join(tempDir, 'docs', '.tasks', '.create-task.lock');
        writeFileSync(lockPath, '');

        const result = acquireCreateLock(lockPath, { timeoutMs: 5, retryMs: 1, staleMs: 60_000 });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('Timed out acquiring task creation lock');
        }
    });

    test('releaseCreateLock tolerates missing lock file and throws on unexpected unlink errors', () => {
        const lockPath = join(tempDir, 'docs', '.tasks', '.create-task.lock');
        const lockResult = acquireCreateLock(lockPath, { timeoutMs: 20, retryMs: 0 });
        expect(lockResult.ok).toBe(true);
        if (lockResult.ok) {
            unlinkSync(lockPath);
            expect(() => releaseCreateLock(lockPath, lockResult.value)).not.toThrow();
        }

        const tempFile = join(tempDir, 'fd-only.tmp');
        writeFileSync(tempFile, 'fd');
        const fd = openSync(tempFile, 'r');
        expect(() => releaseCreateLock('/dev/null/create-task.lock', fd)).toThrow();
    });

    test('helper utilities cover fallback branches and frontmatter insertion behavior', () => {
        const missingSection = replaceSectionContent('### Requirements\n\nCurrent\n', 'Background', 'Ignored');
        expect(missingSection).toBe('### Requirements\n\nCurrent\n');

        const unchanged = upsertFrontmatterField('---\nname: test\n---\n', 'profile', undefined);
        expect(unchanged).toBe('---\nname: test\n---\n');

        const replaced = upsertFrontmatterField('---\npriority: low\n---\n', 'priority', 'high');
        expect(replaced).toContain('priority: high');

        const insertedBeforeProgress = upsertFrontmatterField(
            '---\nname: test\nimpl_progress:\n  planning: pending\n---\n',
            'tags',
            ['rd3'],
        );
        expect(insertedBeforeProgress).toContain('tags: ["rd3"]\nimpl_progress:');

        const insertedBeforeClose = upsertFrontmatterField('---\nname: test\n---\n', 'estimated_hours', 3);
        expect(insertedBeforeClose).toContain('estimated_hours: 3\n---');

        expect(renderFrontmatterValue('value')).toBe('value');
        expect(renderFrontmatterValue(7)).toBe('7');
        expect(renderFrontmatterValue(['a', 'b'])).toBe('["a","b"]');
        expect(sanitizeTaskFileNameSegment(' foo/../../bar "; ')).toBe('foo_.._.._bar');

        expect(getErrorCode({ code: 'ENOENT' })).toBe('ENOENT');
        expect(getErrorCode('oops')).toBeUndefined();
    });

    test('stale-lock detection and sleep helper behave as expected', () => {
        const stalePath = join(tempDir, 'docs', '.tasks', 'stale.lock');
        expect(isStaleLock(stalePath)).toBe(true);

        writeFileSync(stalePath, '');
        expect(isStaleLock(stalePath, 60_000)).toBe(false);
        utimesSync(stalePath, new Date(0), new Date(0));
        expect(isStaleLock(stalePath, 1)).toBe(true);

        const startedAt = Date.now();
        sleepSync(5);
        expect(Date.now() - startedAt).toBeGreaterThanOrEqual(0);
    });
});
