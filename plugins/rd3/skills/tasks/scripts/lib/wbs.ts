// WBS number management — global uniqueness across all folders

import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TasksConfig } from '../types';

export function getNextWbs(config: TasksConfig, projectRoot: string): number {
    let maxWbs = 0;

    for (const [folderPath, folderConfig] of Object.entries(config.folders)) {
        const fullPath = resolve(projectRoot, folderPath);
        if (!existsSync(fullPath)) continue;

        const files = readdirSync(fullPath).filter((f: string) => f.endsWith('.md'));
        for (const file of files) {
            const wbsPart = file.split('_')[0];
            const num = Number.parseInt(wbsPart, 10);
            if (!Number.isNaN(num) && num > maxWbs) {
                maxWbs = num;
            }
        }

        if (folderConfig.base_counter > maxWbs) {
            maxWbs = folderConfig.base_counter;
        }
    }

    return maxWbs + 1;
}

export function formatWbs(num: number): string {
    return num.toString().padStart(4, '0');
}

export function findTaskByWbs(wbs: string, config: TasksConfig, projectRoot: string): string | null {
    const normalized = wbs.replace(/^0+/, '') || '0';

    for (const folderPath of Object.keys(config.folders)) {
        const fullPath = resolve(projectRoot, folderPath);
        if (!existsSync(fullPath)) continue;

        const files = readdirSync(fullPath).filter((f: string) => f.endsWith('.md'));
        for (const file of files) {
            const fileWbs = file.split('_')[0].replace(/^0+/, '') || '0';
            if (fileWbs === normalized) {
                return resolve(fullPath, file);
            }
        }
    }

    return null;
}
