/**
 * Route handlers — pure functions that delegate to existing task commands.
 *
 * Each handler receives (projectRoot, request, params, broadcaster) and returns a Response.
 * No HTTP server dependency — testable via direct function invocation.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { createTask } from '../commands/create';
import { listTasks } from '../commands/list';
import { updateTask } from '../commands/update';
import { checkTask } from '../commands/check';
import { putArtifact, validateArtifactDisplayName } from '../commands/put';
import { getArtifacts } from '../commands/get';
import { showTree } from '../commands/tree';
import { refreshKanbanBoards } from '../commands/refresh';
import { showConfig, setActiveFolder, addFolder } from '../commands/config';
import { batchCreate } from '../commands/batchCreate';
import { loadConfig, resolveFolderPath } from '../lib/config';
import { isErr } from '../lib/result';
import { readTaskFile } from '../lib/taskFile';
import { findTaskByWbs } from '../lib/wbs';
import { normalizeStatus, type TaskStatus } from '../types';
import { acquire } from './writeLock';
import { EventBroadcaster } from './sse';
import type { Broadcaster, JsonResponse, RouteHandler, TaskEvent } from './types';
import { logger } from '../../../../scripts/logger';

// ── Helpers ──────────────────────────────────────────────────────────────

function jsonOk(data: unknown): Response {
    return Response.json({ ok: true, data } satisfies JsonResponse);
}

function jsonErr(error: string, status = 400): Response {
    return Response.json({ ok: false, error } satisfies JsonResponse, { status });
}

/** Read JSON body with a guard for invalid input */
async function readJsonBody<T>(request: Request): Promise<T | null> {
    try {
        return (await request.json()) as T;
    } catch {
        return null;
    }
}

/** Write content to a temp file and return its path */
function writeToTempFile(content: string, prefix: string): string {
    const dir = join(tmpdir(), 'tasks-server');
    mkdirSync(dir, { recursive: true });
    const path = join(dir, `${prefix}-${Date.now()}.md`);
    writeFileSync(path, content, 'utf-8');
    return path;
}

function emitEvent(broadcaster: Broadcaster, event: TaskEvent): void {
    broadcaster.broadcast(event);
}

function isPathWithinRoot(projectRoot: string, targetPath: string): boolean {
    const relativePath = relative(projectRoot, targetPath);
    return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
}

function validateManagedFolder(projectRoot: string, folder: string): string | null {
    const config = loadConfig(projectRoot);

    if (!config.folders[folder]) {
        return `Folder '${folder}' is not configured. Add it with 'tasks config add-folder ${folder}' first.`;
    }

    const folderPath = resolveFolderPath(config, projectRoot, folder);
    if (!isPathWithinRoot(projectRoot, folderPath)) {
        return `Folder '${folder}' must resolve inside the project root`;
    }

    return null;
}

function validateFolderPath(projectRoot: string, folder: string): string | null {
    const folderPath = resolve(projectRoot, folder);
    if (!isPathWithinRoot(projectRoot, folderPath)) {
        return `Folder '${folder}' must resolve inside the project root`;
    }

    return null;
}

function getTaskStatus(projectRoot: string, wbs: string): TaskStatus | undefined {
    const taskPath = findTaskByWbs(wbs, loadConfig(projectRoot), projectRoot);
    if (!taskPath) {
        return undefined;
    }

    return readTaskFile(taskPath)?.status;
}

// ── Health ───────────────────────────────────────────────────────────────

const startTime = Date.now();

export const healthHandler: RouteHandler = () => {
    return jsonOk({ uptime: Date.now() - startTime });
};

// ── Tasks CRUD ───────────────────────────────────────────────────────────

export const listTasksHandler: RouteHandler = async (projectRoot, request) => {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get('status');
    const folderParam = url.searchParams.get('folder');
    const allParam = url.searchParams.get('all');

    let statusFilter: TaskStatus | undefined;
    if (statusParam) {
        const normalized = normalizeStatus(statusParam);
        if (!normalized.recognized) {
            return jsonErr(`Invalid status: ${statusParam}`);
        }
        statusFilter = normalized.status;
    }

    const result = listTasks(
        projectRoot,
        folderParam ?? undefined,
        statusFilter,
        allParam === 'true' || allParam === '1',
        true,
    );
    if (isErr(result)) {
        return jsonErr(result.error);
    }
    return jsonOk(result.value);
};

