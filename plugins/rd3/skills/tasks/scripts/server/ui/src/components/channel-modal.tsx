import { useState } from "react";

interface ChannelModalProps {
  action: string;
  wbs: string;
  onConfirm: (channel: string) => void;
  onCancel: () => void;
}

const CHANNELS = [
  { id: "claude", name: "Claude Code", icon: "🤖" },
  { id: "codex", name: "Codex", icon: "💎" },
  { id: "pi", name: "PI", icon: "🥧" },
  { id: "openclaw", name: "OpenClaw", icon: "🦞" },
  { id: "antigravity", name: "Antigravity", icon: "🛸" },
];

export function ChannelModal({ action, wbs, onConfirm, onCancel }: ChannelModalProps) {
  const [selected, setSelected] = useState("claude");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-[#333]">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400 capitalize">{action}</span> Task {wbs}
          </h3>
          <p className="text-gray-400 text-sm mt-1">Select the execution channel for this delegation.</p>
        </div>

        <div className="p-6 space-y-3">
          {CHANNELS.map((ch) => (
            <button
              type="button"
              key={ch.id}
              onClick={() => setSelected(ch.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-all duration-200 ${
                selected === ch.id
                  ? "bg-blue-500/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                  : "bg-[#252525] border-[#333] hover:border-[#444] text-gray-300"
              }`}
            >
              <span className="text-2xl">{ch.icon}</span>
              <span className={`font-medium ${selected === ch.id ? "text-white" : ""}`}>{ch.name}</span>
              {selected === ch.id && (
                <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="p-6 bg-[#181818] flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#333] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/20 active:transform active:scale-95 transition-all"
          >
            Confirm Delegation
          </button>
        </div>
      </div>
    </div>
  );
}
