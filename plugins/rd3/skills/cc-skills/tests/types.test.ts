/**
 * Unit tests for rd3:cc-skills types
 */

import { describe, expect, it } from 'bun:test';
import type {
    AdapterContext,
    AdapterResult,
    CommandOptions,
    EvaluationDimension,
    EvaluationReport,
    EvaluationScope,
    Platform,
    ScaffoldOptions,
    Skill,
    SkillFrontmatter,
    SkillMetadata,
    ValidationResult,
} from '../scripts/types';

describe('Type Definitions', () => {
    describe('SkillFrontmatter', () => {
        it('should require name and description', () => {
            const fm: SkillFrontmatter = {
                name: 'test-skill',
                description: 'A test skill',
            };
            expect(fm.name).toBe('test-skill');
            expect(fm.description).toBe('A test skill');
        });

        it('should allow optional license and metadata', () => {
            const fm: SkillFrontmatter = {
                name: 'test-skill',
                description: 'A test skill',
                license: 'MIT',
                metadata: {
                    author: 'Test Author',
                    version: '1.0.0',
                },
            };
            expect(fm.license).toBe('MIT');
            expect(fm.metadata?.author).toBe('Test Author');
        });

        it('should allow platform extensions', () => {
            const fm: SkillFrontmatter = {
                name: 'test-skill',
                description: 'A test skill',
                openclaw: { emoji: '🛠️' },
            };
            expect(fm.openclaw).toEqual({ emoji: '🛠️' });
        });
    });

    describe('SkillMetadata', () => {
        it('should allow openclaw metadata', () => {
            const metadata: SkillMetadata = {
                author: 'Test Author',
                version: '1.0.0',
                platforms: 'claude-code,codex,openclaw',
                openclaw: {
                    emoji: '🛠️',
                    requires: {
                        bins: ['git'],
                        env: ['NODE_ENV'],
                    },
                },
            };
            expect(metadata.openclaw?.emoji).toBe('🛠️');
            expect(metadata.openclaw?.requires?.bins).toContain('git');
        });
    });

    describe('Platform type', () => {
        it('should accept valid platforms', () => {
            const platforms: Platform[] = ['claude', 'codex', 'openclaw', 'opencode', 'antigravity'];
            expect(platforms.length).toBe(5);
        });
    });

    describe('ScaffoldOptions', () => {
        it('should require name and path', () => {
            const options: ScaffoldOptions = {
                name: 'my-skill',
                path: '/skills/my-skill',
            };
            expect(options.name).toBe('my-skill');
            expect(options.path).toBe('/skills/my-skill');
        });

        it('should allow optional fields', () => {
            const options: ScaffoldOptions = {
                name: 'my-skill',
                path: '/skills/my-skill',
                template: 'technique',
                resources: ['scripts', 'references'],
                examples: true,
                platforms: ['claude', 'codex'],
                migrate: true,
            };
            expect(options.template).toBe('technique');
            expect(options.examples).toBe(true);
            expect(options.migrate).toBe(true);
        });
    });

    describe('AdapterContext', () => {
        it('should require skill and options', () => {
            const mockSkill: Skill = {
                frontmatter: { name: 'test', description: 'test' },
                body: 'test body',
                raw: 'raw content',
                path: '/test/SKILL.md',
                directory: '/test',
                resources: {},
            };

            const context: AdapterContext = {
                skill: mockSkill,
                options: { name: 'test', path: '/test' },
                outputPath: '/output',
                skillPath: '/test',
                skillName: 'test',
                frontmatter: { name: 'test', description: 'test' },
                body: 'test body',
                resources: {},
            };

            expect(context.skill.frontmatter.name).toBe('test');
            expect(context.options.name).toBe('test');
        });
    });

    describe('AdapterResult', () => {
        it('should have correct structure', () => {
            const result: AdapterResult = {
                success: true,
                companions: ['agents/openai.yaml'],
                errors: [],
                warnings: [],
                messages: ['Generated companions'],
            };

            expect(result.success).toBe(true);
            expect(result.companions.length).toBe(1);
        });
    });

    describe('ValidationResult', () => {
        it('should track errors and warnings', () => {
            const result: ValidationResult = {
                valid: false,
                errors: ['Missing name field'],
                warnings: ['Consider adding metadata'],
            };

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBe(1);
            expect(result.warnings.length).toBe(1);
        });
    });

    describe('EvaluationDimension', () => {
        it('should track score and maxScore', () => {
            const dim: EvaluationDimension = {
                name: 'Frontmatter',
                weight: 20,
                score: 15,
                maxScore: 20,
                findings: ['Missing optional field'],
                recommendations: ['Add metadata'],
            };

            expect(dim.score).toBe(15);
            expect(dim.maxScore).toBe(20);
            expect(dim.weight).toBe(20);
        });
    });

    describe('EvaluationReport', () => {
        it('should calculate percentage', () => {
            const report: EvaluationReport = {
                skillPath: '/test',
                skillName: 'test',
                scope: 'full',
                overallScore: 85,
                maxScore: 100,
                percentage: 85,
                dimensions: [],
                timestamp: new Date().toISOString(),
                passed: true,
            };

            expect(report.percentage).toBe(85);
            expect(report.passed).toBe(true);
        });
    });

    describe('CommandOptions', () => {
        it('should allow all options', () => {
            const options: CommandOptions = {
                platform: 'all',
                scope: 'full',
                migrate: true,
                output: 'json',
                verbose: true,
            };

            expect(options.platform).toBe('all');
            expect(options.scope).toBe('full');
            expect(options.migrate).toBe(true);
        });
    });
});

describe('Type Guards', () => {
    it('should validate Platform type', () => {
        const isValidPlatform = (p: string): p is Platform => {
            return ['claude', 'codex', 'openclaw', 'opencode', 'antigravity'].includes(p);
        };

        expect(isValidPlatform('claude')).toBe(true);
        expect(isValidPlatform('invalid')).toBe(false);
    });

    it('should validate EvaluationScope type', () => {
        const isValidScope = (s: string): s is EvaluationScope => {
            return ['basic', 'full'].includes(s);
        };

        expect(isValidScope('basic')).toBe(true);
        expect(isValidScope('full')).toBe(true);
        expect(isValidScope('invalid')).toBe(false);
    });
});
