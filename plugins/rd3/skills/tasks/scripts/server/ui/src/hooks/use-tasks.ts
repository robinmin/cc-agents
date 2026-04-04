import { useState, useEffect, useCallback } from "react";
import type { TaskListItem, TaskStatus, TaskEvent, TasksConfig } from "../types";
import { fetchTasks, updateTaskStatus, fetchConfig } from "../lib/api";
import { useSSE } from "./use-sse";

export function useTasks() {
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [config, setConfig] = useState<TasksConfig | null>(null);
  const [activeFolder, setActiveFolder] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTasks(activeFolder || undefined);
      setTasks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [activeFolder]);

  useEffect(() => {
    fetchConfig().then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (config && !activeFolder) {
      setActiveFolder(config.active_folder);
    }
  }, [config, activeFolder]);

  useEffect(() => {
    if (activeFolder) {
      loadTasks();
    }
  }, [activeFolder, loadTasks]);

  const handleSSEEvent = useCallback(
    (event: TaskEvent) => {
      if (event.type === "created") {
        loadTasks();
      } else if (event.type === "updated") {
        setTasks((prev: TaskListItem[]) =>
          prev.map((t: TaskListItem) =>
            t.wbs === event.wbs && event.status ? { ...t, status: event.status } : t,
          ),
        );
      } else if (event.type === "deleted") {
        setTasks((prev: TaskListItem[]) => prev.filter((t: TaskListItem) => t.wbs !== event.wbs));
      }
    },
    [loadTasks],
  );

  const connected = useSSE(handleSSEEvent);

  const moveTask = useCallback(
    async (wbs: string, newStatus: TaskStatus) => {
      const prevTasks = tasks;
      setTasks((ts: TaskListItem[]) =>
        ts.map((t: TaskListItem) =>
          t.wbs === wbs ? { ...t, status: newStatus } : t,
        ),
      );
      try {
        await updateTaskStatus(wbs, newStatus);
      } catch {
        setTasks(prevTasks);
        setError("Failed to update task status");
      }
    },
    [tasks],
  );

  const changeFolder = useCallback((folder: string) => {
    setActiveFolder(folder);
  }, []);

  const columns = tasks.reduce<Record<string, TaskListItem[]>>(
    (acc: Record<string, TaskListItem[]>, task: TaskListItem) => {
      const key = task.status;
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    },
    {},
  );

  return {
    tasks,
    columns,
    config,
    activeFolder,
    loading,
    error,
    moveTask,
    changeFolder,
    refresh: loadTasks,
    connected,
  };
}
