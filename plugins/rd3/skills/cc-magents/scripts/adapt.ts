/**
 * adapt.ts - Cross-platform adaptation script for rd3:cc-magents
 *
 * Converts main agent configuration files between different platforms.
 * Flow: Source -> Parse -> UMAM -> Generate -> Target
 *
 * Usage:
 *   bun adapt.ts <source-path> --to <target-platform> [--output <path>]
 *   bun adapt.ts .claude/CLAUDE.md --to cursorrules --output .cursorrules
 *   bun adapt.ts AGENTS.md --to all --output ./converted/
 *
 * Features:
 * - Parse source using appropriate adapter
 * - Convert to UMAM (Universal Main Agent Model)
 * - Generate target format using target adapter
 * - Warn about feature losses during conversion
 * - Support batch conversion with --to all
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { getMagentAdapter, magentAdapterRegistry } from './adapters';
import {
    ALL_MAGENT_PLATFORMS,
    type AdaptOptions,
    type AdaptResult,
    type ConversionResult,
    type ConversionWarning,
    type MagentPlatform,
    PLATFORM_DISPLAY_NAMES,
    PLATFORM_TIERS,
    type UniversalMainAgent,
} from './types';
import { detectPlatform } from './utils';

// ============================================================================
// Constants
// ============================================================================

/** Lossy conversion warning matrix (from vendor analysis) */
const LOSSY_CONVERSION_WARNINGS: Array<{
    source: MagentPlatform;
    target: MagentPlatform;
    feature: string;
    severity: 'info' | 'warning' | 'critical';
    description: string;
}> = [
    {
        source: 'claude-md',
        target: 'codex',
        feature: 'hooks',
        severity: 'warning',
        description: 'Claude hooks have no direct Codex equivalent',
    },
    {
        source: 'claude-md',
        target: 'codex',
        feature: 'skills',
        severity: 'warning',
        description: 'Claude skills field is not portable to Codex',
    },
    {
        source: 'claude-md',
        target: 'codex',
        feature: 'memory-md',
        severity: 'critical',
        description: 'Memory persistence (MEMORY.md) not available in Codex sandbox',
    },
    {
        source: 'claude-md',
        target: 'cursorrules',
        feature: 'hooks',
        severity: 'warning',
        description: 'Claude hooks have no direct .cursorrules equivalent',
    },
    {
        source: 'claude-md',
        target: 'cursorrules',
        feature: 'xml-structure',
        severity: 'info',
        description: 'XML structure (examples, system-reminders) will be flattened',
    },
    {
        source: 'claude-md',
        target: 'windsurfrules',
        feature: 'hooks',
        severity: 'warning',
        description: 'Claude hooks have no direct .windsurfrules equivalent',
    },
    {
        source: 'claude-md',
        target: 'gemini-md',
        feature: 'save_memory',
        severity: 'critical',
        description: 'Claude memory patterns do not map to Gemini save_memory',
    },
    {
        source: 'gemini-md',
        target: 'claude-md',
        feature: 'save_memory',
        severity: 'critical',
        description: 'Gemini save_memory tool is not portable',
    },
    {
        source: 'gemini-md',
        target: 'claude-md',
        feature: 'convention-workflow',
        severity: 'info',
        description: 'Gemini convention-first workflow maps to rules sections',
    },
    {
        source: 'gemini-md',
        target: 'codex',
        feature: 'save_memory',
        severity: 'critical',
        description: 'Gemini save_memory tool is not available in Codex',
    },
    {
        source: 'agents-md',
        target: 'claude-md',
        feature: 'globs',
        severity: 'info',
        description: 'AGENTS.md globs have no direct CLAUDE.md equivalent; use directory structure instead',
    },
    {
        source: 'agents-md',
        target: 'agents-md',
        feature: 'none',
        severity: 'info',
        description: 'AGENTS.md is the canonical format; minimal loss in conversion',
    },
];

/** Tier 1 and 2 platforms that support parsing */
const PARSEABLE_PLATFORMS: MagentPlatform[] = ALL_MAGENT_PLATFORMS.filter(
    (p) => (PLATFORM_TIERS[p] === 1 || PLATFORM_TIERS[p] === 2) && p !== 'generic',
);

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Main adapt function - converts source file to target platform(s).
 */
