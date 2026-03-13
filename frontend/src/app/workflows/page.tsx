"use client";

import { useState, useEffect } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import {
  GitBranch,
  Loader2,
  Play,
  Pause,
  Plus,
  Trash2,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
} from "lucide-react";

/* ─── Types ──────────────────────────────────── */
interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  trigger: { type: string; event?: string; cron?: string; path?: string };
  nodes: { id: string; type: string; action?: string }[];
  edges: { from: string; to: string }[];
  runs: number;
  last_run: number | null;
  created_at: number;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchWorkflows = () => {
    fetch(`${API_BASE}/api/workflows`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => setWorkflows(data.workflows || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const runWorkflow = async (id: string) => {
    setRunning(id);
    try {
      await fetch(`${API_BASE}/api/workflows/${id}/run`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, runs: w.runs + 1, last_run: now / 1000 } : w,
        ),
      );
    } catch {
      /* */
    }
    setRunning(null);
  };

  const toggleStatus = async (id: string, status: string) => {
    const newStatus = status === "active" ? "paused" : "active";
    await fetch(`${API_BASE}/api/workflows/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });
    setWorkflows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, status: newStatus } : w)),
    );
  };

  const deleteWorkflow = async (id: string) => {
    await fetch(`${API_BASE}/api/workflows/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
  };

  const createWorkflow = async () => {
    if (!newName.trim()) return;
    const res = await fetch(`${API_BASE}/api/workflows`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: newName, description: newDesc }),
    });
    const wf = await res.json();
    setWorkflows((prev) => [...prev, wf]);
    setNewName("");
    setNewDesc("");
    setShowCreate(false);
  };

  const timeAgo = (ts: number | null) => {
    if (!ts) return "Never";
    const diff = now / 1000 - ts;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const triggerLabel = (trigger: Workflow["trigger"]) => {
    if (trigger.type === "event") return `Event: ${trigger.event}`;
    if (trigger.type === "schedule") return `Cron: ${trigger.cron}`;
    if (trigger.type === "webhook") return `Webhook: ${trigger.path}`;
    return "Manual";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-cyan)]" />
      </div>
    );
  }

  const activeCount = workflows.filter((w) => w.status === "active").length;
  const totalRuns = workflows.reduce((a, w) => a + w.runs, 0);

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <GitBranch className="w-8 h-8 text-[var(--accent-violet)]" />
            Workflows
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            {workflows.length} workflows · {activeCount} active · {totalRuns}{" "}
            total runs
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[rgba(139,92,246,0.15)] text-[var(--accent-violet)] border border-[rgba(139,92,246,0.2)] hover:bg-[rgba(139,92,246,0.2)] transition-all"
        >
          <Plus className="w-4 h-4" />
          New Workflow
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="mb-6 liquid-glass liquid-glass-hover rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Create Workflow
            </h3>
            <button
              onClick={() => setShowCreate(false)}
              className="text-[var(--text-ghost)] hover:text-[var(--text-muted)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Workflow name..."
              className="w-full px-3 py-2 liquid-glass rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-[rgba(139,92,246,0.3)]"
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)..."
              className="w-full px-3 py-2 liquid-glass rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-[rgba(139,92,246,0.3)]"
            />
            <button
              onClick={createWorkflow}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[rgba(139,92,246,0.15)] text-[var(--accent-violet)] border border-[rgba(139,92,246,0.2)] hover:bg-[rgba(139,92,246,0.2)]"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="liquid-glass liquid-glass-hover rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {workflows.length}
          </div>
          <div className="text-xs text-[var(--text-ghost)]">Total Workflows</div>
        </div>
        <div className="bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.15)] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[var(--success)]">
            {activeCount}
          </div>
          <div className="text-xs text-[var(--success)]">Active</div>
        </div>
        <div className="bg-[rgba(139,92,246,0.05)] border border-[rgba(139,92,246,0.15)] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[var(--accent-violet)]">{totalRuns}</div>
          <div className="text-xs text-[var(--accent-violet)]">Total Runs</div>
        </div>
      </div>

      {/* Workflow List */}
      <div className="space-y-4">
        {workflows.map((wf) => (
          <div
            key={wf.id}
            className={`bg-[var(--glass-bg)] border rounded-2xl p-5 backdrop-blur-xl transition-all ${
              wf.status === "active"
                ? "border-[rgba(16,185,129,0.15)]"
                : "border-[var(--glass-border)]"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    wf.status === "active" ? "bg-[rgba(16,185,129,0.1)]" : "bg-[var(--glass-bg)]"
                  }`}
                >
                  <GitBranch
                    className={`w-5 h-5 ${wf.status === "active" ? "text-[var(--success)]" : "text-[var(--text-ghost)]"}`}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {wf.name}
                  </h3>
                  <p className="text-xs text-[var(--text-ghost)] mt-0.5">
                    {wf.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {wf.status === "active" ? (
                  <span className="flex items-center gap-1 text-[10px] text-[var(--success)] bg-[rgba(16,185,129,0.1)] px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-[var(--warning)] bg-[rgba(245,158,11,0.1)] px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" /> Paused
                  </span>
                )}
              </div>
            </div>

            {/* Detail row */}
            <div className="flex items-center gap-4 mb-4 text-[11px] text-[var(--text-ghost)]">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" /> {triggerLabel(wf.trigger)}
              </span>
              <span className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3" /> {wf.nodes.length} nodes
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Last: {timeAgo(wf.last_run)}
              </span>
              <span>{wf.runs} runs</span>
            </div>

            {/* Node visualization */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              {wf.nodes.map((node, i) => (
                <div key={node.id} className="flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded-lg liquid-glass text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                    {node.action || node.type}
                  </div>
                  {i < wf.nodes.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-[var(--text-ghost)] shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => runWorkflow(wf.id)}
                disabled={running === wf.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[rgba(6,182,212,0.1)] text-[var(--accent-cyan)] border border-[rgba(6,182,212,0.15)] hover:bg-[rgba(6,182,212,0.15)] disabled:opacity-50"
              >
                {running === wf.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                Run
              </button>
              <button
                onClick={() => toggleStatus(wf.id, wf.status)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--text-ghost)] liquid-glass hover:bg-[var(--glass-bg)]"
              >
                <Pause className="w-3 h-3" />
                {wf.status === "active" ? "Pause" : "Resume"}
              </button>
              <button
                onClick={() => deleteWorkflow(wf.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--error)] bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.1)]"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {workflows.length === 0 && (
        <div className="text-center py-16 text-[var(--text-ghost)]">
          <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No workflows yet. Create your first one!</p>
        </div>
      )}
    </div>
  );
}
