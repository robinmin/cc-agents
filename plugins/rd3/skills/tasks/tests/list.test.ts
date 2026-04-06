import { afterEach, beforeEach, describe, expect, test, spyOn } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listTasks } from '../scripts/commands/list';
import type { Err } from '../scripts/lib/result';
import { logger, setGlobalSilent } from '../../../scripts/logger';

function writeConfig(tempDir: string, active = 'docs/tasks'): void {
    mkdirSync(join(tempDir, 'docs', '.tasks'), { recursive: true });
    mkdirSync(join(tempDir, active), { recursive: true });
    writeFileSync(
        join(tempDir, 'docs', '.tasks', 'config.jsonc'),
        JSON.stringify({
            $schema_version: 1,
            active_folder: active,
            folders: {
                [active]: { base_counter: 0, label: active },
            },
        }),
    );
}

function writeTask(tempDir: string, folder: string, wbs: string, status = 'Backlog', name = 'Test Task'): void {
    writeFileSync(
        join(tempDir, folder, `${wbs}_${name.replace(/\s+/g, '_')}.md`),
        `---
wbs: "${wbs}"
name: "${name}"
status: ${status}
type: task
created_at: 2026-01-01T00:00:00Z
---

## Background
`,
    );
}

describe('listTasks', () => {
    let tempDir: string;
    const folder = 'docs/tasks';
    let logSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        tempDir = mkdtempSync(join(tmpdir(), 'tasks-list-test-'));
        writeConfig(tempDir, folder);
        setGlobalSilent(true);
        logSpy = spyOn(logger, 'log');
    });

    afterEach(() => {
        setGlobalSilent(false);
        logSpy.mockRestore();
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('lists all tasks in the active folder', () => {
        writeTask(tempDir, folder, '0001', 'Backlog');
        writeTask(tempDir, folder, '0002', 'Done');

        const result = listTasks(tempDir, undefined, undefined, false, true);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value).toHaveLength(2);
            expect(result.value.map((t) => t.wbs)).toEqual(['0001', '0002']);
        }
    });

    test('filters tasks by status', () => {
        writeTask(tempDir, folder, '0001', 'Backlog');
        writeTask(tempDir, folder, '0002', 'Done');

        const result = listTasks(tempDir, undefined, 'Done', false, true);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value).toHaveLength(1);
            expect(result.value[0].wbs).toBe('0002');
        }
    });

    test('renders board without template fallback', () => {
        const result = listTasks(tempDir, undefined, undefined, false, false);
        expect(result.ok).toBe(true);
        // Logger.log is called via displayMarkdown when not quiet
        expect(logSpy).toHaveBeenCalled();
    });

    test('renders kanban using template', () => {
        writeFileSync(
            join(tempDir, 'docs', '.tasks', 'kanban.md'),
            `---
type: kanban
---
# Kanban {{ PHASE_LABEL }}

## Queue
{{ BACKLOG_TASKS }}
{{ WIP_TASKS }}
{{ TESTING_TASKS }}
{{ CANCELED_TASKS }}
{{ DONE_TASKS }}
`,
        );
        writeTask(tempDir, folder, '0001', 'Backlog');
        writeTask(tempDir, folder, '0002', 'WIP');
        writeTask(tempDir, folder, '0003', 'Testing');
        writeTask(tempDir, folder, '0004', 'Done');
        writeTask(tempDir, folder, '0005', 'Canceled');

        const result = listTasks(tempDir, undefined, undefined, false, false);
        expect(result.ok).toBe(true);
        // Output goes through displayMarkdown which calls logger.log
        expect(logSpy).toHaveBeenCalled();
    });

    test('returns err if folder does not exist', () => {
        const result = listTasks(tempDir, 'docs/nonexistent', undefined, false, true);
        expect(result.ok).toBe(false);
        expect((result as Err<string>).error).toContain('does not exist');
    });

    test('returns err if no configured folders exist', () => {
        rmSync(join(tempDir, folder), { recursive: true, force: true });
        const result = listTasks(tempDir, undefined, undefined, false, false);
        expect(result.ok).toBe(false);
        expect((result as Err<string>).error).toContain('does not exist');
    });

    test('lists from multiple folders when includeAll=true', () => {
        const folder2 = 'docs/prompts';
        mkdirSync(join(tempDir, folder2), { recursive: true });
        writeFileSync(
            join(tempDir, 'docs', '.tasks', 'config.jsonc'),
            JSON.stringify({
                $schema_version: 1,
                active_folder: folder,
                folders: {
                    [folder]: { base_counter: 0 },
                    [folder2]: { base_counter: 100 },
                },
            }),
        );
        writeTask(tempDir, folder, '0001');
        writeTask(tempDir, folder2, '0101');

        const result = listTasks(tempDir, undefined, undefined, true, true);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value).toHaveLength(2);
        }
    });
});
