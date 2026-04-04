import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { LlmCheckerConfig, MethodResult, CheckerEvidence } from '../types';
import { logger } from '../../../../scripts/logger';

const DEFAULT_PROMPT_TEMPLATE = `You are a verification checker. For each item in the checklist, determine if it PASSES or FAILS.

Checklist:
{items}

For each item, output exactly one line in this format:
[PASS] criterion: reason
[FAIL] criterion: reason

Be strict in your evaluation.`;

interface FileOps {
    mkdtempSync: typeof mkdtempSync;
    writeFileSync: typeof writeFileSync;
    rmSync: typeof rmSync;
}

const defaultFileOps: FileOps = {
    mkdtempSync,
    writeFileSync,
    rmSync,
};

/**
 * Run an LLM check using a CLI command that accepts a prompt on stdin.
 * Parses stdout for [PASS]/[FAIL] markers for each checklist item.
 * Result is 'pass' only if ALL checklist items have PASS.
 */
export async function runLlmCheck(
    config: LlmCheckerConfig,
    _spawnFn: typeof spawn = spawn,
    fileOps: FileOps = defaultFileOps,
): Promise<MethodResult> {
    const evidence: CheckerEvidence = {
        method: 'llm',
        result: 'fail',
        timestamp: new Date().toISOString(),
    };

    const llmCliCommand = (import.meta as { env: Record<string, string | undefined> }).env.LLM_CLI_COMMAND;
    if (!llmCliCommand) {
        const errorMsg = 'LLM_CLI_COMMAND environment variable is not set';
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

    // Write prompt to temp file
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

    return new Promise((resolve) => {
        let stdout = '';
        let stderr = '';

        const child = _spawnFn(`${llmCliCommand} < "${tempFile}"`, [], {
            shell: true,
        });

        child.stdout?.on('data', (data: unknown) => {
            stdout += String(data);
        });

        child.stderr?.on('data', (data: unknown) => {
            stderr += String(data);
        });

        child.on('error', (err: Error) => {
            logger.error('LLM CLI spawn error:', err.message);
            const errorMsg = `Spawn error: ${err.message}`;
            evidence.error = errorMsg;
            try {
                fileOps.rmSync(tempDir, { recursive: true, force: true });
            } catch {
                /* ignore cleanup error */
            }
            resolve({
                result: 'fail',
                evidence,
                error: errorMsg,
            });
        });

        child.on('close', (code: number | null) => {
            // Clean up temp file
            try {
                fileOps.rmSync(tempDir, { recursive: true, force: true });
            } catch {
                /* ignore cleanup error */
            }

            logger.debug(`LLM CLI exited with code ${code}`);
            logger.debug(`LLM stdout:\n${stdout}`);
            if (stderr) {
                logger.debug(`LLM stderr:\n${stderr}`);
            }

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
            const allPassed = results.length === config.checklist.length && results.every((r) => r.passed);
            evidence.result = allPassed ? 'pass' : 'fail';

            if (!allPassed) {
                const failedItems = results.filter((r) => !r.passed).map((r) => r.item);
                evidence.error = `Failed checklist items: ${failedItems.join(', ')}`;
            }

            if (allPassed) {
                resolve({ result: evidence.result, evidence });
            } else {
                resolve({ result: evidence.result, evidence, error: evidence.error as string });
            }
        });
    });
}
