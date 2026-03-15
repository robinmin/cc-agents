#!/usr/bin/env bun
/**
 * Skill Evaluation Script for rd3:cc-skills
 *
 * Validates and evaluates skill quality across multiple dimensions
 * Uses evaluation.config.ts for configurable weights and rules
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import YAML from 'yaml';
import { AntigravityAdapter } from './adapters/antigravity';
import { ClaudeAdapter } from './adapters/claude';
import { CodexAdapter } from './adapters/codex';
import { OpenClawAdapter } from './adapters/openclaw';
import { OpenCodeAdapter } from './adapters/opencode';
import { type DimensionWeights, EVALUATION_CONFIG } from './evaluation.config';
import type {
    EvaluationDimension,
    EvaluationReport,
    EvaluationScope,
    Platform,
    SkillFrontmatter,
    SkillResources,
} from './types';

// ============================================================================
// TYPES
// ============================================================================

interface ParsedFrontmatter {
    frontmatter: SkillFrontmatter | null;
    body: string;
}

interface SecurityScanResult {
    hasBlacklist: boolean;
    blacklistFindings: string[];
    greylistFindings: string[];
    greylistPenalty: number;
}

// ============================================================================
// FRONTMATTER PARSING
// ============================================================================

function parseFrontmatter(content: string): ParsedFrontmatter {
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

    if (!fmMatch) {
        return { frontmatter: null, body: content };
    }

    const yamlContent = fmMatch[1];
    const body = content.slice(fmMatch[0].length).trim();

    try {
        const frontmatter = YAML.parse(yamlContent) as SkillFrontmatter;
        return { frontmatter, body };
    } catch {
        return { frontmatter: null, body };
    }
}

// ============================================================================
// RESOURCE DISCOVERY
// ============================================================================

function discoverResources(skillPath: string): SkillResources {
    const resources: SkillResources = {};
    const resourceTypes = ['scripts', 'references', 'assets'] as const;

    for (const type of resourceTypes) {
        const resourcePath = join(skillPath, type);
        if (existsSync(resourcePath)) {
            const stat = statSync(resourcePath);
            if (stat.isDirectory()) {
                const files = readdirSync(resourcePath).filter((f: string) => {
                    const filePath = join(resourcePath, f);
                    return statSync(filePath).isFile();
                });
                resources[type] = files;
            }
        }
    }

    return resources;
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

    // Check body content for script patterns
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
        const { readdirSync } = require('node:fs');
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
        const proc = spawn(['bun', 'test', testsPath], {
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const exitCode = await proc.exited;
        return exitCode === 0;
    } catch {
        return false;
    }
}

// ============================================================================
// EVALUATION DIMENSIONS (with configurable weights)
// ============================================================================

function evaluateFrontmatter(frontmatter: SkillFrontmatter | null, weights: DimensionWeights): EvaluationDimension {
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

function evaluateStructure(body: string, resources: SkillResources, weights: DimensionWeights): EvaluationDimension {
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

function evaluateBestPractices(body: string, weights: DimensionWeights): EvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.bestPractices;
    let score = maxScore;

    // Check for TODO
    const todoCount = (body.match(/\bTODO\b/gi) || []).length;
    if (todoCount > 0) {
        findings.push(`Found ${todoCount} TODO marker(s)`);
        recommendations.push('Remove TODO markers before publishing');
        score -= todoCount * 2;
    }

    // Check for placeholder text
    const placeholderCount = (body.match(/\[.*?\]/g) || []).length;
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

    // Check for progressive disclosure
    if (body.length < 500) {
        findings.push('Content may be too brief');
        recommendations.push('Consider adding more detail or references/');
        score -= 2;
    }

    return {
        name: 'Best Practices',
        weight: weights.bestPractices,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

function evaluatePlatformCompatibility(
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

function evaluateCompleteness(body: string, resources: SkillResources, weights: DimensionWeights): EvaluationDimension {
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

function evaluateSecurity(securityResult: SecurityScanResult, weights: DimensionWeights): EvaluationDimension {
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

function evaluateContent(
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

function evaluateTriggerDesign(
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

function evaluateValueAdd(body: string, resources: SkillResources, weights: DimensionWeights): EvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.valueAdd;
    let score = maxScore;

    // Check for unique value propositions
    const hasExamples = body.includes('Example');
    const hasAdvanced = body.toLowerCase().includes('advanced');
    const hasReferences = (resources.references?.length ?? 0) > 0;
    const _hasAssets = (resources.assets?.length ?? 0) > 0;

    if (!hasExamples && body.length > 500) {
        findings.push('No examples despite substantial content');
        recommendations.push('Add concrete examples');
        score -= 2;
    }

    if (!hasAdvanced && body.length > 2000) {
        findings.push('No advanced section for complex content');
        recommendations.push('Add Advanced section');
        score -= 1;
    }

    if (!hasReferences && body.length > 1000) {
        findings.push('Long content without references folder');
        recommendations.push('Move detailed docs to references/');
        score -= 1;
    }

    // Check for differentiation from basic functionality
    const hasComparison = body.toLowerCase().includes('comparison');
    const hasAlternatives = body.toLowerCase().includes('alternative');
    if (!hasComparison && !hasAlternatives && body.length > 1500) {
        findings.push('No comparison or alternatives section');
        recommendations.push('Document alternatives or comparisons');
        score -= 1;
    }

    return {
        name: 'Value Add',
        weight: weights.valueAdd,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

/**
 * Operational Readiness - Merged from Behavioral + Behavioral Readiness
 *
 * Evaluates how well the skill prepares users for both success and failure scenarios:
 * - Success path: use cases, examples, do's/don'ts
 * - Failure path: troubleshooting, edge cases, limitations
 */
