import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { updateTask, type UpdateOptions } from '../scripts/commands/update';
import type { Err } from '../scripts/lib/result';
import { setGlobalSilent } from '../../../scripts/logger';

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

function writeTask(tempDir: string, folder: string, wbs: string, status = 'Backlog', profile = 'standard'): string {
    const filePath = join(tempDir, folder, `${wbs}_Test.md`);
    writeFileSync(
        filePath,
        `---
wbs: "${wbs}"
name: "Test Task"
status: ${status}
type: task
created_at: 2026-01-01T00:00:00Z
profile: "${profile}"
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

### Background
Background content for testing purposes.
### Requirements
Requirements content for testing purposes.
### Design
Design content for testing purposes.
### Solution
Solution content for testing purposes.
### Plan
Plan content for testing purposes.
### Q&A
Q&A content for testing purposes.
`,
    );
    return filePath;
}

describe('updateTask', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `tasks-update-test-${Date.now()}`);
    const folder = 'docs/tasks';

    beforeEach(() => {
        writeConfig(tempDir, folder);
        setGlobalSilent(true);
    });

    afterEach(() => {
        setGlobalSilent(false);
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('returns err if task not found', () => {
        const result = updateTask(tempDir, '9999', { status: 'WIP' });
        expect(result.ok).toBe(false);
    });

    test('returns err if invalid task file frontmatter', () => {
        writeFileSync(join(tempDir, folder, '0001_Bad.md'), 'bad content');
        const result = updateTask(tempDir, '0001', { status: 'WIP' });
        expect(result.ok).toBe(false);
        expect((result as Err<string>).error).toContain('invalid frontmatter');
    });

    describe('status update', () => {
        test('updates status successfully', () => {
            const taskPath = writeTask(tempDir, folder, '0001', 'Backlog');
            const result = updateTask(tempDir, '0001', { status: 'WIP', quiet: false });
            expect(result.ok).toBe(true);
            expect(readFileSync(taskPath, 'utf8')).toContain('status: WIP');
        });

        test('returns err on invalid status', () => {
            writeTask(tempDir, folder, '0001', 'Backlog');
            const result = updateTask(tempDir, '0001', { status: 'InvalidStatus' } as unknown as UpdateOptions);
            expect(result.ok).toBe(false);
            expect((result as Err<string>).error).toContain('Invalid status');
        });

        test('succeeds on valid transition to Done', () => {
            const taskPath = writeTask(tempDir, folder, '0002', 'Testing');
            const result = updateTask(tempDir, '0002', { status: 'Done', quiet: true });
            expect(result.ok).toBe(true);
            expect(readFileSync(taskPath, 'utf8')).toContain('status: Done');
        });

        test('returns err on validation warnings without force', () => {
            // A WIP transition where required sections are missing — yields errors
            writeFileSync(
                join(tempDir, folder, '0003_Issue.md'),
                `---
wbs: "0003"
name: "WIP Task"
status: Backlog
type: task
created_at: 2026-01-01T00:00:00Z
---
### Background
`, // Missing requirements
            );
            const result = updateTask(tempDir, '0003', { status: 'WIP', quiet: false });
            expect(result.ok).toBe(false);
            expect((result as Err<string>).error).toContain('Cannot transition');
        });

        test('returns err on validation warnings only (no errors) without force', () => {
            // WIP transition where required sections exist but warning sections are missing
            writeFileSync(
                join(tempDir, folder, '0003b_Issue.md'),
                `---
wbs: "0003b"
name: "WIP Task"
status: Backlog
type: task
created_at: 2026-01-01T00:00:00Z
---
### Background
Background content for testing purposes.
### Requirements
Requirements content for testing purposes.
`,
            );
            const result = updateTask(tempDir, '0003b', { status: 'WIP', quiet: false });
            expect(result.ok).toBe(false);
            expect((result as Err<string>).error).toContain('use --force to override');
        });

        test('allows transition with warnings if force=true', () => {
            writeFileSync(
                join(tempDir, folder, '0004_Issue.md'),
                `---
wbs: "0004"
name: "WIP Task"
status: Backlog
type: task
created_at: 2026-01-01T00:00:00Z
---
### Background
Background content for testing purposes.
### Requirements
Requirements content for testing purposes.
`,
            );
            // Use dryRun to avoid actual save failures but bypass validation
            const result = updateTask(tempDir, '0004', { status: 'WIP', force: true, quiet: false });
            expect(result.ok).toBe(true);
        });

        test('handles dryRun for status', () => {
            const taskPath = writeTask(tempDir, folder, '0005', 'Backlog');
            const result = updateTask(tempDir, '0005', { status: 'WIP', dryRun: true, quiet: false });
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.dryRun).toBe(true);
            }
            expect(readFileSync(taskPath, 'utf8')).toContain('status: Backlog'); // Unchanged
        });

        test('dryRun with validation warnings logs warnings', () => {
            writeFileSync(
                join(tempDir, folder, '0006_Warn.md'),
                `---
wbs: "0006"
name: "Warn Task"
status: Backlog
type: task
created_at: 2026-01-01T00:00:00Z
---
### Background
Background content for testing purposes.
### Requirements
Requirements content for testing purposes.
`,
            );
            const result = updateTask(tempDir, '0006', { status: 'WIP', dryRun: true, quiet: false });
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.dryRun).toBe(true);
                expect(result.value.warnings?.length).toBeGreaterThan(0);
            }
        });
    });

    describe('section update', () => {
        test('updates section from file', () => {
            const taskPath = writeTask(tempDir, folder, '0001');
            const contentFile = join(tempDir, 'new_content.md');
            writeFileSync(contentFile, 'new Q&A content');

            const result = updateTask(tempDir, '0001', { section: 'Q&A', fromFile: contentFile, quiet: false });
            expect(result.ok).toBe(true);
            const newDoc = readFileSync(taskPath, 'utf8');
            expect(newDoc).toContain('## Q&A\nnew Q&A content');
        });

        test('returns err if fromFile does not exist', () => {
            writeTask(tempDir, folder, '0001');
            const result = updateTask(tempDir, '0001', { section: 'Q&A', fromFile: '/nonexistent/file.md' });
            expect(result.ok).toBe(false);
            expect((result as Err<string>).error).toContain('Cannot read from file');
        });

        test('handles dryRun for section', () => {
            writeTask(tempDir, folder, '0001');
            const contentFile = join(tempDir, 'new_content.md');
            writeFileSync(contentFile, 'new Q&A content');
            const result = updateTask(tempDir, '0001', {
                section: 'Q&A',
                fromFile: contentFile,
                dryRun: true,
                quiet: false,
            });
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.action).toBe('section');
                expect(result.value.dryRun).toBe(true);
            }
        });
    });

    describe('implPhase update', () => {
        test('updates impl phase successfully', () => {
            const taskPath = writeTask(tempDir, folder, '0001');
            const result = updateTask(tempDir, '0001', {
                phase: 'implementation',
                phaseStatus: 'complete',
                quiet: false,
            });
            expect(result.ok).toBe(true);
            expect(readFileSync(taskPath, 'utf8')).toContain('implementation: complete');
        });

        test('handles dryRun for impl phase', () => {
            const taskPath = writeTask(tempDir, folder, '0001');
            const result = updateTask(tempDir, '0001', {
                phase: 'implementation',
                phaseStatus: 'complete',
                dryRun: true,
                quiet: false,
            });
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.dryRun).toBe(true);
            }
            expect(readFileSync(taskPath, 'utf8')).toContain('implementation: pending'); // Unchanged
        });
    });

    describe('field update', () => {
        test('updates profile field successfully', () => {
            const taskPath = writeTask(tempDir, folder, '0001', 'Backlog', 'standard');
            const result = updateTask(tempDir, '0001', { field: 'profile', value: 'complex', quiet: false });
            expect(result.ok).toBe(true);
            const content = readFileSync(taskPath, 'utf8');
            expect(content).toContain('preset: "complex"');
            expect(content).not.toContain('profile: ');
        });

        test('accepts orchestration phase-profile aliases when updating profile', () => {
            const taskPath = writeTask(tempDir, folder, '0001', 'Backlog', 'standard');
            const result = updateTask(tempDir, '0001', { field: 'profile', value: 'review-only', quiet: false });
            expect(result.ok).toBe(true);
            const content = readFileSync(taskPath, 'utf8');
            expect(content).toContain('preset: "review-only"');
            expect(content).not.toContain('profile: ');
        });

        test('accepts preset field directly', () => {
            const taskPath = writeTask(tempDir, folder, '0001', 'Backlog', 'standard');
            const result = updateTask(tempDir, '0001', { field: 'preset', value: 'docs-only', quiet: false });
            expect(result.ok).toBe(true);
            const content = readFileSync(taskPath, 'utf8');
            expect(content).toContain('preset: "docs-only"');
            expect(content).not.toContain('profile: ');
        });

        test('returns err on invalid preset', () => {
            writeTask(tempDir, folder, '0001');
            const result = updateTask(tempDir, '0001', { field: 'profile', value: 'invalid_prof' });
            expect(result.ok).toBe(false);
            expect((result as Err<string>).error).toContain('Invalid preset');
        });

        test('handles dryRun for field update', () => {
            const taskPath = writeTask(tempDir, folder, '0001');
            const result = updateTask(tempDir, '0001', {
                field: 'profile',
                value: 'complex',
                dryRun: true,
                quiet: false,
            });
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.dryRun).toBe(true);
            }
            expect(readFileSync(taskPath, 'utf8')).toContain('profile: "standard"');
        });
    });

    test('returns err if no operation specified', () => {
        writeTask(tempDir, folder, '0001');
        const result = updateTask(tempDir, '0001', {});
        expect(result.ok).toBe(false);
        expect((result as Err<string>).error).toContain('No update operation specified');
    });
});
