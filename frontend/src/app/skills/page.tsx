"use client";

import { useState, useEffect } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import {
  Search,
  Download,
  Trash2,
  Check,
  Sparkles,
  Filter,
  ChevronDown,
  Bot,
  Zap,
} from "lucide-react";

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  author: string;
  version: string;
  tags: string[];
  compatible_agents: string[];
  install_count?: number;
}

interface Agent {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  research: "🔍",
  development: "💻",
  design: "🎨",
  devops: "⚙️",
  content: "✍️",
  analytics: "📊",
  media: "🎙️",
  security: "🛡️",
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [installedSkills, setInstalledSkills] = useState<Set<string>>(
    new Set(),
  );
  const [installing, setInstalling] = useState<string | null>(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/skills`, { headers: getAuthHeaders() }).then((r) =>
        r.json(),
      ),
      fetch(`${API_BASE}/api/agents`, { headers: getAuthHeaders() }).then((r) =>
        r.json(),
      ),
    ])
      .then(([skillsData, agentsData]) => {
        setSkills(skillsData);
        setAgents(agentsData);
        if (agentsData.length > 0) {
          const saved = localStorage.getItem("delirium_active_agent");
          setSelectedAgent(saved || agentsData[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load installed skills when agent changes
  useEffect(() => {
    if (!selectedAgent) return;
    fetch(`${API_BASE}/api/skills/installed/${selectedAgent}`, {
      headers: getAuthHeaders(),
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setInstalledSkills(new Set(data.map((s: Skill) => s.id)));
        }
      })
      .catch(() => {});
  }, [selectedAgent]);

  const categories = [
    "all",
    ...Array.from(new Set(skills.map((s) => s.category))),
  ];

  const filtered = skills.filter((s) => {
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchCategory =
      activeCategory === "all" || s.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const installSkill = async (skillId: string) => {
    if (!selectedAgent) return;
    setInstalling(skillId);
    try {
      const res = await fetch(`${API_BASE}/api/skills/${skillId}/install`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ agent_id: selectedAgent }),
      });
      if (res.ok) {
        setInstalledSkills((prev) => new Set([...prev, skillId]));
      }
    } catch {
      /* */
    }
    setInstalling(null);
  };

  const uninstallSkill = async (skillId: string) => {
    if (!selectedAgent) return;
    setInstalling(skillId);
    try {
      const res = await fetch(`${API_BASE}/api/skills/${skillId}/uninstall`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ agent_id: selectedAgent }),
      });
      if (res.ok) {
        setInstalledSkills((prev) => {
          const next = new Set(prev);
          next.delete(skillId);
          return next;
        });
      }
    } catch {
      /* */
    }
    setInstalling(null);
  };

  const selectedAgentData = agents.find((a) => a.id === selectedAgent);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(236,72,153,0.15))",
            }}
          >
            <Sparkles size={20} style={{ color: "var(--accent-indigo)" }} />
          </div>
          <div>
            <h1
              className="text-lg font-bold flex items-center gap-2"
              style={{ color: "var(--text-primary)" }}
            >
              ClawHub
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #ec4899)",
                  color: "white",
                }}
              >
                Skill Bank
              </span>
            </h1>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {skills.length} skills disponíveis · Instale no seu agente
            </p>
          </div>
        </div>

        {/* Agent Selector */}
        <div className="relative">
          <button
            onClick={() => setShowAgentPicker(!showAgentPicker)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium w-full sm:w-auto"
            style={{
              background: selectedAgentData
                ? `${selectedAgentData.color}10`
                : "var(--bg-elevated)",
              border: `1px solid ${selectedAgentData ? `${selectedAgentData.color}30` : "var(--glass-border)"}`,
              color: "var(--text-primary)",
            }}
          >
            <Bot size={14} style={{ color: selectedAgentData?.color }} />
            {selectedAgentData ? (
              <>
                <span>{selectedAgentData.icon}</span>
                <span>{selectedAgentData.name}</span>
              </>
            ) : (
              "Selecionar agente"
            )}
            <ChevronDown size={12} style={{ color: "var(--text-muted)" }} />
          </button>
          {showAgentPicker && (
            <div
              className="absolute top-full right-0 mt-1 w-48 rounded-xl overflow-hidden z-50"
              style={{
                background: "var(--glass-bg-solid)",
                border: "1px solid var(--glass-border)",
                boxShadow: "var(--glass-shadow)",
              }}
            >
              {agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setSelectedAgent(a.id);
                    setShowAgentPicker(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:opacity-80 transition-colors"
                  style={{
                    color:
                      selectedAgent === a.id
                        ? a.color
                        : "var(--text-secondary)",
                    background:
                      selectedAgent === a.id ? `${a.color}08` : "transparent",
                  }}
                >
                  <span>{a.icon}</span>
                  <span className="font-medium">{a.name}</span>
                  {selectedAgent === a.id && (
                    <Check
                      size={12}
                      className="ml-auto"
                      style={{ color: a.color }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Banner */}
      <div
        className="liquid-glass p-3 flex items-center gap-4 overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="flex items-center gap-2 shrink-0">
          <Zap size={14} style={{ color: "#f59e0b" }} />
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            <strong style={{ color: "var(--text-primary)" }}>
              {installedSkills.size}
            </strong>{" "}
            instaladas
          </span>
        </div>
        <div
          className="w-px h-4"
          style={{ background: "var(--glass-border)" }}
        />
        <div className="flex items-center gap-2 shrink-0">
          <Sparkles size={14} style={{ color: "#6366f1" }} />
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            <strong style={{ color: "var(--text-primary)" }}>
              {skills.length}
            </strong>{" "}
            disponíveis
          </span>
        </div>
        <div
          className="w-px h-4"
          style={{ background: "var(--glass-border)" }}
        />
        <div className="flex items-center gap-2 shrink-0">
          <Filter size={14} style={{ color: "#10b981" }} />
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            <strong style={{ color: "var(--text-primary)" }}>
              {categories.length - 1}
            </strong>{" "}
            categorias
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1 relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-ghost)" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar skills, tags..."
            className="input-glass w-full pl-9 text-[12px]"
          />
        </div>
        <div
          className="flex gap-1.5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold capitalize transition-all whitespace-nowrap shrink-0"
              style={{
                background:
                  activeCategory === cat
                    ? "var(--accent-indigo)"
                    : "var(--bg-elevated)",
                color: activeCategory === cat ? "#fff" : "var(--text-muted)",
                border: `1px solid ${activeCategory === cat ? "transparent" : "var(--glass-border)"}`,
              }}
            >
              {cat !== "all" && <span>{CATEGORY_ICONS[cat] || "📦"}</span>}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Skills Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="liquid-glass p-4 animate-pulse">
              <div
                className="w-12 h-12 rounded-xl mb-3"
                style={{ background: "var(--bg-elevated)" }}
              />
              <div
                className="h-3 w-24 rounded mb-2"
                style={{ background: "var(--bg-elevated)" }}
              />
              <div
                className="h-2 w-full rounded"
                style={{ background: "var(--bg-elevated)" }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((skill) => {
            const isInstalled = installedSkills.has(skill.id);
            const isCompatible =
              skill.compatible_agents.includes(selectedAgent);
            const isProcessing = installing === skill.id;

            return (
              <div
                key={skill.id}
                className={`liquid-glass liquid-glass-hover p-4 transition-all ${isInstalled ? "ring-1" : ""}`}
                style={
                  isInstalled
                    ? {
                        borderColor: `${skill.color}30`,
                        boxShadow: `0 0 20px ${skill.color}08`,
                      }
                    : {}
                }
              >
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-lg"
                      style={{ background: `${skill.color}12` }}
                    >
                      {skill.icon}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isInstalled && (
                        <span
                          className="flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                          style={{
                            background: "rgba(16,185,129,0.1)",
                            color: "#10b981",
                          }}
                        >
                          <Check size={9} /> Active
                        </span>
                      )}
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize"
                        style={{
                          background: "var(--bg-elevated)",
                          color: "var(--text-muted)",
                          border: "1px solid var(--glass-border)",
                        }}
                      >
                        {skill.category}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <h3
                    className="text-[13px] font-bold mb-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {skill.name}
                  </h3>
                  <p
                    className="text-[11px] leading-relaxed mb-3 line-clamp-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {skill.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {skill.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] px-1.5 py-0.5 rounded-full"
                        style={{
                          background: `${skill.color}08`,
                          color: skill.color,
                          border: `1px solid ${skill.color}20`,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[9px]"
                        style={{ color: "var(--text-ghost)" }}
                      >
                        v{skill.version}
                      </span>
                      <span
                        className="text-[9px]"
                        style={{ color: "var(--text-ghost)" }}
                      >
                        · {skill.author}
                      </span>
                    </div>

                    {isInstalled ? (
                      <button
                        onClick={() => uninstallSkill(skill.id)}
                        disabled={isProcessing}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:opacity-80"
                        style={{
                          background: "rgba(239,68,68,0.1)",
                          color: "#ef4444",
                          border: "1px solid rgba(239,68,68,0.2)",
                        }}
                      >
                        <Trash2 size={10} />
                        {isProcessing ? "..." : "Remover"}
                      </button>
                    ) : (
                      <button
                        onClick={() => installSkill(skill.id)}
                        disabled={isProcessing || !isCompatible}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:opacity-80 disabled:opacity-40"
                        style={{
                          background: isCompatible
                            ? "var(--accent-gradient)"
                            : "var(--bg-elevated)",
                          color: isCompatible ? "white" : "var(--text-ghost)",
                          border: isCompatible
                            ? "none"
                            : "1px solid var(--glass-border)",
                        }}
                      >
                        <Download size={10} />
                        {isProcessing
                          ? "..."
                          : isCompatible
                            ? "Instalar"
                            : "Incompatível"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.1)" }}
          >
            <Search size={24} style={{ color: "var(--accent-indigo)" }} />
          </div>
          <p
            className="text-[13px] font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Nenhuma skill encontrada
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Tente outro termo de busca ou categoria
          </p>
        </div>
      )}
    </div>
  );
}
