import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ExecutionRequest } from '../model';
import { setGlobalSilent } from '../../../../scripts/logger';
import { LocalExecutor } from './local';

beforeAll(() => {
    setGlobalSilent(true);
});

function makeRequest(skill = 'rd3:demo-skill'): ExecutionRequest {
    return {
        skill,
        phase: 'implement',
        prompt: 'Run local phase',
        payload: { task_ref: '0367' },
        channel: 'local',
        timeoutMs: 5000,
    };
}

describe('LocalExecutor', () => {
    let rootDir: string;

    afterEach(() => {
        if (rootDir) {
            rmSync(rootDir, { recursive: true, force: true });
            rootDir = '';
        }
    });

    test('has id "local" and registers only the local channel', () => {
        const exec = new LocalExecutor('/tmp/does-not-matter');
        expect(exec.id).toBe('local');
        expect(exec.capabilities.channels).toEqual(['local']);
        expect(exec.capabilities.streaming).toBe(true);
    });

    test('fails clearly when skill does not expose an in-process entrypoint', async () => {
        rootDir = mkdtempSync(join(tmpdir(), 'orch-v2-local-'));
        const exec = new LocalExecutor(rootDir);

        const result = await exec.execute(makeRequest('rd3:missing-skill'));

        expect(result.success).toBe(false);
        expect(result.stderr).toContain('does not expose a local in-process entrypoint');
        expect(result.stderr).toContain('executor.mode: direct');
    });

    test('loads scripts/local.ts and executes it in-process', async () => {
        rootDir = mkdtempSync(join(tmpdir(), 'orch-v2-local-'));
        const skillDir = join(rootDir, 'rd3', 'demo-skill', 'scripts');
        mkdirSync(skillDir, { recursive: true });
        writeFileSync(
            join(skillDir, 'local.ts'),
            [
                'export async function runLocalPhase(req) {',
                '  return {',
                '    success: true,',
                '    exitCode: 0,',
                '    stdout: "local:" + req.phase + ":" + req.payload.task_ref,',
                '    durationMs: 12,',
                '    timedOut: false,',
                '  };',
                '}',
                '',
            ].join('\n'),
        );

        const exec = new LocalExecutor(rootDir);
        const result = await exec.execute(makeRequest());

        expect(result.success).toBe(true);
        expect(result.stdout).toBe('local:implement:0367');
        expect(result.durationMs).toBe(12);
    });
});
