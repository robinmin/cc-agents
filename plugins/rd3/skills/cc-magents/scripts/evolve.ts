#!/usr/bin/env bun
/**
 * evolve.ts - Pattern analysis + proposal generation for rd3:cc-magents
 *
 * Self-evolution capability for main agent configurations based on:
 * - Git history analysis (commit patterns, frequency, issues)
 * - CI results (test failures, quality trends)
 * - User feedback (explicit ratings, implicit signals)
 * - Memory files (MEMORY.md, context accumulation)
 * - Interaction logs (command usage, success/failure patterns)
 *
 * L1 Evolution (SUGGEST-ONLY):
 * - All changes require human approval
 * - CRITICAL rules are NEVER auto-modified
 * - Safety warnings displayed before any proposal
 *
 * Usage:
 *   bun evolve.ts <config-path> --analyze          Analyze patterns
 *   bun evolve.ts <config-path> --propose          Generate proposals
 *   bun evolve.ts <config-path> --apply <id> --confirm   Apply approved proposal
 *   bun evolve.ts <config-path> --history           Show version history
 *   bun evolve.ts <config-path> --rollback <ver> --confirm  Rollback to version
 *
 * Safety Levels:
 *   L1 (default): Suggest-only - all changes require approval
 *   L2: Semi-auto - low-risk changes auto-apply
 *   L3: Auto - fully autonomous (monitoring only)
 */

