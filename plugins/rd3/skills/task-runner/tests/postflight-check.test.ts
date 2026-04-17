import { describe, expect, it } from 'bun:test';
import {
    checkCodeChangesExist,
    checkCoverageThreshold,
    checkDelegatedEvidenceReconciled,
    checkTaskSectionsPopulated,
    checkTestingEvidenceFreshness,
    checkUncommittedDrift,
    checkVerificationVerdict,
    type CliIo,
    extractWbs,
    type ExternalProbes,
    liveIo,
    liveProbes,
    parseCliArgs,
    parseCoverageFromTestingSection,
    parseTestingTimestamp,
    parseVerdictFromReview,
    runCli,
    runPostflightChecks,
    type TaskContext,
} from '../scripts/postflight-check';

// ============================================================================
// Pure check functions
// ============================================================================

describe('checkTaskSectionsPopulated', () => {
    it('passes when tasks check reports ok', () => {
        const r = checkTaskSectionsPopulated({ ok: true, errors: [] });
        expect(r.status).toBe('pass');
        expect(r.severity).toBe('blocker');
    });

    it('fails with joined errors otherwise', () => {
        const r = checkTaskSectionsPopulated({ ok: false, errors: ['missing Design', 'missing Plan'] });
        expect(r.status).toBe('fail');
        expect(r.evidence).toContain('missing Design');
        expect(r.evidence).toContain('missing Plan');
    });
});

describe('parseVerdictFromReview', () => {
    it('returns PASS when review section contains PASS keyword', () => {
        const md = '## Review\n\nVerdict: PASS\n\n## Next';
        expect(parseVerdictFromReview(md)).toBe('PASS');
    });

    it('returns PARTIAL when present', () => {
        const md = '## Review\n\nVerdict: PARTIAL\n';
        expect(parseVerdictFromReview(md)).toBe('PARTIAL');
    });

    it('returns FAIL when present', () => {
        const md = '## Review\n\nVerdict: FAIL — security issue\n';
        expect(parseVerdictFromReview(md)).toBe('FAIL');
    });

    it('returns null when Review section absent', () => {
        expect(parseVerdictFromReview('## Background\nfoo')).toBe(null);
    });

    it('returns null when Review section has no verdict keyword', () => {
        const md = '## Review\n\nPending review.\n';
        expect(parseVerdictFromReview(md)).toBe(null);
    });
});

describe('checkVerificationVerdict', () => {
    it('passes on PASS', () => {
        const r = checkVerificationVerdict('## Review\nPASS\n');
        expect(r.status).toBe('pass');
    });
    it('fails on PARTIAL', () => {
        const r = checkVerificationVerdict('## Review\nPARTIAL\n');
        expect(r.status).toBe('fail');
        expect(r.evidence).toContain('PARTIAL');
    });
    it('fails on FAIL', () => {
        const r = checkVerificationVerdict('## Review\nFAIL\n');
        expect(r.status).toBe('fail');
    });
    it('fails when Review missing', () => {
        const r = checkVerificationVerdict('## Background\nfoo\n');
        expect(r.status).toBe('fail');
        expect(r.evidence).toContain('missing');
    });
});

describe('checkCodeChangesExist', () => {
    it('passes when changes exist', () => {
        expect(checkCodeChangesExist(true).status).toBe('pass');
    });
    it('fails when no changes', () => {
        const r = checkCodeChangesExist(false);
        expect(r.status).toBe('fail');
        expect(r.severity).toBe('blocker');
    });
});

describe('checkUncommittedDrift', () => {
    it('passes when working tree clean', () => {
        const r = checkUncommittedDrift([]);
        expect(r.status).toBe('pass');
        expect(r.severity).toBe('warn');
    });
    it('warns when drift present', () => {
        const r = checkUncommittedDrift(['a.ts', 'b.ts', 'c.ts', 'd.ts']);
        expect(r.status).toBe('warn');
        expect(r.evidence).toContain('4 uncommitted');
        expect(r.evidence).toContain('…');
    });
});

