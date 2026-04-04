import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { TaskFile, TaskStatus } from "../types";
import { STATUS_ORDER, STATUS_EMOJI } from "../types";
import { fetchTask, updateTaskStatus, updateTaskBody } from "../lib/api";
import MDEditor from "@uiw/react-md-editor";
import { ChannelModal } from "./channel-modal";

interface TaskDetailProps {
  wbs: string;
  onClose: () => void;
}

export function TaskDetail({ wbs, onClose }: TaskDetailProps) {
  const [task, setTask] = useState<TaskFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalAction, setModalAction] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem("task-detail-width");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 400 && parsed < window.innerWidth) return parsed;
    }
    return Math.min(1500, window.innerWidth * 0.9);
  });
  const widthRef = useRef(panelWidth);
  useEffect(() => {
    widthRef.current = panelWidth;
  }, [panelWidth]);

  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTask = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const t = await fetchTask(wbs);
      setTask(t);
      const body = extractBody(t.content);
      setEditContent(body);
    } catch (e) {
      console.error("Failed to load task:", e);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, [wbs]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isResizing) return;
      // Calculate new width: viewport width - mouse X position
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 400 && newWidth < window.innerWidth - 100) {
        setPanelWidth(newWidth);
      }
    }

    function handleMouseUp() {
      setIsResizing(false);
      document.body.style.cursor = "default";
      localStorage.setItem("task-detail-width", String(widthRef.current));
    }

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isEditing) onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, isEditing]);

  async function handleStatusChange(newStatus: TaskStatus) {
    try {
      await updateTaskStatus(wbs, newStatus);
      setTask((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch {
      // error handled by parent
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateTaskBody(wbs, editContent);
      setIsEditing(false);
      await loadTask(true);
    } catch (e) {
      alert("Failed to save: " + e);
    } finally {
      setSaving(false);
    }
  }

  function extractBody(content: string): string {
    const parts = content.split(/^---\r?\n/m);
    if (parts.length >= 3) {
      return parts.slice(2).join("---").trim();
    }
    return content.trim();
  }

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<{ action: string; message: string } | null>(null);

  const handleAction = async (action: string, channel: string) => {
    if (!task) return;
    setActionLoading(action);
    setActionSuccess(null);
    try {
      const resp = await fetch(`/tasks/${task.wbs}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, channel }),
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error);
      
      // Notify user of success
      setActionSuccess({ action, message: data.message });
      setTimeout(() => setActionSuccess(null), 5000); // Clear after 5s
    } catch (err) {
      alert(`Action ${action} failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionLoading(null);
      setModalAction(null);
    }
  };

  const isEditable = task && !["Done", "Canceled"].includes(task.status);

  // Centralized Button Logic (Smart Controller)
  const actions = useMemo(() => {
    if (!task) return [];
    const res = [];

    if (isEditing) {
      res.push({
        label: saving ? "Saving..." : "Save Changes",
        onClick: handleSave,
        primary: true,
        disabled: saving,
      });
      res.push({
        label: "Cancel",
        onClick: () => setIsEditing(false),
        primary: false,
      });
    } else {
      if (isEditable) {
        res.push({
          label: "Edit",
          onClick: () => setIsEditing(true),
          primary: true,
          disabled: !!actionLoading,
        });
      }

      // Contextual AI/Workflow Actions
      if (["Backlog", "Todo"].includes(task.status)) {
        const workflowActions = [
          { id: "refine", label: "Refine" },
          { id: "plan", label: "Plan" },
          { id: "run", label: "Run" },
          { id: "verify", label: "Verify" },
        ];

        for (const act of workflowActions) {
          res.push({
            label: actionLoading === act.id ? `${act.label}ing...` : act.label,
            onClick: () => setModalAction(act.id),
            secondary: true,
            disabled: !!actionLoading,
          });
        }
      }

      // Decompose: For Parent/Epic tasks (heuristic: WBS ends in 00)
      const isParentTask = task.wbs.endsWith("00") || task.wbs.length <= 2;
      if (isParentTask && ["Todo", "WIP"].includes(task.status)) {
        res.push({ 
          label: actionLoading === "decompose" ? "Decomposing..." : "Decompose", 
          onClick: () => setModalAction("decompose"), 
          secondary: true,
          disabled: !!actionLoading,
        });
      }

      // Evaluate: For quality checks before closure
      if (task.status === "Testing") {
        res.push({ 
          label: actionLoading === "evaluate" ? "Evaluating..." : "Evaluate", 
          onClick: () => setModalAction("evaluate"), 
          secondary: true,
          disabled: !!actionLoading,
        });
      }
    }
    return res;
  }, [task, isEditing, saving, isEditable, handleSave, actionLoading]);

  return (
    <div className={`fixed inset-0 z-50 flex justify-end ${isResizing ? 'select-none' : ''}`}>
      <div className="absolute inset-0 bg-black/30" onClick={isEditing || isResizing ? undefined : onClose} />
      
      {/* Detail Panel */}
      <div
        className="relative h-full flex flex-col shadow-2xl transition-[width] duration-75"
        style={{ 
          background: "var(--kanban-card)",
          width: `${panelWidth}px`
        }}
      >
        {/* Resize Handle */}
        <div 
          onMouseDown={() => setIsResizing(true)}
          className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/30 transition-colors z-[60] flex items-center justify-center group"
        >
          <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-600 group-hover:bg-blue-400 rounded-full" />
        </div>

        {modalAction && (
          <ChannelModal
            action={modalAction}
            wbs={wbs}
            onConfirm={(channel) => handleAction(modalAction, channel)}
            onCancel={() => setModalAction(null)}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "var(--kanban-border)" }}>
          <div className="flex flex-col gap-1 overflow-hidden">
            <h2 className="text-xl font-bold truncate" style={{ color: "var(--kanban-text)" }}>
              {task ? `${task.wbs} - ${task.name}` : wbs}
            </h2>
            {task && (
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--kanban-text-secondary)" }}>
                <span className="px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--kanban-border)" }}>
                  {STATUS_EMOJI[task.status]} {task.status}
                </span>
                <span>•</span>
                <span>{task.frontmatter.profile || "standard"} profile</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions.map((act, i) => (
              <button
                key={i}
                onClick={act.onClick}
                disabled={act.disabled}
                className={`px-4 py-1.5 text-sm rounded-md font-medium transition-all shadow-sm ${
                  act.primary ? "bg-blue-600 text-white hover:bg-blue-700" : 
                  act.secondary ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700" :
                  "border hover:bg-gray-50 dark:hover:bg-gray-800"
                } disabled:opacity-50`}
                style={!act.primary && !act.secondary ? { borderColor: "var(--kanban-border)", color: "var(--kanban-text)" } : {}}
              >
                {act.label}
              </button>
            ))}
            <button
              onClick={onClose}
              disabled={isEditing || isResizing}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-2"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center" style={{ color: "var(--kanban-text-secondary)" }}>
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <div className="text-sm font-medium tracking-wide uppercase">Fetching task details...</div>
            </div>
          </div>
        ) : task ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0d1117]">
            {/* Success Banner */}
            {actionSuccess && (
              <div className="bg-green-50 dark:bg-green-900/10 border-b border-green-100 dark:border-green-800/30 px-6 py-2.5 flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {actionSuccess.message}
                </div>
                <button onClick={() => setActionSuccess(null)} className="text-green-600 dark:text-green-500 hover:text-green-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            {/* Foldable Metadata Panel */}
            <div className="border-b" style={{ borderColor: "var(--kanban-border)", background: "var(--kanban-bg)" }}>
              <button 
                onClick={() => setShowMetadata(!showMetadata)}
                className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--kanban-text-secondary)" }}>
                  <svg className={`w-4 h-4 transition-transform duration-200 ${showMetadata ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Task Metadata & Progress
                </div>
                {!showMetadata && (
                  <div className="flex items-center gap-4 text-[10px]" style={{ color: "var(--kanban-text-secondary)" }}>
                     {task.frontmatter.priority && <span>Priority: {task.frontmatter.priority}</span>}
                     {task.frontmatter.estimated_hours && <span>Est: {task.frontmatter.estimated_hours}h</span>}
                  </div>
                )}
              </button>
              
              {showMetadata && (
                <div className="px-6 pb-6 grid grid-cols-3 gap-8 animate-in slide-in-from-top-2 duration-200">
                  {/* Status & Basic Info */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: "var(--kanban-text-secondary)" }}>
                        Status
                      </label>
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                        className="w-full px-3 py-1.5 text-sm rounded-md border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                        style={{ borderColor: "var(--kanban-border)", color: "var(--kanban-text)" }}
                      >
                        {STATUS_ORDER.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_EMOJI[s]} {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--kanban-text-secondary)" }}>Priority</div>
                          <div className="text-sm font-medium" style={{ color: "var(--kanban-text)" }}>{task.frontmatter.priority || "Not set"}</div>
                       </div>
                       <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--kanban-text-secondary)" }}>Estimate</div>
                          <div className="text-sm font-medium" style={{ color: "var(--kanban-text)" }}>{task.frontmatter.estimated_hours ? `${task.frontmatter.estimated_hours}h` : "Not set"}</div>
                       </div>
                    </div>
                  </div>

                  {/* Progress Bars */}
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: "var(--kanban-text-secondary)" }}>
                      Implementation Progress
                    </div>
                    <div className="space-y-2.5">
                      {task.frontmatter.impl_progress ? Object.entries(task.frontmatter.impl_progress).map(([phase, state]) => (
                        <div key={phase} className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="capitalize font-semibold" style={{ color: "var(--kanban-text)" }}>{phase}</span>
                            <span className={`px-1.5 py-0.5 rounded-full ${
                              state === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                              state === "in_progress" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                              "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                            }`}>
                              {state.replace("_", " ")}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${
                              state === "completed" ? "bg-green-500" : state === "in_progress" ? "bg-amber-500" : "bg-transparent"
                            }`} style={{ width: state === "completed" ? "100%" : state === "in_progress" ? "50%" : "0%" }} />
                          </div>
                        </div>
                      )) : <div className="text-xs italic" style={{ color: "var(--kanban-text-secondary)" }}>No progress tracked</div>}
                    </div>
                  </div>

                  {/* Other Details */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                       {[
                         { label: "Folder", value: task.frontmatter.folder },
                         { label: "Tags", value: task.frontmatter.tags?.join(", ") },
                         { label: "Created", value: task.frontmatter.created_at ? new Date(task.frontmatter.created_at).toLocaleDateString() : null },
                         { label: "Updated", value: task.frontmatter.updated_at ? new Date(task.frontmatter.updated_at).toLocaleDateString() : null },
                       ].map((item, idx) => item.value && (
                         <div key={idx}>
                           <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "var(--kanban-text-secondary)" }}>{item.label}</div>
                           <div className="text-xs font-medium" style={{ color: "var(--kanban-text)" }}>{item.value}</div>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Markdown Content area using unified MDEditor */}
            <div className="flex-1 flex flex-col min-w-0" data-color-mode={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}>
              <MDEditor
                value={editContent}
                onChange={(val) => setEditContent(val || "")}
                height="100%"
                preview={isEditing ? "live" : "preview"}
                hideToolbar={false}
                textareaProps={{
                  readOnly: !isEditing
                }}
                autoFocus={isEditing}
                className="border-none! flex-1"
                style={{ 
                  borderRadius: 0,
                  backgroundColor: "transparent"
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ color: "var(--kanban-danger)" }}>
             <div className="flex flex-col items-center gap-2 text-center p-12">
                <div className="text-6xl mb-4">🔍</div>
                <div className="text-xl font-bold" style={{ color: "var(--kanban-text)" }}>Task not found</div>
                <p className="text-sm" style={{ color: "var(--kanban-text-secondary)" }}>
                  The task with WBS <strong>{wbs}</strong> could not be located in the current folder.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 px-6 py-2 rounded-md border font-medium"
                  style={{ borderColor: "var(--kanban-border)", color: "var(--kanban-text)" }}
                >
                  Back to Board
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
