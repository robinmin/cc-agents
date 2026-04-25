import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from './fs';
import { basename, dirname, join, resolve } from 'node:path';

import type {
    EvolutionAnalysis,
    EvolutionApplyMode,
    EvolutionApplyResult,
    EvolutionApplyRisk,
    EvolutionChangeType,
    EvolutionDataSource,
    EvolutionEvidenceType,
    EvolutionImprovementObjective,
    EvolutionPattern,
    EvolutionProposal,
    EvolutionProposalScope,
    EvolutionRollbackResult,
    EvolutionTargetKind,
    EvolutionVerificationPlan,
    EvolutionVersionSnapshot,
} from './evolution-contract';

export interface GenericEvaluationDimension {
    name: string;
    displayName?: string;
    score: number;
    maxScore: number;
    percentage?: number;
    findings: string[];
    recommendations: string[];
}

export interface GenericEvaluationReport {
    targetPath: string;
    targetName: string;
    percentage: number;
    passed: boolean;
    grade?: string;
    rejected?: boolean;
    rejectReason?: string;
    dimensions: GenericEvaluationDimension[];
}

export interface RefineAction {
    type: 'run-refine';
    flags: string[];
    supportsApply: boolean;
}

export interface RefineBackedProposal extends EvolutionProposal {
    action: RefineAction;
    priority: 'high' | 'medium' | 'low';
}

export interface StoredProposalSet {
    targetPath: string;
    targetName: string;
    evaluationPercentage: number;
    generatedAt: string;
    proposals: RefineBackedProposal[];
}

export interface SnapshotEntry {
    path: string;
    content: string;
}

export interface MultiFileVersionSnapshot extends EvolutionVersionSnapshot<string> {
    rootPath: string;
    entries: SnapshotEntry[];
}

export interface ProposalGenerationOptions {
    defaultFlags: string[];
    migrateFlags?: string[];
    applySupported: boolean;
    targetKind?: EvolutionTargetKind;
    objective?: EvolutionImprovementObjective;
    verificationChecks?: string[];
    supplementalSignals?: SupplementalProposalSignal[];
}

export interface EvolutionStoragePaths {
    rootDir: string;
    proposalsPath: string;
    historyPath: string;
    backupsDir: string;
}

export interface ScriptRunResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}

export interface VerificationOutcome {
    success: boolean;
    issues: string[];
}

export interface SupplementalProposalSignal {
    description: string;
    evidence: string[];
    affectedSection: string;
    source?: EvolutionDataSource;
    evidenceType?: EvolutionEvidenceType;
    scope?: EvolutionProposalScope;
    objective?: EvolutionImprovementObjective;
    confidence?: number;
    affectsCritical?: boolean;
    applyRisk?: EvolutionApplyRisk;
    priority?: RefineBackedProposal['priority'];
    flags?: string[];
    changeType?: EvolutionChangeType;
}

function findWorkspaceRoot(startDir: string): string {
    let current = resolve(startDir);

    while (true) {
        if (existsSync(join(current, '.git'))) {
            return current;
        }

        const parent = dirname(current);
        if (parent === current) {
            return startDir;
        }
        current = parent;
    }
}

function getTargetKey(targetPath: string): string {
    return basename(targetPath).replace(/\.[^.]+$/, '');
}

function normalizeNamespace(namespace: string): string {
    return namespace.replace(/^\.*/, '').replace(/[\\/]+/g, '-');
}

function getDimensionPercentage(dimension: GenericEvaluationDimension): number {
    if (typeof dimension.percentage === 'number') {
        return dimension.percentage;
    }

    if (dimension.maxScore <= 0) {
        return 0;
    }

    return Math.round((dimension.score / dimension.maxScore) * 100);
}

function pickSource(targetPath: string): EvolutionDataSource {
    const availability = detectDataSourceAvailability(targetPath);
    if (availability['ci-results']) return 'ci-results';
    if (availability['git-history']) return 'git-history';
    if (availability['user-feedback']) return 'user-feedback';
    if (availability['memory-md']) return 'memory-md';
    return 'interaction-logs';
}

function dedupeEvidence(evidence: string[], limit = 4): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const entry of evidence.map((item) => item.trim()).filter(Boolean)) {
        if (seen.has(entry)) {
            continue;
        }

        seen.add(entry);
        result.push(entry);

        if (result.length >= limit) {
            break;
        }
    }

    return result;
}

function inferSignalSection(message: string): string {
    const normalized = message.toLowerCase();

    if (normalized.includes('platform') || normalized.includes('compatib')) {
        return 'platform-compatibility';
    }

    if (normalized.includes('test') || normalized.includes('coverage')) {
        return 'testing';
    }

    if (normalized.includes('workflow') || normalized.includes('section') || normalized.includes('example')) {
        return 'workflow-guidance';
    }

    if (
        normalized.includes('frontmatter') ||
        normalized.includes('naming') ||
        normalized.includes('name') ||
        normalized.includes('description') ||
        normalized.includes('metadata')
    ) {
        return 'metadata-quality';
    }

    if (normalized.includes('security') || normalized.includes('secret') || normalized.includes('danger')) {
        return 'security';
    }

    return 'overall-quality';
}

function inferSignalScope(message: string): EvolutionProposalScope {
    return resolveScopeForDimension(inferSignalSection(message));
}

function inferSignalObjective(message: string): EvolutionImprovementObjective {
    return resolveObjectiveForLabel(inferSignalSection(message));
}

function inferSignalEvidenceType(message: string): EvolutionEvidenceType {
    const normalized = message.toLowerCase();

    if (normalized.includes('platform') || normalized.includes('compatib')) {
        return 'platform-gap';
    }

    if (normalized.includes('test') || normalized.includes('coverage')) {
        return 'test-failure';
    }

    return 'history-pattern';
}

function inferSignalCriticality(message: string): { affectsCritical: boolean; applyRisk?: EvolutionApplyRisk } {
    const normalized = message.toLowerCase();
    const critical = normalized.includes('security') || normalized.includes('secret') || normalized.includes('danger');
    return critical ? { affectsCritical: true, applyRisk: 'high' } : { affectsCritical: false };
}

