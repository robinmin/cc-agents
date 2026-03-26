#!/usr/bin/env bun
/**
 * Main Agent Config Refinement Script for rd3:cc-magents
 *
 * Auto-fixes structural issues and suggests quality improvements for
 * main agent configuration files.
 *
 * Usage:
 *   bun refine.ts <config-path> [options]
 *
 * Options:
 *   --dry-run              Show changes without applying (default: true)
 *   --apply                Actually apply fixes
 *   --llm                  Include LLM-generated suggestions
 *   --output, -o <path>    Output path for refined config
 *   --profile <name>       Weight profile for evaluation (standard, minimal, advanced)
 *   --verbose, -v          Show detailed output
 *   --help, -h             Show help
 *
 * Examples:
 *   bun refine.ts AGENTS.md --dry-run          # Preview changes
 *   bun refine.ts AGENTS.md --apply           # Apply fixes
 *   bun refine.ts AGENTS.md --llm --apply     # Include LLM suggestions
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { logger } from '../../../scripts/logger';

import { evaluateMagentConfig } from './evaluate';
import type {
    MagentEvaluationReport,
    MagentSection,
    RefineAction,
    RefineOptions,
    RefineResult,
    SectionCategory,
    UniversalMainAgent,
} from './types';
import { buildUMAM, detectPlatform, serializeSections } from './utils';
import { validateMagentConfig } from './validate';

// ============================================================================
// Constants
// ============================================================================

/** Minimum content length for a section to be considered substantive */
const MIN_SECTION_CONTENT_LENGTH = 50;

/** CRITICAL section markers - these sections are never modified */
const CRITICAL_MARKERS = ['[CRITICAL]', 'CRITICAL:', '**CRITICAL**', '<!-- CRITICAL -->'];

/** Forbidden phrases that should be flagged */
const FORBIDDEN_PHRASES = [
    { phrase: 'great question', suggestion: 'Directly acknowledge and answer' },
    { phrase: "i'm sorry", suggestion: 'Focus on solutions, not apologies' },
    { phrase: 'would you like me to', suggestion: 'Take initiative within scope' },
    { phrase: 'let me think', suggestion: 'Analyze silently, then communicate conclusions' },
    { phrase: 'as an ai', suggestion: 'Just perform the task' },
    { phrase: 'i am an ai', suggestion: 'Just perform the task' },
];

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Check if a section is marked as CRITICAL (protected from modification).
 */
function isCriticalSection(section: MagentSection): boolean {
    const content = `${section.heading} ${section.content}`;
    return CRITICAL_MARKERS.some((marker) => content.includes(marker));
}

/**
 * Detect forbidden phrases in content.
 */
function detectForbiddenPhrases(content: string): Array<{ phrase: string; suggestion: string }> {
    const found: Array<{ phrase: string; suggestion: string }> = [];
    const lowerContent = content.toLowerCase();

    for (const { phrase, suggestion } of FORBIDDEN_PHRASES) {
        if (lowerContent.includes(phrase)) {
            found.push({ phrase, suggestion });
        }
    }

    return found;
}

/**
 * Analyze a UMAM model for structural issues.
 */
export function analyzeStructuralIssues(model: UniversalMainAgent): {
    emptySections: MagentSection[];
    duplicateHeadings: string[];
    missingRequiredCategories: SectionCategory[];
    lowContentSections: MagentSection[];
} {
    const emptySections = model.sections.filter((s) => !s.content || s.content.trim().length === 0);
    const duplicateHeadings: string[] = [];
    const lowContentSections: MagentSection[] = [];

    // Check for duplicate top-level headings
    const topHeadings = model.sections.filter((s) => s.level <= 2).map((s) => s.heading.toLowerCase());
    const seen = new Set<string>();
    for (const heading of topHeadings) {
        if (seen.has(heading)) {
            duplicateHeadings.push(heading);
        }
        seen.add(heading);
    }

    // Check for low-content sections (but not empty or critical)
    for (const section of model.sections) {
        if (isCriticalSection(section)) continue;
        if (section.content && section.content.trim().length < MIN_SECTION_CONTENT_LENGTH) {
            lowContentSections.push(section);
        }
    }

    // Check for missing required categories
    const presentCategories = new Set(model.sections.map((s) => s.category));
    const requiredCategories: SectionCategory[] = ['identity', 'rules', 'tools'];
    const missingRequiredCategories = requiredCategories.filter((cat) => !presentCategories.has(cat));

    return {
        emptySections,
        duplicateHeadings,
        missingRequiredCategories,
        lowContentSections,
    };
}

