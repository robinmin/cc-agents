import { useEffect, useState, useRef } from "react";
import { createTask } from "../lib/api";
import MDEditor from "@uiw/react-md-editor";

interface TaskCreateProps {
  onClose: () => void;
}

export function TaskCreate({ onClose }: TaskCreateProps) {
  const [name, setName] = useState("");
  const [background, setBackground] = useState("");
  const [requirements, setRequirements] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"edit" | "live">("edit");
  
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem("task-create-panel-width");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 400 && parsed < window.innerWidth) return parsed;
    }
    return Math.min(1200, window.innerWidth * 0.8);
  });
  const widthRef = useRef(panelWidth);
  useEffect(() => {
    widthRef.current = panelWidth;
  }, [panelWidth]);

  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 400 && newWidth < window.innerWidth - 100) {
        setPanelWidth(newWidth);
      }
    }

    function handleMouseUp() {
      setIsResizing(false);
      document.body.style.cursor = "default";
      localStorage.setItem("task-create-panel-width", String(widthRef.current));
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
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Task name is required");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await createTask({
        name: name.trim(),
        background: background.trim() || undefined,
        requirements: requirements.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`fixed inset-0 z-50 flex justify-end ${isResizing ? 'select-none' : ''}`}>
      <div className="absolute inset-0 bg-black/30" onClick={isResizing ? undefined : onClose} />
      
      {/* Create Panel */}
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

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "var(--kanban-border)" }}>
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-xl font-bold whitespace-nowrap" style={{ color: "var(--kanban-text)" }}>
              New Task
            </h2>
            <div className="flex-1 max-w-md">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Task Name (for filename)"
                className="w-full px-3 py-1.5 text-sm rounded-md border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                style={{ borderColor: "var(--kanban-border)", color: "var(--kanban-text)" }}
                autoFocus
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button
                onClick={() => setPreviewMode(previewMode === "edit" ? "live" : "edit")}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all border hover:bg-gray-50 dark:hover:bg-gray-800"
                style={{ borderColor: "var(--kanban-border)", color: "var(--kanban-text)" }}
             >
                <div className={`w-3 h-3 rounded-full transition-colors ${previewMode === "live" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-gray-300 dark:bg-gray-600"}`} />
                {previewMode === "live" ? "Live Preview" : "Edit Only"}
             </button>

             {error && (
               <span className="text-xs mr-4" style={{ color: "var(--kanban-danger)" }}>{error}</span>
             )}
             <button
               onClick={onClose}
               className="px-4 py-1.5 text-sm rounded-md border font-medium transition-all"
               style={{ borderColor: "var(--kanban-border)", color: "var(--kanban-text)" }}
             >
               Cancel
             </button>
             <button
               onClick={handleSubmit}
               disabled={submitting || !name.trim()}
               className="px-4 py-1.5 text-sm rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
             >
               {submitting ? "Creating..." : "Create Task"}
             </button>
             <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-2"
              aria-label="Close panel"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-8" data-color-mode={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}>
          {/* Background Section */}
          <div className="space-y-2">
             <label htmlFor="background-editor" className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: "var(--kanban-text-secondary)" }}>
               Background
             </label>
             <MDEditor
                id="background-editor"
                value={background}
                onChange={(val) => setBackground(val || "")}
                height={250}
                preview={previewMode}
                hideToolbar={true}
                textareaProps={{
                  placeholder: "Context and motivation — why this task exists..."
                }}
                className="rounded-md border-none overflow-hidden"
              />
          </div>

          {/* Requirements Section */}
          <div className="space-y-2">
             <label htmlFor="requirements-editor" className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: "var(--kanban-text-secondary)" }}>
               Requirements
             </label>
             <MDEditor
                id="requirements-editor"
                value={requirements}
                onChange={(val) => setRequirements(val || "")}
                height={400}
                preview={previewMode}
                hideToolbar={true}
                textareaProps={{
                  placeholder: "What needs to be done — acceptance criteria..."
                }}
                className="rounded-md border-none overflow-hidden"
              />
          </div>
        </div>
      </div>
    </div>
  );
}
