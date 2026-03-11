"use client";

import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";
import {
  Search,
  Zap,
  Globe,
  FolderOpen,
  Terminal,
  SearchIcon,
  GitBranch,
  Camera,
  Mail,
  MessageCircle,
  Send,
  Coins,
  TrendingUp,
} from "lucide-react";

const iconMap: Record<
  string,
  React.ComponentType<{ size?: number; strokeWidth?: number }>
> = {
  code_exec: Zap,
  web_browse: Globe,
  file_ops: FolderOpen,
  shell: Terminal,
  web_search: SearchIcon,
  git_ops: GitBranch,
  screenshot: Camera,
  send_email: Mail,
  whatsapp: MessageCircle,
  telegram: Send,
  pix: Coins,
  binance: TrendingUp,
};

const colorMap: Record<string, string> = {
  code: "#6366f1",
  web: "#06b6d4",
  file: "#10b981",
  system: "#f59e0b",
  communication: "#22c55e",
  finance: "#a855f7",
};

interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  enabled: boolean;
}

export default function ToolsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const categories = [
    "all",
    "code",
    "web",
    "file",
    "system",
    "communication",
    "finance",
  ];

  useEffect(() => {
    fetch(`${API_BASE}/api/tools/`)
      .then((r) => r.json())
      .then((data) => {
        setTools(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = tools.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      activeCategory === "all" || t.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const toggleTool = async (id: string) => {
    const tool = tools.find((t) => t.id === id);
    if (!tool) return;
    const newEnabled = !tool.enabled;
    setTools((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: newEnabled } : t)),
    );
    try {
      await fetch(`${API_BASE}/api/tools/${id}/toggle`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newEnabled }),
      });
    } catch {
      /* revert on error */
      setTools((prev) =>
        prev.map((t) => (t.id === id ? { ...t, enabled: !newEnabled } : t)),
      );
    }
  };

  const enabledCount = tools.filter((t) => t.enabled).length;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.1)" }}
          >
            <Zap size={18} style={{ color: "var(--accent-indigo)" }} />
          </div>
          <div>
            <h1
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Tools
            </h1>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {enabledCount}/{tools.length} active
            </p>
          </div>
        </div>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-ghost)" }}
          />
          <input
            type="text"
            placeholder="Search tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-glass pl-9 w-full md:w-56"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize whitespace-nowrap transition-all"
            style={{
              background:
                activeCategory === cat ? "rgba(99,102,241,0.1)" : "transparent",
              color:
                activeCategory === cat
                  ? "var(--accent-indigo)"
                  : "var(--text-muted)",
              border: `1px solid ${activeCategory === cat ? "rgba(99,102,241,0.2)" : "transparent"}`,
            }}
          >
            {cat}
            {activeCategory === cat && ` (${filtered.length})`}
          </button>
        ))}
      </div>

      {/* Tool Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          <div className="col-span-full liquid-glass p-8 text-center">
            <p
              className="text-sm animate-pulse"
              style={{ color: "var(--text-muted)" }}
            >
              Loading tools...
            </p>
          </div>
        ) : (
          filtered.map((tool) => {
            const Icon = iconMap[tool.id] || Zap;
            const color = colorMap[tool.category] || "#6366f1";
            return (
              <div
                key={tool.id}
                className="liquid-glass liquid-glass-hover p-4 transition-all"
                style={{ opacity: tool.enabled ? 1 : 0.45 }}
              >
                <div className="flex items-start justify-between mb-2.5 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${color}10`, color }}
                    >
                      <Icon size={17} strokeWidth={1.8} />
                    </div>
                    <div>
                      <h3
                        className="text-[12px] font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {tool.name}
                      </h3>
                      <span className="badge badge-accent text-[8px]">
                        {tool.category}
                      </span>
                    </div>
                  </div>
                  <div
                    className="toggle-switch"
                    data-on={tool.enabled.toString()}
                    onClick={() => toggleTool(tool.id)}
                  >
                    <div
                      className="toggle-knob"
                      style={{ left: tool.enabled ? "20px" : "2px" }}
                    />
                  </div>
                </div>
                <p
                  className="text-[11px] relative z-10 leading-relaxed"
                  style={{ color: "var(--text-muted)" }}
                >
                  {tool.description}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
