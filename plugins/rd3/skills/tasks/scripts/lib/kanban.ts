// Kanban board generation

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ImplProgress, TasksConfig } from '../types';
import { STATUS_EMOJI, type TaskStatus } from '../types';
import { parseFrontmatter } from './taskFile';

export interface KanbanColumn {
    status: TaskStatus;
    emoji: string;
    tasks: KanbanTaskLine[];
}

export interface KanbanTaskLine {
    wbs: string;
    name: string;
    status: TaskStatus;
    folder: string;
    checkbox: string; // "[ ]" or "[x]" or "[.]"
    progressNote?: string;
}

const KANBAN_STATUS_ORDER: TaskStatus[] = ['Backlog', 'Todo', 'WIP', 'Testing', 'Blocked', 'Done', 'Canceled'];

function buildProgressNote(status: TaskStatus, progress: ImplProgress): string | undefined {
    if (status !== 'WIP' && status !== 'Testing') {
        return undefined;
    }

    const parts: string[] = [];
    if (progress.planning !== 'pending') parts.push('🟡 plan');
    if (progress.design !== 'pending') parts.push('🎨 design');
    if (progress.implementation !== 'pending') parts.push('🔬 impl');
    if (progress.review !== 'pending') parts.push('⚙️ review');
    if (progress.testing !== 'pending') parts.push('🔬 test');

    return parts.length > 0 ? `[${parts.join(' ')}]` : undefined;
}

export function buildKanbanFromFolder(folder: string, projectRoot: string): KanbanColumn[] {
    const fullPath = resolve(projectRoot, folder);
    const columns: KanbanColumn[] = KANBAN_STATUS_ORDER.map((status) => ({
        status,
        emoji: STATUS_EMOJI[status],
        tasks: [],
    }));

    if (!existsSync(fullPath)) return columns;

    const files = readdirSync(fullPath).filter(
        (f) => f.endsWith('.md') && f.toLowerCase() !== 'kanban.md' && !f.startsWith('.'),
    );

    for (const file of files) {
        const filePath = resolve(fullPath, file);
        const content = readFileSync(filePath, 'utf-8');
        const fm = parseFrontmatter(content);
        if (!fm) continue;

        const wbs = file.split('_')[0];
        const status = fm.status || 'Backlog';
        const idx = KANBAN_STATUS_ORDER.indexOf(status);
        if (idx === -1) continue;

        const checkbox =
            status === 'Done'
                ? '[x]'
                : status === 'Canceled'
                  ? '[-]'
                  : status === 'WIP' || status === 'Testing'
                    ? '[.]'
                    : '[ ]';

        const progressNote = buildProgressNote(status, fm.impl_progress);

        columns[idx].tasks.push({
            wbs,
            name: (typeof fm.name === 'string' && fm.name) || file.replace(/\.md$/, ''),
            status,
            folder,
            checkbox,
            ...(progressNote !== undefined ? { progressNote } : {}),
        });
    }

    return columns;
}

export function renderKanban(columns: KanbanColumn[]): string {
    const lines: string[] = ['---', 'kanban-plugin: board', '---', '', '# Kanban Board', ''];

    for (const col of columns) {
        lines.push(`## ${col.emoji} ${col.status}`);
        lines.push('');
        if (col.tasks.length === 0) {
            lines.push(`<!-- No tasks in ${col.status} -->`);
        } else {
            for (const task of col.tasks) {
                const suffix = task.progressNote ? ` ${task.progressNote}` : '';
                lines.push(`- ${task.checkbox} ${task.wbs}_${task.name.replace(/\s+/g, '_')}${suffix}`);
            }
        }
        lines.push('');
    }

    return lines.join('\n');
}

export function refreshKanban(
    projectRoot: string,
    config: TasksConfig,
): { ok: boolean; foldersRefreshed: string[]; errors: string[] } {
    const foldersRefreshed: string[] = [];
    const errors: string[] = [];

    for (const [folder] of Object.entries(config.folders)) {
        const kanbanPath = resolve(projectRoot, folder, 'kanban.md');
        const fullPath = resolve(projectRoot, folder);

        if (!existsSync(fullPath)) {
            errors.push(`Folder does not exist: ${folder}`);
            continue;
        }

        const columns = buildKanbanFromFolder(folder, projectRoot);
        const rendered = renderKanban(columns);

        try {
            writeFileSync(kanbanPath, rendered, 'utf-8');
            foldersRefreshed.push(folder);
        } catch (e) {
            errors.push(`Failed to write kanban for ${folder}: ${e}`);
        }
    }

    return { ok: errors.length === 0, foldersRefreshed, errors };
}
