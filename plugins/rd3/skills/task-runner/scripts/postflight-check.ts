#!/usr/bin/env bun
/**
 * rd3:task-runner — Post-Flight Completion Gate
 *
 * Runs deterministic checks before a task can transition to Done.
 * Closes the "early-report-finish" reliability gap.
 *
 * Two tiers:
 *   - Mandatory subset (always-on): tasks-sections-populated, verification-verdict-pass,
 *     code-changes-exist. Cheap, high-signal; used by task-runner before every Done
 *     transition regardless of the --postflight-verify flag.
 *   - Full catalog (opt-in via --postflight-verify): 7-check audit including testing
 *     freshness, coverage, drift, and delegated evidence reconciliation.
 *
 * Usage (CLI):
 *   bun postflight-check.ts <WBS> [--coverage <n>] [--start-commit <sha>]
 *                                [--delegation-used] [--mandatory-only] [--preset <name>]
 *
 * Exit codes:
 *   0 = PASS
 *   1 = BLOCKED
 *   2 = Script error (I/O, parse failure, task not found)
 *
 * Output: JSON PostflightVerdict on stdout; errors on stderr.
 *
 * See references/postflight-checks.md for the check catalog.
 */

export type CheckStatus = 'pass' | 'fail' | 'warn' | 'skip';
export type CheckSeverity = 'blocker' | 'warn';
export type Verdict = 'PASS' | 'BLOCKED';
export type TaskStatus = 'Done' | 'Testing' | 'WIP';

export interface CheckResult {
    name: string;
    status: CheckStatus;
    evidence: string;
    severity: CheckSeverity;
    remediation?: string;
}

export interface PostflightVerdict {
    verdict: Verdict;
    checks: CheckResult[];
    blockers: Array<{
        check: string;
        reason: string;
        evidence: string;
    }>;
    task_status_recommended: TaskStatus;
}

export type Preset = 'simple' | 'standard' | 'complex' | 'research';

export interface TaskContext {
    /** Task file content (raw markdown). */
    taskContent: string;
    /** Task file path. */
    taskPath: string;
    /** Coverage threshold if --coverage was set. */
    coverageThreshold: number | null;
    /** Start commit SHA for this task's work (optional). */
    startCommit: string | null;
    /** Whether delegation was used for this task. */
    delegationUsed: boolean;
    /** Workflow preset; controls preset-aware check skips (e.g., research → skip code-changes-exist). */
    preset?: Preset | null;
}

export interface ExternalProbes {
    /** Runs `tasks check <WBS> --json` and returns ok/errors. */
    tasksCheck: (wbs: string) => Promise<{ ok: boolean; errors: string[] }>;
    /** Returns true/false when startCommit is set; null when startCommit is null (check will skip). */
    gitDiffHasChanges: (startCommit: string | null) => Promise<boolean | null>;
    /** Returns the list of paths in `git status --porcelain`. */
    gitStatusPaths: () => Promise<string[]>;
    /** Returns mtime of most recently changed code file since startCommit; null when startCommit is null. */
    codeMtime: (startCommit: string | null) => Promise<Date | null>;
}

// ============================================================================
// Pure check functions
// ============================================================================

export function checkTaskSectionsPopulated(probeResult: { ok: boolean; errors: string[] }): CheckResult {
    if (probeResult.ok) {
        return {
            name: 'task-sections-populated',
            status: 'pass',
            evidence: 'tasks check passed',
            severity: 'blocker',
        };
    }
    return {
        name: 'task-sections-populated',
        status: 'fail',
        evidence: probeResult.errors.join('; ') || 'tasks check reported failures',
        severity: 'blocker',
        remediation: 'Backfill missing sections using guards helper',
    };
}

