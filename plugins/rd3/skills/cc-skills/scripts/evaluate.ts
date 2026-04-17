#!/usr/bin/env bun
/**
 * Skill Evaluation Script for rd3:cc-skills
 *
 * Validates and evaluates skill quality across multiple dimensions
 * Uses evaluation.config.ts for configurable weights and rules
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
    getEvaluationDecisionState,
    getThresholdDecisionState,
    meetsPercentageThreshold,
} from '../../../scripts/grading';
import { logger } from '../../../scripts/logger';
import { countTodoMarkers, hasSecondPersonLanguage } from '../../../scripts/markdown-analysis';
import { parseMarkdownFrontmatter } from '../../../scripts/markdown-frontmatter';
import { AntigravityAdapter } from './adapters/antigravity';
import { ClaudeAdapter } from './adapters/claude';
import { CodexAdapter } from './adapters/codex';
import { OpenClawAdapter } from './adapters/openclaw';
import { OpenCodeAdapter } from './adapters/opencode';
import { DIMENSION_CATEGORIES, type DimensionWeights, EVALUATION_CONFIG } from './evaluation.config';
import type {
    EvaluationDimension,
    EvaluationFeatures,
    EvaluationReport,
    EvaluationScope,
    InteractionPattern,
    Platform,
    SkillFrontmatter,
    SkillResources,
} from './types';
import { discoverResources, parseFrontmatter } from './utils';

// ============================================================================
// TYPES
// ============================================================================

interface SecurityScanResult {
    hasBlacklist: boolean;
    blacklistFindings: string[];
    greylistFindings: string[];
    greylistPenalty: number;
}

interface InteractionAdvisories {
    frontmatterFindings: string[];
    frontmatterRecommendations: string[];
    triggerFindings: string[];
    triggerRecommendations: string[];
    contentFindings: string[];
    contentRecommendations: string[];
}

const ALLOWED_INTERACTION_PATTERNS: readonly InteractionPattern[] = [
    'tool-wrapper',
    'generator',
    'reviewer',
    'inversion',
    'pipeline',
    'knowledge-only',
];

function asStringArray(value: unknown): string[] | null {
    if (!Array.isArray(value)) {
        return null;
    }

    const strings = value.filter((item): item is string => typeof item === 'string').map((item) => item.trim());
    return strings.length === value.length ? strings : null;
}

function pushUnique(target: string[], values: string[]): void {
    for (const value of values) {
        if (!target.includes(value)) {
            target.push(value);
        }
    }
}

function collectInteractionAdvisories(
    skillPath: string,
    frontmatter: SkillFrontmatter | null,
    body: string,
    resources: SkillResources,
): InteractionAdvisories {
    const advisories: InteractionAdvisories = {
        frontmatterFindings: [],
        frontmatterRecommendations: [],
        triggerFindings: [],
        triggerRecommendations: [],
        contentFindings: [],
        contentRecommendations: [],
    };

    const metadata = frontmatter?.metadata;
    if (!metadata) {
        return advisories;
    }

    const rawInteractions = metadata.interactions;
    let interactions: InteractionPattern[] = [];

    if (rawInteractions == null) {
        advisories.frontmatterFindings.push('No metadata.interactions declared');
        advisories.frontmatterRecommendations.push(
            'Add metadata.interactions when the skill has a clear ADK runtime behavior',
        );
    } else {
        const interactionValues = asStringArray(rawInteractions);
        if (!interactionValues) {
            advisories.frontmatterFindings.push('metadata.interactions must be an array of strings');
            advisories.frontmatterRecommendations.push(
                'Use metadata.interactions as a YAML list, for example: [pipeline, reviewer]',
            );
        } else {
            const invalidInteractions = interactionValues.filter(
                (interaction) => !ALLOWED_INTERACTION_PATTERNS.includes(interaction as InteractionPattern),
            );
            if (invalidInteractions.length > 0) {
                advisories.frontmatterFindings.push(
                    `Unknown interaction pattern(s): ${invalidInteractions.join(', ')}`,
                );
                advisories.frontmatterRecommendations.push(
                    `Use only supported interaction patterns: ${ALLOWED_INTERACTION_PATTERNS.join(', ')}`,
                );
            }

            interactions = interactionValues.filter((interaction): interaction is InteractionPattern =>
                ALLOWED_INTERACTION_PATTERNS.includes(interaction as InteractionPattern),
            );
        }
    }

    const triggerKeywords = metadata.trigger_keywords;
    const severityLevels = metadata.severity_levels;
    const pipelineSteps = metadata.pipeline_steps;
    const hasStepHeadings = /^#{2,3}\s+Step\b/m.test(body);
    const hasPipelineStructure =
        hasStepHeadings ||
        /workflow flow pattern/i.test(body) ||
        /step 1[^\n]*step 2/ims.test(body) ||
        /step-by-step workflow/i.test(body);
    const hasGeneratorArtifacts = (resources.assets?.length ?? 0) > 0 || existsSync(join(skillPath, 'templates'));
    const lowerBody = body.toLowerCase();

    if (triggerKeywords != null) {
        const keywords = asStringArray(triggerKeywords);
        if (!keywords) {
            advisories.frontmatterFindings.push('metadata.trigger_keywords must be an array of strings');
            advisories.frontmatterRecommendations.push('Use metadata.trigger_keywords as a YAML list');
        } else if (!interactions.includes('tool-wrapper')) {
            advisories.triggerFindings.push('trigger_keywords provided without tool-wrapper interaction');
            advisories.triggerRecommendations.push('Use trigger_keywords with tool-wrapper skills or remove the field');
        }
    }

    if (severityLevels != null) {
        const levels = asStringArray(severityLevels);
        if (!levels) {
            advisories.frontmatterFindings.push('metadata.severity_levels must be an array of strings');
            advisories.frontmatterRecommendations.push('Use metadata.severity_levels as a YAML list');
        } else if (!interactions.includes('reviewer')) {
            advisories.contentFindings.push('severity_levels provided without reviewer interaction');
            advisories.contentRecommendations.push('Use severity_levels with reviewer skills or remove the field');
        }
    } else if (interactions.includes('reviewer')) {
        advisories.contentFindings.push('Reviewer interaction declared without severity_levels metadata');
        advisories.contentRecommendations.push('Add metadata.severity_levels to document reviewer output severity');
    }

    if (pipelineSteps != null) {
        const steps = asStringArray(pipelineSteps);
        if (!steps) {
            advisories.frontmatterFindings.push('metadata.pipeline_steps must be an array of strings');
            advisories.frontmatterRecommendations.push('Use metadata.pipeline_steps as a YAML list');
        } else if (!interactions.includes('pipeline')) {
            advisories.contentFindings.push('pipeline_steps provided without pipeline interaction');
            advisories.contentRecommendations.push('Use pipeline_steps with pipeline skills or remove the field');
        }
    } else if (interactions.includes('pipeline') && !hasPipelineStructure) {
        advisories.contentFindings.push('Pipeline interaction declared without explicit step headings');
        advisories.contentRecommendations.push('Add named Step sections or metadata.pipeline_steps');
    }

    if (interactions.includes('tool-wrapper') && (resources.references?.length ?? 0) === 0) {
        advisories.contentFindings.push('Tool-wrapper interaction declared without reference documents');
        advisories.contentRecommendations.push('Add references/ files or remove tool-wrapper');
    }

    if (interactions.includes('generator') && !hasGeneratorArtifacts) {
        advisories.contentFindings.push('Generator interaction declared without assets/');
        advisories.contentRecommendations.push('Add generator templates or assets/ resources, or remove generator');
    }

    if (
        interactions.includes('inversion') &&
        !/ask one question at a time|do not start|before acting|before building/.test(lowerBody)
    ) {
        advisories.contentFindings.push('Inversion interaction declared without explicit gating language');
        advisories.contentRecommendations.push(
            'Add interview-first instructions such as "ask one question at a time" or "do not start until..."',
        );
    }

    if (!interactions.includes('generator') && /template/.test(lowerBody) && /fill|populate/.test(lowerBody)) {
        advisories.contentFindings.push('Body suggests generator behavior but generator interaction is not declared');
        advisories.contentRecommendations.push('Consider adding metadata.interactions: [generator]');
    }

    if (!interactions.includes('reviewer') && /severity/.test(lowerBody) && /checklist|rubric|review/.test(lowerBody)) {
        advisories.contentFindings.push('Body suggests reviewer behavior but reviewer interaction is not declared');
        advisories.contentRecommendations.push('Consider adding metadata.interactions: [reviewer]');
    }

    if (!interactions.includes('pipeline') && /do not proceed/.test(lowerBody) && hasPipelineStructure) {
        advisories.contentFindings.push('Body suggests pipeline behavior but pipeline interaction is not declared');
        advisories.contentRecommendations.push('Consider adding metadata.interactions: [pipeline]');
    }

    if (
        !interactions.includes('inversion') &&
        /ask one question at a time|do not start building|do not start designing/.test(lowerBody)
    ) {
        advisories.contentFindings.push('Body suggests inversion behavior but inversion interaction is not declared');
        advisories.contentRecommendations.push('Consider adding metadata.interactions: [inversion]');
    }

    return advisories;
}

function applyInteractionAdvisories(
    dimensions: EvaluationDimension[],
    advisories: InteractionAdvisories,
): EvaluationDimension[] {
    const findDimension = (name: string) => dimensions.find((dimension) => dimension.name === name);

    const frontmatter = findDimension('Frontmatter');
    if (frontmatter) {
        pushUnique(frontmatter.findings, advisories.frontmatterFindings);
        pushUnique(frontmatter.recommendations, advisories.frontmatterRecommendations);
    }

    const triggerDesign = findDimension('Trigger Design');
    if (triggerDesign) {
        pushUnique(triggerDesign.findings, advisories.triggerFindings);
        pushUnique(triggerDesign.recommendations, advisories.triggerRecommendations);
    }

    const content = findDimension('Content');
    if (content) {
        pushUnique(content.findings, advisories.contentFindings);
        pushUnique(content.recommendations, advisories.contentRecommendations);
    }

    return dimensions;
}

// ============================================================================
// SCRIPT DETECTION
// ============================================================================

function detectHasScripts(body: string, resources: SkillResources): boolean {
    const config = EVALUATION_CONFIG;

    // Check if scripts directory exists with files
    if (resources.scripts && resources.scripts.length > 0) {
        return true;
    }

    // Body content check only applies if scripts/ directory has actual files
    // Bash code blocks in SKILL.md may be documentation examples, not executable scripts
    // For scriptless skills (no scripts/ dir OR empty scripts/ dir), body patterns are ignored
    if (!resources.scripts || resources.scripts.length === 0) {
        return false;
    }

    // Check body content for script patterns (only if scripts/ dir exists)
    for (const pattern of config.detection.scriptPatterns) {
        if (pattern.test(body)) {
            return true;
        }
    }

    return false;
}

// ============================================================================
// SECURITY SCANNER
// ============================================================================

function scanForSecurityIssues(content: string): SecurityScanResult {
    const config = EVALUATION_CONFIG;
    const result: SecurityScanResult = {
        hasBlacklist: false,
        blacklistFindings: [],
        greylistFindings: [],
        greylistPenalty: 0,
    };

    // Check blacklist patterns (critical - immediate reject)
    for (const rule of config.security.blacklist) {
        const matches = content.match(rule.pattern);
        if (matches) {
            result.hasBlacklist = true;
            result.blacklistFindings.push(`[BLACKLIST] ${rule.reason} (${matches[0]})`);
        }
    }

    // Check greylist patterns (warnings - penalty points)
    for (const rule of config.security.greylist) {
        const matches = content.match(rule.pattern);
        if (matches) {
            result.greylistFindings.push(`[GREYLIST] ${rule.reason} (${matches[0]})`);
            result.greylistPenalty += 2;
        }
    }

    return result;
}

// ============================================================================
// TEST RUNNER
// ============================================================================

async function runTests(skillPath: string): Promise<boolean> {
    const testsPath = join(skillPath, 'tests');

    if (!existsSync(testsPath)) {
        return false; // No tests = fail
    }

    // Verify if test files actually exist before spawning bun test
    try {
        const files = readdirSync(testsPath, { recursive: true }) as string[];
        const hasTestFiles = files.some((f: string) => f.endsWith('.test.ts') || f.endsWith('.spec.ts'));

        if (!hasTestFiles) {
            return false; // No valid test files = fail
        }
    } catch {
        return false; // Error reading directory = fail
    }

    try {
        const { spawn } = await import('bun');
        // Run tests from the project root (where bunfig.toml lives).
        // Using plugins/rd3 as cwd breaks tests that depend on process.cwd()
        // being the project root (e.g. skill-resolver.test.ts).
        const projectRoot = findProjectRoot();
        const testsRelPath = testsPath.startsWith(projectRoot) ? testsPath.slice(projectRoot.length + 1) : testsPath;
        const cwd = projectRoot;
        const proc = spawn(['bun', 'test', testsRelPath], {
            cwd,
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const [exitCode, stdout, stderr] = await Promise.all([
            proc.exited,
            new Response(proc.stdout).text(),
            new Response(proc.stderr).text(),
        ]);

        // bun exits with 1 if coverage thresholds fail, even if all tests pass
        // Check for actual test failures: look for "X fail" where X > 0
        const output = stdout + stderr;
        const hasFailures = /(\d+)\s+fail/.test(output) && !/0\s+fail/.test(output);

        return exitCode === 0 || !hasFailures;
    } catch {
        return false;
    }
}

// ============================================================================
// FEATURE EXTRACTION
// ============================================================================

/**
 * Extract diagnostic features from skill for scoring
 * This is the "feature engineering" step - generates boolean/diagnostic features
 */
