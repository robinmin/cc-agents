/**
 * orchestration-v2 — Executor Adapter Interfaces
 *
 * Transport-agnostic interfaces that separate orchestration core from
 * execution transport concerns (ACP, local, mock, future adapters).
 *
 * Design principle: Orchestration core talks only to adapters.
 * Adapters own transport-specific invocation logic.
 *
 * Key abstractions:
 * - PhaseExecutorAdapter: Contract for executing phases
 * - ExecutorHealth: Health check result shape
 * - ExecutionRoutingPolicy: Configuration-driven adapter selection
 */

import type { ExecutionRequest, ExecutionResult, ExecutorHealth } from '../model';

// ─── Adapter Interface ────────────────────────────────────────────────────────

/**
 * Execution mode for an adapter.
 *
 * - "stateless": One-shot bounded execution. No session reuse.
 *   Use for: ordinary pipeline phase execution.
 *
 * - "sessioned": Persistent session with context carry-over.
 *   Use for: human-guided iterative refinement, deliberately persistent
 *   research/coding conversations where context continuity is needed.
 *
 * Design decision: Stateless is the safe default. Sessioned is opt-in
 * and requires explicit configuration.
 */
export type ExecutionMode = 'stateless' | 'sessioned';

// ExecutorHealth is imported from '../model' (single source of truth)

/**
 * Transport-agnostic executor adapter interface.
 *
 * All execution transports (ACP, local, mock, future remote workers)
 * must implement this interface. This is the boundary between orchestration
 * core and transport-specific logic.
 *
 * Orchestration core MUST NOT:
 * - Know acpx command syntax
 * - Know ACP session semantics
 * - Construct transport-specific prompts directly
 * - Reference agent registry names
 *
 * These concerns belong to the adapter implementation.
 */
export interface PhaseExecutorAdapter {
    /** Unique identifier for this adapter instance. */
    readonly id: string;

    /** Human-readable name for logging/debugging. */
    readonly name: string;

    /** Execution mode: stateless (default safe) or sessioned (opt-in). */
    readonly executionMode: ExecutionMode;

    /** Channels this adapter can handle. */
    readonly channels: readonly string[];

    /**
     * Execute a phase with the given request.
     *
     * The request contains all information needed for execution:
     * - skill: The skill to invoke
     * - phase: Phase name
     * - payload: Structured context
     * - timeoutMs: Bounded execution time
     *
     * The adapter translates this into transport-specific calls
     * and returns a standardized ExecutionResult.
     *
     * @param req - Execution request with phase context
     * @returns Promise resolving to execution result
     */
    execute(req: ExecutionRequest): Promise<ExecutionResult>;

    /**
     * Check adapter health/availability.
     *
     * Used for:
     * - Startup verification
     * - Fallback selection when primary adapter is unhealthy
     * - Observability dashboards
     */
    healthCheck(): Promise<ExecutorHealth>;

    /**
     * Cleanup resources when adapter is no longer needed.
     *
     * Implementations should:
     * - Close any open sessions
     * - Release file handles or connections
     * - Cancel pending requests if possible
     */
    dispose(): Promise<void>;
}

// ─── Routing Policy ───────────────────────────────────────────────────────────

/**
 * Routing decision for a phase execution.
 *
 * Contains:
 * - adapterId: Which adapter to use
 * - executionMode: Override for the adapter's default mode (optional)
 * - priority: Lower = higher priority (for fallback chains)
 */
export interface RoutingDecision {
    readonly adapterId: string;
    readonly executionMode?: ExecutionMode;
    readonly priority: number;
}

/**
 * Phase-specific routing override.
 *
 * Allows per-phase adapter/mode selection without changing adapter code.
 * Useful for:
 * - Optimization decisions (cost, performance, quality)
 * - Debugging specific phases with different transports
 * - Gradual rollout of new adapters
 */
export interface PhaseRouteOverride {
    readonly adapterId: string;
    readonly executionMode?: ExecutionMode;
}

/**
 * Execution routing policy configuration.
 *
 * Defines how phases are routed to adapters.
 * This is the single configuration point for transport decisions.
 *
 * Default behavior (no overrides):
 * - All phases use the default adapter in stateless mode
 *
 * With phase overrides:
 * - Matching phases use specified adapter/mode
 * - Non-matching phases fall back to defaults
 */
export interface ExecutionRoutingPolicy {
    /** Default adapter ID when no override matches. */
    readonly defaultAdapterId: string;

    /**
     * Default execution mode when no override specifies one.
     * Recommended: "stateless" (safe bounded execution)
     */
    readonly defaultMode: ExecutionMode;