function sampleMatchingLines(text: string, patterns: RegExp[], limit = 3): string[] {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    return dedupeEvidence(
        lines.filter((line) => patterns.some((pattern) => pattern.test(line))),
        limit,
    );
}

function getGradeRank(grade?: string): number | null {
    if (!grade) {
        return null;
    }

    const normalized = grade.trim().toUpperCase();
    if (normalized.startsWith('A')) return 5;
    if (normalized.startsWith('B')) return 4;
    if (normalized.startsWith('C')) return 3;
    if (normalized.startsWith('D')) return 2;
    if (normalized.startsWith('E')) return 1;
    if (normalized.startsWith('F')) return 0;
    return null;
}

function normalizeProposalText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function getProposalKeywordSet(proposal: RefineBackedProposal): Set<string> {
    const stopWords = new Set([
        'address',
        'after',
        'agent',
        'all',
        'and',
        'area',
        'areas',
        'best',
        'break',
        'command',
        'content',
        'current',
        'cycle',
        'demo',
        'evaluation',
        'evolution',
        'example',
        'fix',
        'from',
        'guidance',
        'history',
        'historical',
        'improve',
        'issues',
        'keep',
        'metadata',
        'overall',
        'periodic',
        'quality',
        'recover',
        'recurring',
        'refine',
        'regression',
        'resolve',
        'review',
        'run',
        'section',
        'skill',
        'target',
        'the',
        'under',
    ]);
    const tokens = normalizeProposalText(
        [proposal.targetSection, proposal.description, proposal.rationale, ...(proposal.evidence ?? [])].join(' '),
    )
        .split(/\s+/)
        .filter((token) => token.length >= 4 && !stopWords.has(token));

    return new Set(tokens);
}

function getProposalActionKey(proposal: RefineBackedProposal): string {
    return proposal.action.flags.join(' ');
}

function getPriorityWeight(priority: RefineBackedProposal['priority']): number {
    switch (priority) {
        case 'high':
            return 3;
        case 'medium':
            return 2;
        case 'low':
            return 1;
    }
}

function getRiskWeight(risk?: EvolutionApplyRisk): number {
    switch (risk) {
        case 'high':
            return 3;
        case 'medium':
            return 2;
        case 'low':
            return 1;
        default:
            return 0;
    }
}

function getApplyModeWeight(mode?: EvolutionApplyMode): number {
    switch (mode) {
        case 'auto':
            return 3;
        case 'confirm-required':
            return 2;
        case 'manual-only':
            return 1;
        default:
            return 0;
    }
}

function compareConfidence(a?: number, b?: number): number {
    return (b ?? 0) - (a ?? 0);
}

function compareProposalPriority(a: RefineBackedProposal, b: RefineBackedProposal): number {
    const byPriority = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    if (byPriority !== 0) {
        return byPriority;
    }

    if (a.affectsCritical !== b.affectsCritical) {
        return a.affectsCritical ? -1 : 1;
    }

    const byConfidence = compareConfidence(a.confidence, b.confidence);
    if (byConfidence !== 0) {
        return byConfidence;
    }

    const byRisk = getRiskWeight(a.applyRisk) - getRiskWeight(b.applyRisk);
    if (byRisk !== 0) {
        return byRisk;
    }

    const byApplyMode = getApplyModeWeight(b.applyMode) - getApplyModeWeight(a.applyMode);
    if (byApplyMode !== 0) {
        return byApplyMode;
    }

    return a.description.localeCompare(b.description);
}

function getProposalSimilarity(a: RefineBackedProposal, b: RefineBackedProposal): number {
    if (normalizeProposalText(a.targetSection) !== normalizeProposalText(b.targetSection)) {
        return 0;
    }

    if (a.changeType !== b.changeType || getProposalActionKey(a) !== getProposalActionKey(b)) {
        return 0;
    }

    if ((a.scope ?? '') !== (b.scope ?? '') || (a.objective ?? '') !== (b.objective ?? '')) {
        return 0;
    }

    if ((a.evidenceType ?? '') !== (b.evidenceType ?? '') && (a.scope ?? '') !== 'workflows') {
        return 0;
    }

    const aKeywords = getProposalKeywordSet(a);
    const bKeywords = getProposalKeywordSet(b);
    if (aKeywords.size === 0 || bKeywords.size === 0) {
        return normalizeProposalText(a.description) === normalizeProposalText(b.description) ? 1 : 0;
    }

    const intersection = [...aKeywords].filter((token) => bKeywords.has(token)).length;
    const union = new Set([...aKeywords, ...bKeywords]).size;
    return union === 0 ? 0 : intersection / union;
}

function mergeVerificationPlans(
    primary?: EvolutionVerificationPlan,
    secondary?: EvolutionVerificationPlan,
): EvolutionVerificationPlan | undefined {
    if (!primary && !secondary) {
        return undefined;
    }

    if (!primary) {
        return secondary;
    }

    if (!secondary) {
        return primary;
    }

    const minimumScore = Math.max(primary.minimumScore ?? 0, secondary.minimumScore ?? 0);
    const rationale = dedupeEvidence(
        [primary.rationale, secondary.rationale].filter((entry): entry is string => Boolean(entry)),
        2,
    ).join(' ');

    return {
        checks: [...new Set([...primary.checks, ...secondary.checks])],
        testsRequired: primary.testsRequired || secondary.testsRequired,
        rollbackAvailable: primary.rollbackAvailable && secondary.rollbackAvailable,
        ...(primary.mustPass || secondary.mustPass ? { mustPass: true } : {}),
        ...(minimumScore > 0 ? { minimumScore } : {}),
        ...(primary.requiresImprovement || secondary.requiresImprovement ? { requiresImprovement: true } : {}),
        ...(primary.mustNotDecrease || secondary.mustNotDecrease ? { mustNotDecrease: true } : {}),
        ...(rationale ? { rationale } : {}),
    };
}

function getMoreConservativeApplyMode(a?: EvolutionApplyMode, b?: EvolutionApplyMode): EvolutionApplyMode | undefined {
    const modes = [a, b].filter((entry): entry is EvolutionApplyMode => Boolean(entry));
    if (modes.length === 0) {
        return undefined;
    }

    if (modes.includes('manual-only')) {
        return 'manual-only';
    }

    if (modes.includes('confirm-required')) {
        return 'confirm-required';
    }

    return 'auto';
}

