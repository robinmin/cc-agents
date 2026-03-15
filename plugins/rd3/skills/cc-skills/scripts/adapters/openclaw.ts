/**
 * OpenClaw Adapter for rd3:cc-skills
 *
 * Handles OpenClaw-specific metadata and configuration
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import type { AdapterContext, AdapterResult, Skill } from '../types';

export interface OpenClawAdapterOptions {
    generateMetadata?: boolean;
}

/**
 * OpenClaw Adapter
 * Handles OpenClaw-specific metadata.openclaw configuration
 */
export class OpenClawAdapter {
    readonly platform = 'openclaw' as const;
    readonly displayName = 'OpenClaw';
    options: OpenClawAdapterOptions;

    constructor(options: OpenClawAdapterOptions = {}) {
        this.options = {
            generateMetadata: true,
            ...options,
        };
    }

    async validate(skill: Skill): Promise<AdapterResult> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const messages: string[] = [];

        const skillPath = skill.directory;

        // Check for metadata.openclaw in frontmatter
        const fm = skill.frontmatter;
        if (fm.metadata?.openclaw) {
            const openclaw = fm.metadata.openclaw as Record<string, unknown>;

            // Validate emoji
            if (openclaw.emoji !== undefined && typeof openclaw.emoji !== 'string') {
                errors.push('metadata.openclaw.emoji must be a string');
            }

            // Validate requires
            if (openclaw.requires) {
                const requires = openclaw.requires as Record<string, unknown>;
                if (requires.bins && !Array.isArray(requires.bins)) {
                    errors.push('metadata.openclaw.requires.bins must be an array');
                }
                if (requires.env && !Array.isArray(requires.env)) {
                    errors.push('metadata.openclaw.requires.env must be an array');
                }
            }

            messages.push('Valid OpenClaw metadata found');
        } else {
            warnings.push('No metadata.openclaw found - OpenClaw will use defaults');
        }

        // Check for metadata.openclaw file (alternative location)
        const metadataFile = join(skillPath, 'metadata.openclaw');
        if (existsSync(metadataFile)) {
            messages.push('Found metadata.openclaw file');
            try {
                const content = readFileSync(metadataFile, 'utf-8');
                YAML.parse(content);
                messages.push('metadata.openclaw is valid YAML');
            } catch (e) {
                errors.push(`Invalid metadata.openclaw: ${e}`);
            }
        }

        return {
            success: errors.length === 0,
            errors,
            warnings,
            companions: [],
            messages,
        };
    }

    async generateCompanions(context: AdapterContext): Promise<AdapterResult> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const messages: string[] = [];

        if (!this.options.generateMetadata) {
            return { success: true, errors, warnings, companions: [], messages };
        }

        const skillPath = context.skillPath;
        const skillMdPath = join(skillPath, 'SKILL.md');

        if (!existsSync(skillMdPath)) {
            errors.push('SKILL.md not found');
            return { success: false, errors, warnings, companions: [] };
        }

        // Parse SKILL.md frontmatter
        const content = readFileSync(skillMdPath, 'utf-8');
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

        if (!fmMatch) {
            warnings.push('No frontmatter found');
            return { success: true, errors, warnings, companions: [], messages };
        }

        try {
            const fm = YAML.parse(fmMatch[1]) as Record<string, unknown>;
            const metadataFm = fm.metadata as Record<string, unknown> | undefined;

            // Check if metadata.openclaw already exists
            if (metadataFm?.openclaw) {
                messages.push('metadata.openclaw already exists in frontmatter');
                return { success: true, errors, warnings, companions: [], messages };
            }

            // Generate metadata.openclaw file
            const metadata = {
                name: fm.name as string,
                description: fm.description as string,
                version: fm.version || '1.0.0',
                emoji: '🛠️',
            };

            const metadataPath = join(skillPath, 'metadata.openclaw');
            writeFileSync(metadataPath, YAML.stringify(metadata), 'utf-8');
            messages.push('Generated metadata.openclaw');
        } catch (e) {
            errors.push(`Failed to generate metadata.openclaw: ${e}`);
        }

        return {
            success: errors.length === 0,
            errors,
            warnings,
            companions: [],
            messages,
        };
    }

    detectPlatformFeatures(skill: Skill): string[] {
        const features: string[] = [];
        const skillPath = skill.directory;

        // Check for metadata.openclaw
        if (existsSync(join(skillPath, 'metadata.openclaw'))) {
            features.push('openclaw-metadata-file');
        }

        // Check for frontmatter metadata.openclaw
        if (skill.frontmatter.metadata?.openclaw) {
            features.push('openclaw-metadata-frontmatter');
        }

        return features;
    }
}

export function createOpenClawAdapter(options?: OpenClawAdapterOptions): OpenClawAdapter {
    return new OpenClawAdapter(options);
}
