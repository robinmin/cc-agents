// Comprehensive tests for tree.ts - directory structure display functionality
// Covers: error handling, artifact directory scenarios, file listing, output formatting,
// custom configurations, edge cases with special characters and file ordering

import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { showTree } from '../scripts/commands/tree';
import { setGlobalSilent } from '../../../scripts/logger';
import type { TasksConfig } from '../scripts/types';

describe('showTree', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `tree-test-${Date.now()}`);
    let loggerSpy: ReturnType<typeof spyOn>;

    function makeConfig(activeFolder: string): TasksConfig {
        return {
            $schema_version: 1,
            folders: {
                [activeFolder]: { base_counter: 0, label: 'test' },
            },
            active_folder: activeFolder,
        };
    }

    function setupProject(activeFolder: string = 'docs/tasks') {
        // Create config
        mkdirSync(join(tempDir, 'docs', '.tasks'), { recursive: true });
        writeFileSync(
            join(tempDir, 'docs', '.tasks', 'config.jsonc'),
            JSON.stringify(makeConfig(activeFolder), null, 2),
        );

        // Create task folder
        mkdirSync(join(tempDir, activeFolder), { recursive: true });
    }

    beforeEach(() => {
        mkdirSync(tempDir, { recursive: true });
        setGlobalSilent(true);

        // Import logger after setting silent mode
        const { logger } = require('../../../scripts/logger');
        loggerSpy = spyOn(logger, 'log');
    });

    afterEach(() => {
        setGlobalSilent(false);
        rmSync(tempDir, { recursive: true, force: true });
        loggerSpy.mockRestore();
    });

    describe('error handling', () => {
        test('returns error for non-existent task', () => {
            setupProject();

            const result = showTree(tempDir, '9999');

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('Task 9999 not found');
            }
        });

        test('returns error when task file does not exist', () => {
            setupProject();
            // Create config but no task file

            const result = showTree(tempDir, '0001');

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('Task 0001 not found');
            }
        });
    });

    describe('artifact directory handling', () => {
        test('handles non-existent artifact directory gracefully', () => {
            setupProject();
            // Create a task file but no artifact directory
            writeFileSync(
                join(tempDir, 'docs/tasks', '0001_test-task.md'),
                '---\nname: Test Task\nstatus: Todo\n---\n',
            );

            const result = showTree(tempDir, '0001');

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.wbs).toBe('0001');
                expect(result.value.files).toEqual([]);
            }
        });

        test('logs message for non-existent artifact directory when not quiet', () => {
            setupProject();
            writeFileSync(
                join(tempDir, 'docs/tasks', '0001_test-task.md'),
                '---\nname: Test Task\nstatus: Todo\n---\n',
            );

            const result = showTree(tempDir, '0001', false);

            expect(result.ok).toBe(true);
            expect(loggerSpy).toHaveBeenCalledWith('No files stored for 0001 (docs/tasks/0001/ does not exist)');
        });

        test('does not log message for non-existent artifact directory when quiet', () => {
            setupProject();
            writeFileSync(
                join(tempDir, 'docs/tasks', '0001_test-task.md'),
                '---\nname: Test Task\nstatus: Todo\n---\n',
            );

            const result = showTree(tempDir, '0001', true);

            expect(result.ok).toBe(true);
            expect(loggerSpy).not.toHaveBeenCalled();
        });
    });

    describe('file listing', () => {
        test('lists single file in artifact directory', () => {
            setupProject();
            writeFileSync(
                join(tempDir, 'docs/tasks', '0001_test-task.md'),
                '---\nname: Test Task\nstatus: Todo\n---\n',
            );

            // Create artifact directory with one file
            mkdirSync(join(tempDir, 'docs/tasks/0001'), { recursive: true });
            writeFileSync(join(tempDir, 'docs/tasks/0001', 'output.txt'), 'test content');

            const result = showTree(tempDir, '0001');

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.wbs).toBe('0001');
                expect(result.value.files).toEqual(['docs/tasks/0001/output.txt']);
            }
        });

        test('lists multiple files in artifact directory', () => {
            setupProject();
            writeFileSync(
                join(tempDir, 'docs/tasks', '0042_multi-file-task.md'),
                '---\nname: Multi File Task\nstatus: Done\n---\n',
            );

            // Create artifact directory with multiple files
            mkdirSync(join(tempDir, 'docs/tasks/0042'), { recursive: true });
            writeFileSync(join(tempDir, 'docs/tasks/0042', 'analysis.md'), '# Analysis');
            writeFileSync(join(tempDir, 'docs/tasks/0042', 'code.py'), 'print("hello")');
            writeFileSync(join(tempDir, 'docs/tasks/0042', 'results.json'), '{"status": "success"}');

            const result = showTree(tempDir, '0042');

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.wbs).toBe('0042');
                expect(result.value.files).toHaveLength(3);
                expect(result.value.files).toContain('docs/tasks/0042/analysis.md');
                expect(result.value.files).toContain('docs/tasks/0042/code.py');
                expect(result.value.files).toContain('docs/tasks/0042/results.json');
            }
        });

        test('handles empty artifact directory', () => {
            setupProject();
            writeFileSync(
                join(tempDir, 'docs/tasks', '0001_empty-task.md'),
                '---\nname: Empty Task\nstatus: Todo\n---\n',
            );

            // Create empty artifact directory
            mkdirSync(join(tempDir, 'docs/tasks/0001'), { recursive: true });

            const result = showTree(tempDir, '0001');

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.wbs).toBe('0001');
                expect(result.value.files).toEqual([]);
            }
        });

        test('works with unpadded WBS numbers', () => {
            setupProject();
            writeFileSync(
                join(tempDir, 'docs/tasks', '0047_padded-task.md'),
                '---\nname: Padded Task\nstatus: Todo\n---\n',
            );

            // Create artifact directory using the WBS as passed to the function
            mkdirSync(join(tempDir, 'docs/tasks/47'), { recursive: true });
            writeFileSync(join(tempDir, 'docs/tasks/47', 'artifact.txt'), 'content');

            const result = showTree(tempDir, '47'); // Use unpadded WBS

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.wbs).toBe('47');
                expect(result.value.files).toEqual(['docs/tasks/47/artifact.txt']);
            }
        });
    });

    describe('output formatting', () => {
        test('logs formatted tree structure when not quiet', () => {
            setupProject();
            writeFileSync(
                join(tempDir, 'docs/tasks', '0001_format-test.md'),
                '---\nname: Format Test\nstatus: Todo\n---\n',
            );

            mkdirSync(join(tempDir, 'docs/tasks/0001'), { recursive: true });
            writeFileSync(join(tempDir, 'docs/tasks/0001', 'file1.txt'), 'content1');
            writeFileSync(join(tempDir, 'docs/tasks/0001', 'file2.md'), '# Content2');

            const result = showTree(tempDir, '0001', false);

            expect(result.ok).toBe(true);
            expect(loggerSpy).toHaveBeenCalledWith('docs/tasks/0001/');
            expect(loggerSpy).toHaveBeenCalledWith('├── file1.txt');
            expect(loggerSpy).toHaveBeenCalledWith('└── file2.md');
            expect(loggerSpy).toHaveBeenCalledWith('2 file(s)');
        });

        test('does not log when quiet mode is enabled', () => {
            setupProject();
            writeFileSync(
                join(tempDir, 'docs/tasks', '0001_quiet-test.md'),
                '---\nname: Quiet Test\nstatus: Todo\n---\n',
            );

            mkdirSync(join(tempDir, 'docs/tasks/0001'), { recursive: true });
            writeFileSync(join(tempDir, 'docs/tasks/0001', 'file.txt'), 'content');

            const result = showTree(tempDir, '0001', true);

            expect(result.ok).toBe(true);
            expect(loggerSpy).not.toHaveBeenCalled();
        });

        test('formats file count correctly', () => {
            setupProject();
            writeFileSync(
                join(tempDir, 'docs/tasks', '0001_count-test.md'),
                '---\nname: Count Test\nstatus: Todo\n---\n',
            );

            mkdirSync(join(tempDir, 'docs/tasks/0001'), { recursive: true });
            writeFileSync(join(tempDir, 'docs/tasks/0001', 'single.txt'), 'content');

            showTree(tempDir, '0001', false);

            expect(loggerSpy).toHaveBeenCalledWith('1 file(s)');
        });
    });

    describe('custom project configurations', () => {
        test('works with custom active folder', () => {
            const customFolder = 'custom/tasks';
            setupProject(customFolder);

            writeFileSync(
                join(tempDir, customFolder, '0001_custom-task.md'),
                '---\nname: Custom Task\nstatus: Todo\n---\n',
            );

            // Create artifact directory alongside the task file
            mkdirSync(join(tempDir, customFolder, '0001'), { recursive: true });
            writeFileSync(join(tempDir, customFolder, '0001', 'artifact.txt'), 'content');

            const result = showTree(tempDir, '0001');

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.files).toEqual(['custom/tasks/0001/artifact.txt']);
            }
        });

        test('searches across multiple folders for task', () => {
            // Setup multiple folders
            mkdirSync(join(tempDir, 'docs', '.tasks'), { recursive: true });
            mkdirSync(join(tempDir, 'docs/tasks'), { recursive: true });
            mkdirSync(join(tempDir, 'docs/other'), { recursive: true });

            const multiConfig: TasksConfig = {
                $schema_version: 1,
                folders: {
                    'docs/tasks': { base_counter: 0, label: 'main' },
                    'docs/other': { base_counter: 0, label: 'other' },
                },
                active_folder: 'docs/tasks',
            };

            writeFileSync(join(tempDir, 'docs', '.tasks', 'config.jsonc'), JSON.stringify(multiConfig, null, 2));

            // Put task in second folder
            writeFileSync(
                join(tempDir, 'docs/other', '0050_cross-folder-task.md'),
                '---\nname: Cross Folder Task\nstatus: Todo\n---\n',
            );

            // Create artifact directory alongside the task file (not hardcoded docs/tasks/)
            mkdirSync(join(tempDir, 'docs/other/0050'), { recursive: true });
            writeFileSync(join(tempDir, 'docs/other/0050', 'cross-artifact.txt'), 'content');

            const result = showTree(tempDir, '0050');

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.files).toEqual(['docs/other/0050/cross-artifact.txt']);
            }
        });
    });

    describe('edge cases', () => {
        test('handles files with special characters in names', () => {
            setupProject();
            writeFileSync(
                join(tempDir, 'docs/tasks', '0001_special-chars.md'),
                '---\nname: Special Chars\nstatus: Todo\n---\n',
            );

            // Create artifact directory with special character files
            mkdirSync(join(tempDir, 'docs/tasks/0001'), { recursive: true });
            writeFileSync(join(tempDir, 'docs/tasks/0001', 'file with spaces.txt'), 'content');
            writeFileSync(join(tempDir, 'docs/tasks/0001', 'file-with-dashes.md'), '# Content');
            writeFileSync(join(tempDir, 'docs/tasks/0001', 'file_with_underscores.json'), '{}');

            const result = showTree(tempDir, '0001');

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.files).toHaveLength(3);
                expect(result.value.files).toContain('docs/tasks/0001/file with spaces.txt');
                expect(result.value.files).toContain('docs/tasks/0001/file-with-dashes.md');
                expect(result.value.files).toContain('docs/tasks/0001/file_with_underscores.json');
            }
        });

        test('maintains file order from filesystem', () => {
            setupProject();
            writeFileSync(
                join(tempDir, 'docs/tasks', '0001_order-test.md'),
                '---\nname: Order Test\nstatus: Todo\n---\n',
            );

            // Create artifact directory with files in specific order
            mkdirSync(join(tempDir, 'docs/tasks/0001'), { recursive: true });
            writeFileSync(join(tempDir, 'docs/tasks/0001', 'z-last.txt'), 'content');
            writeFileSync(join(tempDir, 'docs/tasks/0001', 'a-first.txt'), 'content');
            writeFileSync(join(tempDir, 'docs/tasks/0001', 'm-middle.txt'), 'content');

            const result = showTree(tempDir, '0001');

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.files).toHaveLength(3);
                // Files should be returned by readdirSync - order may vary by filesystem
                expect(result.value.files).toContain('docs/tasks/0001/a-first.txt');
                expect(result.value.files).toContain('docs/tasks/0001/m-middle.txt');
                expect(result.value.files).toContain('docs/tasks/0001/z-last.txt');
            }
        });

        test('handles very large WBS numbers', () => {
            setupProject();
            writeFileSync(
                join(tempDir, 'docs/tasks', '9999_large-wbs.md'),
                '---\nname: Large WBS\nstatus: Todo\n---\n',
            );

            // Create artifact directory
            mkdirSync(join(tempDir, 'docs/tasks/9999'), { recursive: true });
            writeFileSync(join(tempDir, 'docs/tasks/9999', 'large-artifact.txt'), 'content');

            const result = showTree(tempDir, '9999');

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.wbs).toBe('9999');
                expect(result.value.files).toEqual(['docs/tasks/9999/large-artifact.txt']);
            }
        });
    });
});