function extractSection(content: string, heading: string): string | null {
    const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const lines = content.split('\n');
    const headingPattern = new RegExp(`^(#{2,3})\\s+${escapedHeading}\\s*$`);
    let start = -1;
    let depth = 2;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const m = headingPattern.exec(line);
        if (m) {
            depth = (m[1] ?? '##').length;
            start = i + 1;
            break;
        }
    }
    if (start === -1) return null;
    const endPattern = new RegExp(`^#{1,${depth}}\\s+`);
    let end = lines.length;
    for (let i = start; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (endPattern.test(line)) {
            end = i;
            break;
        }
    }
    return lines.slice(start, end).join('\n');
}

export function parseVerdictFromReview(taskContent: string): 'PASS' | 'PARTIAL' | 'FAIL' | null {
    const section = extractSection(taskContent, 'Review');
    if (section === null) return null;
    if (/\bPASS\b/.test(section)) return 'PASS';
    if (/\bPARTIAL\b/.test(section)) return 'PARTIAL';
    if (/\bFAIL\b/.test(section)) return 'FAIL';
    return null;
}

export function checkVerificationVerdict(taskContent: string): CheckResult {
    const verdict = parseVerdictFromReview(taskContent);
    if (verdict === 'PASS') {
        return {
            name: 'verification-verdict-pass',
            status: 'pass',
            evidence: 'Review section contains PASS',
            severity: 'blocker',
        };
    }
    if (verdict === null) {
        return {
            name: 'verification-verdict-pass',
            status: 'fail',
            evidence: 'Review section missing or no verdict found',
            severity: 'blocker',
            remediation: 'Run Stage 4 (rd3:code-verification) to populate Review section',
        };
    }
    return {
        name: 'verification-verdict-pass',
        status: 'fail',
        evidence: `Review verdict is ${verdict}, not PASS`,
        severity: 'blocker',
        remediation: 'Address review findings and re-run verification',
    };
}

export function checkCodeChangesExist(hasChanges: boolean | null, preset: Preset | null = null): CheckResult {
    if (preset === 'research') {
        return {
            name: 'code-changes-exist',
            status: 'skip',
            evidence: 'Preset is research; code-changes check skipped',
            severity: 'blocker',
        };
    }
    if (hasChanges === null) {
        return {
            name: 'code-changes-exist',
            status: 'skip',
            evidence: 'No start-commit provided; code-changes check skipped',
            severity: 'blocker',
        };
    }
    if (hasChanges) {
        return {
            name: 'code-changes-exist',
            status: 'pass',
            evidence: 'git diff non-empty vs task start commit',
            severity: 'blocker',
        };
    }
    return {
        name: 'code-changes-exist',
        status: 'fail',
        evidence: 'git diff is empty — no code changes since task start',
        severity: 'blocker',
        remediation: 'Implement the task or use --preset research for research-only tasks',
    };
}

export function checkUncommittedDrift(gitStatusPaths: string[]): CheckResult {
    if (gitStatusPaths.length === 0) {
        return {
            name: 'no-uncommitted-drift',
            status: 'pass',
            evidence: 'Working tree clean',
            severity: 'warn',
        };
    }
    return {
        name: 'no-uncommitted-drift',
        status: 'warn',
        evidence: `${gitStatusPaths.length} uncommitted path(s): ${gitStatusPaths.slice(0, 3).join(', ')}${gitStatusPaths.length > 3 ? '…' : ''}`,
        severity: 'warn',
        remediation: 'Commit or stash unrelated changes before closing the task',
    };
}

export function parseCoverageFromTestingSection(taskContent: string): number | null {
    const section = extractSection(taskContent, 'Testing');
    if (section === null) return null;
    const coverageMatch = section.match(/coverage[:\s]+([0-9]+(?:\.[0-9]+)?)\s*%/i);
    if (!coverageMatch) return null;
    return Number.parseFloat(coverageMatch[1] ?? '');
}

