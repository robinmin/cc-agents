/**
 * orchestration-v2 — Execution Routing Policy
 *
 * Configuration-driven phase-to-adapter selection.
 *
 * This module provides:
 * - Policy definition and loading
 * - Phase/channel routing resolution
 * - Adapter selection with fallback
 * - CLI-friendly configuration format
 */

import { loadExternalConfig } from '../config/config';
import type { ExecutionRoutingPolicy, ExecutionMode, PhaseRouteOverride } from '../executors/adapter';

// Re-export from adapter
export {
    type ExecutionRoutingPolicy,
    type ExecutionMode,
    type PhaseRouteOverride,
    type RoutingDecision,
    routePhase,
    createDefaultPolicy,
} from '../executors/adapter';

const ACP_ADAPTER_ID_PATTERN = /^acp-(stateless|sessioned):(.+)$/;
const LEGACY_ACP_ADAPTER_ID_PATTERN = /^acp:(.+)$/;

export function buildAcpAdapterId(channel: string, mode: ExecutionMode): string {
    return `acp-${mode}:${channel}`;
}

export function normalizeAdapterId(adapterId: string, mode: ExecutionMode): string {
    const normalized = adapterId.trim();
    if (ACP_ADAPTER_ID_PATTERN.test(normalized)) {
        return normalized;
    }

    const legacyMatch = LEGACY_ACP_ADAPTER_ID_PATTERN.exec(normalized);
    if (legacyMatch) {
        return buildAcpAdapterId(legacyMatch[1], mode);
    }

    return normalized;
}

function normalizeOverride(override: PhaseRouteOverride, fallbackMode: ExecutionMode): PhaseRouteOverride {
    const executionMode = override.executionMode ?? fallbackMode;
    return {
        adapterId: normalizeAdapterId(override.adapterId, executionMode),
        ...(override.executionMode && { executionMode: override.executionMode }),
    };
}

export function materializePolicyChannels(
    policy: ExecutionRoutingPolicy,
    channels: readonly string[],
): ExecutionRoutingPolicy {
    const defaultAdapterId = normalizeAdapterId(policy.defaultAdapterId, policy.defaultMode);
    const phaseOverrides = Object.fromEntries(
        Object.entries(policy.phaseOverrides ?? {}).map(([phase, override]) => [
            phase,
            normalizeOverride(override, policy.defaultMode),
        ]),
    );
    const channelOverrides = Object.fromEntries(
        Object.entries(policy.channelOverrides ?? {}).map(([channel, override]) => [
            channel,
            normalizeOverride(override, policy.defaultMode),
        ]),
    );

    const defaultAdapterMatch = ACP_ADAPTER_ID_PATTERN.exec(defaultAdapterId);
    if (defaultAdapterMatch) {
        const adapterMode = defaultAdapterMatch[1] as ExecutionMode;
        for (const channel of channels) {
            if (channelOverrides[channel]) {
                continue;
            }
            channelOverrides[channel] = {
                adapterId: buildAcpAdapterId(channel, adapterMode),
                executionMode: adapterMode,
            };
        }
    }

    return {
        defaultAdapterId,
        defaultMode: policy.defaultMode,
        phaseOverrides,
        channelOverrides,
    };
}

// ─── Policy Configuration ─────────────────────────────────────────────────────

/**
 * YAML-compatible policy configuration.
 *
 * This is the human-editable format used in config files.
 * Converted to ExecutionRoutingPolicy at runtime.
 */
export interface PolicyConfig {
    /** Default adapter ID. */
    default_adapter?: string;

    /** Default execution mode. Default: "stateless". */
    default_mode?: 'stateless' | 'sessioned';

    /** Phase-specific routing overrides. */
    phase_overrides?: Record<
        string,
        {
            adapter?: string;
            mode?: 'stateless' | 'sessioned';
        }
    >;

