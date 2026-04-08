/**
 * Subtask detection utilities for orchestration-v2
 *
 * Provides file-system-based subtask detection using WBS prefix matching.
 * Enables parent task to discover and iterate over associated subtask files.
 */

import { existsSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export interface SubtaskInfo {
    /** Full path to the subtask file */
    path: string;
    /** WBS number extracted from filename (e.g., "0343" from "0343_0342_*.md") */
    wbs: string;
    /** Sortable numeric value for ordering */
    order: number;
}

/**
 * Detect subtask files associated with a parent task by WBS prefix matching.
 *
 * Scans the tasks directory for files matching the pattern:
 *   `{parentWbs}_*_*.md`
 *
 * Example: For parent WBS "0342", finds files like:
 *   - 0343_0342_add_getsubtasks_helper.md (wbs: "0343", order: 343)
 *   - 0344_0342_modify_execute_phase.md (wbs: "0344", order: 344)
 *
 * @param parentWbs - Parent task's WBS number (e.g., "0342")
 * @param tasksDir - Directory to scan (defaults to docs/tasks2/)
 * @returns Sorted array of SubtaskInfo objects, empty array if none found
 */
export function getSubtasks(parentWbs: string, tasksDir = 'docs/tasks2'): SubtaskInfo[] {
    const dir = resolve(process.cwd(), tasksDir);

    if (!existsSync(dir)) {
        return [];
    }

    try {
        const files = readdirSync(dir);
        const pattern = `^(\\d+)_${parentWbs}_.+\\.md$`;

        const subtasks: SubtaskInfo[] = [];

        for (const file of files) {
            const match = file.match(new RegExp(pattern));
            if (match) {
                const wbs = match[1];
                const order = Number.parseInt(wbs, 10);

                if (!Number.isNaN(order)) {
                    subtasks.push({
                        path: resolve(dir, file),
                        wbs,
                        order,
                    });
                }
            }
        }

        // Sort by order (numeric WBS)
        subtasks.sort((a, b) => a.order - b.order);

        return subtasks;
    } catch {
        // Directory read error - return empty array
        return [];
    }
}

/**
 * Extract the WBS number from a task file path.
 *
 * @param taskPath - Full or relative path to a task file
 * @returns WBS number (e.g., "0343") or null if not found
 */
export function extractWbsFromPath(taskPath: string): string | null {
    if (/^\d{4}$/.test(taskPath)) {
        return taskPath;
    }
    const match = taskPath.match(/(?:^|\/)(\d{4})_[^/]+\.md$/);
    return match ? match[1] : null;
}

/**
 * Check if a task file is a subtask of a given parent.
 *
 * @param taskPath - Full or relative path to a task file
 * @param parentWbs - Parent task's WBS number
 * @returns true if the task is a subtask of the parent
 */
export function isSubtaskOf(taskPath: string, parentWbs: string): boolean {
    const wbs = extractWbsFromPath(taskPath);
    if (!wbs || wbs.length !== 4) {
        return false;
    }
    // A subtask has the parent WBS as a prefix but is not the parent itself
    return taskPath.includes(`${parentWbs}_`) && wbs !== parentWbs;
}
