/**
 * Base Adapter Interface for rd3:cc-skills
 *
 * Platform adapters extend this interface to provide platform-specific
 * validation, companion file generation, and feature detection.
 *
 * All adapters follow a consistent interface for extensibility.
 */

import type {
    AdapterContext,
    AdapterResult,
    IPlatformAdapter,
    Platform,
    ScaffoldOptions,
    Skill,
    ValidationResult,
} from '../types';

/**
 * Abstract base adapter with common functionality
 * Platform-specific adapters should extend this class
 */
export abstract class BaseAdapter implements IPlatformAdapter {
    abstract readonly platform: Platform;
    abstract readonly displayName: string;

    /**
     * Validate skill for platform compatibility
     * Override to add platform-specific validation rules
     */
    async validate(skill: Skill): Promise<AdapterResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check if skill name matches directory name (required by most platforms)
        const expectedName = skill.directory.split('/').pop();
        if (skill.frontmatter.name !== expectedName) {
            errors.push(`Skill name '${skill.frontmatter.name}' does not match directory name '${expectedName}'`);
        }

        // Check description length
        if (skill.frontmatter.description.length > 1024) {
            warnings.push(`Description exceeds 1024 characters (${skill.frontmatter.description.length})`);
        }

        // Platform-specific validation
        const platformResult = await this.validatePlatform(skill);
        errors.push(...platformResult.errors);
        warnings.push(...platformResult.warnings);

        return {
            success: errors.length === 0,
            companions: [],
            errors,
            warnings,
        };
    }

    /**
     * Generate platform-specific companion files
     * Override to generate files like agents/openai.yaml
     */
    async generateCompanions(context: AdapterContext): Promise<AdapterResult> {
        const files: Record<string, string> = {};
        const companions: string[] = [];

        // Platform-specific companion generation
        const platformFiles = await this.generatePlatformCompanions(context);
        Object.assign(files, platformFiles);

        // Track companion file paths
        for (const filePath of Object.keys(files)) {
            companions.push(filePath);
        }

        return {
            success: true,
            files,
            companions,
            errors: [],
            warnings: [],
            messages: [],
        };
    }

    /**
     * Detect platform-specific features in skill
     * Override to scan for platform-specific syntax
     */
    detectPlatformFeatures(skill: Skill): string[] {
        const features: string[] = [];

        // Platform-specific feature detection
        const platformFeatures = this.detectPlatformSpecificFeatures(skill);
        features.push(...platformFeatures);

        return features;
    }

    /**
     * Platform-specific validation
     * Override in subclasses
     */
    protected async validatePlatform(_skill: Skill): Promise<ValidationResult> {
        return { valid: true, errors: [], warnings: [] };
    }

    /**
     * Platform-specific companion generation
     * Override in subclasses
     */
    protected async generatePlatformCompanions(_context: AdapterContext): Promise<Record<string, string>> {
        return {};
    }

    /**
     * Platform-specific feature detection
     * Override in subclasses
     */
    protected detectPlatformSpecificFeatures(_skill: Skill): string[] {
        return [];
    }
}

/**
 * Adapter registry for managing all platform adapters
 */
export class AdapterRegistry {
    private adapters: Map<Platform, IPlatformAdapter> = new Map();

    /**
     * Register a platform adapter
     */
    register(adapter: IPlatformAdapter): void {
        this.adapters.set(adapter.platform, adapter);
    }

    /**
     * Get adapter by platform
     */
    get(platform: Platform): IPlatformAdapter | undefined {
        return this.adapters.get(platform);
    }

    /**
     * Get all registered adapters
     */
    getAll(): IPlatformAdapter[] {
        return Array.from(this.adapters.values());
    }

    /**
     * Check if adapter exists for platform
     */
    has(platform: Platform): boolean {
        return this.adapters.has(platform);
    }

    /**
     * Get list of supported platforms
     */
    getSupportedPlatforms(): Platform[] {
        return Array.from(this.adapters.keys());
    }
}

/**
 * Global adapter registry instance
 */
export const adapterRegistry = new AdapterRegistry();

/**
 * Helper function to create adapter context
 */
export function createAdapterContext(skill: Skill, options: ScaffoldOptions, outputPath: string): AdapterContext {
    return {
        skill,
        options,
        outputPath,
        skillPath: skill.path,
        skillName: skill.frontmatter.name,
        frontmatter: skill.frontmatter,
        body: skill.body,
        resources: skill.resources,
    };
}
