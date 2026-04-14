import { execLlmCli as defaultExecLlmCli, getLegacyLlmCommand } from '../../../../scripts/libs/acpx-query';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { LlmCheckerConfig, MethodResult, CheckerEvidence } from '../types';
import { logger } from '../../../../scripts/logger';

const DEFAULT_PROMPT_TEMPLATE = `You are a verification checker. For each item in the checklist, determine if it PASSES or FAILS.

Checklist:
{items}

For each item, output exactly one line in this format:
[PASS] criterion: reason
[FAIL] criterion: reason

Be strict in your evaluation.`;

export interface FileOps {
    mkdtempSync: typeof mkdtempSync;
    writeFileSync: typeof writeFileSync;
    rmSync: typeof rmSync;
}

const defaultFileOps: FileOps = {
    mkdtempSync: ((prefix: string) => mkdtempSync(join(tmpdir(), prefix))) as typeof mkdtempSync,
    writeFileSync,
    rmSync,
};

/**
 * Run an LLM check using a CLI command that accepts a prompt on stdin.
 * Parses stdout for [PASS]/[FAIL] markers for each checklist item.
 * Result is 'pass' only if ALL checklist items have PASS.
 *
 * Uses execLlmCli from acpx-query which auto-detects the LLM CLI path
 * and pipes prompt via stdin (no shell expansion needed).
 *
 * @param config - Checklist and prompt configuration
 * @param fileOps - File system operations (for testing via dependency injection)
 * @param llmCliPathOverride - Override LLM CLI path (for testing); falls back to
 *   LLM_CLI_COMMAND env or auto-detected "pi" binary path.
 */
export async function runLlmCheck(
    config: LlmCheckerConfig,
    fileOps: FileOps = defaultFileOps,
    llmCliPathOverride?: string,
    execLlmCliFn: typeof defaultExecLlmCli = defaultExecLlmCli,
    getLlmCliCommand: () => string | undefined = getLegacyLlmCommand,
): Promise<MethodResult> {
    const evidence: CheckerEvidence = {
        method: 'llm',
        result: 'fail',
        timestamp: new Date().toISOString(),
    };

    const llmCliPath = llmCliPathOverride ?? getLlmCliCommand();
    if (!llmCliPath) {
        const errorMsg = 'LLM CLI not found. Set LLM_CLI_COMMAND or ensure "pi" binary is in PATH';
        evidence.error = errorMsg;
        logger.error(errorMsg);
        return {
            result: 'fail',
            evidence,
            error: errorMsg,
        };
    }

    const template = config.prompt_template ?? DEFAULT_PROMPT_TEMPLATE;
    const itemsText = config.checklist.map((item) => `- ${item}`).join('\n');
    const prompt = template.replace('{items}', itemsText);

    // Write prompt to temp file — piped to stdin by execLlmCli
    let tempDir: string;
    let tempFile: string;
    try {
        tempDir = fileOps.mkdtempSync('llm-check-');
        tempFile = join(tempDir, 'prompt.txt');
        fileOps.writeFileSync(tempFile, prompt, 'utf-8');
        logger.debug(`Written prompt to temp file: ${tempFile}`);
    } catch (err) {
        const errorMsg = `Failed to write prompt to temp file: ${err}`;
        evidence.error = errorMsg;
        logger.error(errorMsg);
        return {
            result: 'fail',
            evidence,
            error: errorMsg,
        };
    }

    let stdout = '';

    try {
        let result: ReturnType<typeof execLlmCliFn>;
        try {
            result = execLlmCliFn([llmCliPath], tempFile, 300_000);
        } catch (err) {
            // Spawn error (e.g. ENOENT)
            const errorMsg = err instanceof Error ? err.message : String(err);
            evidence.error = errorMsg;
            logger.error('LLM CLI spawn error:', errorMsg);
            return {
                result: 'fail',
                evidence,
                error: errorMsg,
            };
        }
        stdout = result.stdout;

        logger.debug(`LLM CLI exited with code ${result.exitCode}`);
        if (result.stderr) logger.debug(`LLM stderr:\n${result.stderr}`);

        // Parse results: each line [PASS] or [FAIL] criterion: reason
        const results: Array<{ item: string; passed: boolean; reason?: string }> = [];
        const lines = stdout.split('\n').filter((line) => line.trim());

        for (const line of lines) {
            const passMatch = line.match(/^\s*\[PASS\]\s*(.+?):\s*(.+)/i);
            const failMatch = line.match(/^\s*\[FAIL\]\s*(.+?):\s*(.+)/i);

            if (passMatch) {
                results.push({ item: passMatch[1].trim(), passed: true, reason: passMatch[2].trim() });
            } else if (failMatch) {
                results.push({ item: failMatch[1].trim(), passed: false, reason: failMatch[2].trim() });
            }
        }

        evidence.llm_results = results;

        // All checklist items must have PASS to pass the check
        const allPassed = result.ok && results.length === config.checklist.length && results.every((r) => r.passed);
        evidence.result = allPassed ? 'pass' : 'fail';

        if (!allPassed) {
            const failedItems = results.filter((r) => !r.passed).map((r) => r.item);
            evidence.error = `Failed checklist items: ${failedItems.join(', ')}`;
        }

        return allPassed
            ? { result: evidence.result, evidence }
            : { result: evidence.result, evidence, error: evidence.error as string };
    } finally {
        // Clean up temp file
        try {
            fileOps.rmSync(tempDir, { recursive: true, force: true });
        } catch {
            /* ignore cleanup error */
        }
    }
}