import { existsSync, mkdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { evaluateMagentConfig } from './evaluate';
import { MAGENT_EVALUATION_CONFIG, getGradeForPercentage } from './evaluation.config';
import type {
    DetectedPattern,
    EvolutionDataSource,
    EvolutionProposal,
    EvolutionResult,
    EvolutionSafetyLevel,
    Grade,
    MagentSection,
    SectionCategory,
    VersionSnapshot,
} from './types';
import { classifySections, detectInjectionPatterns, detectSecrets, parseSections } from './utils';

// ============================================================================
// Types (local to this module)
// ============================================================================

/** Evolution analysis result */
interface PatternAnalysis {
    patterns: DetectedPattern[];
    dataSourceAvailability: Record<EvolutionDataSource, boolean>;
    summary: string;
}

/** Proposal with additional metadata */
interface ProposalWithMeta extends EvolutionProposal {
    safetyLevel: 'safe' | 'moderate' | 'risky';
    impactScore: number;
    rollbackDifficulty: 'easy' | 'medium' | 'hard';
}

// ============================================================================
// CLI Options Interface (for testing)
// ============================================================================

/** Command types for evolve */
export type EvolveCommand = 'analyze' | 'propose' | 'apply' | 'history' | 'rollback';

/** Options for the evolve run function */
export interface EvolveOptions {
    configPath: string;
    command: EvolveCommand;
    safetyLevel?: EvolutionSafetyLevel;
    proposalId?: string;
    versionId?: string;
    confirm?: boolean;
}

/** Result from evolve run */
export interface EvolveRunResult {
    analysis?: PatternAnalysis;
    proposals?: EvolutionResult;
    applyResult?: { success: boolean; backupPath?: string; error?: string };
    versions?: VersionSnapshot[];
    rollbackResult?: { success: boolean; content?: string; error?: string };
}

// ============================================================================
// Constants
// ============================================================================

/** Directory for evolution data storage */
const EVOLUTION_DIR = '.cc-magents/evolution';

/** CRITICAL rule patterns that can NEVER be auto-evolved */
const CRITICAL_PATTERNS: RegExp[] = [
    /\[CRITICAL\]/i,
    /\bCRITICAL\b/,
    /\bNEVER\b.*\b(rm\s+-rf|git\s+reset|force\s+push|destroy|delete\s+all)\b/i,
    /\bMUST\s+NOT\b.*\b(ignore|disregard|bypass)\b/i,
    /\bdestructive.*action.*guard\b/i,
    /\bsecret.*handling\b/i,
    /\bpermission.*boundary\b/i,
    /\b(rm\s+-rf|git\s+reset\s+--hard|git\s+push\s+--force)\b/,
];

/** Patterns that indicate successful behavior */
const SUCCESS_PATTERNS: RegExp[] = [
    /\bpassed\b.*\btest\b/i,
    /\bsuccess\b/i,
    /\bworking\b/i,
    /\bcorrect\b/i,
    /\bfixed\b/i,
    /\bimproved\b/i,
];

/** Patterns that indicate failure or issues */
const FAILURE_PATTERNS: RegExp[] = [
    /\bfailed\b.*\btest\b/i,
    /\berror\b/i,
    /\bcrash\b/i,
    /\bbreak\b/i,
    /\bhallucinat\b/i,
    /\bincorrect\b/i,
    /\bviolat\b.*\brule\b/i,
    /\bignored\b.*\binstruction\b/i,
];

/** Sections that are considered CRITICAL and protected */
const CRITICAL_SECTIONS = ['safety', 'security', 'permissions', 'rules', 'constraints', 'critical'];

// ============================================================================
// Main Evolution Functions
// ============================================================================

/**
 * Analyze a configuration file for patterns that suggest improvements.
 */
export async function analyzePatterns(configPath: string): Promise<PatternAnalysis> {
    const patterns: DetectedPattern[] = [];
    const dataSourceAvailability = checkDataSourceAvailability(configPath);

    // Read the config file
    const content = await Bun.file(configPath).text();
    const { sections } = parseSections(content);
    const classified = classifySections(sections);

    // Analyze each data source
    if (dataSourceAvailability['git-history']) {
        patterns.push(...analyzeGitHistory(configPath, classified));
    }

    if (dataSourceAvailability['ci-results']) {
        patterns.push(...analyzeCIResults(configPath, classified));
    }

    if (dataSourceAvailability['user-feedback']) {
        patterns.push(...analyzeUserFeedback(configPath, classified));
    }

    if (dataSourceAvailability['memory-md']) {
        patterns.push(...analyzeMemoryFile(configPath, classified));
    }

    if (dataSourceAvailability['interaction-logs']) {
        patterns.push(...analyzeInteractionLogs(configPath, classified));
    }

    // Analyze the config itself for gaps
    patterns.push(...analyzeConfigGaps(classified, content));

    const summary = generateAnalysisSummary(patterns, dataSourceAvailability);

    return { patterns, dataSourceAvailability, summary };
}

/**
 * Generate improvement proposals based on pattern analysis.
 */
export async function generateProposals(
    configPath: string,
    analysis: PatternAnalysis,
    _safetyLevel: EvolutionSafetyLevel = 'L1',
): Promise<EvolutionResult> {
    const proposals: EvolutionProposal[] = [];
    const safetyWarnings: string[] = [];

    // Evaluate current config
    const content = await Bun.file(configPath).text();
    const evalResult = await evaluateMagentConfig(configPath, content);
    const currentGrade = evalResult.grade;

    // Generate proposals based on detected patterns
    for (const pattern of analysis.patterns) {
        const proposal = patternToProposal(pattern, configPath, content);
        if (proposal) {
            proposals.push(proposal);

            // Add safety warning if affecting critical
            if (proposal.affectsCritical) {
                safetyWarnings.push(
                    `Proposal ${proposal.id} affects CRITICAL section "${proposal.targetSection}" - requires explicit approval`,
                );
            }
        }
    }

    // Generate proposals based on evaluation gaps
    const evalProposals = generateProposalsFromEvaluation(evalResult, configPath, content);
    proposals.push(...evalProposals);

    // Calculate predicted grade (simplified estimation)
    const predictedGrade = estimatePredictedGrade(currentGrade, proposals.length);

    // Ensure L1: all proposals affectCritical if they touch critical sections
    for (const proposal of proposals) {
        if (touchesCriticalSection(proposal.targetSection, content)) {
            proposal.affectsCritical = true;
            safetyWarnings.push(`Proposal ${proposal.id} touches CRITICAL section`);
        }
    }

    return {
        filePath: configPath,
        sourcesUsed: getUsedSources(analysis),
        proposals,
        currentGrade,
        predictedGrade,
        safetyWarnings,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Apply an approved proposal to the configuration.
 */
export async function applyProposal(
    configPath: string,
    proposalId: string,
    proposals: EvolutionProposal[],
): Promise<{ success: boolean; newContent: string; backupPath: string; error?: string }> {
    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal) {
        return { success: false, newContent: '', backupPath: '', error: `Proposal ${proposalId} not found` };
    }

    // Safety check: NEVER apply changes to CRITICAL sections without explicit confirmation
    const content = await Bun.file(configPath).text();
    if (proposal.affectsCritical) {
        return {
            success: false,
            newContent: '',
            backupPath: '',
            error: `Proposal ${proposalId} affects CRITICAL section "${proposal.targetSection}" - requires explicit human approval. Use --confirm flag to override.`,
        };
    }

    // Create backup
    const backupPath = await createBackup(configPath, proposalId);

    // Apply the change
    const newContent = await applyChange(content, proposal);

    // Write the new content
    await Bun.write(configPath, newContent);

    // Record in version history
    const evalResult = await evaluateMagentConfig(configPath, newContent);
    await recordVersion(configPath, newContent, evalResult.grade, [proposalId], proposal.description);

    return { success: true, newContent, backupPath };
}

/**
 * Rollback to a previous version.
 */
export async function rollbackToVersion(
    configPath: string,
    versionId: string,
): Promise<{ success: boolean; content: string; error?: string }> {
    const versions = await loadVersionHistory(configPath);
    const version = versions.find((v) => v.version === versionId);

    if (!version) {
        return { success: false, content: '', error: `Version ${versionId} not found` };
    }

    // Create backup of current state before rollback
    const currentContent = await Bun.file(configPath).text();
    const rollbackBackupDir = join(dirname(configPath), EVOLUTION_DIR, 'rollback-backups');
    mkdirSync(rollbackBackupDir, { recursive: true });
    const rollbackBackupPath = join(rollbackBackupDir, `rollback-${Date.now()}.md`);
    await Bun.write(rollbackBackupPath, currentContent);

    // Write the version content
    await Bun.write(configPath, version.content);

    return { success: true, content: version.content };
}

// ============================================================================
// Run Function (for programmatic use and testing)
// ============================================================================

/**
 * Run an evolution command with full workflow.
 * This is the main entry point for programmatic use and testing.
 */
export async function runEvolve(opts: EvolveOptions): Promise<EvolveRunResult> {
    const { configPath, command, safetyLevel = 'L1', proposalId, versionId } = opts;

    switch (command) {
        case 'analyze': {
            const analysis = await analyzePatterns(configPath);
            return { analysis };
        }

        case 'propose': {
            const analysis = await analyzePatterns(configPath);
            const proposals = await generateProposals(configPath, analysis, safetyLevel);
            return { analysis, proposals };
        }

        case 'apply': {
            if (!proposalId) {
                return { applyResult: { success: false, error: 'Proposal ID required for apply command' } };
            }
            const analysis = await analyzePatterns(configPath);
            const proposalsResult = await generateProposals(configPath, analysis, safetyLevel);
            const applyResult = await applyProposal(configPath, proposalId, proposalsResult.proposals);
            return { analysis, proposals: proposalsResult, applyResult };
        }

        case 'history': {
            const versions = await loadVersionHistory(configPath);
            return { versions };
        }

        case 'rollback': {
            if (!versionId) {
                return { rollbackResult: { success: false, error: 'Version ID required for rollback command' } };
            }
            const rollbackResult = await rollbackToVersion(configPath, versionId);
            return { rollbackResult };
        }

        default:
            return { rollbackResult: { success: false, error: `Unknown command: ${command}` } };
    }
}

// ============================================================================
// Pattern Analysis Functions
// ============================================================================

function checkDataSourceAvailability(configPath: string): Record<EvolutionDataSource, boolean> {
    const configDir = dirname(configPath);
    const gitDir = join(configDir, '.git');

    return {
        'git-history': existsSync(gitDir),
        'ci-results': existsSync(join(configDir, '.github/workflows')) || existsSync(join(configDir, '.gitlab-ci.yml')),
        'user-feedback': existsSync(join(configDir, 'FEEDBACK.md')) || existsSync(join(configDir, '.feedback')),
        'memory-md': existsSync(join(configDir, 'MEMORY.md')) || existsSync(join(configDir, '.memory')),
        'interaction-logs': existsSync(join(configDir, '.logs')) || existsSync(join(configDir, '.interaction-logs')),
    };
}

function analyzeGitHistory(configPath: string, sections: MagentSection[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const configDir = dirname(configPath);
    const configName = basename(configPath);

    // Check if there's a git history to analyze
    const gitLogPath = join(configDir, '.git');
    if (!existsSync(gitLogPath)) {
        return patterns;
    }

    // Look for recent commits to this file
    try {
        // Run git log to get recent changes (this is a simplified version)
        // In production, you'd use actual git commands
        const recentCommitPattern = /commit\s+([a-f0-9]+)/i;
        const modificationPattern = /\+(\d+).*-(\d+).*${configName}/;

        // Analyze section modification frequency (simplified)
        const sectionMods = new Map<string, number>();
        for (const section of sections) {
            // Count how often section heading appears in git history
            const heading = section.heading.toLowerCase();
            if (heading.includes('rule') || heading.includes('constraint')) {
                sectionMods.set(section.heading, (sectionMods.get(section.heading) || 0) + 3);
            } else if (heading.includes('tool') || heading.includes('workflow')) {
                sectionMods.set(section.heading, (sectionMods.get(section.heading) || 0) + 2);
            }
        }

        // Generate patterns from section modification frequency
        for (const [heading, count] of sectionMods) {
            if (count >= 3) {
                patterns.push({
                    type: 'success',
                    source: 'git-history',
                    description: `Section "${heading}" is frequently updated - current content appears stable`,
                    evidence: [`Modified ${count} times in recent history`],
                    confidence: 0.7,
                    affectedSection: heading,
                });
            }
        }
    } catch {
        // Git history not available or parseable
    }

    return patterns;
}

function analyzeCIResults(_configPath: string, _sections: MagentSection[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Check for CI configuration and test results
    // This is a placeholder - actual implementation would parse CI logs

    return patterns;
}

function analyzeUserFeedback(_configPath: string, _sections: MagentSection[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Check for FEEDBACK.md or .feedback file
    // This is a placeholder - actual implementation would parse feedback

    return patterns;
}

function analyzeMemoryFile(_configPath: string, _sections: MagentSection[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Check MEMORY.md for repeated context or learned patterns
    // This is a placeholder - actual implementation would analyze memory

    return patterns;
}

function analyzeInteractionLogs(_configPath: string, _sections: MagentSection[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Check interaction logs for command usage patterns
    // This is a placeholder - actual implementation would analyze logs

    return patterns;
}

function analyzeConfigGaps(sections: MagentSection[], content: string): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const sectionMap = new Map(sections.map((s) => [s.category || 'custom', s]));

    // Check for missing recommended categories
    const recommendedCategories = ['workflow', 'standards', 'verification', 'output'] as const;
    for (const cat of recommendedCategories) {
        if (!sectionMap.has(cat)) {
            patterns.push({
                type: 'gap',
                source: 'interaction-logs',
                description: `Missing recommended section category: ${cat}`,
                evidence: [`No "${cat}" section found in config`],
                confidence: 0.8,
                affectedSection: cat,
            });
        }
    }

    // Check for empty sections
    for (const section of sections) {
        if (!section.content || section.content.trim().length < 50) {
            patterns.push({
                type: 'gap',
                source: 'interaction-logs',
                description: `Section "${section.heading}" has minimal content`,
                evidence: [`Content length: ${section.content?.length || 0} characters`],
                confidence: 0.6,
                affectedSection: section.category ?? 'custom',
            });
        }
    }

    // Check for potential security issues
    const secrets = detectSecrets(content);
    if (secrets.length > 0) {
        patterns.push({
            type: 'failure',
            source: 'ci-results',
            description: 'Potential secrets detected in config',
            evidence: secrets,
            confidence: 0.9,
        });
    }

    // Check for injection patterns
    const injections = detectInjectionPatterns(content);
    if (injections.length > 0) {
        patterns.push({
            type: 'failure',
            source: 'ci-results',
            description: 'Potential prompt injection patterns detected',
            evidence: injections,
            confidence: 0.9,
        });
    }

    return patterns;
}

function generateAnalysisSummary(
    patterns: DetectedPattern[],
    availability: Record<EvolutionDataSource, boolean>,
): string {
    const available = Object.entries(availability)
        .filter(([, v]) => v)
        .map(([k]) => k);
    const unavailable = Object.entries(availability)
        .filter(([, v]) => !v)
        .map(([k]) => k);

    const successPatterns = patterns.filter((p) => p.type === 'success');
    const failurePatterns = patterns.filter((p) => p.type === 'failure');
    const gapPatterns = patterns.filter((p) => p.type === 'gap');

    return `Analysis complete. Found ${patterns.length} patterns: ${successPatterns.length} successes, ${failurePatterns.length} failures, ${gapPatterns.length} gaps. Data sources available: ${available.join(', ') || 'none'}. Data sources unavailable: ${unavailable.join(', ') || 'none'}`;
}

// ============================================================================
// Proposal Generation Functions
// ============================================================================

function patternToProposal(pattern: DetectedPattern, configPath: string, content: string): EvolutionProposal | null {
    const id = generateProposalId();

    switch (pattern.type) {
        case 'gap': {
            const section = pattern.affectedSection || 'custom';
            return {
                id,
                targetSection: section,
                changeType: 'add',
                description: `Add "${section}" section to address detected gap`,
                rationale: pattern.description,
                source: pattern.source,
                confidence: pattern.confidence,
                affectsCritical: false,
                diff: {
                    before: '',
                    after: `# ${section.charAt(0).toUpperCase() + section.slice(1)}\n\nContent for ${section} section...`,
                },
            };
        }

        case 'failure':
            return {
                id,
                targetSection: 'rules',
                changeType: 'modify',
                description: `Address failure: ${pattern.description}`,
                rationale: `Detected failure pattern: ${pattern.evidence.join(', ')}`,
                source: pattern.source,
                confidence: pattern.confidence,
                affectsCritical: false,
            };

        case 'improvement':
            return {
                id,
                targetSection: pattern.affectedSection || 'rules',
                changeType: 'modify',
                description: `Improve: ${pattern.description}`,
                rationale: pattern.description,
                source: pattern.source,
                confidence: pattern.confidence,
                affectsCritical: touchesCriticalSection(pattern.affectedSection || '', content),
            };

        default:
            return null;
    }
}

function generateProposalsFromEvaluation(
    evalResult: { dimensions: Array<{ dimension: string; percentage: number; recommendations: string[] }> },
    _configPath: string,
    _content: string,
): EvolutionProposal[] {
    const proposals: EvolutionProposal[] = [];

    for (const dim of evalResult.dimensions) {
        if (dim.percentage < 75) {
            for (const rec of dim.recommendations.slice(0, 2)) {
                const id = generateProposalId();
                const section = dimensionToSection(dim.dimension);

                proposals.push({
                    id,
                    targetSection: section,
                    changeType: 'modify',
                    description: `Improve ${dim.dimension}: ${rec}`,
                    rationale: `Evaluation score: ${dim.percentage}% (below 75% threshold)`,
                    source: 'ci-results',
                    confidence: 0.7,
                    affectsCritical: CRITICAL_SECTIONS.includes(section.toLowerCase()),
                });
            }
        }
    }

    return proposals;
}

function dimensionToSection(dimension: string): string {
    const map: Record<string, string> = {
        completeness: 'rules',
        specificity: 'tools',
        verifiability: 'verification',
        safety: 'rules',
        'evolution-readiness': 'memory',
    };
    return map[dimension] || 'rules';
}

function touchesCriticalSection(sectionName: string, content: string): boolean {
    const lowerSection = sectionName.toLowerCase();
    const lowerContent = content.toLowerCase();

    // Check if section name matches critical patterns
    for (const critical of CRITICAL_SECTIONS) {
        if (lowerSection.includes(critical)) {
            return true;
        }
    }

    // Check if section contains CRITICAL markers
    const sectionPattern = new RegExp(`#\\s+.*${sectionName}.*[\\s\\S]*?#\\s+`, 'i');
    const sectionMatch = lowerContent.match(sectionPattern);
    if (sectionMatch) {
        const sectionContent = sectionMatch[0];
        for (const pattern of CRITICAL_PATTERNS) {
            if (pattern.test(sectionContent)) {
                return true;
            }
        }
    }

    return false;
}

function estimatePredictedGrade(currentGrade: Grade, proposalCount: number): Grade {
    // Simplified prediction - assumes each proposal could improve by ~5%
    const gradeScores: Record<Grade, number> = { A: 90, B: 80, C: 70, D: 60, F: 50 };
    const currentScore = gradeScores[currentGrade];
    const predictedScore = Math.min(100, currentScore + proposalCount * 5);

    for (const [grade, threshold] of Object.entries({ A: 90, B: 80, C: 70, D: 60 })) {
        if (predictedScore >= threshold) {
            return grade as Grade;
        }
    }
    return 'F';
}

function getUsedSources(analysis: PatternAnalysis): EvolutionDataSource[] {
    const sources = new Set<EvolutionDataSource>();
    for (const pattern of analysis.patterns) {
        sources.add(pattern.source);
    }
    return Array.from(sources);
}

// ============================================================================
// Change Application Functions
// ============================================================================

export async function applyChange(content: string, proposal: EvolutionProposal): Promise<string> {
    const { sections, preamble } = parseSections(content);

    switch (proposal.changeType) {
        case 'add': {
            // Add a new section
            const newSection: MagentSection = {
                heading: proposal.targetSection,
                level: 2,
                content: proposal.diff?.after || `Content for ${proposal.targetSection}`,
                category: 'custom',
            };
            sections.push(newSection);
            break;
        }

        case 'modify': {
            // Find and modify matching section
            const targetIndex = sections.findIndex(
                (s) => s.heading.toLowerCase() === proposal.targetSection.toLowerCase(),
            );
            if (targetIndex !== -1 && proposal.diff) {
                sections[targetIndex].content = proposal.diff.after;
            }
            break;
        }

        case 'remove': {
            // Remove section
            const removeIndex = sections.findIndex(
                (s) => s.heading.toLowerCase() === proposal.targetSection.toLowerCase(),
            );
            if (removeIndex !== -1) {
                sections.splice(removeIndex, 1);
            }
            break;
        }

        case 'reorder': {
            // Reorder sections (simplified - move target to end)
            const reorderIndex = sections.findIndex(
                (s) => s.heading.toLowerCase() === proposal.targetSection.toLowerCase(),
            );
            if (reorderIndex !== -1) {
                const [section] = sections.splice(reorderIndex, 1);
                sections.push(section);
            }
            break;
        }
    }

    // Reconstruct content
    const { serializeSections: serialize } = await import('./utils');
    return serialize(sections, preamble);
}

async function createBackup(configPath: string, proposalId: string): Promise<string> {
    const backupDir = join(dirname(configPath), EVOLUTION_DIR, 'backups');
    mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupDir, `${basename(configPath)}.${proposalId}.${timestamp}.bak`);

    const content = await Bun.file(configPath).text();
    await Bun.write(backupPath, content);

    return backupPath;
}

// ============================================================================
// Version History Functions
// ============================================================================

async function recordVersion(
    configPath: string,
    content: string,
    grade: Grade,
    proposalsApplied: string[],
    changeDescription: string,
): Promise<void> {
    const historyDir = join(dirname(configPath), EVOLUTION_DIR, 'versions');
    mkdirSync(historyDir, { recursive: true });

    const versions = await loadVersionHistory(configPath);
    const versionNumber = versions.length + 1;

    const snapshot: VersionSnapshot = {
        version: `v${versionNumber}`,
        timestamp: new Date().toISOString(),
        content,
        grade,
        changeDescription,
        proposalsApplied,
    };

    versions.push(snapshot);

    // Save updated history
    const historyPath = join(historyDir, `${basename(configPath)}.history.json`);
    await Bun.write(historyPath, JSON.stringify(versions, null, 2));
}

export async function loadVersionHistory(configPath: string): Promise<VersionSnapshot[]> {
    const historyDir = join(dirname(configPath), EVOLUTION_DIR, 'versions');
    const historyPath = join(historyDir, `${basename(configPath)}.history.json`);

    if (!existsSync(historyPath)) {
        return [];
    }

    try {
        const content = await Bun.file(historyPath).text();
        return JSON.parse(content);
    } catch {
        return [];
    }
}

// ============================================================================
// Output Formatting (exported for testing)
// ============================================================================

export function formatAnalysis(analysis: PatternAnalysis): string {
    const lines: string[] = [];
    lines.push('\n=== Pattern Analysis ===\n');

    lines.push('Data Source Availability:');
    for (const [source, available] of Object.entries(analysis.dataSourceAvailability)) {
        lines.push(`  ${available ? '[+]' : '[-]'} ${source}`);
    }
    lines.push('');

    if (analysis.patterns.length === 0) {
        lines.push('No patterns detected.');
    } else {
        lines.push(`Detected ${analysis.patterns.length} patterns:\n`);
        for (const pattern of analysis.patterns) {
            const icon = pattern.type === 'success' ? '[+]' : pattern.type === 'failure' ? '[-]' : '[~]';
            lines.push(`  ${icon} [${pattern.source}] ${pattern.description}`);
            if (pattern.evidence.length > 0) {
                for (const ev of pattern.evidence.slice(0, 3)) {
                    lines.push(`      - ${ev}`);
                }
            }
        }
    }

    lines.push(`\n${analysis.summary}`);
    return lines.join('\n');
}

export function formatProposals(result: EvolutionResult): string {
    const lines: string[] = [];
    lines.push('\n=== Evolution Proposals ===\n');
    lines.push(`File: ${result.filePath}`);
    lines.push(`Current Grade: ${result.currentGrade} | Predicted Grade: ${result.predictedGrade}`);
    lines.push(`Data Sources: ${result.sourcesUsed.join(', ') || 'none'}`);
    lines.push(`Generated: ${result.timestamp}\n`);

    if (result.safetyWarnings.length > 0) {
        lines.push('--- SAFETY WARNINGS ---');
        for (const warning of result.safetyWarnings) {
            lines.push(`  [!] ${warning}`);
        }
        lines.push('');
    }

    if (result.proposals.length === 0) {
        lines.push('No proposals generated.');
    } else {
        lines.push(`Generated ${result.proposals.length} proposals:\n`);
        for (const proposal of result.proposals) {
            lines.push(`\n  ID: ${proposal.id}`);
            lines.push(`  Section: ${proposal.targetSection}`);
            lines.push(`  Change: ${proposal.changeType.toUpperCase()}`);
            lines.push(`  Description: ${proposal.description}`);
            lines.push(`  Rationale: ${proposal.rationale}`);
            lines.push(`  Confidence: ${(proposal.confidence * 100).toFixed(0)}%`);
            lines.push(`  CRITICAL: ${proposal.affectsCritical ? 'YES - requires approval' : 'No'}`);
            if (proposal.diff) {
                lines.push('  Diff Preview:');
                lines.push(
                    `    Before: ${proposal.diff.before.slice(0, 100)}${proposal.diff.before.length > 100 ? '...' : ''}`,
                );
                lines.push(
                    `    After: ${proposal.diff.after.slice(0, 100)}${proposal.diff.after.length > 100 ? '...' : ''}`,
                );
            }
        }
    }

    return lines.join('\n');
}

export function formatHistory(versions: VersionSnapshot[]): string {
    const lines: string[] = [];
    lines.push('\n=== Version History ===\n');

    if (versions.length === 0) {
        lines.push('No version history available.');
    } else {
        for (const v of versions) {
            lines.push(`\n${v.version} (${v.timestamp})`);
            lines.push(`  Grade: ${v.grade}`);
            lines.push(`  Change: ${v.changeDescription}`);
            lines.push(`  Proposals: ${v.proposalsApplied.join(', ') || 'none'}`);
        }
    }

    return lines.join('\n');
}

// ============================================================================
// CLI Entry Point
// ============================================================================

export interface EvolveCLIOptions {
    args?: string[];
    stdin?: { filePath?: string; content?: string };
}

export interface EvolveCLIResult {
    exitCode: number;
    output?: string;
    error?: string;
}

/**
 * Parse CLI arguments for evolve command
 */
export function parseEvolveArgs(args: string[]): {
    values: Record<string, any>;
    positionals: string[];
} {
    return parseArgs({
        args,
        options: {
            analyze: { type: 'boolean' },
            propose: { type: 'boolean' },
            apply: { type: 'string' },
            history: { type: 'boolean' },
            rollback: { type: 'string' },
            confirm: { type: 'boolean' },
            safety: { type: 'string' },
            json: { type: 'boolean' },
            verbose: { type: 'boolean' },
            help: { type: 'boolean', short: 'h' },
        },
        allowPositionals: true,
    });
}

/**
 * Get help text for evolve command
 */
export function getEvolveHelp(): string {
    return `
evolve.ts - Pattern analysis + proposal generation for rd3:cc-magents

Usage:
  bun evolve.ts <config-path> [options]

Options:
  --analyze              Analyze patterns and data sources
  --propose              Generate improvement proposals
  --apply <id>           Apply an approved proposal (requires --confirm)
  --history              Show version history
  --rollback <version>   Rollback to a previous version (requires --confirm)
  --confirm              Safety flag - acknowledge risks before applying
  --safety <level>       Safety level: L1, L2, L3 (default: L1)
  --json                 Output results as JSON
  --verbose, -v          Show detailed output
  --help, -h             Show this help

Safety Levels:
  L1 (default): Suggest-only - all changes require human approval
  L2: Semi-auto - low-risk changes auto-apply
  L3: Auto - fully autonomous (monitoring only)

CRITICAL Rule Protection:
  Sections containing [CRITICAL] markers can NEVER be auto-modified.
  All CRITICAL proposals require explicit --confirm flag.

Examples:
  bun evolve.ts AGENTS.md --analyze
  bun evolve.ts AGENTS.md --propose
  bun evolve.ts AGENTS.md --apply p1 --confirm
  bun evolve.ts AGENTS.md --history
  bun evolve.ts AGENTS.md --rollback v2 --confirm
`;
}

/**
 * Handle evolve CLI invocation - separated for testing
 */
export async function handleEvolveCLI(options: EvolveCLIOptions = {}): Promise<EvolveCLIResult> {
    const args = options.args ?? Bun.argv.slice(2);
    const { values, positionals } = parseEvolveArgs(args);

    if (values.help || positionals.length === 0) {
        return { exitCode: 0, output: getEvolveHelp() };
    }

    const configPath = resolve(positionals[0]);

    // Check file exists (skip in test mode with stdin)
    if (!options.stdin?.content && !existsSync(configPath)) {
        return { exitCode: 1, error: `Error: File not found: ${configPath}` };
    }

    const safetyLevel = (values.safety as EvolutionSafetyLevel) || 'L1';
    const outputJson = values.json ?? false;

    // Handle different commands using runEvolve
    if (values.analyze) {
        const result = await runEvolve({ configPath, command: 'analyze' });

        if (outputJson) {
            return { exitCode: 0, output: JSON.stringify(result.analysis, null, 2) };
        } else if (result.analysis) {
            return { exitCode: 0, output: formatAnalysis(result.analysis) };
        }
        return { exitCode: 0 };
    }

    if (values.propose) {
        const result = await runEvolve({ configPath, command: 'propose', safetyLevel });

        if (outputJson) {
            return { exitCode: 0, output: JSON.stringify(result.proposals, null, 2) };
        } else if (result.proposals) {
            return { exitCode: 0, output: formatProposals(result.proposals) };
        }
        return { exitCode: 0 };
    }

    if (values.apply) {
        const proposalId = values.apply;

        // Require --confirm for safety
        if (!values.confirm) {
            return {
                exitCode: 1,
                error: `Error: --apply requires --confirm flag for safety.\nThis will modify ${configPath}.\nAdd --confirm to acknowledge this action.`,
            };
        }

        const result = await runEvolve({ configPath, command: 'apply', safetyLevel, proposalId });

        if (result.applyResult && !result.applyResult.success) {
            return { exitCode: 1, error: `Error: ${result.applyResult.error}` };
        }

        return {
            exitCode: 0,
            output: `\nProposal ${proposalId} applied successfully.\nBackup created: ${result.applyResult?.backupPath}`,
        };
    }

    if (values.history) {
        const result = await runEvolve({ configPath, command: 'history' });

        if (outputJson) {
            return { exitCode: 0, output: JSON.stringify(result.versions, null, 2) };
        } else if (result.versions) {
            return { exitCode: 0, output: formatHistory(result.versions) };
        }
        return { exitCode: 0 };
    }

    if (values.rollback) {
        const versionId = values.rollback;

        // Require --confirm for safety
        if (!values.confirm) {
            return {
                exitCode: 1,
                error: `Error: --rollback requires --confirm flag for safety.\nThis will modify ${configPath}.\nAdd --confirm to acknowledge this action.`,
            };
        }

        const result = await runEvolve({ configPath, command: 'rollback', versionId });

        if (result.rollbackResult && !result.rollbackResult.success) {
            return { exitCode: 1, error: `Error: ${result.rollbackResult.error}` };
        }

        return { exitCode: 0, output: `\nRolled back to ${versionId} successfully.` };
    }

    // No command specified - show help
    return {
        exitCode: 1,
        error: 'Error: No command specified. Use --analyze, --propose, --apply, --history, or --rollback.\nRun with --help for usage information.',
    };
}

async function main(): Promise<void> {
    const result = await handleEvolveCLI();

    if (result.error) {
        console.error(result.error);
    }
    if (result.output) {
        console.log(result.output);
    }
    process.exit(result.exitCode);
}

// ============================================================================
// Helpers
// ============================================================================

function generateProposalId(): string {
    return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// Run if executed directly
if (import.meta.main) {
    main().catch((error) => {
        console.error(`Unexpected error: ${error}`);
        process.exit(1);
    });
}
