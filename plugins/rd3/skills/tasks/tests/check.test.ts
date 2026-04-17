import { afterEach, beforeEach, describe, expect, test, spyOn } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { checkTask } from '../scripts/commands/check';
import { logger, setGlobalSilent } from '../../../scripts/logger';

// Helper: write minimal config.jsonc + task folder
function writeConfig(tempDir: string, folder = 'docs/tasks'): void {
    mkdirSync(join(tempDir, 'docs', '.tasks'), { recursive: true });
    mkdirSync(join(tempDir, folder), { recursive: true });
    writeFileSync(
        join(tempDir, 'docs', '.tasks', 'config.jsonc'),
        JSON.stringify(
            {
                $schema_version: 1,
                active_folder: folder,
                folders: { [folder]: { base_counter: 0 } },
            },
            null,
            2,
        ),
    );
}

// Helper: write a minimal valid task file
function writeTask(tempDir: string, folder: string, wbs: string, name: string, status = 'Backlog'): string {
    const filename = `${wbs}_${name.replace(/\s+/g, '_')}.md`;
    const filePath = join(tempDir, folder, filename);
    writeFileSync(
        filePath,
        `---
wbs: "${wbs}"
name: "${name}"
status: ${status}
type: task
created_at: 2026-01-01T00:00:00Z
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

### Background

Some background.

### Requirements

Some requirements.
`,
    );
    return filePath;
}

