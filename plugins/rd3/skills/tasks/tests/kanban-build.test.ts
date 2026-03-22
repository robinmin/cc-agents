import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildKanbanFromFolder, refreshKanban } from '../scripts/lib/kanban';
import type { TasksConfig } from '../scripts/types';

describe('buildKanbanFromFolder', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `kanban-build-test-${Date.now()}`);

    beforeEach(() => {
        mkdirSync(join(tempDir, 'docs', 'tasks'), { recursive: true });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('returns empty columns for non-existent folder', () => {
        const columns = buildKanbanFromFolder('nonexistent', tempDir);
        expect(columns).toHaveLength(6);
        for (const col of columns) {
            expect(col.tasks).toHaveLength(0);
        }
    });

    test('builds columns from task files', () => {
        writeFileSync(
            join(tempDir, 'docs', 'tasks', '0047_my-task.md'),
            `---
name: My Task
status: Todo
---

### Background
`,
        );
        const columns = buildKanbanFromFolder('docs/tasks', tempDir);
        const todoCol = columns.find((c) => c.status === 'Todo');
        expect(todoCol).toBeTruthy();
        expect(todoCol?.tasks).toHaveLength(1);
        expect(todoCol?.tasks[0]?.wbs).toBe('0047');
    });

    test('skips kanban.md files', () => {
        writeFileSync(join(tempDir, 'docs', 'tasks', 'kanban.md'), '# Kanban');
        writeFileSync(
            join(tempDir, 'docs', 'tasks', '0047_my-task.md'),
            `---
name: My Task
status: Todo
---

### Background
`,
        );
        const columns = buildKanbanFromFolder('docs/tasks', tempDir);
        const todoCol = columns.find((c) => c.status === 'Todo');
        expect(todoCol?.tasks).toHaveLength(1);
    });

    test('skips files without valid frontmatter', () => {
        writeFileSync(join(tempDir, 'docs', 'tasks', '0047_no-frontmatter.md'), 'No frontmatter');
        const columns = buildKanbanFromFolder('docs/tasks', tempDir);
        const backlogCol = columns.find((c) => c.status === 'Backlog');
        expect(backlogCol?.tasks).toHaveLength(0);
    });

    test('skips files with invalid status', () => {
        writeFileSync(
            join(tempDir, 'docs', 'tasks', '0047_bad-status.md'),
            `---
name: Bad Status
status: UnknownStatus
---

### Background
`,
        );
        const columns = buildKanbanFromFolder('docs/tasks', tempDir);
        const backlogCol = columns.find((c) => c.status === 'Backlog');
        // All 6 valid statuses are represented in columns; UnknownStatus is not in KANBAN_STATUS_ORDER
        expect(backlogCol?.tasks).toHaveLength(0);
    });

    test('uses Done checkbox for Done tasks', () => {
        writeFileSync(
            join(tempDir, 'docs', 'tasks', '0047_done-task.md'),
            `---
name: Done Task
status: Done
---

### Background
`,
        );
        const columns = buildKanbanFromFolder('docs/tasks', tempDir);
        const doneCol = columns.find((c) => c.status === 'Done');
        expect(doneCol?.tasks[0]?.checkbox).toBe('[x]');
    });

    test('uses WIP/Testing checkbox for WIP tasks', () => {
        writeFileSync(
            join(tempDir, 'docs', 'tasks', '0048_wip-task.md'),
            `---
name: WIP Task
status: WIP
---

### Background
`,
        );
        const columns = buildKanbanFromFolder('docs/tasks', tempDir);
        const wipCol = columns.find((c) => c.status === 'WIP');
        expect(wipCol?.tasks[0]?.checkbox).toBe('[.]');
    });

    test('builds progress notes for WIP and Testing tasks', () => {
        writeFileSync(
            join(tempDir, 'docs', 'tasks', '0050_progress-task.md'),
            `---
name: Progress Task
status: WIP
impl_progress:
planning: completed
design: pending
implementation: in_progress
review: pending
testing: pending
---

### Background
`,
        );
        writeFileSync(
            join(tempDir, 'docs', 'tasks', '0051_testing-task.md'),
            `---
name: Testing Task
status: Testing
impl_progress:
planning: completed
design: completed
implementation: completed
review: completed
testing: in_progress
---

### Background
`,
        );

        const columns = buildKanbanFromFolder('docs/tasks', tempDir);
        const wipCol = columns.find((c) => c.status === 'WIP');
        const testingCol = columns.find((c) => c.status === 'Testing');

        expect(wipCol?.tasks[0]?.progressNote).toBe('[🟡 plan 🔬 impl]');
        expect(testingCol?.tasks[0]?.progressNote).toContain('🔬 test');
    });

    test('uses empty checkbox for other statuses', () => {
        writeFileSync(
            join(tempDir, 'docs', 'tasks', '0049_todo-task.md'),
            `---
name: Todo Task
status: Todo
---

### Background
`,
        );
        const columns = buildKanbanFromFolder('docs/tasks', tempDir);
        const todoCol = columns.find((c) => c.status === 'Todo');
        expect(todoCol?.tasks[0]?.checkbox).toBe('[ ]');
    });
});

describe('refreshKanban', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `kanban-refresh-test-${Date.now()}`);

    beforeEach(() => {
        mkdirSync(join(tempDir, 'docs', 'tasks'), { recursive: true });
        mkdirSync(join(tempDir, 'docs', 'prompts'), { recursive: true });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('refreshes kanban for configured folders', () => {
        writeFileSync(
            join(tempDir, 'docs', 'tasks', '0047_task.md'),
            `---
name: Task
status: Todo
---

### Background
`,
        );
        const config: TasksConfig = {
            $schema_version: 1,
            folders: {
                'docs/tasks': { base_counter: 0 },
                'docs/prompts': { base_counter: 100 },
            },
            active_folder: 'docs/tasks',
        };
        const result = refreshKanban(tempDir, config);
        expect(result.ok).toBe(true);
        expect(result.foldersRefreshed).toContain('docs/tasks');
        expect(result.foldersRefreshed).toContain('docs/prompts');
    });

    test('writes kanban.md to each folder', () => {
        writeFileSync(
            join(tempDir, 'docs', 'tasks', '0047_my-task.md'),
            `---
name: My Task
status: Todo
---

### Background
`,
        );
        const config: TasksConfig = {
            $schema_version: 1,
            folders: { 'docs/tasks': { base_counter: 0 } },
            active_folder: 'docs/tasks',
        };
        refreshKanban(tempDir, config);
        const kanbanPath = join(tempDir, 'docs', 'tasks', 'kanban.md');
        const content = readFileSync(kanbanPath, 'utf-8');
        expect(content).toContain('Kanban Board');
        expect(content).toContain('0047_My_Task');
    });

    test('collects errors for non-existent folders', () => {
        const config: TasksConfig = {
            $schema_version: 1,
            folders: { nonexistent: { base_counter: 0 } },
            active_folder: 'nonexistent',
        };
        const result = refreshKanban(tempDir, config);
        expect(result.ok).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('nonexistent');
    });
});