describe('parseCoverageFromTestingSection', () => {
    it('extracts simple percentage', () => {
        const md = '## Testing\nCoverage: 92%\n';
        expect(parseCoverageFromTestingSection(md)).toBe(92);
    });
    it('extracts decimal percentage', () => {
        const md = '## Testing\ncoverage 89.5%\n';
        expect(parseCoverageFromTestingSection(md)).toBe(89.5);
    });
    it('returns null when absent', () => {
        expect(parseCoverageFromTestingSection('## Testing\nNo info\n')).toBe(null);
    });
    it('returns null when Testing section missing', () => {
        expect(parseCoverageFromTestingSection('## Background\nx\n')).toBe(null);
    });
});

describe('checkCoverageThreshold', () => {
    it('skips when no threshold set', () => {
        const r = checkCoverageThreshold(null, '## Testing\nCoverage: 80%\n');
        expect(r.status).toBe('skip');
    });
    it('fails when threshold set but no coverage recorded', () => {
        const r = checkCoverageThreshold(90, '## Testing\nno coverage info\n');
        expect(r.status).toBe('fail');
        expect(r.evidence).toContain('no coverage found');
    });
    it('passes when measured >= threshold', () => {
        const r = checkCoverageThreshold(90, '## Testing\nCoverage: 95%\n');
        expect(r.status).toBe('pass');
    });
    it('passes when measured equals threshold exactly', () => {
        const r = checkCoverageThreshold(90, '## Testing\nCoverage: 90%\n');
        expect(r.status).toBe('pass');
    });
    it('fails when measured < threshold', () => {
        const r = checkCoverageThreshold(90, '## Testing\nCoverage: 80%\n');
        expect(r.status).toBe('fail');
        expect(r.evidence).toContain('< threshold');
    });
});

describe('parseTestingTimestamp', () => {
    it('parses ISO timestamp from Testing section', () => {
        const md = '## Testing\nRan at 2026-04-16T12:00:00Z\n';
        const ts = parseTestingTimestamp(md);
        expect(ts).not.toBe(null);
        expect(ts?.getUTCFullYear()).toBe(2026);
    });
    it('parses date-only', () => {
        const ts = parseTestingTimestamp('## Testing\nDate: 2026-04-16\n');
        expect(ts?.getUTCFullYear()).toBe(2026);
    });
    it('returns null when no timestamp', () => {
        expect(parseTestingTimestamp('## Testing\nNo date here\n')).toBe(null);
    });
});

describe('checkTestingEvidenceFreshness', () => {
    it('warns when no timestamp in Testing', () => {
        const r = checkTestingEvidenceFreshness('## Testing\nNo timestamp\n', new Date());
        expect(r.status).toBe('warn');
    });
    it('skips when no code mtime available', () => {
        const r = checkTestingEvidenceFreshness('## Testing\n2026-04-16T12:00:00Z\n', null);
        expect(r.status).toBe('skip');
    });
    it('passes when testing ts >= code mtime', () => {
        const r = checkTestingEvidenceFreshness(
            '## Testing\nRan 2026-04-16T12:00:00Z\n',
            new Date('2026-04-16T10:00:00Z'),
        );
        expect(r.status).toBe('pass');
    });
    it('fails when testing ts older than code mtime', () => {
        const r = checkTestingEvidenceFreshness(
            '## Testing\nRan 2026-04-15T12:00:00Z\n',
            new Date('2026-04-16T12:00:00Z'),
        );
        expect(r.status).toBe('fail');
        expect(r.evidence).toContain('older');
    });
});

describe('checkDelegatedEvidenceReconciled', () => {
    it('skips when delegation not used', () => {
        const r = checkDelegatedEvidenceReconciled('## Solution\nx\n', false);
        expect(r.status).toBe('skip');
    });
    it('passes when all required sections populated', () => {
        const md = '## Solution\ndid stuff\n## Review\nPASS\n## Testing\nran tests\n';
        const r = checkDelegatedEvidenceReconciled(md, true);
        expect(r.status).toBe('pass');
    });
    it('warns when Solution empty', () => {
        const md = '## Solution\n\n## Review\nPASS\n## Testing\nran\n';
        const r = checkDelegatedEvidenceReconciled(md, true);
        expect(r.status).toBe('warn');
        expect(r.evidence).toContain('Solution');
    });
    it('warns when Review section missing', () => {
        const md = '## Solution\nok\n## Testing\nran\n';
        const r = checkDelegatedEvidenceReconciled(md, true);
        expect(r.status).toBe('warn');
        expect(r.evidence).toContain('Review');
    });
});

