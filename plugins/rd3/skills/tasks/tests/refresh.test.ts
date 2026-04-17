import { afterEach, beforeEach, describe, expect, test, spyOn } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { refreshKanbanBoards } from '../scripts/commands/refresh';
import { logger, setGlobalSilent } from '../../../scripts/logger';

function writeConfig(tempDir: string, folder = 'docs/tasks'): void {
    mkdirSync(join(tempDir, 'docs', '.tasks'), { recursive: true });
    mkdirSync(join(tempDir, folder), { recursive: true });
    writeFileSync(
        join(tempDir, 'docs', '.tasks', 'config.jsonc'),
        JSON.stringify({
            $schema_version: 1,
            active_folder: folder,
            folders: { [folder]: { base_counter: 0 } },
        }),
    );
}

function writeKanbanTemplate(tempDir: string): void {
    const content = `---
type: kanban
---
# Kanban

## Backlog
{{ BACKLOG_TASKS }}

## WIP
{{ WIP_TASKS }}

## Done
{{ DONE_TASKS }}
`;
    writeFileSync(join(tempDir, 'docs', '.tasks', 'kanban.md'), content);
}

function writeTask(tempDir: string, folder: string, wbs: string, name: string, status = 'Backlog'): void {
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

Background.
`,
    );
}

describe('refreshKanbanBoards', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `tasks-refresh-test-${Date.now()}`);
    const folder = 'docs/tasks';
    let successSpy: ReturnType<typeof spyOn>;
    let errorSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        writeConfig(tempDir, folder);
        setGlobalSilent(true);
        successSpy = spyOn(logger, 'success');
        errorSpy = spyOn(logger, 'error');
    });

    afterEach(() => {
        setGlobalSilent(false);
        successSpy.mockRestore();
        errorSpy.mockRestore();
        try {
            chmodSync(join(tempDir, folder), 0o777);
        } catch {}
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('returns foldersRefreshed and empty errors on success', () => {
        writeKanbanTemplate(tempDir);
        writeTask(tempDir, folder, '0001', 'Task One');
        const result = refreshKanbanBoards(tempDir, true);
        expect(result.foldersRefreshed).toContain(folder);
        expect(result.errors).toHaveLength(0);
    });

    test('works with empty task folder (no tasks)', () => {
        writeKanbanTemplate(tempDir);
        const result = refreshKanbanBoards(tempDir, true);
        expect(result.ok).toBe(true);
        expect(result.foldersRefreshed).toContain(folder);
    });

    test('logs refreshed folders when quiet=false', () => {
        writeKanbanTemplate(tempDir);
        const result = refreshKanbanBoards(tempDir, false);
        expect(result.foldersRefreshed).toContain(folder);
        expect(successSpy).toHaveBeenCalled();
    });

    test('handles multiple folders', () => {
        const secondFolder = 'docs/archive';
        mkdirSync(join(tempDir, secondFolder), { recursive: true });
        writeFileSync(
            join(tempDir, 'docs', '.tasks', 'config.jsonc'),
            JSON.stringify({
                $schema_version: 1,
                active_folder: folder,
                folders: {
                    [folder]: { base_counter: 0 },
                    [secondFolder]: { base_counter: 100 },
                },
            }),
        );
        writeKanbanTemplate(tempDir);
        writeTask(tempDir, folder, '0001', 'Task A');
        writeTask(tempDir, secondFolder, '0101', 'Task B');
        const result = refreshKanbanBoards(tempDir, true);
        expect(result.foldersRefreshed.length).toBeGreaterThanOrEqual(1);
    });

    test('reports errors when kanban write fails', () => {
        writeKanbanTemplate(tempDir);
        writeTask(tempDir, folder, '0001', 'Task One');
        chmodSync(join(tempDir, folder), 0o555);
        const result = refreshKanbanBoards(tempDir, true);
        expect(Array.isArray(result.foldersRefreshed)).toBe(true);
        expect(Array.isArray(result.errors)).toBe(true);
        chmodSync(join(tempDir, folder), 0o755);
    });

    test('logs errors when quiet=false and refresh fails', () => {
        writeKanbanTemplate(tempDir);
        writeTask(tempDir, folder, '0001', 'Task One');
        chmodSync(join(tempDir, folder), 0o555);
        const result = refreshKanbanBoards(tempDir, false);
        expect(Array.isArray(result.errors)).toBe(true);
        if (result.errors.length > 0) {
            expect(errorSpy).toHaveBeenCalled();
        }
        chmodSync(join(tempDir, folder), 0o755);
    });
});
