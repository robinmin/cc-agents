/**
 * Platform Adapters for rd3:cc-agents
 *
 * Exports all platform adapters for agent adaptation.
 * All 6 platforms are implemented:
 * - Claude Code (Phase 1)
 * - Gemini CLI (Phase 4)
 * - OpenCode (Phase 4)
 * - Codex (Phase 4)
 * - OpenClaw (Phase 4)
 * - Antigravity (Phase 4)
 */

export { BaseAgentAdapter, createAgentAdapterContext } from './base';

export { ClaudeAgentAdapter, createClaudeAgentAdapter } from './claude';
export type { ClaudeAgentAdapterOptions } from './claude';

export { GeminiAgentAdapter, createGeminiAgentAdapter } from './gemini';
export type { GeminiAgentAdapterOptions } from './gemini';

export { OpenCodeAgentAdapter, createOpenCodeAgentAdapter } from './opencode';
export type { OpenCodeAgentAdapterOptions } from './opencode';

export { CodexAgentAdapter, createCodexAgentAdapter } from './codex';
export type { CodexAgentAdapterOptions } from './codex';

export { OpenClawAgentAdapter, createOpenClawAgentAdapter } from './openclaw';
export type { OpenClawAgentAdapterOptions } from './openclaw';

export { AntigravityAgentAdapter, createAntigravityAgentAdapter } from './antigravity';
export type { AntigravityAgentAdapterOptions } from './antigravity';

// Re-export adapter interface type
export type { IAgentPlatformAdapter } from '../types';

// ============================================================================
// Adapter Registry
// ============================================================================

import type { AgentPlatform, IAgentPlatformAdapter } from '../types';
import { createAntigravityAgentAdapter } from './antigravity';
import { createClaudeAgentAdapter } from './claude';
import { createCodexAgentAdapter } from './codex';
import { createGeminiAgentAdapter } from './gemini';
import { createOpenClawAgentAdapter } from './openclaw';
import { createOpenCodeAgentAdapter } from './opencode';

/**
 * Adapter Registry -- manages platform adapter lifecycle.
 *
 * Provides lazy instantiation and caching of platform adapters.
 * All 6 platforms are registered.
 */
export class AgentAdapterRegistry {
    private cache: Map<AgentPlatform, IAgentPlatformAdapter>;

    private readonly factories: Partial<Record<AgentPlatform, () => IAgentPlatformAdapter>>;

    constructor() {
        this.cache = new Map<AgentPlatform, IAgentPlatformAdapter>();
        this.factories = {
            claude: createClaudeAgentAdapter,
            gemini: createGeminiAgentAdapter,
            opencode: createOpenCodeAgentAdapter,
            codex: createCodexAgentAdapter,
            openclaw: createOpenClawAgentAdapter,
            antigravity: createAntigravityAgentAdapter,
        };
    }

    /** Get adapter for a specific platform (lazy-instantiated and cached) */
    get(platform: AgentPlatform): IAgentPlatformAdapter {
        let adapter = this.cache.get(platform);
        if (!adapter) {
            const factory = this.factories[platform];
            if (!factory) throw new Error(`No adapter registered for platform: ${platform}`);
            adapter = factory();
            this.cache.set(platform, adapter);
        }
        return adapter;
    }

    /** Check if an adapter is available for a platform */
    has(platform: AgentPlatform): boolean {
        return platform in this.factories;
    }

    /** Get all registered platform adapters */
    getAll(): Partial<Record<AgentPlatform, IAgentPlatformAdapter>> {
        const result: Partial<Record<AgentPlatform, IAgentPlatformAdapter>> = {};
        for (const platform of Object.keys(this.factories) as AgentPlatform[]) {
            result[platform] = this.get(platform);
        }
        return result;
    }

    /** List all registered platform names */
    get platforms(): AgentPlatform[] {
        return Object.keys(this.factories) as AgentPlatform[];
    }

    /** Register a new platform adapter factory */
    register(platform: AgentPlatform, factory: () => IAgentPlatformAdapter): void {
        this.factories[platform] = factory;
        // Clear cache for this platform if it was previously instantiated
        this.cache.delete(platform);
    }

    /** Clear cached adapters */
    clear(): void {
        this.cache.clear();
    }
}

/** Shared registry instance */
export const agentAdapterRegistry = new AgentAdapterRegistry();

/**
 * Get adapter by platform name (convenience function).
 */
export function getAgentAdapter(platform: AgentPlatform): IAgentPlatformAdapter {
    return agentAdapterRegistry.get(platform);
}

/**
 * Check if adapter exists for platform (convenience function).
 */
export function hasAgentAdapter(platform: AgentPlatform): boolean {
    return agentAdapterRegistry.has(platform);
}
