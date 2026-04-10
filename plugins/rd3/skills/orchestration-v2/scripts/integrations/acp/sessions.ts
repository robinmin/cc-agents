/**
 * orchestration-v2 — ACP Session Lifecycle Service
 *
 * Explicit session management for ACP transport.
 *
 * This module provides:
 * - Session creation with TTL
 * - Session health/status checking
 * - Session cancellation
 * - Stale session recovery
 * - Session cleanup
 *
 * Design: Session management is NOT part of normal transport execution.
 * It is isolated here so that:
 * - Ordinary pipeline phases don't accidentally use sessions
 * - Session stalls don't block the orchestration design center
 * - Recovery logic can be explicit and testable
 */

import { checkAcpxHealth } from '../../../../../scripts/libs/acpx-query';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Session lifecycle state.
 */
export type SessionState = 'active' | 'busy' | 'stale' | 'cancelled' | 'closed';

/**
 * Session health information.
 */
export interface SessionHealth {
    /** Session identifier. */
    readonly sessionId: string;

    /** Current state. */
    readonly state: SessionState;

    /** Whether session is usable. */
    readonly healthy: boolean;

    /** Human-readable status message. */
    readonly message?: string;

    /** Last activity timestamp. */
    readonly lastActivity?: Date;

    /** Number of turns in this session. */
    readonly turnCount?: number;
}

/**
 * Session configuration.
 */
export interface SessionConfig {
    /** Session name/identifier. */
    readonly name: string;

    /** Agent to use. Default: "pi" */
    readonly agent?: string;

    /** TTL in seconds. Default: 300 (5 minutes) */
    readonly ttlSeconds?: number;

    /** Timeout per turn in milliseconds. Default: 30 minutes */
    readonly turnTimeoutMs?: number;
}

/**
 * Session lifecycle service interface.
 */
export interface SessionLifecycle {
    /** Create or ensure a session exists. */
    ensure(config: SessionConfig): Promise<SessionHealth>;

    /** Check session health/status. */
    status(sessionName: string): Promise<SessionHealth>;

    /** Cancel the current turn (if busy). */
    cancelTurn(sessionName: string): Promise<void>;

    /** Mark session as stale and prepare for recovery. */
    markStale(sessionName: string): Promise<void>;

    /** Recover a stale session (creates new if needed). */
    recover(sessionName: string): Promise<SessionHealth>;

    /** Close a session. */
    close(sessionName: string): Promise<void>;

    /** Check if session is healthy enough for use. */
    isHealthy(sessionName: string): Promise<boolean>;
}

// ─── Default Implementation ───────────────────────────────────────────────────

/**
 * Default session lifecycle implementation.
 *
 * Note: This is a placeholder implementation. The actual ACP session
 * management requires access to acpx session status commands which
 * may not be fully implemented in acpx yet.
 *
 * For now, this provides the interface contract. The actual implementation
 * would need:
 * - acpx session list/status commands
 * - Signal-based cancellation support
 * - TTL tracking
 *
 * TODO: Implement actual session management once acpx adds session APIs.
 */
export class DefaultSessionLifecycle implements SessionLifecycle {
    private readonly sessions: Map<string, SessionHealth & { ttlMs: number }> = new Map();
    private readonly recoveryTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

    async ensure(config: SessionConfig): Promise<SessionHealth> {
        const existing = this.sessions.get(config.name);
        const ttlMs = Math.max(1, config.ttlSeconds ?? 300) * 1000;

        if (existing && existing.state === 'active') {
            const refreshed = {
                ...existing,
                ttlMs,
                lastActivity: new Date(),
            };
            this.sessions.set(config.name, refreshed);
            return this.toSessionHealth(refreshed);
        }

        // Create new session
        const health: SessionHealth & { ttlMs: number } = {
            sessionId: config.name,
            state: 'active',
            healthy: true,
            message: `Session ${config.name} created`,
            lastActivity: new Date(),
            turnCount: 0,
            ttlMs,
        };

        this.sessions.set(config.name, health);
        return this.toSessionHealth(health);
    }

    async status(sessionName: string): Promise<SessionHealth> {
        const session = this.sessions.get(sessionName);

        if (!session) {
            return {
                sessionId: sessionName,
                state: 'cancelled',
                healthy: false,
                message: 'Session not found',
            };
        }

        // Check if session is stale (no activity for > TTL)
        const inactiveMs = Date.now() - (session.lastActivity?.getTime() ?? 0);

        if (inactiveMs > session.ttlMs) {
            const staleSession: SessionHealth & { ttlMs: number } = {
                ...session,
                state: 'stale',
                healthy: false,
                message: 'Session is stale (inactive)',
            };
            this.sessions.set(sessionName, staleSession);
            return this.toSessionHealth(staleSession);
        }

        return this.toSessionHealth(session);
    }

