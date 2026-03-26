import type { HumanCheckerConfig, MethodResult, CheckerEvidence } from '../types';
import { logger } from '../../../scripts/logger';

/**
 * Human verification check - always returns 'paused' to pause the chain.
 * This does NOT block - the caller must persist state and return control.
 * The chain will resume when the human provides a response.
 */
export function runHumanCheck(config: HumanCheckerConfig): MethodResult {
    const evidence: CheckerEvidence = {
        method: 'human',
        result: 'paused',
        timestamp: new Date().toISOString(),
    };

    logger.debug(`Human check triggered: ${config.prompt}`);

    const choices = config.choices ?? ['approve', 'reject', 'request_changes'];
    const choicesText = choices.map((c) => `"${c}"`).join(', ');

    return {
        result: 'paused',
        evidence,
        error: `Human verification required. Prompt: "${config.prompt}". Expected choices: ${choicesText}. Provide response via chain resume.`,
    };
}
