import { spawnSync } from 'node:child_process';

import { logger } from '../../../../scripts/logger';

export function displayMarkdown(content: string): void {
    if (process.stdout.isTTY) {
        const result = spawnSync('glow', {
            input: content,
            encoding: 'utf-8',
            stdio: ['pipe', 'inherit', 'inherit'],
        });

        if (result.status === 0 && !result.error) {
            return;
        }
    }

    logger.log(content);
}