interface CreateBody {
    name?: string;
    background?: string;
    requirements?: string;
    solution?: string;
    priority?: string;
    estimatedHours?: number;
    dependencies?: string[];
    tags?: string[];
    profile?: string;
    folder?: string;
    content?: string;
}

export const createTaskHandler: RouteHandler = async (projectRoot, request, _params, broadcaster) => {
    const body = await readJsonBody<CreateBody>(request);
    if (!body || !body.name) {
        return jsonErr('Missing required field: name');
    }

    if (body.folder) {
        const folderError = validateManagedFolder(projectRoot, body.folder);
        if (folderError) {
            return jsonErr(folderError);
        }
    }

    const result = createTask(projectRoot, body.name, body.folder, {
        ...(body.background ? { background: body.background } : {}),
        ...(body.requirements ? { requirements: body.requirements } : {}),
        ...(body.solution ? { solution: body.solution } : {}),
        ...(body.priority ? { priority: body.priority } : {}),
        ...(body.estimatedHours !== undefined ? { estimatedHours: body.estimatedHours } : {}),
        ...(body.dependencies ? { dependencies: body.dependencies } : {}),
        ...(body.tags ? { tags: body.tags } : {}),
        ...(body.profile ? { profile: body.profile } : {}),
        ...(body.content ? { content: body.content } : {}),
        quiet: true,
    });

    if (isErr(result)) {
        return jsonErr(result.error);
    }

    emitEvent(broadcaster, {
        type: 'created',
        wbs: result.value.wbs,
        status: 'Backlog',
        timestamp: new Date().toISOString(),
    });

    return jsonOk(result.value);
};

export const showTaskHandler: RouteHandler = async (projectRoot, _request, params) => {
    const wbs = params.wbs;
    if (!wbs) return jsonErr('Missing WBS parameter');

    const config = loadConfig(projectRoot);
    const taskPath = findTaskByWbs(wbs, config, projectRoot);
    if (!taskPath) {
        return jsonErr(`Task ${wbs} not found`, 404);
    }

    const task = readTaskFile(taskPath);
    if (!task) {
        return jsonErr(`Failed to read task ${wbs}`, 500);
    }

    return jsonOk(task);
};

interface UpdateBody {
    status?: string;
    section?: string;
    body?: string;
    content?: string;
    fromFile?: string;
    phase?: string;
    phaseStatus?: string;
    field?: string;
    value?: string;
    force?: boolean;
}

