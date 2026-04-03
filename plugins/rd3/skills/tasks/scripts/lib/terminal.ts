import { spawnSync as nodeSpawnSync } from 'node:child_process';

import { isGlobalSilent, logger } from '../../../../scripts/logger';

export const _spawn = {
    sync: nodeSpawnSync,
};

export function displayMarkdown(content: string): void {
    if (process.stdout.isTTY && !isGlobalSilent() && content.length > 0) {
        const result = _spawn.sync('glow', {
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
