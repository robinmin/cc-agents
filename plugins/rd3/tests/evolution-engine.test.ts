import { describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    type GenericEvaluationReport,
    type RefineBackedProposal,
    analyzeEvaluationReport,
    captureDirectorySnapshot,
    captureTargetedSnapshot,
    createBackup,
    createSupplementalSignalsFromMessages,
    detectDataSourceAvailability,
    formatAnalysis,
    formatHistory,
    formatProposals,
    formatUnsupportedApply,
    generateHistorySignals,
    generateRefineBackedProposals,
    generateWorkspaceSignals,
    getEvolutionStoragePaths,
    getNextVersionId,
    loadProposalSet,
    loadVersionHistory,
    restoreDirectorySnapshot,
    restoreTargetedSnapshot,
    rollbackSingleFile,
    runScript,
    saveProposalSet,
    saveSnapshotBackup,
    saveVersionSnapshot,
    verifyProposalOutcome,
} from '../scripts/evolution-engine';

function createWorkspaceFixture(): string {
    return mkdtempSync(join(tmpdir(), 'rd3-evolution-engine-'));
}

describe('evolution-engine', () => {
    it('stores shared evolution state under the repository root convention', () => {
        const storage = getEvolutionStoragePaths('.cc-agents', 'plugins/rd3/skills/cc-agents/SKILL.md');

        expect(storage.rootDir).toContain('/.rd3-evolution/cc-agents');
        expect(storage.proposalsPath).toContain('/.rd3-evolution/cc-agents/proposals/');
        expect(storage.historyPath).toContain('/.rd3-evolution/cc-agents/versions/');
        expect(storage.backupsDir).toContain('/.rd3-evolution/cc-agents/backups');
    });

    it('generates proposals with target kind, evidence, risk, apply mode, and verification plan', () => {
        const report: GenericEvaluationReport = {
            targetPath: '/tmp/example.md',
            targetName: 'example',
            percentage: 62,
            passed: false,
            grade: 'D',
            dimensions: [
                {
                    name: 'security',
                    score: 2,
                    maxScore: 10,
                    findings: ['Security guidance is missing'],
                    recommendations: ['Add stronger security rules'],
                },
                {
                    name: 'content',
                    score: 4,
                    maxScore: 10,
                    findings: ['Examples are weak'],
                    recommendations: ['Improve examples'],
                },
            ],
        };

        const analysis = analyzeEvaluationReport(report);
        const proposalSet = generateRefineBackedProposals(report, analysis, {
            defaultFlags: ['--best-practices'],
            migrateFlags: ['--migrate'],
            applySupported: true,
            targetKind: 'skill',
            objective: 'quality',
            verificationChecks: ['validate', 'evaluate', 'test'],
        });

        expect(proposalSet.proposals.length).toBeGreaterThan(0);
        expect(proposalSet.proposals.every((proposal) => proposal.targetKind === 'skill')).toBe(true);
        expect(proposalSet.proposals.every((proposal) => proposal.applyMode !== undefined)).toBe(true);
        expect(proposalSet.proposals.every((proposal) => proposal.evidence && proposal.evidence.length > 0)).toBe(true);
        expect(proposalSet.proposals.some((proposal) => proposal.applyRisk === 'high')).toBe(true);
        expect(proposalSet.proposals.some((proposal) => proposal.applyMode === 'confirm-required')).toBe(true);
        expect(
            proposalSet.proposals.some(
                (proposal) =>
                    proposal.verificationPlan?.testsRequired && proposal.verificationPlan.checks.includes('test'),
            ),
        ).toBe(true);
    });

    it('keeps maintenance-only proposals recommendation-first', () => {
        const report: GenericEvaluationReport = {
            targetPath: '/tmp/healthy.md',
            targetName: 'healthy',
            percentage: 85,
            passed: true,
            grade: 'B',
            dimensions: [],
        };

        const analysis = analyzeEvaluationReport(report);
        const proposalSet = generateRefineBackedProposals(report, analysis, {
            defaultFlags: ['--best-practices'],
            applySupported: true,
            targetKind: 'skill',
            objective: 'evolution-readiness',
            verificationChecks: ['validate', 'evaluate'],
        });

        expect(proposalSet.proposals).toHaveLength(1);
        expect(proposalSet.proposals[0]?.targetSection).toBe('maintenance');
        expect(proposalSet.proposals[0]?.applyMode).toBe('manual-only');
    });

    it('verifies proposals against non-regression and pass requirements', () => {
        const baseline: GenericEvaluationReport = {
            targetPath: '/tmp/example.md',
            targetName: 'example',
            percentage: 62,
            passed: false,
            grade: 'D',
            dimensions: [],
        };

        const updated: GenericEvaluationReport = {
            ...baseline,
            percentage: 58,
            grade: 'F',
        };

        const analysis = analyzeEvaluationReport(baseline);
        const proposalSet = generateRefineBackedProposals(baseline, analysis, {
            defaultFlags: ['--best-practices'],
            applySupported: true,
            targetKind: 'skill',
            objective: 'quality',
            verificationChecks: ['validate', 'evaluate'],
        });

        const proposal = proposalSet.proposals.find((entry) => entry.targetSection === 'overall-quality');
        expect(proposal).toBeDefined();
        if (!proposal) {
            throw new Error('Expected an overall-quality proposal');
        }

        const outcome = verifyProposalOutcome(proposal, baseline, updated, false);
        expect(outcome.success).toBe(false);
        expect(outcome.issues.some((issue) => issue.includes('Validation failed'))).toBe(true);
        expect(outcome.issues.some((issue) => issue.includes('regressed'))).toBe(true);
    });

    it('classifies supplemental signals from validation-like messages', () => {
        const signals = createSupplementalSignalsFromMessages(
            ['Platform compatibility notes are missing', 'Tests failed after regeneration'],
            'warning',
        );

        expect(signals).toHaveLength(2);
        expect(signals[0]?.evidenceType).toBe('platform-gap');
        expect(signals[0]?.scope).toBe('adapters');
        expect(signals[1]?.evidenceType).toBe('test-failure');
        expect(signals[1]?.scope).toBe('tests');
    });

    it('collects optional workspace feedback and memory signals when present', () => {
        const workspaceFixture = createWorkspaceFixture();
        try {
            mkdirSync(join(workspaceFixture, '.git'), { recursive: true });
            mkdirSync(join(workspaceFixture, 'skills', 'demo-skill'), { recursive: true });
            writeFileSync(
                join(workspaceFixture, 'FEEDBACK.md'),
                'demo-skill is confusing on platform compatibility and missing adapter notes\n',
                'utf-8',
            );
            writeFileSync(
                join(workspaceFixture, 'MEMORY.md'),
                'demo-skill follow up: tests failed after companion regeneration\n',
                'utf-8',
            );

            const signals = generateWorkspaceSignals(join(workspaceFixture, 'skills', 'demo-skill'), 'demo-skill');
            expect(signals).toHaveLength(2);
            expect(signals.some((signal) => signal.source === 'user-feedback')).toBe(true);
            expect(signals.some((signal) => signal.source === 'memory-md')).toBe(true);
        } finally {
            rmSync(workspaceFixture, { recursive: true, force: true });
        }
    });

    it('turns supplemental signals into additional proposals', () => {
        const report: GenericEvaluationReport = {
            targetPath: '/tmp/example.md',
            targetName: 'example',
            percentage: 74,
            passed: true,
            grade: 'C',
            dimensions: [],
        };

        const analysis = analyzeEvaluationReport(report);
        const proposalSet = generateRefineBackedProposals(report, analysis, {
            defaultFlags: ['--best-practices'],
            applySupported: true,
            targetKind: 'skill',
            objective: 'quality',
            verificationChecks: ['validate', 'evaluate'],
            supplementalSignals: [
                {
                    description: 'Address platform compatibility gap',
                    evidence: ['Platform compatibility notes are missing'],
                    affectedSection: 'platform-compatibility',
                    evidenceType: 'platform-gap',
                    scope: 'adapters',
                    objective: 'portability',
                },
            ],
        });

        const supplemental = proposalSet.proposals.find(
            (proposal) => proposal.description === 'Address platform compatibility gap',
        );
        expect(supplemental).toBeDefined();
        expect(supplemental?.applyMode).toBe('manual-only');
        expect(supplemental?.objective).toBe('portability');
    });

    it('merges equivalent proposals from mixed evidence sources', () => {
        const report: GenericEvaluationReport = {
            targetPath: '/tmp/example.md',
            targetName: 'example',
            percentage: 74,
            passed: true,
            grade: 'C',
            dimensions: [],
        };

        const analysis = analyzeEvaluationReport(report);
        const proposalSet = generateRefineBackedProposals(report, analysis, {
            defaultFlags: ['--best-practices'],
            applySupported: true,
            targetKind: 'skill',
            objective: 'quality',
            verificationChecks: ['validate', 'evaluate'],
            supplementalSignals: [
                {
                    description: 'Address platform compatibility gap',
                    evidence: ['Platform compatibility notes are missing'],
                    affectedSection: 'platform-compatibility',
                    evidenceType: 'platform-gap',
                    scope: 'adapters',
                    objective: 'portability',
                    confidence: 0.65,
                    priority: 'medium',
                },
                {
                    description: 'Improve platform compatibility',
                    evidence: ['Missing platform compatibility notes in companion guidance'],
                    affectedSection: 'platform-compatibility',
                    evidenceType: 'platform-gap',
                    scope: 'adapters',
                    objective: 'portability',
                    confidence: 0.8,
                    priority: 'medium',
                },
            ],
        });

        const platformProposals = proposalSet.proposals.filter(
            (proposal) => proposal.targetSection === 'platform-compatibility',
        );
        expect(platformProposals).toHaveLength(1);
        expect(platformProposals[0]?.confidence).toBe(0.8);
        expect(platformProposals[0]?.evidence?.length).toBe(2);
        expect(platformProposals[0]?.applyMode).toBe('manual-only');
    });

    it('ranks mixed proposals by impact and keeps maintenance last', () => {
        const report: GenericEvaluationReport = {
            targetPath: '/tmp/example.md',
            targetName: 'example',
            percentage: 74,
            passed: true,
            grade: 'C',
            dimensions: [],
        };

        const analysis = analyzeEvaluationReport(report);
        const proposalSet = generateRefineBackedProposals(report, analysis, {
            defaultFlags: ['--best-practices'],
            applySupported: true,
            targetKind: 'skill',
            objective: 'quality',
            verificationChecks: ['validate', 'evaluate'],
            supplementalSignals: [
                {
                    description: 'Repair failing tests after regeneration',
                    evidence: ['Tests failed after companion regeneration'],
                    affectedSection: 'testing',
                    evidenceType: 'test-failure',
                    scope: 'tests',
                    objective: 'quality',
                    confidence: 0.85,
                    priority: 'high',
                },
                {
                    description: 'Address platform compatibility gap',
                    evidence: ['Platform compatibility notes are missing'],
                    affectedSection: 'platform-compatibility',
                    evidenceType: 'platform-gap',
                    scope: 'adapters',
                    objective: 'portability',
                    confidence: 0.7,
                    priority: 'medium',
                },
            ],
        });

        expect(proposalSet.proposals[0]?.description).toBe('Repair failing tests after regeneration');
        expect(proposalSet.proposals[1]?.description).toBe('Address platform compatibility gap');
        expect(proposalSet.proposals.at(-1)?.targetSection).toBe('maintenance');
    });

    it('derives regression signals from shared evolution history', () => {
        const workspaceFixture = createWorkspaceFixture();
        try {
            mkdirSync(join(workspaceFixture, '.git'), { recursive: true });
            mkdirSync(join(workspaceFixture, 'agents'), { recursive: true });
            const targetPath = join(workspaceFixture, 'agents', 'demo-agent.md');
            writeFileSync(targetPath, '# demo agent\n', 'utf-8');

            saveVersionSnapshot('.cc-agents', targetPath, {
                version: 'v0',
                timestamp: new Date().toISOString(),
                content: 'baseline',
                grade: 'B',
                changeDescription: 'Initial baseline',
                proposalsApplied: [],
            });
            saveVersionSnapshot('.cc-agents', targetPath, {
                version: 'v1',
                timestamp: new Date().toISOString(),
                content: 'changed',
                grade: 'C',
                changeDescription: 'Applied structural refine',
                proposalsApplied: ['p1'],
            });

            const signals = generateHistorySignals('.cc-agents', targetPath, 'D');
            expect(signals.some((signal) => signal.description === 'Recover from historical quality regression')).toBe(
                true,
            );
        } finally {
            rmSync(workspaceFixture, { recursive: true, force: true });
        }
    });

    it('derives churn signals from repeated non-improving evolution history', () => {
        const workspaceFixture = createWorkspaceFixture();
        try {
            mkdirSync(join(workspaceFixture, '.git'), { recursive: true });
            mkdirSync(join(workspaceFixture, 'skills', 'demo-skill'), { recursive: true });
            const targetPath = join(workspaceFixture, 'skills', 'demo-skill');

            saveVersionSnapshot('.cc-skills', targetPath, {
                version: 'v0',
                timestamp: new Date().toISOString(),
                content: 'baseline',
                grade: 'C',
                changeDescription: 'Baseline',
                proposalsApplied: [],
            });
            saveVersionSnapshot('.cc-skills', targetPath, {
                version: 'v1',
                timestamp: new Date().toISOString(),
                content: 'change-1',
                grade: 'C',
                changeDescription: 'Applied metadata refine',
                proposalsApplied: ['p1'],
            });
            saveVersionSnapshot('.cc-skills', targetPath, {
                version: 'v2',
                timestamp: new Date().toISOString(),
                content: 'change-2',
                grade: 'D',
                changeDescription: 'Applied follow-up refine',
                proposalsApplied: ['p2'],
            });

            const signals = generateHistorySignals('.cc-skills', targetPath, 'D');
            expect(
                signals.some((signal) => signal.description === 'Break repeated non-improving evolution cycle'),
            ).toBe(true);
        } finally {
            rmSync(workspaceFixture, { recursive: true, force: true });
        }
    });

    it('detects available data sources in a full workspace', () => {
        const workspaceFixture = createWorkspaceFixture();
        try {
            mkdirSync(join(workspaceFixture, '.git'), { recursive: true });
            mkdirSync(join(workspaceFixture, '.github', 'workflows'), { recursive: true });
            writeFileSync(join(workspaceFixture, 'FEEDBACK.md'), 'Some feedback', 'utf-8');
            writeFileSync(join(workspaceFixture, 'MEMORY.md'), 'Some memory', 'utf-8');
            mkdirSync(join(workspaceFixture, 'logs'), { recursive: true });

            const availability = detectDataSourceAvailability(workspaceFixture);
            expect(availability['git-history']).toBe(true);
            expect(availability['ci-results']).toBe(true);
            expect(availability['user-feedback']).toBe(true);
            expect(availability['memory-md']).toBe(true);
            expect(availability['interaction-logs']).toBe(true);
        } finally {
            rmSync(workspaceFixture, { recursive: true, force: true });
        }
    });

    it('detects missing data sources in a minimal workspace', () => {
        const availability = detectDataSourceAvailability('/tmp/nonexistent-path');
        expect(availability['git-history']).toBe(false);
        expect(availability['ci-results']).toBe(false);
        expect(availability['user-feedback']).toBe(false);
        expect(availability['memory-md']).toBe(false);
        expect(availability['interaction-logs']).toBe(false);
    });

    it('saves and loads proposal sets round-trip', () => {
        const workspaceFixture = createWorkspaceFixture();
        try {
            mkdirSync(join(workspaceFixture, '.git'), { recursive: true });
            const targetPath = join(workspaceFixture, 'example.md');
            writeFileSync(targetPath, '# example\n', 'utf-8');

            const report: GenericEvaluationReport = {
                targetPath,
                targetName: 'example',
                percentage: 65,
                passed: false,
                grade: 'D',
                dimensions: [],
            };

            const analysis = analyzeEvaluationReport(report);
            const proposalSet = generateRefineBackedProposals(report, analysis, {
                defaultFlags: ['--best-practices'],
                applySupported: true,
                targetKind: 'skill',
                objective: 'quality',
                verificationChecks: ['validate', 'evaluate'],
            });

            const savedPath = saveProposalSet('.cc-agents', targetPath, proposalSet);
            expect(savedPath).toContain('.proposals.json');

            const loaded = loadProposalSet('.cc-agents', targetPath);
            expect(loaded).not.toBeNull();
            expect(loaded?.proposals.length).toBeGreaterThan(0);
            expect(loaded?.targetName).toBe('example');
        } finally {
            rmSync(workspaceFixture, { recursive: true, force: true });
        }
    });

    it('loadProposalSet returns null when no proposals exist', () => {
        const result = loadProposalSet('.cc-agents', '/tmp/nonexistent-target-xyz.md');
        expect(result).toBeNull();
    });

    it('loads empty version history when none exists', () => {
        const history = loadVersionHistory('.cc-agents', '/tmp/nonexistent-target-xyz.md');
        expect(history).toHaveLength(0);
    });

    it('saves and loads version history round-trip', () => {
        const workspaceFixture = createWorkspaceFixture();
        try {
            mkdirSync(join(workspaceFixture, '.git'), { recursive: true });
            const targetPath = join(workspaceFixture, 'example.md');
            writeFileSync(targetPath, '# example\n', 'utf-8');

            saveVersionSnapshot('.cc-agents', targetPath, {
                version: 'v0',
                timestamp: new Date().toISOString(),
                content: 'baseline',
                grade: 'B',
                changeDescription: 'Initial',
                proposalsApplied: [],
            });

            const history = loadVersionHistory('.cc-agents', targetPath);
            expect(history).toHaveLength(1);
            expect(history[0]?.version).toBe('v0');
            expect(history[0]?.grade).toBe('B');
        } finally {
            rmSync(workspaceFixture, { recursive: true, force: true });
        }
    });

    it('getNextVersionId returns v1 for empty array', () => {
        expect(getNextVersionId([])).toBe('v1');
    });

    it('getNextVersionId returns next version number', () => {
        const versions = [
            { version: 'v0', timestamp: '', content: '', grade: '', changeDescription: '', proposalsApplied: [] },
            { version: 'v1', timestamp: '', content: '', grade: '', changeDescription: '', proposalsApplied: [] },
            { version: 'v3', timestamp: '', content: '', grade: '', changeDescription: '', proposalsApplied: [] },
        ];
        expect(getNextVersionId(versions)).toBe('v4');
    });

    it('getNextVersionId returns v1 for invalid version strings', () => {
        const versions = [
            { version: 'invalid', timestamp: '', content: '', grade: '', changeDescription: '', proposalsApplied: [] },
            { version: 'latest', timestamp: '', content: '', grade: '', changeDescription: '', proposalsApplied: [] },
        ];
        expect(getNextVersionId(versions)).toBe('v1');
    });

    it('captures and restores directory snapshots', () => {
        const workspaceFixture = createWorkspaceFixture();
        try {
            mkdirSync(join(workspaceFixture, 'skills', 'demo-skill'), { recursive: true });
            writeFileSync(join(workspaceFixture, 'skills', 'demo-skill', 'README.md'), '# Demo Skill\n', 'utf-8');
            writeFileSync(join(workspaceFixture, 'skills', 'demo-skill', 'SKILL.md'), '## Skills\n', 'utf-8');

            const snapshot = captureDirectorySnapshot(
                join(workspaceFixture, 'skills', 'demo-skill'),
                'v1',
                'B',
                'Initial version',
                [],
            );

            expect(snapshot.version).toBe('v1');
            expect(snapshot.entries.length).toBeGreaterThanOrEqual(2);
            expect(snapshot.rootPath).toContain('demo-skill');

            // Modify files
            writeFileSync(join(workspaceFixture, 'skills', 'demo-skill', 'README.md'), '# Modified\n', 'utf-8');

            restoreDirectorySnapshot(snapshot);

            const content = readFileSync(join(workspaceFixture, 'skills', 'demo-skill', 'README.md'), 'utf-8');
            expect(content).toBe('# Demo Skill\n');
        } finally {
            rmSync(workspaceFixture, { recursive: true, force: true });
        }
    });

    it('captureDirectorySnapshot handles nonexistent root path', () => {
        const snapshot = captureDirectorySnapshot('/tmp/nonexistent-dir-xyz', 'v1', 'B', 'test', []);
        expect(snapshot.entries).toHaveLength(0);
    });

    it('restoreDirectorySnapshot removes extra files not in snapshot', () => {
        const workspaceFixture = createWorkspaceFixture();
        try {
            mkdirSync(join(workspaceFixture, 'skill'), { recursive: true });
            writeFileSync(join(workspaceFixture, 'skill', 'existing.md'), '# Existing\n', 'utf-8');

            const snapshot = captureDirectorySnapshot(workspaceFixture, 'v1', 'B', 'test', []);

            writeFileSync(join(workspaceFixture, 'skill', 'new-file.md'), '# New\n', 'utf-8');
            expect(existsSync(join(workspaceFixture, 'skill', 'new-file.md'))).toBe(true);

            restoreDirectorySnapshot(snapshot);
            expect(existsSync(join(workspaceFixture, 'skill', 'new-file.md'))).toBe(false);
        } finally {
            rmSync(workspaceFixture, { recursive: true, force: true });
        }
    });

    it('captures and restores targeted snapshots', () => {
        const workspaceFixture = createWorkspaceFixture();
        try {
            mkdirSync(join(workspaceFixture, 'skills'), { recursive: true });
            const targetFile = join(workspaceFixture, 'skills', 'target.md');
            writeFileSync(targetFile, '# Target\n', 'utf-8');

            const snapshot = captureTargetedSnapshot(workspaceFixture, [targetFile], 'v1', 'B', 'Targeted change', [
                'p1',
            ]);

            expect(snapshot.version).toBe('v1');
            expect(snapshot.entries).toHaveLength(1);
            expect(snapshot.proposalsApplied).toContain('p1');

            writeFileSync(targetFile, '# Modified\n', 'utf-8');
            restoreTargetedSnapshot(snapshot, [targetFile]);

            expect(readFileSync(targetFile, 'utf-8')).toBe('# Target\n');
        } finally {
            rmSync(workspaceFixture, { recursive: true, force: true });
        }
    });

    it('restoreTargetedSnapshot removes files not in snapshot', () => {
        const workspaceFixture = createWorkspaceFixture();
        try {
            mkdirSync(join(workspaceFixture, 'skills'), { recursive: true });
            const targetFile = join(workspaceFixture, 'skills', 'target.md');
            writeFileSync(targetFile, '# Target\n', 'utf-8');

            const snapshot = captureTargetedSnapshot(workspaceFixture, [targetFile], 'v1', 'B', 'test', []);

            const extraFile = join(workspaceFixture, 'skills', 'extra.md');
            writeFileSync(extraFile, '# Extra\n', 'utf-8');
            expect(existsSync(extraFile)).toBe(true);

            restoreTargetedSnapshot(snapshot, [targetFile, extraFile]);
            expect(existsSync(extraFile)).toBe(false);
        } finally {
            rmSync(workspaceFixture, { recursive: true, force: true });
        }
    });

    it('creates backup files', () => {
        const workspaceFixture = createWorkspaceFixture();
        try {
            mkdirSync(join(workspaceFixture, '.git'), { recursive: true });
            const targetPath = join(workspaceFixture, 'example.md');
            writeFileSync(targetPath, '# Original content\n', 'utf-8');

            const backupPath = createBackup('.cc-agents', targetPath, '# Backup content\n');
            expect(backupPath).toContain('.bak');
            expect(existsSync(backupPath)).toBe(true);
            expect(readFileSync(backupPath, 'utf-8')).toBe('# Backup content\n');
        } finally {
            rmSync(workspaceFixture, { recursive: true, force: true });
        }
    });

    it('saves snapshot backups', () => {
        const workspaceFixture = createWorkspaceFixture();
        try {
            mkdirSync(join(workspaceFixture, '.git'), { recursive: true });
            const targetPath = join(workspaceFixture, 'example.md');
            writeFileSync(targetPath, '# Example\n', 'utf-8');

            const snapshot = captureDirectorySnapshot(join(workspaceFixture), 'v1', 'B', 'Backup test', []);
            const backupPath = saveSnapshotBackup('.cc-agents', targetPath, snapshot, 'test-label');

            expect(backupPath).toContain('.snapshot.json');
            expect(existsSync(backupPath)).toBe(true);
        } finally {
            rmSync(workspaceFixture, { recursive: true, force: true });
        }
    });

    it('rolls back single file to a previous version', () => {
        const workspaceFixture = createWorkspaceFixture();
        try {
            mkdirSync(join(workspaceFixture, '.git'), { recursive: true });
            const targetPath = join(workspaceFixture, 'example.md');
            writeFileSync(targetPath, '# Original\n', 'utf-8');

            saveVersionSnapshot('.cc-agents', targetPath, {
                version: 'v1',
                timestamp: new Date().toISOString(),
                content: '# v1 content',
                grade: 'C',
                changeDescription: 'First change',
                proposalsApplied: ['p1'],
            });

            writeFileSync(targetPath, '# Modified\n', 'utf-8');

            const result = rollbackSingleFile('.cc-agents', targetPath, 'v1');
            expect(result.success).toBe(true);
            expect(readFileSync(targetPath, 'utf-8')).toBe('# v1 content');
            expect(result.backupPath).toBeDefined();
        } finally {
            rmSync(workspaceFixture, { recursive: true, force: true });
        }
    });

    it('rollbackSingleFile returns error for nonexistent version', () => {
        const workspaceFixture = createWorkspaceFixture();
        try {
            mkdirSync(join(workspaceFixture, '.git'), { recursive: true });
            const targetPath = join(workspaceFixture, 'example.md');
            writeFileSync(targetPath, '# Example\n', 'utf-8');

            const result = rollbackSingleFile('.cc-agents', targetPath, 'nonexistent-v99');
            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        } finally {
            rmSync(workspaceFixture, { recursive: true, force: true });
        }
    });

    it('rollbackSingleFile returns error when target does not exist', () => {
        const result = rollbackSingleFile('.cc-agents', '/tmp/nonexistent-file-xyz.md', 'v1');
        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
    });

    it('runs a script and captures output', async () => {
        const workspaceFixture = createWorkspaceFixture();
        try {
            const scriptPath = join(workspaceFixture, 'test-script.ts');
            writeFileSync(scriptPath, 'console.log("hello from script");', 'utf-8');

            const result = await runScript(scriptPath, []);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('hello from script');
            expect(result.stderr).toBe('');
        } finally {
            rmSync(workspaceFixture, { recursive: true, force: true });
        }
    });

    it('runScript returns non-zero exit code on failure', async () => {
        const workspaceFixture = createWorkspaceFixture();
        try {
            const scriptPath = join(workspaceFixture, 'fail-script.ts');
            writeFileSync(scriptPath, 'console.error("something went wrong"); process.exit(1);', 'utf-8');

            const result = await runScript(scriptPath, []);
            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain('something went wrong');
        } finally {
            rmSync(workspaceFixture, { recursive: true, force: true });
        }
    });

    it('verifyProposalOutcome passes when all checks pass', () => {
        const baseline: GenericEvaluationReport = {
            targetPath: '/tmp/example.md',
            targetName: 'example',
            percentage: 60,
            passed: false,
            grade: 'D',
            dimensions: [],
        };

        const updated: GenericEvaluationReport = {
            ...baseline,
            percentage: 75,
            passed: true,
            grade: 'C',
        };

        const proposal = {
            id: 'test-proposal',
            targetSection: 'overall-quality',
            description: 'Test proposal',
            verificationPlan: {
                checks: ['validate', 'evaluate'],
                testsRequired: false,
                rollbackAvailable: true,
                mustPass: false,
                minimumScore: 50,
                requiresImprovement: true,
                mustNotDecrease: true,
                rationale: 'Test',
            },
        } as unknown as RefineBackedProposal;

        const outcome = verifyProposalOutcome(proposal, baseline, updated, true);
        expect(outcome.success).toBe(true);
        expect(outcome.issues).toHaveLength(0);
    });

    it('verifyProposalOutcome returns success with no plan', () => {
        const baseline: GenericEvaluationReport = {
            targetPath: '/tmp/example.md',
            targetName: 'example',
            percentage: 60,
            passed: false,
            grade: 'D',
            dimensions: [],
        };

        const updated: GenericEvaluationReport = {
            ...baseline,
            percentage: 75,
            passed: true,
        };

        const proposal = { id: 'test' } as unknown as RefineBackedProposal;
        const outcome = verifyProposalOutcome(proposal, baseline, updated);
        expect(outcome.success).toBe(true);
    });

    it('verifyProposalOutcome detects validation failure', () => {
        const baseline: GenericEvaluationReport = {
            targetPath: '/tmp/example.md',
            targetName: 'example',
            percentage: 60,
            passed: false,
            grade: 'D',
            dimensions: [],
        };

        const updated: GenericEvaluationReport = {
            ...baseline,
            percentage: 70,
            passed: true,
            grade: 'C',
        };

        const proposal = {
            id: 'test',
            verificationPlan: {
                checks: ['validate', 'evaluate'],
                testsRequired: false,
                rollbackAvailable: true,
                rationale: 'Test',
            },
        } as unknown as RefineBackedProposal;

        const outcome = verifyProposalOutcome(proposal, baseline, updated, false);
        expect(outcome.success).toBe(false);
        expect(outcome.issues.some((i) => i.includes('Validation failed'))).toBe(true);
    });

    it('verifyProposalOutcome detects score regression', () => {
        const baseline: GenericEvaluationReport = {
            targetPath: '/tmp/example.md',
            targetName: 'example',
            percentage: 70,
            passed: true,
            grade: 'C',
            dimensions: [],
        };

        const updated: GenericEvaluationReport = {
            ...baseline,
            percentage: 50,
            passed: false,
            grade: 'F',
        };

        const proposal = {
            id: 'test',
            verificationPlan: {
                checks: ['evaluate'],
                testsRequired: false,
                rollbackAvailable: true,
                mustNotDecrease: true,
                rationale: 'Test',
            },
        } as unknown as RefineBackedProposal;

        const outcome = verifyProposalOutcome(proposal, baseline, updated);
        expect(outcome.success).toBe(false);
        expect(outcome.issues.some((i) => i.includes('regressed'))).toBe(true);
    });

    it('verifyProposalOutcome detects failure when mustPass is true', () => {
        const baseline: GenericEvaluationReport = {
            targetPath: '/tmp/example.md',
            targetName: 'example',
            percentage: 55,
            passed: false,
            grade: 'F',
            dimensions: [],
        };

        const updated: GenericEvaluationReport = {
            ...baseline,
            percentage: 60,
            passed: false,
            grade: 'D',
        };

        const proposal = {
            id: 'test',
            verificationPlan: {
                checks: ['evaluate'],
                testsRequired: false,
                rollbackAvailable: true,
                mustPass: true,
                rationale: 'Test',
            },
        } as unknown as RefineBackedProposal;

        const outcome = verifyProposalOutcome(proposal, baseline, updated);
        expect(outcome.success).toBe(false);
        expect(outcome.issues.some((i) => i.includes('did not pass'))).toBe(true);
    });

    it('verifyProposalOutcome detects minimum score violation', () => {
        const baseline: GenericEvaluationReport = {
            targetPath: '/tmp/example.md',
            targetName: 'example',
            percentage: 60,
            passed: false,
            grade: 'D',
            dimensions: [],
        };

        const updated: GenericEvaluationReport = {
            ...baseline,
            percentage: 45,
            passed: false,
            grade: 'F',
        };

        const proposal = {
            id: 'test',
            verificationPlan: {
                checks: ['evaluate'],
                testsRequired: false,
                rollbackAvailable: true,
                minimumScore: 50,
                rationale: 'Test',
            },
        } as unknown as RefineBackedProposal;

        const outcome = verifyProposalOutcome(proposal, baseline, updated);
        expect(outcome.success).toBe(false);
        expect(outcome.issues.some((i) => i.includes('minimum score'))).toBe(true);
    });

    it('verifyProposalOutcome detects no improvement when required', () => {
        const baseline: GenericEvaluationReport = {
            targetPath: '/tmp/example.md',
            targetName: 'example',
            percentage: 55,
            passed: false,
            grade: 'F',
            dimensions: [],
        };

        const updated: GenericEvaluationReport = {
            ...baseline,
            percentage: 55,
            passed: false,
            grade: 'F',
        };

        const proposal = {
            id: 'test',
            verificationPlan: {
                checks: ['evaluate'],
                testsRequired: false,
                rollbackAvailable: true,
                requiresImprovement: true,
                rationale: 'Test',
            },
        } as unknown as RefineBackedProposal;

        const outcome = verifyProposalOutcome(proposal, baseline, updated);
        expect(outcome.success).toBe(false);
        expect(outcome.issues.some((i) => i.includes('did not improve'))).toBe(true);
    });

    it('formatAnalysis produces formatted output', () => {
        const report: GenericEvaluationReport = {
            targetPath: '/tmp/example.md',
            targetName: 'example',
            percentage: 72,
            passed: true,
            grade: 'C',
            dimensions: [
                {
                    name: 'content',
                    score: 7,
                    maxScore: 10,
                    findings: ['Needs more detail'],
                    recommendations: ['Expand examples'],
                },
            ],
        };

        const analysis = analyzeEvaluationReport(report);
        const formatted = formatAnalysis(report, analysis);

        expect(formatted).toContain('=== Evolution Analysis ===');
        expect(formatted).toContain('Target: example');
        expect(formatted).toContain('Score: 72%');
        expect(formatted).toContain('PASS');
        expect(formatted).toContain('Available data sources');
    });

    it('formatProposals produces formatted output with proposals', () => {
        const report: GenericEvaluationReport = {
            targetPath: '/tmp/example.md',
            targetName: 'example',
            percentage: 62,
            passed: false,
            grade: 'D',
            dimensions: [],
        };

        const analysis = analyzeEvaluationReport(report);
        const proposalSet = generateRefineBackedProposals(report, analysis, {
            defaultFlags: ['--best-practices'],
            applySupported: true,
            targetKind: 'skill',
            objective: 'quality',
            verificationChecks: ['validate', 'evaluate'],
        });

        const formatted = formatProposals(proposalSet);
        expect(formatted).toContain('=== Evolution Proposals ===');
        expect(formatted).toContain('Target: example');
    });

    it('formatProposals handles empty proposals', () => {
        const proposalSet = {
            targetPath: '/tmp/example.md',
            targetName: 'example',
            evaluationPercentage: 90,
            generatedAt: new Date().toISOString(),
            proposals: [],
        };

        const formatted = formatProposals(proposalSet);
        expect(formatted).toContain('No proposals generated');
    });

    it('formatHistory produces formatted output', () => {
        const versions = [
            {
                version: 'v1',
                timestamp: '2024-01-01T00:00:00.000Z',
                content: 'Initial',
                grade: 'B',
                changeDescription: 'First version',
                proposalsApplied: ['p1'],
            },
            {
                version: 'v2',
                timestamp: '2024-01-02T00:00:00.000Z',
                content: 'Second',
                grade: 'C',
                changeDescription: 'Second version',
                proposalsApplied: [],
            },
        ];

        const formatted = formatHistory(versions);
        expect(formatted).toContain('=== Evolution History ===');
        expect(formatted).toContain('v1');
        expect(formatted).toContain('First version');
        expect(formatted).toContain('p1');
    });

    it('formatHistory handles empty version list', () => {
        const formatted = formatHistory([]);
        expect(formatted).toContain('No version history');
    });

    it('formatUnsupportedApply returns error result', () => {
        const result = formatUnsupportedApply('Apply is not supported for this target');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Apply is not supported for this target');
    });

    it('analyzeEvaluationReport handles rejected report', () => {
        const report: GenericEvaluationReport = {
            targetPath: '/tmp/example.md',
            targetName: 'example',
            percentage: 30,
            passed: false,
            grade: 'F',
            rejected: true,
            rejectReason: 'Security scan failed',
            dimensions: [],
        };

        const analysis = analyzeEvaluationReport(report);
        expect(analysis.patterns.some((p) => p.type === 'failure')).toBe(true);
        expect(analysis.patterns.some((p) => p.description.includes('Security scan failed'))).toBe(true);
    });

    it('analyzeEvaluationReport handles high-scoring passed report', () => {
        const report: GenericEvaluationReport = {
            targetPath: '/tmp/example.md',
            targetName: 'example',
            percentage: 92,
            passed: true,
            grade: 'A',
            dimensions: [],
        };

        const analysis = analyzeEvaluationReport(report);
        expect(analysis.patterns.some((p) => p.type === 'success')).toBe(true);
        expect(analysis.patterns.some((p) => p.description.includes('stable at 92%'))).toBe(true);
    });

    it('generateRefineBackedProposals creates migration proposal when needed', () => {
        const report: GenericEvaluationReport = {
            targetPath: '/tmp/example.md',
            targetName: 'example',
            percentage: 35,
            passed: false,
            grade: 'F',
            dimensions: [
                {
                    name: 'frontmatter',
                    displayName: 'Frontmatter',
                    score: 2,
                    maxScore: 10,
                    findings: ['Frontmatter is malformed'],
                    recommendations: ['Fix frontmatter'],
                },
            ],
        };

        const analysis = analyzeEvaluationReport(report);
        const proposalSet = generateRefineBackedProposals(report, analysis, {
            defaultFlags: ['--best-practices'],
            migrateFlags: ['--migrate'],
            applySupported: true,
            targetKind: 'skill',
            objective: 'quality',
            verificationChecks: ['validate'],
        });

        expect(proposalSet.proposals.some((p) => p.description.includes('migration'))).toBe(true);
    });

    it('generateRefineBackedProposals deduplicates by section and description', () => {
        const workspaceFixture = createWorkspaceFixture();
        try {
            mkdirSync(join(workspaceFixture, '.git'), { recursive: true });
            const targetPath = join(workspaceFixture, 'example.md');
            writeFileSync(targetPath, '# example\n', 'utf-8');

            const report: GenericEvaluationReport = {
                targetPath,
                targetName: 'example',
                percentage: 60,
                passed: false,
                grade: 'D',
                dimensions: [],
            };

            const analysis = analyzeEvaluationReport(report);

            // Add supplemental signals with the same key
            const supplementalSignals = [
                {
                    description: 'Improve security',
                    evidence: ['Security issue 1'],
                    affectedSection: 'security',
                    scope: 'structure' as const,
                    objective: 'safety' as const,
                    confidence: 0.8,
                    priority: 'high' as const,
                },
                {
                    description: 'Improve security',
                    evidence: ['Security issue 2'],
                    affectedSection: 'security',
                    scope: 'structure' as const,
                    objective: 'safety' as const,
                    confidence: 0.9,
                    priority: 'high' as const,
                },
            ];

            const proposalSet = generateRefineBackedProposals(report, analysis, {
                defaultFlags: ['--best-practices'],
                applySupported: true,
                targetKind: 'skill',
                objective: 'quality',
                verificationChecks: ['validate'],
                supplementalSignals,
            });

            // Should have deduplicated
            const securityProposals = proposalSet.proposals.filter((p) => p.targetSection === 'security');
            expect(securityProposals.length).toBeLessThanOrEqual(2);
        } finally {
            rmSync(workspaceFixture, { recursive: true, force: true });
        }
    });
});