export const updateTaskHandler: RouteHandler = async (projectRoot, request, params, broadcaster) => {
    const wbs = params.wbs;
    if (!wbs) return jsonErr('Missing WBS parameter');

    const body = await readJsonBody<UpdateBody>(request);
    if (!body) return jsonErr('Invalid JSON body');

    const release = await acquire(wbs);
    try {
        // Status update
        if (body.status) {
            const normalized = normalizeStatus(body.status);
            if (!normalized.recognized) {
                return jsonErr(`Invalid status: ${body.status}`);
            }

            // Map 'deleted' to Canceled for REST semantics
            const targetStatus =
                body.status.toLowerCase() === 'deleted' ? ('Canceled' as TaskStatus) : normalized.status;

            const result = updateTask(projectRoot, wbs, {
                status: targetStatus,
                force: body.force ?? false,
                quiet: true,
            });
            if (isErr(result)) {
                return jsonErr(result.error);
            }

            emitEvent(broadcaster, {
                type: 'updated',
                wbs,
                status: targetStatus,
                timestamp: new Date().toISOString(),
            });

            return jsonOk(result.value);
        }

        // Section update via inline content
        if (body.section && body.content !== undefined) {
            const tempPath = writeToTempFile(body.content, `task-${wbs}-section`);
            const result = updateTask(projectRoot, wbs, {
                section: body.section,
                fromFile: tempPath,
                quiet: true,
            });
            if (isErr(result)) {
                return jsonErr(result.error);
            }

            const status = getTaskStatus(projectRoot, wbs);

            emitEvent(broadcaster, {
                type: 'updated',
                wbs,
                ...(status ? { status } : {}),
                timestamp: new Date().toISOString(),
            });

            return jsonOk(result.value);
        }

        // Entire body update
        if (body.body !== undefined) {
            const result = updateTask(projectRoot, wbs, {
                body: body.body,
                quiet: true,
            });
            if (isErr(result)) {
                return jsonErr(result.error);
            }

            const status = getTaskStatus(projectRoot, wbs);

            emitEvent(broadcaster, {
                type: 'updated',
                wbs,
                ...(status ? { status } : {}),
                timestamp: new Date().toISOString(),
            });

            return jsonOk(result.value);
        }

        // Section update via fromFile (caller manages the file)
        if (body.section && body.fromFile) {
            const result = updateTask(projectRoot, wbs, {
                section: body.section,
                fromFile: body.fromFile,
                quiet: true,
            });
            if (isErr(result)) {
                return jsonErr(result.error);
            }

            const status = getTaskStatus(projectRoot, wbs);

            emitEvent(broadcaster, {
                type: 'updated',
                wbs,
                ...(status ? { status } : {}),
                timestamp: new Date().toISOString(),
            });

            return jsonOk(result.value);
        }

        // Phase update
        if (body.phase && body.phaseStatus) {
            const result = updateTask(projectRoot, wbs, {
                phase: body.phase as 'planning' | 'design' | 'implementation' | 'review' | 'testing',
                phaseStatus: body.phaseStatus,
                quiet: true,
            });
            if (isErr(result)) {
                return jsonErr(result.error);
            }

            const status = getTaskStatus(projectRoot, wbs);

            emitEvent(broadcaster, {
                type: 'updated',
                wbs,
                ...(status ? { status } : {}),
                timestamp: new Date().toISOString(),
            });

            return jsonOk(result.value);
        }

        // Field update
        if (body.field && body.value) {
            const result = updateTask(projectRoot, wbs, {
                field: body.field as 'profile',
                value: body.value,
                quiet: true,
            });
            if (isErr(result)) {
                return jsonErr(result.error);
            }

            const status = getTaskStatus(projectRoot, wbs);

            emitEvent(broadcaster, {
                type: 'updated',
                wbs,
                ...(status ? { status } : {}),
                timestamp: new Date().toISOString(),
            });

            return jsonOk(result.value);
        }

        return jsonErr(
            'No update operation specified. Provide status, section+content, phase+phaseStatus, or field+value',
        );
    } finally {
        release();
    }
};

export const deleteTaskHandler: RouteHandler = async (projectRoot, _request, params, broadcaster) => {
    const wbs = params.wbs;
    if (!wbs) return jsonErr('Missing WBS parameter');

    const release = await acquire(wbs);
    try {
        const result = updateTask(projectRoot, wbs, {
            status: 'Canceled',
            force: true,
            quiet: true,
        });
        if (isErr(result)) {
            return jsonErr(result.error);
        }

        emitEvent(broadcaster, {
            type: 'deleted',
            wbs,
            status: 'Canceled',
            timestamp: new Date().toISOString(),
        });

        return jsonOk(result.value);
    } finally {
        release();
    }
};

// ── Artifacts ────────────────────────────────────────────────────────────