function getHigherRisk(a?: EvolutionApplyRisk, b?: EvolutionApplyRisk): EvolutionApplyRisk | undefined {
    return getRiskWeight(a) >= getRiskWeight(b) ? a : b;
}

function mergeEquivalentProposals(proposals: RefineBackedProposal[]): RefineBackedProposal[] {
    const consolidated: RefineBackedProposal[] = [];

    for (const proposal of proposals) {
        const existingIndex = consolidated.findIndex((candidate) => getProposalSimilarity(candidate, proposal) >= 0.6);
        if (existingIndex === -1) {
            consolidated.push(proposal);
            continue;
        }

        const existing = consolidated[existingIndex];
        const primary = compareProposalPriority(existing, proposal) <= 0 ? existing : proposal;
        const secondary = primary === existing ? proposal : existing;
        const mergedApplyRisk = getHigherRisk(primary.applyRisk, secondary.applyRisk);
        const mergedApplyMode = getMoreConservativeApplyMode(primary.applyMode, secondary.applyMode);
        const mergedVerificationPlan = mergeVerificationPlans(primary.verificationPlan, secondary.verificationPlan);

        consolidated[existingIndex] = {
            ...primary,
            confidence: Math.max(primary.confidence, secondary.confidence),
            affectsCritical: primary.affectsCritical || secondary.affectsCritical,
            ...(mergedApplyRisk ? { applyRisk: mergedApplyRisk } : {}),
            ...(mergedApplyMode ? { applyMode: mergedApplyMode } : {}),
            ...(mergedVerificationPlan ? { verificationPlan: mergedVerificationPlan } : {}),
            evidence: dedupeEvidence([...(primary.evidence ?? []), ...(secondary.evidence ?? [])], 6),
            rationale: dedupeEvidence([primary.rationale, secondary.rationale], 2).join(' '),
            priority:
                getPriorityWeight(primary.priority) >= getPriorityWeight(secondary.priority)
                    ? primary.priority
                    : secondary.priority,
        };
    }

    return consolidated.sort(compareProposalPriority);
}

function hasSufficientEvidence(evidence: string[]): boolean {
    return dedupeEvidence(evidence, 2).length > 0;
}

export function createSupplementalSignalsFromMessages(
    messages: string[],
    severity: 'error' | 'warning',
): SupplementalProposalSignal[] {
    return dedupeEvidence(messages, 5).map((message) => {
        const criticality = inferSignalCriticality(message);
        return {
            description: `${severity === 'error' ? 'Address' : 'Improve'} ${inferSignalSection(message)}`,
            evidence: [message],
            affectedSection: inferSignalSection(message),
            evidenceType: inferSignalEvidenceType(message),
            scope: inferSignalScope(message),
            objective: inferSignalObjective(message),
            confidence: severity === 'error' ? 0.8 : 0.65,
            priority: severity === 'error' ? 'high' : 'medium',
            ...criticality,
        };
    });
}

