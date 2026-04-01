import { describe, test, expect, beforeEach, beforeAll } from 'bun:test';
import { HookRegistry, type HookContext } from '../scripts/engine/hooks';
import type { HookAction } from '../scripts/model';
import { setGlobalSilent } from '../../../scripts/logger';

beforeAll(() => {
    setGlobalSilent(true);
});

describe('HookRegistry', () => {
    let registry: HookRegistry;

    beforeEach(() => {
        registry = new HookRegistry();
    });

    test('starts empty', () => {
        expect(registry.getHookCount()).toBe(0);
    });

    test('register adds hooks', () => {
        const action: HookAction = { run: 'echo hello' };
        registry.register('on-phase-start', action);
        expect(registry.getHookCount('on-phase-start')).toBe(1);
        expect(registry.getHookCount()).toBe(1);
    });

    test('register accumulates hooks', () => {
        registry.register('on-phase-start', { run: 'echo 1' });
        registry.register('on-phase-start', { run: 'echo 2' });
        expect(registry.getHookCount('on-phase-start')).toBe(2);
    });

    test('clear removes all hooks', () => {
        registry.register('on-phase-start', { run: 'echo 1' });
        registry.register('on-phase-complete', { run: 'echo 2' });
        registry.clear();
        expect(registry.getHookCount()).toBe(0);
    });

    test('getHookCount returns 0 for unknown hook', () => {
        expect(registry.getHookCount('nonexistent')).toBe(0);
    });

    test('loadFromPipeline loads all hook types', () => {
        registry.loadFromPipeline({
            'on-phase-start': [{ run: 'echo start' }],
            'on-phase-complete': [{ run: 'echo complete' }],
            'on-phase-failure': [{ run: 'echo fail' }],
        });
        expect(registry.getHookCount('on-phase-start')).toBe(1);
        expect(registry.getHookCount('on-phase-complete')).toBe(1);
        expect(registry.getHookCount('on-phase-failure')).toBe(1);
        expect(registry.getHookCount()).toBe(3);
    });

    test('loadFromPipeline handles undefined', () => {
        registry.loadFromPipeline(undefined);
        expect(registry.getHookCount()).toBe(0);
    });

    test('loadFromPipeline handles empty hooks', () => {
        registry.loadFromPipeline({});
        expect(registry.getHookCount()).toBe(0);
    });

    test('execute runs shell hooks', async () => {
        registry.register('on-phase-start', { run: 'echo test-output' });
        const context: HookContext = {
            task_ref: '0300',
            run_id: 'run-test',
        };
        // Should not throw
        await registry.execute('on-phase-start', context);
    });

    test('execute handles non-existent hook gracefully', async () => {
        const context: HookContext = {
            task_ref: '0300',
            run_id: 'run-test',
        };
        // Should not throw
        await registry.execute('nonexistent', context);
    });

    test('execute handles failing hook gracefully', async () => {
        registry.register('on-phase-start', { run: 'false' });
        const context: HookContext = {
            task_ref: '0300',
            run_id: 'run-test',
        };
        // Should not throw even when hook fails
        await registry.execute('on-phase-start', context);
    });

    test('execute interpolates template variables', async () => {
        registry.register('on-phase-start', {
            run: 'echo {{phase}} {{task_ref}} {{run_id}}',
        });
        const context: HookContext = {
            phase: 'implement',
            task_ref: '0300',
            run_id: 'run-abc',
        };
        await registry.execute('on-phase-start', context);
    });
});