export const putArtifactHandler: RouteHandler = async (projectRoot, request, params, broadcaster) => {
    const wbs = params.wbs;
    if (!wbs) return jsonErr('Missing WBS parameter');

    const contentType = request.headers.get('content-type') ?? '';

    // Multipart form upload
    if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file || !(file instanceof File)) {
            return jsonErr("Missing 'file' field in multipart form data");
        }

        const displayNameResult = validateArtifactDisplayName((formData.get('name') as string) ?? file.name);
        if (!displayNameResult.ok) {
            return jsonErr(displayNameResult.error);
        }

        const displayName = displayNameResult.value;
        const tempPath = join(tmpdir(), `tasks-upload-${Date.now()}-${displayName}`);

        // Write uploaded file to temp location
        const buffer = Buffer.from(await file.arrayBuffer());
        writeFileSync(tempPath, buffer);

        const release = await acquire(wbs);
        try {
            const result = putArtifact(projectRoot, wbs, tempPath, {
                name: displayName,
                quiet: true,
            });
            if (isErr(result)) {
                return jsonErr(result.error);
            }

            const status = getTaskStatus(projectRoot, wbs);
            emitEvent(broadcaster, {
                type: 'updated',
                wbs,
                ...(status ? { status } : {}),
                timestamp: new Date().toISOString(),
            });

            return jsonOk(result.value);
        } finally {
            release();
        }
    }

    return jsonErr('Content-Type must be multipart/form-data for artifact upload');
};

export const getArtifactsHandler: RouteHandler = async (projectRoot, request, params) => {
    const wbs = params.wbs;
    if (!wbs) return jsonErr('Missing WBS parameter');

    const url = new URL(request.url);
    const artifactType = url.searchParams.get('artifactType') ?? undefined;

    const result = getArtifacts(projectRoot, wbs, artifactType ? { artifactType } : {}, true);
    if (isErr(result)) {
        return jsonErr(result.error, 404);
    }
    return jsonOk(result.value);
};

export const treeHandler: RouteHandler = async (projectRoot, _request, params) => {
    const wbs = params.wbs;
    if (!wbs) return jsonErr('Missing WBS parameter');

    const result = showTree(projectRoot, wbs, true);
    if (isErr(result)) {
        return jsonErr(result.error, 404);
    }
    return jsonOk(result.value);
};

// ── Check ────────────────────────────────────────────────────────────────

export const checkHandler: RouteHandler = async (projectRoot, _request, params) => {
    const wbs = params.wbs;
    if (!wbs) return jsonErr('Missing WBS parameter');

    const result = checkTask(projectRoot, wbs, true);
    if (isErr(result)) {
        return jsonErr(result.error);
    }
    return jsonOk(result.value);
};

// ── Batch Create ─────────────────────────────────────────────────────────

export const batchCreateHandler: RouteHandler = async (projectRoot, request, _params, broadcaster) => {
    const body = await readJsonBody<{ items: unknown[] }>(request);
    if (!body?.items || !Array.isArray(body.items)) {
        return jsonErr("Missing 'items' array in request body");
    }

    for (const item of body.items) {
        if (!item || typeof item !== 'object') {
            return jsonErr('Each batch-create item must be an object');
        }

        const folder = 'folder' in item && typeof item.folder === 'string' ? item.folder : undefined;
        if (folder) {
            const folderError = validateManagedFolder(projectRoot, folder);
            if (folderError) {
                return jsonErr(folderError);
            }
        }
    }

    // Write items to temp JSON file and delegate to batchCreate
    const tempPath = writeToTempFile(JSON.stringify(body.items), 'batch-create');
    const result = batchCreate(projectRoot, tempPath, undefined, true, 'json');
    if (isErr(result)) {
        return jsonErr(result.error);
    }

    // Broadcast created events for each WBS
    for (const wbs of result.value.created) {
        emitEvent(broadcaster, {
            type: 'created',
            wbs,
            status: 'Backlog',
            timestamp: new Date().toISOString(),
        });
    }

    if (result.value.created.length === 0 && result.value.errors.length > 0) {
        return jsonErr(`Failed to create any tasks: ${result.value.errors[0]}`);
    }

    return jsonOk(result.value);
};

// ── Refresh ──────────────────────────────────────────────────────────────

export const refreshHandler: RouteHandler = async (projectRoot) => {
    const result = refreshKanbanBoards(projectRoot, true);
    return jsonOk(result);
};

// ── Config ───────────────────────────────────────────────────────────────

export const getConfigHandler: RouteHandler = async (projectRoot) => {
    const result = showConfig(projectRoot, true);
    return jsonOk({ ...result, project_name: basename(projectRoot) });
};

interface ConfigUpdateBody {
    action: 'set-active' | 'add-folder';
    folder: string;
    baseCounter?: number;
    label?: string;
}

