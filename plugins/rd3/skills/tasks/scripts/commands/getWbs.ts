// get-wbs command — extract WBS number from a task file path

import { ok, type Result } from '../../../../scripts/libs/result';
import { logger } from '../../../../scripts/logger';

const WBS_REGEX = /^(\d{4})/;

/**
 * Extract WBS number from a task file path.
 * WBS is the 4-digit prefix at the start of the filename (e.g., 0047 from "0047_my-task.md")
 */
export function extractWbsFromPath(filePath: string): string | null {
    const fileName = filePath.split('/').pop() || '';
    const match = fileName.match(WBS_REGEX);
    return match ? match[1] : null;
}

export function getWbs(filePath: string, quiet = false): Result<{ wbs: string | null; path: string }> {
    const wbs = extractWbsFromPath(filePath);

    if (!quiet) {
        if (wbs) {
            logger.log(wbs);
        }
        // Don't log anything if invalid - return blank
    }

    return ok({ wbs, path: filePath });
}