export function generateWorkspaceSignals(targetPath: string, targetName?: string): SupplementalProposalSignal[] {
    const resolvedTarget = resolve(targetPath);
    const startDir =
        existsSync(resolvedTarget) && !resolvedTarget.endsWith('.md') ? resolvedTarget : dirname(resolvedTarget);
    const workspaceRoot = findWorkspaceRoot(startDir);
    const targetPattern = targetName ? new RegExp(targetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
    const issuePatterns = [/\b(regression|missing|confusing|unclear|failed|broken|follow up|todo|incomplete)\b/i];
    const signals: SupplementalProposalSignal[] = [];

    const feedbackPath = ['FEEDBACK.md', 'feedback.md']
        .map((candidate) => join(workspaceRoot, candidate))
        .find((candidate) => existsSync(candidate));
    if (feedbackPath) {
        const feedbackText = readFileSync(feedbackPath, 'utf-8');
        const feedbackLines = sampleMatchingLines(feedbackText, issuePatterns, 3).filter(
            (line) => !targetPattern || targetPattern.test(line) || signals.length === 0,
        );
        if (feedbackLines.length > 0) {
            const section = inferSignalSection(feedbackLines[0] ?? 'feedback');
            signals.push({
                description: 'Address user feedback themes',
                evidence: feedbackLines,
                affectedSection: section,
                source: 'user-feedback',
                evidenceType: 'user-feedback',
                scope: resolveScopeForDimension(section),
                objective: resolveObjectiveForLabel(section),
                confidence: 0.7,
                priority: 'medium',
                ...inferSignalCriticality(feedbackLines.join(' ')),
            });
        }
    }

    const memoryPath = join(workspaceRoot, 'MEMORY.md');
    if (existsSync(memoryPath)) {
        const memoryText = readFileSync(memoryPath, 'utf-8');
        const memoryLines = sampleMatchingLines(memoryText, issuePatterns, 3).filter(
            (line) => !targetPattern || targetPattern.test(line) || signals.length === 0,
        );
        if (memoryLines.length > 0) {
            const section = inferSignalSection(memoryLines[0] ?? 'memory');
            signals.push({
                description: 'Resolve recurring memory-noted issues',
                evidence: memoryLines,
                affectedSection: section,
                source: 'memory-md',
                evidenceType: 'history-pattern',
                scope: resolveScopeForDimension(section),
                objective: resolveObjectiveForLabel(section),
                confidence: 0.65,
                priority: 'medium',
                ...inferSignalCriticality(memoryLines.join(' ')),
            });
        }
    }

    return signals;
}

export function generateHistorySignals(
    namespace: string,
    targetPath: string,
    currentGrade?: string,
): SupplementalProposalSignal[] {
    const versions = loadVersionHistory(namespace, targetPath);
    if (versions.length === 0) {
        return [];
    }

    const signals: SupplementalProposalSignal[] = [];
    const currentRank = getGradeRank(currentGrade);
    const gradedVersions = versions
        .map((version) => ({ version, rank: getGradeRank(version.grade) }))
        .filter((entry): entry is { version: EvolutionVersionSnapshot<string>; rank: number } => entry.rank !== null);

    if (gradedVersions.length > 0 && currentRank !== null) {
        const bestHistorical = gradedVersions.reduce(
            (best, entry) => (entry.rank > best.rank ? entry : best),
            gradedVersions[0],
        );

        if (bestHistorical.rank > currentRank) {
            signals.push({
                description: 'Recover from historical quality regression',
                evidence: [
                    `Current grade ${currentGrade} is below historical best ${bestHistorical.version.grade}.`,
                    ...gradedVersions
                        .slice(-3)
                        .map(
                            (entry) =>
                                `${entry.version.version}: ${entry.version.grade} (${entry.version.changeDescription})`,
                        ),
                ],
                affectedSection: 'overall-quality',
                evidenceType: 'history-pattern',
                scope: 'structure',
                objective: 'quality',
                confidence: 0.75,
                priority: 'high',
            });
        }
    }

    if (gradedVersions.length >= 3) {
        const recent = gradedVersions.slice(-3);
        const hasImprovement = recent.some((entry, index) => {
            if (index === 0) {
                return false;
            }

            const previous = recent[index - 1];
            return previous ? entry.rank > previous.rank : false;
        });
        const recentAverage = recent.reduce((sum, entry) => sum + entry.rank, 0) / recent.length;

        if (!hasImprovement && recentAverage <= 3) {
            signals.push({
                description: 'Break repeated non-improving evolution cycle',
                evidence: recent.map(
                    (entry) =>
                        `${entry.version.version}: ${entry.version.grade} with ${entry.version.proposalsApplied.length} proposal(s) applied`,
                ),
                affectedSection: 'workflow-guidance',
                evidenceType: 'history-pattern',
                scope: 'workflows',
                objective: 'evolution-readiness',
                confidence: 0.7,
                priority: 'medium',
            });
        }
    }

    return signals;
}

function resolveScopeForDimension(label: string): EvolutionProposalScope {
    const normalized = label.toLowerCase();

    if (
        normalized.includes('frontmatter') ||
        normalized.includes('naming') ||
        normalized.includes('metadata') ||
        normalized.includes('description')
    ) {
        return 'metadata';
    }

    if (normalized.includes('adapter') || normalized.includes('platform') || normalized.includes('compatibility')) {
        return 'adapters';
    }

    if (normalized.includes('workflow')) {
        return 'workflows';
    }

    if (normalized.includes('test')) {
        return 'tests';
    }

    if (normalized.includes('structure')) {
        return 'structure';
    }

    return 'content';
}

function resolveObjectiveForLabel(
    label: string,
    defaultObjective: EvolutionImprovementObjective = 'quality',
): EvolutionImprovementObjective {
    const normalized = label.toLowerCase();

    if (normalized.includes('security')) {
        return 'safety';
    }

    if (normalized.includes('adapter') || normalized.includes('platform') || normalized.includes('compatibility')) {
        return 'portability';
    }

    if (
        normalized.includes('frontmatter') ||
        normalized.includes('naming') ||
        normalized.includes('metadata') ||
        normalized.includes('description')
    ) {
        return 'maintainability';
    }

    if (normalized.includes('workflow')) {
        return 'evolution-readiness';
    }

    return defaultObjective;
}

function needsMigration(report: GenericEvaluationReport): boolean {
    if (report.rejected) {
        return true;
    }

    return report.dimensions.some((dimension) => {
        const label = `${dimension.name} ${dimension.displayName ?? ''}`.toLowerCase();
        const pct = getDimensionPercentage(dimension);
        return (label.includes('frontmatter') || label.includes('naming')) && pct < 40;
    });
}

function hasCriticalSignals(report: GenericEvaluationReport): boolean {
    if (report.rejected) {
        return true;
    }

    return report.dimensions.some((dimension) => {
        const label = `${dimension.name} ${dimension.displayName ?? ''}`.toLowerCase();
        const evidence = [...dimension.findings, ...dimension.recommendations].join(' ').toLowerCase();
        return label.includes('security') || evidence.includes('security') || evidence.includes('danger');
    });
}

function createProposalId(): string {
    return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function getEvolutionStoragePaths(namespace: string, targetPath: string): EvolutionStoragePaths {
    const resolvedTarget = resolve(targetPath);
    const startDir =
        existsSync(resolvedTarget) && !resolvedTarget.endsWith('.md') ? resolvedTarget : dirname(resolvedTarget);
    const workspaceRoot = findWorkspaceRoot(startDir);
    const storageRoot = join(workspaceRoot, '.rd3-evolution', normalizeNamespace(namespace));
    const targetKey = getTargetKey(resolvedTarget);

    return {
        rootDir: storageRoot,
        proposalsPath: join(storageRoot, 'proposals', `${targetKey}.proposals.json`),
        historyPath: join(storageRoot, 'versions', `${targetKey}.history.json`),
        backupsDir: join(storageRoot, 'backups'),
    };
}

function resolveApplyRisk(
    report: GenericEvaluationReport,
    affectedCritical: boolean,
    percentage?: number,
): EvolutionApplyRisk {
    if (report.rejected || affectedCritical) {
        return 'high';
    }

    if ((percentage ?? report.percentage) < 70) {
        return 'medium';
    }

    return 'low';
}

function resolveApplyMode(_risk: EvolutionApplyRisk, applySupported: boolean): EvolutionApplyMode {
    if (!applySupported) {
        return 'manual-only';
    }
    return 'confirm-required';
}

function buildVerificationPlan(
    report: GenericEvaluationReport,
    options: ProposalGenerationOptions,
    affectedCritical: boolean,
    applyRisk: EvolutionApplyRisk,
    scope: EvolutionProposalScope,
): EvolutionVerificationPlan {
    const checks = new Set(options.verificationChecks ?? ['validate', 'evaluate']);
    const testsRequired =
        affectedCritical || applyRisk === 'high' || scope === 'tests' || scope === 'adapters' || scope === 'workflows';

    if (testsRequired) {
        checks.add('test');
    }

    return {
        checks: [...checks],
        testsRequired,
        rollbackAvailable: options.applySupported,
        mustPass: affectedCritical || applyRisk === 'high',
        minimumScore: Math.max(0, report.percentage),
        requiresImprovement: !report.passed && scope !== 'metadata',
        mustNotDecrease: true,
        rationale:
            testsRequired || affectedCritical
                ? 'Critical or behavior-shaping proposals must verify validation, evaluation, and tests.'
                : 'Post-apply verification must preserve or improve the current evaluation result.',
    };
}

function resolveApplyModeForProposal(
    risk: EvolutionApplyRisk,
    applySupported: boolean,
    scope: EvolutionProposalScope,
    evidence: string[],
    verificationPlan: EvolutionVerificationPlan,
): EvolutionApplyMode {
    if (!applySupported || !hasSufficientEvidence(evidence)) {
        return 'manual-only';
    }

    if (scope === 'adapters' || scope === 'workflows') {
        return 'manual-only';
    }

    if (
        risk === 'low' &&
        scope === 'metadata' &&
        !verificationPlan.testsRequired &&
        verificationPlan.checks.includes('validate') &&
        verificationPlan.checks.includes('evaluate')
    ) {
        return 'auto';
    }

    return resolveApplyMode(risk, applySupported);
}

function collectProposalEvidence(
    report: GenericEvaluationReport,
    analysis: EvolutionAnalysis<EvolutionDataSource, EvolutionPattern<EvolutionDataSource>>,
    label: string,
    fallback: string[],
): string[] {
    const normalized = label.toLowerCase();
    const patternEvidence = analysis.patterns.flatMap((pattern) => {
        const affected = pattern.affectedSection?.toLowerCase() ?? '';
        if (
            affected === normalized ||
            affected.includes(normalized) ||
            normalized.includes(affected) ||
            (normalized === 'overall-quality' && pattern.type !== 'success')
        ) {
            return pattern.evidence;
        }

        return [];
    });

    return dedupeEvidence([
        ...fallback,
        ...patternEvidence,
        `${report.targetName} is currently at ${report.percentage}% overall.`,
    ]);
}

function buildProposalMetadata(
    report: GenericEvaluationReport,
    options: ProposalGenerationOptions,
    affectedCritical: boolean,
    applyRisk: EvolutionApplyRisk,
    scope: EvolutionProposalScope,
    evidenceType: EvolutionEvidenceType,
    evidence: string[],
): Omit<
    RefineBackedProposal,
    | 'id'
    | 'targetSection'
    | 'changeType'
    | 'description'
    | 'rationale'
    | 'source'
    | 'confidence'
    | 'affectsCritical'
    | 'action'
    | 'priority'
> {
    const verificationPlan = buildVerificationPlan(report, options, affectedCritical, applyRisk, scope);
    return {
        ...(options.targetKind ? { targetKind: options.targetKind } : {}),
        objective: options.objective ?? 'quality',
        scope,
        evidenceType,
        applyRisk,
        applyMode: resolveApplyModeForProposal(applyRisk, options.applySupported, scope, evidence, verificationPlan),
        verificationPlan,
        evidence,
    };
}

export function detectDataSourceAvailability(targetPath: string): Record<EvolutionDataSource, boolean> {
    const resolvedTarget = resolve(targetPath);
    const startDir = !resolvedTarget.endsWith('.md') ? resolvedTarget : dirname(resolvedTarget);
    const workspaceRoot = findWorkspaceRoot(startDir);

    return {
        'git-history': existsSync(join(workspaceRoot, '.git')),
        'ci-results': existsSync(join(workspaceRoot, '.github', 'workflows')),
        'user-feedback':
            existsSync(join(workspaceRoot, 'FEEDBACK.md')) || existsSync(join(workspaceRoot, 'feedback.md')),
        'memory-md': existsSync(join(workspaceRoot, 'MEMORY.md')),
        'interaction-logs': existsSync(join(workspaceRoot, '.logs')) || existsSync(join(workspaceRoot, 'logs')),
    };
}

export function analyzeEvaluationReport(
    report: GenericEvaluationReport,
): EvolutionAnalysis<EvolutionDataSource, EvolutionPattern<EvolutionDataSource>> {
    const dataSourceAvailability = detectDataSourceAvailability(report.targetPath);
    const patterns: EvolutionPattern<EvolutionDataSource>[] = [];
    const weakDimensions = report.dimensions
        .map((dimension) => ({ dimension, percentage: getDimensionPercentage(dimension) }))
        .filter((entry) => entry.percentage < 70);

    if (report.rejected) {
        patterns.push({
            type: 'failure',
            source: pickSource(report.targetPath),
            description: report.rejectReason || 'Evaluation rejected this target',
            evidence: [report.rejectReason || 'Rejected during evaluation'],
            confidence: 0.95,
            affectedSection: 'security',
        });
    }

    for (const entry of weakDimensions.slice(0, 5)) {
        const label = entry.dimension.displayName || entry.dimension.name;
        patterns.push({
            type: 'gap',
            source: pickSource(report.targetPath),
            description: `${label} is under threshold at ${entry.percentage}%`,
            evidence: [...entry.dimension.findings, ...entry.dimension.recommendations].slice(0, 4),
            confidence: entry.percentage < 40 ? 0.9 : 0.75,
            affectedSection: label,
        });
    }

    if (report.passed && report.percentage >= 90) {
        patterns.push({
            type: 'success',
            source: pickSource(report.targetPath),
            description: `${report.targetName} is currently stable at ${report.percentage}%`,
            evidence: ['Evaluation passed with an A-range score'],
            confidence: 0.7,
            affectedSection: 'overall-quality',
        });
    }

    const summary =
        `Analysis complete for ${report.targetName}: ${patterns.length} pattern(s), ` +
        `${weakDimensions.length} weak dimension(s), overall ${report.percentage}%.`;

    return { patterns, dataSourceAvailability, summary };
}

export function generateRefineBackedProposals(
    report: GenericEvaluationReport,
    analysis: EvolutionAnalysis<EvolutionDataSource, EvolutionPattern<EvolutionDataSource>>,
    options: ProposalGenerationOptions,
): StoredProposalSet {
    const proposals: RefineBackedProposal[] = [];
    const seenProposalKeys = new Set<string>();
    const weakDimensions = report.dimensions
        .map((dimension) => ({ dimension, percentage: getDimensionPercentage(dimension) }))
        .filter((entry) => entry.percentage < 70)
        .sort((a, b) => a.percentage - b.percentage);

    const pushProposal = (proposal: RefineBackedProposal): void => {
        const key = `${proposal.targetSection}|${proposal.description}`;
        if (seenProposalKeys.has(key)) {
            return;
        }

        seenProposalKeys.add(key);
        proposals.push(proposal);
    };

    if (report.rejected || !report.passed) {
        const affectsCritical = hasCriticalSignals(report);
        const applyRisk = resolveApplyRisk(report, affectsCritical);
        const evidence = collectProposalEvidence(report, analysis, 'overall-quality', [
            report.rejectReason || `Current evaluation is ${report.percentage}% and below the expected bar.`,
        ]);
        pushProposal({
            id: createProposalId(),
            targetSection: 'overall-quality',
            changeType: 'modify',
            description: `Run refine to address ${weakDimensions.length || 1} weak area(s)`,
            rationale: report.rejectReason || `Current evaluation is ${report.percentage}%, below the expected bar.`,
            source: pickSource(report.targetPath),
            confidence: report.rejected ? 0.95 : 0.8,
            affectsCritical,
            ...buildProposalMetadata(report, options, affectsCritical, applyRisk, 'structure', 'evaluation', evidence),
            action: {
                type: 'run-refine',
                flags: options.defaultFlags,
                supportsApply: options.applySupported,
            },
            priority: report.rejected ? 'high' : 'medium',
        });
    }

    for (const entry of weakDimensions.slice(0, 3)) {
        const label = entry.dimension.displayName || entry.dimension.name;
        const affectsCritical = hasCriticalSignals(report) && label.toLowerCase().includes('security');
        const applyRisk = resolveApplyRisk(report, affectsCritical, entry.percentage);
        const scope = resolveScopeForDimension(label);
        const evidence = collectProposalEvidence(report, analysis, label, [
            ...entry.dimension.findings,
            ...entry.dimension.recommendations,
        ]);
        pushProposal({
            id: createProposalId(),
            targetSection: label,
            changeType: 'modify',
            description: `Improve ${label}`,
            rationale:
                [...entry.dimension.recommendations, ...entry.dimension.findings].slice(0, 2).join(' ') ||
                `${label} scored ${entry.percentage}% in evaluation.`,
            source: pickSource(report.targetPath),
            confidence: entry.percentage < 40 ? 0.9 : 0.7,
            affectsCritical,
            ...buildProposalMetadata(report, options, affectsCritical, applyRisk, scope, 'evaluation', evidence),
            objective: resolveObjectiveForLabel(label, options.objective ?? 'quality'),
            action: {
                type: 'run-refine',
                flags: options.defaultFlags,
                supportsApply: options.applySupported,
            },
            priority: entry.percentage < 40 ? 'high' : 'medium',
        });
    }

    if (options.migrateFlags && needsMigration(report)) {
        const applyRisk = resolveApplyRisk(report, false, 45);
        const evidence = collectProposalEvidence(report, analysis, 'migration', [
            'The current evaluation shows schema or naming issues that usually benefit from migration mode.',
        ]);
        pushProposal({
            id: createProposalId(),
            targetSection: 'migration',
            changeType: 'modify',
            description: 'Run migration-oriented refine flow',
            rationale: 'The evaluation indicates schema or naming issues that usually benefit from migration mode.',
            source: pickSource(report.targetPath),
            confidence: 0.85,
            affectsCritical: false,
            ...buildProposalMetadata(report, options, false, applyRisk, 'metadata', 'history-pattern', evidence),
            objective: options.objective ?? 'maintainability',
            action: {
                type: 'run-refine',
                flags: options.migrateFlags,
                supportsApply: options.applySupported,
            },
            priority: 'high',
        });
    }

    for (const signal of options.supplementalSignals ?? []) {
        const section = signal.affectedSection || 'overall-quality';
        const scope = signal.scope ?? resolveScopeForDimension(section);
        const affectsCritical = signal.affectsCritical ?? false;
        const evidence = dedupeEvidence(signal.evidence, 4);
        const applyRisk =
            signal.applyRisk ?? resolveApplyRisk(report, affectsCritical, signal.priority === 'high' ? 50 : undefined);

        pushProposal({
            id: createProposalId(),
            targetSection: section,
            changeType: signal.changeType ?? 'modify',
            description: signal.description,
            rationale: evidence.join(' ') || signal.description,
            source: signal.source ?? pickSource(report.targetPath),
            confidence: signal.confidence ?? 0.65,
            affectsCritical,
            ...buildProposalMetadata(
                report,
                options,
                affectsCritical,
                applyRisk,
                scope,
                signal.evidenceType ?? 'history-pattern',
                evidence,
            ),
            objective: signal.objective ?? resolveObjectiveForLabel(section, options.objective ?? 'quality'),
            action: {
                type: 'run-refine',
                flags:
                    signal.flags ||
                    (scope === 'metadata' && options.migrateFlags ? options.migrateFlags : options.defaultFlags),
                supportsApply: options.applySupported,
            },
            priority: signal.priority ?? 'medium',
        });
    }

    if (analysis.patterns.length === 0) {
        const applyRisk = resolveApplyRisk(report, false, 95);
        const evidence = collectProposalEvidence(report, analysis, 'maintenance', [
            'No immediate weaknesses were found, so this is a recommendation-only periodic review proposal.',
        ]);
        pushProposal({
            id: createProposalId(),
            targetSection: 'maintenance',
            changeType: 'modify',
            description: 'Keep the target under periodic evaluation',
            rationale:
                'No immediate weaknesses were found, but the evolve surface should still record a periodic review proposal.',
            source: pickSource(report.targetPath),
            confidence: 0.5,
            affectsCritical: false,
            ...buildProposalMetadata(report, options, false, applyRisk, 'workflows', 'history-pattern', evidence),
            objective: options.objective ?? 'evolution-readiness',
            action: {
                type: 'run-refine',
                flags: options.defaultFlags,
                supportsApply: options.applySupported,
            },
            priority: 'low',
        });
    }

    return {
        targetPath: report.targetPath,
        targetName: report.targetName,
        evaluationPercentage: report.percentage,
        generatedAt: new Date().toISOString(),
        proposals: mergeEquivalentProposals(proposals),
    };
}

export function saveProposalSet(namespace: string, targetPath: string, proposalSet: StoredProposalSet): string {
    const storage = getEvolutionStoragePaths(namespace, targetPath);
    mkdirSync(dirname(storage.proposalsPath), { recursive: true });
    writeFileSync(storage.proposalsPath, JSON.stringify(proposalSet, null, 2), 'utf-8');
    return storage.proposalsPath;
}

export function loadProposalSet(namespace: string, targetPath: string): StoredProposalSet | null {
    const storage = getEvolutionStoragePaths(namespace, targetPath);

    if (!existsSync(storage.proposalsPath)) {
        return null;
    }

    return JSON.parse(readFileSync(storage.proposalsPath, 'utf-8')) as StoredProposalSet;
}

export function loadVersionHistory<T extends EvolutionVersionSnapshot<string> = EvolutionVersionSnapshot<string>>(
    namespace: string,
    targetPath: string,
): T[] {
    const storage = getEvolutionStoragePaths(namespace, targetPath);

    if (!existsSync(storage.historyPath)) {
        return [];
    }

    try {
        return JSON.parse(readFileSync(storage.historyPath, 'utf-8')) as T[];
    } catch {
        return [];
    }
}

export function saveVersionSnapshot<T extends EvolutionVersionSnapshot<string>>(
    namespace: string,
    targetPath: string,
    snapshot: T,
): string {
    const storage = getEvolutionStoragePaths(namespace, targetPath);
    const history = loadVersionHistory<T>(namespace, targetPath);

    mkdirSync(dirname(storage.historyPath), { recursive: true });
    history.push(snapshot);
    writeFileSync(storage.historyPath, JSON.stringify(history, null, 2), 'utf-8');

    return storage.historyPath;
}

function parseVersionNumber(version: string): number | null {
    const match = /^v(\d+)$/.exec(version);
    if (!match) {
        return null;
    }

    const parsed = Number.parseInt(match[1], 10);
    return Number.isNaN(parsed) ? null : parsed;
}

export function getNextVersionId(versions: Array<EvolutionVersionSnapshot<string>>): string {
    const versionNumbers = versions
        .map((entry) => parseVersionNumber(entry.version))
        .filter((entry): entry is number => entry !== null);

    if (versionNumbers.length === 0) {
        return 'v1';
    }

    return `v${Math.max(...versionNumbers) + 1}`;
}

function listRelativeFiles(rootPath: string): string[] {
    if (!existsSync(rootPath)) {
        return [];
    }

    const results: string[] = [];

    function walk(currentDir: string, prefix = ''): void {
        const entries = readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const relativePath = prefix ? join(prefix, entry.name) : entry.name;
            const fullPath = join(currentDir, entry.name);

            if (entry.isDirectory()) {
                walk(fullPath, relativePath);
            } else if (entry.isFile()) {
                results.push(relativePath);
            }
        }
    }

    walk(rootPath);
    return results.sort();
}

export function captureDirectorySnapshot(
    rootPath: string,
    version: string,
    grade: string,
    changeDescription: string,
    proposalsApplied: string[],
): MultiFileVersionSnapshot {
    const resolvedRoot = resolve(rootPath);
    const entries = listRelativeFiles(resolvedRoot).map((relativePath) => ({
        path: relativePath,
        content: readFileSync(join(resolvedRoot, relativePath), 'utf-8'),
    }));

    return {
        version,
        timestamp: new Date().toISOString(),
        content: JSON.stringify(entries),
        grade,
        changeDescription,
        proposalsApplied,
        rootPath: resolvedRoot,
        entries,
    };
}

export function restoreDirectorySnapshot(snapshot: MultiFileVersionSnapshot): void {
    const currentFiles = new Set(listRelativeFiles(snapshot.rootPath));
    const snapshotFiles = new Set(snapshot.entries.map((entry) => entry.path));

    for (const relativePath of currentFiles) {
        if (!snapshotFiles.has(relativePath)) {
            rmSync(join(snapshot.rootPath, relativePath), { force: true });
        }
    }

    for (const entry of snapshot.entries) {
        const fullPath = join(snapshot.rootPath, entry.path);
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, entry.content, 'utf-8');
    }
}

