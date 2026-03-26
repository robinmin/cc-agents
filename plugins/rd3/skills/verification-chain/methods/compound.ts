import type { CompoundCheckerConfig, CheckerEvidence, MethodResult, CheckerConfig } from '../types';
import type { CheckerMethod } from '../types';
import { runCliCheck } from './cli';
import { runFileExistsCheck } from './file_exists';
import { runContentMatchCheck } from './content_match';
import { runLlmCheck } from './llm';
import { runHumanCheck } from './human';
import { logger } from '../../../scripts/logger';

/**
 * Run a compound check with multiple sub-checks.
 * All sub-checks run concurrently via Promise.all.
 * Supported sub-check methods: cli, file-exists, content-match, llm, human
 */
export async function runCompoundCheck(config: CompoundCheckerConfig, cwd: string): Promise<MethodResult> {
    const evidence: CheckerEvidence = {
        method: 'compound',
        result: 'fail',
        timestamp: new Date().toISOString(),
    };

    const subCheckMethods: CheckerMethod[] = ['cli', 'file-exists', 'content-match', 'llm', 'human'];

    // Run all sub-checks concurrently
    const subCheckPromises = config.checks.map(async (check: CheckerConfig, index: number) => {
        const subCheckName = `subcheck-${index}`;

        if (!subCheckMethods.includes(check.method as CheckerMethod)) {
            logger.warn(`Unsupported sub-check method in compound: ${check.method}`);
            return {
                sub_check: subCheckName,
                result: 'fail' as const,
                error: `Unsupported method: ${check.method}`,
            };
        }

        try {
            switch (check.method) {
                case 'cli': {
                    const result = await runCliCheck(check.config as Parameters<typeof runCliCheck>[0], cwd);
                    return { sub_check: subCheckName, result: result.result };
                }
                case 'file-exists': {
                    const result = await runFileExistsCheck(
                        check.config as Parameters<typeof runFileExistsCheck>[0],
                        cwd,
                    );
                    return { sub_check: subCheckName, result: result.result };
                }
                case 'content-match': {
                    const result = await runContentMatchCheck(
                        check.config as Parameters<typeof runContentMatchCheck>[0],
                        cwd,
                    );
                    return { sub_check: subCheckName, result: result.result };
                }
                case 'llm': {
                    const result = await runLlmCheck(check.config as Parameters<typeof runLlmCheck>[0]);
                    return { sub_check: subCheckName, result: result.result };
                }
                case 'human': {
                    // Human checks always pause, but in compound context they still return paused
                    const result = runHumanCheck(check.config as Parameters<typeof runHumanCheck>[0]);
                    return { sub_check: subCheckName, result: result.result };
                }
                default:
                    return { sub_check: subCheckName, result: 'fail' as const };
            }
        } catch (err) {
            logger.error(`Sub-check ${subCheckName} error:`, err);
            return { sub_check: subCheckName, result: 'fail' as const, error: String(err) };
        }
    });

    const subCheckResults = await Promise.all(subCheckPromises);
    evidence.compound_results = subCheckResults;

    // Determine overall result based on operator
    const passCount = subCheckResults.filter((r) => r.result === 'pass').length;
    const totalCount = subCheckResults.length;

    let passed = false;
    switch (config.operator) {
        case 'and':
            passed = passCount === totalCount;
            break;
        case 'or':
            passed = passCount >= 1;
            break;
        case 'quorum': {
            const quorumCount = config.quorum_count ?? Math.ceil(totalCount / 2);
            passed = passCount >= quorumCount;
            break;
        }
        default:
            passed = false;
    }

    evidence.result = passed ? 'pass' : 'fail';

    if (!passed) {
        const failedSubChecks = subCheckResults.filter((r) => r.result !== 'pass').map((r) => r.sub_check);
        evidence.error = `Failed sub-checks: ${failedSubChecks.join(', ')}`;
    }

    logger.debug(
        `Compound check: operator=${config.operator}, passCount=${passCount}/${totalCount}, result=${evidence.result}`,
    );

    return {
        result: evidence.result,
        evidence,
        error: passed ? undefined : evidence.error,
    };
}
