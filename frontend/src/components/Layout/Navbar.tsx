"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";
import {
  Search,
  Bell,
  Moon,
  Sun,
  Command,
  X,
  ChevronDown,
  Zap,
  Sparkles,
} from "lucide-react";

interface ModelEntry {
  id: string;
  name: string;
  provider: string;
  providerKey: string;
  icon: string;
}

const PROVIDER_ICONS: Record<string, string> = {
  alibaba: "☁️",
  ollama: "🧠",
  openai: "🤖",
  anthropic: "🟣",
  google: "🔵",
  groq: "⚡",
  custom: "🔧",
};

const fallbackModels: ModelEntry[] = [
  {
    id: "qwen3-coder-plus",
    name: "qwen3-coder-plus",
    provider: "Alibaba Cloud",
    providerKey: "alibaba",
    icon: "☁️",
  },
];

export function Navbar() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [modelOpen, setModelOpen] = useState(false);
  const [models, setModels] = useState<ModelEntry[]>(fallbackModels);
  const [selectedModel, setSelectedModel] = useState<ModelEntry>(
    fallbackModels[0],
  );

  // Fetch providers/models from backend
  useEffect(() => {
    fetch(`${API_BASE}/api/settings/providers/list`)
      .then((r) => r.json())
      .then(
        (
          providers: {
            name: string;
            display_name: string;
            models: string[];
            default_model: string;
            is_default: boolean;
          }[],
        ) => {
          const entries: ModelEntry[] = [];
          let defaultEntry: ModelEntry | null = null;

          for (const p of providers) {
            const icon = PROVIDER_ICONS[p.name] || "🔧";
            for (const m of p.models) {
              const entry: ModelEntry = {
                id: `${p.name}/${m}`,
                name: m,
                provider: p.display_name,
                providerKey: p.name,
                icon,
              };
              entries.push(entry);
              if (p.is_default && m === p.default_model) defaultEntry = entry;
            }
          }

          if (entries.length > 0) {
            setModels(entries);
            // Restore from localStorage or use default
            const saved = localStorage.getItem("delirium_selected_model");
            const restored = saved ? entries.find((e) => e.id === saved) : null;
            setSelectedModel(restored || defaultEntry || entries[0]);
          }
        },
      )
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  const pageTitle = () => {
    const titles: Record<string, string> = {
      "/chat": "Chat",
      "/code": "Code",
      "/voice": "Voice Mode",
      "/tools": "Tools",
      "/memory": "Memory",
      "/dashboard": "Dashboard",
      "/plugins": "Plugins",
      "/integrations": "Integrations",
      "/agents": "Agents",
      "/settings": "Settings",
    };
    for (const [path, title] of Object.entries(titles)) {
      if (pathname?.startsWith(path)) return title;
    }
    return "Delirium Infinite";
  };

  const toggleTheme = () => {
    const html = document.documentElement;
    const current = html.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    setIsDark(next === "dark");
  };

  const isChat =
    pathname === "/chat" ||
    pathname?.startsWith("/chat/") ||
    pathname === "/code" ||
    pathname?.startsWith("/code/");

  return (
    <header
      className="flex items-center justify-between px-5 h-[56px] shrink-0 relative z-20"
      style={{
        background: "var(--glass-bg-solid)",
        borderBottom: "1px solid var(--glass-border)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
      }}
    >
      {/* Left: Title + Model selector */}
      <div className="flex items-center gap-3">
        <h2
          className="text-[13px] font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {pageTitle()}
        </h2>

        {/* Model selector (only on chat) */}
        {isChat && (
          <div className="relative">
            <button
              className="model-selector"
              onClick={() => setModelOpen(!modelOpen)}
            >
              <span>{selectedModel.icon}</span>
              <span className="hidden sm:inline">{selectedModel.name}</span>
              <ChevronDown
                size={12}
                className={`transition-transform ${modelOpen ? "rotate-180" : ""}`}
              />
            </button>

            {modelOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setModelOpen(false)}
                />
                <div className="absolute top-full left-0 mt-2 dropdown-menu z-50 animate-fade-in-scale w-64">
                  <p
                    className="text-[10px] uppercase tracking-widest font-semibold px-3 py-2"
                    style={{ color: "var(--text-ghost)" }}
                  >
                    Select Model
                  </p>
                  {models.map((model) => (
                    <button
                      key={model.id}
                      className="dropdown-item w-full text-left"
                      onClick={() => {
                        setSelectedModel(model);
                        setModelOpen(false);
                        localStorage.setItem(
                          "delirium_selected_model",
                          model.id,
                        );
                        window.dispatchEvent(
                          new CustomEvent("delirium-model-change", {
                            detail: model,
                          }),
                        );
                      }}
                      style={{
                        background:
                          selectedModel.id === model.id
                            ? "rgba(99,102,241,0.08)"
                            : undefined,
                      }}
                    >
                      <span className="text-base">{model.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[12px] font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {model.name}
                        </p>
                        <p
                          className="text-[10px]"
                          style={{ color: "var(--text-ghost)" }}
                        >
                          {model.provider}
                        </p>
                      </div>
                      {selectedModel.id === model.id && (
                        <Sparkles
                          size={12}
                          style={{ color: "var(--accent-indigo)" }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-0.5">
        {/* Search button */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/[0.04]"
          style={{ color: "var(--text-muted)" }}
          title="Search (⌘K)"
        >
          <Search size={15} strokeWidth={2} />
        </button>

        {/* Notifications */}
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/[0.04] relative"
          style={{ color: "var(--text-muted)" }}
          title="Notifications"
        >
          <Bell size={15} strokeWidth={2} />
          <span className="notification-dot" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/[0.04]"
          style={{ color: "var(--text-muted)" }}
          title="Toggle theme"
        >
          {isDark ? (
            <Sun size={15} strokeWidth={2} />
          ) : (
            <Moon size={15} strokeWidth={2} />
          )}
        </button>

        {/* Divider */}
        <div
          className="w-px h-5 mx-1.5"
          style={{ background: "var(--glass-border)" }}
        />

        {/* User avatar */}
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all hover:scale-105 relative overflow-hidden"
          style={{
            background: "var(--accent-gradient)",
            color: "white",
            boxShadow: "0 2px 8px rgba(99,102,241,0.25)",
          }}
        >
          F
        </button>
      </div>

      {/* Command palette search overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
          onClick={() => setSearchOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />
          <div
            className="liquid-glass-solid w-full max-w-lg mx-4 animate-fade-in-scale"
            onClick={(e) => e.stopPropagation()}
            style={{ borderRadius: "var(--radius-xl)" }}
          >
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: "1px solid var(--glass-border)" }}
            >
              <Search size={18} style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search conversations, tools, settings..."
                autoFocus
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--text-primary)" }}
              />
              <kbd>⌘K</kbd>
              <button onClick={() => setSearchOpen(false)}>
                <X size={16} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
            <div className="p-3 space-y-1">
              <p
                className="text-[10px] uppercase tracking-widest font-semibold px-2 mb-2"
                style={{ color: "var(--text-ghost)" }}
              >
                Quick Actions
              </p>
              {[
                { icon: Sparkles, label: "New Chat", kbd: "⌘N" },
                { icon: Zap, label: "Execute Code", kbd: "⌘E" },
                { icon: Search, label: "Search Web", kbd: "⌘S" },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    className="dropdown-item w-full text-left"
                    onClick={() => setSearchOpen(false)}
                  >
                    <Icon size={14} style={{ color: "var(--text-muted)" }} />
                    <span className="flex-1 text-[13px]">{action.label}</span>
                    <kbd>{action.kbd}</kbd>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