export function captureTargetedSnapshot(
    rootPath: string,
    paths: string[],
    version: string,
    grade: string,
    changeDescription: string,
    proposalsApplied: string[],
): MultiFileVersionSnapshot {
    const resolvedRoot = resolve(rootPath);
    const uniquePaths = Array.from(new Set(paths.map((entry) => resolve(entry))));

    const entries = uniquePaths
        .filter((entry) => existsSync(entry))
        .map((entry) => ({
            path: entry.startsWith(`${resolvedRoot}/`) ? entry.slice(resolvedRoot.length + 1) : basename(entry),
            content: readFileSync(entry, 'utf-8'),
        }));

    return {
        version,
        timestamp: new Date().toISOString(),
        content: JSON.stringify(entries),
        grade,
        changeDescription,
        proposalsApplied,
        rootPath: resolvedRoot,
        entries,
    };
}

export function restoreTargetedSnapshot(snapshot: MultiFileVersionSnapshot, currentPaths: string[]): void {
    const snapshotFiles = new Set(snapshot.entries.map((entry) => join(snapshot.rootPath, entry.path)));

    for (const currentPath of currentPaths.map((entry) => resolve(entry))) {
        if (existsSync(currentPath) && !snapshotFiles.has(currentPath)) {
            rmSync(currentPath, { force: true });
        }
    }

    for (const entry of snapshot.entries) {
        const fullPath = join(snapshot.rootPath, entry.path);
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, entry.content, 'utf-8');
    }
}