function extractFeatures(
    body: string,
    frontmatter: SkillFrontmatter | null,
    resources: SkillResources,
    securityResult: { blocked: boolean; blacklist: string[]; greylist: string[] },
): EvaluationFeatures {
    const features: EvaluationFeatures = {
        // Frontmatter features
        hasFrontmatter: !!frontmatter,
        hasName: !!frontmatter?.name,
        nameValidFormat: !!(frontmatter?.name && /^[a-z0-9][a-z0-9-]*$/.test(frontmatter.name)),
        hasDescription: !!frontmatter?.description,
        descriptionLength: frontmatter?.description?.length || 0,
        hasMetadata: !!frontmatter?.metadata,

        // Structure features
        lineCount: body.split('\n').length,
        hasSkillMd: true, // We only evaluate if SKILL.md exists
        hasScripts: (resources.scripts?.length ?? 0) > 0,
        hasReferences: (resources.references?.length ?? 0) > 0,
        hasAssets: (resources.assets?.length ?? 0) > 0,
        hasAgents: (resources.agents?.length ?? 0) > 0,

        // Content features - allow multiple variations for flexibility
        hasOverview: /##\s+(Overview|Operations)/i.test(body),
        hasQuickStart: /##\s+Quick Start/i.test(body),
        hasExamples: /##\s+Example/i.test(body) || /```\w*\n.*\n```/s.test(body) || /\|.*Example.*\|/.test(body),
        hasCodeBlocks: /```[\s\S]*?```/g.test(body),
        hasWorkflows: /##\s+Workflow/i.test(body),
        hasPlatformNotes: /##\s+Platform/i.test(body),

        // Trigger features
        hasWhenToUse: /##\s+When to Use/i.test(body),
        triggerPhrases: extractTriggerPhrases(frontmatter?.description || ''),

        // Security features
        hasBlacklistMatch: securityResult.blocked,
        hasGreylistMatch: securityResult.greylist.length > 0,
        securityIssues: [...securityResult.blacklist, ...securityResult.greylist],

        // Best practices features
        hasTodo: countTodoMarkers(body) > 0,
        todoCount: countTodoMarkers(body),
        hasPlaceholders: /\[(?:TODO|PLACEHOLDER|FIXME|XXX|INSERT|CHANGE|REPLACE|FILL)[^\]]*\]/gi.test(body),
        placeholderCount: (body.match(/\[(?:TODO|PLACEHOLDER|FIXME|XXX|INSERT|CHANGE|REPLACE|FILL)[^\]]*\]/gi) || [])
            .length,
        usesSecondPerson: hasSecondPersonLanguage(body),
        hasWindowsPaths: /[a-zA-Z]:\\[\w\\]+\.?\w*/g.test(body),
        hasNestedRefs: /\[.*?\]\(.*?\]\(.*?\)/g.test(body),
        timeSensitiveCount: (body.match(/\b(20\d{2}|202\d)\b/g) || []).length,
        hasCircularRef: /(\/rd\d+):[a-z-]+\s+/g.test(body) || /^## Commands Reference$/m.test(body),
        contentLength: body.length,
        hasSectionHeaders: /##\s+/.test(body),
        headingCount: (body.match(/^#{1,3}\s+/gm) || []).length,

        // Completeness features
        hasAdditionalResources: /##\s+Additional Resources/i.test(body),
        hasSeeAlso: /##\s+See Also/i.test(body),
        hasPlatforms: !!frontmatter?.metadata?.platforms,

        // Platform features
        platformsSupported: Array.isArray(frontmatter?.metadata?.platforms)
            ? frontmatter.metadata.platforms
            : frontmatter?.metadata?.platforms?.split(',').map((p) => p.trim()) || [],
        hasEvalIgnore: /<!--\s*eval-ignore/.test(body),
    };

    return features;
}

