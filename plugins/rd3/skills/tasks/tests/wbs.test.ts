import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { getNextWbs, formatWbs, findTaskByWbs } from "../scripts/lib/wbs";
import type { TasksConfig } from "../scripts/types";

function makeConfig(tempDir: string): TasksConfig {
    return {
        $schema_version: 1,
        folders: {
            [tempDir]: { base_counter: 0, label: 'test' },
        },
        active_folder: tempDir,
    };
}

describe('WBS utilities', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `wbs-test-${Date.now()}`);

    beforeEach(() => {
        mkdirSync(tempDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    describe('formatWbs', () => {
        test('pads single digit', () => {
            expect(formatWbs(1)).toBe('0001');
        });
        test('pads double digits', () => {
            expect(formatWbs(47)).toBe('0047');
        });
        test('does not pad 4+ digits', () => {
            expect(formatWbs(1234)).toBe('1234');
        });
        test('handles zero', () => {
            expect(formatWbs(0)).toBe('0000');
        });
    });

    describe('getNextWbs', () => {
        test('returns 1 for empty folder', () => {
            const config = makeConfig(tempDir);
            expect(getNextWbs(config, '/')).toBe(1);
        });

        test('returns max + 1 for existing tasks', () => {
            writeFileSync(join(tempDir, '0003_task-a.md'), '---\nname: a\nstatus: Backlog\n---');
            writeFileSync(join(tempDir, '0007_task-b.md'), '---\nname: b\nstatus: Backlog\n---');
            const config = makeConfig(tempDir);
            expect(getNextWbs(config, '/')).toBe(8);
        });

        test('respects base_counter as floor', () => {
            const config: TasksConfig = {
                $schema_version: 1,
                folders: { [tempDir]: { base_counter: 100, label: 'test' } },
                active_folder: tempDir,
            };
            writeFileSync(join(tempDir, '0020_task.md'), '---\nname: x\nstatus: Backlog\n---');
            expect(getNextWbs(config, '/')).toBe(101);
        });

        test('skips non-markdown files', () => {
            writeFileSync(join(tempDir, '0003_task.md'), '---\nname: a\nstatus: Backlog\n---');
            writeFileSync(join(tempDir, 'data.json'), '{}');
            const config = makeConfig(tempDir);
            expect(getNextWbs(config, '/')).toBe(4);
        });
    });

    describe('findTaskByWbs', () => {
        test('finds task by full WBS', () => {
            writeFileSync(join(tempDir, '0047_my-task.md'), '---\nname: My Task\nstatus: Todo\n---');
            const config = makeConfig(tempDir);
            const found = findTaskByWbs('0047', config, '/');
            expect(found).not.toBeNull();
            expect(found?.endsWith('0047_my-task.md')).toBe(true);
        });

        test('finds task by un-padded WBS', () => {
            writeFileSync(join(tempDir, '0047_my-task.md'), '---\nname: My Task\nstatus: Todo\n---');
            const config = makeConfig(tempDir);
            const found = findTaskByWbs('47', config, '/');
            expect(found).not.toBeNull();
        });

        test('returns null for non-existent WBS', () => {
            const config = makeConfig(tempDir);
            expect(findTaskByWbs('9999', config, '/')).toBeNull();
        });

        test('searches across multiple folders', () => {
            const tempDir2 = join(Bun.env.TEMP_DIR ?? '/tmp', `wbs-test2-${Date.now()}`);
            mkdirSync(tempDir2, { recursive: true });
            writeFileSync(join(tempDir, '0010_task-a.md'), '---\nname: a\nstatus: Backlog\n---');
            writeFileSync(join(tempDir2, '0050_task-b.md'), '---\nname: b\nstatus: Backlog\n---');
            const config: TasksConfig = {
                $schema_version: 1,
                folders: {
                    [tempDir]: { base_counter: 0, label: 'test1' },
                    [tempDir2]: { base_counter: 0, label: 'test2' },
                },
                active_folder: tempDir,
            };
            expect(findTaskByWbs('50', config, '/')).not.toBeNull();
            rmSync(tempDir2, { recursive: true, force: true });
        });
    });
});
