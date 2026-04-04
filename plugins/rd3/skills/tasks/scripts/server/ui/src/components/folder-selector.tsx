import type { TasksConfig } from "../types";

interface FolderSelectorProps {
  config: TasksConfig;
  activeFolder: string;
  onChange: (folder: string) => void;
}

export function FolderSelector({ config, activeFolder, onChange }: FolderSelectorProps) {
  if (!config?.folders) return null;
  const folders = Object.keys(config.folders);
  if (folders.length <= 1) return null;

  return (
    <select
      value={activeFolder}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1.5 text-sm rounded-md border"
      style={{
        background: "var(--kanban-bg)",
        borderColor: "var(--kanban-border)",
        color: "var(--kanban-text)",
      }}
    >
      {folders.map((folder) => (
        <option key={folder} value={folder}>
          {config.folders[folder].label || folder}
        </option>
      ))}
    </select>
  );
}
