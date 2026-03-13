"use client";

import { useState, useEffect } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import {
  Hand,
  Loader2,
  Play,
  Power,
  PowerOff,
  AlertTriangle,
  CheckCircle2,
  Settings2,
  Activity,
} from "lucide-react";

/* ─── Types ──────────────────────────────────── */
interface HandItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: string;
  tools: string[];
  requirements: string[];
  settings: Record<string, unknown>;
  enabled: boolean;
  last_run: number | null;
  runs: number;
}

export default function HandsPage() {
  const [hands, setHands] = useState<HandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchHands = () => {
    fetch(`${API_BASE}/api/hands`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => setHands(data.hands || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHands();
  }, []);

  const toggleHand = async (id: string, enable: boolean) => {
    setToggling(id);
    try {
      await fetch(`${API_BASE}/api/hands/${id}/enable`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ enabled: enable }),
      });
      setHands((prev) =>
        prev.map((h) => (h.id === id ? { ...h, enabled: enable } : h)),
      );
    } catch {
      /* */
    }
    setToggling(null);
  };

  const runHand = async (id: string) => {
    setRunning(id);
    try {
      await fetch(`${API_BASE}/api/hands/${id}/run`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      setHands((prev) =>
        prev.map((h) =>
          h.id === id
            ? {
                ...h,
                runs: h.runs + 1,
                last_run: Date.now() / 1000,
                enabled: true,
              }
            : h,
        ),
      );
    } catch {
      /* */
    }
    setRunning(null);
  };

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const timeAgo = (ts: number | null) => {
    if (!ts) return "Never";
    const diff = now / 1000 - ts;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-cyan)]" />
      </div>
    );
  }

  const enabledCount = hands.filter((h) => h.enabled).length;

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <Hand className="w-8 h-8 text-[var(--warning)]" />
          Hands
          <span className="text-sm font-normal text-[var(--text-ghost)] bg-[var(--glass-bg)] px-2 py-0.5 rounded-lg">
            Autonomous
          </span>
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          {hands.length} hands available · {enabledCount} enabled · Fully
          autonomous tool agents
        </p>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="liquid-glass liquid-glass-hover rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{hands.length}</div>
          <div className="text-xs text-[var(--text-ghost)]">Total Hands</div>
        </div>
        <div className="bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.15)] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[var(--success)]">
            {enabledCount}
          </div>
          <div className="text-xs text-[var(--success)]">Enabled</div>
        </div>
        <div className="bg-[rgba(6,182,212,0.05)] border border-[rgba(6,182,212,0.15)] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[var(--accent-cyan)]">
            {hands.reduce((a, h) => a + h.runs, 0)}
          </div>
          <div className="text-xs text-[var(--accent-cyan)]/60">Total Runs</div>
        </div>
      </div>

      {/* Hands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hands.map((h) => (
          <div
            key={h.id}
            className={`bg-[var(--glass-bg)] border rounded-2xl p-5 backdrop-blur-xl transition-all ${
              h.enabled
                ? "border-[rgba(16,185,129,0.2)] shadow-lg shadow-[rgba(16,185,129,0.05)]"
                : "border-[var(--glass-border)]"
            }`}
          >
            {/* Top */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{h.icon}</span>
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    {h.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {h.enabled ? (
                      <span className="flex items-center gap-1 text-[10px] text-[var(--success)]">
                        <CheckCircle2 className="w-3 h-3" /> Enabled
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-[var(--text-ghost)]">
                        <PowerOff className="w-3 h-3" /> Disabled
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--text-ghost)]">·</span>
                    <span className="text-[10px] text-[var(--text-ghost)]">
                      {h.runs} runs
                    </span>
                    <span className="text-[10px] text-[var(--text-ghost)]">·</span>
                    <span className="text-[10px] text-[var(--text-ghost)]">
                      {timeAgo(h.last_run)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleHand(h.id, !h.enabled)}
                disabled={toggling === h.id}
                className={`p-2 rounded-lg transition-all ${
                  h.enabled
                    ? "bg-[rgba(16,185,129,0.1)] text-[var(--success)] hover:bg-[rgba(16,185,129,0.15)]"
                    : "bg-[var(--glass-bg)] text-[var(--text-ghost)] hover:bg-[var(--glass-bg)]"
                }`}
              >
                {toggling === h.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Power className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-[var(--text-ghost)] mb-4">{h.description}</p>

            {/* Tools */}
            <div className="mb-4">
              <div className="text-[10px] text-[var(--text-ghost)] uppercase tracking-wider mb-1.5">
                Tools
              </div>
              <div className="flex flex-wrap gap-1.5">
                {h.tools.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 text-[10px] liquid-glass rounded-md text-[var(--text-muted)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Requirements */}
            <div className="mb-4">
              <div className="text-[10px] text-[var(--text-ghost)] uppercase tracking-wider mb-1.5">
                Requirements
              </div>
              <div className="flex flex-wrap gap-1.5">
                {h.requirements.map((r) => (
                  <span
                    key={r}
                    className="px-2 py-0.5 text-[10px] bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.15)] rounded-md text-[var(--warning)]"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => runHand(h.id)}
                disabled={running === h.id}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-[rgba(6,182,212,0.1)] text-[var(--accent-cyan)] border border-[rgba(6,182,212,0.15)] hover:bg-[rgba(6,182,212,0.15)] disabled:opacity-50 transition-all"
              >
                {running === h.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                Run Now
              </button>
              <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs text-[var(--text-ghost)] liquid-glass hover:bg-[var(--glass-bg)]">
                <Settings2 className="w-3 h-3" />
                Settings
              </button>
              <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs text-[var(--text-ghost)] liquid-glass hover:bg-[var(--glass-bg)]">
                <Activity className="w-3 h-3" />
                Logs
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div className="mt-8 bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.15)] rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[var(--warning)] shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-[var(--warning)]">
            Autonomous Agents
          </h4>
          <p className="text-xs text-[var(--text-ghost)] mt-1">
            Hands are fully autonomous agents that can run tasks independently.
            Enable a hand and it will execute its assigned tools on your behalf.
            Always review hand outputs for accuracy.
          </p>
        </div>
      </div>
    </div>
  );
}
