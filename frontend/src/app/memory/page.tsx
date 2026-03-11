"use client";

import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "@/lib/api";
import {
  Search,
  Brain,
  Clock,
  Tag,
  Trash2,
  Download,
  Database,
  Sparkles,
  Plus,
} from "lucide-react";

interface Memory {
  id: number;
  content: string;
  type: string;
  importance: number;
  created_at: number;
}

export default function MemoryPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("fact");
  const [showAdd, setShowAdd] = useState(false);

  const fetchMemories = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (filter !== "all") params.set("type", filter);
      const res = await fetch(`${API_BASE}/api/memory/search?${params}`);
      if (res.ok) setMemories(await res.json());
    } catch {}
    setLoading(false);
  }, [search, filter]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const addMemory = async () => {
    if (!newContent.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/memory/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newContent,
          type: newType,
          importance: 0.7,
        }),
      });
      if (res.ok) {
        setNewContent("");
        setShowAdd(false);
        fetchMemories();
      }
    } catch {}
  };

  const deleteMemory = async (id: number) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    try {
      await fetch(`${API_BASE}/api/memory/${id}`, { method: "DELETE" });
    } catch {}
  };

  const exportMemories = () => {
    const blob = new Blob([JSON.stringify(memories, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "delirium-memories.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts * 1000;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
    return `${Math.round(diff / 86400000)}d ago`;
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(139,92,246,0.1)" }}
          >
            <Brain size={18} style={{ color: "var(--accent-violet)" }} />
          </div>
          <div>
            <h1
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Memory
            </h1>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {memories.length} memories stored
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 md:flex-none">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-ghost)" }}
            />
            <input
              type="text"
              placeholder="Search memories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-glass pl-9 w-full md:w-52"
            />
          </div>
          <button
            onClick={exportMemories}
            className="btn-ghost flex items-center gap-1.5 text-[11px] shrink-0"
          >
            <Download size={12} /> Export
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="btn-primary flex items-center gap-1.5 text-[11px] shrink-0"
          >
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      {/* Add memory form */}
      {showAdd && (
        <div className="liquid-glass p-4 animate-fade-in">
          <div className="space-y-3 relative z-10">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Enter memory content..."
              className="input-glass w-full h-20 resize-none"
            />
            <div className="flex items-center gap-3">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="input-glass text-xs py-1.5 px-3"
              >
                <option value="fact">Fact</option>
                <option value="interaction">Interaction</option>
                <option value="task">Task</option>
              </select>
              <button onClick={addMemory} className="btn-primary text-xs">
                Save Memory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1.5">
        {[
          { key: "all", icon: Database },
          { key: "interaction", icon: Sparkles },
          { key: "fact", icon: Tag },
          { key: "task", icon: Clock },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all flex items-center gap-1.5"
              style={{
                background:
                  filter === f.key ? "rgba(99,102,241,0.1)" : "transparent",
                color:
                  filter === f.key
                    ? "var(--accent-indigo)"
                    : "var(--text-muted)",
                border: `1px solid ${filter === f.key ? "rgba(99,102,241,0.2)" : "transparent"}`,
              }}
            >
              <Icon size={11} /> {f.key}
            </button>
          );
        })}
      </div>

      {/* Memory list */}
      <div className="space-y-2">
        {loading ? (
          <div className="liquid-glass p-8 text-center">
            <p
              className="text-sm animate-pulse"
              style={{ color: "var(--text-muted)" }}
            >
              Loading memories...
            </p>
          </div>
        ) : memories.length === 0 ? (
          <div className="liquid-glass p-8 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No memories found. Add one to get started!
            </p>
          </div>
        ) : (
          memories.map((mem) => (
            <div
              key={mem.id}
              className="liquid-glass liquid-glass-hover p-3.5 transition-all"
            >
              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`badge text-[9px] ${mem.type === "fact" ? "badge-success" : mem.type === "task" ? "badge-warning" : "badge-accent"}`}
                    >
                      {mem.type}
                    </span>
                    <span
                      className="text-[10px] flex items-center gap-1"
                      style={{ color: "var(--text-ghost)" }}
                    >
                      <Clock size={9} /> {timeAgo(mem.created_at)}
                    </span>
                  </div>
                  <p
                    className="text-[12px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {mem.content}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-12 progress-bar" style={{ height: 3 }}>
                    <div
                      className="progress-fill"
                      style={{ width: `${mem.importance * 100}%` }}
                    />
                  </div>
                  <button
                    onClick={() => deleteMemory(mem.id)}
                    className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                    style={{ color: "var(--text-ghost)" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="liquid-glass p-4">
        <h3
          className="text-[12px] font-semibold mb-3 relative z-10"
          style={{ color: "var(--text-primary)" }}
        >
          Statistics
        </h3>
        <div className="grid grid-cols-2 gap-4 text-center relative z-10">
          <div>
            <p className="text-lg font-bold gradient-text">{memories.length}</p>
            <p
              className="text-[9px] font-semibold"
              style={{ color: "var(--text-ghost)" }}
            >
              Total Memories
            </p>
          </div>
          <div>
            <p
              className="text-lg font-bold"
              style={{ color: "var(--accent-violet)" }}
            >
              {new Set(memories.map((m) => m.type)).size}
            </p>
            <p
              className="text-[9px] font-semibold"
              style={{ color: "var(--text-ghost)" }}
            >
              Types
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