// ============================================================================
// Orchestrator (runPostflightChecks)
// ============================================================================

function makeProbes(overrides: Partial<ExternalProbes> = {}): ExternalProbes {
    return {
        tasksCheck: async () => ({ ok: true, errors: [] }),
        gitDiffHasChanges: async () => true,
        gitStatusPaths: async () => [],
        codeMtime: async () => new Date('2026-04-16T10:00:00Z'),
        ...overrides,
    };
}

function makeContext(overrides: Partial<TaskContext> = {}): TaskContext {
    return {
        taskContent:
            '## Solution\nImplemented X\n## Review\nPASS\n## Testing\nRan at 2026-04-16T11:00:00Z — Coverage: 92%\n',
        taskPath: '/repo/docs/tasks2/0387_example.md',
        coverageThreshold: null,
        startCommit: null,
        delegationUsed: false,
        ...overrides,
    };
}

describe('runPostflightChecks — happy path', () => {
    it('returns PASS with empty blockers when all checks pass', async () => {
        const v = await runPostflightChecks(makeContext(), makeProbes());
        expect(v.verdict).toBe('PASS');
        expect(v.blockers).toEqual([]);
        expect(v.task_status_recommended).toBe('Done');
    });

    it('includes 7 checks in result', async () => {
        const v = await runPostflightChecks(makeContext(), makeProbes());
        expect(v.checks).toHaveLength(7);
    });
});

describe('runPostflightChecks — blocker scenarios', () => {
    it('BLOCKED when tasks check fails', async () => {
        const v = await runPostflightChecks(
            makeContext(),
            makeProbes({ tasksCheck: async () => ({ ok: false, errors: ['missing Design'] }) }),
        );
        expect(v.verdict).toBe('BLOCKED');
        expect(v.blockers.some((b) => b.check === 'task-sections-populated')).toBe(true);
        expect(v.task_status_recommended).toBe('Testing');
    });

    it('BLOCKED when verification verdict is PARTIAL', async () => {
        const v = await runPostflightChecks(
            makeContext({
                taskContent: '## Review\nPARTIAL — minor issue\n## Testing\n2026-04-16T11:00:00Z\n',
            }),
            makeProbes(),
        );
        expect(v.verdict).toBe('BLOCKED');
        expect(v.blockers.some((b) => b.check === 'verification-verdict-pass')).toBe(true);
    });

    it('BLOCKED when no code changes', async () => {
        const v = await runPostflightChecks(makeContext(), makeProbes({ gitDiffHasChanges: async () => false }));
        expect(v.verdict).toBe('BLOCKED');
        expect(v.blockers.some((b) => b.check === 'code-changes-exist')).toBe(true);
    });

    it('BLOCKED when coverage below threshold', async () => {
        const v = await runPostflightChecks(
            makeContext({
                coverageThreshold: 95,
                taskContent: '## Review\nPASS\n## Testing\n2026-04-16T11:00:00Z\nCoverage: 80%\n',
            }),
            makeProbes(),
        );
        expect(v.verdict).toBe('BLOCKED');
        expect(v.blockers.some((b) => b.check === 'coverage-threshold')).toBe(true);
    });

    it('BLOCKED when testing evidence stale', async () => {
        const v = await runPostflightChecks(
            makeContext({
                taskContent: '## Review\nPASS\n## Testing\nRan 2026-04-01T00:00:00Z\n',
            }),
            makeProbes({ codeMtime: async () => new Date('2026-04-16T10:00:00Z') }),
        );
        expect(v.verdict).toBe('BLOCKED');
        expect(v.blockers.some((b) => b.check === 'testing-evidence-fresh')).toBe(true);
    });
});