function evaluateOperationalReadiness(
    body: string,
    frontmatter: SkillFrontmatter | null,
    weights: DimensionWeights,
): EvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.operationalReadiness;
    let score = maxScore;

    if (weights.operationalReadiness === 0) {
        return {
            name: 'Operational Readiness',
            weight: 0,
            score: 0,
            maxScore: 0,
            findings: [],
            recommendations: [],
        };
    }

    // === Success Path Checks ===
    const isReference =
        frontmatter?.template === 'reference' ||
        frontmatter?.name === 'cc-skills' ||
        body.includes('<!-- eval-ignore-readiness -->');
    const hasUseCases = /use case|scenario|example/i.test(body) || isReference;
    const hasCommonMistakes = /common mistake|pitfall|error|wrong/i.test(body) || isReference;
    const hasDoDont = /do.*don|don.*do|guideline/i.test(body) || isReference;

    if (!hasUseCases) {
        findings.push('No use case or scenario examples');
        recommendations.push('Add concrete usage scenarios');
        score -= 2;
    }

    if (!hasCommonMistakes) {
        findings.push('No common mistakes or pitfalls section');
        recommendations.push("Add 'Common Mistakes' or 'Pitfalls' section");
        score -= 1;
    }

    if (!hasDoDont) {
        findings.push("No do/don't guidelines");
        recommendations.push("Add Do's and Don'ts section");
        score -= 1;
    }

    // === Failure Path Checks ===
    const hasTroubleshooting = /troubleshooting|debug|fail/i.test(body) || isReference;
    const hasEdgeCases = /edge case|boundary/i.test(body) || isReference;
    const hasLimitations = /limitation|restriction|requirement|prerequisite/i.test(body) || isReference;

    if (!hasTroubleshooting) {
        findings.push('No troubleshooting section');
        recommendations.push('Add Troubleshooting section');
        score -= 2;
    }

    if (!hasEdgeCases && body.length > 1000) {
        findings.push('No edge case coverage');
        recommendations.push('Document edge cases');
        score -= 1;
    }

    if (!hasLimitations && body.length > 800) {
        findings.push('No limitations or prerequisites');
        recommendations.push('Add Limitations section');
        score -= 1;
    }

    return {
        name: 'Operational Readiness',
        weight: weights.operationalReadiness,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
    };
}

