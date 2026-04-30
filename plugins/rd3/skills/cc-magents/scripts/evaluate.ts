#!/usr/bin/env bun
import { parseCliArgs, printResult, readWorkspaceFromFile, writeJsonResult } from './io';
import type { EvaluationResult, MainAgentWorkspace } from './types';
import { validateWorkspace } from './validate';

export function evaluateWorkspace(workspace: MainAgentWorkspace): EvaluationResult {
    const validation = validateWorkspace(workspace);
    const dimensions = {
        coverage: scoreCoverage(workspace),
        scoping: scoreScoping(workspace),
        safety: scoreSafety(workspace),
        portability: scorePortability(workspace),
        evidence: scoreEvidence(workspace),
        maintainability: scoreMaintainability(workspace),
    };
    const score = Math.round(
        dimensions.coverage * 0.22 +
            dimensions.scoping * 0.16 +
            dimensions.safety * 0.2 +
            dimensions.portability * 0.16 +
            dimensions.evidence * 0.14 +
            dimensions.maintainability * 0.12,
    );
    const findings = validation.issues.map((issue) => `${issue.severity}: ${issue.message}`);
    if (workspace.rules.some((rule) => rule.globs.length > 0)) findings.push('path-scoped rules detected');
    if (workspace.sourceEvidence.length > 0) findings.push('source evidence available');
    return { score, grade: grade(score), dimensions, findings };
}

function scoreCoverage(workspace: MainAgentWorkspace): number {
    const headings = workspace.documents.flatMap((document) =>
        document.sections.map((section) => section.heading.toLowerCase()),
    );
    let score = Math.min(100, headings.length * 12);
    for (const keyword of ['test', 'style', 'safety', 'architecture', 'workflow']) {
        if (headings.some((heading) => heading.includes(keyword))) score += 8;
    }
    return Math.min(score, 100);
}

function scoreScoping(workspace: MainAgentWorkspace): number {
    if (workspace.rules.some((rule) => rule.globs.length > 0)) return 100;
    if (workspace.rules.length >= 4) return 75;
    return 55;
}

function scoreSafety(workspace: MainAgentWorkspace): number {
    const text = workspace.documents
        .map((document) => document.content)
        .join('\n')
        .toLowerCase();
    let score = 35;
    if (workspace.permissions.length > 0) score += 30;
    if (text.includes('destructive') || text.includes('approval')) score += 20;
    if (text.includes('secret') || text.includes('credential')) score += 15;
    return Math.min(score, 100);
}

function scorePortability(workspace: MainAgentWorkspace): number {
    const platforms = new Set(workspace.platformBindings.map((binding) => binding.platform));
    let score = platforms.has('agents-md') ? 75 : 55;
    if (workspace.documents.some((document) => document.metadata.imports.length > 0)) score += 10;
    if (workspace.rules.some((rule) => rule.globs.length > 0)) score += 10;
    return Math.min(score, 100);
}

function scoreEvidence(workspace: MainAgentWorkspace): number {
    if (workspace.sourceEvidence.some((evidence) => evidence.confidence === 'high')) return 100;
    if (workspace.sourceEvidence.length > 0) return 75;
    return 45;
}

function scoreMaintainability(workspace: MainAgentWorkspace): number {
    const averageSectionLength =
        workspace.documents
            .flatMap((document) => document.sections)
            .reduce((sum, section) => sum + section.content.length, 0) /
        Math.max(1, workspace.documents.flatMap((document) => document.sections).length);
    if (averageSectionLength < 2500 && workspace.rules.length <= 20) return 95;
    if (averageSectionLength < 5000) return 75;
    return 55;
}

function grade(score: number): EvaluationResult['grade'] {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}

export function runEvaluateCli(args: string[]): EvaluationResult {
    const options = parseCliArgs(args);
    if (!options.input) throw new Error('Usage: evaluate.ts <file> [--from platform] [--json]');
    const result = evaluateWorkspace(readWorkspaceFromFile(options.input, options.from));
    writeJsonResult(result, options.output);
    printResult(result, options.json);
    return result;
}

if (import.meta.main) {
    runEvaluateCli(Bun.argv.slice(2));
}
