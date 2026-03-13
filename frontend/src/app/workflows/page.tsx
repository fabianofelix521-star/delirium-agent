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
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const activeCount = workflows.filter((w) => w.status === "active").length;
  const totalRuns = workflows.reduce((a, w) => a + w.runs, 0);

  return (
    <div className="min-h-screen bg-linear-to-br from-[#0a0a14] via-[#0d0d1a] to-[#0a0a14] p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <GitBranch className="w-8 h-8 text-violet-400" />
            Workflows
          </h1>
          <p className="text-white/50 mt-1">
            {workflows.length} workflows · {activeCount} active · {totalRuns}{" "}
            total runs
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Workflow
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="mb-6 bg-white/3 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">
              Create Workflow
            </h3>
            <button
              onClick={() => setShowCreate(false)}
              className="text-white/30 hover:text-white/60"
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
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50"
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50"
            />
            <button
              onClick={createWorkflow}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/30"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white/3 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {workflows.length}
          </div>
          <div className="text-xs text-white/40">Total Workflows</div>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {activeCount}
          </div>
          <div className="text-xs text-emerald-400/60">Active</div>
        </div>
        <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-violet-400">{totalRuns}</div>
          <div className="text-xs text-violet-400/60">Total Runs</div>
        </div>
      </div>

      {/* Workflow List */}
      <div className="space-y-4">
        {workflows.map((wf) => (
          <div
            key={wf.id}
            className={`bg-white/3 border rounded-2xl p-5 backdrop-blur-xl transition-all ${
              wf.status === "active"
                ? "border-emerald-500/20"
                : "border-white/10"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    wf.status === "active" ? "bg-emerald-500/10" : "bg-white/5"
                  }`}
                >
                  <GitBranch
                    className={`w-5 h-5 ${wf.status === "active" ? "text-emerald-400" : "text-white/30"}`}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {wf.name}
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5">
                    {wf.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {wf.status === "active" ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" /> Paused
                  </span>
                )}
              </div>
            </div>

            {/* Detail row */}
            <div className="flex items-center gap-4 mb-4 text-[11px] text-white/30">
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
                  <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/50 whitespace-nowrap">
                    {node.action || node.type}
                  </div>
                  {i < wf.nodes.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-white/20 shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => runWorkflow(wf.id)}
                disabled={running === wf.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 disabled:opacity-50"
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 bg-white/5 border border-white/10 hover:bg-white/10"
              >
                <Pause className="w-3 h-3" />
                {wf.status === "active" ? "Pause" : "Resume"}
              </button>
              <button
                onClick={() => deleteWorkflow(wf.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400/60 bg-red-500/5 border border-red-500/10 hover:bg-red-500/10"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {workflows.length === 0 && (
        <div className="text-center py-16 text-white/30">
          <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No workflows yet. Create your first one!</p>
        </div>
      )}
    </div>
  );
}
