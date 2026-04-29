#!/usr/bin/env bun

import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

export interface HookOutput {
    continue: boolean;
    suppressOutput: boolean;
    systemMessage: string;
}

export interface TokenLedger {
    lifetime?: {
        estimated_savings_vs_bare_cli?: number;
        total_sessions?: number;
        total_tokens_estimated?: number;
    };
}

export interface BugEntry {
    error_message?: string;
    file?: string;
}

export function readText(path: string): string | undefined {
    if (!existsSync(path)) return undefined;
    try {
        return readFileSync(path, 'utf8');
    } catch {
        return undefined;
    }
}

export function readJson<T>(path: string): T | undefined {
    const text = readText(path);
    if (!text) return undefined;
    try {
        return JSON.parse(text) as T;
    } catch {
        return undefined;
    }
}

export function extractSection(markdown: string, heading: string, limit = 5): string[] {
    const lines = markdown.split(/\r?\n/);
    const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase());
    if (start === -1) return [];

    const entries: string[] = [];
    for (const line of lines.slice(start + 1)) {
        if (line.startsWith('## ')) break;
        const trimmed = line.trim();
        if (trimmed.startsWith('- ')) {
            entries.push(trimmed);
        }
        if (entries.length >= limit) break;
    }
    return entries;
}

export function extractAnatomySummary(anatomy: string | undefined): { files: string; scanned: string } {
    if (!anatomy) return { files: 'unknown', scanned: 'unknown' };
    const header = anatomy.split(/\r?\n/).slice(0, 8).join('\n');
    const filesMatch = header.match(/Files:\s*([0-9]+)\s+tracked/i);
    const scannedMatch = header.match(/Last scanned:\s*([^\n|]+)/i);
    return {
        files: filesMatch?.[1] ?? 'unknown',
        scanned: scannedMatch?.[1]?.trim() ?? 'unknown',
    };
}

export function extractProjectName(projectRoot: string, identity: string | undefined): string {
    if (!identity) return basename(projectRoot);
    const explicitName = identity.match(/(?:^|\n)(?:#\s*)?(?:Project|Name):\s*(.+)/i)?.[1]?.trim();
    if (explicitName) return explicitName;
    const heading = identity.match(/^#\s+(.+)$/m)?.[1]?.trim();
    return heading || basename(projectRoot);
}

export function createOutput(systemMessage: string): HookOutput {
    return {
        continue: true,
        suppressOutput: false,
        systemMessage,
    };
}

export function formatList(entries: string[], emptyText: string): string {
    return entries.length > 0 ? entries.join('\n') : `- ${emptyText}`;
}

export function buildSessionStartOutput(projectRoot: string): HookOutput {
    const wolfDir = join(projectRoot, '.wolf');

    if (!existsSync(wolfDir)) {
        const message = [
            'No .wolf/ directory found in this project. To enable project intelligence:',
            '1. Install OpenWolf: npm install -g openwolf',
            '2. Initialize: openwolf init',
        ].join('\n');
        return createOutput(message);
    }

    const anatomy = readText(join(wolfDir, 'anatomy.md'));
    const cerebrum = readText(join(wolfDir, 'cerebrum.md'));
    const identity = readText(join(wolfDir, 'identity.md'));
    const ledger = readJson<TokenLedger>(join(wolfDir, 'token-ledger.json'));
    const buglog = readJson<BugEntry[]>(join(wolfDir, 'buglog.json')) ?? [];

    const anatomySummary = extractAnatomySummary(anatomy);
    const lifetime = ledger?.lifetime;
    const doNotRepeat = cerebrum ? extractSection(cerebrum, 'Do-Not-Repeat', 8) : [];
    const learnings = cerebrum ? extractSection(cerebrum, 'Key Learnings', 3) : [];
    const recentBugs = buglog
        .slice(-3)
        .reverse()
        .map((bug) => `- ${bug.error_message ?? 'Unknown bug'}${bug.file ? ` in ${bug.file}` : ''}`);

    const reminders: string[] = [];
    if (doNotRepeat.length + learnings.length < 3) {
        reminders.push('- cerebrum.md is sparse: record user preferences and conventions as you work');
    }
    if (buglog.length === 0) {
        reminders.push('- buglog.json is empty: log bugs you encounter or fix');
    }

    const message = [
        '## OpenWolf Context Loaded',
        '',
        `**Project:** ${extractProjectName(projectRoot, identity)}`,
        `**Files tracked:** ${anatomySummary.files} | **Last scanned:** ${anatomySummary.scanned}`,
        `**Token savings:** ${lifetime?.estimated_savings_vs_bare_cli ?? 0} tokens across ${lifetime?.total_sessions ?? 0} sessions`,
        `**Active warnings:** ${doNotRepeat.length} Do-Not-Repeat rules`,
        `**Bug memory:** ${buglog.length} known bugs`,
        '',
        '### Do-Not-Repeat',
        formatList(doNotRepeat, 'No Do-Not-Repeat entries found'),
        '',
        '### Recent Learnings',
        formatList(learnings, 'No recent learnings found'),
        '',
        '### Known Bugs (last 3)',
        formatList(recentBugs, 'No known bugs found'),
        reminders.length > 0 ? `\n### Reminders\n${reminders.join('\n')}` : '',
        '',
        'Use rd3:indexed-context for detailed file lookups, design QC, framework selection, and OpenWolf operations.',
    ]
        .filter((line) => line !== '')
        .join('\n');

    return createOutput(message);
}

export function main() {
    const projectRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    process.stdout.write(`${JSON.stringify(buildSessionStartOutput(projectRoot))}\n`);
}

if (import.meta.main) {
    main();
}