/**
 * Generate auto-fix actions for structural issues.
 */
export function generateStructuralFixes(
    model: UniversalMainAgent,
    issues: ReturnType<typeof analyzeStructuralIssues>,
): RefineAction[] {
    const actions: RefineAction[] = [];

    // Empty sections - suggest removal
    for (const section of issues.emptySections) {
        if (isCriticalSection(section)) continue;
        actions.push({
            type: 'structural',
            description: `Remove empty section: "${section.heading}"`,
            section: section.heading,
            requiresApproval: false,
            diff: {
                before: `# ${section.heading}\n\n${section.content}`,
                after: '',
            },
        });
    }

    // Duplicate headings - suggest merging
    for (const heading of issues.duplicateHeadings) {
        const duplicates = model.sections.filter((s) => s.heading.toLowerCase() === heading);
        if (duplicates.length >= 2 && !isCriticalSection(duplicates[0])) {
            actions.push({
                type: 'structural',
                description: `Merge ${duplicates.length} duplicate sections: "${heading}"`,
                section: heading,
                requiresApproval: true,
            });
        }
    }

    // Missing required categories - suggest adding
    for (const category of issues.missingRequiredCategories) {
        actions.push({
            type: 'structural',
            description: `Add missing "${category}" section`,
            requiresApproval: true,
        });
    }

    // Low-content sections - suggest expansion
    for (const section of issues.lowContentSections) {
        actions.push({
            type: 'quality',
            description: `Expand minimal content in section: "${section.heading}"`,
            section: section.heading,
            requiresApproval: true,
        });
    }

    return actions;
}

/**
 * Generate quality improvement suggestions.
 */
export function generateQualitySuggestions(model: UniversalMainAgent, report: MagentEvaluationReport): RefineAction[] {
    const actions: RefineAction[] = [];

    // Check dimension scores and suggest improvements
    for (const dimension of report.dimensions) {
        if (dimension.percentage < 70) {
            switch (dimension.dimension) {
                case 'operability':
                    actions.push({
                        type: 'quality',
                        description:
                            'Add decision trees, executable examples, and output contracts to improve operability',
                        requiresApproval: true,
                    });
                    break;
                case 'grounding':
                    actions.push({
                        type: 'quality',
                        description: 'Add verification steps, source requirements, and uncertainty handling',
                        requiresApproval: true,
                    });
                    break;
                case 'safety':
                    actions.push({
                        type: 'quality',
                        description: 'Add CRITICAL safety markers for essential rules',
                        requiresApproval: true,
                    });
                    break;
                case 'maintainability':
                    actions.push({
                        type: 'quality',
                        description: 'Add memory, feedback, and versioning patterns for maintainability',
                        requiresApproval: true,
                    });
                    break;
            }
        }
    }

    // Check for forbidden phrases
    for (const section of model.sections) {
        if (isCriticalSection(section)) continue;
        const forbidden = detectForbiddenPhrases(section.content);
        for (const { phrase, suggestion: _suggestion } of forbidden) {
            actions.push({
                type: 'best-practice',
                description: `Remove forbidden phrase "${phrase}" from "${section.heading}"`,
                section: section.heading,
                requiresApproval: false,
            });
        }
    }

    return actions;
}

// ============================================================================
// Fix Application
// ============================================================================

/**
 * Apply structural fixes to a UMAM model.
 */
export function applyStructuralFixes(model: UniversalMainAgent, actions: RefineAction[]): UniversalMainAgent {
    const sections = [...model.sections];

    for (const action of actions) {
        if (action.type !== 'structural') continue;
        if (action.requiresApproval) continue; // Skip actions requiring approval

        if (action.description.startsWith('Remove empty section')) {
            const sectionName = action.description.match(/Remove empty section: "([^"]+)"/)?.[1];
            if (sectionName) {
                const index = sections.findIndex((s) => s.heading === sectionName);
                if (index !== -1 && !isCriticalSection(sections[index])) {
                    sections.splice(index, 1);
                }
            }
        }
    }

    return { ...model, sections };
}