export async function adapt(options: AdaptOptions): Promise<AdaptResult> {
    const { sourcePath, targetPlatform, outputDir } = options;
    const errors: string[] = [];
    const allWarnings: ConversionWarning[] = [];
    const conversions: ConversionResult[] = [];

    // Validate source path
    if (!existsSync(sourcePath)) {
        return {
            sourcePath,
            sourcePlatform: 'generic',
            conversions: [],
            allWarnings: [],
            errors: [`Source file not found: ${sourcePath}`],
        };
    }

    // Read source file
    let sourceContent: string;
    try {
        sourceContent = readFileSync(sourcePath, 'utf-8');
    } catch (error) {
        return {
            sourcePath,
            sourcePlatform: 'generic',
            conversions: [],
            allWarnings: [],
            errors: [`Failed to read source file: ${error instanceof Error ? error.message : String(error)}`],
        };
    }

    // Detect source platform
    const sourcePlatform = detectPlatform(sourcePath, sourceContent) ?? 'agents-md';

    // Determine target platforms
    const targets =
        targetPlatform === 'all' ? PARSEABLE_PLATFORMS.filter((p) => p !== sourcePlatform) : [targetPlatform];

    // Parse source using appropriate adapter
    let model: UniversalMainAgent | null = null;

    if (magentAdapterRegistry.has(sourcePlatform)) {
        const sourceAdapter = getMagentAdapter(sourcePlatform);
        const parseResult = await sourceAdapter.parse(sourceContent, sourcePath);

        if (parseResult.success && parseResult.model) {
            model = parseResult.model;
        } else {
            errors.push(`Failed to parse source: ${parseResult.errors.join(', ')}`);
            return {
                sourcePath,
                sourcePlatform,
                conversions: [],
                allWarnings: [],
                errors,
            };
        }
    } else {
        // Source platform not directly supported, try AGENTS.md adapter as fallback
        const agentsAdapter = getMagentAdapter('agents-md');
        const parseResult = await agentsAdapter.parse(sourceContent, sourcePath);

        if (parseResult.success && parseResult.model) {
            model = parseResult.model;
            model.sourceFormat = sourcePlatform;
        } else {
            errors.push(`No adapter available for source platform: ${sourcePlatform}`);
            return {
                sourcePath,
                sourcePlatform,
                conversions: [],
                allWarnings: [],
                errors,
            };
        }
    }

    // Convert to each target platform
    for (const target of targets) {
        const result = await convertToTarget(model, target, sourcePath, outputDir);
        conversions.push(result);
        allWarnings.push(...result.conversionWarnings);
    }

    return {
        sourcePath,
        sourcePlatform,
        conversions,
        allWarnings,
        errors,
    };
}

/**
 * Convert UMAM model to target platform.
 */
