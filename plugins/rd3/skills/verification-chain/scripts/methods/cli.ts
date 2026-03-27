import { spawn } from 'node:child_process';
import type { CliCheckerConfig, MethodResult, CheckerEvidence } from '../types';
import { logger } from '../../../../scripts/logger';

/**
 * Run a CLI command and check its exit code against expected values.
 */
export async function runCliCheck(config: CliCheckerConfig, cwd: string): Promise<MethodResult> {
    const evidence: CheckerEvidence = {
        method: 'cli',
        result: 'fail',
        timestamp: new Date().toISOString(),
    };

    const exitCodes = config.exit_codes ?? [0];
    const timeout = (config.timeout ?? 60) * 1000; // convert to ms

    return new Promise((resolve) => {
        let stdout = '';
        let stderr = '';
        let timedOut = false;

        const child = spawn(config.command, [], {
            shell: true,
            cwd,
            timeout,
        });

        child.stdout?.on('data', (data: unknown) => {
            stdout += String(data);
        });

        child.stderr?.on('data', (data: unknown) => {
            stderr += String(data);
        });

        child.on('error', (err: Error) => {
            logger.error('CLI spawn error:', err.message);
            evidence.cli_exit_code = -1;
            const errorMsg = `Spawn error: ${err.message}`;
            resolve({
                result: 'fail',
                evidence: { ...evidence, error: errorMsg },
            });
        });

        child.on('close', (code: number | null) => {
            const exitCode = code ?? -1;
            evidence.cli_exit_code = exitCode;
            evidence.cli_output = stdout + (stderr ? `\nSTDERR:\n${stderr}` : '');

            if (timedOut) {
                const errorMsg = `Command timed out after ${timeout}ms`;
                resolve({
                    result: 'fail',
                    evidence: { ...evidence, error: errorMsg },
                });
                return;
            }

            const passed = exitCodes.includes(exitCode);
            evidence.result = passed ? 'pass' : 'fail';

            if (passed) {
                resolve({ result: evidence.result, evidence });
            } else {
                const errorMsg = `Exit code ${exitCode} not in expected codes [${exitCodes.join(', ')}]`;
                resolve({ result: evidence.result, evidence: { ...evidence, error: errorMsg } });
            }
        });

        // Handle timeout
        setTimeout(() => {
            timedOut = true;
            child.kill('SIGKILL');
        }, timeout);
    });
}
