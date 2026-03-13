"use client";

import { useState, useEffect, useCallback } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import {
  ShieldCheck,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface Approval {
  id: string;
  agent_id: string;
  agent_name: string;
  action: string;
  description: string;
  risk_level: string;
  status: string;
  requested_at: number;
  resolved_at: number | null;
  resolved_by: string | null;
}

const statusColors: Record<string, { bg: string; color: string; border: string }> = {
  pending: { bg: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "rgba(245,158,11,0.3)" },
  approved: { bg: "rgba(34,197,94,0.1)", color: "#22c55e", border: "rgba(34,197,94,0.3)" },
  rejected: { bg: "rgba(239,68,68,0.1)", color: "#ef4444", border: "rgba(239,68,68,0.3)" },
};

const riskColors: Record<string, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#dc2626",
};

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    const params = filter !== "all" ? `?status=${filter}` : "";
    fetch(`${API_BASE}/api/approvals${params}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setApprovals(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, [fetchData]);

  const handleAction = (id: string, action: "approve" | "reject") => {
    fetch(`${API_BASE}/api/approvals/${id}/${action}`, {
      method: "POST",
      headers: getAuthHeaders(),
    }).then(() => fetchData());
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Execution Approvals
        </h2>
        <button onClick={fetchData} className="p-2 rounded-lg hover:bg-white/5" style={{ color: "var(--text-muted)" }}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: "var(--bg-elevated)" }}>
        {["all", "pending", "approved", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-md text-xs font-medium capitalize transition-all"
            style={{
              background: filter === f ? "rgba(99,102,241,0.15)" : "transparent",
              color: filter === f ? "var(--accent-indigo)" : "var(--text-muted)",
            }}
          >
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      {/* Approvals List */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
      >
        {loading ? (
          <p className="text-center text-xs py-10" style={{ color: "var(--text-ghost)" }}>
            Loading...
          </p>
        ) : approvals.length === 0 ? (
          <div className="text-center py-14">
            <ShieldCheck size={30} className="mx-auto mb-3" style={{ color: "var(--text-ghost)" }} />
            <h4 className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
              No approvals
            </h4>
            <p className="text-xs mt-1" style={{ color: "var(--text-ghost)" }}>
              When agents request permission for sensitive actions, they&apos;ll appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--glass-border)" }}>
            {approvals.map((a) => {
              const sc = statusColors[a.status] || statusColors.pending;
              return (
                <div key={a.id} className="p-4 hover:bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {a.action}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                        >
                          {a.status}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                          style={{ color: riskColors[a.risk_level] || "#f59e0b" }}
                        >
                          {a.risk_level} risk
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {a.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px]" style={{ color: "var(--text-ghost)" }}>
                          Agent: {a.agent_name || a.agent_id.slice(0, 8)}
                        </span>
                        <span className="text-[10px]" style={{ color: "var(--text-ghost)" }}>
                          {timeAgo(a.requested_at)}
                        </span>
                      </div>
                    </div>
                    {a.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleAction(a.id, "approve")}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}
                        >
                          <CheckCircle size={12} /> Approve
                        </button>
                        <button
                          onClick={() => handleAction(a.id, "reject")}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
