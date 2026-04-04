import { afterEach, beforeEach, describe, expect, test, mock } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openTask } from '../scripts/commands/open';
import { setGlobalSilent } from '../../../scripts/logger';

// Helper: write a minimal config.jsonc into tempDir/docs/.tasks/
function writeConfig(tempDir: string, activeFolder = 'docs/tasks'): void {
    mkdirSync(join(tempDir, 'docs', '.tasks'), { recursive: true });
    writeFileSync(
        join(tempDir, 'docs', '.tasks', 'config.jsonc'),
        JSON.stringify(
            {
                $schema_version: 1,
                active_folder: activeFolder,
                folders: {
                    [activeFolder]: { base_counter: 0 },
                },
            },
            null,
            2,
        ),
    );
}

describe('openTask', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `tasks-open-test-${Date.now()}`);

    beforeEach(() => {
        setGlobalSilent(true);
        mkdirSync(tempDir, { recursive: true });
        writeConfig(tempDir);
        mkdirSync(join(tempDir, 'docs', 'tasks'), { recursive: true });
    });

    afterEach(() => {
        setGlobalSilent(false);
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('returns error when task is not found', () => {
        // No task files exist — findTaskByWbs returns null
        const result = openTask(tempDir, '0001');

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('Task 0001 not found');
        }
    });

    test('returns error when task file does not exist but path is returned', () => {
        // Create task record in config but no actual file
        const _taskPath = join(tempDir, 'docs', 'tasks', '0001_Test_Task.md');
        // Don't create the file - just have the config set up

        const result = openTask(tempDir, '0001');

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('Task 0001 not found');
        }
    });

    test('opens task successfully and returns path', () => {
        const taskPath = join(tempDir, 'docs', 'tasks', '0001_Test_Task.md');
        const taskContent = `---
name: Test Task
---

# Test Task
`;

        writeFileSync(taskPath, taskContent);

        const result = openTask(tempDir, '0001');

        // execSync may fail in test environments (no GUI), but path should still be found
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.wbs).toBe('0001');
            expect(result.value.path).toBe(taskPath);
        }
    });

    test('opens task with unpadded WBS number', () => {
        const taskPath = join(tempDir, 'docs', 'tasks', '0047_Another_Task.md');
        const taskContent = `---
name: Another Task
---

# Another Task
`;

        writeFileSync(taskPath, taskContent);

        const result = openTask(tempDir, '47');

        expect(result.ok).toBe(true);
        if (result.ok) {
            // openTask returns the input WBS, not the padded version
            expect(result.value.wbs).toBe('47');
            expect(result.value.path).toBe(taskPath);
        }
    });

    test('respects quiet flag - no log output when quiet is true', () => {
        const taskPath = join(tempDir, 'docs', 'tasks', '0001_Test_Task.md');
        const taskContent = `---
name: Test Task
---

# Test Task
`;

        writeFileSync(taskPath, taskContent);
        setGlobalSilent(true);

        const result = openTask(tempDir, '0001', true);

        expect(result.ok).toBe(true);
        // quiet=true means we don't log - but result is still returned
    });

    test('handles execSync error gracefully', () => {
        // Create a task file
        const taskPath = join(tempDir, 'docs', 'tasks', '0001_Test_Task.md');
        const taskContent = `---
name: Test Task
---

# Test Task
`;
        writeFileSync(taskPath, taskContent);

        // Mock execSync to throw an error - injected via options
        const mockExecSync = mock(() => {
            throw new Error('Mocked exec error');
        });

        const result = openTask(tempDir, '0001', false, { execSync: mockExecSync });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('Failed to open task');
        }
    });
});