/**
 * Apply forbidden phrase removal.
 */
export function removeForbiddenPhrases(model: UniversalMainAgent): UniversalMainAgent {
    const sections = model.sections.map((section) => {
        if (isCriticalSection(section)) return section;

        let content = section.content;
        for (const { phrase } of FORBIDDEN_PHRASES) {
            // Case-insensitive replacement
            const regex = new RegExp(phrase, 'gi');
            content = content.replace(regex, '');
        }

        return { ...section, content };
    });

    return { ...model, sections };
}

/**
 * Add missing required sections.
 */
export function addMissingSections(
    model: UniversalMainAgent,
    missingCategories: SectionCategory[],
): UniversalMainAgent {
    const sections = [...model.sections];
    const sectionTemplates: Record<SectionCategory, { heading: string; content: string }> = {
        identity: {
            heading: 'Identity',
            content: `**Role**: [Describe the agent's role]
**Experience**: [years]+ years in [domain]
**Specialization**: [primary focus areas]`,
        },
        rules: {
            heading: 'Rules',
            content: `**CRITICAL**: Follow these rules without exception.

### Communication
- [Rule 1]
- [Rule 2]

### Code Quality
- [Rule 1]
- [Rule 2]`,
        },
        tools: {
            heading: 'Tools',
            content: `### Decision Tree: When to Use Each Tool

**When to Use \`Read\`:**
- Examining files
- Reviewing code

**When to Use \`Write\`:**
- Creating new files
- Generating content

**When to Use \`Edit\`:**
- Modifying existing files
- Fixing bugs

**When to Use \`Bash\`:**
- Running commands
- Executing scripts`,
        },
        workflow: {
            heading: 'Workflow',
            content: `## Task Completion Process

1. **Understand** - Clarify requirements
2. **Plan** - Identify approach
3. **Execute** - Implement solution
4. **Verify** - Test and validate
5. **Refine** - Polish and document`,
        },
        standards: {
            heading: 'Standards',
            content: `## Code Standards

- Follow language best practices
- Write clean, maintainable code
- Include appropriate tests
- Document complex logic`,
        },
        verification: {
            heading: 'Verification',
            content: `## Anti-Hallucination Protocol

When uncertain:
- Say "I cannot verify this"
- Provide confidence level (HIGH/MEDIUM/LOW)
- Suggest verification steps

Always cite sources for factual claims.`,
        },
        memory: {
            heading: 'Memory',
            content: `## Memory Management

- Use context from previous interactions
- Update memory after significant changes
- Reference relevant past decisions
- Keep summaries concise`,
        },
        evolution: {
            heading: 'Evolution',
            content: `## Self-Improvement

- Track patterns in user feedback
- Identify recurring issues
- Propose improvements to this config
- Document lessons learned`,
        },
        environment: {
            heading: 'Environment',
            content: `## Environment Setup

- [Setup step 1]
- [Setup step 2]
- [Setup step 3]`,
        },
        testing: {
            heading: 'Testing',
            content: `## Testing Standards

- Write tests for all new functionality
- Maintain minimum 70% code coverage
- Use test doubles appropriately
- Follow Arrange-Act-Assert pattern`,
        },
        output: {
            heading: 'Output',
            content: `## Output Format

- Be concise and clear
- Use appropriate formatting
- Include relevant examples
- Show working code`,
        },
        'error-handling': {
            heading: 'Error Handling',
            content: `## Error Handling

- Anticipate potential errors
- Handle errors gracefully
- Provide meaningful error messages
- Log errors appropriately`,
        },
        planning: {
            heading: 'Planning',
            content: `## Planning Process

1. Define the problem
2. Identify constraints
3. Generate possible approaches
4. Evaluate and select
5. Implement and verify`,
        },
        parallel: {
            heading: 'Parallel Execution',
            content: `## Parallel Execution

- Identify independent tasks
- Execute concurrently when safe
- Coordinate shared resources
- Handle race conditions`,
        },
        personality: {
            heading: 'Personality',
            content: `## Personality & Communication Style

- Tone: [professional/casual/technical]
- Values: [accuracy, helpfulness, directness]
- Limits: [what the agent should never do]
- Communication preferences: [concise/detailed, formal/informal]`,
        },
        'user-context': {
            heading: 'User Context',
            content: `## User Context

- Name: [user name]
- Timezone: [timezone]
- Role: [user's role and expertise level]
- Preferences: [communication and workflow preferences]`,
        },
        heartbeat: {
            heading: 'Heartbeat',
            content: `## Scheduled Tasks

### Periodic Checks
- [Check 1]: [frequency]
- [Check 2]: [frequency]

### Automated Actions
- [Action 1]: [trigger condition]`,
        },
        bootstrap: {
            heading: 'Bootstrap',
            content: `## First-Run Setup

### Identity Creation
- Verify identity section is populated with specific role
- Confirm communication style preferences

### User Context
- Gather user name, timezone, and preferences
- Understand expertise level and work context

### Progressive Adoption
- Week 1: Focus on core workflows
- Week 2: Add integrations based on needs
- Week 3: Review and refine based on patterns`,
        },
        custom: {
            heading: 'Custom Section',
            content: '[Add custom content here]',
        },
    };

    for (const category of missingCategories) {
        const template = sectionTemplates[category];
        if (template) {
            sections.push({
                heading: template.heading,
                level: 2,
                content: template.content,
                category,
            });
        }
    }

    return { ...model, sections };
}

