"use client";

import { useState, useEffect } from "react";
import { Puzzle, Plus, Package, Power, X } from "lucide-react";

interface Plugin {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  enabled: boolean;
}

const defaultPlugins: Plugin[] = [
  {
    id: "auto_git",
    name: "Auto Git",
    description: "Automatic git commit and push on file changes",
    author: "Delirium Team",
    version: "1.0.0",
    enabled: true,
  },
  {
    id: "web_monitor",
    name: "Web Monitor",
    description: "Monitor websites for changes and get notified",
    author: "Community",
    version: "0.8.2",
    enabled: false,
  },
  {
    id: "code_review",
    name: "Code Reviewer",
    description: "Automatic code review with AI suggestions",
    author: "Delirium Team",
    version: "1.1.0",
    enabled: true,
  },
  {
    id: "scheduler",
    name: "Task Scheduler",
    description: "Schedule recurring tasks with cron expressions",
    author: "Community",
    version: "0.9.1",
    enabled: true,
  },
];

const pluginColors: Record<string, string> = {
  auto_git: "#6366f1",
  web_monitor: "#06b6d4",
  code_review: "#8b5cf6",
  scheduler: "#10b981",
};

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>(defaultPlugins);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("delirium_plugins");
    if (saved)
      try {
        setPlugins(JSON.parse(saved));
      } catch {}
  }, []);

  const save = (updated: Plugin[]) => {
    setPlugins(updated);
    localStorage.setItem("delirium_plugins", JSON.stringify(updated));
  };

  const togglePlugin = (id: string) => {
    save(plugins.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  };

  const createPlugin = () => {
    if (!newName.trim()) return;
    const id = newName
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    const newPlugin: Plugin = {
      id,
      name: newName,
      description: newDesc || "Custom plugin",
      author: "You",
      version: "1.0.0",
      enabled: true,
    };
    save([...plugins, newPlugin]);
    setNewName("");
    setNewDesc("");
    setShowCreate(false);
  };

  const deletePlugin = (id: string) => {
    save(plugins.filter((p) => p.id !== id));
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(168,85,247,0.1)" }}
          >
            <Puzzle size={18} style={{ color: "var(--accent-purple)" }} />
          </div>
          <div>
            <h1
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Plugins
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {plugins.filter((p) => p.enabled).length}/{plugins.length} active
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn-primary flex items-center gap-1.5"
        >
          <Plus size={14} /> Create
        </button>
      </div>

      {showCreate && (
        <div className="liquid-glass p-4 mb-4 animate-fade-in">
          <div className="space-y-3 relative z-10">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Plugin name..."
              className="input-glass w-full"
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description..."
              className="input-glass w-full"
            />
            <div className="flex gap-2">
              <button onClick={createPlugin} className="btn-primary text-xs">
                Create Plugin
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="btn-ghost text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
        {plugins.map((p) => {
          const color = pluginColors[p.id] || "#6366f1";
          return (
            <div
              key={p.id}
              className="liquid-glass liquid-glass-hover p-4 transition-all"
              style={{ opacity: p.enabled ? 1 : 0.55 }}
            >
              <div className="flex items-start gap-3 relative z-10">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}12`, color }}
                >
                  <Package size={20} strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3
                      className="text-[13px] font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      {p.author === "You" && (
                        <button
                          onClick={() => deletePlugin(p.id)}
                          className="p-1 rounded-lg hover:bg-white/5"
                          style={{ color: "var(--text-ghost)" }}
                        >
                          <X size={12} />
                        </button>
                      )}
                      <div
                        className="toggle-switch"
                        data-on={p.enabled.toString()}
                        onClick={() => togglePlugin(p.id)}
                      >
                        <div
                          className="toggle-knob"
                          style={{ left: p.enabled ? "20px" : "2px" }}
                        />
                      </div>
                    </div>
                  </div>
                  <p
                    className="text-[11px] mt-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {p.description}
                  </p>
                  <div
                    className="flex items-center gap-3 mt-2 text-[10px] font-medium"
                    style={{ color: "var(--text-ghost)" }}
                  >
                    <span>by {p.author}</span>
                    <span>v{p.version}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
