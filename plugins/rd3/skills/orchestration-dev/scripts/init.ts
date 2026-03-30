// dev-init — validate project readiness for rd3:orchestration-dev

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { err, ok, type Result } from '../../tasks/scripts/lib/result';
import { runInit } from '../../tasks/scripts/commands/init';
import { logger } from '../../../scripts/logger';

// --- Types ---

export type StackType = 'typescript-bun-biome' | 'python-uv-ruff' | 'go-mod' | 'unknown';

export interface StackCheck {
    name: string;
    present: boolean;
    detail: string;
}

export interface ReadinessReport {
    projectRoot: string;
    stack: StackType;
    tasksInfra: { ready: boolean; checks: StackCheck[] };
    stackFiles: { ready: boolean; checks: StackCheck[] };
    requiredScripts: { ready: boolean; checks: StackCheck[] };
    overall: boolean;
}

// --- Stack Detection ---

const STACK_SIGNATURES: { stack: StackType; files: string[] }[] = [
    {
        stack: 'typescript-bun-biome',
        files: ['package.json', 'tsconfig.json', 'biome.json'],
    },
    { stack: 'python-uv-ruff', files: ['pyproject.toml', 'ruff.toml'] },
    { stack: 'go-mod', files: ['go.mod'] },
];

export function detectStack(projectRoot: string): StackType {
    for (const { stack, files } of STACK_SIGNATURES) {
        if (files.every((f) => existsSync(resolve(projectRoot, f)))) {
            return stack;
        }
    }
    return 'unknown';
}

// --- Validation Functions ---

const TASKS_INFRA_FILES = [
    { name: 'docs/.tasks/config.jsonc', path: 'docs/.tasks/config.jsonc' },
    { name: 'docs/.tasks/task.md', path: 'docs/.tasks/task.md' },
    { name: 'docs/tasks/', path: 'docs/tasks' },
    { name: 'docs/prompts/', path: 'docs/prompts' },
];

export function validateTasksInfra(projectRoot: string): {
    ready: boolean;
    checks: StackCheck[];
} {
    const checks: StackCheck[] = TASKS_INFRA_FILES.map(({ name, path }) => {
        const full = resolve(projectRoot, path);
        const present = existsSync(full);
        return { name, present, detail: present ? 'found' : 'missing' };
    });
    return { ready: checks.every((c) => c.present), checks };
}

const STACK_REQUIRED_FILES: Partial<Record<StackType, string[]>> = {
    'typescript-bun-biome': ['package.json', 'tsconfig.json', 'biome.json'],
    'python-uv-ruff': ['pyproject.toml'],
    'go-mod': ['go.mod'],
};

export function validateStackFiles(projectRoot: string, stack: StackType): { ready: boolean; checks: StackCheck[] } {
    const required = STACK_REQUIRED_FILES[stack];
    if (!required) {
        return {
            ready: false,
            checks: [
                {
                    name: 'Unknown stack',
                    present: false,
                    detail: 'No recognized project files found',
                },
            ],
        };
    }

    const checks: StackCheck[] = required.map((f) => {
        const present = existsSync(resolve(projectRoot, f));
        return { name: f, present, detail: present ? 'found' : 'missing' };
    });
    return { ready: checks.every((c) => c.present), checks };
}

const REQUIRED_SCRIPTS: Partial<Record<StackType, string[][]>> = {
    'typescript-bun-biome': [['typecheck'], ['lint', 'lint:rd3'], ['test', 'test:rd3']],
};

