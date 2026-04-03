import { afterEach, beforeEach, describe, expect, test, mock } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { batchCreate } from '../scripts/commands/batchCreate';
import { setGlobalSilent } from '../../../scripts/logger';
import type { BatchCreateItem } from '../scripts/types';
import type { Result } from '../scripts/lib/result';

type CreateResult = Result<{ wbs: string; path: string }>;

// Typed mock for createTask — passed via createFn param (no mock.module)
const mockCreateTask = mock<(projectRoot: string, name: string, cliFolder?: string, options?: object) => CreateResult>(
    () => ({ ok: true, value: { wbs: 'MOCK-001', path: '/mock/path' } }),
);

describe('batchCreate', () => {
    const tempDir = join(Bun.env.TEMP_DIR ?? '/tmp', `tasks-batch-create-test-${Date.now()}`);
    const projectRoot = tempDir;
    const jsonFilePath = join(tempDir, 'tasks.json');
    const agentOutputPath = join(tempDir, 'agent-output.txt');

    beforeEach(() => {
        mkdirSync(tempDir, { recursive: true });
        setGlobalSilent(true);
        mockCreateTask.mockClear();
    });

    afterEach(() => {
        setGlobalSilent(false);
        rmSync(tempDir, { recursive: true, force: true });
    });

    describe('JSON mode', () => {
        test('successfully creates tasks from valid JSON array', () => {
            const tasks: BatchCreateItem[] = [
                {
                    name: 'Task One',
                    background: 'First task background',
                    requirements: 'First task requirements',
                    priority: 'high',
                    tags: ['feature', 'urgent'],
                },
                {
                    name: 'Task Two',
                    solution: 'Second task solution',
                    estimated_hours: 8,
                    dependencies: ['PROJ-001'],
                },
            ];

            writeFileSync(jsonFilePath, JSON.stringify(tasks));
            mockCreateTask
                .mockReturnValueOnce({ ok: true, value: { wbs: 'PROJ-001', path: '/path/1' } })
                .mockReturnValueOnce({ ok: true, value: { wbs: 'PROJ-002', path: '/path/2' } });

            const result = batchCreate(projectRoot, jsonFilePath, 'test-folder', true, 'json', mockCreateTask);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.created).toEqual(['PROJ-001', 'PROJ-002']);
                expect(result.value.errors).toEqual([]);
            }

            expect(mockCreateTask).toHaveBeenCalledTimes(2);
            expect(mockCreateTask).toHaveBeenNthCalledWith(1, projectRoot, 'Task One', 'test-folder', {
                background: 'First task background',
                requirements: 'First task requirements',
                priority: 'high',
                tags: ['feature', 'urgent'],
                quiet: true,
            });
            expect(mockCreateTask).toHaveBeenNthCalledWith(2, projectRoot, 'Task Two', 'test-folder', {
                solution: 'Second task solution',
                estimatedHours: 8,
                dependencies: ['PROJ-001'],
                quiet: true,
            });
        });

        test('successfully creates tasks from JSON object with tasks property', () => {
            const data = {
                tasks: [
                    { name: 'Task from object', background: 'Background info' },
                    { name: 'Another task', requirements: 'Some requirements' },
                ],
            };

            writeFileSync(jsonFilePath, JSON.stringify(data));
            mockCreateTask
                .mockReturnValueOnce({ ok: true, value: { wbs: 'PROJ-003', path: '/path/3' } })
                .mockReturnValueOnce({ ok: true, value: { wbs: 'PROJ-004', path: '/path/4' } });

            const result = batchCreate(projectRoot, jsonFilePath, undefined, false, 'json', mockCreateTask);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.created).toEqual(['PROJ-003', 'PROJ-004']);
                expect(result.value.errors).toEqual([]);
            }
        });

        test('uses individual task folder if no cliFolder provided', () => {
            const tasks: BatchCreateItem[] = [{ name: 'Task with folder', folder: 'custom-folder' }];

            writeFileSync(jsonFilePath, JSON.stringify(tasks));
            mockCreateTask.mockReturnValueOnce({ ok: true, value: { wbs: 'PROJ-005', path: '/path/5' } });

            const result = batchCreate(projectRoot, jsonFilePath, undefined, false, 'json', mockCreateTask);

            expect(result.ok).toBe(true);
            expect(mockCreateTask).toHaveBeenCalledWith(projectRoot, 'Task with folder', 'custom-folder', {
                quiet: false,
            });
        });

        test('handles partial success with some task creation failures', () => {
            const tasks: BatchCreateItem[] = [
                { name: 'Good task' },
                { name: 'Bad task' },
                { name: 'Another good task' },
            ];

            writeFileSync(jsonFilePath, JSON.stringify(tasks));
            mockCreateTask
                .mockReturnValueOnce({ ok: true, value: { wbs: 'PROJ-006', path: '/path/6' } })
                .mockReturnValueOnce({ ok: false, error: 'Creation failed' } as CreateResult)
                .mockReturnValueOnce({ ok: true, value: { wbs: 'PROJ-007', path: '/path/7' } });

            const result = batchCreate(projectRoot, jsonFilePath, 'test-folder', true, 'json', mockCreateTask);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.created).toEqual(['PROJ-006', 'PROJ-007']);
                expect(result.value.errors).toEqual(['Bad task: Creation failed']);
            }
        });

        test('handles tasks with missing names', () => {
            const tasks = [
                { name: 'Valid task' },
                { background: 'Task without name' }, // Missing name
                { name: 'Another valid task' },
            ];

            writeFileSync(jsonFilePath, JSON.stringify(tasks));
            mockCreateTask
                .mockReturnValueOnce({ ok: true, value: { wbs: 'PROJ-008', path: '/path/8' } })
                .mockReturnValueOnce({ ok: true, value: { wbs: 'PROJ-009', path: '/path/9' } });

            const result = batchCreate(projectRoot, jsonFilePath, 'test-folder', true, 'json', mockCreateTask);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.created).toEqual(['PROJ-008', 'PROJ-009']);
                expect(result.value.errors).toEqual(['Task missing \'name\': {"background":"Task without name"}']);
            }

            expect(mockCreateTask).toHaveBeenCalledTimes(2);
        });

        test('returns error when JSON file does not exist', () => {
            const result = batchCreate(projectRoot, '/nonexistent/file.json', undefined, false, 'json', mockCreateTask);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('JSON file not found: /nonexistent/file.json');
            }
        });

        test('returns error when JSON file cannot be read', () => {
            // Use a file in a protected directory
            const protectedPath = '/root/protected.json';

            const result = batchCreate(projectRoot, protectedPath, undefined, false, 'json', mockCreateTask);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toMatch(/JSON file not found:/);
            }
        });

        test('returns error when JSON is invalid', () => {
            writeFileSync(jsonFilePath, '{ invalid json }');

            const result = batchCreate(projectRoot, jsonFilePath, undefined, false, 'json', mockCreateTask);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toMatch(/Invalid JSON:/);
            }
        });

        test('returns error when no tasks found in JSON', () => {
            writeFileSync(jsonFilePath, JSON.stringify([]));

            const result = batchCreate(projectRoot, jsonFilePath, undefined, false, 'json', mockCreateTask);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('No tasks found in JSON file');
            }
        });

        test('handles all optional task properties', () => {
            const tasks: BatchCreateItem[] = [
                {
                    name: 'Full featured task',
                    background: 'Task background',
                    requirements: 'Task requirements',
                    solution: 'Task solution',
                    priority: 'medium',
                    estimated_hours: 16,
                    dependencies: ['DEP-001', 'DEP-002'],
                    tags: ['feature', 'backend', 'api'],
                    folder: 'special-folder',
                },
            ];

            writeFileSync(jsonFilePath, JSON.stringify(tasks));
            mockCreateTask.mockReturnValueOnce({ ok: true, value: { wbs: 'PROJ-010', path: '/path/10' } });

            const result = batchCreate(projectRoot, jsonFilePath, 'cli-folder', false, 'json', mockCreateTask);

            expect(result.ok).toBe(true);
            expect(mockCreateTask).toHaveBeenCalledWith(projectRoot, 'Full featured task', 'cli-folder', {
                background: 'Task background',
                requirements: 'Task requirements',
                solution: 'Task solution',
                priority: 'medium',
                estimatedHours: 16,
                dependencies: ['DEP-001', 'DEP-002'],
                tags: ['feature', 'backend', 'api'],
                quiet: false,
            });
        });
    });

    describe('Agent output mode', () => {
        test('successfully extracts and creates tasks from agent output', () => {
            const agentOutput = `
Some agent response text here.

The agent completed the task and here are the results:

<!-- TASKS: [
    {
        "name": "Agent Task 1",
        "background": "Generated by agent",
        "priority": "high"
    },
    {
        "name": "Agent Task 2",
        "requirements": "Agent requirements",
        "tags": ["agent-generated"]
    }
] -->
`;

            writeFileSync(agentOutputPath, agentOutput);
            mockCreateTask
                .mockReturnValueOnce({ ok: true, value: { wbs: 'AGENT-001', path: '/agent/1' } })
                .mockReturnValueOnce({ ok: true, value: { wbs: 'AGENT-002', path: '/agent/2' } });

            const result = batchCreate(
                projectRoot,
                agentOutputPath,
                'agent-folder',
                true,
                'agent-output',
                mockCreateTask,
            );

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.created).toEqual(['AGENT-001', 'AGENT-002']);
                expect(result.value.errors).toEqual([]);
            }

            expect(mockCreateTask).toHaveBeenCalledTimes(2);
            expect(mockCreateTask).toHaveBeenNthCalledWith(1, projectRoot, 'Agent Task 1', 'agent-folder', {
                background: 'Generated by agent',
                priority: 'high',
                quiet: true,
            });
            expect(mockCreateTask).toHaveBeenNthCalledWith(2, projectRoot, 'Agent Task 2', 'agent-folder', {
                requirements: 'Agent requirements',
                tags: ['agent-generated'],
                quiet: true,
            });
        });

        test('handles agent output with tasks property in TASKS footer', () => {
            const agentOutput = `
Agent response content.

<!-- TASKS: {
    "tasks": [
        { "name": "Nested Task 1", "background": "From nested structure" },
        { "name": "Nested Task 2", "solution": "Nested solution" }
    ]
} -->
`;

            writeFileSync(agentOutputPath, agentOutput);
            mockCreateTask
                .mockReturnValueOnce({ ok: true, value: { wbs: 'NEST-001', path: '/nest/1' } })
                .mockReturnValueOnce({ ok: true, value: { wbs: 'NEST-002', path: '/nest/2' } });

            const result = batchCreate(
                projectRoot,
                agentOutputPath,
                'nested-folder',
                false,
                'agent-output',
                mockCreateTask,
            );

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.created).toEqual(['NEST-001', 'NEST-002']);
                expect(result.value.errors).toEqual([]);
            }
        });

        test('returns error when no TASKS footer found in agent output', () => {
            const agentOutput = `
This is agent output without the required footer.
No tasks here!
`;

            writeFileSync(agentOutputPath, agentOutput);

            const result = batchCreate(projectRoot, agentOutputPath, undefined, false, 'agent-output', mockCreateTask);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toMatch(/Invalid TASKS footer: Error: No <!-- TASKS: \[...\] --> footer found/);
            }
        });

        test('returns error when TASKS footer contains invalid JSON', () => {
            const agentOutput = `
Agent response with invalid JSON in footer.

<!-- TASKS: { invalid json here } -->
`;

            writeFileSync(agentOutputPath, agentOutput);

            const result = batchCreate(projectRoot, agentOutputPath, undefined, false, 'agent-output', mockCreateTask);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toMatch(/Invalid TASKS footer:/);
            }
        });

        test('returns error when agent output file does not exist', () => {
            const result = batchCreate(
                projectRoot,
                '/nonexistent/agent-output.txt',
                undefined,
                false,
                'agent-output',
                mockCreateTask,
            );

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('Agent output file not found: /nonexistent/agent-output.txt');
            }
        });

        test('handles TASKS footer with whitespace variations', () => {
            const agentOutput = `
Agent response.

<!--   TASKS:   [
    { "name": "Whitespace Task", "priority": "low" }
]   -->
`;

            writeFileSync(agentOutputPath, agentOutput);
            mockCreateTask.mockReturnValueOnce({ ok: true, value: { wbs: 'WS-001', path: '/ws/1' } });

            const result = batchCreate(projectRoot, agentOutputPath, 'ws-folder', true, 'agent-output', mockCreateTask);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.created).toEqual(['WS-001']);
                expect(result.value.errors).toEqual([]);
            }
        });
    });

    describe('Edge cases and error handling', () => {
        test('handles empty tasks array after parsing', () => {
            writeFileSync(jsonFilePath, JSON.stringify({ tasks: [] }));

            const result = batchCreate(projectRoot, jsonFilePath, undefined, false, 'json', mockCreateTask);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('No tasks found in JSON file');
            }
        });

        test('handles mixed success and failure scenarios with detailed error messages', () => {
            const tasks: (BatchCreateItem | Record<string, never>)[] = [
                { name: 'Success Task 1' },
                {}, // No name
                { name: 'Success Task 2' },
                { name: 'Failure Task' },
                { name: 'Success Task 3' },
            ];

            writeFileSync(jsonFilePath, JSON.stringify(tasks));
            mockCreateTask
                .mockReturnValueOnce({ ok: true, value: { wbs: 'SUC-001', path: '/suc/1' } })
                .mockReturnValueOnce({ ok: true, value: { wbs: 'SUC-002', path: '/suc/2' } })
                .mockReturnValueOnce({
                    ok: false,
                    error: 'Task creation failed due to validation error',
                } as CreateResult)
                .mockReturnValueOnce({ ok: true, value: { wbs: 'SUC-003', path: '/suc/3' } });

            const result = batchCreate(projectRoot, jsonFilePath, 'mixed-folder', true, 'json', mockCreateTask);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.created).toEqual(['SUC-001', 'SUC-002', 'SUC-003']);
                expect(result.value.errors).toEqual([
                    "Task missing 'name': {}",
                    'Failure Task: Task creation failed due to validation error',
                ]);
            }

            expect(mockCreateTask).toHaveBeenCalledTimes(4);
        });

        test('handles undefined estimated_hours correctly', () => {
            const tasks: BatchCreateItem[] = [
                {
                    name: 'Task with undefined hours',
                    // estimated_hours omitted - tests undefined handling
                },
                {
                    name: 'Task with zero hours',
                    estimated_hours: 0,
                },
            ];

            writeFileSync(jsonFilePath, JSON.stringify(tasks));
            mockCreateTask
                .mockReturnValueOnce({ ok: true, value: { wbs: 'HOUR-001', path: '/hour/1' } })
                .mockReturnValueOnce({ ok: true, value: { wbs: 'HOUR-002', path: '/hour/2' } });

            const result = batchCreate(projectRoot, jsonFilePath, 'hour-folder', true, 'json', mockCreateTask);

            expect(result.ok).toBe(true);

            // First task should not include estimatedHours in options
            expect(mockCreateTask).toHaveBeenNthCalledWith(1, projectRoot, 'Task with undefined hours', 'hour-folder', {
                quiet: true,
            });

            // Second task should include estimatedHours: 0
            expect(mockCreateTask).toHaveBeenNthCalledWith(2, projectRoot, 'Task with zero hours', 'hour-folder', {
                estimatedHours: 0,
                quiet: true,
            });
        });

        test('preserves original file path in error messages for different modes', () => {
            // Test JSON mode error
            const result1 = batchCreate(
                projectRoot,
                '/custom/path/tasks.json',
                undefined,
                false,
                'json',
                mockCreateTask,
            );
            expect(result1.ok).toBe(false);
            if (!result1.ok) {
                expect(result1.error).toBe('JSON file not found: /custom/path/tasks.json');
            }

            // Test agent-output mode error
            const result2 = batchCreate(
                projectRoot,
                '/custom/path/agent.txt',
                undefined,
                false,
                'agent-output',
                mockCreateTask,
            );
            expect(result2.ok).toBe(false);
            if (!result2.ok) {
                expect(result2.error).toBe('Agent output file not found: /custom/path/agent.txt');
            }
        });

        test('handles malformed JSON objects gracefully', () => {
            // Test with object that has no tasks property and is not an array
            writeFileSync(jsonFilePath, JSON.stringify({ other_property: 'value' }));

            const result = batchCreate(projectRoot, jsonFilePath, undefined, false, 'json', mockCreateTask);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('No tasks found in JSON file');
            }
        });
    });
});
