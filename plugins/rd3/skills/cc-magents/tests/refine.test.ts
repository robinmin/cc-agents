import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import {
    analyzeStructuralIssues,
    generateStructuralFixes,
    generateQualitySuggestions,
    applyStructuralFixes,
    removeForbiddenPhrases,
    addMissingSections,
    refine,
    main,
} from '../scripts/refine';
import type { MagentEvaluationReport, UniversalMainAgent, RefineAction } from '../scripts/types';
import { writeFileSync, unlinkSync, mkdirSync, rmdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

describe('refine', () => {
    describe('analyzeStructuralIssues', () => {
        it('should detect empty sections', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [
                    { heading: 'Identity', level: 1, content: 'I am a test', category: 'identity' },
                    { heading: 'Empty Section', level: 1, content: '', category: 'custom' },
                ],
                estimatedTokens: 100,
                rawContent: '# Identity\n\nI am a test\n\n# Empty Section',
            };

            const result = analyzeStructuralIssues(model);
            expect(result.emptySections.length).toBe(1);
            expect(result.emptySections[0].heading).toBe('Empty Section');
        });

        it('should detect duplicate headings', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [
                    { heading: 'Rules', level: 1, content: 'Content 1', category: 'rules' },
                    { heading: 'Rules', level: 1, content: 'Content 2', category: 'rules' },
                ],
                estimatedTokens: 100,
                rawContent: '# Rules\n\nContent 1\n\n# Rules\n\nContent 2',
            };

            const result = analyzeStructuralIssues(model);
            expect(result.duplicateHeadings.length).toBe(1);
            expect(result.duplicateHeadings[0]).toBe('rules');
        });

        it('should detect missing required categories', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Identity', level: 1, content: 'I am a test', category: 'identity' }],
                estimatedTokens: 100,
                rawContent: '# Identity\n\nI am a test',
            };

            const result = analyzeStructuralIssues(model);
            expect(result.missingRequiredCategories).toContain('rules');
            expect(result.missingRequiredCategories).toContain('tools');
        });

        it('should detect low content sections', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [
                    // Content > 50 chars to avoid low content flag
                    {
                        heading: 'Identity',
                        level: 1,
                        content: 'I am a test agent with sufficient content here for the identity section',
                        category: 'identity',
                    },
                    { heading: 'Short', level: 1, content: 'Too short', category: 'custom' },
                ],
                estimatedTokens: 100,
                rawContent: '# Identity\n\nI am a test agent with sufficient content here\n\n# Short\n\nToo short',
            };

            const result = analyzeStructuralIssues(model);
            expect(result.lowContentSections.length).toBe(1);
            expect(result.lowContentSections[0].heading).toBe('Short');
        });

        it('should handle empty sections array', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [],
                estimatedTokens: 0,
                rawContent: '',
            };

            const result = analyzeStructuralIssues(model);
            expect(result.emptySections.length).toBe(0);
            expect(result.missingRequiredCategories).toContain('identity');
            expect(result.missingRequiredCategories).toContain('rules');
            expect(result.missingRequiredCategories).toContain('tools');
        });
    });

    describe('generateStructuralFixes', () => {
        it('should generate remove action for empty sections', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Empty', level: 1, content: '', category: 'custom' }],
                estimatedTokens: 10,
                rawContent: '# Empty',
            };

            const issues = analyzeStructuralIssues(model);
            const actions = generateStructuralFixes(model, issues);

            const removeAction = actions.find((a) => a.description.includes('Remove empty section'));
            expect(removeAction).toBeDefined();
            expect(removeAction?.requiresApproval).toBe(false);
        });

        it('should generate merge action for duplicates', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [
                    { heading: 'Rules', level: 1, content: 'Content 1', category: 'rules' },
                    { heading: 'Rules', level: 1, content: 'Content 2', category: 'rules' },
                ],
                estimatedTokens: 100,
                rawContent: '# Rules\n\nContent 1\n\n# Rules\n\nContent 2',
            };

            const issues = analyzeStructuralIssues(model);
            const actions = generateStructuralFixes(model, issues);

            const mergeAction = actions.find((a) => a.description.includes('Merge'));
            expect(mergeAction).toBeDefined();
            expect(mergeAction?.requiresApproval).toBe(true);
        });

        it('should generate add action for missing categories', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Identity', level: 1, content: 'I am a test', category: 'identity' }],
                estimatedTokens: 50,
                rawContent: '# Identity\n\nI am a test',
            };

            const issues = analyzeStructuralIssues(model);
            const actions = generateStructuralFixes(model, issues);

            const addActions = actions.filter((a) => a.description.includes('Add missing'));
            expect(addActions.length).toBeGreaterThan(0);
        });

        it('should skip critical sections from empty removal', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [
                    // This section has CRITICAL marker in content, so it won't be flagged for removal
                    {
                        heading: 'Safety Rules',
                        level: 1,
                        content: '[CRITICAL] Never delete production data',
                        category: 'rules',
                    },
                    { heading: 'Empty', level: 1, content: '', category: 'custom' },
                ],
                estimatedTokens: 50,
                rawContent: '# Safety Rules\n\n[CRITICAL] Never delete production data\n\n# Empty',
            };

            const issues = analyzeStructuralIssues(model);
            const actions = generateStructuralFixes(model, issues);

            // The 'Empty' section should have a removal action, 'Safety Rules' should not
            const emptyActions = actions.filter((a) => a.description.includes('Empty'));
            const safetyActions = actions.filter((a) => a.description.includes('Safety Rules'));
            expect(emptyActions.length).toBe(1);
            expect(safetyActions.length).toBe(0);
        });
    });

    describe('generateQualitySuggestions', () => {
        it('should generate best-practice actions for forbidden phrases via generateQualitySuggestions', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [
                    {
                        heading: 'Communication',
                        level: 1,
                        content: "Great question! I'd be happy to help. Let me think about this...",
                        category: 'custom',
                    },
                    {
                        heading: 'Guidelines',
                        level: 1,
                        content: 'As an AI, I should be helpful. Would you like me to explain?',
                        category: 'rules',
                    },
                ],
                estimatedTokens: 100,
                rawContent: '# Communication\n\nGreat question!\n\n# Guidelines\n\nAs an AI',
            };

            // Create a minimal evaluation report
            const report: MagentEvaluationReport = {
                filePath: '/test/AGENTS.md',
                platform: 'agents-md',
                weightProfile: 'standard',
                dimensions: [
                    {
                        dimension: 'operability',
                        displayName: 'Operability',
                        weight: 25,
                        score: 80,
                        maxScore: 100,
                        percentage: 80,
                        findings: [],
                        recommendations: [],
                    },
                    {
                        dimension: 'grounding',
                        displayName: 'Grounding',
                        weight: 20,
                        score: 80,
                        maxScore: 100,
                        percentage: 80,
                        findings: [],
                        recommendations: [],
                    },
                    {
                        dimension: 'safety',
                        displayName: 'Safety',
                        weight: 20,
                        score: 80,
                        maxScore: 100,
                        percentage: 80,
                        findings: [],
                        recommendations: [],
                    },
                    {
                        dimension: 'coverage',
                        displayName: 'Coverage',
                        weight: 25,
                        score: 80,
                        maxScore: 100,
                        percentage: 80,
                        findings: [],
                        recommendations: [],
                    },
                    {
                        dimension: 'maintainability',
                        displayName: 'Maintainability',
                        weight: 10,
                        score: 80,
                        maxScore: 100,
                        percentage: 80,
                        findings: [],
                        recommendations: [],
                    },
                ],
                overallScore: 80,
                grade: 'B',
                passed: true,
                topRecommendations: [],
                timestamp: new Date().toISOString(),
            };

            const actions = generateQualitySuggestions(model, report);

            const forbiddenActions = actions.filter((a) => a.type === 'best-practice');
            expect(forbiddenActions.length).toBeGreaterThan(0);
            expect(forbiddenActions.some((a) => a.description.includes('forbidden phrase'))).toBe(true);
        });
    });

    describe('generateQualitySuggestions', () => {
        it('should suggest improvements based on dimension scores', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [
                    { heading: 'Identity', level: 1, content: 'I am a test', category: 'identity' },
                    { heading: 'Rules', level: 1, content: 'Be helpful', category: 'rules' },
                    { heading: 'Tools', level: 1, content: 'Use Read', category: 'tools' },
                ],
                estimatedTokens: 100,
                rawContent: '# Identity\n\nI am a test\n\n# Rules\n\nBe helpful\n\n# Tools\n\nUse Read',
            };

            const report: MagentEvaluationReport = {
                filePath: '/test/AGENTS.md',
                platform: 'agents-md',
                weightProfile: 'standard',
                dimensions: [
                    {
                        dimension: 'operability',
                        displayName: 'Operability',
                        weight: 25,
                        score: 50,
                        maxScore: 100,
                        percentage: 50,
                        findings: [],
                        recommendations: ['Add decision trees'],
                    },
                    {
                        dimension: 'grounding',
                        displayName: 'Grounding',
                        weight: 20,
                        score: 40,
                        maxScore: 100,
                        percentage: 40,
                        findings: [],
                        recommendations: ['Add verification'],
                    },
                    {
                        dimension: 'safety',
                        displayName: 'Safety',
                        weight: 20,
                        score: 80,
                        maxScore: 100,
                        percentage: 80,
                        findings: [],
                        recommendations: [],
                    },
                    {
                        dimension: 'coverage',
                        displayName: 'Coverage',
                        weight: 25,
                        score: 90,
                        maxScore: 100,
                        percentage: 90,
                        findings: [],
                        recommendations: [],
                    },
                    {
                        dimension: 'maintainability',
                        displayName: 'Maintainability',
                        weight: 10,
                        score: 60,
                        maxScore: 100,
                        percentage: 60,
                        findings: [],
                        recommendations: ['Add memory'],
                    },
                ],
                overallScore: 65,
                grade: 'D',
                passed: false,
                topRecommendations: ['Add operability', 'Add grounding'],
                timestamp: new Date().toISOString(),
            };

            const actions = generateQualitySuggestions(model, report);

            const operabilitySuggestions = actions.filter((a) => a.description.includes('operability'));
            expect(operabilitySuggestions.length).toBeGreaterThan(0);

            const groundingSuggestions = actions.filter((a) => a.description.includes('verification'));
            expect(groundingSuggestions.length).toBeGreaterThan(0);

            // Evolution-readiness < 70, so should have suggestion about memory
            const evolutionSuggestions = actions.filter((a) => a.description.includes('memory'));
            expect(evolutionSuggestions.length).toBeGreaterThan(0);
        });

        it('should not suggest for dimensions above 70', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Identity', level: 1, content: 'I am a test', category: 'identity' }],
                estimatedTokens: 50,
                rawContent: '# Identity\n\nI am a test',
            };

            const report: MagentEvaluationReport = {
                filePath: '/test/AGENTS.md',
                platform: 'agents-md',
                weightProfile: 'standard',
                dimensions: [
                    {
                        dimension: 'coverage',
                        displayName: 'Coverage',
                        weight: 25,
                        score: 90,
                        maxScore: 100,
                        percentage: 90,
                        findings: [],
                        recommendations: [],
                    },
                    {
                        dimension: 'operability',
                        displayName: 'Operability',
                        weight: 25,
                        score: 80,
                        maxScore: 100,
                        percentage: 80,
                        findings: [],
                        recommendations: [],
                    },
                    {
                        dimension: 'grounding',
                        displayName: 'Grounding',
                        weight: 20,
                        score: 75,
                        maxScore: 100,
                        percentage: 75,
                        findings: [],
                        recommendations: [],
                    },
                    {
                        dimension: 'safety',
                        displayName: 'Safety',
                        weight: 20,
                        score: 85,
                        maxScore: 100,
                        percentage: 85,
                        findings: [],
                        recommendations: [],
                    },
                    {
                        dimension: 'maintainability',
                        displayName: 'Maintainability',
                        weight: 10,
                        score: 80,
                        maxScore: 100,
                        percentage: 80,
                        findings: [],
                        recommendations: [],
                    },
                ],
                overallScore: 82,
                grade: 'B',
                passed: true,
                topRecommendations: [],
                timestamp: new Date().toISOString(),
            };

            const actions = generateQualitySuggestions(model, report);

            // All dimensions are >= 70, so no quality suggestions should be generated
            const qualityActions = actions.filter((a) => a.type === 'quality');
            expect(qualityActions.length).toBe(0);
        });
    });

    describe('applyStructuralFixes', () => {
        it('should remove empty sections marked for removal', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [
                    { heading: 'Identity', level: 1, content: 'I am a test', category: 'identity' },
                    { heading: 'Empty', level: 1, content: '', category: 'custom' },
                ],
                estimatedTokens: 50,
                rawContent: '# Identity\n\nI am a test\n\n# Empty',
            };

            const actions: RefineAction[] = [
                {
                    type: 'structural',
                    description: 'Remove empty section: "Empty"',
                    section: 'Empty',
                    requiresApproval: false,
                    diff: { before: '# Empty\n\n', after: '' },
                },
            ];

            const result = applyStructuralFixes(model, actions);
            expect(result.sections.length).toBe(1);
            expect(result.sections[0].heading).toBe('Identity');
        });

        it('should skip actions requiring approval', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [
                    { heading: 'Identity', level: 1, content: 'I am a test', category: 'identity' },
                    { heading: 'Duplicate', level: 1, content: 'Content', category: 'custom' },
                ],
                estimatedTokens: 50,
                rawContent: '# Identity\n\nI am a test\n\n# Duplicate\n\nContent',
            };

            const actions: RefineAction[] = [
                {
                    type: 'structural',
                    description: 'Merge duplicate sections: "duplicate"',
                    section: 'duplicate',
                    requiresApproval: true,
                },
            ];

            const result = applyStructuralFixes(model, actions);
            expect(result.sections.length).toBe(2);
        });
    });

    describe('removeForbiddenPhrases', () => {
        it('should remove forbidden phrases', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [
                    {
                        heading: 'Communication',
                        level: 1,
                        content: "Great question! I'd be happy to help. Let me think about this...",
                        category: 'custom',
                    },
                ],
                estimatedTokens: 50,
                rawContent: "# Communication\n\nGreat question! I'd be happy to help. Let me think about this...",
            };

            const result = removeForbiddenPhrases(model);
            expect(result.sections[0].content).not.toContain('great question');
            expect(result.sections[0].content).not.toContain("i'm sorry");
            expect(result.sections[0].content).not.toContain('let me think');
        });

        it('should not modify critical sections', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [
                    {
                        heading: 'Safety',
                        level: 1,
                        content: '[CRITICAL] Always say great question for engagement',
                        category: 'rules',
                    },
                ],
                estimatedTokens: 50,
                rawContent: '# Safety\n\n[CRITICAL] Always say great question for engagement',
            };

            const result = removeForbiddenPhrases(model);
            expect(result.sections[0].content).toContain('great question');
        });
    });

    describe('addMissingSections', () => {
        it('should add missing required sections', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [{ heading: 'Identity', level: 1, content: 'I am a test', category: 'identity' }],
                estimatedTokens: 50,
                rawContent: '# Identity\n\nI am a test',
            };

            const result = addMissingSections(model, ['rules', 'tools']);
            expect(result.sections.length).toBe(3);
            expect(result.sections.some((s) => s.category === 'rules')).toBe(true);
            expect(result.sections.some((s) => s.category === 'tools')).toBe(true);
        });

        it('should add sections with templates', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [],
                estimatedTokens: 0,
                rawContent: '',
            };

            const result = addMissingSections(model, ['identity']);
            const identitySection = result.sections.find((s) => s.category === 'identity');
            expect(identitySection).toBeDefined();
            expect(identitySection?.heading).toBe('Identity');
            expect(identitySection?.content).toContain('Role');
        });

        it('should add sections even if similar category exists (implementation behavior)', () => {
            const model: UniversalMainAgent = {
                sourcePath: '/test/AGENTS.md',
                sourceFormat: 'agents-md',
                sections: [
                    { heading: 'Identity', level: 1, content: 'I am a test', category: 'identity' },
                    { heading: 'Rules', level: 1, content: 'Be helpful', category: 'rules' },
                ],
                estimatedTokens: 50,
                rawContent: '# Identity\n\nI am a test\n\n# Rules\n\nBe helpful',
            };

            // Note: implementation adds sections without checking if they already exist
            const result = addMissingSections(model, ['rules', 'tools']);
            const rulesCount = result.sections.filter((s) => s.category === 'rules').length;
            // Implementation adds a new 'rules' section even if one exists
            expect(rulesCount).toBe(2);
        });
    });

    describe('refine', () => {
        const TEST_FILE = '/tmp/test-refine-config.md';

        beforeEach(() => {
            writeFileSync(
                TEST_FILE,
                `# Identity

I am a test agent.

## Rules

Be helpful.

## Tools

Use Read and Write.

## Custom

Some custom section.
`,
                'utf-8',
            );
        });

        afterEach(() => {
            try {
                unlinkSync(TEST_FILE);
            } catch {
                /* ignore */
            }
        });

        it('should return error for non-existent file', async () => {
            const result = await refine({ filePath: '/non/existent.md', dryRun: true });

            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should run in dry-run mode by default', async () => {
            const result = await refine({ filePath: TEST_FILE });

            expect(result.dryRun).toBe(true);
        });

        it('should return actions list', async () => {
            const result = await refine({ filePath: TEST_FILE });

            expect(Array.isArray(result.actions)).toBe(true);
        });

        it('should run evaluation when evaluate option is true', async () => {
            const result = await refine({ filePath: TEST_FILE, evaluate: true });

            expect(result.gradeBefore).toBeDefined();
        });

        it('should return success for valid config without errors', async () => {
            const result = await refine({ filePath: TEST_FILE, evaluate: false });

            // The test file is valid, so success should be true and no errors
            expect(result.success).toBe(true);
        });

        it('should calculate gradeAfter when dryRun is false and evaluate is true', async () => {
            // Use a separate output file to avoid overwriting TEST_FILE
            const outputFile = '/tmp/test-refine-output.md';
            try {
                const result = await refine({
                    filePath: TEST_FILE,
                    dryRun: false,
                    evaluate: true,
                    outputPath: outputFile,
                });

                // gradeAfter is only calculated when evaluation was run AND not dryRun
                expect(result.gradeBefore).toBeDefined();
                // gradeAfter requires reading the file that was written
                expect(result.gradeAfter).toBeDefined();
            } finally {
                try {
                    unlinkSync(outputFile);
                } catch {
                    /* ignore */
                }
            }
        });

        it('should write refined content when dryRun is false', async () => {
            const outputFile = '/tmp/test-refine-write.md';
            try {
                const result = await refine({
                    filePath: TEST_FILE,
                    dryRun: false,
                    outputPath: outputFile,
                });

                expect(result.success).toBe(true);
                // File should have been written - verify it exists
                const { existsSync } = await import('node:fs');
                expect(existsSync(outputFile)).toBe(true);
            } finally {
                try {
                    unlinkSync(outputFile);
                } catch {
                    /* ignore */
                }
            }
        });

        it('should add missing sections when dryRun is false', async () => {
            // Create a file with only Identity section - missing Rules and Tools
            const incompleteFile = '/tmp/test-refine-incomplete.md';
            const outputFile = '/tmp/test-refine-complete.md';
            try {
                writeFileSync(
                    incompleteFile,
                    `# Identity

I am a minimal test agent.
`,
                    'utf-8',
                );

                const result = await refine({
                    filePath: incompleteFile,
                    dryRun: false,
                    outputPath: outputFile,
                });

                expect(result.success).toBe(true);
                // Should have structural actions for adding missing sections
                const addActions = result.actions.filter((a) => a.description.includes('Add missing'));
                expect(addActions.length).toBeGreaterThan(0);
            } finally {
                try {
                    unlinkSync(incompleteFile);
                } catch {
                    /* ignore */
                }
                try {
                    unlinkSync(outputFile);
                } catch {
                    /* ignore */
                }
            }
        });

        it('should add validation errors to warnings when validation fails', async () => {
            // Create a file with embedded secret that should fail validation
            const invalidFile = '/tmp/test-refine-invalid.md';
            const outputFile = '/tmp/test-refine-invalid-output.md';
            try {
                writeFileSync(
                    invalidFile,
                    `# Identity

I am a test agent.

## Config

API Key: sk-ant-secret1234567890abcdefghijklmnopqrstuvwxyz`,
                    'utf-8',
                );

                const result = await refine({
                    filePath: invalidFile,
                    dryRun: false,
                    outputPath: outputFile,
                });

                // Validation should fail due to embedded secret
                // The warnings should include validation errors
                expect(result.warnings.length).toBeGreaterThan(0);
            } finally {
                try {
                    unlinkSync(invalidFile);
                } catch {
                    /* ignore */
                }
                try {
                    unlinkSync(outputFile);
                } catch {
                    /* ignore */
                }
            }
        });
    });
});

