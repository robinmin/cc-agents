/**
 * policy.ts tests
 *
 * Tests for execution routing policy.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'bun:test';
import {
    buildAcpAdapterId,
    configToPolicy,
    materializePolicyChannels,
    policyToConfig,
    validatePolicyConfig,
    formatPolicyForDisplay,
    getBuiltInPolicy,
    BUILT_IN_POLICIES,
} from './policy';

// Store original env
const originalEnv = { ...process.env };

beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
    delete process.env.ORCHESTRATION_DEFAULT_MODE;
});

afterEach(() => {
    // Restore env after each test
    process.env = { ...originalEnv };
});

describe('configToPolicy', () => {
    it('converts basic config', () => {
        const config = {
            default_adapter: 'acp:pi',
            default_mode: 'stateless' as const,
        };

        const policy = configToPolicy(config, 'fallback');

        expect(policy.defaultAdapterId).toBe('acp-oneshot:pi');
        expect(policy.defaultMode).toBe('stateless');
    });

    it('converts phase overrides', () => {
        const config = {
            default_adapter: 'acp:pi',
            phase_overrides: {
                implement: { adapter: 'local', mode: 'stateless' as const },
            },
        };

        const policy = configToPolicy(config, 'fallback');

        expect(policy.phaseOverrides).toBeDefined();
        expect(policy.phaseOverrides?.implement?.adapterId).toBe('local');
        expect(policy.phaseOverrides?.implement?.executionMode).toBe('stateless');
    });

    it('converts channel overrides', () => {
        const config = {
            default_adapter: 'acp:pi',
            channel_overrides: {
                codex: { adapter: 'acp:codex', mode: 'sessioned' as const },
            },
        };

        const policy = configToPolicy(config, 'fallback');

        expect(policy.channelOverrides).toBeDefined();
        expect(policy.channelOverrides?.codex?.adapterId).toBe('acp-session:codex');
        expect(policy.channelOverrides?.codex?.executionMode).toBe('sessioned');
    });

    it('uses fallback adapter when not specified', () => {
        const config = {};

        const policy = configToPolicy(config, 'acp-oneshot:pi');

        expect(policy.defaultAdapterId).toBe('acp-oneshot:pi');
    });

    it('defaults to stateless mode', () => {
        const config = {};

        const policy = configToPolicy(config, 'acp-oneshot:pi');

        expect(policy.defaultMode).toBe('stateless');
    });
});

describe('materializePolicyChannels', () => {
    it('keeps local as the default while materializing external channel overrides', () => {
        const policy = materializePolicyChannels(
            {
                defaultAdapterId: 'local',
                defaultMode: 'stateless',
            },
            ['pi', 'codex'],
        );

        expect(policy.defaultAdapterId).toBe('local');
        expect(policy.channelOverrides?.pi?.adapterId).toBe('acp-oneshot:pi');
        expect(policy.channelOverrides?.codex?.adapterId).toBe('acp-oneshot:codex');
    });

    it('creates channel-specific ACP overrides from the default policy', () => {
        const policy = materializePolicyChannels(
            {
                defaultAdapterId: 'acp-oneshot:pi',
                defaultMode: 'stateless',
            },
            ['pi', 'codex'],
        );

        expect(policy.channelOverrides?.pi?.adapterId).toBe('acp-oneshot:pi');
        expect(policy.channelOverrides?.codex?.adapterId).toBe('acp-oneshot:codex');
    });

    it('normalizes legacy ACP adapter ids while preserving mode', () => {
        const policy = materializePolicyChannels(
            {
                defaultAdapterId: 'acp:pi',
                defaultMode: 'sessioned',
            },
            ['pi'],
        );

        expect(policy.defaultAdapterId).toBe('acp-session:pi');
        expect(policy.channelOverrides?.pi?.adapterId).toBe('acp-session:pi');
    });

    it('normalizes existing phase and channel overrides', () => {
        const policy = materializePolicyChannels(
            {
                defaultAdapterId: 'acp:pi',
                defaultMode: 'stateless',
                phaseOverrides: {
                    implement: {
                        adapterId: 'acp:codex',
                    },
                },
                channelOverrides: {
                    codex: {
                        adapterId: 'acp:codex',
                        executionMode: 'sessioned',
                    },
                },
            },
            ['pi', 'codex'],
        );

        expect(policy.phaseOverrides?.implement).toEqual({
            adapterId: 'acp-oneshot:codex',
        });
        expect(policy.channelOverrides?.codex).toEqual({
            adapterId: 'acp-session:codex',
            executionMode: 'sessioned',
        });
        expect(policy.channelOverrides?.pi).toEqual({
            adapterId: 'acp-oneshot:pi',
            executionMode: 'stateless',
        });
    });
});

describe('policyToConfig', () => {
    it('converts policy to config', () => {
        const policy = {
            defaultAdapterId: 'acp-oneshot:pi',
            defaultMode: 'stateless' as const,
            phaseOverrides: {
                implement: { adapterId: 'local' },
            },
            channelOverrides: {
                codex: { adapterId: 'acp-session:codex', executionMode: 'sessioned' as const },
            },
        };

        const config = policyToConfig(policy);

        expect(config.default_adapter).toBe('acp-oneshot:pi');
        expect(config.default_mode).toBe('stateless');
        expect(config.phase_overrides?.implement?.adapter).toBe('local');
        expect(config.channel_overrides?.codex?.adapter).toBe('acp-session:codex');
        expect(config.channel_overrides?.codex?.mode).toBe('sessioned');
    });

    it('omits empty overrides', () => {
        const policy = {
            defaultAdapterId: 'acp-oneshot:pi',
            defaultMode: 'stateless' as const,
        };

        const config = policyToConfig(policy);

        expect(config.phase_overrides).toBeUndefined();
        expect(config.channel_overrides).toBeUndefined();
    });
});

describe('validatePolicyConfig', () => {
    it('returns no errors for valid config', () => {
        const config = {
            default_mode: 'stateless' as const,
            phase_overrides: {
                implement: { mode: 'sessioned' as const },
            },
        };

        const errors = validatePolicyConfig(config);

        expect(errors).toHaveLength(0);
    });

    it('returns error for invalid default mode', () => {
        const config = {
            default_mode: 'invalid' as unknown as 'stateless' | 'sessioned',
        };

        const errors = validatePolicyConfig(config);

        expect(errors).toContain('Invalid default_mode: invalid. Must be "stateless" or "sessioned".');
    });

    it('returns error for invalid phase mode', () => {
        const config = {
            phase_overrides: {
                implement: { mode: 'invalid' as unknown as 'stateless' | 'sessioned' },
            },
        };

        const errors = validatePolicyConfig(config);

        expect(errors).toContain('Invalid mode for phase "implement": invalid. Must be "stateless" or "sessioned".');
    });

    it('returns error for invalid channel mode', () => {
        const config = {
            channel_overrides: {
                pi: { mode: 'invalid' as unknown as 'stateless' | 'sessioned' },
            },
        };

        const errors = validatePolicyConfig(config);

        expect(errors).toContain('Invalid mode for channel "pi": invalid. Must be "stateless" or "sessioned".');
    });
});

describe('formatPolicyForDisplay', () => {
    it('formats basic policy', () => {
        const policy = {
            defaultAdapterId: 'acp-oneshot:pi',
            defaultMode: 'stateless' as const,
        };

        const output = formatPolicyForDisplay(policy);

        expect(output).toContain('Default Adapter: acp-oneshot:pi');
        expect(output).toContain('Default Mode: stateless');
    });

    it('formats phase overrides', () => {
        const policy = {
            defaultAdapterId: 'acp-oneshot:pi',
            defaultMode: 'stateless' as const,
            phaseOverrides: {
                implement: { adapterId: 'local' },
            },
        };

        const output = formatPolicyForDisplay(policy);

        expect(output).toContain('Phase Overrides:');
        expect(output).toContain('implement: local');
    });

    it('formats channel overrides with mode', () => {
        const policy = {
            defaultAdapterId: 'acp-session:pi',
            defaultMode: 'sessioned' as const,
            channelOverrides: {
                codex: { adapterId: 'acp-session:codex', executionMode: 'sessioned' as const },
            },
        };

        const output = formatPolicyForDisplay(policy);

        expect(output).toContain('Channel Overrides:');
        expect(output).toContain('codex: acp-session:codex (sessioned)');
    });
});

// We need to mock before importing loadRoutingPolicy
const mockResolveConfig = vi.fn();
const mockLoadExternalConfig = vi.fn();

vi.mock('../config/config', () => ({
    resolveConfig: mockResolveConfig,
    loadExternalConfig: mockLoadExternalConfig,
}));

// Must import after mock setup
import { loadRoutingPolicy } from './policy';

describe('loadRoutingPolicy', () => {
    beforeEach(() => {
        mockResolveConfig.mockReset();
        mockResolveConfig.mockReturnValue({});
        mockLoadExternalConfig.mockReset();
        mockLoadExternalConfig.mockReturnValue(null);
    });

    it('returns default stateless policy when no config', () => {
        const policy = loadRoutingPolicy('local');

        expect(policy.defaultAdapterId).toBe('local');
        expect(policy.defaultMode).toBe('stateless');
    });

    it('uses custom adapter id when provided', () => {
        const policy = loadRoutingPolicy('direct');

        expect(policy.defaultAdapterId).toBe('direct');
    });

    it('uses routing config from config file', () => {
        mockLoadExternalConfig.mockReturnValue({
            routing: {
                default_adapter: 'local',
                default_mode: 'sessioned',
            },
        });

        const policy = loadRoutingPolicy('acp-oneshot:pi');

        expect(policy.defaultAdapterId).toBe('local');
        expect(policy.defaultMode).toBe('sessioned');
    });

    it('uses environment variable for sessioned mode', () => {
        process.env.ORCHESTRATION_DEFAULT_MODE = 'sessioned';

        const policy = loadRoutingPolicy('acp-oneshot:pi');

        expect(policy.defaultMode).toBe('sessioned');
    });

    it('config file takes precedence over env var', () => {
        process.env.ORCHESTRATION_DEFAULT_MODE = 'sessioned';
        mockLoadExternalConfig.mockReturnValue({
            routing: {
                default_adapter: 'local',
                default_mode: 'stateless',
            },
        });

        const policy = loadRoutingPolicy('acp-oneshot:pi');

        // Config is checked first, so env var is ignored
        expect(policy.defaultAdapterId).toBe('local');
        expect(policy.defaultMode).toBe('stateless');
    });
});

describe('Built-in Policies', () => {
    it('safe policy uses stateless by default', () => {
        const policy = getBuiltInPolicy('safe');

        expect(policy?.defaultAdapterId).toBe('local');
        expect(policy?.defaultMode).toBe('stateless');
    });

    it('local policy uses local executor', () => {
        const policy = getBuiltInPolicy('local');

        expect(policy?.defaultAdapterId).toBe('local');
        expect(policy?.defaultMode).toBe('stateless');
    });

    it('sessioned policy uses sessioned mode', () => {
        const policy = getBuiltInPolicy('sessioned');

        expect(policy?.defaultAdapterId).toBe('acp-session:pi');
        expect(policy?.defaultMode).toBe('sessioned');
    });

    it('returns undefined for unknown policy', () => {
        const policy = getBuiltInPolicy('unknown');

        expect(policy).toBeUndefined();
    });

    it('all built-in policies are valid', () => {
        for (const [_name, policy] of Object.entries(BUILT_IN_POLICIES)) {
            const errors = validatePolicyConfig(policyToConfig(policy));
            expect(errors).toHaveLength(0);
        }
    });

    it('exposes adapter ids that match the registered ACP adapters', () => {
        expect(BUILT_IN_POLICIES.safe.defaultAdapterId).toBe('local');
        expect(BUILT_IN_POLICIES.sessioned.defaultAdapterId).toBe(buildAcpAdapterId('pi', 'sessioned'));
    });
});