export function validateRequiredScripts(
    projectRoot: string,
    stack: StackType,
): { ready: boolean; checks: StackCheck[] } {
    const scriptGroups = REQUIRED_SCRIPTS[stack];
    if (!scriptGroups) {
        return { ready: true, checks: [] };
    }

    let pkgScripts: Record<string, unknown> = {};
    try {
        const raw = readFileSync(resolve(projectRoot, 'package.json'), 'utf-8');
        const parsed = JSON.parse(raw) as { scripts?: Record<string, unknown> };
        pkgScripts = parsed.scripts ?? {};
    } catch {
        // package.json missing or invalid — all checks fail
    }

    const checks: StackCheck[] = scriptGroups.map((aliases) => {
        const found = aliases.find((a) => a in pkgScripts);
        const present = found !== undefined;
        return {
            name: aliases.join(' | '),
            present,
            detail: present ? `found: ${found}` : `not found in package.json scripts (tried: ${aliases.join(', ')})`,
        };
    });
    return { ready: checks.every((c) => c.present), checks };
}

// --- Report ---

export function generateReport(projectRoot: string, stackOverride?: StackType): ReadinessReport {
    const stack = stackOverride ?? detectStack(projectRoot);
    const tasksInfra = validateTasksInfra(projectRoot);
    const stackFiles = validateStackFiles(projectRoot, stack);
    const requiredScripts = validateRequiredScripts(projectRoot, stack);
    const overall = tasksInfra.ready && stackFiles.ready && requiredScripts.ready;

    return { projectRoot, stack, tasksInfra, stackFiles, requiredScripts, overall };
}

export function formatReport(report: ReadinessReport): string {
    const lines: string[] = [];
    const mark = (present: boolean) => (present ? '[OK]' : '[X]');

    lines.push(`Stack: ${report.stack}${report.stack === 'unknown' ? ' (not recognized)' : ''}`);
    lines.push('');

    // Task infrastructure
    lines.push('Task Infrastructure:');
    for (const c of report.tasksInfra.checks) {
        lines.push(`  ${mark(c.present)} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
    }
    lines.push('');

    // Stack files
    lines.push('Stack Configuration:');
    for (const c of report.stackFiles.checks) {
        lines.push(`  ${mark(c.present)} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
    }
    lines.push('');

    // Required scripts
    if (report.requiredScripts.checks.length > 0) {
        lines.push('Required Scripts:');
        for (const c of report.requiredScripts.checks) {
            lines.push(`  ${mark(c.present)} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
        }
        lines.push('');
    }

    const issueCount = [
        ...report.tasksInfra.checks,
        ...report.stackFiles.checks,
        ...report.requiredScripts.checks,
    ].filter((c) => !c.present).length;

    if (report.overall) {
        lines.push('Overall: READY');
    } else {
        lines.push(`Overall: NOT READY (${issueCount} issue${issueCount !== 1 ? 's' : ''})`);
    }

    return lines.join('\n');
}

// --- Main Entry ---

export function runDevInit(projectRoot: string, stackOverride?: StackType): Result<ReadinessReport> {
    const initResult = runInit(projectRoot);
    if (!initResult.ok) {
        return err(initResult.error);
    }

    const report = generateReport(projectRoot, stackOverride);
    logger.log(formatReport(report));
    return ok(report);
}

export function parseArgs(argv: string[]): { stack?: StackType; json: boolean } {
    let stack: StackType | undefined;
    let json = false;

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--json') {
            json = true;
        } else if (arg.startsWith('--stack=')) {
            stack = arg.slice('--stack='.length) as StackType;
        } else if (arg === '--stack' && i + 1 < argv.length) {
            stack = argv[++i] as StackType;
        }
    }

    if (stack !== undefined) {
        return { stack, json };
    }
    return { json };
}

// CLI entry point — coverage gap is expected: spawnSync-based tests don't count toward in-process coverage
if (import.meta.main) {
    const { stack, json } = parseArgs(process.argv.slice(2));
    const projectRoot = process.cwd();

    if (json) {
        const report = generateReport(projectRoot, stack);
        logger.log(JSON.stringify(report, null, 2));
        process.exit(report.overall ? 0 : 1);
    }

    const result = runDevInit(projectRoot, stack);
    if (!result.ok) {
        logger.error(result.error);
        process.exit(1);
    }
    process.exit(result.value.overall ? 0 : 1);
}
