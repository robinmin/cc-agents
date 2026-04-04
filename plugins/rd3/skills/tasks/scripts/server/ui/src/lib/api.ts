import type { TaskFile, TaskListItem, TaskStatus, TasksConfig } from '../types';

const BASE = '';

export async function fetchTasks(folder?: string): Promise<TaskListItem[]> {
    const params = new URLSearchParams();
    if (folder) params.set('folder', folder);
    const qs = params.toString();
    const res = await fetch(`${BASE}/tasks${qs ? `?${qs}` : ''}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    return json.data;
}

export async function fetchTask(wbs: string): Promise<TaskFile> {
    const res = await fetch(`${BASE}/tasks/${encodeURIComponent(wbs)}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    return json.data;
}

export async function fetchTemplate(): Promise<string> {
    const res = await fetch(`${BASE}/config/template`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    return json.data.template;
}

export async function createTask(data: {
    name: string;
    background?: string;
    requirements?: string;
    solution?: string;
    priority?: string;
    tags?: string[];
    content?: string;
}): Promise<TaskListItem> {
    const res = await fetch(`${BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    return json.data;
}

export async function updateTaskStatus(wbs: string, status: TaskStatus): Promise<void> {
    const res = await fetch(`${BASE}/tasks/${encodeURIComponent(wbs)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
    });
    if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
    }
}

export async function updateTaskBody(wbs: string, body: string): Promise<void> {
    const res = await fetch(`${BASE}/tasks/${encodeURIComponent(wbs)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
    });
    if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
    }
}

export async function fetchConfig(): Promise<TasksConfig> {
    const res = await fetch(`${BASE}/config`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    return { ...json.data.config, project_name: json.data.project_name };
}