/**
 * Extract trigger phrases from description
 */
function extractTriggerPhrases(description: unknown): string[] {
    if (typeof description !== 'string') {
        return [];
    }
    const _phrases: string[] = [];
    // Match patterns like "create X", "implement Y", "add Z"
    const matches = description.match(/"[^"]+"|\b\w+\s+\w+/g) || [];
    return matches.slice(0, 5); // Limit to 5 phrases
}

// ============================================================================
// CENTRALIZED SCORING ENGINE
// ============================================================================

/**
 * Centralized scoring function that computes all dimension scores from features
 * This is the heart of the scoring engine - all scoring logic in one place
 */
function computeDimensionScores(
    features: EvaluationFeatures,
    weights: DimensionWeights,
    hasScripts: boolean,
    scope: EvaluationScope,
): EvaluationDimension[] {
    const dimensions: EvaluationDimension[] = [];

    // ==========================================================================
    // 1. FRONTMAKER (Core Quality - 10pts)
    // ==========================================================================
    let frontmatterScore = 10;
    const frontmatterFindings: string[] = [];
    const frontmatterRecommendations: string[] = [];

    if (!features.hasFrontmatter) {
        frontmatterFindings.push('No frontmatter found');
        frontmatterRecommendations.push('Add YAML frontmatter with name and description');
        frontmatterScore = 0;
    } else {
        if (!features.hasName) {
            frontmatterFindings.push('Missing required field: name');
            frontmatterRecommendations.push('Add name field to frontmatter');
            frontmatterScore -= 10;
        } else if (!features.nameValidFormat) {
            frontmatterFindings.push('Invalid name format');
            frontmatterRecommendations.push('Use lowercase hyphen-case for name');
            frontmatterScore -= 5;
        }

        if (!features.hasDescription) {
            frontmatterFindings.push('Missing required field: description');
            frontmatterRecommendations.push('Add description field to frontmatter');
            frontmatterScore -= 5;
        } else if (features.descriptionLength < 20) {
            frontmatterFindings.push('Description is too short');
            frontmatterRecommendations.push('Expand description to at least 20 characters');
            frontmatterScore -= 2;
        } else if (features.descriptionLength > 500) {
            frontmatterFindings.push('Description is too long');
            frontmatterRecommendations.push('Keep description under 500 characters');
            frontmatterScore -= 2;
        }

        if (!features.hasMetadata) {
            frontmatterFindings.push('No metadata found');
            frontmatterRecommendations.push('Consider adding metadata (author, version)');
            frontmatterScore -= 3;
        }
    }

    dimensions.push({
        name: 'Frontmatter',
        category: DIMENSION_CATEGORIES.Frontmatter,
        weight: weights.frontmatter,
        score: Math.max(0, frontmatterScore),
        maxScore: 10,
        findings: frontmatterFindings,
        recommendations: frontmatterRecommendations,
    });

    // ==========================================================================
    // 2. STRUCTURE (Core Quality - 5pts/10pts)
    // ==========================================================================
    let structureScore = weights.structure;
    const structureFindings: string[] = [];
    const structureRecommendations: string[] = [];

    if (features.lineCount < 10) {
        structureFindings.push('Content too short');
        structureRecommendations.push('Expand content');
        structureScore -= 3;
    }

    if (!features.hasSkillMd) {
        structureFindings.push('SKILL.md not found');
        structureScore = 0;
    }

    dimensions.push({
        name: 'Structure',
        category: DIMENSION_CATEGORIES.Structure,
        weight: weights.structure,
        score: Math.max(0, structureScore),
        maxScore: weights.structure,
        findings: structureFindings,
        recommendations: structureRecommendations,
    });

    // ==========================================================================
    // 3. CONTENT (Core Quality - 15pts/20pts)
    // ==========================================================================
    let contentScore = weights.content;
    const contentFindings: string[] = [];
    const contentRecommendations: string[] = [];

    if (!features.hasOverview && features.contentLength > 100) {
        contentFindings.push('No overview section');
        contentRecommendations.push('Add Overview section');
        contentScore -= 3;
    }
    if (!features.hasQuickStart) {
        contentFindings.push('No Quick Start section');
        contentRecommendations.push('Add Quick Start with examples');
        contentScore -= 3;
    }
    if (!features.hasExamples) {
        contentFindings.push('No examples found');
        contentRecommendations.push('Add concrete examples');
        contentScore -= 3;
    }
    if (!features.hasCodeBlocks) {
        contentFindings.push('No code examples');
        contentRecommendations.push('Add code examples');
        contentScore -= 2;
    }
    if (!features.hasWorkflows && features.contentLength > 500) {
        contentFindings.push('No workflows section');
        contentRecommendations.push('Add Workflows section');
        contentScore -= 2;
    }

    dimensions.push({
        name: 'Content',
        category: DIMENSION_CATEGORIES.Content,
        weight: weights.content,
        score: Math.max(0, contentScore),
        maxScore: weights.content,
        findings: contentFindings,
        recommendations: contentRecommendations,
    });

    // ==========================================================================
    // 4. TRIGGER DESIGN (Discovery & Trigger - 10pts)
    // ==========================================================================
    let triggerScore = 10;
    const triggerFindings: string[] = [];
    const triggerRecommendations: string[] = [];

    if (!features.hasWhenToUse) {
        triggerFindings.push('No "When to Use" section');
        triggerRecommendations.push('Add When to Use section with trigger phrases');
        triggerScore -= 5;
    }
    if (features.triggerPhrases.length === 0) {
        triggerFindings.push('No trigger phrases found');
        triggerRecommendations.push('Add specific trigger phrases in description');
        triggerScore -= 5;
    }

    dimensions.push({
        name: 'Trigger Design',
        category: DIMENSION_CATEGORIES['Trigger Design'],
        weight: weights.triggerDesign,
        score: Math.max(0, triggerScore),
        maxScore: 10,
        findings: triggerFindings,
        recommendations: triggerRecommendations,
    });

    // ==========================================================================
    // 5. CIRCULAR REFERENCE (Safety & Security - 10pts)
    // ==========================================================================
    let circularScore = 10;
    const circularFindings: string[] = [];
    const circularRecommendations: string[] = [];

    if (features.hasCircularRef) {
        circularFindings.push('Circular reference detected');
        circularRecommendations.push('Remove references to associated commands/agents');
        circularScore -= 10;
    }

    dimensions.push({
        name: 'Circular Reference Prevention',
        category: DIMENSION_CATEGORIES['Circular Reference Prevention'],
        weight: weights.circularReference,
        score: Math.max(0, circularScore),
        maxScore: 10,
        findings: circularFindings,
        recommendations: circularRecommendations,
    });

    // ==========================================================================
    // 6. PROGRESSIVE DISCLOSURE (Code & Documentation - 10pts)
    // ==========================================================================
    let progressiveScore = 10;
    const progressiveFindings: string[] = [];
    const progressiveRecommendations: string[] = [];

    if (features.hasTodo) {
        progressiveFindings.push(`Found ${features.todoCount} TODO marker(s)`);
        progressiveRecommendations.push('Remove TODO markers before publishing');
        progressiveScore -= Math.min(features.todoCount * 2, 6);
    }
    if (features.hasPlaceholders && features.placeholderCount > 5) {
        progressiveFindings.push(`Found ${features.placeholderCount} placeholder(s)`);
        progressiveRecommendations.push('Replace placeholders with actual content');
        progressiveScore -= Math.min(features.placeholderCount, 5);
    }
    if (features.usesSecondPerson) {
        progressiveFindings.push('Uses second-person voice');
        progressiveRecommendations.push('Use imperative form');
        progressiveScore -= 3;
    }
    if (features.hasWindowsPaths) {
        progressiveFindings.push('Windows-style paths found');
        progressiveRecommendations.push('Use forward slashes');
        progressiveScore -= 2;
    }
    if (features.hasNestedRefs) {
        progressiveFindings.push('Nested references found');
        progressiveRecommendations.push('Keep references one level deep');
        progressiveScore -= 3;
    }
    if (features.contentLength > 2000 && !features.hasSectionHeaders) {
        progressiveFindings.push('Long content without section headers');
        progressiveRecommendations.push('Use ## headers for progressive disclosure');
        progressiveScore -= 3;
    }

    dimensions.push({
        name: 'Progressive Disclosure',
        category: DIMENSION_CATEGORIES['Progressive Disclosure'],
        weight: weights.progressiveDisclosure,
        score: Math.max(0, progressiveScore),
        maxScore: 10,
        findings: progressiveFindings,
        recommendations: progressiveRecommendations,
    });

    // ==========================================================================
    // Full scope only dimensions
    // ==========================================================================
    if (scope === 'full') {
        // Platform Compatibility
        let platformScore = 10;
        const platformFindings: string[] = [];
        const platformRecommendations: string[] = [];

        if (features.platformsSupported.length === 0 && !features.hasEvalIgnore) {
            platformFindings.push('No platform metadata found');
            platformRecommendations.push('Add platforms to metadata');
            platformScore -= 5;
        }

        dimensions.push({
            name: 'Platform Compatibility',
            category: DIMENSION_CATEGORIES['Platform Compatibility'],
            weight: weights.platformCompatibility,
            score: Math.max(0, platformScore),
            maxScore: 10,
            findings: platformFindings,
            recommendations: platformRecommendations,
        });

        // Completeness
        let completenessScore = 10;
        const completenessFindings: string[] = [];
        const completenessRecommendations: string[] = [];

        if (!features.hasAdditionalResources) {
            completenessFindings.push('No Additional Resources section');
            completenessRecommendations.push('Add links to references');
            completenessScore -= 3;
        }
        if (features.hasCircularRef) {
            completenessFindings.push('Circular reference in See Also');
            completenessScore -= 3;
        }

        dimensions.push({
            name: 'Completeness',
            category: DIMENSION_CATEGORIES.Completeness,
            weight: weights.completeness,
            score: Math.max(0, completenessScore),
            maxScore: 10,
            findings: completenessFindings,
            recommendations: completenessRecommendations,
        });

        // Security (only for skills with scripts)
        if (hasScripts) {
            let securityScore = 10;
            const securityFindings: string[] = [];
            const securityRecommendations: string[] = [];

            if (features.hasBlacklistMatch) {
                securityFindings.push('Security blacklist pattern detected');
                securityRecommendations.push('Remove dangerous patterns');
                securityScore = 0;
            } else if (features.hasGreylistMatch) {
                securityFindings.push('Security greylist pattern detected');
                securityRecommendations.push('Review security patterns');
                securityScore -= 5;
            }

            dimensions.push({
                name: 'Security',
                category: DIMENSION_CATEGORIES.Security,
                weight: weights.security,
                score: Math.max(0, securityScore),
                maxScore: 10,
                findings: securityFindings,
                recommendations: securityRecommendations,
            });

            // Code Quality
            let codeQualityScore = 10;
            const codeQualityFindings: string[] = [];
            const codeQualityRecommendations: string[] = [];

            if (!features.hasScripts) {
                codeQualityFindings.push('No scripts directory found');
                codeQualityRecommendations.push('Add scripts for reusable functionality');
                codeQualityScore -= 5;
            }

            dimensions.push({
                name: 'Code Quality',
                category: DIMENSION_CATEGORIES['Code Quality'],
                weight: weights.codeQuality,
                score: Math.max(0, codeQualityScore),
                maxScore: 10,
                findings: codeQualityFindings,
                recommendations: codeQualityRecommendations,
            });
        }
    }

    // ==========================================================================
    // Calculate percentages and final weighted scores
    // ==========================================================================
    for (const dim of dimensions) {
        dim.percentage = dim.maxScore > 0 ? Math.round((dim.score / dim.maxScore) * 100) : 0;
        dim.passed = meetsPercentageThreshold(dim.percentage);
        // Apply weight: weightedScore = percentage * weight
        dim.score = Math.round((dim.score / dim.maxScore) * dim.weight);
    }

    return dimensions;
}

