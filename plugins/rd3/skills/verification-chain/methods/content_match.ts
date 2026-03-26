import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ContentMatchCheckerConfig, MethodResult, CheckerEvidence } from '../types';
import { logger } from '../../../scripts/logger';

/**
 * Check if a file's content matches (or doesn't match) a regex pattern.
 * Result is 'pass' when found === must_exist.
 */
export async function runContentMatchCheck(config: ContentMatchCheckerConfig, cwd?: string): Promise<MethodResult> {
    const evidence: CheckerEvidence = {
        method: 'content-match',
        result: 'fail',
        timestamp: new Date().toISOString(),
    };

    const fullPath = cwd ? join(cwd, config.file) : config.file;

    let content: string;
    try {
        content = readFileSync(fullPath, 'utf-8');
        logger.debug(`Read file: ${config.file}`);
    } catch (err) {
        evidence.error = `Could not read file: ${config.file}`;
        logger.error(evidence.error, err);
        return {
            result: 'fail',
            evidence,
            error: evidence.error,
        };
    }

    let regex: RegExp;
    try {
        regex = new RegExp(config.pattern);
    } catch (err) {
        evidence.error = `Invalid regex pattern: ${config.pattern}`;
        logger.error(evidence.error, err);
        return {
            result: 'fail',
            evidence,
            error: evidence.error,
        };
    }

    const found = regex.test(content);
    evidence.content_match_found = found;

    const passed = found === config.must_exist;
    evidence.result = passed ? 'pass' : 'fail';

    if (!passed) {
        if (config.must_exist) {
            evidence.error = `Pattern "${config.pattern}" not found in ${config.file}`;
        } else {
            evidence.error = `Pattern "${config.pattern}" found in ${config.file} but should not exist`;
        }
    }

    logger.debug(
        `Content match check: pattern="${config.pattern}", found=${found}, must_exist=${config.must_exist}, result=${evidence.result}`,
    );

    return {
        result: evidence.result,
        evidence,
        error: passed ? undefined : evidence.error,
    };
}
