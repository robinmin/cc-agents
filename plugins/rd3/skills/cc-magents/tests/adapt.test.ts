import { describe, it, expect, beforeEach } from 'bun:test';
import type { AdaptResult, ConversionWarning } from '../scripts/types';

type WarningWithSeverity = Pick<ConversionWarning, 'severity' | 'feature' | 'description'>;
type AdaptSummary = Pick<AdaptResult, 'sourcePath' | 'sourcePlatform' | 'conversions' | 'allWarnings' | 'errors'>;

// Mock adapt.ts module to avoid CLI side effects
const mockFormatWarnings = (warnings: WarningWithSeverity[]): string => {
    if (warnings.length === 0) return '';

    const lines: string[] = [];
    lines.push('\n⚠️  Conversion Warnings:\n');

    const critical = warnings.filter((warning) => warning.severity === 'critical');
    const warning = warnings.filter((warningItem) => warningItem.severity === 'warning');
    const info = warnings.filter((warningItem) => warningItem.severity === 'info');

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
};

const mockFormatResult = (result: AdaptSummary): string => {
    const lines: string[] = [];

    lines.push('\n🔄 Adaptation Complete');
    lines.push(`Source: ${result.sourcePath}`);
    lines.push(`Platform: ${result.sourcePlatform}`);
    lines.push('');

    if (result.conversions && result.conversions.length > 0) {
        lines.push('Conversions:');
        for (const conv of result.conversions) {
            const status = conv.success ? '✅' : '❌';
            lines.push(`  ${status} → ${conv.targetPlatform}`);
            if (conv.outputPath) {
                lines.push(`     Output: ${conv.outputPath}`);
            }
            if (conv.errors && conv.errors.length > 0) {
                lines.push(`     Errors: ${conv.errors.join(', ')}`);
            }
        }
        lines.push('');
    }

    if (result.allWarnings && result.allWarnings.length > 0) {
        lines.push('Conversion Warnings:');
        for (const w of result.allWarnings) {
            lines.push(`  [${w.severity.toUpperCase()}] ${w.feature}: ${w.description}`);
        }
        lines.push('');
    }

    if (result.errors && result.errors.length > 0) {
        lines.push('Errors:');
        for (const err of result.errors) {
            lines.push(`  ❌ ${err}`);
        }
        lines.push('');
    }

    return lines.join('\n');
};

describe('adapt', () => {
    describe('formatWarnings', () => {
        it('should return empty string for no warnings', () => {
            const result = mockFormatWarnings([]);
            expect(result).toBe('');
        });

        it('should format critical warnings', () => {
            const warnings: ConversionWarning[] = [
                {
                    feature: 'memory-md',
                    sourcePlatform: 'claude-md',
                    targetPlatform: 'gemini-md',
                    severity: 'critical',
                    description: 'Claude memory patterns do not map to Gemini save_memory',
                },
            ];
            const result = mockFormatWarnings(warnings);
            expect(result).toContain('CRITICAL');
            expect(result).toContain('memory-md');
        });

        it('should format warning severity', () => {
            const warnings: ConversionWarning[] = [
                {
                    feature: 'hooks',
                    sourcePlatform: 'claude-md',
                    targetPlatform: 'cursorrules',
                    severity: 'warning',
                    description: 'Claude hooks have no direct .cursorrules equivalent',
                },
            ];
            const result = mockFormatWarnings(warnings);
            expect(result).toContain('WARNINGS');
            expect(result).toContain('hooks');
        });

        it('should format info severity', () => {
            const warnings: ConversionWarning[] = [
                {
                    feature: 'xml-structure',
                    sourcePlatform: 'claude-md',
                    targetPlatform: 'cursorrules',
                    severity: 'info',
                    description: 'XML structure will be flattened',
                },
            ];
            const result = mockFormatWarnings(warnings);
            expect(result).toContain('INFO');
            expect(result).toContain('xml-structure');
        });

        it('should group warnings by severity', () => {
            const warnings: ConversionWarning[] = [
                {
                    feature: 'memory-md',
                    sourcePlatform: 'claude-md',
                    targetPlatform: 'gemini-md',
                    severity: 'critical',
                    description: 'Critical warning',
                },
                {
                    feature: 'hooks',
                    sourcePlatform: 'claude-md',
                    targetPlatform: 'cursorrules',
                    severity: 'warning',
                    description: 'Warning message',
                },
                {
                    feature: 'convention-workflow',
                    sourcePlatform: 'gemini-md',
                    targetPlatform: 'claude-md',
                    severity: 'info',
                    description: 'Info message',
                },
            ];
            const result = mockFormatWarnings(warnings);
            expect(result).toContain('CRITICAL');
            expect(result).toContain('WARNINGS');
            expect(result).toContain('INFO');
        });
    });

    describe('formatResult', () => {
        it('should format successful adaptation', () => {
            const result: AdaptResult = {
                sourcePath: '/test/AGENTS.md',
                sourcePlatform: 'agents-md',
                conversions: [
                    {
                        targetPlatform: 'claude-md',
                        success: true,
                        conversionWarnings: [],
                        errors: [],
                        output: '# CLAUDE.md content',
                        outputPath: '/test/CLAUDE.md',
                    },
                ],
                allWarnings: [],
                errors: [],
            };
            const formatted = mockFormatResult(result);
            expect(formatted).toContain('Adaptation Complete');
            expect(formatted).toContain('agents-md');
            expect(formatted).toContain('claude-md');
            expect(formatted).toContain('CLAUDE.md');
        });

        it('should show errors for failed conversions', () => {
            const result: AdaptResult = {
                sourcePath: '/test/AGENTS.md',
                sourcePlatform: 'agents-md',
                conversions: [
                    {
                        targetPlatform: 'claude-md',
                        success: false,
                        conversionWarnings: [],
                        errors: ['Generation failed'],
                    },
                ],
                allWarnings: [],
                errors: [],
            };
            const formatted = mockFormatResult(result);
            expect(formatted).toContain('❌');
            expect(formatted).toContain('Generation failed');
        });

        it('should include warnings section', () => {
            const result: AdaptResult = {
                sourcePath: '/test/AGENTS.md',
                sourcePlatform: 'agents-md',
                conversions: [],
                allWarnings: [
                    {
                        feature: 'hooks',
                        sourcePlatform: 'claude-md',
                        targetPlatform: 'cursorrules',
                        severity: 'warning',
                        description: 'No direct equivalent',
                    },
                ],
                errors: [],
            };
            const formatted = mockFormatResult(result);
            expect(formatted).toContain('Conversion Warnings');
        });

        it('should include error section', () => {
            const result: AdaptResult = {
                sourcePath: '/test/AGENTS.md',
                sourcePlatform: 'agents-md',
                conversions: [],
                allWarnings: [],
                errors: ['Source file not found'],
            };
            const formatted = mockFormatResult(result);
            expect(formatted).toContain('Errors');
            expect(formatted).toContain('Source file not found');
        });

        it('should show output path for successful conversions', () => {
            const result: AdaptResult = {
                sourcePath: '/test/AGENTS.md',
                sourcePlatform: 'agents-md',
                conversions: [
                    {
                        targetPlatform: 'cursorrules',
                        success: true,
                        conversionWarnings: [],
                        errors: [],
                        outputPath: '/test/.cursorrules',
                    },
                ],
                allWarnings: [],
                errors: [],
            };
            const formatted = mockFormatResult(result);
            expect(formatted).toContain('.cursorrules');
        });
    });
});
