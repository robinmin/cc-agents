/**
 * Platform Adapters for rd3:cc-magents
 *
 * Exports all platform adapters for main agent config adaptation.
 * Phase 1: Tier 1 adapters (AGENTS.md, CLAUDE.md)
 * Phase 4: Tier 2 adapters (cursorrules, windsurfrules, zed-rules, opencode-rules)
 * Phase 4: Tier 3 adapters (junie, vscode, augment, cline)
 */

export { BaseMagentAdapter } from './base';

export { AgentsMdAdapter, createAgentsMdAdapter } from './agents-md';
export type { AgentsMdAdapterOptions } from './agents-md';

export { ClaudeMdAdapter, createClaudeMdAdapter } from './claude-md';
export type { ClaudeMdAdapterOptions } from './claude-md';

// Phase 4: Tier 2 adapters
export { CursorAdapter, createCursorAdapter } from './cursor';
export type { CursorAdapterOptions } from './cursor';

export { WindsurfAdapter, createWindsurfAdapter } from './windsurf';
export type { WindsurfAdapterOptions } from './windsurf';

export { ZedAdapter, createZedAdapter } from './zed';
export type { ZedAdapterOptions } from './zed';

export { OpenCodeAdapter, createOpenCodeAdapter } from './opencode';
export type { OpenCodeAdapterOptions } from './opencode';

// Phase 4: Tier 3 adapters (generate-only)
export { JunieAdapter, createJunieAdapter } from './junie';
export type { JunieAdapterOptions } from './junie';

export { VSCodeAdapter, createVSCodeAdapter } from './vscode';
export type { VSCodeAdapterOptions } from './vscode';

export { AugmentAdapter, createAugmentAdapter } from './augment';
export type { AugmentAdapterOptions } from './augment';

export { ClineAdapter, createClineAdapter } from './cline';
export type { ClineAdapterOptions } from './cline';

// Re-export adapter interface type
export type { IMagentPlatformAdapter } from '../types';

// ============================================================================
// Adapter Registry
// ============================================================================

import type { IMagentPlatformAdapter, MagentPlatform } from '../types';
import { createAgentsMdAdapter } from './agents-md';
import { createAugmentAdapter } from './augment';
import { createClaudeMdAdapter } from './claude-md';
import { createClineAdapter } from './cline';
import { createCursorAdapter } from './cursor';
import { createJunieAdapter } from './junie';
import { createOpenCodeAdapter } from './opencode';
import { createVSCodeAdapter } from './vscode';
import { createWindsurfAdapter } from './windsurf';
import { createZedAdapter } from './zed';

/**
 * Adapter Registry -- manages platform adapter lifecycle.
 *
 * Provides lazy instantiation and caching of platform adapters.
 * New adapters can be registered dynamically for extensibility.
 */
export class MagentAdapterRegistry {
    private cache = new Map<MagentPlatform, IMagentPlatformAdapter>();

    private readonly factories: Partial<Record<MagentPlatform, () => IMagentPlatformAdapter>> = {
        // Tier 1: Full support (parse + generate + validate)
        'agents-md': createAgentsMdAdapter,
        'claude-md': createClaudeMdAdapter,
        // Tier 2: Standard support (parse + generate)
        cursorrules: createCursorAdapter,
        windsurfrules: createWindsurfAdapter,
        'zed-rules': createZedAdapter,
        'opencode-rules': createOpenCodeAdapter,
        // Tier 3: Basic support (generate only)
        junie: createJunieAdapter,
        'vscode-instructions': createVSCodeAdapter,
        augment: createAugmentAdapter,
        cline: createClineAdapter,
        // Note: 'gemini-md' and 'codex' will be added in future phases
    };

    /** Get adapter for a specific platform (lazy-instantiated and cached) */
    get(platform: MagentPlatform): IMagentPlatformAdapter {
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
    has(platform: MagentPlatform): boolean {
        return platform in this.factories;
    }

    /** Get all registered platform adapters */
    getAll(): Partial<Record<MagentPlatform, IMagentPlatformAdapter>> {
        const result: Partial<Record<MagentPlatform, IMagentPlatformAdapter>> = {};
        for (const platform of Object.keys(this.factories) as MagentPlatform[]) {
            result[platform] = this.get(platform);
        }
        return result;
    }

    /** List all registered platform names */
    get platforms(): MagentPlatform[] {
        return Object.keys(this.factories) as MagentPlatform[];
    }

    /** Register a new platform adapter factory */
    register(platform: MagentPlatform, factory: () => IMagentPlatformAdapter): void {
        this.factories[platform] = factory;
        this.cache.delete(platform);
    }

    /** Clear cached adapters */
    clear(): void {
        this.cache.clear();
    }
}

/** Shared registry instance */
export const magentAdapterRegistry = new MagentAdapterRegistry();

/**
 * Get adapter by platform name (convenience function).
 */
export function getMagentAdapter(platform: MagentPlatform): IMagentPlatformAdapter {
    return magentAdapterRegistry.get(platform);
}

/**
 * Check if adapter exists for platform (convenience function).
 */
export function hasMagentAdapter(platform: MagentPlatform): boolean {
    return magentAdapterRegistry.has(platform);
}

/**
 * Detect the appropriate adapter for a file based on its path.
 * Returns the platform and adapter, or null if no match.
 */
export function detectAdapter(filePath: string): { platform: MagentPlatform; adapter: IMagentPlatformAdapter } | null {
    // Import here to avoid circular dependency
    const { detectPlatform } = require('../utils');
    const platform = detectPlatform(filePath) as MagentPlatform | null;

    if (!platform) return null;
    if (!magentAdapterRegistry.has(platform)) return null;

    return {
        platform,
        adapter: magentAdapterRegistry.get(platform),
    };
}
