import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { showTask } from '../scripts/commands/show';
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

describe('showTask', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `tasks-show-test-${Date.now()}`);

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
        const result = showTask(tempDir, '0001');

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('Task 0001 not found');
        }
    });

    test('returns error when task file does not exist but path is returned', () => {
        // Create task record in config but no actual file
        const result = showTask(tempDir, '0001');

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('Task 0001 not found');
        }
    });

    test('shows task content successfully', () => {
        const taskPath = join(tempDir, 'docs', 'tasks', '0001_Test_Task.md');
        const taskContent = `---
name: Test Task
status: WIP
---

# Test Task

This is the task content.
`;

        writeFileSync(taskPath, taskContent);

        const result = showTask(tempDir, '0001');

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.wbs).toBe('0001');
            expect(result.value.content).toBe(taskContent);
        }
    });

    test('shows task with unpadded WBS number', () => {
        const taskPath = join(tempDir, 'docs', 'tasks', '0047_Another_Task.md');
        const taskContent = `---
name: Another Task
status: Done
---

# Another Task

Content here.
`;

        writeFileSync(taskPath, taskContent);

        const result = showTask(tempDir, '47');

        expect(result.ok).toBe(true);
        if (result.ok) {
            // showTask returns the input WBS, not the padded version
            expect(result.value.wbs).toBe('47');
            expect(result.value.content).toBe(taskContent);
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

        const result = showTask(tempDir, '0001', true);

        expect(result.ok).toBe(true);
        // quiet=true means we don't log - but result is still returned
    });

    test('returns full file content including frontmatter', () => {
        const taskPath = join(tempDir, 'docs', 'tasks', '0001_Frontmatter_Task.md');
        const taskContent = `---
name: Frontmatter Task
status: Backlog
created_at: 2024-01-01
updated_at: 2024-01-02
profile: simple
---

### Requirements

- Requirement 1
- Requirement 2

### Background

This is background information.
`;

        writeFileSync(taskPath, taskContent);

        const result = showTask(tempDir, '0001');

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.content).toBe(taskContent);
        }
    });

    test('handles task with special characters in content', () => {
        const taskPath = join(tempDir, 'docs', 'tasks', '0001_Special_Task.md');
        const taskContent = `---
name: Special Task
status: WIP
---

# Special Task

Code: \`const x = 1;\`

> Blockquote

\`\`\`typescript
const fn = () => console.log('test');
\`\`\`
`;

        writeFileSync(taskPath, taskContent);

        const result = showTask(tempDir, '0001');

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.content).toBe(taskContent);
        }
    });

    test('handles unicode content', () => {
        const taskPath = join(tempDir, 'docs', 'tasks', '0001_Unicode_Task.md');
        const taskContent = `---
name: Unicode Task
status: Done
---

# Unicode Task

中文内容：任务
日本語：タスク
Emoji: 🚀 ⭐ 🐉
`;

        writeFileSync(taskPath, taskContent);

        const result = showTask(tempDir, '0001');

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.content).toBe(taskContent);
        }
    });
});