describe('runPostflightChecks — warn-only scenarios', () => {
    it('remains PASS when only warnings present (uncommitted drift)', async () => {
        const v = await runPostflightChecks(
            makeContext(),
            makeProbes({ gitStatusPaths: async () => ['unrelated.ts'] }),
        );
        expect(v.verdict).toBe('PASS');
        expect(v.blockers).toEqual([]);
        const driftCheck = v.checks.find((c) => c.name === 'no-uncommitted-drift');
        expect(driftCheck?.status).toBe('warn');
    });

    it('remains PASS when delegated evidence warnings present', async () => {
        const v = await runPostflightChecks(
            makeContext({
                taskContent: '## Solution\n\n## Review\nPASS\n## Testing\n2026-04-16T11:00:00Z\n',
                delegationUsed: true,
            }),
            makeProbes(),
        );
        expect(v.verdict).toBe('PASS');
    });
});

describe('runPostflightChecks — multiple blockers', () => {
    it('reports all blockers, not just the first', async () => {
        const v = await runPostflightChecks(
            makeContext({
                taskContent: '## Testing\nno review section\n',
            }),
            makeProbes({
                tasksCheck: async () => ({ ok: false, errors: ['err'] }),
                gitDiffHasChanges: async () => false,
            }),
        );
        expect(v.verdict).toBe('BLOCKED');
        expect(v.blockers.length).toBeGreaterThanOrEqual(3);
    });
});

// ============================================================================
// Helpers
// ============================================================================

describe('extractWbs', () => {
    it('pulls 4-digit WBS from task file path', () => {
        expect(extractWbs('/repo/docs/tasks2/0387_example.md')).toBe('0387');
    });
    it('pulls dotted WBS for child tasks', () => {
        expect(extractWbs('/repo/docs/tasks2/0387.01_child.md')).toBe('0387.01');
    });
    it('returns empty string when path has no WBS prefix', () => {
        expect(extractWbs('/some/random/path.md')).toBe('');
    });
});

// ============================================================================
// liveProbes (integration with real shell)
// ============================================================================

describe('liveProbes — integration', () => {
    it('tasksCheck returns failure object for nonexistent WBS', async () => {
        const result = await liveProbes.tasksCheck('9999');
        expect(result.ok).toBe(false);
        expect(Array.isArray(result.errors)).toBe(true);
    });

    it('tasksCheck returns failure when WBS is empty', async () => {
        const result = await liveProbes.tasksCheck('');
        expect(result.ok).toBe(false);
        expect(result.errors[0]).toContain('WBS');
    });

    it('gitStatusPaths returns array of strings', async () => {
        const paths = await liveProbes.gitStatusPaths();
        expect(Array.isArray(paths)).toBe(true);
        for (const p of paths) {
            expect(typeof p).toBe('string');
        }
    });

    it('gitDiffHasChanges returns boolean', async () => {
        const result = await liveProbes.gitDiffHasChanges(null);
        expect(typeof result).toBe('boolean');
    });

    it('codeMtime returns a Date or null', async () => {
        const result = await liveProbes.codeMtime();
        expect(result === null || result instanceof Date).toBe(true);
    });
});

// ============================================================================
// parseCliArgs — direct unit tests
// ============================================================================

describe('parseCliArgs', () => {
    it('returns error when no args', () => {
        const r = parseCliArgs(['bun', 'postflight-check.ts']);
        expect(r.error).toContain('Usage');
        expect(r.wbs).toBe(null);
    });

    it('returns error when first arg is a flag', () => {
        const r = parseCliArgs(['bun', 'postflight-check.ts', '--coverage', '90']);
        expect(r.error).toContain('Usage');
    });

    it('parses bare WBS', () => {
        const r = parseCliArgs(['bun', 'postflight-check.ts', '0387']);
        expect(r.error).toBe(null);
        expect(r.wbs).toBe('0387');
        expect(r.coverageThreshold).toBe(null);
        expect(r.startCommit).toBe(null);
        expect(r.delegationUsed).toBe(false);
    });

    it('parses --coverage flag', () => {
        const r = parseCliArgs(['bun', 'postflight-check.ts', '0387', '--coverage', '90']);
        expect(r.coverageThreshold).toBe(90);
    });

    it('parses decimal --coverage', () => {
        const r = parseCliArgs(['bun', 'postflight-check.ts', '0387', '--coverage', '87.5']);
        expect(r.coverageThreshold).toBe(87.5);
    });

    it('rejects non-numeric --coverage', () => {
        const r = parseCliArgs(['bun', 'postflight-check.ts', '0387', '--coverage', 'bogus']);
        expect(r.error).toContain('--coverage');
    });

    it('parses --start-commit', () => {
        const r = parseCliArgs(['bun', 'postflight-check.ts', '0387', '--start-commit', 'abc123']);
        expect(r.startCommit).toBe('abc123');
    });

    it('parses --delegation-used flag', () => {
        const r = parseCliArgs(['bun', 'postflight-check.ts', '0387', '--delegation-used']);
        expect(r.delegationUsed).toBe(true);
    });

    it('parses combined flags', () => {
        const r = parseCliArgs([
            'bun',
            'postflight-check.ts',
            '0387',
            '--coverage',
            '95',
            '--start-commit',
            'HEAD',
            '--delegation-used',
        ]);
        expect(r.wbs).toBe('0387');
        expect(r.coverageThreshold).toBe(95);
        expect(r.startCommit).toBe('HEAD');
        expect(r.delegationUsed).toBe(true);
    });

    it('ignores unknown flags', () => {
        const r = parseCliArgs(['bun', 'postflight-check.ts', '0387', '--unknown']);
        expect(r.error).toBe(null);
        expect(r.wbs).toBe('0387');
    });
});

