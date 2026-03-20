/**
 * Base Adapter for rd3:cc-agents
 *
 * Platform adapters extend this abstract class to provide platform-specific
 * parsing, validation, generation, and feature detection for agent definitions.
 *
 * Key difference from cc-skills/cc-commands adapters:
 * - Agent adapters have a `parse()` method for bidirectional conversion
 * - Agents are parsed FROM platform format into UAM, and generated TO platform format from UAM
 * - The interface is `IAgentPlatformAdapter` (not `IPlatformAdapter`)
 */

import type {
    AgentAdapterContext,
    AgentAdapterResult,
    AgentParseResult,
    AgentPlatform,
    IAgentPlatformAdapter,
    UniversalAgent,
} from '../types';

/**
 * Abstract base adapter with common functionality.
 * Platform-specific adapters should extend this class and implement
 * the abstract/protected methods.
 */
export abstract class BaseAgentAdapter implements IAgentPlatformAdapter {
    abstract readonly platform: AgentPlatform;
    abstract readonly displayName: string;

    protected constructor() {}

    /**
     * Parse platform-native format into UAM.
     * Must be implemented by each platform adapter.
     */
    abstract parse(input: string, filePath: string): Promise<AgentParseResult>;

    /**
     * Validate agent for platform compatibility.
     * Runs common checks, then delegates to platform-specific validation.
     */
    async validate(agent: UniversalAgent): Promise<AgentAdapterResult> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const messages: string[] = [];

        // Common validation: required fields
        if (!agent.name || agent.name.trim().length === 0) {
            errors.push('Agent name is required');
        } else if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(agent.name)) {
            warnings.push(`Agent name '${agent.name}' should be lowercase hyphen-case`);
        }

        if (!agent.description || agent.description.trim().length === 0) {
            errors.push('Agent description is required');
        }

        if (!agent.body || agent.body.trim().length === 0) {
            errors.push('Agent body (system prompt) is required');
        }

        // Platform-specific validation
        const platformResult = await this.validatePlatform(agent);
        errors.push(...platformResult.errors);
        warnings.push(...platformResult.warnings);
        if (platformResult.messages) {
            messages.push(...platformResult.messages);
        }

        return {
            success: errors.length === 0,
            companions: [],
            errors,
            warnings,
            messages,
        };
    }

    /**
     * Generate platform-native output from UAM.
     * Runs common pre-checks, then delegates to platform-specific generation.
     */
    async generate(agent: UniversalAgent, context: AgentAdapterContext): Promise<AgentAdapterResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Pre-check: agent must have required fields
        if (!agent.name) {
            errors.push('Cannot generate: agent name is missing');
            return { success: false, companions: [], errors, warnings };
        }
        if (!agent.body) {
            errors.push('Cannot generate: agent body is missing');
            return { success: false, companions: [], errors, warnings };
        }

        // Platform-specific generation
        return this.generatePlatform(agent, context);
    }

    /**
     * Detect platform-specific features used by an agent.
     * Returns an array of feature identifiers.
     */
    detectFeatures(agent: UniversalAgent): string[] {
        const features: string[] = [];

        // Common feature detection
        if (agent.tools?.length) features.push('tools');
        if (agent.model) features.push('model');

        // Platform-specific feature detection
        const platformFeatures = this.detectPlatformFeatures(agent);
        features.push(...platformFeatures);

        return features;
    }

    // ========================================================================
    // Protected methods for subclass override
    // ========================================================================

    /**
     * Platform-specific validation.
     * Override in subclasses to add platform-specific checks.
     */
    protected async validatePlatform(
        _agent: UniversalAgent,
    ): Promise<{ errors: string[]; warnings: string[]; messages?: string[] }> {
        return { errors: [], warnings: [] };
    }

    /**
     * Platform-specific generation.
     * Must be implemented by subclasses.
     */
    protected abstract generatePlatform(
        agent: UniversalAgent,
        context: AgentAdapterContext,
    ): Promise<AgentAdapterResult>;

    /**
     * Platform-specific feature detection.
     * Override in subclasses to detect platform-specific features.
     */
    protected detectPlatformFeatures(_agent: UniversalAgent): string[] {
        return [];
    }
}

/**
 * Helper function to create an AgentAdapterContext.
 */
export function createAgentAdapterContext(
    agent: UniversalAgent,
    outputPath: string,
    targetPlatform: AgentPlatform,
): AgentAdapterContext {
    return {
        agent,
        outputPath,
        targetPlatform,
    };
}