async function convertToTarget(
    model: UniversalMainAgent,
    targetPlatform: MagentPlatform,
    sourcePath: string,
    outputDir?: string,
): Promise<ConversionResult> {
    const conversionWarnings: ConversionWarning[] = [];

    try {
        const targetAdapter = getMagentAdapter(targetPlatform);

        // Get conversion warnings from source adapter
        if (magentAdapterRegistry.has(model.sourceFormat)) {
            const sourceAdapter = getMagentAdapter(model.sourceFormat);
            if (
                'getConversionWarningsFrom' in sourceAdapter &&
                typeof sourceAdapter.getConversionWarningsFrom === 'function'
            ) {
                const sourceWarnings = sourceAdapter.getConversionWarningsFrom(targetPlatform, model);
                conversionWarnings.push(...sourceWarnings);
            }
        }

        // Add lossy conversion warnings from matrix
        const matrixWarnings = getLossyConversionWarnings(model.sourceFormat, targetPlatform);
        for (const warning of matrixWarnings) {
            // Avoid duplicates
            if (
                !conversionWarnings.some(
                    (w) =>
                        w.feature === warning.feature &&
                        w.sourcePlatform === warning.source &&
                        w.targetPlatform === warning.target,
                )
            ) {
                conversionWarnings.push({
                    feature: warning.feature,
                    sourcePlatform: warning.source,
                    targetPlatform: warning.target,
                    severity: warning.severity,
                    description: warning.description,
                });
            }
        }

        // Generate target output
        const generateOptions = outputDir !== undefined ? { outputPath: outputDir } : undefined;
        const generateResult = await targetAdapter.generate(model, generateOptions);

        if (!generateResult.success) {
            return {
                targetPlatform,
                success: false,
                conversionWarnings,
                errors: generateResult.errors,
            };
        }

        // Add any additional warnings from generation
        if (generateResult.conversionWarnings) {
            conversionWarnings.push(...generateResult.conversionWarnings);
        }
        if (generateResult.warnings) {
            conversionWarnings.push(
                ...generateResult.warnings.map((w) => ({
                    feature: 'generation',
                    sourcePlatform: model.sourceFormat,
                    targetPlatform,
                    severity: 'info' as const,
                    description: w,
                })),
            );
        }

        // Determine output path
        const outputPath = getOutputPath(sourcePath, targetPlatform, outputDir);

        // Write output file
        if (outputDir && generateResult.output) {
            try {
                const targetDir = outputDir ?? dirname(sourcePath);
                if (!existsSync(targetDir)) {
                    mkdirSync(targetDir, { recursive: true });
                }
                writeFileSync(outputPath, generateResult.output, 'utf-8');
            } catch (error) {
                return {
                    targetPlatform,
                    success: false,
                    conversionWarnings,
                    errors: [`Failed to write output: ${error instanceof Error ? error.message : String(error)}`],
                };
            }
        }

        const result: ConversionResult = {
            targetPlatform,
            success: true,
            conversionWarnings,
            errors: [],
        };
        if (generateResult.output !== undefined) {
            result.output = generateResult.output;
        }
        result.outputPath = outputPath;
        return result;
    } catch (error) {
        return {
            targetPlatform,
            success: false,
            conversionWarnings,
            errors: [`Conversion failed: ${error instanceof Error ? error.message : String(error)}`],
        };
    }
}

/**
 * Get lossy conversion warnings from the warning matrix.
 */
function getLossyConversionWarnings(
    sourcePlatform: MagentPlatform,
    targetPlatform: MagentPlatform,
): typeof LOSSY_CONVERSION_WARNINGS {
    return LOSSY_CONVERSION_WARNINGS.filter((w) => w.source === sourcePlatform && w.target === targetPlatform);
}

/**
 * Determine output file path for converted content.
 */
function getOutputPath(sourcePath: string, targetPlatform: MagentPlatform, outputDir?: string): string {
    const sourceBasename = basename(sourcePath, '.md');
    const targetDir = outputDir ?? dirname(sourcePath);

    const extensionMap: Record<MagentPlatform, string> = {
        'agents-md': 'AGENTS.md',
        'claude-md': 'CLAUDE.md',
        'gemini-md': 'GEMINI.md',
        codex: 'codex.md',
        cursorrules: '.cursorrules',
        windsurfrules: '.windsurfrules',
        'zed-rules': 'rules.md',
        'opencode-rules': 'opencode.md',
        aider: '.aider.conf.yml',
        warp: 'rules.md',
        roocode: 'rules.md',
        amp: 'rules.md',
        'vscode-instructions': 'copilot-instructions.md',
        generic: 'AGENTS.md',
        junie: 'junie.md',
        augment: 'augment.md',
        cline: 'cline.md',
    };

    const filename = extensionMap[targetPlatform] ?? `${targetPlatform}.md`;
    return join(targetDir, filename);
}

/**
 * Format conversion warnings for display.
 */
