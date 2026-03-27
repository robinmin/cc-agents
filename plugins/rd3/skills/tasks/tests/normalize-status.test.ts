import { describe, test, expect } from 'bun:test';
import { normalizeStatus, VALID_STATUSES } from '../scripts/types';
import { parseFrontmatter } from '../scripts/lib/taskFile';

describe('normalizeStatus', () => {
    test('returns exact match without normalization', () => {
        for (const status of VALID_STATUSES) {
            const result = normalizeStatus(status);
            expect(result.status).toBe(status);
            expect(result.wasNormalized).toBe(false);
            expect(result.original).toBeUndefined();
        }
    });

    test('normalizes case-insensitive exact matches', () => {
        expect(normalizeStatus('todo').status).toBe('Todo');
        expect(normalizeStatus('TODO').status).toBe('Todo');
        expect(normalizeStatus('wip').status).toBe('WIP');
        expect(normalizeStatus('done').status).toBe('Done');
        expect(normalizeStatus('backlog').status).toBe('Backlog');
        expect(normalizeStatus('BLOCKED').status).toBe('Blocked');

        const result = normalizeStatus('todo');
        expect(result.wasNormalized).toBe(true);
        expect(result.original).toBe('todo');
    });

    test('normalizes common aliases to WIP', () => {
        const wipAliases = ['InProgress', 'in_progress', 'in-progress', 'working', 'active'];
        for (const alias of wipAliases) {
            const result = normalizeStatus(alias);
            expect(result.status).toBe('WIP');
            expect(result.wasNormalized).toBe(true);
            expect(result.original).toBe(alias);
        }
    });

    test('normalizes common aliases to Done', () => {
        for (const alias of ['complete', 'completed', 'finished']) {
            expect(normalizeStatus(alias).status).toBe('Done');
        }
    });

    test('normalizes common aliases to Backlog', () => {
        for (const alias of ['pending', 'queued']) {
            expect(normalizeStatus(alias).status).toBe('Backlog');
        }
    });

    test('normalizes common aliases to Blocked', () => {
        for (const alias of ['hold', 'on-hold', 'onhold', 'waiting']) {
            expect(normalizeStatus(alias).status).toBe('Blocked');
        }
    });

    test("normalizes 'ready' to Todo", () => {
        expect(normalizeStatus('ready').status).toBe('Todo');
    });

    test("normalizes 'review' to Testing", () => {
        expect(normalizeStatus('review').status).toBe('Testing');
    });

    test('defaults unknown values to Backlog with recognized=false', () => {
        const result = normalizeStatus('GarbageStatus');
        expect(result.status).toBe('Backlog');
        expect(result.wasNormalized).toBe(true);
        expect(result.recognized).toBe(false);
        expect(result.original).toBe('GarbageStatus');
    });

    test('recognized=true for valid and alias matches', () => {
        expect(normalizeStatus('WIP').recognized).toBe(true);
        expect(normalizeStatus('wip').recognized).toBe(true);
        expect(normalizeStatus('InProgress').recognized).toBe(true);
        expect(normalizeStatus('completed').recognized).toBe(true);
    });
});

describe('parseFrontmatter status normalization', () => {
    test('normalizes InProgress to WIP', () => {
        const content = `---
name: Test Task
status: InProgress
---

### Background
`;
        const fm = parseFrontmatter(content);
        expect(fm).not.toBeNull();
        expect(fm?.status).toBe('WIP');
    });

    test('normalizes completed to Done', () => {
        const content = `---
name: Test Task
status: completed
---

### Background
`;
        const fm = parseFrontmatter(content);
        expect(fm?.status).toBe('Done');
    });

    test('preserves valid status values', () => {
        for (const status of VALID_STATUSES) {
            const content = `---
name: Test Task
status: ${status}
---

### Background
`;
            const fm = parseFrontmatter(content);
            expect(fm?.status).toBe(status);
        }
    });

    test('defaults missing status to Backlog', () => {
        const content = `---
name: No Status
---

`;
        const fm = parseFrontmatter(content);
        expect(fm?.status).toBe('Backlog');
    });

    test('normalizes unknown status to Backlog', () => {
        const content = `---
name: Test Task
status: FooBarBaz
---

### Background
`;
        const fm = parseFrontmatter(content);
        expect(fm?.status).toBe('Backlog');
    });
});