export function saveSnapshotBackup(
    namespace: string,
    targetPath: string,
    snapshot: MultiFileVersionSnapshot,
    label: string,
): string {
    const storage = getEvolutionStoragePaths(namespace, targetPath);
    mkdirSync(storage.backupsDir, { recursive: true });

    const backupPath = join(storage.backupsDir, `${getTargetKey(targetPath)}-${label}-${Date.now()}.snapshot.json`);
    writeFileSync(backupPath, JSON.stringify(snapshot, null, 2), 'utf-8');
    return backupPath;
}

export function createBackup(namespace: string, targetPath: string, content: string): string {
    const storage = getEvolutionStoragePaths(namespace, targetPath);
    mkdirSync(storage.backupsDir, { recursive: true });

    const backupPath = join(storage.backupsDir, `${getTargetKey(targetPath)}-${Date.now()}.bak`);
    writeFileSync(backupPath, content, 'utf-8');

    return backupPath;
}

export function rollbackSingleFile(
    namespace: string,
    targetPath: string,
    versionId: string,
): EvolutionRollbackResult & { backupPath?: string } {
    const resolvedTarget = resolve(targetPath);
    const history = loadVersionHistory(namespace, resolvedTarget);
    const targetVersion = history.find((entry) => entry.version === versionId);

    if (!targetVersion) {
        return { success: false, error: `Version ${versionId} not found` };
    }

    if (!existsSync(resolvedTarget)) {
        return { success: false, error: `Target does not exist: ${resolvedTarget}` };
    }

    const currentContent = readFileSync(resolvedTarget, 'utf-8');
    const backupPath = createBackup(namespace, resolvedTarget, currentContent);
    writeFileSync(resolvedTarget, targetVersion.content, 'utf-8');

    return { success: true, content: targetVersion.content, backupPath };
}

