import { describe, it, expect } from 'bun:test';
import type {
    MagentPlatform,
    SectionCategory,
    UniversalMainAgent,
    MagentSection,
    MagentEvaluationReport,
    DimensionScore,
    Grade,
    MagentWeightProfile,
    MagentValidationResult,
} from '../scripts/types';
import { PLATFORM_TIERS, ALL_MAGENT_PLATFORMS, ALL_SECTION_CATEGORIES } from '../scripts/types';

describe('types', () => {
    describe('MagentPlatform', () => {
        it('should include all tier 1 platforms', () => {
            const tier1: MagentPlatform[] = ['agents-md', 'claude-md', 'gemini-md', 'codex'];
            for (const platform of tier1) {
                expect(ALL_MAGENT_PLATFORMS).toContain(platform);
            }
        });

        it('should include all tier 2 platforms', () => {
            const tier2: MagentPlatform[] = ['cursorrules', 'windsurfrules', 'zed-rules', 'opencode-rules'];
            for (const platform of tier2) {
                expect(ALL_MAGENT_PLATFORMS).toContain(platform);
            }
        });

        it('should include tier 3 platforms', () => {
            const tier3: MagentPlatform[] = [
                'junie',
                'augment',
                'cline',
                'aider',
                'warp',
                'roocode',
                'amp',
                'vscode-instructions',
            ];
            for (const platform of tier3) {
                expect(ALL_MAGENT_PLATFORMS).toContain(platform);
            }
        });
    });

    describe('PLATFORM_TIERS', () => {
        it('should have correct tier for agents-md', () => {
            expect(PLATFORM_TIERS['agents-md']).toBe(1);
        });

        it('should have correct tier for claude-md', () => {
            expect(PLATFORM_TIERS['claude-md']).toBe(1);
        });

        it('should have correct tier for cursorrules', () => {
            expect(PLATFORM_TIERS.cursorrules).toBe(2);
        });

        it('should have correct tier for junie', () => {
            expect(PLATFORM_TIERS.junie).toBe(3);
        });

        it('should have correct tier for generic', () => {
            expect(PLATFORM_TIERS.generic).toBe(4);
        });
    });

    describe('SectionCategory', () => {
        it('should include all expected categories', () => {
            const categories: SectionCategory[] = [
                'identity',
                'rules',
                'workflow',
                'tools',
                'standards',
                'verification',
                'memory',
                'evolution',
                'environment',
                'testing',
                'output',
                'error-handling',
                'planning',
                'parallel',
                'custom',
            ];
            for (const cat of categories) {
                expect(ALL_SECTION_CATEGORIES).toContain(cat);
            }
        });

        it('should have custom as fallback', () => {
            expect(ALL_SECTION_CATEGORIES).toContain('custom');
        });
    });

    describe('UniversalMainAgent', () => {
        it('should accept valid UMAM structure', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [],
                estimatedTokens: 100,
                rawContent: '# Test',
            };
            expect(model.sourcePath).toBe('/test/AGENTS.md');
            expect(model.sourceFormat).toBe('agents-md');
        });

        it('should allow optional metadata', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [],
                metadata: { name: 'test', version: '1.0' },
            };
            expect(model.metadata?.name).toBe('test');
        });
    });

    describe('MagentSection', () => {
        it('should accept valid section structure', () => {
            const section: MagentSection = {
                heading: 'Identity',
                level: 1,
                content: 'I am a test agent.',
                category: 'identity',
            };
            expect(section.heading).toBe('Identity');
            expect(section.level).toBe(1);
            expect(section.category).toBe('identity');
        });

        it('should allow optional criticality', () => {
            const section: MagentSection = {
                heading: 'Safety Rules',
                level: 2,
                content: 'Critical content',
                criticality: 'critical',
            };
            expect(section.criticality).toBe('critical');
        });
    });

    describe('Grade', () => {
        it('should accept valid grades', () => {
            const grades: Grade[] = ['A', 'B', 'C', 'D', 'F'];
            for (const grade of grades) {
                expect(['A', 'B', 'C', 'D', 'F']).toContain(grade);
            }
        });
    });

    describe('MagentWeightProfile', () => {
        it('should accept valid profiles', () => {
            const profiles: MagentWeightProfile[] = ['standard', 'minimal', 'advanced'];
            for (const profile of profiles) {
                expect(['standard', 'minimal', 'advanced']).toContain(profile);
            }
        });
    });

    describe('DimensionScore', () => {
        it('should accept valid dimension score', () => {
            const score: DimensionScore = {
                dimension: 'coverage',
                displayName: 'Coverage',
                weight: 25,
                score: 80,
                maxScore: 100,
                percentage: 80,
                findings: ['Found identity section'],
                recommendations: ['Add tools section'],
            };
            expect(score.dimension).toBe('coverage');
            expect(score.percentage).toBe(80);
        });
    });

    describe('MagentEvaluationReport', () => {
        it('should accept valid evaluation report', () => {
            const report: MagentEvaluationReport = {
                filePath: '/test/AGENTS.md',
                platform: 'agents-md',
                weightProfile: 'standard',
                dimensions: [],
                overallScore: 85,
                grade: 'B',
                passed: true,
                topRecommendations: ['Add decision trees'],
                timestamp: new Date().toISOString(),
            };
            expect(report.grade).toBe('B');
            expect(report.passed).toBe(true);
        });
    });

    describe('MagentValidationResult', () => {
        it('should accept valid validation result', () => {
            const result: MagentValidationResult = {
                valid: true,
                errors: [],
                warnings: [],
                suggestions: [],
                findings: [],
                filePath: '/test/AGENTS.md',
                detectedPlatform: 'agents-md',
                fileSize: 1024,
                estimatedTokens: 500,
                sectionCount: 5,
                timestamp: new Date().toISOString(),
            };
            expect(result.valid).toBe(true);
            expect(result.sectionCount).toBe(5);
        });

        it('should accept invalid validation result', () => {
            const result: MagentValidationResult = {
                valid: false,
                errors: ['File is empty'],
                warnings: [],
                suggestions: [],
                findings: [],
                filePath: '/test/AGENTS.md',
                detectedPlatform: 'agents-md',
                fileSize: 0,
                estimatedTokens: 0,
                sectionCount: 0,
                timestamp: new Date().toISOString(),
            };
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('File is empty');
        });
    });
});
