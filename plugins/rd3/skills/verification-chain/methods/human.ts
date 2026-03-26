import type { HumanCheckerConfig, MethodResult, CheckerEvidence } from '../types';
import { logger } from '../../../scripts/logger';

/**
 * Human verification check.
 * If existingResponse is provided (from a prior pause/resume cycle), use it to determine result.
 * Otherwise returns 'paused' to pause the chain for human input.
 */
export function runHumanCheck(config: HumanCheckerConfig, existingResponse?: string): MethodResult {
    const choices = config.choices ?? ['approve', 'reject', 'request_changes'];

    // If we have a stored response from a prior pause, determine result from it
    if (existingResponse) {
        const approved = existingResponse === 'approve';
        const evidence: CheckerEvidence = {
            method: 'human',
            result: approved ? 'pass' : 'fail',
            timestamp: new Date().toISOString(),
            human_response: existingResponse,
        };

        logger.debug(`Human check using stored response "${existingResponse}" → ${evidence.result}`);

        if (approved) {
            return { result: 'pass', evidence };
        }
        return {
            result: 'fail',
            evidence,
            error: `Human rejected with: "${existingResponse}"`,
        };
    }

    // No stored response — request one by pausing
    const evidence: CheckerEvidence = {
        method: 'human',
        result: 'paused',
        timestamp: new Date().toISOString(),
    };

    logger.debug(`Human check triggered: ${config.prompt}`);

    const choicesText = choices.map((c) => `"${c}"`).join(', ');

    return {
        result: 'paused',
        evidence,
        error: `Human verification required. Prompt: "${config.prompt}". Expected choices: ${choicesText}. Provide response via chain resume.`,
    };
}