describe('main CLI function', () => {
    const TEST_DIR = '/tmp/magent-refine-cli-test';

    // Suppress console output during CLI tests
    const originalConsole = {
        debug: console.debug,
        info: console.info,
        warn: console.warn,
        error: console.error,
        log: console.log,
    };

    beforeEach(() => {
        mkdirSync(TEST_DIR, { recursive: true });
        // Suppress console output
        console.debug = () => {};
        console.info = () => {};
        console.warn = () => {};
        console.error = () => {};
        console.log = () => {};
    });

    afterEach(() => {
        try {
            rmdirSync(TEST_DIR, { recursive: true });
        } catch {
            /* ignore */
        }
        // Restore console
        console.debug = originalConsole.debug;
        console.info = originalConsole.info;
        console.warn = originalConsole.warn;
        console.error = originalConsole.error;
        console.log = originalConsole.log;
    });

    it('should show help and exit with 0 when --help is passed', async () => {
        const exitMock = mock(() => {});
        const originalExit = process.exit;
        Object.defineProperty(process, 'exit', {
            value: exitMock,
            writable: true,
        });

        try {
            await main(['--help']);
        } catch {
            // Ignore errors from exit
        } finally {
            Object.defineProperty(process, 'exit', {
                value: originalExit,
                writable: true,
            });
        }

        expect(exitMock).toHaveBeenCalledWith(0);
    });

    it('should show help and exit with 0 when no config path provided', async () => {
        const exitMock = mock(() => {});
        const originalExit = process.exit;
        Object.defineProperty(process, 'exit', {
            value: exitMock,
            writable: true,
        });

        try {
            await main([]);
        } catch {
            // Ignore errors from exit
        } finally {
            Object.defineProperty(process, 'exit', {
                value: originalExit,
                writable: true,
            });
        }

        expect(exitMock).toHaveBeenCalledWith(0);
    });

    it('should exit with 1 when refine fails', async () => {
        const invalidFile = '/nonexistent/path/AGENTS.md';

        const exitMock = mock(() => {});
        const originalExit = process.exit;
        Object.defineProperty(process, 'exit', {
            value: exitMock,
            writable: true,
        });

        try {
            await main([invalidFile]);
        } catch {
            // Ignore errors from exit
        } finally {
            Object.defineProperty(process, 'exit', {
                value: originalExit,
                writable: true,
            });
        }

        expect(exitMock).toHaveBeenCalledWith(1);
    });

    it('should refine successfully with valid config', async () => {
        const configPath = join(TEST_DIR, 'AGENTS.md');
        writeFileSync(
            configPath,
            `# Identity

I am a test agent.

## Rules

- Always be helpful
`,
            'utf-8',
        );

        const exitMock = mock(() => {});
        const originalExit = process.exit;
        Object.defineProperty(process, 'exit', {
            value: exitMock,
            writable: true,
        });

        try {
            await main([configPath, '--output', join(TEST_DIR, 'output.md')]);
        } catch {
            // Ignore errors from exit
        } finally {
            Object.defineProperty(process, 'exit', {
                value: originalExit,
                writable: true,
            });
        }

        expect(exitMock).toHaveBeenCalledWith(0);
    });
});