// ============================================================================
// runCli — CLI with mock IO (in-process, contributes to coverage)
// ============================================================================

function makeMockIo(overrides: Partial<CliIo> = {}): CliIo & {
    stdoutText: () => string;
    stderrText: () => string;
} {
    let stdout = '';
    let stderr = '';
    return {
        resolveTaskPath: async (_wbs: string) => '',
        readTaskFile: async (_path: string) => '',
        writeStdout: (text) => {
            stdout += text;
        },
        writeStderr: (text) => {
            stderr += text;
        },
        probes: {
            tasksCheck: async () => ({ ok: true, errors: [] }),
            gitDiffHasChanges: async () => true,
            gitStatusPaths: async () => [],
            codeMtime: async () => new Date('2026-04-16T10:00:00Z'),
        },
        stdoutText: () => stdout,
        stderrText: () => stderr,
        ...overrides,
    };
}

describe('runCli — argument parsing', () => {
    it('exits 2 with usage when WBS missing', async () => {
        const io = makeMockIo();
        const code = await runCli(['bun', 'postflight-check.ts'], io);
        expect(code).toBe(2);
        expect(io.stderrText()).toContain('Usage');
    });

    it('exits 2 when first arg is a flag', async () => {
        const io = makeMockIo();
        const code = await runCli(['bun', 'postflight-check.ts', '--coverage', '90'], io);
        expect(code).toBe(2);
        expect(io.stderrText()).toContain('Usage');
    });

    it('exits 2 for invalid --coverage value', async () => {
        const io = makeMockIo();
        const code = await runCli(['bun', 'postflight-check.ts', '0387', '--coverage', 'not-a-number'], io);
        expect(code).toBe(2);
        expect(io.stderrText()).toContain('--coverage');
    });
});

describe('runCli — task resolution', () => {
    it('exits 2 when task not found', async () => {
        const io = makeMockIo({
            resolveTaskPath: async () => '',
        });
        const code = await runCli(['bun', 'postflight-check.ts', '9999'], io);
        expect(code).toBe(2);
        expect(io.stderrText()).toContain('not found');
    });

    it('exits 2 when task file read fails', async () => {
        const io = makeMockIo({
            resolveTaskPath: async () => '/tmp/0387_example.md',
            readTaskFile: async () => {
                throw new Error('ENOENT: no such file');
            },
        });
        const code = await runCli(['bun', 'postflight-check.ts', '0387'], io);
        expect(code).toBe(2);
        expect(io.stderrText()).toContain('Failed to read');
        expect(io.stderrText()).toContain('ENOENT');
    });

    it('exits 2 when task file read throws non-Error', async () => {
        const io = makeMockIo({
            resolveTaskPath: async () => '/tmp/0387_example.md',
            readTaskFile: async () => {
                throw 'string error'; // eslint-disable-line @typescript-eslint/no-throw-literal
            },
        });
        const code = await runCli(['bun', 'postflight-check.ts', '0387'], io);
        expect(code).toBe(2);
        expect(io.stderrText()).toContain('string error');
    });
});

