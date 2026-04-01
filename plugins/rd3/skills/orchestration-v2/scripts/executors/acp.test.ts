import { describe, test, expect, beforeAll, jest, beforeEach, afterEach } from 'bun:test';
import { AcpExecutor } from './acp';
import type { ExecutionRequest, ResourceMetrics } from '../model';
import { setGlobalSilent } from '../../../../scripts/logger';

/** Test-visible interface exposing private methods for unit testing */
interface TestableAcpExecutor {
    buildArgs(req: ExecutionRequest): string[];
    buildEnv(req: ExecutionRequest): NodeJS.ProcessEnv;
    parseEventStream(output: string): ResourceMetrics[];
}

/** Helper to cast AcpExecutor for testing private methods */
function asTestable(exec: AcpExecutor): TestableAcpExecutor {
    return exec as unknown as TestableAcpExecutor;
}

/** Minimal type for Bun.spawn mock process objects */
interface MockProcess {
    exited: Promise<number>;
    stdout: ReadableStream;
    stderr: ReadableStream;
}

/** Minimal type for Bun.spawn options in mock implementations */
interface SpawnOptions {
    signal?: AbortSignal;
    stdout?: string;
    stderr?: string;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
}

beforeAll(() => {
    setGlobalSilent(true);
});

// Mock Bun.spawn
const mockSpawn = jest.fn();
const originalSpawn = Bun.spawn;

beforeEach(() => {
    Bun.spawn = mockSpawn as typeof Bun.spawn;
    mockSpawn.mockClear();
});

afterEach(() => {
    Bun.spawn = originalSpawn;
});

