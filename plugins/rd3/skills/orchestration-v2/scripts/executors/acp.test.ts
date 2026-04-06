import { describe, test, expect, beforeAll } from 'bun:test';
import type { ExecutionRequest } from '../model';
import type { AcpxQueryResult } from '../../../../scripts/libs/acpx-query';
import { AcpExecutor, ALLOWED_TOOLS } from './acp';
import { setGlobalSilent } from '../../../../scripts/logger';

beforeAll(() => {
  setGlobalSilent(true);
});

// ── Test executor (injectable mock) ──────────────────────────────────────────

interface MockState {
  capturedBin: string;
  capturedArgs: string[];
  capturedTimeout: number | undefined;
  mockResult: AcpxQueryResult;
}

function makeMockExec(state: MockState): (cmd: string[], timeoutMs?: number) => AcpxQueryResult {
  return (bin: string[], timeoutMs?: number) => {
    state.capturedBin = bin[0];
    state.capturedArgs = bin.slice(1);
    state.capturedTimeout = timeoutMs;
    return state.mockResult;
  };
}

function newState(
  ok = true,
  exitCode = 0,
  stdout = '',
  stderr = '',
  durationMs = 10,
  timedOut = false,
): MockState {
  return {
    capturedBin: '',
    capturedArgs: [],
    capturedTimeout: undefined,
    mockResult: { ok, exitCode, stdout, stderr, durationMs, timedOut },
  };
}

