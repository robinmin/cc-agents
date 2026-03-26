import { spawn } from 'node:child_process';
import type { CliCheckerConfig, MethodResult, CheckerEvidence } from '../types';
import { logger } from '../../../scripts/logger';

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

        child.stdout?.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('error', (err) => {
            logger.error('CLI spawn error:', err.message);
            evidence.error = `Spawn error: ${err.message}`;
            evidence.cli_exit_code = -1;
            resolve({
                result: 'fail',
                evidence,
                error: evidence.error,
            });
        });

        child.on('close', (code) => {
            const exitCode = code ?? -1;
            evidence.cli_exit_code = exitCode;
            evidence.cli_output = stdout + (stderr ? `\nSTDERR:\n${stderr}` : '');

            if (timedOut) {
                evidence.error = `Command timed out after ${timeout}ms`;
                resolve({
                    result: 'fail',
                    evidence,
                    error: evidence.error,
                });
                return;
            }

            const passed = exitCodes.includes(exitCode);
            evidence.result = passed ? 'pass' : 'fail';

            if (!passed) {
                evidence.error = `Exit code ${exitCode} not in expected codes [${exitCodes.join(', ')}]`;
            }

            resolve({
                result: evidence.result,
                evidence,
                error: passed ? undefined : evidence.error,
            });
        });

        // Handle timeout
        setTimeout(() => {
            timedOut = true;
            child.kill('SIGKILL');
        }, timeout);
    });
}
