#!/usr/bin/env bun
/**
 * validate-feature.ts — Gherkin syntax validation
 *
 * Validates .feature files for:
 * - Syntax correctness
 * - Required elements (Feature, Scenario, Given/When/Then)
 * - Step order (Given -> When -> Then)
 * - Unique scenario names within feature
 * - Background support
 * - Doc string handling
 */

import { logger } from '../../../scripts/logger';

export interface ValidationIssue {
    line: number;
    column?: number;
    severity: 'error' | 'warning';
    message: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
}

export interface ParsedFeature {
    name: string;
    description?: string;
    tags?: string[];
    background?: {
        steps: ParsedStep[];
    };
    scenarios: ParsedScenario[];
}

export interface ParsedScenario {
    name: string;
    tags?: string[];
    steps: ParsedStep[];
    outline?: {
        examples: Array<Record<string, string>>;
    };
}

export interface ParsedStep {
    keyword: 'Given' | 'When' | 'Then' | 'And' | 'But';
    text: string;
    line: number;
    docString?: string;
    dataTable?: string[][];
}

function isDescriptionLine(trimmed: string, allowDescriptionLines: boolean): boolean {
    if (!allowDescriptionLines) {
        return false;
    }

    return !/^(Feature:|Background:|Scenario:|Scenario Outline:|Examples:|@|\||Given(?:\s+|$)|When(?:\s+|$)|Then(?:\s+|$)|And(?:\s+|$)|But(?:\s+|$)|""")/.test(
        trimmed,
    );
}

/**
 * Validate a Gherkin feature file
 */
export function validateFeature(content: string): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    const lines = content.split('\n');
    let foundFeature = false;
    let foundScenario = false;
    let inBackground = false;
    let inBlock = false; // true inside Background, Scenario, or Scenario Outline
    let inDocString = false;
    let previousStepType: string | null = null;
    let allowDescriptionLines = false;
    const scenarioNames: Set<string> = new Set();

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        const lineNumber = i + 1;

        // Doc string toggle
        if (trimmed.startsWith('"""')) {
            inDocString = !inDocString;
            continue;
        }

        // Skip content inside doc strings
        if (inDocString) {
            continue;
        }

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        // Feature declaration
        if (trimmed.startsWith('Feature:')) {
            if (foundFeature) {
                errors.push({
                    line: lineNumber,
                    severity: 'error',
                    message: 'Multiple Feature declarations found. Each file should have exactly one Feature.',
                });
            }
            foundFeature = true;
            const featureName = trimmed.substring(8).trim();
            if (!featureName) {
                errors.push({
                    line: lineNumber,
                    severity: 'error',
                    message: 'Feature name is empty.',
                });
            }
            allowDescriptionLines = true;
            continue;
        }

        // Background
        if (trimmed.startsWith('Background:')) {
            if (foundScenario) {
                errors.push({
                    line: lineNumber,
                    severity: 'error',
                    message: 'Background must come before any Scenario.',
                });
            }
            inBackground = true;
            inBlock = true;
            previousStepType = null;
            allowDescriptionLines = true;
            continue;
        }

        // Scenario declaration
        if (trimmed.startsWith('Scenario:')) {
            foundScenario = true;
            inBackground = false;
            inBlock = true;
            previousStepType = null;
            allowDescriptionLines = true;

            const scenarioName = trimmed.substring(9).trim();
            if (!scenarioName) {
                errors.push({
                    line: lineNumber,
                    severity: 'error',
                    message: 'Scenario name is empty.',
                });
            } else {
                if (scenarioNames.has(scenarioName)) {
                    errors.push({
                        line: lineNumber,
                        severity: 'error',
                        message: `Duplicate scenario name: "${scenarioName}"`,
                    });
                }
                scenarioNames.add(scenarioName);
            }
            continue;
        }

        // Scenario Outline
        if (trimmed.startsWith('Scenario Outline:')) {
            foundScenario = true;
            inBackground = false;
            inBlock = true;
            previousStepType = null;
            allowDescriptionLines = true;

            const scenarioName = trimmed.substring(17).trim();
            if (!scenarioName) {
                errors.push({
                    line: lineNumber,
                    severity: 'error',
                    message: 'Scenario Outline name is empty.',
                });
            } else {
                if (scenarioNames.has(scenarioName)) {
                    errors.push({
                        line: lineNumber,
                        severity: 'error',
                        message: `Duplicate scenario name: "${scenarioName}"`,
                    });
                }
                scenarioNames.add(scenarioName);
            }
            continue;
        }

        // Examples (for Scenario Outline)
        if (trimmed.startsWith('Examples:')) {
            allowDescriptionLines = true;
            continue;
        }

        // Data table row
        if (trimmed.startsWith('|')) {
            allowDescriptionLines = false;
            if (!inBlock) {
                errors.push({
                    line: lineNumber,
                    severity: 'error',
                    message: 'Data table outside of any Scenario or Background.',
                });
            }
            continue;
        }

        // Steps
        const stepMatch = trimmed.match(/^(Given|When|Then|And|But)\s+(.*)$/);
        if (stepMatch) {
            allowDescriptionLines = false;
            const keyword = stepMatch[1] as 'Given' | 'When' | 'Then' | 'And' | 'But';
            const stepText = stepMatch[2];

            if (!inBlock) {
                errors.push({
                    line: lineNumber,
                    severity: 'error',
                    message: `Step "${keyword}" found outside of any Scenario or Background.`,
                });
                continue;
            }

            // Validate step order (only in scenarios, not background)
            if (!inBackground) {
                if (keyword === 'Given') {
                    previousStepType = 'Given';
                } else if (keyword === 'When') {
                    if (previousStepType === 'Then') {
                        warnings.push({
                            line: lineNumber,
                            severity: 'warning',
                            message: '"When" step after "Then" — consider splitting into separate scenario.',
                        });
                    }
                    previousStepType = 'When';
                } else if (keyword === 'Then') {
                    // previousStepType tracks the last primary keyword (Given/When/Then).
                    // And/But don't change it, so "Given → And → Then" leaves it as "Given".
                    if (previousStepType !== null && previousStepType !== 'When' && previousStepType !== 'Then') {
                        warnings.push({
                            line: lineNumber,
                            severity: 'warning',
                            message: '"Then" step without a preceding "When" step.',
                        });
                    }
                    previousStepType = 'Then';
                } else if (keyword === 'And' || keyword === 'But') {
                    if (!previousStepType) {
                        errors.push({
                            line: lineNumber,
                            severity: 'error',
                            message: `"${keyword}" cannot be the first step.`,
                        });
                    }
                    // Keep previousStepType unchanged — And/But inherit context from
                    // the preceding Given/When/Then, so ordering validation still works.
                }
            }

            // Validate step is not empty
            if (!stepText) {
                errors.push({
                    line: lineNumber,
                    severity: 'error',
                    message: `${keyword} step has no description.`,
                });
            }

            continue;
        }

        // Tags
        if (trimmed.startsWith('@')) {
            allowDescriptionLines = false;
            continue;
        }

        if (isDescriptionLine(trimmed, allowDescriptionLines)) {
            continue;
        }

        // Unknown syntax
        if (trimmed.length > 0) {
            warnings.push({
                line: lineNumber,
                severity: 'warning',
                message: `Unrecognized syntax: "${trimmed}"`,
            });
        }
    }

    // Unclosed doc string
    if (inDocString) {
        errors.push({
            line: lines.length,
            severity: 'error',
            message: 'Unclosed doc string (missing closing triple quotes).',
        });
    }

    // Post-validation checks
    if (!foundFeature) {
        errors.push({
            line: 1,
            severity: 'error',
            message: 'No Feature declaration found.',
        });
    }

    if (!foundScenario) {
        warnings.push({
            line: 1,
            severity: 'warning',
            message: 'No Scenario found in Feature.',
        });
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Parse a Gherkin feature file into structured data
 */
export function parseFeature(content: string): ParsedFeature | null {
    const lines = content.split('\n');
    let feature: ParsedFeature | null = null;
    let currentScenario: ParsedScenario | null = null;
    let inBackground = false;
    let inDocString = false;
    let docStringLines: string[] = [];
    let currentStep: ParsedStep | null = null;
    let currentTags: string[] = [];
    let inExamples = false;
    let exampleHeaders: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        const lineNumber = i + 1;

        // Doc string toggle
        if (trimmed.startsWith('"""')) {
            if (inDocString) {
                // Closing — attach to current step
                if (currentStep) {
                    currentStep.docString = docStringLines.join('\n');
                }
                docStringLines = [];
                inDocString = false;
            } else {
                inDocString = true;
                docStringLines = [];
            }
            continue;
        }

        // Collect doc string content
        if (inDocString) {
            docStringLines.push(trimmed);
            continue;
        }

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        // Tags
        if (trimmed.startsWith('@')) {
            const tags = trimmed.split(/\s+/).filter((t) => t.startsWith('@'));
            currentTags.push(...tags);
            continue;
        }

        // Feature
        if (trimmed.startsWith('Feature:')) {
            feature = {
                name: trimmed.substring(8).trim(),
                ...(currentTags.length > 0 ? { tags: [...currentTags] } : {}),
                scenarios: [],
            };
            currentTags = [];
            continue;
        }

        // Background
        if (trimmed.startsWith('Background:')) {
            if (feature) {
                feature.background = { steps: [] };
                inBackground = true;
                currentScenario = null;
                currentStep = null;
                inExamples = false;
            }
            currentTags = [];
            continue;
        }

        // Scenario
        if (trimmed.startsWith('Scenario:')) {
            if (feature) {
                inBackground = false;
                inExamples = false;
                currentStep = null;
                const scenario: ParsedScenario = {
                    name: trimmed.substring(9).trim(),
                    ...(currentTags.length > 0 ? { tags: [...currentTags] } : {}),
                    steps: [],
                };
                currentScenario = scenario;
                feature.scenarios.push(scenario);
            }
            currentTags = [];
            continue;
        }

        // Scenario Outline
        if (trimmed.startsWith('Scenario Outline:')) {
            if (feature) {
                inBackground = false;
                inExamples = false;
                currentStep = null;
                const outline: ParsedScenario = {
                    name: trimmed.substring(17).trim(),
                    ...(currentTags.length > 0 ? { tags: [...currentTags] } : {}),
                    steps: [],
                    outline: { examples: [] },
                };
                currentScenario = outline;
                feature.scenarios.push(outline);
            }
            currentTags = [];
            continue;
        }

        // Examples header
        if (trimmed.startsWith('Examples:')) {
            inExamples = true;
            exampleHeaders = [];
            currentStep = null;
            continue;
        }

        // Data table / Examples rows
        if (trimmed.startsWith('|')) {
            const cells = trimmed
                .split('|')
                .slice(1, -1)
                .map((c) => c.trim());

            if (inExamples && currentScenario?.outline) {
                if (exampleHeaders.length === 0) {
                    exampleHeaders = cells;
                } else {
                    const row: Record<string, string> = {};
                    for (let j = 0; j < exampleHeaders.length; j++) {
                        row[exampleHeaders[j]] = cells[j] ?? '';
                    }
                    currentScenario.outline.examples.push(row);
                }
            } else if (currentStep) {
                // Data table attached to a step
                if (!currentStep.dataTable) {
                    currentStep.dataTable = [];
                }
                currentStep.dataTable.push(cells);
            }
            continue;
        }

        // Steps
        const stepMatch = trimmed.match(/^(Given|When|Then|And|But)\s+(.*)$/);
        if (stepMatch) {
            inExamples = false;
            const step: ParsedStep = {
                keyword: stepMatch[1] as ParsedStep['keyword'],
                text: stepMatch[2],
                line: lineNumber,
            };
            currentStep = step;

            if (inBackground && feature?.background) {
                feature.background.steps.push(step);
            } else if (currentScenario) {
                currentScenario.steps.push(step);
            }
        }
    }

    return feature;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
    if (argv.length < 1) {
        logger.error('Usage: validate-feature.ts <feature-file>');
        process.exit(1);
    }

    const filePath = argv[0];

    let content: string;
    try {
        content = await Bun.file(filePath).text();
    } catch (_error) {
        logger.error(`Error: unable to read feature file: ${filePath}`);
        process.exit(1);
        return;
    }

    const result = validateFeature(content);

    if (result.valid) {
        logger.info(`\u2713 ${filePath}: Valid Gherkin`);
    } else {
        logger.info(`\u2717 ${filePath}: Invalid Gherkin`);
        for (const error of result.errors) {
            logger.info(`  Error (line ${error.line}): ${error.message}`);
        }
    }

    if (result.warnings.length > 0) {
        logger.info('  Warnings:');
        for (const warning of result.warnings) {
            logger.info(`    Warning (line ${warning.line}): ${warning.message}`);
        }
    }

    process.exit(result.valid ? 0 : 1);
}

if (import.meta.main) {
    await main();
}