    /**
     * Phase-specific routing overrides.
     *
     * Key: phase name (e.g., "implement", "review")
     * Value: routing override for that phase
     *
     * Phases not in this map use default behavior.
     */
    readonly phaseOverrides?: Readonly<Record<string, PhaseRouteOverride>>;

    /**
     * Channel-specific routing overrides.
     *
     * Key: channel name (e.g., "pi", "codex")
     * Value: routing override for that channel
     *
     * Applied after phase overrides.
     */
    readonly channelOverrides?: Readonly<Record<string, PhaseRouteOverride>>;
}

/**
 * Route a phase to an adapter based on policy.
 *
 * Resolution order:
 * 1. Check phaseOverrides for phase name match
 * 2. Check channelOverrides for channel match
 * 3. Fall back to defaults
 *
 * @param policy - Routing policy to apply
 * @param phaseName - Name of the phase to route
 * @param channel - Requested channel (from ExecutionRequest)
 * @returns Routing decision with adapter ID and mode
 */
export function routePhase(policy: ExecutionRoutingPolicy, phaseName: string, channel: string): RoutingDecision {
    // 1. Check phase overrides
    const phaseOverride = policy.phaseOverrides?.[phaseName];
    if (phaseOverride) {
        return {
            adapterId: phaseOverride.adapterId,
            ...(phaseOverride.executionMode && { executionMode: phaseOverride.executionMode }),
            priority: 1,
        } as RoutingDecision;
    }

    // 2. Check channel overrides
    const channelOverride = policy.channelOverrides?.[channel];
    if (channelOverride) {
        return {
            adapterId: channelOverride.adapterId,
            ...(channelOverride.executionMode && { executionMode: channelOverride.executionMode }),
            priority: 2,
        } as RoutingDecision;
    }

    // 3. Default behavior
    return {
        adapterId: policy.defaultAdapterId,
        executionMode: policy.defaultMode,
        priority: 3,
    };
}

/**
 * Create a default routing policy.
 *
 * Safe defaults:
 * - Stateless execution for all phases
 * - Caller chooses the default adapter explicitly (local is recommended)
 *
 * Sessioned mode must be explicitly enabled via phase/channel overrides.
 */
export function createDefaultPolicy(defaultAdapterId: string): ExecutionRoutingPolicy {
    return {
        defaultAdapterId,
        defaultMode: 'stateless',
        phaseOverrides: {},
        channelOverrides: {},
    };
}

// ─── Adapter Registry ────────────────────────────────────────────────────────

/**
 * Registry for managing executor adapters.
 *
 * Key features:
 * - Registration by ID and channel aliases
 * - Lookup by ID or channel
 * - Policy-based routing
 * - Health check aggregation
 */
export interface AdapterRegistry {
    /** Register an adapter. */
    register(adapter: PhaseExecutorAdapter): void;

    /** Get adapter by ID. */
    get(id: string): PhaseExecutorAdapter | undefined;

    /** Get adapter by channel. */
    getByChannel(channel: string): PhaseExecutorAdapter | undefined;

    /** List all registered adapters. */
    list(): PhaseExecutorAdapter[];

    /** Check if adapter/channel exists. */
    has(idOrChannel: string): boolean;

    /** Execute with routing policy. */
    executeWithPolicy(req: ExecutionRequest, policy: ExecutionRoutingPolicy): Promise<ExecutionResult>;

    /** Health check all adapters. */
    healthCheckAll(): Promise<Map<string, ExecutorHealth>>;

    /** Dispose all adapters. */
    disposeAll(): Promise<void>;
}

/**
 * Simple in-memory adapter registry implementation.
 */
export class DefaultAdapterRegistry implements AdapterRegistry {
    private readonly adapters: Map<string, PhaseExecutorAdapter> = new Map();
    private readonly channelToId: Map<string, string> = new Map();

    register(adapter: PhaseExecutorAdapter): void {
        // Register by ID
        this.adapters.set(adapter.id, adapter);

        // Register channel aliases
        for (const channel of adapter.channels) {
            this.channelToId.set(channel, adapter.id);
        }
    }

    get(id: string): PhaseExecutorAdapter | undefined {
        return this.adapters.get(id);
    }

    getByChannel(channel: string): PhaseExecutorAdapter | undefined {
        const id = this.channelToId.get(channel);
        return id ? this.adapters.get(id) : undefined;
    }

    list(): PhaseExecutorAdapter[] {
        return [...this.adapters.values()];
    }