export function checkCoverageThreshold(threshold: number | null, taskContent: string): CheckResult {
    if (threshold === null) {
        return {
            name: 'coverage-threshold',
            status: 'skip',
            evidence: '--coverage not set; check skipped',
            severity: 'blocker',
        };
    }
    const measured = parseCoverageFromTestingSection(taskContent);
    if (measured === null) {
        return {
            name: 'coverage-threshold',
            status: 'fail',
            evidence: `--coverage=${threshold} set but no coverage found in Testing section`,
            severity: 'blocker',
            remediation: 'Record coverage in Testing section (e.g., "Coverage: 92%")',
        };
    }
    if (measured >= threshold) {
        return {
            name: 'coverage-threshold',
            status: 'pass',
            evidence: `Coverage ${measured}% ≥ threshold ${threshold}%`,
            severity: 'blocker',
        };
    }
    return {
        name: 'coverage-threshold',
        status: 'fail',
        evidence: `Coverage ${measured}% < threshold ${threshold}%`,
        severity: 'blocker',
        remediation: 'Add tests to meet threshold',
    };
}

export function parseTestingTimestamp(taskContent: string): Date | null {
    const section = extractSection(taskContent, 'Testing');
    if (section === null) return null;
    const isoMatch = section.match(
        /(?:Ran(?:\s+at)?|Date:|Run:|Result:|Evidence:)[^\n]*?(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?)/i,
    );
    if (!isoMatch) return null;
    const parsed = new Date(isoMatch[1] ?? '');
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function checkTestingEvidenceFreshness(taskContent: string, codeMtime: Date | null): CheckResult {
    const testingTs = parseTestingTimestamp(taskContent);
    if (testingTs === null) {
        return {
            name: 'testing-evidence-fresh',
            status: 'warn',
            evidence: 'No timestamp found in Testing section',
            severity: 'warn',
            remediation: 'Record test execution timestamp in Testing section',
        };
    }
    if (codeMtime === null) {
        return {
            name: 'testing-evidence-fresh',
            status: 'skip',
            evidence: 'No code mtime available for comparison',
            severity: 'warn',
        };
    }
    if (testingTs.getTime() >= codeMtime.getTime()) {
        return {
            name: 'testing-evidence-fresh',
            status: 'pass',
            evidence: `Testing timestamp ${testingTs.toISOString()} ≥ code mtime ${codeMtime.toISOString()}`,
            severity: 'blocker',
        };
    }
    return {
        name: 'testing-evidence-fresh',
        status: 'fail',
        evidence: `Testing timestamp ${testingTs.toISOString()} older than code mtime ${codeMtime.toISOString()}`,
        severity: 'blocker',
        remediation: 'Re-run tests via rd3:sys-testing',
    };
}

export function checkDelegatedEvidenceReconciled(taskContent: string, delegationUsed: boolean): CheckResult {
    if (!delegationUsed) {
        return {
            name: 'delegated-evidence-reconciled',
            status: 'skip',
            evidence: 'No delegation used; check skipped',
            severity: 'warn',
        };
    }
    const requiredSections = ['Solution', 'Review', 'Testing'];
    const missing = requiredSections.filter((s) => {
        const section = extractSection(taskContent, s);
        return section === null || section.trim().length === 0;
    });
    if (missing.length === 0) {
        return {
            name: 'delegated-evidence-reconciled',
            status: 'pass',
            evidence: 'All expected sections contain content',
            severity: 'warn',
        };
    }
    return {
        name: 'delegated-evidence-reconciled',
        status: 'warn',
        evidence: `Delegated sections empty or missing: ${missing.join(', ')}`,
        severity: 'warn',
        remediation: 'Fetch delegated output and merge into task file',
    };
}

// ============================================================================
// Orchestrators
// ============================================================================

/**
 * Names of the mandatory (always-on) check subset. These run before every
 * `Done` transition regardless of the --postflight-verify flag, providing a
 * cheap defense against early-report-complete failures.
 */
export const MANDATORY_CHECK_NAMES = [
    'task-sections-populated',
    'verification-verdict-pass',
    'code-changes-exist',
] as const;

function buildVerdict(checks: CheckResult[]): PostflightVerdict {
    const blockers = checks
        .filter((c) => c.status === 'fail' && c.severity === 'blocker')
        .map((c) => ({
            check: c.name,
            reason: c.remediation ?? 'see evidence',
            evidence: c.evidence,
        }));

    const verdict: Verdict = blockers.length === 0 ? 'PASS' : 'BLOCKED';
    const task_status_recommended: TaskStatus = verdict === 'PASS' ? 'Done' : 'Testing';

    return { verdict, checks, blockers, task_status_recommended };
}

/**
 * Runs only the mandatory subset of checks (3 cheap, high-signal checks).
 * Always invoked before `tasks update <WBS> done`, regardless of any flag.
 */
export async function runMandatoryChecks(context: TaskContext, probes: ExternalProbes): Promise<PostflightVerdict> {
    const probeResult = await probes.tasksCheck(extractWbs(context.taskPath));
    const hasChanges = await probes.gitDiffHasChanges(context.startCommit);

    const checks: CheckResult[] = [
        checkTaskSectionsPopulated(probeResult),
        checkVerificationVerdict(context.taskContent),
        checkCodeChangesExist(hasChanges, context.preset ?? null),
    ];

    return buildVerdict(checks);
}

/**
 * Runs the full 7-check audit. Active when --postflight-verify or --verify is set.
 */
export async function runPostflightChecks(context: TaskContext, probes: ExternalProbes): Promise<PostflightVerdict> {
    const probeResult = await probes.tasksCheck(extractWbs(context.taskPath));
    const hasChanges = await probes.gitDiffHasChanges(context.startCommit);
    const gitStatusPaths = await probes.gitStatusPaths();
    const codeMtime = await probes.codeMtime(context.startCommit);

    const checks: CheckResult[] = [
        checkTaskSectionsPopulated(probeResult),
        checkVerificationVerdict(context.taskContent),
        checkCodeChangesExist(hasChanges, context.preset ?? null),
        checkUncommittedDrift(gitStatusPaths),
        checkCoverageThreshold(context.coverageThreshold, context.taskContent),
        checkTestingEvidenceFreshness(context.taskContent, codeMtime),
        checkDelegatedEvidenceReconciled(context.taskContent, context.delegationUsed),
    ];

    return buildVerdict(checks);
}

export function extractWbs(taskPath: string): string {
    const match = taskPath.match(/\/(\d{4}(?:\.\d+)*)_/);
    return match?.[1] ?? '';
}

// ============================================================================
// Default probe implementations (live environment)
// ============================================================================

async function runCommand(cmd: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
    const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const code = await proc.exited;
    return { stdout, stderr, code };
}

export const liveProbes: ExternalProbes = {
    async tasksCheck(wbs: string) {
        if (!wbs) {
            return { ok: false, errors: ['Could not extract WBS from task path'] };
        }
        const { stdout, stderr, code } = await runCommand(['tasks', 'check', wbs]);
        if (code === 0) {
            return { ok: true, errors: [] };
        }
        const errors = `${stdout}\n${stderr}`.split('\n').filter((line) => line.trim().length > 0);
        return { ok: false, errors };
    },
    async gitDiffHasChanges(startCommit: string | null) {
        if (startCommit === null) return null;
        const { stdout } = await runCommand(['git', 'diff', '--stat', `${startCommit}..HEAD`]);
        return stdout.trim().length > 0;
    },
    async gitStatusPaths() {
        const { stdout } = await runCommand(['git', 'status', '--porcelain']);
        return stdout
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => {
                const path = line.slice(3).trim();
                const arrowIdx = path.indexOf(' -> ');
                return arrowIdx === -1 ? path : path.slice(arrowIdx + 4);
            })
            .filter((p) => p.length > 0);
    },
    async codeMtime(startCommit: string | null) {
        if (startCommit === null) return null;
        const { stdout: fileList } = await runCommand(['git', 'diff', '--name-only', `${startCommit}..HEAD`]);
        const files = fileList
            .trim()
            .split('\n')
            .filter((f) => f.length > 0);
        if (files.length === 0) return null;
        let latest: Date | null = null;
        for (const file of files) {
            const { stdout } = await runCommand(['git', 'log', '-1', '--format=%cI', '--', file]);
            const iso = stdout.trim();
            if (!iso) continue;
            const d = new Date(iso);
            if (!Number.isNaN(d.getTime())) {
                if (latest === null || d.getTime() > latest.getTime()) latest = d;
            }
        }
        return latest;
    },
};

