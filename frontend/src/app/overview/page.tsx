"use client";

import { useState, useEffect, useCallback } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import {
  Activity,
  Bot,
  Zap,
  DollarSign,
  Clock,
  Radio,
  Sparkles,
  Shield,
  GitBranch,
  Settings,
  RefreshCw,
  ChevronRight,
  Server,
  Cpu,
  HardDrive,
} from "lucide-react";

interface OverviewData {
  status: string;
  version: string;
  uptime: string;
  metrics: {
    agents_running: number;
    tokens_used: number;
    total_cost: number;
    tool_calls: number;
  };
  providers: {
    total: number;
    configured: number;
    list: { id: string; name: string; status: string }[];
  };
  security_systems: string[];
  security_count: number;
  quick_actions: { id: string; label: string; icon: string }[];
  recent_activity: {
    id: string;
    type: string;
    agent_id: string;
    details: string;
    timestamp: number;
  }[];
  system_health: {
    cpu_percent: number;
    memory_percent: number;
    disk_percent: number;
  };
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const quickActionIcons: Record<string, typeof Bot> = {
  bot: Bot,
  sparkles: Sparkles,
  radio: Radio,
  "git-branch": GitBranch,
  settings: Settings,
};

const quickActionHrefs: Record<string, string> = {
  new_agent: "/agents",
  browse_skills: "/skills",
  add_channel: "/channels",
  create_workflow: "/workflows",
  settings: "/settings",
};

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    fetch(`${API_BASE}/api/overview`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 15000);
    return () => clearInterval(iv);
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: "var(--accent-indigo)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Overview
        </h2>
        <div className="flex items-center gap-3">
          <span
            className="px-3 py-1 rounded-full text-xs font-bold"
            style={{
              background: "rgba(34,197,94,0.15)",
              color: "#22c55e",
              border: "1px solid rgba(34,197,94,0.3)",
            }}
          >
            {data.status === "healthy" ? "Healthy" : data.status}
          </span>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg transition-all hover:bg-white/[0.05]"
            style={{ color: "var(--text-muted)" }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Bot, label: "Agents Running", value: String(data.metrics.agents_running), color: "#6366f1" },
          { icon: Zap, label: "Tokens Used", value: formatTokens(data.metrics.tokens_used), color: "#f59e0b" },
          { icon: DollarSign, label: "Total Cost", value: `$${data.metrics.total_cost.toFixed(2)}`, color: "#22c55e" },
          { icon: Clock, label: "Uptime", value: data.uptime, color: "#3b82f6" },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-xl p-4"
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <m.icon size={16} style={{ color: m.color }} />
              <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                {m.label}
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LLM Providers */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
        >
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--glass-border)" }}>
            <div className="flex items-center gap-2">
              <Server size={14} style={{ color: "var(--accent-indigo)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                LLM Providers
              </span>
            </div>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {data.providers.configured}/{data.providers.total} configured
            </span>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
            {data.providers.list.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-all cursor-pointer"
              >
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  {p.name}
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: p.status === "ready" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
                    color: p.status === "ready" ? "#22c55e" : "var(--text-ghost)",
                  }}
                >
                  {p.status === "ready" ? "ready" : "not configured"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Security & System Health */}
        <div className="space-y-4">
          {/* System Health */}
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Cpu size={14} style={{ color: "var(--accent-indigo)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                System Health
              </span>
            </div>
            <div className="space-y-3">
              {[
                { label: "CPU", value: data.system_health.cpu_percent, color: "#6366f1" },
                { label: "Memory", value: data.system_health.memory_percent, color: "#f59e0b" },
                { label: "Disk", value: data.system_health.disk_percent, color: "#22c55e" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                    <span className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>
                      {s.value.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(s.value, 100)}%`, background: s.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Systems */}
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} style={{ color: "#22c55e" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Security Systems
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.security_systems.map((s) => (
                <span
                  key={s}
                  className="px-2 py-1 rounded-md text-[10px] font-medium"
                  style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}
                >
                  {s}
                </span>
              ))}
            </div>
            <p className="text-[10px] mt-2" style={{ color: "var(--text-ghost)" }}>
              {data.security_count} defense-in-depth systems active
            </p>
          </div>
        </div>

        {/* Quick Actions & Activity */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
          >
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              Quick Actions
            </p>
            <div className="space-y-2">
              {data.quick_actions.map((qa) => {
                const Icon = quickActionIcons[qa.icon] || Zap;
                const href = quickActionHrefs[qa.id] || "#";
                return (
                  <a
                    key={qa.id}
                    href={href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-white/[0.05] group cursor-pointer"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(99,102,241,0.1)" }}
                    >
                      <Icon size={14} style={{ color: "var(--accent-indigo)" }} />
                    </div>
                    <span className="text-xs font-medium flex-1" style={{ color: "var(--text-secondary)" }}>
                      {qa.label}
                    </span>
                    <ChevronRight
                      size={12}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "var(--text-ghost)" }}
                    />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
          >
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--glass-border)" }}>
              <Activity size={14} style={{ color: "var(--accent-indigo)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Recent Activity
              </span>
            </div>
            <div className="max-h-[200px] overflow-y-auto p-2">
              {data.recent_activity.length === 0 ? (
                <p className="text-center text-xs py-6" style={{ color: "var(--text-ghost)" }}>
                  No recent activity
                </p>
              ) : (
                data.recent_activity.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03]">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center mt-0.5 shrink-0"
                      style={{ background: "rgba(99,102,241,0.1)" }}
                    >
                      <Activity size={10} style={{ color: "var(--accent-indigo)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate" style={{ color: "var(--text-secondary)" }}>
                        {ev.type}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: "var(--text-ghost)" }}>
                        {ev.details || ev.agent_id}
                      </p>
                    </div>
                    <span className="text-[10px] shrink-0" style={{ color: "var(--text-ghost)" }}>
                      {timeAgo(ev.timestamp)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
