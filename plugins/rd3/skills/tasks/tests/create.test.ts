import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTask } from '../scripts/commands/create';
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
        expect(content).toContain('priority: "high"');
        expect(content).toContain('estimated_hours: 6');
        expect(content).toContain('dependencies: ["0001","0002"]');
        expect(content).toContain('tags: ["planning","workflow-core"]');
        expect(content).toContain('### Requirements\n\n- Requirement A\n- Requirement B');
        expect(content).toContain('### Solution\n\nImplement the core flow and verify it with tests.');
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
});