    /** Channel-specific routing overrides. */
    channel_overrides?: Record<
        string,
        {
            adapter?: string;
            mode?: 'stateless' | 'sessioned';
        }
    >;
}

/**
 * Load routing policy from config.
 *
 * Reads from orchestrator config file and extracts routing section.
 * Falls back to defaults if not configured.
 */
export function loadRoutingPolicy(adapterId = 'acp-stateless:pi'): ExecutionRoutingPolicy {
    const externalConfig = loadExternalConfig();

    const routingConfig = externalConfig?.routing;
    if (routingConfig && typeof routingConfig === 'object') {
        return configToPolicy(routingConfig as PolicyConfig, adapterId);
    }

    // Check environment variables
    const envMode = process.env.ORCHESTRATION_DEFAULT_MODE as ExecutionMode | undefined;
    if (envMode === 'sessioned') {
        return {
            defaultAdapterId: adapterId,
            defaultMode: 'sessioned',
            phaseOverrides: {},
            channelOverrides: {},
        };
    }

    // Default: stateless for safety
    return {
        defaultAdapterId: adapterId,
        defaultMode: 'stateless',
        phaseOverrides: {},
        channelOverrides: {},
    };
}

/**
 * Convert PolicyConfig to ExecutionRoutingPolicy.
 */
export function configToPolicy(config: PolicyConfig, fallbackAdapterId: string): ExecutionRoutingPolicy {
    const defaultMode: ExecutionMode = config.default_mode ?? 'stateless';
    const defaultAdapterId = normalizeAdapterId(config.default_adapter ?? fallbackAdapterId, defaultMode);

    // Convert phase overrides
    const phaseOverrides: Record<string, PhaseRouteOverride> = {};
    if (config.phase_overrides) {
        for (const [phase, override] of Object.entries(config.phase_overrides)) {
            if (override.adapter || override.mode) {
                phaseOverrides[phase] = {
                    adapterId: normalizeAdapterId(override.adapter ?? defaultAdapterId, override.mode ?? defaultMode),
                    ...(override.mode && { executionMode: override.mode as ExecutionMode }),
                };
            }
        }
    }

    // Convert channel overrides
    const channelOverrides: Record<string, PhaseRouteOverride> = {};
    if (config.channel_overrides) {
        for (const [channel, override] of Object.entries(config.channel_overrides)) {
            if (override.adapter || override.mode) {
                channelOverrides[channel] = {
                    adapterId: normalizeAdapterId(override.adapter ?? defaultAdapterId, override.mode ?? defaultMode),
                    ...(override.mode && { executionMode: override.mode as ExecutionMode }),
                };
            }
        }
    }

    return {
        defaultAdapterId,
        defaultMode,
        phaseOverrides,
        channelOverrides,
    };
}

/**
 * Convert ExecutionRoutingPolicy to PolicyConfig.
 */
export function policyToConfig(policy: ExecutionRoutingPolicy): PolicyConfig {
    const phaseOverrides: Record<string, { adapter?: string; mode?: 'stateless' | 'sessioned' }> = {};
    if (policy.phaseOverrides) {
        for (const [phase, override] of Object.entries(policy.phaseOverrides)) {
            phaseOverrides[phase] = {
                ...(override.adapterId && { adapter: override.adapterId }),
                ...(override.executionMode && { mode: override.executionMode }),
            };
        }
    }

    const channelOverrides: Record<string, { adapter?: string; mode?: 'stateless' | 'sessioned' }> = {};
    if (policy.channelOverrides) {
        for (const [channel, override] of Object.entries(policy.channelOverrides)) {
            channelOverrides[channel] = {
                ...(override.adapterId && { adapter: override.adapterId }),
                ...(override.executionMode && { mode: override.executionMode }),
            };
        }
    }

    return {
        default_adapter: policy.defaultAdapterId,
        default_mode: policy.defaultMode,
        ...(Object.keys(phaseOverrides).length > 0 && { phase_overrides: phaseOverrides }),
        ...(Object.keys(channelOverrides).length > 0 && { channel_overrides: channelOverrides }),
    };
}

