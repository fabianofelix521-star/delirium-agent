"use client";

import { useState, useEffect, useCallback } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import {
  FileText,
  Search,
  Trash2,
  Download,
  RefreshCw,
  AlertTriangle,
  Info,
  XCircle,
  Bug,
} from "lucide-react";

interface LogEntry {
  id: string;
  level: string;
  message: string;
  source: string;
  timestamp: number;
}

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entity_id: string;
  details: string;
  user: string;
  timestamp: number;
}

const levelIcons: Record<string, typeof Info> = {
  INFO: Info,
  WARN: AlertTriangle,
  ERROR: XCircle,
  DEBUG: Bug,
};

const levelColors: Record<string, string> = {
  INFO: "#3b82f6",
  WARN: "#f59e0b",
  ERROR: "#ef4444",
  DEBUG: "#8b5cf6",
};

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString();
}

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function LogsPage() {
  const [tab, setTab] = useState<"live" | "audit">("live");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(() => {
    if (paused) return;
    const params = new URLSearchParams();
    if (filter !== "All") params.set("level", filter);
    if (search) params.set("search", search);
    fetch(`${API_BASE}/api/logs?${params}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setLogs(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter, search, paused]);

  const fetchAudit = useCallback(() => {
    fetch(`${API_BASE}/api/logs/audit`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setAudit(d);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "live") {
      fetchLogs();
      const iv = setInterval(fetchLogs, 3000);
      return () => clearInterval(iv);
    } else {
      fetchAudit();
    }
  }, [tab, fetchLogs, fetchAudit]);

  const clearLogs = () => {
    fetch(`${API_BASE}/api/logs`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    }).then(() => setLogs([]));
  };

  const exportLogs = () => {
    fetch(`${API_BASE}/api/logs/export`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `delirium-logs-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Logs
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <option>All</option>
            <option>INFO</option>
            <option>WARN</option>
            <option>ERROR</option>
          </select>
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-ghost)" }}
            />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 pr-3 py-1.5 rounded-lg text-xs w-40"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <button
            onClick={() => setPaused(!paused)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: paused
                ? "rgba(239,68,68,0.15)"
                : "rgba(34,197,94,0.15)",
              color: paused ? "#ef4444" : "#22c55e",
              border: `1px solid ${paused ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
            }}
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={clearLogs}
            className="p-1.5 rounded-lg hover:bg-white/5"
            style={{ color: "var(--text-ghost)" }}
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={exportLogs}
            className="p-1.5 rounded-lg hover:bg-white/5"
            style={{ color: "var(--text-ghost)" }}
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-lg w-fit"
        style={{ background: "var(--bg-elevated)" }}
      >
        {(["live", "audit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              background: tab === t ? "rgba(99,102,241,0.15)" : "transparent",
              color: tab === t ? "var(--accent-indigo)" : "var(--text-muted)",
            }}
          >
            {t === "live" ? "Live" : "Audit Trail"}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "live" ? (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            {loading ? (
              <p
                className="text-center text-xs py-10"
                style={{ color: "var(--text-ghost)" }}
              >
                Connecting to log stream...
              </p>
            ) : logs.length === 0 ? (
              <p
                className="text-center text-xs py-10"
                style={{ color: "var(--text-ghost)" }}
              >
                No logs matching your filters
              </p>
            ) : (
              <div
                className="divide-y"
                style={{ borderColor: "var(--glass-border)" }}
              >
                {logs.map((log) => {
                  const Icon = levelIcons[log.level] || Info;
                  const color = levelColors[log.level] || "#3b82f6";
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.02]"
                    >
                      <Icon
                        size={13}
                        style={{ color }}
                        className="mt-0.5 shrink-0"
                      />
                      <span
                        className="text-[10px] font-mono shrink-0 w-16"
                        style={{ color: "var(--text-ghost)" }}
                      >
                        {formatTime(log.timestamp)}
                      </span>
                      <span
                        className="text-[10px] font-bold shrink-0 w-10 text-center rounded px-1"
                        style={{ color, background: `${color}15` }}
                      >
                        {log.level}
                      </span>
                      <span
                        className="text-[10px] shrink-0 w-16 truncate"
                        style={{ color: "var(--text-ghost)" }}
                      >
                        [{log.source}]
                      </span>
                      <span
                        className="text-xs flex-1"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {log.message}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div className="p-4 space-y-2">
            {audit.length === 0 ? (
              <p
                className="text-center text-xs py-10"
                style={{ color: "var(--text-ghost)" }}
              >
                No audit trail events
              </p>
            ) : (
              audit.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03]"
                >
                  <FileText
                    size={12}
                    style={{ color: "var(--accent-indigo)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {a.action} — {a.entity}
                    </p>
                    {a.details && (
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--text-ghost)" }}
                      >
                        {a.details}
                      </p>
                    )}
                  </div>
                  <span
                    className="text-[10px] shrink-0"
                    style={{ color: "var(--text-ghost)" }}
                  >
                    {timeAgo(a.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