describe('executors/acp — AcpExecutor', () => {
    test('constructor sets agent name, id, and capabilities', () => {
        const exec = new AcpExecutor('test-agent');

        expect(exec.id).toBe('acp:test-agent');
        expect(exec.capabilities).toEqual({
            parallel: true,
            streaming: true,
            structuredOutput: true,
            channels: ['test-agent'],
            maxConcurrency: 4,
        });
    });

    test('constructor with different agent name', () => {
        const exec = new AcpExecutor('my-custom-agent');

        expect(exec.id).toBe('acp:my-custom-agent');
        expect(exec.capabilities.channels).toEqual(['my-custom-agent']);
    });

    const createMockProcess = (exitCode = 0, stdout = '', stderr = ''): MockProcess => ({
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
            const exec = new AcpExecutor('test-agent');
            const mockProcess = createMockProcess(0, 'Success output', '');
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'test-channel',
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
            const exec = new AcpExecutor('test-agent');
            const mockProcess = createMockProcess(1, '', 'Error occurred');
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'test-channel',
                timeoutMs: 5000,
            };

            const result = await exec.execute(req);

            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.stderr).toBe('Error occurred');
            expect(result.timedOut).toBe(false);
        });

        test('handles spawn exception', async () => {
            const exec = new AcpExecutor('test-agent');
            mockSpawn.mockImplementation(() => {
                throw new Error('Spawn failed');
            });

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'test-channel',
                timeoutMs: 5000,
            };

            const result = await exec.execute(req);

            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.stderr).toBe('Spawn failed');
            expect(result.timedOut).toBe(false);
        });

        test('handles timeout with abort signal', async () => {
            const exec = new AcpExecutor('test-agent');

            mockSpawn.mockImplementation((_cmd: string[], opts: SpawnOptions) => {
                const proc: MockProcess = {
                    exited: new Promise<number>((_resolve, reject) => {
                        opts.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
                    }),
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
                return proc;
            });

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'test-channel',
                timeoutMs: 100,
            };

            const result = await exec.execute(req);

            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain('timed out after 100ms');
            expect(result.timedOut).toBe(true);
        });

        test('truncates large stdout and stderr', async () => {
            const exec = new AcpExecutor('test-agent');
            const largeStdout = 'a'.repeat(60000);
            const largeStderr = 'b'.repeat(15000);
            const mockProcess = createMockProcess(0, largeStdout, largeStderr);
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'test-channel',
                timeoutMs: 5000,
            };

            const result = await exec.execute(req);

            expect(result.stdout?.length).toBe(50000);
            expect(result.stderr?.length).toBe(10000);
        });

        test('parses resource metrics from NDJSON output', async () => {
            const exec = new AcpExecutor('test-agent');
            const stdout = [
                '{"type": "usage", "usage": {"model_id": "gpt-4", "model_provider": "openai", "input_tokens": 100, "output_tokens": 50, "wall_clock_ms": 1000, "execution_ms": 800}}',
                '{"type": "other", "data": "ignored"}',
                '{"type": "usage", "usage": {"model_id": "claude-3", "model_provider": "anthropic", "input_tokens": 200, "output_tokens": 75, "wall_clock_ms": 1200, "execution_ms": 900, "cache_read_tokens": 10, "cache_creation_tokens": 5, "first_token_ms": 150}}',
                'regular output line',
            ].join('\n');

            const mockProcess = createMockProcess(0, stdout, '');
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'test-channel',
                timeoutMs: 5000,
            };

            const result = await exec.execute(req);

            expect(result.success).toBe(true);
            expect(result.resources).toHaveLength(2);

            const resource1 = result.resources?.[0];
            expect(resource1).toEqual({
                model_id: 'gpt-4',
                model_provider: 'openai',
                input_tokens: 100,
                output_tokens: 50,
                wall_clock_ms: 1000,
                execution_ms: 800,
            });

            const resource2 = result.resources?.[1];
            expect(resource2).toEqual({
                model_id: 'claude-3',
                model_provider: 'anthropic',
                input_tokens: 200,
                output_tokens: 75,
                wall_clock_ms: 1200,
                execution_ms: 900,
                cache_read_tokens: 10,
                cache_creation_tokens: 5,
                first_token_ms: 150,
            });
        });

        test('skips invalid JSON and non-usage events in resource parsing', async () => {
            const exec = new AcpExecutor('test-agent');
            const stdout = [
                'invalid json line',
                '{"type": "log", "message": "not a usage event"}',
                '{"malformed": json}',
                '{"type": "usage", "usage": {"model_id": "gpt-4", "input_tokens": 100, "output_tokens": 50, "wall_clock_ms": 1000, "execution_ms": 800}}',
                '',
            ].join('\n');

            const mockProcess = createMockProcess(0, stdout, '');
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'test-channel',
                timeoutMs: 5000,
            };

            const result = await exec.execute(req);

            expect(result.resources).toHaveLength(1);
            expect(result.resources?.[0].model_id).toBe('gpt-4');
        });

        test('handles missing or null usage fields gracefully', async () => {
            const exec = new AcpExecutor('test-agent');
            const stdout = '{"type": "usage", "usage": {"input_tokens": null, "output_tokens": "50"}}';

            const mockProcess = createMockProcess(0, stdout, '');
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'test-channel',
                timeoutMs: 5000,
            };

            const result = await exec.execute(req);

            expect(result.resources).toHaveLength(1);
            expect(result.resources?.[0]).toEqual({
                model_id: '',
                model_provider: '',
                input_tokens: 0,
                output_tokens: 50,
                wall_clock_ms: 0,
                execution_ms: 0,
            });
        });
    });

    describe('buildArgs()', () => {
        test('builds basic arguments correctly', () => {
            const exec = new AcpExecutor('test-agent');
            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'test-channel',
                timeoutMs: 5000,
            };

            // Access private method for testing
            const args = asTestable(exec).buildArgs(req);

            expect(args).toEqual([
                'run',
                '--agent',
                'test-agent',
                '--skill',
                'test-skill',
                '--phase',
                'implement',
                '--channel',
                'test-channel',
                '--prompt',
                'Test prompt',
            ]);
        });

        test('includes payload when provided', () => {
            const exec = new AcpExecutor('test-agent');
            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: { key: 'value', number: 42 },
                channel: 'test-channel',
                timeoutMs: 5000,
            };

            const args = asTestable(exec).buildArgs(req);

            expect(args).toContain('--payload');
            const payloadIndex = args.indexOf('--payload');
            expect(args[payloadIndex + 1]).toBe('{"key":"value","number":42}');
        });

        test('includes optional fields when provided', () => {
            const exec = new AcpExecutor('test-agent');
            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'test-channel',
                timeoutMs: 5000,
                feedback: 'Please improve this',
                reworkIteration: 2,
                reworkMax: 5,
                outputSchema: { type: 'object', properties: { result: { type: 'string' } } },
            };

            const args = asTestable(exec).buildArgs(req);

            expect(args).toContain('--feedback');
            expect(args).toContain('Please improve this');
            expect(args).toContain('--rework-iteration');
            expect(args).toContain('2');
            expect(args).toContain('--rework-max');
            expect(args).toContain('5');
            expect(args).toContain('--output-schema');
            expect(args).toContain('{"type":"object","properties":{"result":{"type":"string"}}}');
        });

        test('omits optional fields when undefined', () => {
            const exec = new AcpExecutor('test-agent');
            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'test-channel',
                timeoutMs: 5000,
            };

            const args = asTestable(exec).buildArgs(req);

            expect(args).not.toContain('--feedback');
            expect(args).not.toContain('--rework-iteration');
            expect(args).not.toContain('--rework-max');
            expect(args).not.toContain('--output-schema');
        });

        test('handles zero values for rework fields', () => {
            const exec = new AcpExecutor('test-agent');
            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'test-channel',
                timeoutMs: 5000,
                reworkIteration: 0,
                reworkMax: 0,
            };

            const args = asTestable(exec).buildArgs(req);

            expect(args).toContain('--rework-iteration');
            expect(args).toContain('0');
            expect(args).toContain('--rework-max');
            expect(args).toContain('0');
        });
    });

    describe('buildEnv()', () => {
        test('builds environment with required variables', () => {
            const exec = new AcpExecutor('test-agent');
            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'test-channel',
                timeoutMs: 5000,
            };

            const env = asTestable(exec).buildEnv(req);

            expect(env).toMatchObject({
                ORCH_PHASE: 'implement',
                ORCH_CHANNEL: 'test-channel',
            });
            // Should include process.env
            expect(env).toMatchObject(process.env);
        });

        test('includes task reference when provided', () => {
            const exec = new AcpExecutor('test-agent');
            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'test-channel',
                timeoutMs: 5000,
                taskRef: 'task-123-abc',
            };

            const env = asTestable(exec).buildEnv(req);

            expect(env.ORCH_TASK_REF).toBe('task-123-abc');
        });

        test('omits task reference when not provided', () => {
            const exec = new AcpExecutor('test-agent');
            const req: ExecutionRequest = {
                skill: 'test-skill',
                phase: 'implement',
                prompt: 'Test prompt',
                payload: {},
                channel: 'test-channel',
                timeoutMs: 5000,
            };

            const env = asTestable(exec).buildEnv(req);

            expect(env).not.toHaveProperty('ORCH_TASK_REF');
        });
    });

    describe('parseEventStream()', () => {
        test('handles empty output', () => {
            const exec = new AcpExecutor('test-agent');
            const resources = asTestable(exec).parseEventStream('');
            expect(resources).toEqual([]);
        });

        test('handles whitespace-only output', () => {
            const exec = new AcpExecutor('test-agent');
            const resources = asTestable(exec).parseEventStream('  \n\t  \n  ');
            expect(resources).toEqual([]);
        });

        test('skips invalid JSON lines', () => {
            const exec = new AcpExecutor('test-agent');
            const output = [
                'not json',
                '{"invalid": json}',
                '{"type": "usage", "usage": {"model_id": "gpt-4", "input_tokens": 100}}',
                'another invalid line',
            ].join('\n');

            const resources = asTestable(exec).parseEventStream(output);
            expect(resources).toHaveLength(1);
            expect(resources[0].model_id).toBe('gpt-4');
        });

        test('filters non-usage events', () => {
            const exec = new AcpExecutor('test-agent');
            const output = [
                '{"type": "log", "message": "starting"}',
                '{"type": "progress", "percent": 50}',
                '{"type": "usage", "usage": {"model_id": "gpt-4", "input_tokens": 100}}',
                '{"type": "error", "error": "something failed"}',
            ].join('\n');

            const resources = asTestable(exec).parseEventStream(output);
            expect(resources).toHaveLength(1);
            expect(resources[0].model_id).toBe('gpt-4');
        });

        test('handles missing usage field in usage event', () => {
            const exec = new AcpExecutor('test-agent');
            const output = '{"type": "usage"}';

            const resources = asTestable(exec).parseEventStream(output);
            expect(resources).toEqual([]);
        });

        test('handles null usage field in usage event', () => {
            const exec = new AcpExecutor('test-agent');
            const output = '{"type": "usage", "usage": null}';

            const resources = asTestable(exec).parseEventStream(output);
            expect(resources).toEqual([]);
        });

        test('converts all usage fields to appropriate types', () => {
            const exec = new AcpExecutor('test-agent');
            const output =
                '{"type": "usage", "usage": {"model_id": 123, "model_provider": null, "input_tokens": "100", "output_tokens": 50.5, "wall_clock_ms": true, "execution_ms": "invalid"}}';

            const resources = asTestable(exec).parseEventStream(output);
            expect(resources).toHaveLength(1);

            const resource = resources[0];
            expect(resource.model_id).toBe('123');
            expect(resource.model_provider).toBe('');
            expect(resource.input_tokens).toBe(100);
            expect(resource.output_tokens).toBe(50);
            expect(resource.wall_clock_ms).toBe(1);
            expect(resource.execution_ms).toBe(0); // NaN becomes 0
        });

        test('includes optional cache and timing fields when present', () => {
            const exec = new AcpExecutor('test-agent');
            const output =
                '{"type": "usage", "usage": {"model_id": "gpt-4", "cache_read_tokens": 10, "cache_creation_tokens": 5, "first_token_ms": 150}}';

            const resources = asTestable(exec).parseEventStream(output);
            expect(resources).toHaveLength(1);

            const resource = resources[0];
            expect(resource).toHaveProperty('cache_read_tokens', 10);
            expect(resource).toHaveProperty('cache_creation_tokens', 5);
            expect(resource).toHaveProperty('first_token_ms', 150);
        });

        test('omits optional fields when null', () => {
            const exec = new AcpExecutor('test-agent');
            const output = '{"type": "usage", "usage": {"model_id": "gpt-4", "cache_read_tokens": null}}';

            const resources = asTestable(exec).parseEventStream(output);
            expect(resources).toHaveLength(1);

            const resource = resources[0];
            expect(resource).not.toHaveProperty('cache_read_tokens');
        });
    });

    describe('healthCheck()', () => {
        test('returns healthy when acpx --version succeeds', async () => {
            const exec = new AcpExecutor('test-agent');
            const mockProcess = createMockProcess(0, 'acpx version 1.0.0', '');
            mockSpawn.mockReturnValue(mockProcess);

            const health = await exec.healthCheck();

            expect(health.healthy).toBe(true);
            expect(health.message).toBeUndefined();
            expect(health.lastChecked).toBeInstanceOf(Date);
        });

        test('returns unhealthy when acpx --version fails', async () => {
            const exec = new AcpExecutor('test-agent');
            const mockProcess = createMockProcess(1, '', 'command not found');
            mockSpawn.mockReturnValue(mockProcess);

            const health = await exec.healthCheck();

            expect(health.healthy).toBe(false);
            expect(health.message).toBe('acpx not found or not working');
            expect(health.lastChecked).toBeInstanceOf(Date);
        });

        test('returns unhealthy when spawn throws exception', async () => {
            const exec = new AcpExecutor('test-agent');
            mockSpawn.mockImplementation(() => {
                throw new Error('Command not found');
            });

            const health = await exec.healthCheck();

            expect(health.healthy).toBe(false);
            expect(health.message).toBe('acpx not available');
            expect(health.lastChecked).toBeInstanceOf(Date);
        });

        test('calls acpx with correct arguments', async () => {
            const exec = new AcpExecutor('test-agent');
            const mockProcess = createMockProcess(0, '', '');
            mockSpawn.mockReturnValue(mockProcess);

            await exec.healthCheck();

            expect(mockSpawn).toHaveBeenCalledWith(['acpx', '--version'], {
                stdout: 'pipe',
                stderr: 'pipe',
            });
        });
    });

    describe('dispose()', () => {
        test('completes without error', async () => {
            const exec = new AcpExecutor('test-agent');
            await expect(exec.dispose()).resolves.toBeUndefined();
        });

        test('can be called multiple times', async () => {
            const exec = new AcpExecutor('test-agent');
            await exec.dispose();
            await expect(exec.dispose()).resolves.toBeUndefined();
        });
    });

    describe('integration scenarios', () => {
        test('verifies spawn is called with correct arguments and environment', async () => {
            const exec = new AcpExecutor('my-agent');
            const mockProcess = createMockProcess(0, '', '');
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'code-implement',
                phase: 'implement',
                prompt: 'Write unit tests',
                payload: { language: 'typescript' },
                channel: 'development',
                timeoutMs: 30000,
                feedback: 'Add more edge cases',
                reworkIteration: 1,
                taskRef: 'task-456',
            };

            await exec.execute(req);

            expect(mockSpawn).toHaveBeenCalledWith(
                [
                    'acpx',
                    'run',
                    '--agent',
                    'my-agent',
                    '--skill',
                    'code-implement',
                    '--phase',
                    'implement',
                    '--channel',
                    'development',
                    '--prompt',
                    'Write unit tests',
                    '--payload',
                    '{"language":"typescript"}',
                    '--feedback',
                    'Add more edge cases',
                    '--rework-iteration',
                    '1',
                ],
                expect.objectContaining({
                    stdout: 'pipe',
                    stderr: 'pipe',
                    cwd: process.cwd(),
                    signal: expect.any(AbortSignal),
                    env: expect.objectContaining({
                        ORCH_PHASE: 'implement',
                        ORCH_CHANNEL: 'development',
                        ORCH_TASK_REF: 'task-456',
                    }),
                }),
            );
        });

        test('handles complex resource metrics parsing in realistic scenario', async () => {
            const exec = new AcpExecutor('code-agent');
            const complexOutput = [
                '{"type": "log", "level": "info", "message": "Starting code generation"}',
                '{"type": "usage", "usage": {"model_id": "gpt-4-turbo", "model_provider": "openai", "input_tokens": 1500, "output_tokens": 800, "wall_clock_ms": 3500, "execution_ms": 3200, "first_token_ms": 250}}',
                'Generated 5 test cases for user authentication module',
                '{"type": "progress", "step": "validation", "percent": 80}',
                '{"type": "usage", "usage": {"model_id": "gpt-4-turbo", "model_provider": "openai", "input_tokens": 500, "output_tokens": 200, "wall_clock_ms": 1200, "execution_ms": 1100, "cache_read_tokens": 300, "first_token_ms": 100}}',
                'Validation completed successfully',
                '{"type": "result", "status": "complete"}',
            ].join('\n');

            const mockProcess = createMockProcess(0, complexOutput, '');
            mockSpawn.mockReturnValue(mockProcess);

            const req: ExecutionRequest = {
                skill: 'test-generation',
                phase: 'implement',
                prompt: 'Generate comprehensive unit tests',
                payload: { module: 'auth' },
                channel: 'testing',
                timeoutMs: 60000,
            };

            const result = await exec.execute(req);

            expect(result.success).toBe(true);
            expect(result.resources).toHaveLength(2);

            expect(result.resources?.[0]).toEqual({
                model_id: 'gpt-4-turbo',
                model_provider: 'openai',
                input_tokens: 1500,
                output_tokens: 800,
                wall_clock_ms: 3500,
                execution_ms: 3200,
                first_token_ms: 250,
            });

            expect(result.resources?.[1]).toEqual({
                model_id: 'gpt-4-turbo',
                model_provider: 'openai',
                input_tokens: 500,
                output_tokens: 200,
                wall_clock_ms: 1200,
                execution_ms: 1100,
                cache_read_tokens: 300,
                first_token_ms: 100,
            });
        });
    });
});
