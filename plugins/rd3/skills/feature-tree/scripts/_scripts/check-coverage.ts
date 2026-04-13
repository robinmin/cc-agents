#!/usr/bin/env bun
/**
 * Coverage gate: enforces per-file line coverage >= 90% AND detects missing tests.
 *
 * Adapted from typescript-bun-starter for ftree.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const COVERAGE_FILE = resolve(import.meta.dir, '..', 'coverage', 'lcov.info');
const THRESHOLD = 90;

const NO_TEST_REQUIRED = new Set([
    'packages/core/src/db/schema.ts',
    'packages/core/src/db/client.ts',
    'packages/core/src/lib/dao/sql.ts',
    'packages/core/src/types/result.ts',
    'packages/core/src/types/feature.ts',
    'packages/core/src/schemas/feature.ts',
    'packages/core/src/index.ts',
    'packages/core/src/logger.ts',
    'apps/cli/src/index.ts',
    'apps/cli/src/config.ts',
]);

const SRC_DIRS = ['packages/core/src', 'apps/cli/src'];

function collectTsFiles(dir: string, root: string): string[] {
    const results: string[] = [];
    if (!existsSync(dir)) return results;

    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const stat = statSync(full);
        if (stat.isDirectory()) {
            results.push(...collectTsFiles(full, root));
        } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
            results.push(relative(root, full));
        }
    }
    return results;
}

function expectedTestPath(srcFile: string): string {
    const idx = srcFile.indexOf('/src/');
    if (idx === -1) return '';
    const pkg = srcFile.slice(0, idx);
    const relPath = srcFile.slice(idx + '/src/'.length);
    const testRel = relPath.replace(/\.ts$/, '.test.ts');
    return `${pkg}/tests/${testRel}`;
}

const projectRoot = resolve(import.meta.dir, '..');

if (!existsSync(COVERAGE_FILE)) {
    console.error('No coverage file found at', COVERAGE_FILE);
    console.error('Run `bun test --coverage` first.');
    process.exit(1);
}

const lcov = readFileSync(COVERAGE_FILE, 'utf-8');

interface FileCoverage {
    file: string;
    linesFound: number;
    linesHit: number;
}

const coveredFiles: FileCoverage[] = [];
let current: Partial<FileCoverage> | null = null;

for (const line of lcov.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('SF:')) {
        current = { file: trimmed.slice(3) };
    } else if (trimmed.startsWith('LF:') && current) {
        current.linesFound = Number(trimmed.slice(3));
    } else if (trimmed.startsWith('LH:') && current) {
        current.linesHit = Number(trimmed.slice(3));
    } else if (trimmed === 'end_of_record' && current?.file) {
        coveredFiles.push(current as FileCoverage);
        current = null;
    }
}

const coverageFailures: { file: string; pct: number }[] = [];

for (const entry of coveredFiles) {
    if (
        entry.file.includes('node_modules') ||
        entry.file.includes('__tests__') ||
        entry.file.includes('.test.') ||
        entry.file.includes('.spec.') ||
        entry.file.includes('/drizzle/') ||
        entry.file.includes('_scripts/')
    ) {
        continue;
    }

    if (entry.linesFound === 0) continue;

    const pct = Math.round((entry.linesHit / entry.linesFound) * 100);

    if (pct < THRESHOLD) {
        coverageFailures.push({ file: entry.file, pct });
    }
}

const allSourceFiles = new Set<string>();
for (const srcDir of SRC_DIRS) {
    const absDir = join(projectRoot, srcDir);
    for (const f of collectTsFiles(absDir, projectRoot)) {
        allSourceFiles.add(f);
    }
}

const coveredSet = new Set(coveredFiles.map((e) => (e.file.startsWith('/') ? relative(projectRoot, e.file) : e.file)));

const missingTests: string[] = [];

for (const srcFile of allSourceFiles) {
    if (NO_TEST_REQUIRED.has(srcFile)) continue;
    if (!coveredSet.has(srcFile)) continue;
    const testPath = expectedTestPath(srcFile);
    if (!testPath) continue;
    const absTestPath = join(projectRoot, testPath);
    if (!existsSync(absTestPath)) {
        missingTests.push(srcFile);
    }
}

let failed = false;

if (coverageFailures.length > 0) {
    console.error(`\nCoverage gate failed: ${coverageFailures.length} file(s) below ${THRESHOLD}%\n`);
    for (const { file, pct } of coverageFailures) {
        console.error(`  ${pct}%  ${file}`);
    }
    console.error('');
    failed = true;
}

if (missingTests.length > 0) {
    console.error(`Missing tests: ${missingTests.length} source file(s) have no test file\n`);
    for (const srcFile of missingTests) {
        const testPath = expectedTestPath(srcFile);
        console.error(`  ${srcFile}`);
        console.error(`    expected: ${testPath}`);
    }
    console.error('');
    console.error('If this is intentional, add the file to NO_TEST_REQUIRED in _scripts/check-coverage.ts');
    console.error('');
    failed = true;
}

if (failed) {
    process.exit(1);
}

console.log(`Coverage gate passed: all source files >= ${THRESHOLD}% and all testable files have tests`);
