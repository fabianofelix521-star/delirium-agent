"use client";

import { useState, useEffect, useCallback } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Zap,
  RefreshCw,
} from "lucide-react";

interface AnalyticsData {
  total_tokens: number;
  total_cost: number;
  total_calls: number;
  by_provider: {
    provider: string;
    calls: number;
    tokens: number;
    cost: number;
  }[];
  by_model: { model: string; calls: number; tokens: number; cost: number }[];
  daily: { date: string; calls: number; tokens: number; cost: number }[];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(n: number): string {
  return `$${n.toFixed(4)}`;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    fetch(`${API_BASE}/api/analytics`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div
          className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full"
          style={{
            borderColor: "var(--accent-indigo)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  const maxDailyTokens = Math.max(...data.daily.map((d) => d.tokens), 1);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Analytics
        </h2>
        <button
          onClick={fetchData}
          className="p-2 rounded-lg hover:bg-white/[0.05]"
          style={{ color: "var(--text-muted)" }}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            icon: Zap,
            label: "Total Tokens",
            value: formatTokens(data.total_tokens),
            color: "#f59e0b",
          },
          {
            icon: DollarSign,
            label: "Total Cost",
            value: formatCost(data.total_cost),
            color: "#22c55e",
          },
          {
            icon: BarChart3,
            label: "API Calls",
            value: String(data.total_calls),
            color: "#6366f1",
          },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-xl p-4"
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <m.icon size={14} style={{ color: m.color }} />
              <span
                className="text-[11px]"
                style={{ color: "var(--text-muted)" }}
              >
                {m.label}
              </span>
            </div>
            <p
              className="text-2xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Daily Usage Chart */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} style={{ color: "var(--accent-indigo)" }} />
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Daily Token Usage (Last 7 Days)
          </span>
        </div>
        <div className="flex items-end gap-2 h-[160px]">
          {data.daily.map((day) => {
            const height =
              maxDailyTokens > 0 ? (day.tokens / maxDailyTokens) * 100 : 0;
            const dayName = new Date(day.date + "T00:00:00").toLocaleDateString(
              "en",
              { weekday: "short" },
            );
            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <span
                  className="text-[9px] font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  {formatTokens(day.tokens)}
                </span>
                <div
                  className="w-full flex justify-center"
                  style={{ height: "120px" }}
                >
                  <div
                    className="w-8 rounded-t-md transition-all"
                    style={{
                      height: `${Math.max(height, 2)}%`,
                      background: "var(--accent-gradient)",
                      alignSelf: "flex-end",
                    }}
                  />
                </div>
                <span
                  className="text-[10px]"
                  style={{ color: "var(--text-ghost)" }}
                >
                  {dayName}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Provider */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div
            className="px-4 py-3"
            style={{ borderBottom: "1px solid var(--glass-border)" }}
          >
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Usage by Provider
            </span>
          </div>
          <div className="p-3 space-y-2">
            {data.by_provider.length === 0 ? (
              <p
                className="text-center text-xs py-6"
                style={{ color: "var(--text-ghost)" }}
              >
                No usage data yet
              </p>
            ) : (
              data.by_provider.map((p) => (
                <div
                  key={p.provider}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.03]"
                >
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {p.provider}
                  </span>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--text-ghost)" }}
                    >
                      {formatTokens(p.tokens)}
                    </span>
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: "#22c55e" }}
                    >
                      {formatCost(p.cost)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* By Model */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div
            className="px-4 py-3"
            style={{ borderBottom: "1px solid var(--glass-border)" }}
          >
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Usage by Model
            </span>
          </div>
          <div className="p-3 space-y-2">
            {data.by_model.length === 0 ? (
              <p
                className="text-center text-xs py-6"
                style={{ color: "var(--text-ghost)" }}
              >
                No usage data yet
              </p>
            ) : (
              data.by_model.map((m) => (
                <div
                  key={m.model}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.03]"
                >
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {m.model}
                  </span>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--text-ghost)" }}
                    >
                      {m.calls} calls
                    </span>
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: "#22c55e" }}
                    >
                      {formatCost(m.cost)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