// ─── Built-in Policies ───────────────────────────────────────────────────────

/**
 * Built-in routing policies for common scenarios.
 */
export const BUILT_IN_POLICIES: Record<string, ExecutionRoutingPolicy> = {
    /**
     * Safe default: all phases run stateless via ACP.
     * No session reuse, bounded execution.
     */
    safe: {
        defaultAdapterId: buildAcpAdapterId('pi', 'stateless'),
        defaultMode: 'stateless',
        phaseOverrides: {},
        channelOverrides: {},
    },

    /**
     * Debug policy: all phases run via local/mock executor.
     * Useful for testing without ACP overhead.
     */
    local: {
        defaultAdapterId: 'local',
        defaultMode: 'stateless',
        phaseOverrides: {},
        channelOverrides: {},
    },

    /**
     * Optimization policy: uses sessioned ACP for specific phases.
     * Use only when session semantics are explicitly needed.
     */
    sessioned: {
        defaultAdapterId: buildAcpAdapterId('pi', 'sessioned'),
        defaultMode: 'sessioned',
        phaseOverrides: {},
        channelOverrides: {},
    },
};

/**
 * Get built-in policy by name.
 */
export function getBuiltInPolicy(name: string): ExecutionRoutingPolicy | undefined {
    return BUILT_IN_POLICIES[name];
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validate a routing policy configuration.
 * Returns array of validation errors (empty if valid).
 */
export function validatePolicyConfig(config: PolicyConfig): string[] {
    const errors: string[] = [];

    // Validate default mode
    if (config.default_mode && !['stateless', 'sessioned'].includes(config.default_mode)) {
        errors.push(`Invalid default_mode: ${config.default_mode}. Must be "stateless" or "sessioned".`);
    }

    // Validate phase overrides
    if (config.phase_overrides) {
        for (const [phase, override] of Object.entries(config.phase_overrides)) {
            if (override.mode && !['stateless', 'sessioned'].includes(override.mode)) {
                errors.push(`Invalid mode for phase "${phase}": ${override.mode}. Must be "stateless" or "sessioned".`);
            }
        }
    }

    // Validate channel overrides
    if (config.channel_overrides) {
        for (const [channel, override] of Object.entries(config.channel_overrides)) {
            if (override.mode && !['stateless', 'sessioned'].includes(override.mode)) {
                errors.push(
                    `Invalid mode for channel "${channel}": ${override.mode}. Must be "stateless" or "sessioned".`,
                );
            }
        }
    }

    return errors;
}

// ─── CLI Helpers ─────────────────────────────────────────────────────────────

/**
 * Format routing policy for CLI display.
 */
export function formatPolicyForDisplay(policy: ExecutionRoutingPolicy): string {
    const lines: string[] = [];

    lines.push(`Default Adapter: ${policy.defaultAdapterId}`);
    lines.push(`Default Mode: ${policy.defaultMode}`);
    lines.push('');

    if (policy.phaseOverrides && Object.keys(policy.phaseOverrides).length > 0) {
        lines.push('Phase Overrides:');
        for (const [phase, override] of Object.entries(policy.phaseOverrides)) {
            const mode = override.executionMode ? ` (${override.executionMode})` : '';
            lines.push(`  ${phase}: ${override.adapterId}${mode}`);
        }
        lines.push('');
    }

    if (policy.channelOverrides && Object.keys(policy.channelOverrides).length > 0) {
        lines.push('Channel Overrides:');
        for (const [channel, override] of Object.entries(policy.channelOverrides)) {
            const mode = override.executionMode ? ` (${override.executionMode})` : '';
            lines.push(`  ${channel}: ${override.adapterId}${mode}`);
        }
        lines.push('');
    }

    return lines.join('\n');
}