// ============================================================================
// CLI
// ============================================================================

export interface CliIo {
    resolveTaskPath: (wbs: string) => Promise<string>;
    readTaskFile: (path: string) => Promise<string>;
    writeStdout: (text: string) => void;
    writeStderr: (text: string) => void;
    probes: ExternalProbes;
}

export interface ParsedCliArgs {
    wbs: string | null;
    coverageThreshold: number | null;
    startCommit: string | null;
    delegationUsed: boolean;
    error: string | null;
}

export function parseCliArgs(argv: string[]): ParsedCliArgs {
    const args = argv.slice(2);
    const wbs = args[0];
    if (!wbs || wbs.startsWith('--')) {
        return {
            wbs: null,
            coverageThreshold: null,
            startCommit: null,
            delegationUsed: false,
            error: 'Usage: bun postflight-check.ts <WBS> [--coverage <n>] [--start-commit <sha>] [--delegation-used]\n',
        };
    }

    let coverageThreshold: number | null = null;
    let startCommit: string | null = null;
    let delegationUsed = false;

    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--coverage' && i + 1 < args.length) {
            const next = args[i + 1] ?? '';
            const parsed = Number.parseFloat(next);
            if (Number.isNaN(parsed)) {
                return {
                    wbs,
                    coverageThreshold: null,
                    startCommit: null,
                    delegationUsed: false,
                    error: `Invalid --coverage value: ${next}\n`,
                };
            }
            coverageThreshold = parsed;
            i++;
        } else if (arg === '--start-commit' && i + 1 < args.length) {
            startCommit = args[i + 1] ?? null;
            i++;
        } else if (arg === '--delegation-used') {
            delegationUsed = true;
        }
    }

    return { wbs, coverageThreshold, startCommit, delegationUsed, error: null };
}

