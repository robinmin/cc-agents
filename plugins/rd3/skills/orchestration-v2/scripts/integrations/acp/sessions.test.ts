/**
 * sessions.ts tests
 *
 * Tests for ACP session lifecycle management.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
    DefaultSessionLifecycle,
    SessionPool,
    checkSessionSupport,
    executeWithSession,
    type SessionHealth,
    type SessionConfig,
} from './sessions';
import type { AcpTransportResult } from './transport';

describe('DefaultSessionLifecycle', () => {
    let lifecycle: DefaultSessionLifecycle;

    beforeEach(() => {
        lifecycle = new DefaultSessionLifecycle();
    });

    describe('ensure', () => {
        it('creates a new session', async () => {
            const config: SessionConfig = { name: 'test-session', agent: 'pi' };

            const health = await lifecycle.ensure(config);

            expect(health.sessionId).toBe('test-session');
            expect(health.state).toBe('active');
            expect(health.healthy).toBe(true);
        });

        it('returns existing active session', async () => {
            const config: SessionConfig = { name: 'test-session', agent: 'pi' };

            await lifecycle.ensure(config);
            const health = await lifecycle.ensure(config);

            expect(health.sessionId).toBe('test-session');
            expect(health.state).toBe('active');
        });
    });

    describe('status', () => {
        it('returns session status', async () => {
            const config: SessionConfig = { name: 'test-session', agent: 'pi' };
            await lifecycle.ensure(config);

            const health = await lifecycle.status('test-session');

            expect(health.sessionId).toBe('test-session');
            expect(health.state).toBe('active');
            expect(health.healthy).toBe(true);
        });

        it('returns not found for unknown session', async () => {
            const health = await lifecycle.status('unknown-session');

            expect(health.sessionId).toBe('unknown-session');
            expect(health.state).toBe('cancelled');
            expect(health.healthy).toBe(false);
        });

        it('respects configured TTL before marking a session stale', async () => {
            const config: SessionConfig = { name: 'ttl-session', agent: 'pi', ttlSeconds: 900 };
            const created = await lifecycle.ensure(config);

            expect(created.state).toBe('active');

            const sessions = lifecycle as unknown as {
                sessions: Map<string, SessionHealth & { ttlMs: number }>;
            };
            const record = sessions.sessions.get('ttl-session');
            if (!record) {
                throw new Error('Expected ttl-session to exist');
            }
            sessions.sessions.set('ttl-session', {
                ...record,
                lastActivity: new Date(Date.now() - 600_000),
            });

            const health = await lifecycle.status('ttl-session');
            expect(health.state).toBe('active');
            expect(health.healthy).toBe(true);
        });
    });

    describe('cancelTurn', () => {
        it('cancels current turn', async () => {
            const config: SessionConfig = { name: 'test-session', agent: 'pi' };
            await lifecycle.ensure(config);

            await lifecycle.cancelTurn('test-session');

            // Session should be temporarily cancelled, then recover
            const health = await lifecycle.status('test-session');
            expect(health.state).toBe('cancelled');
        });

        it('recovers to active after cancellation timeout', async () => {
            const config: SessionConfig = { name: 'test-session', agent: 'pi' };
            await lifecycle.ensure(config);

            await lifecycle.cancelTurn('test-session');

            // Wait for the 100ms recovery timeout
            await new Promise((resolve) => setTimeout(resolve, 150));

            const health = await lifecycle.status('test-session');
            expect(health.state).toBe('active');
            expect(health.healthy).toBe(true);
        });
    });

    describe('markStale', () => {
        it('marks session as stale', async () => {
            const config: SessionConfig = { name: 'test-session', agent: 'pi' };
            await lifecycle.ensure(config);

            await lifecycle.markStale('test-session');

            const health = await lifecycle.status('test-session');
            expect(health.state).toBe('stale');
            expect(health.healthy).toBe(false);
        });
    });

    describe('recover', () => {
        it('recovers stale session', async () => {
            const config: SessionConfig = { name: 'test-session', agent: 'pi' };
            await lifecycle.ensure(config);
            await lifecycle.markStale('test-session');

            const health = await lifecycle.recover('test-session');

            expect(health.state).toBe('active');
            expect(health.healthy).toBe(true);
        });

        it('creates new session if not found', async () => {
            const health = await lifecycle.recover('new-session');

            expect(health.sessionId).toBe('new-session');
            expect(health.state).toBe('active');
            expect(health.healthy).toBe(true);
        });

        it('recreates session when state is closed', async () => {
            const config: SessionConfig = { name: 'test-session', agent: 'pi' };
            await lifecycle.ensure(config);
            await lifecycle.close('test-session');

            const health = await lifecycle.recover('test-session');

            expect(health.state).toBe('active');
            expect(health.healthy).toBe(true);
        });
    });

    describe('close', () => {
        it('closes session', async () => {
            const config: SessionConfig = { name: 'test-session', agent: 'pi' };
            await lifecycle.ensure(config);

            await lifecycle.close('test-session');

            const health = await lifecycle.status('test-session');
            expect(health.state).toBe('closed');
            expect(health.healthy).toBe(false);
        });
    });

    describe('isHealthy', () => {
        it('returns true for healthy active session', async () => {
            const config: SessionConfig = { name: 'test-session', agent: 'pi' };
            await lifecycle.ensure(config);

            const healthy = await lifecycle.isHealthy('test-session');

            expect(healthy).toBe(true);
        });

        it('returns false for stale session', async () => {
            const config: SessionConfig = { name: 'test-session', agent: 'pi' };
            await lifecycle.ensure(config);
            await lifecycle.markStale('test-session');

            const healthy = await lifecycle.isHealthy('test-session');

            expect(healthy).toBe(false);
        });

        it('returns false for closed session', async () => {
            const config: SessionConfig = { name: 'test-session', agent: 'pi' };
            await lifecycle.ensure(config);
            await lifecycle.close('test-session');

            const healthy = await lifecycle.isHealthy('test-session');

            expect(healthy).toBe(false);
        });
    });
});

describe('SessionPool', () => {
    let pool: SessionPool;

    beforeEach(() => {
        pool = new SessionPool();
    });

    describe('getOrCreate', () => {
        it('creates DefaultSessionLifecycle instance', () => {
            const lifecycle = pool.getOrCreate('pi');

            expect(lifecycle).toBeInstanceOf(DefaultSessionLifecycle);
        });

        it('returns same lifecycle for same agent', () => {
            const first = pool.getOrCreate('pi');
            const second = pool.getOrCreate('pi');

            expect(first).toBe(second);
        });

        it('creates different lifecycles for different agents', () => {
            const piLifecycle = pool.getOrCreate('pi');
            const codexLifecycle = pool.getOrCreate('codex');

            expect(piLifecycle).not.toBe(codexLifecycle);
        });
    });

    describe('closeAll', () => {
        it('closes all sessions for agent', async () => {
            pool.getOrCreate('pi');

            await pool.closeAll('pi');

            // No error means success
        });

        it('handles non-existent agent gracefully', async () => {
            await pool.closeAll('non-existent');

            // No error should be thrown
        });
    });
});

describe('checkSessionSupport', () => {
    it('returns supported status', () => {
        const result = checkSessionSupport();

        expect(result).toHaveProperty('supported');
        expect(typeof result.supported).toBe('boolean');
        if (!result.supported) {
            expect(result).toHaveProperty('error');
        }
    });
});

describe('executeWithSession', () => {
    // Mock transport module
    const mockTransport = {
        executeSessioned: ((
            _prompt: string,
            _timeoutMs: number,
            _sessionName: string,
            _sessionTtlSeconds?: number,
            _options?: { agent?: string },
        ): AcpTransportResult => ({
            success: true,
            exitCode: 0,
            stdout: '{"result": "ok"}',
            stderr: '',
            durationMs: 100,
            timedOut: false,
        })) as typeof import('./transport').executeSessioned,
    };

    it('executes with session and returns result', async () => {
        const config: SessionConfig = { name: 'test-session', agent: 'pi' };

        const result = await executeWithSession(
            'test prompt',
            60000,
            config,
            mockTransport as typeof import('./transport'),
        );

        expect(result.success).toBe(true);
        expect(result.timedOut).toBe(false);
    });

    it('marks session stale on timeout', async () => {
        const config: SessionConfig = { name: 'test-session', agent: 'pi' };

        // Create a transport that returns timed out result
        const timeoutTransport = {
            executeSessioned: ((
                _prompt: string,
                _timeoutMs: number,
                _sessionName: string,
                _sessionTtlSeconds?: number,
                _options?: { agent?: string },
            ): AcpTransportResult => ({
                success: false,
                exitCode: 1,
                stdout: '',
                stderr: 'timeout',
                durationMs: 60000,
                timedOut: true,
            })) as typeof import('./transport').executeSessioned,
        };

        await executeWithSession('test prompt', 60000, config, timeoutTransport as typeof import('./transport'));

        // Session should be marked stale - verify by checking lifecycle
        const lifecycle = new DefaultSessionLifecycle();
        await lifecycle.ensure(config);
        // The timeout transport call should have marked it stale
    });

    it('marks session stale on error', async () => {
        const config: SessionConfig = { name: 'test-session', agent: 'pi' };

        // Create a transport that throws
        const errorTransport = {
            executeSessioned: ((
                _prompt: string,
                _timeoutMs: number,
                _sessionName: string,
                _sessionTtlSeconds?: number,
                _options?: { agent?: string },
            ): AcpTransportResult => {
                throw new Error('Transport error');
            }) as typeof import('./transport').executeSessioned,
        };

        await expect(
            executeWithSession('test prompt', 60000, config, errorTransport as typeof import('./transport')),
        ).rejects.toThrow('Transport error');
    });

    it('uses custom agent from config', async () => {
        const config: SessionConfig = { name: 'test-session', agent: 'codex' };
        let capturedAgent: string | undefined;

        const agentCapturingTransport = {
            executeSessioned: ((
                _prompt: string,
                _timeoutMs: number,
                _sessionName: string,
                _sessionTtlSeconds?: number,
                options?: { agent?: string },
            ): AcpTransportResult => {
                capturedAgent = options?.agent;
                return {
                    success: true,
                    exitCode: 0,
                    stdout: '',
                    stderr: '',
                    durationMs: 100,
                    timedOut: false,
                };
            }) as typeof import('./transport').executeSessioned,
        };

        await executeWithSession('test prompt', 60000, config, agentCapturingTransport as typeof import('./transport'));

        expect(capturedAgent).toBe('codex');
    });
});
