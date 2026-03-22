// refresh command — regenerate kanban boards

import { loadConfig } from '../lib/config';
import { refreshKanban } from '../lib/kanban';
import { logger } from '../../../../scripts/logger';

export function refreshKanbanBoards(
    projectRoot: string,
    quiet = false,
): { ok: boolean; foldersRefreshed: string[]; errors: string[] } {
    const config = loadConfig(projectRoot);
    const result = refreshKanban(projectRoot, config);

    if (!quiet) {
        for (const folder of result.foldersRefreshed) {
            logger.success(`Refreshed kanban: ${folder}/kanban.md`);
        }
        for (const error of result.errors) {
            logger.error(error);
        }
    }

    return result;
}
