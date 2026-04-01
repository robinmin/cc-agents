import { describe, test, expect, beforeAll, jest, beforeEach, afterEach } from 'bun:test';
import { LocalBunExecutor } from './local';
import type { ExecutionRequest, ResourceMetrics } from '../model';
import { setGlobalSilent } from '../../../../scripts/logger';

/** Test-visible interface exposing private methods */
interface TestableLocalExecutor {
    buildArgs(req: ExecutionRequest): string[];
    buildEnv(req: ExecutionRequest): NodeJS.ProcessEnv;
    extractMetrics(stdout: string): ResourceMetrics[] | undefined;
}

beforeAll(() => {
    setGlobalSilent(true);
});

// Mock Bun.spawn
const mockSpawn = jest.fn();
const originalSpawn = Bun.spawn;

beforeEach(() => {
    Bun.spawn = mockSpawn;
    mockSpawn.mockClear();
});

afterEach(() => {
    Bun.spawn = originalSpawn;
});

describe('executors/local — LocalBunExecutor', () => {
    test('constructor sets correct id and capabilities', () => {
        const exec = new LocalBunExecutor();

        expect(exec.id).toBe('local');
        expect(exec.capabilities).toEqual({
            parallel: false,
            streaming: false,
            structuredOutput: true,
            channels: ['current'],
            maxConcurrency: 1,
        });
    });

    const createMockProcess = (exitCode = 0, stdout = '', stderr = '') => ({
        exited: Promise.resolve(exitCode),
        stdout: new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode(stdout));
                controller.close();
            },
        }),
        stderr: new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode(stderr));
                controller.close();
            },
        }),
    });

    describe('execute()', () => {
        test('executes successfully with basic request', async () => {
            const exec = new LocalBunExecutor();
            const mockProcess = createMockProcess(0, 'Success output', '');
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'current',
                timeoutMs: 5000,
            };

            const result = await exec.execute(req);

            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toBe('Success output');
            expect(result.stderr).toBe('');
            expect(result.timedOut).toBe(false);
            expect(typeof result.durationMs).toBe('number');
            expect(result.durationMs).toBeGreaterThanOrEqual(0);
        });

        test('handles process failure with non-zero exit code', async () => {
            const exec = new LocalBunExecutor();
            const mockProcess = createMockProcess(1, '', 'Error occurred');
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'current',
                timeoutMs: 5000,
            };

            const result = await exec.execute(req);

            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.stderr).toBe('Error occurred');
            expect(result.timedOut).toBe(false);
        });

        test('handles spawn exception', async () => {
            const exec = new LocalBunExecutor();
            mockSpawn.mockImplementation(() => {
                throw new Error('Spawn failed');
            });

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'current',
                timeoutMs: 5000,
            };

            const result = await exec.execute(req);

            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.stderr).toBe('Spawn failed');
            expect(result.timedOut).toBe(false);
        });

        test('handles timeout with abort signal', async () => {
            const exec = new LocalBunExecutor();

            // Create a process that never resolves normally
            const mockProcess = {
                exited: new Promise(() => {}), // Never resolves
                stdout: new ReadableStream({
                    start(controller) {
                        controller.close();
                    },
                }),
                stderr: new ReadableStream({
                    start(controller) {
                        controller.close();
                    },
                }),
            };

            mockSpawn.mockImplementation((_cmd, opts) => {
                // When signal fires (from the real setTimeout in execute), resolve exited
                const proc = {
                    ...mockProcess,
                    exited: new Promise<number>((resolve) => {
                        opts.signal?.addEventListener('abort', () => resolve(1));
                    }),
                };
                return proc;
            });

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'current',
                timeoutMs: 100,
            };

            const result = await exec.execute(req);

            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain('timed out after 100ms');
            expect(result.timedOut).toBe(true);
        });

        test('truncates large stdout and stderr', async () => {
            const exec = new LocalBunExecutor();
            const largeStdout = 'a'.repeat(60000);
            const largeStderr = 'b'.repeat(15000);
            const mockProcess = createMockProcess(0, largeStdout, largeStderr);
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'current',
                timeoutMs: 5000,
            };

            const result = await exec.execute(req);

            expect(result.stdout?.length).toBe(50000);
            expect(result.stderr?.length).toBe(10000);
        });

        test('parses structured output from JSON blocks', async () => {
            const exec = new LocalBunExecutor();
            const stdout = [
                'Regular output line',
                '```json',
                '{"result": "success", "items": [1, 2, 3], "metadata": {"count": 3}}',
                '```',
                'More output',
            ].join('\n');

            const mockProcess = createMockProcess(0, stdout, '');
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'current',
                timeoutMs: 5000,
            };

            const result = await exec.execute(req);

            expect(result.success).toBe(true);
            expect(result.structured).toEqual({
                result: 'success',
                items: [1, 2, 3],
                metadata: { count: 3 },
            });
        });

        test('handles malformed JSON in structured output gracefully', async () => {
            const exec = new LocalBunExecutor();
            const stdout = ['Regular output', '```json', '{"invalid": json}', '```', 'More output'].join('\n');

            const mockProcess = createMockProcess(0, stdout, '');
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'current',
                timeoutMs: 5000,
            };

            const result = await exec.execute(req);

            expect(result.success).toBe(true);
            expect(result.structured).toBeUndefined();
        });

        test('ignores non-JSON code blocks', async () => {
            const exec = new LocalBunExecutor();
            const stdout = ['Regular output', '```typescript', 'const x = 42;', '```', 'More output'].join('\n');

            const mockProcess = createMockProcess(0, stdout, '');
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'current',
                timeoutMs: 5000,
            };

            const result = await exec.execute(req);

            expect(result.success).toBe(true);
            expect(result.structured).toBeUndefined();
        });

        test('parses resource metrics from HTML comments', async () => {
            const exec = new LocalBunExecutor();
            const metrics: ResourceMetrics[] = [
                {
                    model_id: 'gpt-4',
                    model_provider: 'openai',
                    input_tokens: 100,
                    output_tokens: 50,
                    wall_clock_ms: 1000,
                    execution_ms: 800,
                },
                {
                    model_id: 'claude-3',
                    model_provider: 'anthropic',
                    input_tokens: 200,
                    output_tokens: 75,
                    wall_clock_ms: 1200,
                    execution_ms: 900,
                    cache_read_tokens: 10,
                    cache_creation_tokens: 5,
                    first_token_ms: 150,
                },
            ];

            const stdout = ['Regular output', `<!-- metrics:${JSON.stringify(metrics)}-->`, 'More output'].join('\n');

            const mockProcess = createMockProcess(0, stdout, '');
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'current',
                timeoutMs: 5000,
            };

            const result = await exec.execute(req);

            expect(result.success).toBe(true);
            expect(result.resources).toHaveLength(2);
            expect(result.resources).toEqual(metrics);
        });

        test('handles malformed metrics gracefully', async () => {
            const exec = new LocalBunExecutor();
            const stdout = ['Regular output', '<!-- metrics:invalid json -->', 'More output'].join('\n');

            const mockProcess = createMockProcess(0, stdout, '');
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'current',
                timeoutMs: 5000,
            };

            const result = await exec.execute(req);

            expect(result.success).toBe(true);
            expect(result.resources).toBeUndefined();
        });

        test('handles output with no metrics', async () => {
            const exec = new LocalBunExecutor();
            const stdout = 'Regular output with no metrics';

            const mockProcess = createMockProcess(0, stdout, '');
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'current',
                timeoutMs: 5000,
            };

            const result = await exec.execute(req);

            expect(result.success).toBe(true);
            expect(result.resources).toBeUndefined();
        });

        test('combines structured output and metrics correctly', async () => {
            const exec = new LocalBunExecutor();
            const metrics: ResourceMetrics[] = [
                {
                    model_id: 'gpt-4',
                    model_provider: 'openai',
                    input_tokens: 100,
                    output_tokens: 50,
                    wall_clock_ms: 1000,
                    execution_ms: 800,
                },
            ];

            const stdout = [
                'Regular output',
                '```json',
                '{"status": "completed", "count": 5}',
                '```',
                `<!-- metrics:${JSON.stringify(metrics)}-->`,
                'Final output',
            ].join('\n');

            const mockProcess = createMockProcess(0, stdout, '');
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'current',
                timeoutMs: 5000,
            };

            const result = await exec.execute(req);

            expect(result.success).toBe(true);
            expect(result.structured).toEqual({
                status: 'completed',
                count: 5,
            });
            expect(result.resources).toEqual(metrics);
        });
    });

    describe('buildArgs()', () => {
        test('builds basic arguments correctly', () => {
            const exec = new LocalBunExecutor();
            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'current',
                timeoutMs: 5000,
            };

            // Access private method for testing
            const args = (exec as unknown as TestableLocalExecutor).buildArgs(req);

            expect(args).toEqual(['run', 'test-skill']);
        });

        test('includes payload when provided', () => {
            const exec = new LocalBunExecutor();
            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: { key: 'value', number: 42 },
                channel: 'current',
                timeoutMs: 5000,
            };

            const args = (exec as unknown as TestableLocalExecutor).buildArgs(req);

            expect(args).toEqual(['run', 'test-skill', '--payload', '{"key":"value","number":42}']);
        });

        test('omits payload when empty', () => {
            const exec = new LocalBunExecutor();
            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'current',
                timeoutMs: 5000,
            };

            const args = (exec as unknown as TestableLocalExecutor).buildArgs(req);

            expect(args).not.toContain('--payload');
            expect(args).toEqual(['run', 'test-skill']);
        });

        test('handles complex payload objects', () => {
            const exec = new LocalBunExecutor();
            const complexPayload = {
                nested: {
                    array: [1, 2, 3],
                    boolean: true,
                    null_value: null,
                },
                string: 'test',
                number: 42.5,
            };

            const req: ExecutionRequest = {
                skill: 'complex-skill',
                phase: 'test',
                prompt: 'Test prompt',
                payload: complexPayload,
                channel: 'current',
                timeoutMs: 5000,
            };

            const args = (exec as unknown as TestableLocalExecutor).buildArgs(req);

            expect(args).toContain('--payload');
            const payloadIndex = args.indexOf('--payload');
            const payloadJson = args[payloadIndex + 1];
            expect(JSON.parse(payloadJson)).toEqual(complexPayload);
        });
    });

    describe('buildEnv()', () => {
        test('builds environment with required variables', () => {
            const exec = new LocalBunExecutor();
            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'current',
                timeoutMs: 5000,
            };

            const env = (exec as unknown as TestableLocalExecutor).buildEnv(req);

            expect(env).toMatchObject({
                ORCH_PHASE: 'implement',
                ORCH_CHANNEL: 'current',
            });
            // Should include process.env
            expect(env).toMatchObject(process.env);
        });

        test('includes task reference when provided', () => {
            const exec = new LocalBunExecutor();
            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'current',
                timeoutMs: 5000,
                taskRef: 'task-123-abc',
            };

            const env = (exec as unknown as TestableLocalExecutor).buildEnv(req);

            expect(env.ORCH_TASK_REF).toBe('task-123-abc');
        });

        test('omits task reference when not provided', () => {
            const exec = new LocalBunExecutor();
            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'current',
                timeoutMs: 5000,
            };

            const env = (exec as unknown as TestableLocalExecutor).buildEnv(req);

            expect(env).not.toHaveProperty('ORCH_TASK_REF');
        });

        test('preserves existing environment variables', () => {
            const exec = new LocalBunExecutor();
            const originalPath = process.env.PATH;
            const originalHome = process.env.HOME;

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'current',
                timeoutMs: 5000,
            };

            const env = (exec as unknown as TestableLocalExecutor).buildEnv(req);

            expect(env.PATH).toBe(originalPath);
            expect(env.HOME).toBe(originalHome);
        });
    });

    describe('extractMetrics()', () => {
        test('handles empty output', () => {
            const exec = new LocalBunExecutor();
            const metrics = (exec as unknown as TestableLocalExecutor).extractMetrics('');
            expect(metrics).toBeUndefined();
        });

        test('handles output with no metrics', () => {
            const exec = new LocalBunExecutor();
            const stdout = 'Regular output with no metrics';
            const metrics = (exec as unknown as TestableLocalExecutor).extractMetrics(stdout);
            expect(metrics).toBeUndefined();
        });

        test('extracts valid metrics', () => {
            const exec = new LocalBunExecutor();
            const expectedMetrics: ResourceMetrics[] = [
                {
                    model_id: 'gpt-4',
                    model_provider: 'openai',
                    input_tokens: 100,
                    output_tokens: 50,
                    wall_clock_ms: 1000,
                    execution_ms: 800,
                },
            ];

            const stdout = `Regular output<!-- metrics:${JSON.stringify(expectedMetrics)}-->More output`;
            const metrics = (exec as unknown as TestableLocalExecutor).extractMetrics(stdout);

            expect(metrics).toEqual(expectedMetrics);
        });

        test('handles malformed JSON in metrics', () => {
            const exec = new LocalBunExecutor();
            const stdout = 'Output<!-- metrics:invalid json -->More';
            const metrics = (exec as unknown as TestableLocalExecutor).extractMetrics(stdout);
            expect(metrics).toBeUndefined();
        });

        test('extracts complex metrics with optional fields', () => {
            const exec = new LocalBunExecutor();
            const expectedMetrics: ResourceMetrics[] = [
                {
                    model_id: 'claude-3-opus',
                    model_provider: 'anthropic',
                    input_tokens: 500,
                    output_tokens: 200,
                    wall_clock_ms: 2500,
                    execution_ms: 2200,
                    cache_read_tokens: 50,
                    cache_creation_tokens: 25,
                    first_token_ms: 300,
                },
            ];

            const stdout = `<!-- metrics:${JSON.stringify(expectedMetrics)}-->`;
            const metrics = (exec as unknown as TestableLocalExecutor).extractMetrics(stdout);

            expect(metrics).toEqual(expectedMetrics);
        });

        test('extracts multiple metrics entries', () => {
            const exec = new LocalBunExecutor();
            const expectedMetrics: ResourceMetrics[] = [
                {
                    model_id: 'gpt-4',
                    model_provider: 'openai',
                    input_tokens: 100,
                    output_tokens: 50,
                    wall_clock_ms: 1000,
                    execution_ms: 800,
                },
                {
                    model_id: 'claude-3',
                    model_provider: 'anthropic',
                    input_tokens: 200,
                    output_tokens: 75,
                    wall_clock_ms: 1500,
                    execution_ms: 1300,
                },
            ];

            const stdout = `<!-- metrics:${JSON.stringify(expectedMetrics)}-->`;
            const metrics = (exec as unknown as TestableLocalExecutor).extractMetrics(stdout);

            expect(metrics).toEqual(expectedMetrics);
        });

        test('finds first metrics block when multiple exist', () => {
            const exec = new LocalBunExecutor();
            const firstMetrics: ResourceMetrics[] = [
                {
                    model_id: 'first-model',
                    model_provider: 'openai',
                    input_tokens: 100,
                    output_tokens: 50,
                    wall_clock_ms: 1000,
                    execution_ms: 800,
                },
            ];

            const secondMetrics: ResourceMetrics[] = [
                {
                    model_id: 'second-model',
                    model_provider: 'anthropic',
                    input_tokens: 200,
                    output_tokens: 100,
                    wall_clock_ms: 2000,
                    execution_ms: 1800,
                },
            ];

            const stdout = [
                `<!-- metrics:${JSON.stringify(firstMetrics)}-->`,
                'Some output',
                `<!-- metrics:${JSON.stringify(secondMetrics)}-->`,
            ].join('\n');

            const metrics = (exec as unknown as TestableLocalExecutor).extractMetrics(stdout);
            expect(metrics).toEqual(firstMetrics);
        });
    });

    describe('healthCheck()', () => {
        test('always returns healthy status', async () => {
            const exec = new LocalBunExecutor();
            const health = await exec.healthCheck();

            expect(health.healthy).toBe(true);
            expect(health.lastChecked).toBeInstanceOf(Date);
            expect(health.message).toBeUndefined();
        });

        test('returns current timestamp', async () => {
            const exec = new LocalBunExecutor();
            const beforeTime = Date.now();
            const health = await exec.healthCheck();
            const afterTime = Date.now();

            expect(health.lastChecked.getTime()).toBeGreaterThanOrEqual(beforeTime);
            expect(health.lastChecked.getTime()).toBeLessThanOrEqual(afterTime);
        });
    });

    describe('dispose()', () => {
        test('completes without error', async () => {
            const exec = new LocalBunExecutor();
            await expect(exec.dispose()).resolves.toBeUndefined();
        });

        test('can be called multiple times', async () => {
            const exec = new LocalBunExecutor();
            await exec.dispose();
            await expect(exec.dispose()).resolves.toBeUndefined();
        });
    });

    describe('integration scenarios', () => {
        test('verifies spawn is called with correct arguments and environment', async () => {
            const exec = new LocalBunExecutor();
            const mockProcess = createMockProcess(0, '', '');
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'code-implement',
                phase: 'implement',
                prompt: 'Write unit tests',
                payload: { language: 'typescript', testFramework: 'jest' },
                channel: 'current',
                timeoutMs: 30000,
                taskRef: 'task-456',
            };

            await exec.execute(req);

            expect(mockSpawn).toHaveBeenCalledWith(
                ['bun', 'run', 'code-implement', '--payload', '{"language":"typescript","testFramework":"jest"}'],
                expect.objectContaining({
                    stdout: 'pipe',
                    stderr: 'pipe',
                    cwd: process.cwd(),
                    signal: expect.any(AbortSignal),
                    env: expect.objectContaining({
                        ORCH_PHASE: 'implement',
                        ORCH_CHANNEL: 'current',
                        ORCH_TASK_REF: 'task-456',
                    }),
                }),
            );
        });

        test('handles realistic execution with structured output and metrics', async () => {
            const exec = new LocalBunExecutor();
            const structuredData = {
                testsGenerated: 15,
                coverage: 95.2,
                files: ['auth.test.ts', 'user.test.ts'],
            };

            const metrics: ResourceMetrics[] = [
                {
                    model_id: 'gpt-4-turbo',
                    model_provider: 'openai',
                    input_tokens: 1500,
                    output_tokens: 800,
                    wall_clock_ms: 3500,
                    execution_ms: 3200,
                    first_token_ms: 250,
                },
            ];

            const complexOutput = [
                'Starting test generation...',
                '```json',
                JSON.stringify(structuredData),
                '```',
                'Test generation completed successfully',
                `<!-- metrics:${JSON.stringify(metrics)}-->`,
                'Process finished',
            ].join('\n');

            const mockProcess = createMockProcess(0, complexOutput, '');
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'test-generation',
                phase: 'implement',
                prompt: 'Generate comprehensive unit tests',
                payload: { module: 'auth', coverage: 90 },
                channel: 'current',
                timeoutMs: 60000,
                taskRef: 'task-789',
            };

            const result = await exec.execute(req);

            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(result.structured).toEqual(structuredData);
            expect(result.resources).toEqual(metrics);
            expect(result.timedOut).toBe(false);
            expect(result.durationMs).toBeGreaterThanOrEqual(0);
        });

        test('handles execution failure with detailed error information', async () => {
            const exec = new LocalBunExecutor();
            const stderr = 'Error: Skill not found\n    at skill-loader.ts:45:12\n    at process.nextTick';
            const mockProcess = createMockProcess(2, '', stderr);
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'nonexistent-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'current',
                timeoutMs: 5000,
            };

            const result = await exec.execute(req);

            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(2);
            expect(result.stderr).toBe(stderr);
            expect(result.timedOut).toBe(false);
            expect(result.structured).toBeUndefined();
            expect(result.resources).toBeUndefined();
        });

        test('handles mixed content with partial JSON and metrics', async () => {
            const exec = new LocalBunExecutor();
            const output = [
                'Starting process...',
                '```json',
                '{"partial": "data"}',
                '```',
                'Some intermediate output',
                'Not a JSON block:',
                '```text',
                '{"this": "should be ignored"}',
                '```',
                'Final output',
            ].join('\n');

            const mockProcess = createMockProcess(0, output, '');
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'mixed-output-skill',
                phase: 'process',
                prompt: 'Process mixed content',
                payload: {},
                channel: 'current',
                timeoutMs: 5000,
            };

            const result = await exec.execute(req);

            expect(result.success).toBe(true);
            expect(result.structured).toEqual({ partial: 'data' });
            expect(result.resources).toBeUndefined();
        });
    });
});