describe('runCli — happy path', () => {
    it('exits 0 and emits PASS JSON when all checks pass', async () => {
        const io = makeMockIo({
            resolveTaskPath: async () => '/tmp/docs/tasks2/0387_example.md',
            readTaskFile: async () => '## Solution\nDone\n## Review\nPASS\n## Testing\nRan 2026-04-16T12:00:00Z\n',
        });
        const code = await runCli(['bun', 'postflight-check.ts', '0387'], io);
        expect(code).toBe(0);
        const parsed = JSON.parse(io.stdoutText());
        expect(parsed.verdict).toBe('PASS');
        expect(parsed.task_status_recommended).toBe('Done');
    });

    it('exits 1 and emits BLOCKED JSON when checks fail', async () => {
        const io = makeMockIo({
            resolveTaskPath: async () => '/tmp/docs/tasks2/0387_example.md',
            readTaskFile: async () => '## Review\nFAIL — issue\n## Testing\n2026-04-16T10:00:00Z\n',
        });
        const code = await runCli(['bun', 'postflight-check.ts', '0387'], io);
        expect(code).toBe(1);
        const parsed = JSON.parse(io.stdoutText());
        expect(parsed.verdict).toBe('BLOCKED');
        expect(parsed.task_status_recommended).toBe('Testing');
    });

    it('forwards --coverage threshold into checks', async () => {
        const io = makeMockIo({
            resolveTaskPath: async () => '/tmp/docs/tasks2/0387_example.md',
            readTaskFile: async () => '## Review\nPASS\n## Testing\nRan 2026-04-16T12:00:00Z\nCoverage: 80%\n',
        });
        const code = await runCli(['bun', 'postflight-check.ts', '0387', '--coverage', '95'], io);
        expect(code).toBe(1);
        const parsed = JSON.parse(io.stdoutText());
        const coverageCheck = parsed.checks.find((c: { name: string }) => c.name === 'coverage-threshold');
        expect(coverageCheck.status).toBe('fail');
    });

    it('forwards --delegation-used into checks', async () => {
        const io = makeMockIo({
            resolveTaskPath: async () => '/tmp/docs/tasks2/0387_example.md',
            readTaskFile: async () => '## Solution\n\n## Review\nPASS\n## Testing\n2026-04-16T12:00:00Z\n',
        });
        const code = await runCli(['bun', 'postflight-check.ts', '0387', '--delegation-used'], io);
        expect(code).toBe(0);
        const parsed = JSON.parse(io.stdoutText());
        const delegationCheck = parsed.checks.find((c: { name: string }) => c.name === 'delegated-evidence-reconciled');
        expect(delegationCheck.status).toBe('warn');
    });

    it('trims trailing newline from resolveTaskPath output', async () => {
        const io = makeMockIo({
            resolveTaskPath: async () => '/tmp/docs/tasks2/0387_example.md\n',
            readTaskFile: async (path) => {
                expect(path).toBe('/tmp/docs/tasks2/0387_example.md');
                return '## Review\nPASS\n## Testing\nRan 2026-04-16T12:00:00Z\n';
            },
        });
        const code = await runCli(['bun', 'postflight-check.ts', '0387'], io);
        expect(code).toBe(0);
    });
});

describe('liveIo — smoke', () => {
    it('exposes all required IO functions and probes', () => {
        expect(typeof liveIo.resolveTaskPath).toBe('function');
        expect(typeof liveIo.readTaskFile).toBe('function');
        expect(typeof liveIo.writeStdout).toBe('function');
        expect(typeof liveIo.writeStderr).toBe('function');
        expect(typeof liveIo.probes.tasksCheck).toBe('function');
        expect(typeof liveIo.probes.gitDiffHasChanges).toBe('function');
        expect(typeof liveIo.probes.gitStatusPaths).toBe('function');
        expect(typeof liveIo.probes.codeMtime).toBe('function');
    });

    it('resolveTaskPath invokes tasks CLI (returns string)', async () => {
        const result = await liveIo.resolveTaskPath('9999');
        expect(typeof result).toBe('string');
    });

    it('writeStdout and writeStderr forward to process streams without throwing', () => {
        expect(() => liveIo.writeStdout('')).not.toThrow();
        expect(() => liveIo.writeStderr('')).not.toThrow();
    });
});