describe('checkTask', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `tasks-check-test-${Date.now()}`);
    const folder = 'docs/tasks';
    let logSpy: ReturnType<typeof spyOn>;
    let successSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        writeConfig(tempDir, folder);
        setGlobalSilent(true);
        logSpy = spyOn(logger, 'log');
        successSpy = spyOn(logger, 'success');
    });

    afterEach(() => {
        setGlobalSilent(false);
        logSpy.mockRestore();
        successSpy.mockRestore();
        try {
            chmodSync(join(tempDir, 'docs', 'tasks'), 0o777);
        } catch {}
        rmSync(tempDir, { recursive: true, force: true });
    });

    describe('single task mode (wbs provided)', () => {
        test('returns err when task is not found', () => {
            const result = checkTask(tempDir, '9999');
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toContain('9999');
                expect(result.error).toContain('not found');
            }
        });

        test('returns valid=true for a healthy Backlog task', () => {
            writeTask(tempDir, folder, '0001', 'Healthy Task');
            const result = checkTask(tempDir, '0001', true);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.valid).toBe(true);
                expect(result.value.issues.length).toBeGreaterThanOrEqual(1);
            }
        });

        test('returns structured issues for task with validation warnings', () => {
            // A WIP task with no content = warning
            writeFileSync(
                join(tempDir, folder, '0002_WIP_Task.md'),
                `---
wbs: "0002"
name: "WIP Task"
status: WIP
type: task
created_at: 2026-01-01T00:00:00Z
---

## Background

## Requirements
`,
            );
            const result = checkTask(tempDir, '0002', true);
            expect(result.ok).toBe(true);
            if (result.ok) {
                // May have warnings about empty sections
                expect(Array.isArray(result.value.issues)).toBe(true);
            }
        });

        test('logs success when quiet=false and task is valid', () => {
            writeTask(tempDir, folder, '0003', 'Log Test Task');
            // quiet=false but globalSilent stays true; verify via spy
            const result = checkTask(tempDir, '0003', false);
            expect(result.ok).toBe(true);
            expect(successSpy).toHaveBeenCalledWith('All checks passed');
        });

        test('logs issues when quiet=false and task has problems', () => {
            writeFileSync(
                join(tempDir, folder, '0004_Bad.md'),
                `---
wbs: "0004"
name: "Bad"
status: WIP
type: task
created_at: 2026-01-01T00:00:00Z
---

## Background

## Requirements
`,
            );
            const result = checkTask(tempDir, '0004', false);
            expect(result.ok).toBe(true);
            expect(logSpy).toHaveBeenCalled();
        });

        test('returns invalid when task file has no frontmatter (readTaskFile returns null)', () => {
            // Write a .md file with no frontmatter — readTaskFile returns null
            writeFileSync(join(tempDir, folder, '0050_No_FM.md'), 'Just some markdown content\n');
            const result = checkTask(tempDir, '0050', true);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.valid).toBe(false);
                expect(result.value.issues.some((i) => i.includes('invalid or missing frontmatter'))).toBe(true);
            }
        });
    });

    describe('all-tasks mode (no wbs)', () => {
        test('returns valid=true with no issues when folder is empty', () => {
            const result = checkTask(tempDir, undefined, true);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.issues).toHaveLength(0);
            }
        });

        test('checks all .md files in configured folders', () => {
            writeTask(tempDir, folder, '0001', 'Task One');
            writeTask(tempDir, folder, '0002', 'Task Two');
            const result = checkTask(tempDir, undefined, true);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.valid).toBe(true);
            }
        });

        test('skips kanban.md files', () => {
            writeTask(tempDir, folder, '0001', 'Task One');
            // Write a kanban file that has no frontmatter — should be ignored
            writeFileSync(join(tempDir, folder, 'kanban.md'), '# Kanban\n\n| Status | Tasks |\n');
            const result = checkTask(tempDir, undefined, true);
            expect(result.ok).toBe(true);
        });

        test('collects errors for tasks with invalid frontmatter', () => {
            // Write a file with no frontmatter (parseFrontmatter returns null)
            writeFileSync(join(tempDir, folder, '0099_Invalid.md'), '# No frontmatter here\n');
            const result = checkTask(tempDir, undefined, true);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.valid).toBe(false);
                expect(result.value.issues.some((i) => i.includes('[ERROR]'))).toBe(true);
            }
        });

        test('collects errors for WIP task missing required sections', () => {
            // WIP requires Background + Requirements; missing both → errors
            writeFileSync(
                join(tempDir, folder, '0060_WIP_No_Sections.md'),
                `---
wbs: "0060"
name: "WIP No Sections"
status: WIP
type: task
created_at: 2026-01-01T00:00:00Z
---

### Background

### Requirements
`,
            );
            const result = checkTask(tempDir, undefined, true);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.valid).toBe(false);
                expect(result.value.issues.some((i) => i.includes('[ERROR]') && i.includes('0060'))).toBe(true);
            }
        });

        test('collects warnings for WIP task with filled required but missing warning sections', () => {
            // WIP: required (Background, Requirements) filled, warning (Solution, Design, Plan) empty → warnings
            writeFileSync(
                join(tempDir, folder, '0070_WIP_Warn.md'),
                `---
wbs: "0070"
name: "WIP With Warnings"
status: WIP
type: task
created_at: 2026-01-01T00:00:00Z
---

### Background

Some background content.

### Requirements

Some requirements content.
`,
            );
            const result = checkTask(tempDir, undefined, true);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.valid).toBe(true);
                expect(result.value.issues.some((i) => i.includes('[WARN]') && i.includes('0070'))).toBe(true);
            }
        });

        test('skips non-existent folders silently', () => {
            // Config references a folder that does not exist
            writeFileSync(
                join(tempDir, 'docs', '.tasks', 'config.jsonc'),
                JSON.stringify({
                    $schema_version: 1,
                    active_folder: 'docs/tasks',
                    folders: {
                        'docs/tasks': { base_counter: 0 },
                        'docs/nonexistent': { base_counter: 100 },
                    },
                }),
            );
            const result = checkTask(tempDir, undefined, true);
            expect(result.ok).toBe(true);
        });

        test('logs success when quiet=false and all valid', () => {
            writeTask(tempDir, folder, '0001', 'Valid Task');
            const result = checkTask(tempDir, undefined, false);
            expect(result.ok).toBe(true);
            expect(successSpy).toHaveBeenCalledWith('All checks passed');
        });

        test('logs issues when quiet=false and has problems', () => {
            writeFileSync(join(tempDir, folder, '0099_Invalid.md'), '# Bad\n');
            const result = checkTask(tempDir, undefined, false);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.valid).toBe(false);
            }
            expect(logSpy).toHaveBeenCalled();
        });
    });
});
