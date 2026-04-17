import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { writeFileSync, mkdirSync, rmSync, readFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import {
    parseFrontmatter,
    parseSection,
    getWbsFromPath,
    readTaskFile,
    updateStatus,
    updateFrontmatterField,
    updatePresetFrontmatterField,
    updateSection,
    updateImplPhase,
    appendArtifactRow,
    validateTaskForTransition,
} from '../scripts/lib/taskFile';
import { isErr } from '../../../scripts/libs/result';

describe('parseFrontmatter', () => {
    test('parses basic frontmatter', () => {
        const content = `---
name: My Task
description: A test task
status: Todo
created_at: 2026-03-21T10:00:00.000Z
folder: docs/tasks
type: task
---

### Background

Some background.
`;
        const fm = parseFrontmatter(content);
        expect(fm).not.toBeNull();
        expect(fm?.name).toBe('My Task');
        expect(fm?.status).toBe('Todo');
        expect(fm?.type).toBe('task');
    });

    test('defaults status to Backlog', () => {
        const content = `---
name: No Status Task
---

`;
        const fm = parseFrontmatter(content);
        expect(fm?.status).toBe('Backlog');
    });

    test('defaults type to task', () => {
        const content = `---
name: No Type Task
status: Todo
---

`;
        const fm = parseFrontmatter(content);
        expect(fm?.type).toBe('task');
    });

    test('returns null for no frontmatter', () => {
        expect(parseFrontmatter('No frontmatter here')).toBeNull();
    });

    test('parses impl_progress defaults when not in frontmatter', () => {
        // When impl_progress section is absent, defaults to all pending
        const content = `---
name: Task with Impl
status: WIP
---

### Background
`;
        const fm = parseFrontmatter(content);
        expect(fm?.impl_progress?.planning).toBe('pending');
        expect(fm?.impl_progress?.design).toBe('pending');
        expect(fm?.impl_progress?.implementation).toBe('pending');
        expect(fm?.impl_progress?.review).toBe('pending');
        expect(fm?.impl_progress?.testing).toBe('pending');
    });

    test('parses impl_progress from frontmatter', () => {
        const content = `---
name: Task with Impl
status: WIP
impl_progress:
  planning: completed
  design: in_progress
  implementation: completed
  review: pending
  testing: pending
---
`;
        const fm = parseFrontmatter(content);
        expect(fm?.impl_progress?.planning).toBe('completed');
        expect(fm?.impl_progress?.design).toBe('in_progress');
        expect(fm?.impl_progress?.implementation).toBe('completed');
    });

    test('parses optional profile frontmatter as preset', () => {
        const content = `---
name: Profiled Task
status: Todo
profile: "research"
---
`;
        const fm = parseFrontmatter(content);
        expect(fm?.preset).toBe('research');
    });

    test('parses orchestration phase-profile aliases from frontmatter', () => {
        const content = `---
name: Review Task
status: Todo
profile: "review-only"
---
`;
        const fm = parseFrontmatter(content);
        expect(fm?.preset).toBe('review-only');
    });

    test('prefers preset over legacy profile when both are present', () => {
        const content = `---
name: Preset Task
status: Todo
preset: "simple"
profile: "complex"
---
`;
        const fm = parseFrontmatter(content);
        expect(fm?.preset).toBe('simple');
    });

    test('parses feature-id only when populated', () => {
        const content = `---
name: Feature Task
status: Todo
feature-id: "feat_auth_google_oauth"
---
`;
        const fm = parseFrontmatter(content);
        expect(fm?.['feature-id']).toBe('feat_auth_google_oauth');
    });

    test('ignores empty feature-id placeholders in frontmatter', () => {
        const content = `---
name: Feature Task
status: Todo
feature-id: ""
---
`;
        const fm = parseFrontmatter(content);
        expect(fm?.['feature-id']).toBeUndefined();
    });
});

describe('parseSection', () => {
    const content = `### Background

This is the background.

### Requirements

These are requirements.

### Solution

This is the solution.
`;

    test('extracts existing section', () => {
        expect(parseSection(content, 'Background')).toBe('This is the background.');
    });

    test('extracts Requirements section', () => {
        expect(parseSection(content, 'Requirements')).toBe('These are requirements.');
    });

    test('extracts a section when content starts immediately after the heading', () => {
        const compactContent = `### Background
This starts immediately.

### Requirements

Need the parser to tolerate compact headings.
`;

        expect(parseSection(compactContent, 'Background')).toBe('This starts immediately.');
    });

    test('extracts multi-line sections until the next heading', () => {
        const multiLineContent = `### Artifacts

| Type | Path |
| ---- | ---- |
| image | docs/tasks/0001/design.png |

### References

ref
`;

        expect(parseSection(multiLineContent, 'Artifacts')).toContain('| image | docs/tasks/0001/design.png |');
    });

    test('returns empty string for missing section', () => {
        expect(parseSection(content, 'NonExistent')).toBe('');
    });
});

describe('getWbsFromPath', () => {
    test('extracts WBS from filename', () => {
        expect(getWbsFromPath('/path/to/0047_my-task.md')).toBe('0047');
    });

    test('handles paths without WBS', () => {
        // No underscore means no WBS prefix - returns full stem including extension
        expect(getWbsFromPath('/path/to/my-task.md')).toBe('my-task.md');
    });

    test('handles paths with multiple underscores', () => {
        expect(getWbsFromPath('/path/to/0047_my_awesome_task.md')).toBe('0047');
    });
});

describe('readTaskFile', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `taskfile-test-${Date.now()}`);

    beforeEach(() => {
        mkdirSync(tempDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('reads and parses task file', () => {
        const filePath = join(tempDir, '0047_test-task.md');
        writeFileSync(
            filePath,
            `---
name: Test Task
status: Todo
created_at: 2026-03-21T10:00:00.000Z
folder: docs/tasks
type: task
---

### Background

Background content.
`,
        );
        const task = readTaskFile(filePath);
        expect(task).not.toBeNull();
        expect(task?.wbs).toBe('0047');
        expect(task?.name).toBe('Test Task');
        expect(task?.status).toBe('Todo');
    });

    test('returns null for non-existent file', () => {
        expect(readTaskFile(join(tempDir, 'nonexistent.md'))).toBeNull();
    });
});

describe('updateStatus', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `update-status-test-${Date.now()}`);

    beforeEach(() => {
        mkdirSync(tempDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('returns err when write fails (read-only path)', () => {
        const filePath = join(tempDir, '0047_readonly.md');
        writeFileSync(
            filePath,
            `---
name: Status Test
status: Todo
updated_at: 2026-01-01T00:00:00.000Z
---

### Background
`,
        );
        // Make the file read-only so writeFileSync will throw
        chmodSync(filePath, 0o444);
        const result = updateStatus(filePath, 'WIP');
        expect(result.ok).toBe(false);
        // Restore for cleanup
        chmodSync(filePath, 0o644);
    });

    test('updates status field', () => {
        const filePath = join(tempDir, '0047_status-test.md');
        writeFileSync(
            filePath,
            `---
name: Status Test
status: Todo
updated_at: 2026-01-01T00:00:00.000Z
---

### Background
`,
        );
        const result = updateStatus(filePath, 'WIP');
        expect(result.ok).toBe(true);
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('status: WIP');
        expect(content).toContain('updated_at:');
    });

    test('updates through full lifecycle', () => {
        const filePath = join(tempDir, '0048_lifecycle-test.md');
        writeFileSync(
            filePath,
            `---
name: Lifecycle Test
status: Backlog
updated_at: 2026-01-01T00:00:00.000Z
---

### Background
`,
        );
        const transitions: Array<'Todo' | 'WIP' | 'Testing' | 'Done'> = ['Todo', 'WIP', 'Testing', 'Done'];
        for (const status of transitions) {
            const result = updateStatus(filePath, status);
            expect(result.ok).toBe(true);
        }
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('status: Done');
    });
});

describe('validateTaskForTransition', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `validate-test-${Date.now()}`);

    beforeEach(() => {
        mkdirSync(tempDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('passes validation for Todo transition', () => {
        const filePath = join(tempDir, '0001_empty.md');
        writeFileSync(
            filePath,
            `---
name: Empty Task
status: Backlog
---

`,
        );
        const task = readTaskFile(filePath);
        if (!task) return;
        const result = validateTaskForTransition(task, 'Todo');
        expect(result.hasErrors).toBe(false);
    });

    test('Tier-2 warning for WIP without content', () => {
        const filePath = join(tempDir, '0002_empty-wip.md');
        writeFileSync(
            filePath,
            `---
name: Empty WIP Task
status: Todo
---

### Background
[Background placeholder]

### Requirements
[Requirements placeholder]
`,
        );
        const task = readTaskFile(filePath);
        if (!task) return;
        const result = validateTaskForTransition(task, 'WIP');
        expect(result.hasWarnings).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('passes validation for WIP with all content', () => {
        const filePath = join(tempDir, '0003_complete.md');
        writeFileSync(
            filePath,
            `---
name: Complete Task
status: Todo
---

### Background

Real background content.

### Requirements

Real requirements.

### Solution

Real solution.

### Design

Real design.

### Plan

Real plan.
`,
        );
        const task = readTaskFile(filePath);
        if (!task) return;
        const result = validateTaskForTransition(task, 'WIP');
        expect(result.hasWarnings).toBe(false);
    });

    test('Tier-3 suggestion for missing References', () => {
        const filePath = join(tempDir, '0004_no-refs.md');
        writeFileSync(
            filePath,
            `---
name: No Refs Task
status: Todo
---

### Background

Background.

### References
[References placeholder]
`,
        );
        const task = readTaskFile(filePath);
        if (!task) return;
        const result = validateTaskForTransition(task, 'Todo');
        expect(result.suggestions.length).toBeGreaterThan(0);
    });
});

describe('updateSection', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `update-section-test-${Date.now()}`);

    beforeEach(() => {
        mkdirSync(tempDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('updates the first markdown section in a task file', () => {
        const filePath = join(tempDir, '0001_update-background.md');
        writeFileSync(
            filePath,
            `---
name: Update Background
status: Backlog
---

### Background

Original background.

### Requirements

Original requirements.
`,
        );

        const result = updateSection(filePath, 'Background', 'Replaced background.');

        expect(result.ok).toBe(true);
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('### Background\n\nReplaced background.');
        expect(content).toContain('### Requirements\n\nOriginal requirements.');
    });

    test('updates a section when the original heading has no blank line before content', () => {
        const filePath = join(tempDir, '0002_compact-background.md');
        writeFileSync(
            filePath,
            `---
name: Compact Background
status: Backlog
---

### Background
Original compact background.

### Requirements

Original requirements.
`,
        );

        const result = updateSection(filePath, 'Background', 'Normalized replacement background.');

        expect(result.ok).toBe(true);
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('### Background\nNormalized replacement background.');
        expect(content).toContain('### Requirements\n\nOriginal requirements.');
    });
});

describe('updateFrontmatterField', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `update-fm-field-test-${Date.now()}`);

    beforeEach(() => {
        mkdirSync(tempDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('updates an existing frontmatter field', () => {
        const filePath = join(tempDir, '0047_field-test.md');
        writeFileSync(
            filePath,
            `---
name: Field Test
status: Todo
---

### Background
`,
        );
        const result = updateFrontmatterField(filePath, 'name', 'Updated Name');
        expect(result.ok).toBe(true);
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('name: Updated Name');
    });

    test('inserts a missing frontmatter field before the closing fence', () => {
        const filePath = join(tempDir, '0048_insert-field-test.md');
        writeFileSync(
            filePath,
            `---
name: Field Test
status: Todo
---

### Background
`,
        );
        const result = updateFrontmatterField(filePath, 'preset', '"standard"');
        expect(result.ok).toBe(true);
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('preset: "standard"');
        expect(content.indexOf('preset: "standard"')).toBeLessThan(content.indexOf('---\n\n### Background'));
    });

    test('canonicalizes legacy profile writes to preset', () => {
        const filePath = join(tempDir, '0049_preset-field-test.md');
        writeFileSync(
            filePath,
            `---
name: Field Test
status: Todo
profile: "standard"
---

### Background
`,
        );
        const result = updatePresetFrontmatterField(filePath, '"complex"');
        expect(result.ok).toBe(true);
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('preset: "complex"');
        expect(content).not.toContain('profile: ');
    });

    test('returns err for non-existent file', () => {
        const result = updateFrontmatterField(join(tempDir, 'nonexistent.md'), 'name', 'New');
        expect(result.ok).toBe(false);
    });
});

describe('updateSection', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `update-section-test-${Date.now()}`);

    beforeEach(() => {
        mkdirSync(tempDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('updates an existing section', () => {
        const filePath = join(tempDir, '0048_section-test.md');
        writeFileSync(
            filePath,
            `---
name: Section Test
status: Todo
---

### Background

Old background.

### Requirements

Old requirements.
`,
        );
        const result = updateSection(filePath, 'Background', 'New background content.');
        expect(result.ok).toBe(true);
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('New background content.');
        expect(content).not.toContain('Old background.');
    });

    test('returns err when section not found', () => {
        const filePath = join(tempDir, '0049_no-section.md');
        writeFileSync(
            filePath,
            `---
name: No Section
status: Todo
---

### Background

Content.
`,
        );
        const result = updateSection(filePath, 'NonExistent', 'New content');
        expect(result.ok).toBe(false);
        if (isErr(result)) {
            expect(result.error).toContain('NonExistent');
        }
    });

    test('returns err when write fails (read-only path)', () => {
        const filePath = join(tempDir, '0050_readonly.md');
        writeFileSync(
            filePath,
            `---
name: Readonly Section Test
status: Todo
---

### Background

Old background.
`,
        );
        chmodSync(filePath, 0o444);
        const result = updateSection(filePath, 'Background', 'New content');
        expect(result.ok).toBe(false);
        chmodSync(filePath, 0o644);
    });
});

describe('updateImplPhase', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `update-impl-test-${Date.now()}`);

    beforeEach(() => {
        mkdirSync(tempDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('updates an impl_progress field inside frontmatter indentation', () => {
        const filePath = join(tempDir, '0050_impl-test.md');
        writeFileSync(
            filePath,
            `---
name: Impl Test
status: WIP
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---
`,
        );
        const result = updateImplPhase(filePath, 'planning', 'completed');
        expect(result.ok).toBe(true);
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('  planning: completed');
    });

    test('returns err when impl_progress phase is not present', () => {
        const filePath = join(tempDir, '0050_impl-test-missing.md');
        writeFileSync(
            filePath,
            `---
name: Impl Test
status: WIP
---
`,
        );
        const result = updateImplPhase(filePath, 'planning', 'completed');
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain("impl_progress phase 'planning' not found");
        }
    });

    test('returns err for non-existent file', () => {
        const result = updateImplPhase(join(tempDir, 'nonexistent.md'), 'design', 'completed');
        expect(result.ok).toBe(false);
    });
});

describe('appendArtifactRow', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `artifact-test-${Date.now()}`);

    beforeEach(() => {
        mkdirSync(tempDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('appends artifact row to existing Artifacts table', () => {
        const filePath = join(tempDir, '0051_artifact-test.md');
        writeFileSync(
            filePath,
            `---
name: Artifact Test
status: Done
---

### Background

Content.

### Artifacts

| Type | Path | Agent | Date |
|------|------|-------|------|
`,
        );
        const entry = { type: 'code', path: 'src/foo.ts', agent: 'coder', date: '2026-03-21' };
        const result = appendArtifactRow(filePath, entry);
        expect(result.ok).toBe(true);
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toContain('| code | src/foo.ts | coder | 2026-03-21 |');
    });

    test('returns err when Artifacts section does not exist', () => {
        const filePath = join(tempDir, '0052_no-artifacts.md');
        writeFileSync(
            filePath,
            `---
name: No Artifacts
status: Done
---

### Background
`,
        );
        const entry = { type: 'code', path: 'src/foo.ts', agent: 'coder', date: '2026-03-21' };
        const result = appendArtifactRow(filePath, entry);
        expect(result.ok).toBe(false);
        if (isErr(result)) {
            expect(result.error).toContain('Artifacts section not found');
        }
    });

    test('returns err when Artifacts table header missing', () => {
        const filePath = join(tempDir, '0053_no-table.md');
        writeFileSync(
            filePath,
            `---
name: No Table
status: Done
---

### Artifacts

No table here.
`,
        );
        const entry = { type: 'code', path: 'src/foo.ts', agent: 'coder', date: '2026-03-21' };
        const result = appendArtifactRow(filePath, entry);
        expect(result.ok).toBe(false);
        if (isErr(result)) {
            expect(result.error).toContain('Artifacts table not found');
        }
    });

    test('returns err when write fails (read-only directory)', () => {
        const filePath = join(tempDir, '0054_readonly.md');
        writeFileSync(
            filePath,
            `---
name: Readonly Artifact
status: Done
---

### Artifacts

| Type | Path | Agent | Date |
|------|------|-------|------|
`,
        );
        // Make parent dir read-only so writeFileSync fails
        chmodSync(tempDir, 0o444);
        const entry = { type: 'code', path: 'src/foo.ts', agent: 'coder', date: '2026-03-21' };
        const result = appendArtifactRow(filePath, entry);
        expect(result.ok).toBe(false);
        chmodSync(tempDir, 0o755);
    });
});