export async function runScript(scriptPath: string, args: string[]): Promise<ScriptRunResult> {
    const proc = Bun.spawn(['bun', 'run', scriptPath, ...args], {
        stdout: 'pipe',
        stderr: 'pipe',
    });

    const [exitCode, stdout, stderr] = await Promise.all([
        proc.exited,
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
    ]);

    return { exitCode, stdout, stderr };
}

export function verifyProposalOutcome(
    proposal: RefineBackedProposal,
    baselineReport: GenericEvaluationReport,
    updatedReport: GenericEvaluationReport,
    validationPassed?: boolean,
): VerificationOutcome {
    const plan = proposal.verificationPlan;
    if (!plan) {
        return { success: true, issues: [] };
    }

    const issues: string[] = [];

    if (plan.checks.includes('validate') && validationPassed === false) {
        issues.push('Validation failed after applying the proposal.');
    }

    if (plan.mustPass && !updatedReport.passed) {
        issues.push('Updated evaluation did not pass the required acceptance bar.');
    }

    if (typeof plan.minimumScore === 'number' && updatedReport.percentage < plan.minimumScore) {
        issues.push(
            `Updated evaluation dropped below the required minimum score (${updatedReport.percentage}% < ${plan.minimumScore}%).`,
        );
    }

    if (plan.mustNotDecrease && updatedReport.percentage < baselineReport.percentage) {
        issues.push(`Updated evaluation regressed from ${baselineReport.percentage}% to ${updatedReport.percentage}%.`);
    }

    if (plan.requiresImprovement && updatedReport.percentage <= baselineReport.percentage) {
        issues.push(
            `Updated evaluation did not improve beyond the baseline (${baselineReport.percentage}% -> ${updatedReport.percentage}%).`,
        );
    }

    return { success: issues.length === 0, issues };
}