export function formatWarnings(warnings: ConversionWarning[]): string {
    if (warnings.length === 0) return '';

    const lines: string[] = [];
    lines.push('\n⚠️  Conversion Warnings:\n');

    // Group by severity
    const critical = warnings.filter((w) => w.severity === 'critical');
    const warning = warnings.filter((w) => w.severity === 'warning');
    const info = warnings.filter((w) => w.severity === 'info');

    if (critical.length > 0) {
        lines.push('  🔴 CRITICAL:');
        for (const w of critical) {
            lines.push(`    - ${w.feature}: ${w.description}`);
        }
        lines.push('');
    }

    if (warning.length > 0) {
        lines.push('  🟡 WARNINGS:');
        for (const w of warning) {
            lines.push(`    - ${w.feature}: ${w.description}`);
        }
        lines.push('');
    }

    if (info.length > 0) {
        lines.push('  🔵 INFO:');
        for (const w of info) {
            lines.push(`    - ${w.feature}: ${w.description}`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Format result for display.
 */
export function formatResult(result: AdaptResult): string {
    const lines: string[] = [];
    lines.push('\n📄 Adaptation Complete');
    lines.push(`Source: ${result.sourcePath}`);
    lines.push(`Format: ${PLATFORM_DISPLAY_NAMES[result.sourcePlatform]}`);
    lines.push('\n---');

    for (const conversion of result.conversions) {
        if (conversion.success) {
            lines.push(`\n✅ ${PLATFORM_DISPLAY_NAMES[conversion.targetPlatform]}`);
            if (conversion.outputPath) {
                lines.push(`   Output: ${conversion.outputPath}`);
            }
        } else {
            lines.push(`\n❌ ${PLATFORM_DISPLAY_NAMES[conversion.targetPlatform]}`);
            lines.push(`   Errors: ${conversion.errors.join(', ')}`);
        }
    }

    if (result.allWarnings.length > 0) {
        lines.push(formatWarnings(result.allWarnings));
    }

    if (result.errors.length > 0) {
        lines.push('\n❌ Errors:');
        for (const error of result.errors) {
            lines.push(`   - ${error}`);
        }
    }

    return lines.join('\n');
}

// ============================================================================
// CLI Entry Point
// ============================================================================

function showUsage(): void {
    console.log(`
rd3:cc-magents adapt - Cross-platform adaptation

Usage:
  bun adapt.ts <source-path> --to <target-platform> [--output <path>]

Arguments:
  source-path         Path to the source configuration file
  --to <platform>     Target platform (or 'all' for all platforms)
  --output <path>     Output directory or file path (optional)

Supported Platforms:
${ALL_MAGENT_PLATFORMS.map((p) => `  - ${p}: ${PLATFORM_DISPLAY_NAMES[p]}`).join('\n')}

Examples:
  # Convert CLAUDE.md to .cursorrules
  bun adapt.ts .claude/CLAUDE.md --to cursorrules

  # Convert to all supported platforms
  bun adapt.ts AGENTS.md --to all --output ./converted/

  # Convert to specific platform with custom output
  bun adapt.ts CLAUDE.md --to windsurfrules --output .windsurfrules
`);
}

// Parse CLI arguments
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
}

const sourcePath = args[0];
const toIndex = args.indexOf('--to');
const outputIndex = args.indexOf('--output');

if (toIndex === -1) {
    console.error('Error: --to <target-platform> is required');
    showUsage();
    process.exit(1);
}

const targetPlatformStr = args[toIndex + 1];
const outputPath = outputIndex !== -1 ? args[outputIndex + 1] : undefined;

// Validate target platform
const targetPlatform = targetPlatformStr === 'all' ? ('all' as const) : (targetPlatformStr as MagentPlatform);

if (targetPlatform !== 'all' && !ALL_MAGENT_PLATFORMS.includes(targetPlatform)) {
    console.error(`Error: Unknown platform '${targetPlatform}'`);
    console.error(`Supported platforms: ${ALL_MAGENT_PLATFORMS.join(', ')}`);
    process.exit(1);
}

// Run adaptation
const adaptOptions: AdaptOptions = {
    sourcePath: resolve(sourcePath),
    targetPlatform,
};
if (outputPath !== undefined) {
    adaptOptions.outputDir = resolve(outputPath);
}
const result = await adapt(adaptOptions);

// Output result
console.log(formatResult(result));

// Exit with error code if any conversion failed
const hasErrors = result.errors.length > 0 || result.conversions.some((c) => !c.success);
process.exit(hasErrors ? 1 : 0);
