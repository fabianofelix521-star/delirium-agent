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
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const enabledCount = hands.filter((h) => h.enabled).length;

  return (
    <div className="min-h-screen bg-linear-to-br from-[#0a0a14] via-[#0d0d1a] to-[#0a0a14] p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Hand className="w-8 h-8 text-orange-400" />
          Hands
          <span className="text-sm font-normal text-white/30 bg-white/5 px-2 py-0.5 rounded-lg">
            Autonomous
          </span>
        </h1>
        <p className="text-white/50 mt-1">
          {hands.length} hands available · {enabledCount} enabled · Fully
          autonomous tool agents
        </p>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white/3 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{hands.length}</div>
          <div className="text-xs text-white/40">Total Hands</div>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {enabledCount}
          </div>
          <div className="text-xs text-emerald-400/60">Enabled</div>
        </div>
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-cyan-400">
            {hands.reduce((a, h) => a + h.runs, 0)}
          </div>
          <div className="text-xs text-cyan-400/60">Total Runs</div>
        </div>
      </div>

      {/* Hands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hands.map((h) => (
          <div
            key={h.id}
            className={`bg-white/3 border rounded-2xl p-5 backdrop-blur-xl transition-all ${
              h.enabled
                ? "border-emerald-500/30 shadow-lg shadow-emerald-500/5"
                : "border-white/10"
            }`}
          >
            {/* Top */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{h.icon}</span>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {h.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {h.enabled ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Enabled
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-white/30">
                        <PowerOff className="w-3 h-3" /> Disabled
                      </span>
                    )}
                    <span className="text-[10px] text-white/20">·</span>
                    <span className="text-[10px] text-white/30">
                      {h.runs} runs
                    </span>
                    <span className="text-[10px] text-white/20">·</span>
                    <span className="text-[10px] text-white/30">
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
                    ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    : "bg-white/5 text-white/30 hover:bg-white/10"
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
            <p className="text-xs text-white/40 mb-4">{h.description}</p>

            {/* Tools */}
            <div className="mb-4">
              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">
                Tools
              </div>
              <div className="flex flex-wrap gap-1.5">
                {h.tools.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded-md text-white/50"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Requirements */}
            <div className="mb-4">
              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">
                Requirements
              </div>
              <div className="flex flex-wrap gap-1.5">
                {h.requirements.map((r) => (
                  <span
                    key={r}
                    className="px-2 py-0.5 text-[10px] bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-400/70"
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
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 disabled:opacity-50 transition-all"
              >
                {running === h.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                Run Now
              </button>
              <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs text-white/40 bg-white/5 border border-white/10 hover:bg-white/10">
                <Settings2 className="w-3 h-3" />
                Settings
              </button>
              <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs text-white/40 bg-white/5 border border-white/10 hover:bg-white/10">
                <Activity className="w-3 h-3" />
                Logs
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div className="mt-8 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-amber-400">
            Autonomous Agents
          </h4>
          <p className="text-xs text-white/40 mt-1">
            Hands are fully autonomous agents that can run tasks independently.
            Enable a hand and it will execute its assigned tools on your behalf.
            Always review hand outputs for accuracy.
          </p>
        </div>
      </div>
    </div>
  );
}
