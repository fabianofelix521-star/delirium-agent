"use client";

import { useState, useEffect, useRef } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import {
  Loader2,
  Play,
  Power,
  X,
  CheckCircle2,
  XCircle,
  Send,
  Terminal,
} from "lucide-react";

/* ─── Types ──────────────────────────────────── */
interface Requirement {
  label: string;
  check: string;
  met: boolean;
}

interface Metric {
  name: string;
  type: string;
}

interface HandItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: string;
  category: string;
  tools: string[];
  requirements: Requirement[];
  metrics: Metric[];
  settings: Record<string, unknown>;
  enabled: boolean;
  last_run: number | null;
  runs: number;
}

export default function HandsPage() {
  const [hands, setHands] = useState<HandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"available" | "active">(
    "available",
  );
  const [detailHand, setDetailHand] = useState<HandItem | null>(null);
  const [runOutput, setRunOutput] = useState<string>("");
  const [runTask, setRunTask] = useState<string>("");
  const [runHand_active, setRunHandActive] = useState<HandItem | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

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

  const activateHand = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/hands/${id}/enable`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });
      setHands((prev) =>
        prev.map((h) =>
          h.id === id ? { ...h, enabled: true, status: "active" } : h,
        ),
      );
      setDetailHand(null);
    } catch {
      /* */
    }
  };

  const deactivateHand = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/hands/${id}/enable`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      });
      setHands((prev) =>
        prev.map((h) =>
          h.id === id ? { ...h, enabled: false, status: "ready" } : h,
        ),
      );
    } catch {
      /* */
    }
  };

  const runHand = async (id: string, task?: string) => {
    setRunning(id);
    setRunOutput("");
    const hand = hands.find((h) => h.id === id);
    if (hand) setRunHandActive(hand);

    try {
      const res = await fetch(`${API_BASE}/api/hands/${id}/run`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ task: task || "" }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullResp = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "token") {
                  fullResp += data.content;
                  setRunOutput(fullResp);
                  outputRef.current?.scrollTo(
                    0,
                    outputRef.current.scrollHeight,
                  );
                } else if (data.type === "error") {
                  fullResp += `\n\n❌ Error: ${data.message}`;
                  setRunOutput(fullResp);
                }
              } catch {
                /* skip */
              }
            }
          }
        }
      }

      setHands((prev) =>
        prev.map((h) =>
          h.id === id
            ? {
                ...h,
                runs: h.runs + 1,
                last_run: Date.now() / 1000,
                enabled: true,
                status: "active",
              }
            : h,
        ),
      );
    } catch {
      setRunOutput("⚡ Failed to connect to backend.");
    }
    setRunning(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-cyan)]" />
      </div>
    );
  }

  const available = hands.filter(
    (h) => h.status === "ready" || h.status === "setup_needed",
  );
  const active = hands.filter((h) => h.status === "active" || h.enabled);
  const displayed = activeTab === "available" ? available : active;

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === "ready")
      return (
        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-[rgba(16,185,129,0.1)] text-[var(--success)] border border-[rgba(16,185,129,0.2)]">
          Ready
        </span>
      );
    if (status === "active")
      return (
        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-[rgba(6,182,212,0.1)] text-[var(--accent-cyan)] border border-[rgba(6,182,212,0.2)]">
          Active
        </span>
      );
    return (
      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-[rgba(245,158,11,0.1)] text-[var(--warning)] border border-[rgba(245,158,11,0.2)]">
        Setup needed
      </span>
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <h2 className="text-2xl font-bold text-[var(--text-primary)]">Hands</h2>

      {/* Info Banner */}
      <div className="bg-[var(--glass-bg)] border-l-4 border-[var(--accent-cyan)] rounded-xl p-5 backdrop-blur-xl">
        <h4 className="text-base font-semibold text-[var(--text-primary)] mb-1">
          Hands — Curated Autonomous Capability Packages
        </h4>
        <p className="text-sm text-[var(--text-muted)]">
          Hands are pre-configured AI agents that autonomously handle specific
          tasks. Each hand includes a tuned system prompt, required tools, and a
          dashboard for tracking work.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--glass-border)]">
        <button
          onClick={() => setActiveTab("available")}
          className={`px-4 py-2.5 text-sm font-medium transition-all relative ${
            activeTab === "available"
              ? "text-[var(--accent-cyan)]"
              : "text-[var(--text-ghost)] hover:text-[var(--text-muted)]"
          }`}
        >
          Available
          <span
            className={`ml-2 px-1.5 py-0.5 text-[10px] rounded-md ${
              activeTab === "available"
                ? "bg-[rgba(6,182,212,0.15)] text-[var(--accent-cyan)]"
                : "bg-[var(--glass-bg)] text-[var(--text-ghost)]"
            }`}
          >
            {available.length}
          </span>
          {activeTab === "available" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-cyan)]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2.5 text-sm font-medium transition-all relative ${
            activeTab === "active"
              ? "text-[var(--accent-cyan)]"
              : "text-[var(--text-ghost)] hover:text-[var(--text-muted)]"
          }`}
        >
          Active
          {active.length > 0 && (
            <span
              className={`ml-2 px-1.5 py-0.5 text-[10px] rounded-md ${
                activeTab === "active"
                  ? "bg-[rgba(6,182,212,0.15)] text-[var(--accent-cyan)]"
                  : "bg-[var(--glass-bg)] text-[var(--text-ghost)]"
              }`}
            >
              {active.length}
            </span>
          )}
          {activeTab === "active" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-cyan)]" />
          )}
        </button>
      </div>

      {/* Grid */}
      {displayed.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-ghost)]">
          {activeTab === "active" ? (
            <>
              <Power className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No active hands yet.</p>
              <p className="text-xs mt-1">
                Activate a hand from the Available tab to get started.
              </p>
            </>
          ) : (
            <p className="text-sm">No hands available.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map((h) => (
            <div
              key={h.id}
              className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-5 backdrop-blur-xl hover:border-[var(--text-ghost)] transition-all flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{h.icon}</span>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {h.name}
                  </h3>
                </div>
                <StatusBadge status={h.status} />
              </div>

              {/* Description */}
              <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed flex-1">
                {h.description}
              </p>

              {/* Requirements (only show if there are any) */}
              {h.requirements.length > 0 && (
                <div className="mb-4">
                  <div className="text-[10px] text-[var(--text-ghost)] uppercase tracking-wider font-semibold mb-1.5">
                    Requirements
                  </div>
                  <div className="space-y-1">
                    {h.requirements.map((r) => (
                      <div
                        key={r.label}
                        className="flex items-center gap-2 text-xs"
                      >
                        {r.met ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-[var(--error)] shrink-0" />
                        )}
                        <span
                          className={
                            r.met
                              ? "text-[var(--text-muted)]"
                              : "text-[var(--text-ghost)]"
                          }
                        >
                          {r.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer stats */}
              <div className="flex items-center gap-3 text-[11px] text-[var(--text-ghost)] mb-4">
                <span>{h.tools.length} tool(s)</span>
                <span>{h.metrics.length} metric(s)</span>
                <span className="px-2 py-0.5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-md text-[10px]">
                  {h.category}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDetailHand(h)}
                  className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg hover:bg-[var(--hover-bg)] transition-all"
                >
                  Details
                </button>
                <div className="flex-1" />
                {h.enabled ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => runHand(h.id)}
                      disabled={running === h.id}
                      className="px-4 py-2 text-xs font-medium text-white bg-[var(--accent-cyan)] rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {running === h.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <Play className="w-3 h-3" /> Run
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => deactivateHand(h.id)}
                      className="px-3 py-2 text-xs font-medium text-[var(--error)] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.15)] rounded-lg hover:bg-[rgba(239,68,68,0.15)] transition-all"
                    >
                      Stop
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => activateHand(h.id)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[var(--accent-cyan)] rounded-lg hover:opacity-90 transition-all"
                  >
                    Activate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Run Output Panel ─── */}
      {(runHand_active || runOutput) && (
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[var(--accent-cyan)]" />
              {runHand_active
                ? `${runHand_active.icon} ${runHand_active.name}`
                : "Hand Output"}
              {running && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-cyan)]" />
              )}
            </h3>
            <button
              onClick={() => {
                setRunHandActive(null);
                setRunOutput("");
                setRunTask("");
              }}
              className="p-1 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-ghost)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Task input */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={runTask}
              onChange={(e) => setRunTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && runHand_active && !running) {
                  runHand(runHand_active.id, runTask);
                }
              }}
              placeholder="Give a task to this hand (or leave empty for default)..."
              className="flex-1 px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-[var(--accent-cyan)]"
            />
            <button
              onClick={() =>
                runHand_active && runHand(runHand_active.id, runTask)
              }
              disabled={!runHand_active || !!running}
              className="px-4 py-2 text-xs font-medium text-white bg-[var(--accent-cyan)] rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Run
            </button>
          </div>
          {/* Output */}
          <div
            ref={outputRef}
            className="bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-lg p-4 max-h-80 overflow-y-auto font-mono text-xs text-[var(--text-muted)] whitespace-pre-wrap leading-relaxed"
          >
            {runOutput ||
              (running ? "Starting hand..." : "Output will appear here...")}
          </div>
        </div>
      )}

      {/* ─── Detail Modal ─── */}
      {detailHand && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setDetailHand(null)}
        >
          <div
            className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl backdrop-blur-xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="text-2xl">{detailHand.icon}</span>
                  {detailHand.name}
                </h3>
                <button
                  onClick={() => setDetailHand(null)}
                  className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-ghost)] transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Description */}
              <p className="text-sm text-[var(--text-muted)] mb-5 leading-relaxed">
                {detailHand.description}
              </p>

              {/* Agent Config */}
              <div className="mb-5">
                <div className="text-[10px] text-[var(--text-ghost)] uppercase tracking-wider font-semibold mb-2">
                  Agent Config
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-ghost)]">Category</span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {detailHand.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-ghost)]">Status</span>
                    <StatusBadge status={detailHand.status} />
                  </div>
                </div>
              </div>

              {/* Requirements */}
              {detailHand.requirements.length > 0 && (
                <div className="mb-5">
                  <div className="text-[10px] text-[var(--text-ghost)] uppercase tracking-wider font-semibold mb-2">
                    Requirements
                  </div>
                  <div className="space-y-2">
                    {detailHand.requirements.map((r) => (
                      <div
                        key={r.label}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {r.met ? (
                            <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                          ) : (
                            <XCircle className="w-4 h-4 text-[var(--error)]" />
                          )}
                          <span className="text-[var(--text-muted)]">
                            {r.label}
                          </span>
                        </div>
                        <code className="text-[10px] text-[var(--text-ghost)] bg-[var(--hover-bg)] px-1.5 py-0.5 rounded">
                          {r.check.replace("env:", "")}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tools */}
              <div className="mb-5">
                <div className="text-[10px] text-[var(--text-ghost)] uppercase tracking-wider font-semibold mb-2">
                  Tools
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {detailHand.tools.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 text-[11px] bg-[var(--hover-bg)] border border-[var(--glass-border)] rounded-lg text-[var(--text-muted)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Dashboard Metrics */}
              <div className="mb-6">
                <div className="text-[10px] text-[var(--text-ghost)] uppercase tracking-wider font-semibold mb-2">
                  Dashboard Metrics
                </div>
                <div className="space-y-1.5">
                  {detailHand.metrics.map((m) => (
                    <div
                      key={m.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-[var(--text-muted)] font-medium">
                        {m.name}
                      </span>
                      <code className="text-[10px] text-[var(--text-ghost)] bg-[var(--hover-bg)] px-1.5 py-0.5 rounded">
                        ({m.type})
                      </code>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activate Button */}
              {detailHand.enabled ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      runHand(detailHand.id);
                      setDetailHand(null);
                    }}
                    className="flex-1 py-3 text-sm font-semibold text-white bg-[var(--accent-cyan)] rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" /> Run Now
                  </button>
                  <button
                    onClick={() => {
                      deactivateHand(detailHand.id);
                      setDetailHand(null);
                    }}
                    className="px-4 py-3 text-sm font-semibold text-[var(--error)] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.15)] rounded-xl hover:bg-[rgba(239,68,68,0.15)] transition-all"
                  >
                    Deactivate
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => activateHand(detailHand.id)}
                  className="w-full py-3 text-sm font-semibold text-white bg-[var(--accent-cyan)] rounded-xl hover:opacity-90 transition-all"
                >
                  Activate
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
