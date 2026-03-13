"use client";

import { useState, useEffect, useCallback } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import {
  MessageSquare,
  Search,
} from "lucide-react";

interface SessionItem {
  id: string;
  agent_name: string;
  message_count: number;
  created_at: number;
  updated_at: number;
  status: string;
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

export default function SessionsPage() {
  const [tab, setTab] = useState<"sessions" | "memory">("sessions");
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [memories, setMemories] = useState<{ id: number; content: string; tags: string[]; created_at: string }[]>([]);

  const fetchSessions = useCallback(() => {
    const params = new URLSearchParams();
    if (filter) params.set("agent", filter);
    fetch(`${API_BASE}/api/sessions?${params}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setSessions(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter]);

  const fetchMemories = useCallback(() => {
    fetch(`${API_BASE}/api/memory`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setMemories(d);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "sessions") fetchSessions();
    else fetchMemories();
  }, [tab, fetchSessions, fetchMemories]);

  const deleteSession = (id: string) => {
    fetch(`${API_BASE}/api/sessions/${id}`, { method: "DELETE", headers: getAuthHeaders() })
      .then(() => setSessions((prev) => prev.filter((s) => s.id !== id)));
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Sessions
        </h2>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-ghost)" }} />
          <input
            type="text"
            placeholder="Filter by agent..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-7 pr-3 py-1.5 rounded-lg text-xs w-48"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: "var(--bg-elevated)" }}>
        {(["sessions", "memory"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              background: tab === t ? "rgba(99,102,241,0.15)" : "transparent",
              color: tab === t ? "var(--accent-indigo)" : "var(--text-muted)",
            }}
          >
            {t === "sessions" ? "Sessions" : "Memory"}
          </button>
        ))}
      </div>

      {/* Sessions Tab */}
      {tab === "sessions" && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
        >
          {loading ? (
            <p className="text-center text-xs py-10" style={{ color: "var(--text-ghost)" }}>
              Loading sessions...
            </p>
          ) : sessions.length === 0 ? (
            <div className="text-center py-14">
              <MessageSquare size={30} className="mx-auto mb-3" style={{ color: "var(--text-ghost)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>No sessions yet</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-ghost)" }}>
                Each conversation with an agent creates a session.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    {["Session", "Agent", "Messages", "Created", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-ghost)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02]" style={{ borderBottom: "1px solid var(--glass-border)" }}>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                          {s.id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                          {s.agent_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {s.message_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: "var(--text-ghost)" }}>
                          {formatDate(s.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <a
                            href={`/chat?session=${s.id}`}
                            className="px-2 py-1 rounded text-[10px] font-medium"
                            style={{ background: "rgba(99,102,241,0.15)", color: "var(--accent-indigo)" }}
                          >
                            Chat
                          </a>
                          <button
                            onClick={() => deleteSession(s.id)}
                            className="px-2 py-1 rounded text-[10px] font-medium"
                            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Memory Tab */}
      {tab === "memory" && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
        >
          <div className="p-4">
            <div className="mb-4">
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Conversation Sessions
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-ghost)" }}>
                Each conversation with an agent creates a session. Sessions store the full message history so you can resume conversations later, or review past interactions.
              </p>
            </div>
            <div className="space-y-2">
              {memories.length === 0 ? (
                <p className="text-center text-xs py-8" style={{ color: "var(--text-ghost)" }}>
                  No memories stored yet
                </p>
              ) : (
                memories.map((m) => (
                  <div key={m.id} className="px-4 py-3 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{m.content}</p>
                    {m.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {m.tags.map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: "rgba(99,102,241,0.1)", color: "var(--accent-indigo)" }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