const BASE_REQ: ExecutionRequest = {
  skill: 'rd3:request-intake',
  phase: 'intake',
  prompt: 'Process the task',
  payload: {},
  channel: 'pi',
  timeoutMs: 30_000,
  taskRef: 'task-001',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AcpExecutor', () => {
  test('constructor sets agent name, id, and capabilities', () => {
    const exec = new AcpExecutor('codex');
    expect(exec.id).toBe('acp:codex');
    expect(exec.capabilities.parallel).toBe(true);
    expect(exec.capabilities.maxConcurrency).toBe(4);
    expect(exec.capabilities.channels).toContain('codex');
    expect(exec.capabilities.channels).toContain('acp');
  });

  test('ALLOWED_TOOLS constant includes Skill', () => {
    expect(ALLOWED_TOOLS).toContain('Skill');
  });

  test('healthCheck returns healthy when acpx is available', async () => {
    const state = newState(true, 0, 'acpx version 1.0.0');
    const exec = new AcpExecutor('pi', makeMockExec(state));
    const health = await exec.healthCheck();
    expect(health.healthy).toBe(true);
  });

  test('healthCheck returns unhealthy when acpx is absent', async () => {
    const exec = new AcpExecutor('pi');
    const health = await exec.healthCheck();
    // acpx IS available in this environment, so healthy
    expect(health.healthy).toBe(true);
  });

  test('dispose is idempotent', async () => {
    const exec = new AcpExecutor('pi');
    await exec.dispose();
    await expect(exec.dispose()).resolves.toBeUndefined();
  });

  describe('execute()', () => {
    test('passes --allowed-tools with Skill in exec command', async () => {
      const state = newState();
      const exec = new AcpExecutor('pi', makeMockExec(state));
      await exec.execute(BASE_REQ);
      expect(state.capturedArgs).toContain('--allowed-tools');
      const idx = state.capturedArgs.indexOf('--allowed-tools');
      expect(state.capturedArgs[idx + 1]).toContain('Skill');
    });

    test('passes --format json for structured output', async () => {
      const state = newState();
      const exec = new AcpExecutor('pi', makeMockExec(state));
      await exec.execute(BASE_REQ);
      expect(state.capturedArgs).toContain('--format');
      const idx = state.capturedArgs.indexOf('--format');
      expect(state.capturedArgs[idx + 1]).toBe('json');
    });

    test('passes pi exec as the agent subcommand', async () => {
      const state = newState();
      const exec = new AcpExecutor('pi', makeMockExec(state));
      await exec.execute(BASE_REQ);
      expect(state.capturedArgs).toContain('pi');
      const piIdx = state.capturedArgs.indexOf('pi');
      expect(state.capturedArgs[piIdx + 1]).toBe('exec');
    });

    test('converts timeout from ms to seconds', async () => {
      const state = newState();
      const exec = new AcpExecutor('pi', makeMockExec(state));
      await exec.execute({ ...BASE_REQ, timeoutMs: 90_000 });
      expect(state.capturedArgs).toContain('--timeout');
      const idx = state.capturedArgs.indexOf('--timeout');
      expect(state.capturedArgs[idx + 1]).toBe('90');
    });

    test('--timeout is positioned before the agent (global option)', async () => {
      const state = newState();
      const exec = new AcpExecutor('pi', makeMockExec(state));
      await exec.execute(BASE_REQ);
      const timeoutIdx = state.capturedArgs.indexOf('--timeout');
      const piIdx = state.capturedArgs.indexOf('pi');
      expect(timeoutIdx).toBeGreaterThan(0);
      expect(piIdx).toBeGreaterThan(timeoutIdx);
    });

    test('passes --non-interactive-permissions deny', async () => {
      const state = newState();
      const exec = new AcpExecutor('pi', makeMockExec(state));
      await exec.execute(BASE_REQ);
      expect(state.capturedArgs).toContain('--non-interactive-permissions');
      const idx = state.capturedArgs.indexOf('--non-interactive-permissions');
      expect(state.capturedArgs[idx + 1]).toBe('deny');
    });

    test('returns success for zero exit code', async () => {
      const state = newState(true, 0, '{"type":"done"}\n');
      const exec = new AcpExecutor('pi', makeMockExec(state));
      const result = await exec.execute(BASE_REQ);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    test('returns failure for non-zero exit code', async () => {
      const state = newState(false, 1, '', 'Internal error');
      const exec = new AcpExecutor('pi', makeMockExec(state));
      const result = await exec.execute(BASE_REQ);
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBe('Internal error');
    });

    test('returns timed-out on timedOut flag', async () => {
      const state = newState(false, 1, '', '', 10, true);
      const exec = new AcpExecutor('pi', makeMockExec(state));
      const result = await exec.execute({ ...BASE_REQ, timeoutMs: 50 });
      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
    });
  });

  describe('prompt building', () => {
    function _capturePrompt(exec: AcpExecutor, req: ExecutionRequest): string {
      const state = newState();
      const _capturingExec = new AcpExecutor('pi', makeMockExec(state));
      // biome-ignore lint/suspicious/noExplicitAny: test helper
      (exec as any).execute(req);
      return state.capturedArgs[state.capturedArgs.length - 1];
    }

    test('prompt starts with Skill execution directive', async () => {
      const state = newState();
      const exec = new AcpExecutor('pi', makeMockExec(state));
      await exec.execute(BASE_REQ);
      const prompt = state.capturedArgs[state.capturedArgs.length - 1];
      expect(prompt).toContain('Skill execution:');
      expect(prompt).toContain('rd3:request-intake');
    });

    test('prompt includes phase and task context', async () => {
      const state = newState();
      const exec = new AcpExecutor('pi', makeMockExec(state));
      await exec.execute({ ...BASE_REQ, phase: 'implement', taskRef: 'task-xyz' });
      const prompt = state.capturedArgs[state.capturedArgs.length - 1];
      expect(prompt).toContain('phase: implement');
      expect(prompt).toContain('task: task-xyz');
    });

    test('prompt includes payload as JSON', async () => {
      const state = newState();
      const exec = new AcpExecutor('pi', makeMockExec(state));
      await exec.execute({ ...BASE_REQ, payload: { coverage: 90 } });
      const prompt = state.capturedArgs[state.capturedArgs.length - 1];
      expect(prompt).toContain('"coverage":90');
    });

    test('prompt includes rework iteration', async () => {
      const state = newState();
      const exec = new AcpExecutor('pi', makeMockExec(state));
      await exec.execute({ ...BASE_REQ, reworkIteration: 2, reworkMax: 3 });
      const prompt = state.capturedArgs[state.capturedArgs.length - 1];
      expect(prompt).toContain('rework: iteration 2/3');
    });

    test('prompt includes feedback', async () => {
      const state = newState();
      const exec = new AcpExecutor('pi', makeMockExec(state));
      await exec.execute({ ...BASE_REQ, feedback: 'Improve coverage' });
      const prompt = state.capturedArgs[state.capturedArgs.length - 1];
      expect(prompt).toContain('feedback: Improve coverage');
    });

    test('prompt instructs agent to invoke Skill() immediately', async () => {
      const state = newState();
      const exec = new AcpExecutor('pi', makeMockExec(state));
      await exec.execute(BASE_REQ);
      const prompt = state.capturedArgs[state.capturedArgs.length - 1];
      expect(prompt).toContain('Invoke Skill("rd3:request-intake")');
    });

    test('prompt requests JSON output from skill', async () => {
      const state = newState();
      const exec = new AcpExecutor('pi', makeMockExec(state));
      await exec.execute(BASE_REQ);
      const prompt = state.capturedArgs[state.capturedArgs.length - 1];
      expect(prompt).toContain('```json');
    });

    test('prompt omits payload section when payload is empty', async () => {
      const state = newState();
      const exec = new AcpExecutor('pi', makeMockExec(state));
      await exec.execute(BASE_REQ);
      const prompt = state.capturedArgs[state.capturedArgs.length - 1];
      const payloadLines = prompt.split('\n').filter((l) => l.startsWith('  payload:'));
      expect(payloadLines).toHaveLength(0);
    });

    test('prompt omits task when taskRef is absent', async () => {
      const state = newState();
      const exec = new AcpExecutor('pi', makeMockExec(state));
      const reqNoTask: ExecutionRequest = {
        skill: BASE_REQ.skill,
        phase: BASE_REQ.phase,
        prompt: BASE_REQ.prompt,
        payload: BASE_REQ.payload,
        channel: BASE_REQ.channel,
        timeoutMs: BASE_REQ.timeoutMs,
      };
      await exec.execute(reqNoTask);
      const prompt = state.capturedArgs[state.capturedArgs.length - 1];
      expect(prompt).toContain('task: (none)');
    });
  });

  describe('output parsing', () => {
    test('extracts structured data from NDJSON structured event', async () => {
      const state = newState(true, 0, '{"type":"structured","data":{"result":"ok"}}\n');
      const exec = new AcpExecutor('pi', makeMockExec(state));
      const result = await exec.execute(BASE_REQ);
      expect(result.structured).toEqual({ result: 'ok' });
    });

    test('extracts resource usage from NDJSON usage events', async () => {
      const state = newState(
        true,
        0,
        '{"type":"usage","usage":{"model_id":"gpt-4","input_tokens":100,"output_tokens":50,"wall_clock_ms":1000,"execution_ms":800}}\n',
      );
      const exec = new AcpExecutor('pi', makeMockExec(state));
      const result = await exec.execute(BASE_REQ);
      expect(result.resources ?? []).toHaveLength(1);
      expect(result.resources?.[0].model_id).toBe('gpt-4');
      expect(result.resources?.[0].input_tokens).toBe(100);
    });

    test('extracts JSON code block from text output as structured result', async () => {
      const stdout = 'Skill executed.\n```json\n{"status":"done","items":3}\n\n```\nFinal output.';
      const state = newState(true, 0, stdout);
      const exec = new AcpExecutor('pi', makeMockExec(state));
      const result = await exec.execute(BASE_REQ);
      expect(result.structured).toEqual({ status: 'done', items: 3 });
    });

    test('skips invalid JSON lines gracefully', async () => {
      const state = newState(
        true,
        0,
        'not json\n{"broken:\n{"type":"usage","usage":{"model_id":"x","input_tokens":1,"output_tokens":1,"wall_clock_ms":1,"execution_ms":1}}\n',
      );
      const exec = new AcpExecutor('pi', makeMockExec(state));
      const result = await exec.execute(BASE_REQ);
      expect(result.resources ?? []).toHaveLength(1);
    });

    test('ignores non-JSON code blocks', async () => {
      const state = newState(true, 0, '```typescript\nconst x = 1;\n```\n');
      const exec = new AcpExecutor('pi', makeMockExec(state));
      const result = await exec.execute(BASE_REQ);
      expect(result.structured).toBeUndefined();
    });

    test('extracts deeply nested JSON (no truncation)', async () => {
      const stdout =
        '```json\n' +
        '{"status":"ok","config":{"retry":{"attempts":3,"backoff":{"type":"exponential","ms":500}},"timeout":60}}\n' +
        '```\n';
      const state = newState(true, 0, stdout);
      const exec = new AcpExecutor('pi', makeMockExec(state));
      const result = await exec.execute(BASE_REQ);
      expect(result.structured).toEqual({
        status: 'ok',
        config: { retry: { attempts: 3, backoff: { type: 'exponential', ms: 500 } }, timeout: 60 },
      });
    });

    test('extracts JSON when closing fence is on the same line', async () => {
      const stdout = '```json\n{"key":"value"}```\n';
      const state = newState(true, 0, stdout);
      const exec = new AcpExecutor('pi', makeMockExec(state));
      const result = await exec.execute(BASE_REQ);
      expect(result.structured).toEqual({ key: 'value' });
    });

    test('extracts fenced JSON that contains escaped quotes', async () => {
      const stdout = '```json\n{"summary":"x\\\\\\"y","status":"ok"}\n```\n';
      const state = newState(true, 0, stdout);
      const exec = new AcpExecutor('pi', makeMockExec(state));
      const result = await exec.execute(BASE_REQ);
      expect(result.structured).toEqual({ summary: 'x\\"y', status: 'ok' });
    });

    test('returns undefined for truncated JSON (unbalanced braces)', async () => {
      const stdout = '```json\n{"status":"ok","items":[1,2,3}\n```\n';
      const state = newState(true, 0, stdout);
      const exec = new AcpExecutor('pi', makeMockExec(state));
      const result = await exec.execute(BASE_REQ);
      expect(result.structured).toBeUndefined();
    });

    test('silently handles usage event without usage field', async () => {
      const state = newState(true, 0, '{"type":"usage"}\n{"type":"log","msg":"hi"}\n');
      const exec = new AcpExecutor('pi', makeMockExec(state));
      const result = await exec.execute(BASE_REQ);
      expect(result.resources ?? []).toEqual([]);
    });

    test('extracts multiple usage events', async () => {
      const state = newState(
        true,
        0,
        [
          '{"type":"usage","usage":{"model_id":"x","input_tokens":10,"output_tokens":5,"wall_clock_ms":100,"execution_ms":80}}',
          '{"type":"usage","usage":{"model_id":"y","input_tokens":20,"output_tokens":10,"wall_clock_ms":200,"execution_ms":150}}',
        ].join('\n') + '\n',
      );
      const exec = new AcpExecutor('pi', makeMockExec(state));
      const result = await exec.execute(BASE_REQ);
      expect(result.resources ?? []).toHaveLength(2);
      expect(result.resources?.[0].model_id).toBe('x');
      expect(result.resources?.[1].model_id).toBe('y');
    });

    test('includes optional cache and timing fields', async () => {
      const state = newState(
        true,
        0,
        '{"type":"usage","usage":{"model_id":"x","input_tokens":1,"output_tokens":1,"wall_clock_ms":1,"execution_ms":1,"cache_read_tokens":5,"cache_creation_tokens":3,"first_token_ms":50}}\n',
      );
      const exec = new AcpExecutor('pi', makeMockExec(state));
      const result = await exec.execute(BASE_REQ);
      expect(result.resources?.[0]).toHaveProperty('cache_read_tokens', 5);
      expect(result.resources?.[0]).toHaveProperty('cache_creation_tokens', 3);
      expect(result.resources?.[0]).toHaveProperty('first_token_ms', 50);
    });

    test('omits optional fields when null or missing', async () => {
      const state = newState(
        true,
        0,
        '{"type":"usage","usage":{"model_id":"x","input_tokens":1,"output_tokens":1,"wall_clock_ms":1,"execution_ms":1,"cache_read_tokens":null}}\n',
      );
      const exec = new AcpExecutor('pi', makeMockExec(state));
      const result = await exec.execute(BASE_REQ);
      expect(result.resources?.[0]).not.toHaveProperty('cache_read_tokens');
    });

    test('structured NDJSON event takes precedence over JSON code block', async () => {
      const state = newState(
        true,
        0,
        'Output:\n```json\n{"from":"codeblock"}\n```\n{"type":"structured","data":{"from":"event"}}\n',
      );
      const exec = new AcpExecutor('pi', makeMockExec(state));
      const result = await exec.execute(BASE_REQ);
      // Structured event takes precedence (processed first in NDJSON pass)
      expect(result.structured).toEqual({ from: 'event' });
    });
  });
});