export async function runCli(argv: string[], io: CliIo): Promise<number> {
    const parsed = parseCliArgs(argv);
    if (parsed.error !== null) {
        io.writeStderr(parsed.error);
        return 2;
    }
    const { wbs, coverageThreshold, startCommit, delegationUsed } = parsed;
    if (wbs === null) {
        io.writeStderr('Usage: bun postflight-check.ts <WBS>\n');
        return 2;
    }

    const path = (await io.resolveTaskPath(wbs)).trim();
    if (!path) {
        io.writeStderr(`Task ${wbs} not found\n`);
        return 2;
    }

    let taskContent: string;
    try {
        taskContent = await io.readTaskFile(path);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        io.writeStderr(`Failed to read task file ${path}: ${msg}\n`);
        return 2;
    }

    const verdict = await runPostflightChecks(
        { taskContent, taskPath: path, coverageThreshold, startCommit, delegationUsed },
        io.probes,
    );

    io.writeStdout(`${JSON.stringify(verdict, null, 2)}\n`);
    return verdict.verdict === 'PASS' ? 0 : 1;
}

export const liveIo: CliIo = {
    async resolveTaskPath(wbs: string) {
        const { stdout } = await runCommand(['tasks', 'get-file', wbs]);
        return stdout;
    },
    readTaskFile: (path: string) => Bun.file(path).text(),
    writeStdout: (text: string) => process.stdout.write(text),
    writeStderr: (text: string) => process.stderr.write(text),
    probes: liveProbes,
};

if (import.meta.main) {
    runCli(process.argv, liveIo).then((code) => {
        process.exit(code);
    });
}