// ============================================================================
// Refinement
// ============================================================================

/**
 * Refine a main agent configuration.
 */
export async function refine(options: RefineOptions): Promise<RefineResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const actions: RefineAction[] = [];

    const resolvedPath = resolve(options.filePath);
    const dryRun = options.dryRun ?? true;

    // Read file
    if (!existsSync(resolvedPath)) {
        errors.push(`File not found: ${resolvedPath}`);
        return {
            success: false,
            filePath: resolvedPath,
            dryRun,
            actions: [],
            errors,
            warnings,
        };
    }

    const content = readFileSync(resolvedPath, 'utf-8');
    const platform = detectPlatform(resolvedPath) ?? 'agents-md';

    // Build UMAM model
    const model = buildUMAM(content, resolvedPath, platform);

    // Run validation
    const validation = await validateMagentConfig(resolvedPath, content);
    if (!validation.valid) {
        warnings.push(...validation.errors);
    }

    // Run evaluation if requested
    let gradeBefore: string | undefined;
    let evaluation: MagentEvaluationReport | undefined;
    if (options.evaluate) {
        evaluation = await evaluateMagentConfig(resolvedPath, content, 'standard', platform);
        gradeBefore = evaluation.grade;
    }

    // Analyze structural issues
    const structuralIssues = analyzeStructuralIssues(model);
    const structuralActions = generateStructuralFixes(model, structuralIssues);
    actions.push(...structuralActions);

    // Generate quality suggestions
    if (evaluation) {
        const qualityActions = generateQualitySuggestions(model, evaluation);
        actions.push(...qualityActions);
    }

    // Apply fixes if --apply is specified
    let refinedModel = model;
    if (!dryRun) {
        // Apply non-approval-required structural fixes
        refinedModel = applyStructuralFixes(model, actions);

        // Remove forbidden phrases
        refinedModel = removeForbiddenPhrases(refinedModel);

        // Add missing sections
        if (structuralIssues.missingRequiredCategories.length > 0) {
            refinedModel = addMissingSections(refinedModel, structuralIssues.missingRequiredCategories);
        }

        // Serialize and write
        const outputPath = options.outputPath ?? resolvedPath;
        const refinedContent = serializeSections(refinedModel.sections, refinedModel.preamble);
        writeFileSync(outputPath, refinedContent, 'utf-8');
    }

    // Calculate grade after (if evaluation was run)
    let gradeAfter: string | undefined;
    if (evaluation && !dryRun) {
        const afterReport = await evaluateMagentConfig(resolvedPath, readFileSync(resolvedPath, 'utf-8'));
        gradeAfter = afterReport.grade;
    }

    return {
        success: errors.length === 0,
        filePath: resolvedPath,
        dryRun,
        actions,
        errors,
        warnings,
        ...(gradeBefore ? { gradeBefore: gradeBefore as 'A' | 'B' | 'C' | 'D' | 'F' } : {}),
        ...(gradeAfter ? { gradeAfter: gradeAfter as 'A' | 'B' | 'C' | 'D' | 'F' } : {}),
    };
}

