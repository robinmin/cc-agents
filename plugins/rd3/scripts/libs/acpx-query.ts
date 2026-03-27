/**
 * Shared acpx-based LLM query wrapper.
 *
 * Replaces the raw CLI spawn + temp file pattern in verification-chain/llm.ts.
 * Uses acpx (Agent Client Protocol CLI) for structured LLM queries.
 *
 * Based on the pattern in anti-hallucination/scripts/acpx_agent_wrapper.ts
 * but focused on generic LLM queries rather than validation.
 */

export interface AcpxQueryOptions {
  /** Agent to use. Default: ACPX_AGENT env or "claude" */
  agent?: string;
  /** Path to acpx binary. Default: ACPX_BIN env or "acpx" */
  acpxBin?: string;
  /** Output format. Default: "quiet" (final answer only) */
  format?: "text" | "json" | "quiet";
  /** Timeout in milliseconds. Optional. */
  timeout?: number;
}

export interface AcpxQueryResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  ok: boolean;
}

export function getEnv(key: string): string | undefined {
  return (import.meta as { env: Record<string, string | undefined> }).env[key];
}

interface ResolvedOptions {
  agent: string;
  acpxBin: string;
  format: "text" | "json" | "quiet";
  timeout: number | undefined;
}

function resolveOptions(options?: AcpxQueryOptions): ResolvedOptions {
  return {
    agent: options?.agent ?? getEnv("ACPX_AGENT") ?? "claude",
    acpxBin: options?.acpxBin ?? getEnv("ACPX_BIN") ?? "acpx",
    format: options?.format ?? "quiet",
    timeout: options?.timeout,
  };
}

/**
 * Build the command array for an acpx exec query.
 */
export function buildAcpxCommand(
  prompt: string,
  options?: AcpxQueryOptions,
): string[] {
  const resolved = resolveOptions(options);
  return [resolved.acpxBin, "--format", resolved.format, resolved.agent, "exec", prompt];
}

/**
 * Build the command array for an acpx exec query reading from a file.
 */
export function buildAcpxFileCommand(
  filePath: string,
  options?: AcpxQueryOptions,
): string[] {
  const resolved = resolveOptions(options);
  return [
    resolved.acpxBin,
    "--format",
    resolved.format,
    resolved.agent,
    "exec",
    "--file",
    filePath,
  ];
}

/**
 * Execute an acpx command and return the result.
 */
export function execAcpx(command: string[], timeout?: number): AcpxQueryResult {
  const base = {
    cmd: command,
    cwd: process.cwd(),
    env: process.env,
    stdout: "pipe" as const,
    stderr: "pipe" as const,
  };
  const opts = timeout !== undefined ? { ...base, timeout } : base;
  const result = Bun.spawnSync(opts);

  return {
    exitCode: result.exitCode,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
    ok: result.exitCode === 0,
  };
}

/**
 * Query an LLM via acpx with a prompt string.
 *
 * Returns the raw acpx output. Use `result.ok` to check success
 * and `result.stdout` for the response text.
 */
export function queryLlm(prompt: string, options?: AcpxQueryOptions): AcpxQueryResult {
  const command = buildAcpxCommand(prompt, options);
  return execAcpx(command, options?.timeout);
}

/**
 * Query an LLM via acpx with a prompt read from a file.
 * Use "-" as filePath to read from stdin.
 */
export function queryLlmFromFile(
  filePath: string,
  options?: AcpxQueryOptions,
): AcpxQueryResult {
  const command = buildAcpxFileCommand(filePath, options);
  return execAcpx(command, options?.timeout);
}