// ============================================================================
// EVALUATION DIMENSIONS (with configurable weights)
// ============================================================================

function _evaluateFrontmatter(frontmatter: SkillFrontmatter | null, weights: DimensionWeights): EvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.frontmatter;

    if (!frontmatter) {
        findings.push('No frontmatter found');
        recommendations.push('Add YAML frontmatter with name and description');
        return {
            name: 'Frontmatter',
            weight: weights.frontmatter,
            score: 0,
            maxScore,
            findings,
            recommendations,
        };
    }

    let score = maxScore;

    // Check name
    if (!frontmatter.name) {
        findings.push('Missing required field: name');
        recommendations.push('Add name field to frontmatter');
        score -= 10;
    } else if (!/^[a-z0-9][a-z0-9-]*$/.test(frontmatter.name)) {
        findings.push(`Invalid name format: ${frontmatter.name}`);
        recommendations.push('Use lowercase hyphen-case for name');
        score -= 5;
    }

    // Check description
    if (!frontmatter.description) {
        findings.push('Missing required field: description');
        recommendations.push('Add description field to frontmatter');
        score -= 5;
    } else if (frontmatter.description.length < 20) {
        findings.push('Description is too short');
        recommendations.push('Expand description to at least 20 characters');
        score -= 2;
    } else if (frontmatter.description.length > 500) {
        findings.push('Description is too long');
        recommendations.push('Keep description under 500 characters');
        score -= 2;
    }

    // Check metadata
    if (!frontmatter.metadata) {
        findings.push('No metadata found');
        recommendations.push('Consider adding metadata (author, version)');
        score -= 3;
    }

    return {
        name: 'Frontmatter',
        weight: weights.frontmatter,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

function _evaluateStructure(body: string, resources: SkillResources, weights: DimensionWeights): EvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.structure;
    let score = maxScore;

    const lineCount = body.split('\n').length;

    if (lineCount < 10) {
        findings.push('Body is very short');
        recommendations.push('Add more content to the skill body');
        score -= 5;
    } else if (lineCount > 500) {
        findings.push('Body is very long');
        recommendations.push('Consider splitting into references/');
        score -= 3;
    }

    // Check for key sections
    if (!body.toLowerCase().includes('when to use')) {
        findings.push("Missing 'When to use' section");
        recommendations.push("Add a 'When to use' section");
        score -= 3;
    }

    if (!body.includes('## ') && !body.includes('### ')) {
        findings.push('No section headers found');
        recommendations.push('Use ## for main sections');
        score -= 2;
    }

    // Check resources
    if (!resources.scripts?.length && !resources.references?.length) {
        findings.push('No resources found');
        recommendations.push('Consider adding scripts/ or references/');
        score -= 2;
    }

    return {
        name: 'Structure',
        weight: weights.structure,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

function _evaluateProgressiveDisclosure(body: string, weights: DimensionWeights): EvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.progressiveDisclosure;
    let score = maxScore;

    // ==========================================================================
    // BEST PRACTICES VALIDATION
    // ==========================================================================

    // Check for TODO
    const todoCount = countTodoMarkers(body);
    if (todoCount > 0) {
        findings.push(`Found ${todoCount} TODO marker(s)`);
        recommendations.push('Remove TODO markers before publishing');
        score -= todoCount * 2;
    }

    // Check for placeholder text (exclude markdown links like [text](url) and [text][ref])
    const placeholderCount = (body.match(/\[(?:TODO|PLACEHOLDER|FIXME|XXX|INSERT|CHANGE|REPLACE|FILL)[^\]]*\]/gi) || [])
        .length;
    if (placeholderCount > 5) {
        findings.push(`Found ${placeholderCount} placeholder(s)`);
        recommendations.push('Replace placeholders with actual content');
        score -= Math.min(5, placeholderCount);
    }

    // Check for code blocks
    const codeBlockCount = (body.match(/```[\s\S]*?```/g) || []).length;
    if (codeBlockCount === 0) {
        findings.push('No code examples found');
        recommendations.push('Add code examples to illustrate usage');
        score -= 3;
    }

    // ==========================================================================
    // ENHANCED BEST PRACTICES VALIDATION
    // ==========================================================================

    // Check: Avoid second-person voice ("You should", "I can help")
    const secondPersonPatterns = [
        /\bI can help\b/gi,
        /\bI will help\b/gi,
        /\byou can use\b/gi,
        /\byou should\b/gi,
        /\byou need to\b/gi,
    ];
    const secondPersonCount = secondPersonPatterns.reduce((count, pattern) => {
        return count + (body.match(pattern) || []).length;
    }, 0);
    if (secondPersonCount > 0) {
        findings.push(`Found ${secondPersonCount} second-person phrase(s) - use imperative form`);
        recommendations.push('Use imperative form: "Extract text" not "You can extract text"');
        score -= Math.min(secondPersonCount * 2, 10);
    }

    // Check: Avoid Windows-style paths
    const windowsPaths = (body.match(/[a-zA-Z]:\\[\w\\]+\.?\w*/g) || []).length;
    if (windowsPaths > 0) {
        findings.push(`Found ${windowsPaths} Windows-style path(s)`);
        recommendations.push('Use forward slashes: scripts/helper.py not scripts\\helper.py');
        score -= windowsPaths * 2;
    }

    // Check: References should be one level deep (not nested)
    const nestedRefPattern = /\[.*?\]\(.*?\]\(.*?\)/g;
    const nestedRefs = (body.match(nestedRefPattern) || []).length;
    if (nestedRefs > 0) {
        findings.push(`Found ${nestedRefs} nested reference(s)`);
        recommendations.push('Keep references one level deep: SKILL.md → reference.md');
        score -= nestedRefs * 3;
    }

    // Check: Check for time-sensitive information (year-based)
    const timeSensitivePattern = /\b(20\d{2}|202\d)\b/g;
    const timeSensitive = (body.match(timeSensitivePattern) || []).length;
    if (timeSensitive > 2) {
        findings.push(`Found ${timeSensitive} year reference(s) - may become outdated`);
        recommendations.push('Avoid time-specific information or use "Current" vs "Legacy" pattern');
        score -= Math.min(timeSensitive, 5);
    }

    // Check: Circular reference (skills should not reference commands)
    const circularPatterns = [
        { pattern: /^## Commands Reference$/m, message: 'Contains "Commands Reference" section' },
        { pattern: /\/(rd\d+):[a-z-]+\s+/g, message: 'Contains slash command references' },
    ];
    for (const { pattern, message } of circularPatterns) {
        if (pattern.test(body)) {
            findings.push(message);
            score -= 10;
        }
    }

    // Check: Progressive disclosure - content should be organized
    if (body.length > 2000 && !body.includes('## ')) {
        findings.push('Long content without section headers');
        recommendations.push('Use ## headers for progressive disclosure');
        score -= 3;
    }

    return {
        name: 'Progressive Disclosure',
        weight: weights.progressiveDisclosure,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

function _evaluatePlatformCompatibility(
    body: string,
    frontmatter: SkillFrontmatter | null,
    weights: DimensionWeights,
): EvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.platformCompatibility;
    let score = maxScore;

    if (body.includes('<!-- eval-ignore-platform -->')) {
        return {
            name: 'Platform Compatibility',
            weight: weights.platformCompatibility,
            score: maxScore,
            maxScore,
            findings: [],
            recommendations: [],
        };
    }

    // Check for Claude-specific features
    const hasClaudeCommands = /`!`[^`]+``/.test(body);
    const hasDollarArgs = /\$ARGUMENTS|\$\d+/.test(body);
    const hasContextFork = body.includes('context: fork');
    const hasHooks = frontmatter?.hooks;

    if (hasClaudeCommands) {
        findings.push('Uses Claude-specific !`cmd` syntax');
        recommendations.push('Document in Platform Notes section');
        score -= 2;
    }

    if (hasDollarArgs) {
        findings.push('Uses Claude-specific $ARGUMENTS syntax');
        recommendations.push('Document limitation for other platforms');
        score -= 2;
    }

    if (hasContextFork) {
        findings.push('Uses Claude-specific context: fork');
        recommendations.push('Document as Claude-only feature');
        score -= 1;
    }

    if (hasHooks) {
        findings.push('Uses Claude-specific hooks');
        recommendations.push('Document as Claude-only feature');
        score -= 1;
    }

    // Check for platform notes
    if (!body.includes('## Platform Notes')) {
        findings.push('No Platform Notes section found');
        recommendations.push('Add Platform Notes for cross-platform compatibility');
        score -= 3;
    }

    return {
        name: 'Platform Compatibility',
        weight: weights.platformCompatibility,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

function _evaluateCompleteness(
    body: string,
    resources: SkillResources,
    weights: DimensionWeights,
): EvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.completeness;
    let score = maxScore;

    const hasExamples = body.includes('Example');
    const hasAdvanced = body.toLowerCase().includes('advanced');
    const hasTroubleshooting = body.toLowerCase().includes('troubleshooting');

    if (!hasExamples) {
        findings.push('No examples section found');
        recommendations.push('Add Examples section');
        score -= 3;
    }

    if (!hasAdvanced && body.length > 1000) {
        findings.push('No advanced section despite long content');
        recommendations.push('Consider adding Advanced section');
        score -= 1;
    }

    if (body.toLowerCase().includes('error') && !hasTroubleshooting) {
        findings.push('Mentions errors but no troubleshooting');
        recommendations.push('Add Troubleshooting section');
        score -= 2;
    }

    // Check resource files
    if (resources.scripts?.length) {
        const scripts = resources.scripts.filter((f) => f.endsWith('.ts') || f.endsWith('.js'));
        if (scripts.length === 0) {
            findings.push('scripts/ has no executable files');
            recommendations.push('Add TypeScript or JavaScript helpers');
        }
    }

    return {
        name: 'Completeness',
        weight: weights.completeness,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

function _evaluateSecurity(securityResult: SecurityScanResult, weights: DimensionWeights): EvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.security;

    if (weights.security === 0) {
        return {
            name: 'Security',
            weight: 0,
            score: 0,
            maxScore: 0,
            findings: [],
            recommendations: [],
        };
    }

    let score = maxScore;

    // Blacklist findings (should have already caused rejection)
    for (const finding of securityResult.blacklistFindings) {
        findings.push(finding);
    }

    // Greylist findings (penalty)
    for (const finding of securityResult.greylistFindings) {
        findings.push(finding);
    }
    score -= securityResult.greylistPenalty;

    if (securityResult.hasBlacklist) {
        recommendations.push('Remove blacklist patterns before evaluation');
    }

    if (securityResult.greylistFindings.length > 0) {
        recommendations.push('Review greylist patterns and address issues');
    }

    return {
        name: 'Security',
        weight: weights.security,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

// ============================================================================
// NEW DIMENSIONS (from rd2 reference)
// ============================================================================

function _evaluateContent(
    body: string,
    frontmatter: SkillFrontmatter | null,
    weights: DimensionWeights,
): EvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.content;
    let score = maxScore;

    // Check line count (progressive disclosure - keep under 500 lines)
    const lineCount = body.split('\n').length;
    if (lineCount > 500) {
        findings.push(`Content too long (${lineCount} lines, recommended <500)`);
        recommendations.push('Move detailed docs to references/ folder');
        score -= 4;
    } else if (lineCount > 300) {
        findings.push(`Content approaching limit (${lineCount} lines)`);
        recommendations.push('Consider moving advanced topics to references/');
        score -= 1;
    }

    // Check for structured sections
    const hasWhenToUse = body.toLowerCase().includes('when to use');
    const hasQuickStart = body.toLowerCase().includes('quick start');
    const hasCorePrinciples = body.toLowerCase().includes('core principles');

    if (!hasWhenToUse) {
        findings.push("No 'When to Use' section");
        recommendations.push('Add clear usage context');
        score -= 2;
    }

    if (!hasQuickStart) {
        findings.push("No 'Quick Start' section");
        recommendations.push('Add quick start guide');
        score -= 2;
    }

    if (!hasCorePrinciples && body.length > 1500) {
        findings.push('Long content without core principles');
        recommendations.push('Add Core Principles section');
        score -= 1;
    }

    // Check description quality
    if (frontmatter?.description) {
        const descLen = frontmatter.description.length;
        if (descLen < 50) {
            findings.push('Description too short');
            recommendations.push('Expand description (50-200 chars)');
            score -= 2;
        } else if (descLen > 300) {
            findings.push('Description too long');
            recommendations.push('Keep description under 300 chars');
            score -= 1;
        }
    } else {
        findings.push('No description in frontmatter');
        recommendations.push('Add description field');
        score -= 3;
    }

    return {
        name: 'Content',
        weight: weights.content,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

function _evaluateTriggerDesign(
    frontmatter: SkillFrontmatter | null,
    body: string,
    weights: DimensionWeights,
): EvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.triggerDesign;
    let score = maxScore;

    // Check name matches directory pattern (lowercase, hyphenated)
    if (frontmatter?.name) {
        if (!/^[a-z0-9-]+$/.test(frontmatter.name)) {
            findings.push('Name contains invalid characters');
            recommendations.push('Use lowercase letters, numbers, hyphens only');
            score -= 2;
        }
        if (frontmatter.name.includes('_')) {
            findings.push('Name contains underscores');
            recommendations.push('Use hyphens instead of underscores');
            score -= 1;
        }
    } else {
        findings.push('No name in frontmatter');
        recommendations.push('Add name field');
        score -= 4;
    }

    // Check description contains trigger context
    if (frontmatter?.description) {
        const desc = frontmatter.description.toLowerCase();
        const hasWhenToUse = /when.*use|use.*when|trigger|activate/i.test(desc);
        if (!hasWhenToUse) {
            findings.push('Description lacks trigger context');
            recommendations.push("Include 'when to use' in description");
            score -= 2;
        }
    }

    // Check body has trigger section
    const hasTriggerSection = body.toLowerCase().includes('trigger');
    if (!hasTriggerSection) {
        findings.push('No trigger section in body');
        recommendations.push("Add 'Trigger' section listing invocation phrases");
        score -= 1;
    }

    return {
        name: 'Trigger Design',
        weight: weights.triggerDesign,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

function _evaluateCodeQuality(
    skillPath: string,
    resources: SkillResources,
    weights: DimensionWeights,
): EvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.codeQuality;
    let score = maxScore;

    if (weights.codeQuality === 0) {
        return {
            name: 'Code Quality',
            weight: 0,
            score: 0,
            maxScore: 0,
            findings: [],
            recommendations: [],
        };
    }

    const scripts = resources.scripts ?? [];
    const tsScripts = scripts.filter((f) => f.endsWith('.ts'));
    const jsScripts = scripts.filter((f) => f.endsWith('.js'));

    if (scripts.length === 0) {
        findings.push('No scripts found');
        recommendations.push('Add helper scripts if needed');
        // Score unchanged - optional for skill
    }

    // Check for test files
    const testFiles = scripts.filter((f) => f.includes('.test.') || f.includes('.spec.'));
    const hasTestsDir = existsSync(join(skillPath, 'tests'));
    if (scripts.length > 0 && testFiles.length === 0 && !hasTestsDir) {
        findings.push('No test files found');
        recommendations.push('Add unit tests for scripts or in tests/ directory');
        score -= 3;
    }

    // Check script naming
    for (const script of [...tsScripts, ...jsScripts]) {
        if (script.includes(' ')) {
            findings.push(`Script '${script}' has spaces in name`);
            recommendations.push('Use kebab-case for script names');
            score -= 1;
            break;
        }
    }

    return {
        name: 'Code Quality',
        weight: weights.codeQuality,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

// ============================================================================
// PLATFORM ADAPTERS
// ============================================================================
// ============================================================================
// CIRCULAR REFERENCE CHECKER
// ============================================================================

/**
 * Detects circular references in skills.
 * Skills should NOT reference their associated commands/agents by name.
 */
function _evaluateCircularReference(
    body: string,
    frontmatter: SkillFrontmatter | null,
    weights: DimensionWeights,
): EvaluationDimension {
    const dimensionName = 'Circular Reference Prevention';
    const findings: string[] = [];
    let score = weights.circularReference || 10;
    const maxScore = score;

    // Get skill name from frontmatter for comparison
    const _skillName = frontmatter?.name || '';

    // Patterns that indicate circular references
    const circularPatterns = [
        {
            // Commands Reference section (explicit violation)
            pattern: /^## Commands Reference$/m,
            message: 'Contains "Commands Reference" section - skills must not list commands that use them',
            severity: 'error',
        },
        {
            // Slash command references in skill docs
            pattern: /\/(rd\d+):[a-z-]+\s+[^\n]*/g,
            message: 'Contains slash command reference - skills must not reference associated commands',
            severity: 'warning',
        },
        {
            // See also sections with command references
            pattern: /See also:.*\/(rd\d+):/gi,
            message: 'Contains "See also" with command reference - circular reference detected',
            severity: 'error',
        },
    ];

    for (const { pattern, message, severity } of circularPatterns) {
        const matches = body.match(pattern);
        if (matches) {
            findings.push(message);
            if (severity === 'error') {
                score = 0; // Critical - fail immediately
            } else {
                score = Math.max(0, score - 5);
            }
        }
    }

    return {
        name: dimensionName,
        weight: score,
        score,
        maxScore,
        percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
        passed: score >= maxScore * 0.5,
        findings,
        recommendations:
            findings.length > 0
                ? ['Remove "Commands Reference" sections', 'Use generic patterns instead of specific command names']
                : [],
    };
}

// ============================================================================
// PLATFORM ADAPTERS
// ============================================================================

const ADAPTERS = {
    claude: new ClaudeAdapter(),
    codex: new CodexAdapter(),
    openclaw: new OpenClawAdapter(),
    opencode: new OpenCodeAdapter(),
    antigravity: new AntigravityAdapter(),
};

async function evaluatePlatform(
    skillPath: string,
    platform: Platform,
): Promise<{ errors: string[]; warnings: string[] }> {
    const adapter = ADAPTERS[platform];
    if (!adapter) {
        return { errors: [], warnings: [] };
    }

    const skillMdPath = join(skillPath, 'SKILL.md');

    if (!existsSync(skillMdPath)) {
        return { errors: ['SKILL.md not found'], warnings: [] };
    }

    const content = readFileSync(skillMdPath, 'utf-8');
    const { frontmatter, body, parseError } = parseMarkdownFrontmatter(content);

    if (parseError) {
        return { errors: [`YAML parse error: ${parseError}`], warnings: [] };
    }

    if (!frontmatter) {
        return { errors: ['No frontmatter found'], warnings: [] };
    }

    const skill = {
        frontmatter: frontmatter as SkillFrontmatter,
        body,
        raw: content,
        path: skillMdPath,
        directory: skillPath,
        resources: discoverResources(skillPath),
    };

    const result = await adapter.validate(skill);

    return {
        errors: result.errors,
        warnings: result.warnings,
    };
}

// ============================================================================
// MAIN EVALUATION
// ============================================================================

export async function evaluateSkill(
    skillPath: string,
    scope: EvaluationScope,
    platforms: Platform[],
): Promise<EvaluationReport> {
    const resolvedPath = resolve(skillPath);
    const skillMdPath = join(resolvedPath, 'SKILL.md');

    if (!existsSync(skillMdPath)) {
        return {
            skillPath: resolvedPath,
            skillName: resolvedPath.split('/').pop() || 'unknown',
            scope,
            overallScore: 0,
            maxScore: 100,
            percentage: 0,
            dimensions: [],
            timestamp: new Date().toISOString(),
            passed: false,
            rejected: true,
            rejectReason: 'SKILL.md not found',
        };
    }

    const content = readFileSync(skillMdPath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);
    const resources = discoverResources(resolvedPath);

    // Determine if skill has scripts
    const hasScripts = detectHasScripts(body, resources);

    // Get appropriate weights
    const weights = hasScripts ? EVALUATION_CONFIG.withScripts : EVALUATION_CONFIG.withoutScripts;

    // Run security scan
    const securityResult = scanForSecurityIssues(content);

    // Check for blacklist (immediate reject)
    if (securityResult.hasBlacklist) {
        return {
            skillPath: resolvedPath,
            skillName: frontmatter?.name || resolvedPath.split('/').pop() || 'unknown',
            scope,
            overallScore: 0,
            maxScore: 100,
            percentage: 0,
            dimensions: [],
            timestamp: new Date().toISOString(),
            passed: false,
            rejected: true,
            rejectReason: `Security blacklist violation: ${securityResult.blacklistFindings.join(', ')}`,
        };
    }

    // Check tests for skills with scripts
    let testsPassed: boolean | null = null;
    if (hasScripts && EVALUATION_CONFIG.entry.requireTestsForScripts) {
        testsPassed = await runTests(resolvedPath);

        if (!testsPassed && EVALUATION_CONFIG.entry.requireTestsToPass) {
            return {
                skillPath: resolvedPath,
                skillName: frontmatter?.name || resolvedPath.split('/').pop() || 'unknown',
                scope,
                overallScore: 0,
                maxScore: 100,
                percentage: 0,
                dimensions: [],
                timestamp: new Date().toISOString(),
                passed: false,
                rejected: true,
                rejectReason: 'Tests required for skills with scripts (tests/ not found or tests failed)',
            };
        }
    }

    // ==========================================================================
    // STEP 1: Extract features (feature engineering)
    // ==========================================================================
    const features = extractFeatures(body, frontmatter, resources, {
        blocked: securityResult.hasBlacklist,
        blacklist: securityResult.blacklistFindings,
        greylist: securityResult.greylistFindings,
    });

    // ==========================================================================
    // STEP 2: Compute dimension scores from features (centralized scoring)
    // ==========================================================================
    const dimensions = computeDimensionScores(features, weights, hasScripts, scope);
    applyInteractionAdvisories(dimensions, collectInteractionAdvisories(resolvedPath, frontmatter, body, resources));

    // Calculate overall score
    const weightedScore = dimensions.reduce((sum, d) => sum + d.score, 0);
    const maxScore = dimensions.reduce((sum, d) => sum + d.maxScore, 0);

    const percentage = maxScore > 0 ? Math.round((weightedScore / maxScore) * 100) : 0;

    // Platform validation (if specified)
    const platformErrors: string[] = [];
    const platformWarnings: string[] = [];

    for (const platform of platforms) {
        const result = await evaluatePlatform(resolvedPath, platform);
        platformErrors.push(...result.errors);
        platformWarnings.push(...result.warnings);
    }

    return {
        skillPath: resolvedPath,
        skillName: frontmatter?.name || resolvedPath.split('/').pop() || 'unknown',
        scope,
        overallScore: weightedScore,
        maxScore,
        percentage,
        dimensions,
        timestamp: new Date().toISOString(),
        passed: meetsPercentageThreshold(percentage) && platformErrors.length === 0,
        ...(testsPassed != null ? { testsPassed } : {}),
        ...(platformErrors.length > 0 ? { platformErrors } : {}),
        ...(platformWarnings.length > 0 ? { platformWarnings } : {}),
    };
}

// ============================================================================
// CLI
// ============================================================================

function printUsage(): void {
    logger.log('Usage: evaluate.ts <skill-path> [options]');
    logger.log('');
    logger.log('Arguments:');
    logger.log('  <skill-path>          Path to skill directory');
    logger.log('');
    logger.log('Options:');
    logger.log('  --scope <level>      Evaluation scope: basic, full (default: full)');
    logger.log('  --platform <name>    Platform: claude, codex, openclaw, opencode, antigravity, all');
    logger.log('  --json                Output results as JSON');
    logger.log('  --verbose, -v         Show detailed evaluation output');
    logger.log('  --help, -h            Show this help message');
}

function printReport(report: EvaluationReport, verbose: boolean): void {
    const overallStatus = getEvaluationDecisionState(report.passed, report.rejected);

    // Check if rejected
    if (report.rejected) {
        logger.log(`\nEvaluation decision: ${overallStatus}`);
        logger.log(`Reason: ${report.rejectReason}`);
        logger.log(`\nSkill: ${report.skillName}`);
        logger.log(`Scope: ${report.scope}`);
        return;
    }

    // Normal evaluation result
    logger.log(`\nEvaluation decision: ${overallStatus} (${report.percentage}%)`);

    logger.log(`\nSkill: ${report.skillName}`);
    logger.log(`Scope: ${report.scope}`);
    logger.log(`Score: ${report.overallScore}/${report.maxScore} (${report.percentage}%)`);

    // Always show dimension scores in table format
    logger.log('\n--- Dimensions ---');
    logger.log('');
    logger.log('| Dimension               | Score  | Max   | %     | Status |');
    logger.log('| ----------------------- | ------ | ----- | ----- | ------ |');

    // Sort by percentage ascending to show weakest first
    const sortedDims = [...report.dimensions].sort((a, b) => {
        const pctA = a.maxScore > 0 ? (a.score / a.maxScore) * 100 : 0;
        const pctB = b.maxScore > 0 ? (b.score / b.maxScore) * 100 : 0;
        return pctA - pctB;
    });

    for (const dim of sortedDims) {
        const pct = dim.maxScore > 0 ? Math.round((dim.score / dim.maxScore) * 100) : 0;
        const status = getThresholdDecisionState(pct);
        const name = dim.name.padEnd(24);
        logger.log(
            `| ${name} | ${String(dim.score).padStart(4)} | ${String(dim.maxScore).padStart(4)} | ${String(pct).padStart(3)}% | ${status} |`,
        );
    }
    logger.log('');

    // Show findings/recommendations in verbose mode
    if (verbose) {
        logger.log('\n--- Detailed Findings ---');
        for (const dim of report.dimensions) {
            if (dim.findings.length > 0 || dim.recommendations.length > 0) {
                logger.log(`\n**${dim.name}**`);
                if (dim.findings.length > 0) {
                    logger.log('  Findings:');
                    for (const f of dim.findings) {
                        logger.log(`    - ${f}`);
                    }
                }
                if (dim.recommendations.length > 0) {
                    logger.log('  Recommendations:');
                    for (const r of dim.recommendations) {
                        logger.log(`    - ${r}`);
                    }
                }
            }
        }
    }

    logger.log('\n--- Summary ---');
    const totalFindings = report.dimensions.reduce((sum, d) => sum + d.findings.length, 0);
    const totalRecs = report.dimensions.reduce((sum, d) => sum + d.recommendations.length, 0);
    logger.log(`Total findings: ${totalFindings}`);
    logger.log(`Total recommendations: ${totalRecs}`);
}

/**
 * Find project root by searching for package.json upward from the script location.
 * This ensures relative paths work regardless of where the user runs the script from.
 * First looks for .git (indicates real project), then falls back to package.json
 * while skipping cache directories.
 */
function findProjectRoot(): string {
    const scriptDir = dirname(fileURLToPath(import.meta.url));
    let dir = scriptDir;
    while (dir !== resolve(dir, '..')) {
        // .git indicates a real project root (cache dirs don't have .git)
        if (existsSync(join(dir, '.git'))) {
            return dir;
        }
        dir = resolve(dir, '..');
    }
    // Fallback: find package.json while skipping cache directories
    dir = scriptDir;
    while (dir !== resolve(dir, '..')) {
        if (existsSync(join(dir, 'package.json'))) {
            // Skip cache directories - they have 'cache' in their path
            const pathParts = dir.split('/');
            const hasCacheDir = pathParts.includes('cache');
            if (!hasCacheDir) {
                return dir;
            }
        }
        dir = resolve(dir, '..');
    }
    return scriptDir; // Final fallback to script directory
}

/**
 * Find the real project root by searching upward from CWD for a directory
 * that has both package.json AND a 'plugins/rd3' subdirectory structure.
 * This handles cases where the script is run from a cache installation.
 */
function _findRealProjectRoot(): string {
    let dir = process.cwd();
    const projectMarker = join('plugins', 'rd3');
    while (dir !== resolve(dir, '..')) {
        if (existsSync(join(dir, 'package.json')) && existsSync(join(dir, projectMarker))) {
            return dir;
        }
        dir = resolve(dir, '..');
    }
    return process.cwd(); // Fallback to CWD
}

function parseCliArgs(): {
    path: string;
    options: {
        scope: EvaluationScope;
        platform: Platform | 'all';
        json: boolean;
        verbose: boolean;
    };
} {
    let args: ReturnType<typeof parseArgs>;
    try {
        args = parseArgs({
            args: process.argv.slice(2),
            allowPositionals: true,
            options: {
                scope: { type: 'string', default: 'full' },
                platform: { type: 'string', default: 'all' },
                json: { type: 'boolean', default: false },
                verbose: { type: 'boolean', short: 'v', default: false },
                help: { type: 'boolean', short: 'h', default: false },
            },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Invalid arguments: ${message}`);
        printUsage();
        process.exit(1);
    }

    if (args.values.help) {
        printUsage();
        process.exit(0);
    }

    const rawPath = args.positionals?.[0];

    if (!rawPath) {
        logger.error('Error: Missing required argument <skill-path>');
        printUsage();
        process.exit(1);
    }

    // Resolve relative paths against project root, not CWD
    // This allows running from any directory (e.g., cd into cc-skills cache)
    const projectRoot = findProjectRoot();
    let path = rawPath.startsWith('/') ? rawPath : resolve(projectRoot, rawPath);

    // If resolved path doesn't exist, search upward from script location to find valid path
    // This handles cases where script is run from a cache installation
    if (!rawPath.startsWith('/') && !existsSync(join(path, 'SKILL.md'))) {
        // Search upward from script location for a directory containing the skill
        const scriptDir = dirname(fileURLToPath(import.meta.url));
        let searchDir = scriptDir;
        while (searchDir !== resolve(searchDir, '..')) {
            const candidatePath = join(searchDir, rawPath);
            if (existsSync(join(candidatePath, 'SKILL.md'))) {
                path = candidatePath;
                break;
            }
            searchDir = resolve(searchDir, '..');
        }
    }

    const validScopes = ['basic', 'full'];
    const scope = (args.values.scope as string) || 'basic';

    if (!validScopes.includes(scope)) {
        logger.error(`Error: Invalid scope '${scope}'`);
        process.exit(1);
    }

    const validPlatforms = ['all', 'claude', 'codex', 'openclaw', 'opencode', 'antigravity'];
    const platform = (args.values.platform as string) || 'all';

    if (!validPlatforms.includes(platform)) {
        logger.error(`Error: Invalid platform '${platform}'`);
        process.exit(1);
    }

    return {
        path,
        options: {
            scope: scope as EvaluationScope,
            platform: platform as Platform | 'all',
            json: args.values.json as boolean,
            verbose: args.values.verbose as boolean,
        },
    };
}

async function main() {
    const { path: skillPath, options } = parseCliArgs();

    if (!options.json) {
        logger.info(`Evaluating skill at: ${skillPath}`);
        logger.info(`Scope: ${options.scope}, Platform: ${options.platform}`);
    }

    const platformsArg =
        options.platform === 'all'
            ? ['claude' as const, 'codex' as const, 'openclaw' as const, 'opencode' as const, 'antigravity' as const]
            : [options.platform as Platform];
    const report = await evaluateSkill(skillPath, options.scope, platformsArg);

    if (options.json) {
        logger.log(JSON.stringify(report, null, 2));
        process.exit(report.passed ? 0 : 1);
    }

    printReport(report, options.verbose);

    process.exit(report.passed ? 0 : 1);
}

import.meta.main && main();