// ============================================================================
// CLI Entry Point
// ============================================================================

export async function main(args: string[] = Bun.argv.slice(2)): Promise<void> {
    const { values, positionals } = parseArgs({
        args,
        options: {
            'dry-run': { type: 'boolean' },
            apply: { type: 'boolean' },
            llm: { type: 'boolean' },
            output: { type: 'string', short: 'o' },
            profile: { type: 'string', short: 'p' },
            verbose: { type: 'boolean', short: 'v' },
            help: { type: 'boolean', short: 'h' },
        },
        allowPositionals: true,
    });

    if (values.help || positionals.length === 0) {
        logger.log(`
Usage: bun refine.ts <config-path> [options]

Options:
  --dry-run              Show changes without applying (default: true)
  --apply                Actually apply fixes
  --llm                  Include LLM-generated suggestions (future)
  --output, -o <path>    Output path for refined config
  --verbose, -v          Show detailed output
  --help, -h             Show help

Refinement Actions:
  - Remove empty sections
  - Add missing required sections (identity, rules, tools)
  - Remove forbidden phrases
  - Expand minimal content sections
  - Add decision trees and examples

CRITICAL Section Protection:
  Sections containing [CRITICAL] markers are never modified.

Examples:
  bun refine.ts AGENTS.md --dry-run    # Preview changes
  bun refine.ts AGENTS.md --apply      # Apply fixes
`);
        process.exit(0);
    }

    const configPath = positionals[0];
    const apply = values.apply ?? false;
    const dryRun = !apply;

    const options: RefineOptions = {
        filePath: configPath,
        evaluate: true,
        dryRun,
        ...(values.output ? { outputPath: values.output } : {}),
    };

    const result = await refine(options);

    logger.log(`\n${'='.repeat(60)}`);
    logger.log(`REFINEMENT REPORT: ${configPath}`);
    logger.log(`${'='.repeat(60)}`);
    logger.log(`Mode: ${result.dryRun ? 'DRY RUN (no changes applied)' : 'APPLIED'}`);

    if (result.gradeBefore) {
        logger.log(`Grade: ${result.gradeBefore}${result.gradeAfter ? ` -> ${result.gradeAfter}` : ''}`);
    }

    logger.log(`\n--- Actions (${result.actions.length}) ---`);

    const structuralActions = result.actions.filter((a) => a.type === 'structural');
    const qualityActions = result.actions.filter((a) => a.type === 'quality');
    const bestPracticeActions = result.actions.filter((a) => a.type === 'best-practice');

    if (structuralActions.length > 0) {
        logger.log('\nStructural Fixes:');
        for (const action of structuralActions) {
            const approval = action.requiresApproval ? '[needs approval]' : '[auto-fix]';
            logger.log(`  ${approval} ${action.description}`);
        }
    }

    if (qualityActions.length > 0) {
        logger.log('\nQuality Suggestions:');
        for (const action of qualityActions) {
            logger.log(`  [suggestion] ${action.description}`);
        }
    }

    if (bestPracticeActions.length > 0) {
        logger.log('\nBest Practice Improvements:');
        for (const action of bestPracticeActions) {
            const approval = action.requiresApproval ? '[needs approval]' : '[auto-fix]';
            logger.log(`  ${approval} ${action.description}`);
        }
    }

    if (result.errors.length > 0) {
        logger.log('\nBLOCK findings:');
        for (const error of result.errors) {
            logger.log(`  - ${error}`);
        }
    }

    if (result.warnings.length > 0) {
        logger.log('\nWARN findings:');
        for (const warning of result.warnings) {
            logger.log(`  - ${warning}`);
        }
    }

    logger.log('');

    if (result.dryRun) {
        logger.log(`Refinement decision: ${result.success ? 'PASS' : 'BLOCK'}`);
        logger.log('Use --apply to apply these changes.');
    } else {
        logger.success(`Refinement decision: ${result.success ? 'PASS' : 'BLOCK'}`);
    }

    logger.log('');
    process.exit(result.success ? 0 : 1);
}

// Run if executed directly
if (import.meta.main) {
    main().catch((error) => {
        logger.error(`Unexpected error: ${error}`);
        process.exit(1);
    });
}
