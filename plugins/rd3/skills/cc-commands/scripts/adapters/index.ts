/**
 * Platform Adapters for rd3:cc-commands
 *
 * Exports all platform adapters for command adaptation.
 */

export {
    BaseCommandAdapter,
    createCommandAdapterContext,
    convertToImperative,
    convertArgumentSyntax,
    convertPseudocodeToNaturalLanguage,
    truncateDescription,
    inferArgumentHints,
} from './base';
export type { ICommandPlatformAdapter } from '../types';

export { createClaudeAdapter, ClaudeCommandAdapter } from './claude';
export type { ClaudeAdapterOptions } from './claude';

export { createCodexAdapter, CodexCommandAdapter } from './codex';
export type { CodexAdapterOptions, OpenAIYAML } from './codex';

export { createGeminiAdapter, GeminiCommandAdapter } from './gemini';
export type { GeminiAdapterOptions, GeminiCommand } from './gemini';

export { createOpenClawAdapter, OpenClawCommandAdapter } from './openclaw';
export type { OpenClawAdapterOptions, OpenClawMetadata } from './openclaw';

export { createOpenCodeAdapter, OpenCodeCommandAdapter } from './opencode';
export type { OpenCodeAdapterOptions, OpenCodePermissions } from './opencode';

export { createAntigravityAdapter, AntigravityCommandAdapter } from './antigravity';
export type { AntigravityAdapterOptions } from './antigravity';

// ============================================================================
// Adapter Registry
// ============================================================================

import type { CommandPlatform, ICommandPlatformAdapter } from '../types';
import { createAntigravityAdapter } from './antigravity';
import { createClaudeAdapter } from './claude';
import { createCodexAdapter } from './codex';
import { createGeminiAdapter } from './gemini';
import { createOpenClawAdapter } from './openclaw';
import { createOpenCodeAdapter } from './opencode';

/**
 * Adapter Registry - manages platform adapter lifecycle.
 *
 * Provides lazy instantiation and caching of platform adapters.
 */
export class AdapterRegistry {
    private cache = new Map<CommandPlatform, ICommandPlatformAdapter>();

    private readonly factories: Record<CommandPlatform, () => ICommandPlatformAdapter> = {
        claude: createClaudeAdapter,
        codex: createCodexAdapter,
        gemini: createGeminiAdapter,
        openclaw: createOpenClawAdapter,
        opencode: createOpenCodeAdapter,
        antigravity: createAntigravityAdapter,
    };

    /** Get adapter for a specific platform (lazy-instantiated and cached) */
    get(platform: CommandPlatform): ICommandPlatformAdapter {
        let adapter = this.cache.get(platform);
        if (!adapter) {
            const factory = this.factories[platform];
            if (!factory) throw new Error(`Unknown platform: ${platform}`);
            adapter = factory();
            this.cache.set(platform, adapter);
        }
        return adapter;
    }

    /** Get all platform adapters */
    getAll(): Record<CommandPlatform, ICommandPlatformAdapter> {
        const result = {} as Record<CommandPlatform, ICommandPlatformAdapter>;
        for (const platform of Object.keys(this.factories) as CommandPlatform[]) {
            result[platform] = this.get(platform);
        }
        return result;
    }

    /** List all registered platform names */
    get platforms(): CommandPlatform[] {
        return Object.keys(this.factories) as CommandPlatform[];
    }

    /** Clear cached adapters */
    clear(): void {
        this.cache.clear();
    }
}

/** Shared registry instance */
export const adapterRegistry = new AdapterRegistry();

/**
 * Get all platform adapters (convenience function)
 */
export function getAllAdapters() {
    return adapterRegistry.getAll();
}

/**
 * Get adapter by platform name (convenience function)
 */
export function getAdapter(platform: CommandPlatform) {
    return adapterRegistry.get(platform);
}
