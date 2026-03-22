// list command — list tasks, optionally filtered by status

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { err, isErr, ok, type Result } from '../lib/result';
import { loadConfig } from '../lib/config';
import { parseFrontmatter } from '../lib/taskFile';
import { VALID_STATUSES, type TaskListItem, type TaskStatus } from '../types';
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

function renderKanbanList(tasks: TaskListItem[], folder: string, statusFilter?: TaskStatus): string {
    const folderName = basename(folder);
    const statuses = statusFilter ? [statusFilter] : VALID_STATUSES;
    const lines: string[] = [`# Kanban Board - ${folderName}`, ""];

    for (const status of statuses) {
        const tasksForStatus = tasks.filter((task) => task.status === status);
        const taskLabel = tasksForStatus.length === 1 ? "task" : "tasks";

        lines.push(`## ${status}`);
        lines.push("");
        lines.push(`_${STATUS_SUMMARY[status]} ${tasksForStatus.length} ${taskLabel}._`);
        lines.push("");
        for (const task of tasksForStatus) {
            lines.push(`${getCheckbox(task.status)} ${formatTaskStem(task)}`);
        }

        lines.push("");
    }

    return lines.join("\n").trimEnd();
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

    for (const targetFolder of foldersToShow) {
        const result = collectTasksForFolder(projectRoot, targetFolder, statusFilter);
        if (isErr(result)) {
            if (!includeAll || targetFolder === folder) {
                return result;
            }
            continue;
        }

        tasks.push(...result.value);
        boards.push(renderKanbanList(result.value, targetFolder, statusFilter));
    }

    if (!quiet) {
        if (boards.length === 0) {
            return err("No configured task folders exist.");
        }

        displayMarkdown(boards.join("\n\n"));
    }

    return ok(tasks);
}