export function formatAnalysis(
    report: GenericEvaluationReport,
    analysis: EvolutionAnalysis<EvolutionDataSource, EvolutionPattern<EvolutionDataSource>>,
): string {
    const lines = [
        '=== Evolution Analysis ===',
        '',
        `Target: ${report.targetName}`,
        `Score: ${report.percentage}%${report.grade ? ` (${report.grade})` : ''}`,
        `Status: ${report.passed ? 'PASS' : 'FAIL'}`,
        analysis.summary,
        '',
        'Available data sources:',
    ];

    for (const [source, available] of Object.entries(analysis.dataSourceAvailability)) {
        lines.push(`- ${source}: ${available ? 'available' : 'missing'}`);
    }

    lines.push('', 'Patterns:');

    if (analysis.patterns.length === 0) {
        lines.push('- No significant patterns detected.');
    } else {
        for (const pattern of analysis.patterns) {
            lines.push(`- [${pattern.type}] ${pattern.description}`);
        }
    }

    return lines.join('\n');
}

export function formatProposals(proposalSet: StoredProposalSet): string {
    const lines = [
        '=== Evolution Proposals ===',
        '',
        `Target: ${proposalSet.targetName}`,
        `Generated: ${proposalSet.generatedAt}`,
        `Evaluation score: ${proposalSet.evaluationPercentage}%`,
        '',
    ];

    if (proposalSet.proposals.length === 0) {
        lines.push('No proposals generated.');
        return lines.join('\n');
    }

    for (const proposal of proposalSet.proposals) {
        lines.push(`${proposal.id} [${proposal.priority}] ${proposal.description}`);
        lines.push(`  Section: ${proposal.targetSection}`);
        lines.push(`  Rationale: ${proposal.rationale}`);
        if (proposal.evidence && proposal.evidence.length > 0) {
            lines.push(`  Evidence: ${proposal.evidence.join(' | ')}`);
        }
        if (proposal.applyRisk) {
            lines.push(`  Risk: ${proposal.applyRisk}`);
        }
        if (proposal.applyMode) {
            lines.push(`  Apply mode: ${proposal.applyMode}`);
        }
        if (proposal.verificationPlan) {
            lines.push(`  Verification: ${proposal.verificationPlan.checks.join(', ')}`);
        }
        lines.push(`  Apply support: ${proposal.action.supportsApply ? 'yes' : 'no'}`);
        lines.push('');
    }

    return lines.join('\n').trimEnd();
}

export function formatHistory(versions: Array<EvolutionVersionSnapshot<string>>): string {
    if (versions.length === 0) {
        return 'No version history available.';
    }

    const lines = ['=== Evolution History ===', ''];

    for (const version of versions) {
        lines.push(`${version.version} (${version.grade}) ${version.timestamp}`);
        lines.push(`  Change: ${version.changeDescription}`);
        lines.push(`  Proposals: ${version.proposalsApplied.join(', ') || 'none'}`);
        lines.push('');
    }

    return lines.join('\n').trimEnd();
}

export function formatUnsupportedApply(message: string): EvolutionApplyResult {
    return { success: false, error: message };
}
