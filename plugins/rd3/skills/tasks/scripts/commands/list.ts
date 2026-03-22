// list command — list tasks, optionally filtered by status

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { err, isErr, ok, type Result } from '../lib/result';
import { getMetaDir, loadConfig } from '../lib/config';
import { parseFrontmatter } from '../lib/taskFile';
import { type TaskListItem, type TaskStatus } from '../types';
import { displayMarkdown } from "../lib/terminal";

const STATUS_SUMMARY: Record<TaskStatus, string> = {
    Backlog: "Queued work that is not ready to start yet.",
    Todo: "Ready to pick up next.",
    WIP: "Work currently in progress.",
    Testing: "Under verification before completion.",
    Blocked: "Waiting on an external dependency or decision.",
    Done: "Completed work.",
};

function getCheckbox(status: TaskStatus): string {
    if (status === "WIP" || status === "Testing") {
        return "[.]";
    }

    if (status === "Done") {
        return "[✓]";
    }

    return "[ ]";
}

function formatTaskStem(task: TaskListItem): string {
    const normalizedName = task.name
        .replace(/\s+/g, "_")
        .replace(/[^\w.-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

    return `${task.wbs}_${normalizedName}`;
}

function renderTaskListForStatus(tasks: TaskListItem[], status: TaskStatus): string {
    const tasksForStatus = tasks.filter((task) => task.status === status);
    const taskLabel = tasksForStatus.length === 1 ? "task" : "tasks";
    const lines: string[] = [];

    lines.push(`_${STATUS_SUMMARY[status]} ${tasksForStatus.length} ${taskLabel}._`);
    lines.push("");
    for (const task of tasksForStatus) {
        lines.push(`${getCheckbox(task.status)} ${formatTaskStem(task)}`);
    }
    lines.push("");

    return lines.join("\n");
}

function loadKanbanTemplate(projectRoot: string): string | null {
    const templatePath = resolve(getMetaDir(projectRoot), 'kanban.md');
    if (!existsSync(templatePath)) {
        return null;
    }

    try {
        const content = readFileSync(templatePath, 'utf-8');
        // Strip frontmatter (--- ... --- block at the start)
        return content.replace(/^---\n[\s\S]*?---\n/, '');
    } catch {
        return null;
    }
}

function renderKanbanFromTemplate(
    template: string,
    tasks: TaskListItem[],
    phaseLabel: string,
): string {
    let content = template;

    // Substitute PHASE_LABEL
    content = content.replace(/\{\{\s*PHASE_LABEL\s*\}\}/g, phaseLabel || '');

    // Substitute status task placeholders: {{ BACKLOG_TASKS }}, {{ TODO_TASKS }}, etc.
    const statusPlaceholders: Record<TaskStatus, string> = {
        Backlog: 'BACKLOG_TASKS',
        Todo: 'TODO_TASKS',
        WIP: 'WIP_TASKS',
        Testing: 'TESTING_TASKS',
        Blocked: 'BLOCKED_TASKS',
        Done: 'DONE_TASKS',
    };

    for (const [status, placeholder] of Object.entries(statusPlaceholders)) {
        const regex = new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g');
        content = content.replace(regex, () => {
            return renderTaskListForStatus(tasks, status as TaskStatus);
        });
    }

    return content.trimEnd();
}

function collectTasksForFolder(
    projectRoot: string,
    folder: string,
    statusFilter?: TaskStatus,
): Result<TaskListItem[]> {
    const folderPath = resolve(projectRoot, folder);

    if (!existsSync(folderPath)) {
        return err(`Task folder does not exist: ${folder}`);
    }

    const files = readdirSync(folderPath).filter((f: string) => f.endsWith(".md") && !f.startsWith("kanban"));
    const tasks: TaskListItem[] = [];

    for (const file of files) {
        const filePath = resolve(folderPath, file);
        const content = readFileSync(filePath, "utf-8");
        const fm = parseFrontmatter(content);
        if (!fm) continue;

        const wbs = file.split("_")[0];
        if (statusFilter && fm.status !== statusFilter) continue;

        tasks.push({
            wbs,
            name: fm.name || file.replace(/\.md$/, ""),
            status: fm.status,
            folder,
        });
    }

    tasks.sort((a, b) => Number.parseInt(a.wbs, 10) - Number.parseInt(b.wbs, 10));
    return ok(tasks);
}

function getOrderedFolders(activeFolder: string, folders: Record<string, unknown>): string[] {
    const configuredFolders = Object.keys(folders);
    const otherFolders = configuredFolders.filter((folder) => folder !== activeFolder);

    return [activeFolder, ...otherFolders];
}

function getPhaseLabel(config: ReturnType<typeof loadConfig>, folder: string): string {
    const folderConfig = config.folders[folder];
    return folderConfig?.label || '';
}

export function listTasks(
    projectRoot: string,
    cliFolder?: string,
    statusFilter?: TaskStatus,
    includeAll = false,
    quiet = false,
): Result<TaskListItem[]> {
    const config = loadConfig(projectRoot);
    const folder = cliFolder || config.active_folder;
    const foldersToShow = includeAll
        ? getOrderedFolders(folder, config.folders)
        : [folder];
    const tasks: TaskListItem[] = [];
    const boards: string[] = [];

    // Load kanban template once (same template used for all folders)
    const kanbanTemplate = loadKanbanTemplate(projectRoot);

    for (const targetFolder of foldersToShow) {
        const result = collectTasksForFolder(projectRoot, targetFolder, statusFilter);
        if (isErr(result)) {
            if (!includeAll || targetFolder === folder) {
                return result;
            }
            continue;
        }

        const phaseLabel = getPhaseLabel(config, targetFolder);

        if (kanbanTemplate) {
            // Use template-based rendering
            boards.push(renderKanbanFromTemplate(kanbanTemplate, result.value, phaseLabel));
        } else {
            // Fallback: no template, return empty
            boards.push(`# Kanban Board - ${phaseLabel}\n\n_No template found_`);
        }
        tasks.push(...result.value);
    }

    if (!quiet) {
        if (boards.length === 0) {
            return err("No configured task folders exist.");
        }

        displayMarkdown(boards.join("\n\n"));
    }

    return ok(tasks);
}