    async cancelTurn(sessionName: string): Promise<void> {
        const session = this.sessions.get(sessionName);

        if (!session) {
            return;
        }

        // Mark as cancelled temporarily
        const cancelled: SessionHealth & { ttlMs: number } = {
            ...session,
            state: 'cancelled',
            message: 'Turn cancelled',
        };
        this.sessions.set(sessionName, cancelled);

        // Quick recovery to active — track timer so close() can cancel it
        const handle = setTimeout(() => {
            this.recoveryTimers.delete(sessionName);
            const current = this.sessions.get(sessionName);
            if (current?.state === 'cancelled') {
                this.sessions.set(sessionName, {
                    ...current,
                    state: 'active',
                    healthy: true,
                    message: 'Ready for next turn',
                });
            }
        }, 100);
        this.recoveryTimers.set(sessionName, handle);
    }

    async markStale(sessionName: string): Promise<void> {
        const session = this.sessions.get(sessionName);

        if (!session) {
            return;
        }

        this.sessions.set(sessionName, {
            ...session,
            state: 'stale',
            healthy: false,
            message: 'Session marked as stale',
        });
    }

    async recover(sessionName: string): Promise<SessionHealth> {
        const session = this.sessions.get(sessionName);

        // If session doesn't exist or is closed, create new
        if (!session || session.state === 'closed') {
            return this.ensure({ name: sessionName });
        }

        // If session is stale, recreate
        if (session.state === 'stale') {
            const recovered: SessionHealth & { ttlMs: number } = {
                sessionId: sessionName,
                state: 'active',
                healthy: true,
                message: `Session ${sessionName} recovered`,
                lastActivity: new Date(),
                turnCount: 0,
                ttlMs: session.ttlMs,
            };
            this.sessions.set(sessionName, recovered);
            return this.toSessionHealth(recovered);
        }

        // Session is fine, return as-is
        return this.toSessionHealth(session);
    }

    async close(sessionName: string): Promise<void> {
        // Cancel any pending recovery timer so a cancelled session can't re-activate after close
        const pending = this.recoveryTimers.get(sessionName);
        if (pending !== undefined) {
            clearTimeout(pending);
            this.recoveryTimers.delete(sessionName);
        }

        const session = this.sessions.get(sessionName);

        if (!session) {
            return;
        }

        this.sessions.set(sessionName, {
            ...session,
            state: 'closed',
            healthy: false,
            message: 'Session closed',
        });
    }

    async isHealthy(sessionName: string): Promise<boolean> {
        const status = await this.status(sessionName);
        return status.healthy && status.state === 'active';
    }

    private toSessionHealth(session: SessionHealth & { ttlMs: number }): SessionHealth {
        const { ttlMs: _ttlMs, ...health } = session;
        return health;
    }
}

/**
 * Check if acpx is available for session support.
 */
export function checkSessionSupport(): { supported: boolean; error?: string } {
    const health = checkAcpxHealth('acpx');

    if (!health.healthy) {
        return {
            supported: false,
            error: health.error ?? 'acpx not available',
        };
    }

    // Check version for session support
    // TODO: Add version check when acpx adds session APIs
    return { supported: true };
}

// ─── Session Pool ─────────────────────────────────────────────────────────────

/**
 * Pool of session lifecycles for different agents.
 */
export class SessionPool {
    private readonly lifecycles: Map<string, SessionLifecycle> = new Map();

    /**
     * Get or create a session lifecycle for an agent.
     */
    getOrCreate(agent: string): SessionLifecycle {
        let lifecycle = this.lifecycles.get(agent);

        if (!lifecycle) {
            lifecycle = new DefaultSessionLifecycle();
            this.lifecycles.set(agent, lifecycle);
        }

        return lifecycle;
    }

    /**
     * Close all sessions for an agent.
     */
    async closeAll(agent: string): Promise<void> {
        const lifecycle = this.lifecycles.get(agent);
        if (lifecycle) {
            // Clear internal state (actual session cleanup would happen here)
            this.lifecycles.delete(agent);
        }
    }
}

// ─── Integration with Transport ──────────────────────────────────────────────

/**
 * Execute with session lifecycle management.
 *
 * This is the sessioned ACP executor's helper function.
 * It:
 * 1. Ensures session exists
 * 2. Executes transport
 * 3. Updates session health
 * 4. Handles recovery on failure
 */
export async function executeWithSession(
    prompt: string,
    timeoutMs: number,
    config: SessionConfig,
    transport: typeof import('./transport'),
): Promise<import('./transport').AcpTransportResult> {
    // Get session lifecycle
    const lifecycle = new DefaultSessionLifecycle();

    // Ensure session exists
    await lifecycle.ensure(config);

    try {
        // Execute with session
        const execOptions: { agent?: string } = {};
        if (config.agent) {
            execOptions.agent = config.agent;
        }
        const result = transport.executeSessioned(prompt, timeoutMs, config.name, config.ttlSeconds, execOptions);

        // Update session health based on result
        if (!result.success) {
            if (result.timedOut) {
                await lifecycle.markStale(config.name);
            }
        }

        return result;
    } catch (err) {
        // Mark session as stale on unexpected errors
        await lifecycle.markStale(config.name);
        throw err;
    }
}