export const updateConfigHandler: RouteHandler = async (projectRoot, request) => {
    const body = await readJsonBody<ConfigUpdateBody>(request);
    if (!body?.action) {
        return jsonErr("Missing 'action' field (set-active or add-folder)");
    }

    if (body.action === 'set-active') {
        if (!body.folder) return jsonErr("Missing 'folder' field");
        const result = setActiveFolder(projectRoot, body.folder, true);
        if (!result.ok) return jsonErr(result.error ?? 'Failed');
        return jsonOk({ active_folder: result.activeFolder });
    }

    if (body.action === 'add-folder') {
        if (!body.folder) return jsonErr("Missing 'folder' field");
        if (body.baseCounter === undefined) return jsonErr("Missing 'baseCounter' field");
        const folderError = validateFolderPath(projectRoot, body.folder);
        if (folderError) return jsonErr(folderError);
        const result = addFolder(projectRoot, body.folder, body.baseCounter, body.label, true);
        if (!result.ok) return jsonErr(result.error ?? 'Failed');
        return jsonOk({ folder: result.folder, base_counter: result.baseCounter });
    }

    return jsonErr(`Unknown config action: ${body.action}`);
};

// ── SSE Stream ───────────────────────────────────────────────────────────

export const eventsHandler: RouteHandler = async (_projectRoot, request, _params, broadcaster) => {
    if (!(broadcaster instanceof EventBroadcaster)) {
        return jsonErr('SSE not available');
    }

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status') ?? undefined;
    if (statusFilter) {
        const normalized = normalizeStatus(statusFilter);
        if (!normalized.recognized) {
            return jsonErr(`Invalid status: ${statusFilter}`);
        }

        return broadcaster.createStream(normalized.status);
    }

    return broadcaster.createStream();
};

// ── Actions ──────────────────────────────────────────────────────────────

export const taskActionHandler: RouteHandler = async (projectRoot, request, params, broadcaster) => {
    const wbs = params.wbs;
    if (!wbs) return jsonErr('Missing WBS parameter');

    const body = (await request.json().catch(() => ({}))) as { action?: string; channel?: string };
    const { action, channel } = body;
    if (!action || !channel) return jsonErr('Missing action or channel field');

    // Mapping logic for orchestrator-v2
    const actionArgs: string[] = [];
    if (action === 'refine') {
        actionArgs.push('--preset', 'refine');
    } else if (action === 'plan') {
        actionArgs.push('--preset', 'plan');
    } else if (action === 'run') {
        actionArgs.push('--phases', 'implement');
    } else if (action === 'verify') {
        actionArgs.push('--phases', 'test');
    } else if (action === 'decompose') {
        actionArgs.push('--phases', 'decompose');
    } else if (action === 'evaluate') {
        actionArgs.push('--phases', 'review');
    } else {
        return jsonErr(`Unknown action: ${action}`);
    }

    logger.info(`Delegating task action: orchestrator run ${wbs} ${actionArgs.join(' ')} --channel ${channel}`);

    try {
        // Trigger execution via orchestrator CLI
        Bun.spawn(['orchestrator', 'run', wbs, ...actionArgs, '--channel', channel], {
            stdout: 'inherit',
            stderr: 'inherit',
        });

        const status = getTaskStatus(projectRoot, wbs);
        emitEvent(broadcaster, {
            type: 'updated',
            wbs,
            ...(status ? { status } : {}),
            timestamp: new Date().toISOString(),
        });

        return jsonOk({
            message: `Action '${action}' delegated to orchestrator with channel ${channel} for task ${wbs}`,
            action,
            channel,
            wbs,
            command: `orchestrator run ${wbs} ${actionArgs.join(' ')} --channel ${channel}`,
        });
    } catch (err) {
        logger.error(`Failed to delegate action: ${err}`);
        return jsonErr(`Failed to trigger orchestrator: ${err instanceof Error ? err.message : String(err)}`);
    }
};

export const getTemplateHandler: RouteHandler = async (projectRoot) => {
    const { getTaskTemplate } = await import('../commands/create');
    const template = getTaskTemplate(projectRoot);
    return jsonOk({ template });
};
