"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  Zap,
  Sparkles,
  ArrowRight,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getAuthHeaders, API_BASE } from "@/lib/api";

interface Agent {
  id: string;
  name: string;
  role: string;
  icon: string;
  color: string;
  description: string;
  category: string;
  skills: string[];
  can_delegate_to: string[];
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAgent, setActiveAgent] = useState<string>("");
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchAgents();
    const saved = localStorage.getItem("delirium_active_agent");
    if (saved) setActiveAgent(saved);
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agents`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (err) {
      console.error("Failed to fetch agents:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectAgent = (id: string) => {
    const newId = activeAgent === id ? "" : id;
    setActiveAgent(newId);
    if (newId) {
      localStorage.setItem("delirium_active_agent", newId);
    } else {
      localStorage.removeItem("delirium_active_agent");
    }
  };

  const categories = [
    "all",
    ...Array.from(new Set(agents.map((a) => a.category))),
  ];

  const filtered = agents.filter((a) => {
    const matchCat = filterCategory === "all" || a.category === filterCategory;
    const matchSearch =
      !searchQuery ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.skills.some((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    return matchCat && matchSearch;
  });

  const activeAgentData = agents.find((a) => a.id === activeAgent);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.1)" }}
          >
            <Bot size={20} style={{ color: "var(--accent-indigo)" }} />
          </div>
          <div>
            <h1
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              AI Agents
            </h1>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {agents.length} specialists · Multi-agent system
            </p>
          </div>
        </div>

        {activeAgentData && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
            style={{
              background: `${activeAgentData.color}10`,
              borderColor: `${activeAgentData.color}30`,
            }}
          >
            <span className="text-sm">{activeAgentData.icon}</span>
            <span
              className="text-[11px] font-semibold"
              style={{ color: activeAgentData.color }}
            >
              {activeAgentData.name} Active
            </span>
            <Zap size={11} style={{ color: activeAgentData.color }} />
          </div>
        )}
      </div>

      {/* Active Agent Banner */}
      {activeAgentData && (
        <div
          className="liquid-glass p-4 transition-all animate-fade-in"
          style={{ borderColor: `${activeAgentData.color}20` }}
        >
          <div className="relative z-10 flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: `${activeAgentData.color}15` }}
            >
              {activeAgentData.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h2
                className="text-sm font-bold flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                {activeAgentData.name}
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: `${activeAgentData.color}15`,
                    color: activeAgentData.color,
                  }}
                >
                  {activeAgentData.role}
                </span>
              </h2>
              <p
                className="text-[12px] mt-1 leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                {activeAgentData.description}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {activeAgentData.skills.map((s) => (
                  <span
                    key={s}
                    className="text-[9px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: "var(--bg-elevated)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => (window.location.href = "/chat")}
              className="btn-primary flex items-center gap-1.5 text-[11px] shrink-0"
            >
              Chat <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-ghost)" }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents or skills..."
            className="input-glass w-full pl-9 text-[12px]"
          />
        </div>
        <div className="flex gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-semibold capitalize transition-all"
              style={{
                background:
                  filterCategory === cat
                    ? "var(--accent-indigo)"
                    : "var(--bg-elevated)",
                color:
                  filterCategory === cat ? "#fff" : "var(--text-muted)",
                border: `1px solid ${filterCategory === cat ? "transparent" : "var(--glass-border)"}`,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Agents Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((a) => {
            const isActive = activeAgent === a.id;
            const isExpanded = expandedAgent === a.id;

            return (
              <div
                key={a.id}
                className={`liquid-glass liquid-glass-hover p-4 transition-all cursor-pointer ${isActive ? "ring-1" : ""}`}
                style={
                  isActive
                    ? {
                        borderColor: `${a.color}40`,
                        boxShadow: `0 0 20px ${a.color}10`,
                      }
                    : {}
                }
                onClick={() => selectAgent(a.id)}
              >
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: `${a.color}12` }}
                    >
                      {a.icon}
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <div className="flex items-center gap-1">
                          <div
                            className="w-1.5 h-1.5 rounded-full animate-pulse"
                            style={{ background: "var(--success)" }}
                          />
                          <span
                            className="text-[9px] font-bold uppercase tracking-wider"
                            style={{ color: "var(--success)" }}
                          >
                            Active
                          </span>
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedAgent(isExpanded ? null : a.id);
                        }}
                        className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                        style={{ color: "var(--text-ghost)" }}
                      >
                        {isExpanded ? (
                          <ChevronUp size={12} />
                        ) : (
                          <ChevronDown size={12} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <h3
                    className="text-[13px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {a.name}
                  </h3>
                  <p
                    className="text-[11px] mt-0.5"
                    style={{ color: a.color }}
                  >
                    {a.role}
                  </p>
                  <p
                    className="text-[10px] mt-1.5 leading-relaxed line-clamp-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {a.description}
                  </p>

                  {/* Skills (always show top 3) */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {a.skills.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="text-[8px] px-1.5 py-0.5 rounded font-medium"
                        style={{
                          background: `${a.color}10`,
                          color: a.color,
                        }}
                      >
                        {s}
                      </span>
                    ))}
                    {a.skills.length > 3 && (
                      <span
                        className="text-[8px] px-1.5 py-0.5 rounded font-medium"
                        style={{
                          background: "var(--bg-elevated)",
                          color: "var(--text-ghost)",
                        }}
                      >
                        +{a.skills.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-white/5 animate-fade-in space-y-2">
                      <div>
                        <p
                          className="text-[9px] font-semibold uppercase tracking-wider mb-1"
                          style={{ color: "var(--text-ghost)" }}
                        >
                          All Skills
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {a.skills.map((s) => (
                            <span
                              key={s}
                              className="text-[8px] px-1.5 py-0.5 rounded font-medium"
                              style={{
                                background: `${a.color}10`,
                                color: a.color,
                              }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      {a.can_delegate_to.length > 0 && (
                        <div>
                          <p
                            className="text-[9px] font-semibold uppercase tracking-wider mb-1"
                            style={{ color: "var(--text-ghost)" }}
                          >
                            Delegates To
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {a.can_delegate_to.map((d) => (
                              <span
                                key={d}
                                className="text-[8px] px-1.5 py-0.5 rounded font-medium"
                                style={{
                                  background: "var(--bg-elevated)",
                                  color: "var(--text-muted)",
                                  border: "1px solid var(--glass-border)",
                                }}
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <div className="liquid-glass p-4">
        <div className="relative z-10 flex items-start gap-3">
          <Sparkles
            size={16}
            className="shrink-0 mt-0.5"
            style={{ color: "var(--accent-violet)" }}
          />
          <div>
            <h3
              className="text-[12px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Multi-Agent System
            </h3>
            <p
              className="text-[11px] mt-1 leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              Select an agent to activate it. When active, the agent&apos;s
              specialized personality and skills are used in chat. The Maestro
              agent can delegate tasks to other specialists automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
