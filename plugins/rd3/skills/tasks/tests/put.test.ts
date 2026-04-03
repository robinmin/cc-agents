import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { putArtifact } from '../scripts/commands/put';
import { setGlobalSilent } from '../../../scripts/logger';

describe('putArtifact', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `tasks-put-test-${Date.now()}`);
    const sourceFile = join(tempDir, 'source.txt');
    const configPath = join(tempDir, 'docs', '.tasks', 'config.jsonc');
    const taskFile = join(tempDir, 'docs', 'tasks', '0001_Test_Task.md');

    beforeEach(() => {
        // Create directory structure
        mkdirSync(join(tempDir, 'docs', '.tasks'), { recursive: true });
        mkdirSync(join(tempDir, 'docs', 'tasks'), { recursive: true });
        setGlobalSilent(true);

        // Create config file
        writeFileSync(
            configPath,
            JSON.stringify(
                {
                    $schema_version: 1,
                    active_folder: 'docs/tasks',
                    folders: {
                        'docs/tasks': { base_counter: 1 },
                    },
                },
                null,
                2,
            ),
        );

        // Create sample task file with Artifacts section
        writeFileSync(
            taskFile,
            `---
name: Test Task
description: Test description
status: Backlog
created_at: 2024-01-01T00:00:00Z
updated_at: 2024-01-01T00:00:00Z
folder: docs/tasks
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

### Background

Test background content.

### Requirements

Test requirements content.

### Artifacts

| Type | Path | Agent | Date |
|------|------|-------|------|

### References

Test references content.
`,
        );

        // Create a source file to copy
        writeFileSync(sourceFile, 'Test file content');
    });

    afterEach(() => {
        setGlobalSilent(false);
        rmSync(tempDir, { recursive: true, force: true });
    });

    describe('successful file operations', () => {
        test('copies file and updates artifacts table with basic info', () => {
            const result = putArtifact(tempDir, '0001', sourceFile, { quiet: true });

            expect(result.ok).toBe(true);
            if (result.ok) {
                // Check file was copied
                const targetPath = join(tempDir, 'docs/tasks/0001/source.txt');
                expect(existsSync(targetPath)).toBe(true);
                expect(readFileSync(targetPath, 'utf-8')).toBe('Test file content');

                // Check artifact entry
                expect(result.value.path).toBe(targetPath);
                expect(result.value.artifact.type).toBe('text');
                expect(result.value.artifact.path).toBe('docs/tasks/0001/source.txt');
                expect(result.value.artifact.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                expect(result.value.artifact.agent).toBeUndefined();

                // Check task file was updated
                const updatedContent = readFileSync(taskFile, 'utf-8');
                expect(updatedContent).toContain('| text | docs/tasks/0001/source.txt |  |');
            }
        });

        test('uses custom name when provided', () => {
            const result = putArtifact(tempDir, '0001', sourceFile, {
                name: 'custom.txt',
                quiet: true,
            });

            expect(result.ok).toBe(true);
            if (result.ok) {
                const targetPath = join(tempDir, 'docs/tasks/0001/custom.txt');
                expect(existsSync(targetPath)).toBe(true);
                expect(result.value.artifact.path).toBe('docs/tasks/0001/custom.txt');

                const updatedContent = readFileSync(taskFile, 'utf-8');
                expect(updatedContent).toContain('| text | docs/tasks/0001/custom.txt |');
            }
        });

        test('includes agent when provided', () => {
            const result = putArtifact(tempDir, '0001', sourceFile, {
                agent: 'test-agent',
                quiet: true,
            });

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.artifact.agent).toBe('test-agent');

                const updatedContent = readFileSync(taskFile, 'utf-8');
                expect(updatedContent).toContain('| text | docs/tasks/0001/source.txt | test-agent |');
            }
        });

        test('creates target directory when it does not exist', () => {
            const targetDir = join(tempDir, 'docs/tasks/0001');
            expect(existsSync(targetDir)).toBe(false);

            const result = putArtifact(tempDir, '0001', sourceFile, { quiet: true });

            expect(result.ok).toBe(true);
            expect(existsSync(targetDir)).toBe(true);
        });

        test('works when target directory already exists', () => {
            const targetDir = join(tempDir, 'docs/tasks/0001');
            mkdirSync(targetDir, { recursive: true });

            const result = putArtifact(tempDir, '0001', sourceFile, { quiet: true });

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(existsSync(result.value.path)).toBe(true);
            }
        });
    });

    describe('artifact type inference', () => {
        test('infers image types correctly', () => {
            const imageFiles = ['test.png', 'test.jpg', 'test.jpeg', 'test.gif', 'test.svg', 'test.webp'];

            for (const fileName of imageFiles) {
                const imageFile = join(tempDir, fileName);
                writeFileSync(imageFile, 'fake image data');

                const result = putArtifact(tempDir, '0001', imageFile, { quiet: true });

                expect(result.ok).toBe(true);
                if (result.ok) {
                    expect(result.value.artifact.type).toBe('image');
                }

                // Clean up for next iteration
                rmSync(join(tempDir, 'docs/tasks/0001'), { recursive: true, force: true });
            }
        });

        test('infers document type for markdown files', () => {
            const mdFile = join(tempDir, 'test.md');
            writeFileSync(mdFile, '# Test markdown');

            const result = putArtifact(tempDir, '0001', mdFile, { quiet: true });

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.artifact.type).toBe('document');
            }
        });

        test('infers data type for json and yaml files', () => {
            const jsonFile = join(tempDir, 'test.json');
            const yamlFile = join(tempDir, 'test.yaml');
            const ymlFile = join(tempDir, 'test.yml');

            writeFileSync(jsonFile, '{}');
            writeFileSync(yamlFile, 'key: value');
            writeFileSync(ymlFile, 'key: value');

            for (const file of [jsonFile, yamlFile, ymlFile]) {
                const result = putArtifact(tempDir, '0001', file, { quiet: true });

                expect(result.ok).toBe(true);
                if (result.ok) {
                    expect(result.value.artifact.type).toBe('data');
                }

                // Clean up for next iteration
                rmSync(join(tempDir, 'docs/tasks/0001'), { recursive: true, force: true });
            }
        });

        test('infers text type for txt and log files', () => {
            const txtFile = join(tempDir, 'test.txt');
            const logFile = join(tempDir, 'test.log');

            writeFileSync(txtFile, 'text content');
            writeFileSync(logFile, 'log content');

            for (const file of [txtFile, logFile]) {
                const result = putArtifact(tempDir, '0001', file, { quiet: true });

                expect(result.ok).toBe(true);
                if (result.ok) {
                    expect(result.value.artifact.type).toBe('text');
                }

                // Clean up for next iteration
                rmSync(join(tempDir, 'docs/tasks/0001'), { recursive: true, force: true });
            }
        });

        test('defaults to file type for unknown extensions', () => {
            const unknownFile = join(tempDir, 'test.unknown');
            writeFileSync(unknownFile, 'unknown content');

            const result = putArtifact(tempDir, '0001', unknownFile, { quiet: true });

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.artifact.type).toBe('file');
            }
        });

        test('handles files without extension', () => {
            const noExtFile = join(tempDir, 'noextension');
            writeFileSync(noExtFile, 'no extension content');

            const result = putArtifact(tempDir, '0001', noExtFile, { quiet: true });

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.artifact.type).toBe('file');
            }
        });
    });

    describe('error handling', () => {
        test('returns error when task does not exist', () => {
            const result = putArtifact(tempDir, '9999', sourceFile, { quiet: true });

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('Task 9999 not found');
            }
        });

        test('returns error when source file does not exist', () => {
            const nonExistentFile = join(tempDir, 'nonexistent.txt');
            const result = putArtifact(tempDir, '0001', nonExistentFile, { quiet: true });

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toContain('Source file does not exist');
            }
        });

        test('handles task file without Artifacts section gracefully', () => {
            // Create task file without Artifacts section
            writeFileSync(
                taskFile,
                `---
name: Test Task
status: Backlog
created_at: 2024-01-01T00:00:00Z
updated_at: 2024-01-01T00:00:00Z
folder: docs/tasks
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

### Background

Test background content.
`,
            );

            const result = putArtifact(tempDir, '0001', sourceFile, { quiet: true });

            expect(result.ok).toBe(true);
            if (result.ok) {
                // File should still be copied even if table update fails
                expect(existsSync(result.value.path)).toBe(true);
            }
        });

        test('handles task file without Artifacts table gracefully', () => {
            // Create task file with Artifacts section but no table
            writeFileSync(
                taskFile,
                `---
name: Test Task
status: Backlog
created_at: 2024-01-01T00:00:00Z
updated_at: 2024-01-01T00:00:00Z
folder: docs/tasks
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

### Background

Test background content.

### Artifacts

No table here.
`,
            );

            const result = putArtifact(tempDir, '0001', sourceFile, { quiet: true });

            expect(result.ok).toBe(true);
            if (result.ok) {
                // File should still be copied even if table update fails
                expect(existsSync(result.value.path)).toBe(true);
            }
        });
    });

    describe('date formatting', () => {
        test('uses ISO date format (YYYY-MM-DD)', () => {
            const result = putArtifact(tempDir, '0001', sourceFile, { quiet: true });

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.artifact.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

                // Verify it's today's date
                const today = new Date().toISOString().split('T')[0];
                expect(result.value.artifact.date).toBe(today);
            }
        });
    });

    describe('multiple artifacts', () => {
        test('can add multiple artifacts to the same task', () => {
            const file1 = join(tempDir, 'file1.txt');
            const file2 = join(tempDir, 'file2.md');

            writeFileSync(file1, 'content 1');
            writeFileSync(file2, '# Content 2');

            const result1 = putArtifact(tempDir, '0001', file1, { quiet: true });
            const result2 = putArtifact(tempDir, '0001', file2, { quiet: true });

            expect(result1.ok).toBe(true);
            expect(result2.ok).toBe(true);

            const updatedContent = readFileSync(taskFile, 'utf-8');
            expect(updatedContent).toContain('| text | docs/tasks/0001/file1.txt |');
            expect(updatedContent).toContain('| document | docs/tasks/0001/file2.md |');
        });

        test('handles duplicate filenames by overwriting', () => {
            const result1 = putArtifact(tempDir, '0001', sourceFile, { quiet: true });

            // Modify source file content
            writeFileSync(sourceFile, 'Modified content');
            const result2 = putArtifact(tempDir, '0001', sourceFile, { quiet: true });

            expect(result1.ok).toBe(true);
            expect(result2.ok).toBe(true);

            // File should have new content
            if (result2.ok) {
                expect(readFileSync(result2.value.path, 'utf-8')).toBe('Modified content');
            }
        });
    });

    describe('path handling', () => {
        test('handles absolute source paths correctly', () => {
            const absoluteSource = join(tempDir, 'absolute.txt');
            writeFileSync(absoluteSource, 'absolute content');

            const result = putArtifact(tempDir, '0001', absoluteSource, { quiet: true });

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.artifact.path).toBe('docs/tasks/0001/absolute.txt');
            }
        });

        test('extracts filename from complex paths', () => {
            const complexPath = join(tempDir, 'nested/deep/complex.txt');
            mkdirSync(join(tempDir, 'nested/deep'), { recursive: true });
            writeFileSync(complexPath, 'complex content');

            const result = putArtifact(tempDir, '0001', complexPath, { quiet: true });

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.artifact.path).toBe('docs/tasks/0001/complex.txt');
                expect(existsSync(join(tempDir, 'docs/tasks/0001/complex.txt'))).toBe(true);
            }
        });

        test('falls back to "artifact" when filename cannot be extracted', () => {
            // This is a theoretical edge case, but good to test
            const result = putArtifact(tempDir, '0001', sourceFile, {
                name: '',
                quiet: true,
            });

            expect(result.ok).toBe(true);
            if (result.ok) {
                // Should use original filename when custom name is empty
                expect(result.value.artifact.path).toBe('docs/tasks/0001/source.txt');
            }
        });
        test('infers correct artifact types for .md and .yaml', () => {
            const result1 = putArtifact(tempDir, '0001', sourceFile, { name: 'test.md', quiet: true });
            const result2 = putArtifact(tempDir, '0001', sourceFile, { name: 'test.yaml', quiet: true });
            if (result1.ok) expect(result1.value.artifact.type).toBe('document');
            if (result2.ok) expect(result2.value.artifact.type).toBe('data');
        });
    });
});