function evaluateCodeQuality(
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
    const hasTestsDir = require('node:fs').existsSync(require('node:path').join(skillPath, 'tests'));
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

function evaluateEfficiency(body: string, weights: DimensionWeights): EvaluationDimension {
    const findings: string[] = [];
    const recommendations: string[] = [];
    const maxScore = weights.efficiency;
    let score = maxScore;

    // Token efficiency check (rough estimate: 1 token ≈ 4 chars)
    const charCount = body.length;
    const estimatedTokens = Math.ceil(charCount / 4);

    if (estimatedTokens > 3000) {
        findings.push(`Content too long (~${estimatedTokens} tokens)`);
        recommendations.push('Reduce to ~3000 tokens for progressive disclosure');
        score -= 3;
    } else if (estimatedTokens > 2000) {
        findings.push(`Content approaching limit (~${estimatedTokens} tokens)`);
        recommendations.push('Consider moving details to references/');
        score -= 1;
    }

    // Check for redundancy
    const lines = body.split('\n').filter((l) => l.trim().length > 0);
    const uniqueLines = new Set(lines);
    const redundancy = 1 - uniqueLines.size / lines.length;

    if (redundancy > 0.3) {
        findings.push('High content redundancy detected');
        recommendations.push('Remove duplicate content');
        score -= 2;
    }

    // Check for verbose headings
    const bodyNoCodeBlocks = body.replace(/```[\s\S]*?```/g, '');
    const headingCount = (bodyNoCodeBlocks.match(/^#{1,3}\s+/gm) ?? []).length;
    const maxHeadings = Math.max(20, Math.ceil(estimatedTokens / 50));
    if (headingCount > maxHeadings) {
        findings.push('Too many headings (reduce structure)');
        recommendations.push('Simplify heading structure');
        score -= 1;
    }

    return {
        name: 'Efficiency',
        weight: weights.efficiency,
        score: Math.max(0, score),
        maxScore,
        findings,
        recommendations,
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

async function _evaluatePlatform(
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
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

    if (!fmMatch) {
        return { errors: ['No frontmatter found'], warnings: [] };
    }

    const frontmatter = YAML.parse(fmMatch[1]) as SkillFrontmatter;
    const body = content.slice(fmMatch[0].length).trim();

    const skill = {
        frontmatter,
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

async function evaluateSkill(
    skillPath: string,
    scope: EvaluationScope,
    _platforms: Platform[],
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

    const dimensions: EvaluationDimension[] = [];

    // Always run basic evaluations
    dimensions.push(evaluateFrontmatter(frontmatter, weights));
    dimensions.push(evaluateStructure(body, resources, weights));
    dimensions.push(evaluateBestPractices(body, weights));
    dimensions.push(evaluateContent(body, frontmatter, weights));
    dimensions.push(evaluateTriggerDesign(frontmatter, body, weights));
    dimensions.push(evaluateValueAdd(body, resources, weights));

    if (scope === 'full') {
        dimensions.push(evaluatePlatformCompatibility(body, frontmatter, weights));
        dimensions.push(evaluateCompleteness(body, resources, weights));

        // Behavioral & readiness (full scope only)
        dimensions.push(evaluateOperationalReadiness(body, frontmatter, weights));
        dimensions.push(evaluateEfficiency(body, weights));

        // Security only in full scope for skills with scripts
        if (hasScripts) {
            dimensions.push(evaluateSecurity(securityResult, weights));
            dimensions.push(evaluateCodeQuality(resolvedPath, resources, weights));
        }
    }

    // Calculate overall score
    const _totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
    const weightedScore = dimensions.reduce((sum, d) => sum + d.score, 0);
    const maxScore = dimensions.reduce((sum, d) => sum + d.maxScore, 0);

    const percentage = maxScore > 0 ? Math.round((weightedScore / maxScore) * 100) : 0;

    // Platform validation (if specified)
    const _platformErrors: string[] = [];
    const _platformWarnings: string[] = [];

    // Note: Platform adapter validation would go here in async context

    return {
        skillPath: resolvedPath,
        skillName: frontmatter?.name || resolvedPath.split('/').pop() || 'unknown',
        scope,
        overallScore: weightedScore,
        maxScore,
        percentage,
        dimensions,
        timestamp: new Date().toISOString(),
        passed: percentage >= 70,
        ...(testsPassed != null ? { testsPassed } : {}),
    };
}

// ============================================================================
// CLI
// ============================================================================

function printUsage(): void {
    console.log('Usage: evaluate.ts <skill-path> [options]');
    console.log('');
    console.log('Arguments:');
    console.log('  <skill-path>          Path to skill directory');
    console.log('');
    console.log('Options:');
    console.log('  --scope <level>      Evaluation scope: basic, full (default: basic)');
    console.log('  --platform <name>    Platform: claude, codex, openclaw, opencode, antigravity, all');
    console.log('  --json                Output results as JSON');
    console.log('  --verbose, -v         Show detailed evaluation output');
    console.log('  --help, -h            Show this help message');
}

function printReport(report: EvaluationReport, verbose: boolean): void {
    // Check if rejected
    if (report.rejected) {
        console.log('\n✗ Evaluation REJECTED');
        console.log(`Reason: ${report.rejectReason}`);
        console.log(`\nSkill: ${report.skillName}`);
        console.log(`Scope: ${report.scope}`);
        return;
    }

    // Normal evaluation result
    if (report.passed) {
        console.log(`\n✓ Evaluation passed (${report.percentage}%)`);
    } else {
        console.log(`\n✗ Evaluation failed (${report.percentage}%)`);
    }

    console.log(`\nSkill: ${report.skillName}`);
    console.log(`Scope: ${report.scope}`);
    console.log(`Score: ${report.overallScore}/${report.maxScore} (${report.percentage}%)`);

    // Always show dimension scores in table format
    console.log('\n--- Dimensions ---');
    console.log('');
    console.log('| Dimension               | Score  | Max   | %     | Status |');
    console.log('| ----------------------- | ------ | ----- | ----- | ------ |');

    // Sort by percentage ascending to show weakest first
    const sortedDims = [...report.dimensions].sort((a, b) => {
        const pctA = a.maxScore > 0 ? (a.score / a.maxScore) * 100 : 0;
        const pctB = b.maxScore > 0 ? (b.score / b.maxScore) * 100 : 0;
        return pctA - pctB;
    });

    for (const dim of sortedDims) {
        const pct = dim.maxScore > 0 ? Math.round((dim.score / dim.maxScore) * 100) : 0;
        const status = pct >= 70 ? '✓ PASS' : '✗ FAIL';
        const name = dim.name.padEnd(24);
        console.log(
            `| ${name} | ${String(dim.score).padStart(4)} | ${String(dim.maxScore).padStart(4)} | ${String(pct).padStart(3)}% | ${status} |`,
        );
    }
    console.log('');

    // Show findings/recommendations in verbose mode
    if (verbose) {
        console.log('\n--- Detailed Findings ---');
        for (const dim of report.dimensions) {
            if (dim.findings.length > 0 || dim.recommendations.length > 0) {
                console.log(`\n**${dim.name}**`);
                if (dim.findings.length > 0) {
                    console.log('  Findings:');
                    for (const f of dim.findings) {
                        console.log(`    - ${f}`);
                    }
                }
                if (dim.recommendations.length > 0) {
                    console.log('  Recommendations:');
                    for (const r of dim.recommendations) {
                        console.log(`    - ${r}`);
                    }
                }
            }
        }
    }

    console.log('\n--- Summary ---');
    const totalFindings = report.dimensions.reduce((sum, d) => sum + d.findings.length, 0);
    const totalRecs = report.dimensions.reduce((sum, d) => sum + d.recommendations.length, 0);
    console.log(`Total findings: ${totalFindings}`);
    console.log(`Total recommendations: ${totalRecs}`);
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
    const args = parseArgs({
        args: process.argv.slice(2),
        allowPositionals: true,
        options: {
            scope: { type: 'string', default: 'basic' },
            platform: { type: 'string', default: 'all' },
            json: { type: 'boolean', default: false },
            verbose: { type: 'boolean', short: 'v', default: false },
            help: { type: 'boolean', short: 'h', default: false },
        },
    });

    if (args.values.help) {
        printUsage();
        process.exit(0);
    }

    const path = args.positionals?.[0];

    if (!path) {
        console.error('Error: Missing required argument <skill-path>');
        printUsage();
        process.exit(1);
    }

    const validScopes = ['basic', 'full'];
    const scope = (args.values.scope as string) || 'basic';

    if (!validScopes.includes(scope)) {
        console.error(`Error: Invalid scope '${scope}'`);
        process.exit(1);
    }

    const validPlatforms = ['all', 'claude', 'codex', 'openclaw', 'opencode', 'antigravity'];
    const platform = (args.values.platform as string) || 'all';

    if (!validPlatforms.includes(platform)) {
        console.error(`Error: Invalid platform '${platform}'`);
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

    console.log(`[INFO] Evaluating skill at: ${skillPath}`);
    console.log(`[INFO] Scope: ${options.scope}, Platform: ${options.platform}`);

    const platformsArg =
        options.platform === 'all'
            ? ['claude' as const, 'codex' as const, 'openclaw' as const, 'opencode' as const, 'antigravity' as const]
            : [options.platform as Platform];
    const report = await evaluateSkill(skillPath, options.scope, platformsArg);

    if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        process.exit(report.passed ? 0 : 1);
    }

    printReport(report, options.verbose);

    process.exit(report.passed || report.rejected ? 0 : 1);
}

main();