    has(idOrChannel: string): boolean {
        return this.adapters.has(idOrChannel) || this.channelToId.has(idOrChannel);
    }

    async executeWithPolicy(req: ExecutionRequest, policy: ExecutionRoutingPolicy): Promise<ExecutionResult> {
        const decision = routePhase(policy, req.phase, req.channel);
        const adapter = this.get(decision.adapterId);

        if (!adapter) {
            return {
                success: false,
                exitCode: 20,
                stderr: `No adapter found for ID: ${decision.adapterId}`,
                durationMs: 0,
                timedOut: false,
            };
        }

        return adapter.execute(req);
    }

    async healthCheckAll(): Promise<Map<string, ExecutorHealth>> {
        const results = new Map<string, ExecutorHealth>();
        for (const [id, adapter] of this.adapters) {
            results.set(id, await adapter.healthCheck());
        }
        return results;
    }

    async disposeAll(): Promise<void> {
        for (const adapter of this.adapters.values()) {
            await adapter.dispose();
        }
        this.adapters.clear();
        this.channelToId.clear();
    }
}

// ─── Re-exports for convenience ─────────────────────────────────────────────

export type { ExecutionRequest, ExecutionResult, ExecutorHealth } from '../model';

// ─── Known Adapter IDs ────────────────────────────────────────────────────────

/** In-process execution adapter. */
export const ADAPTER_INLINE = 'inline' as const;

/** @deprecated Use ADAPTER_INLINE */
export const ADAPTER_LOCAL = ADAPTER_INLINE;

/** Bun subprocess execution adapter. */
export const ADAPTER_SUBPROCESS = 'subprocess' as const;

/** @deprecated Use ADAPTER_SUBPROCESS */
export const ADAPTER_DIRECT = ADAPTER_SUBPROCESS;

/** ACP oneshot adapter pattern - use for explicit ACP one-shot phases. */
export const ACP_ONESHOT_PATTERN = /^acp-oneshot:(.+)$/;

/** @deprecated Use ACP_ONESHOT_PATTERN — kept for backward compat during migration */
export const ACP_STATELESS_PATTERN = ACP_ONESHOT_PATTERN;

/** @deprecated Use ACP_ONESHOT_PATTERN — kept for backward compat during migration */
export const ADAPTER_ACP_STATELESS_PATTERN = ACP_ONESHOT_PATTERN;

/** ACP session adapter pattern - use for explicit session phases. */
export const ACP_SESSION_PATTERN = /^acp-session:(.+)$/;

/** @deprecated Use ACP_SESSION_PATTERN — kept for backward compat during migration */
export const ACP_SESSIONED_PATTERN = ACP_SESSION_PATTERN;

/** @deprecated Use ACP_SESSION_PATTERN — kept for backward compat during migration */
export const ADAPTER_ACP_SESSIONED_PATTERN = ACP_SESSION_PATTERN;

/**
 * Check if an adapter ID refers to a subprocess adapter.
 */
export function isSubprocessAdapter(adapterId: string): boolean {
    return adapterId === ADAPTER_SUBPROCESS;
}

/** @deprecated Use isSubprocessAdapter */
export const isDirectAdapter = isSubprocessAdapter;

/**
 * Check if an adapter ID refers to the inline (local) adapter.
 */
export function isInlineAdapter(adapterId: string): boolean {
    return adapterId === ADAPTER_INLINE;
}

/** @deprecated Use isInlineAdapter */
export const isLocalAdapter = isInlineAdapter;

/**
 * Check if an adapter ID refers to an ACP adapter.
 */
const LEGACY_ACP_PATTERN = /^acp-(?:stateless|sessioned):(.+)$/;

export function isAcpAdapter(adapterId: string): boolean {
    return ACP_ONESHOT_PATTERN.test(adapterId) || ACP_SESSION_PATTERN.test(adapterId) || LEGACY_ACP_PATTERN.test(adapterId);
}

/**
 * Get the ACP channel from an ACP adapter ID.
 * E.g., "acp-oneshot:pi" -> "pi"
 */
export function extractAcpChannel(adapterId: string): string | null {
    const oneshotMatch = ACP_ONESHOT_PATTERN.exec(adapterId);
    if (oneshotMatch) return oneshotMatch[1];

    const sessionMatch = ACP_SESSION_PATTERN.exec(adapterId);
    if (sessionMatch) return sessionMatch[1];

    // Legacy patterns: acp-stateless:<channel>, acp-sessioned:<channel>
    const legacyMatch = LEGACY_ACP_PATTERN.exec(adapterId);
    if (legacyMatch) return legacyMatch[1];

    return null;
}
