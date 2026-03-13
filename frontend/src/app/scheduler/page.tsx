"use client";

import { useState, useEffect } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import {
  Calendar,
  Loader2,
  Play,
  Plus,
  Trash2,
  Clock,
  Pause,
  X,
  CheckCircle2,
  AlertCircle,
  Bot,
} from "lucide-react";

/* ─── Types ──────────────────────────────────── */
interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  cron: string;
  agent_id: string;
  action: string;
  config: Record<string, unknown>;
  status: string;
  runs: number;
  last_run: number | null;
  next_run: number | null;
  created_at: number;
}

export default function SchedulerPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCron, setNewCron] = useState("0 * * * *");
  const [newAgent, setNewAgent] = useState("assistant");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/scheduler`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => setTasks(data.tasks || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const runTask = async (id: string) => {
    setRunning(id);
    try {
      await fetch(`${API_BASE}/api/scheduler/${id}/run`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, runs: t.runs + 1, last_run: now / 1000 } : t,
        ),
      );
    } catch {
      /* */
    }
    setRunning(null);
  };

  const toggleStatus = async (id: string, status: string) => {
    const newStatus = status === "active" ? "paused" : "active";
    await fetch(`${API_BASE}/api/scheduler/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)),
    );
  };

  const deleteTask = async (id: string) => {
    await fetch(`${API_BASE}/api/scheduler/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const createTask = async () => {
    if (!newName.trim()) return;
    const res = await fetch(`${API_BASE}/api/scheduler`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: newName,
        description: newDesc,
        cron: newCron,
        agent_id: newAgent,
      }),
    });
    const task = await res.json();
    setTasks((prev) => [...prev, task]);
    setNewName("");
    setNewDesc("");
    setNewCron("0 * * * *");
    setShowCreate(false);
  };

  const timeAgo = (ts: number | null) => {
    if (!ts) return "Never";
    const diff = now / 1000 - ts;
    if (diff < 0) {
      const abs = Math.abs(diff);
      if (abs < 3600) return `in ${Math.floor(abs / 60)}m`;
      if (abs < 86400) return `in ${Math.floor(abs / 3600)}h`;
      return `in ${Math.floor(abs / 86400)}d`;
    }
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const cronHuman = (cron: string) => {
    const parts = cron.split(" ");
    if (parts[1] === "*" && parts[2] === "*") return "Every hour";
    if (parts[1]?.startsWith("*/")) return `Every ${parts[1].slice(2)}h`;
    if (parts[4] === "1") return "Every Monday";
    if (parts[2] === "*" && parts[3] === "*")
      return `Daily at ${parts[1]}:${parts[0].padStart(2, "0")}`;
    return cron;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-cyan)]" />
      </div>
    );
  }

  const activeCount = tasks.filter((t) => t.status === "active").length;
  const totalRuns = tasks.reduce((a, t) => a + t.runs, 0);

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Calendar className="w-8 h-8 text-[var(--warning)]" />
            Scheduler
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            {tasks.length} tasks · {activeCount} active · {totalRuns} total runs
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[rgba(245,158,11,0.15)] text-[var(--warning)] border border-[rgba(245,158,11,0.2)] hover:bg-[rgba(245,158,11,0.2)] transition-all"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="mb-6 liquid-glass liquid-glass-hover rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Schedule New Task
            </h3>
            <button
              onClick={() => setShowCreate(false)}
              className="text-[var(--text-ghost)] hover:text-[var(--text-muted)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Task name..."
              className="px-3 py-2 liquid-glass rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-[rgba(245,158,11,0.3)]"
            />
            <input
              type="text"
              value={newCron}
              onChange={(e) => setNewCron(e.target.value)}
              placeholder="Cron expression (0 * * * *)"
              className="px-3 py-2 liquid-glass rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-[rgba(245,158,11,0.3)] font-mono"
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description..."
              className="px-3 py-2 liquid-glass rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-[rgba(245,158,11,0.3)]"
            />
            <select
              value={newAgent}
              onChange={(e) => setNewAgent(e.target.value)}
              className="px-3 py-2 liquid-glass rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[rgba(245,158,11,0.3)]"
            >
              <option value="assistant">General Assistant</option>
              <option value="researcher">Researcher</option>
              <option value="collector">Collector</option>
              <option value="lead">Lead Generator</option>
              <option value="twitter">Twitter Manager</option>
              <option value="trader">Trading Analyst</option>
              <option value="writer">Writer</option>
            </select>
          </div>
          <button
            onClick={createTask}
            className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-[rgba(245,158,11,0.15)] text-[var(--warning)] border border-[rgba(245,158,11,0.2)] hover:bg-[rgba(245,158,11,0.2)]"
          >
            Create Task
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="liquid-glass liquid-glass-hover rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{tasks.length}</div>
          <div className="text-xs text-[var(--text-ghost)]">Scheduled Tasks</div>
        </div>
        <div className="bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.15)] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[var(--success)]">
            {activeCount}
          </div>
          <div className="text-xs text-[var(--success)]">Active</div>
        </div>
        <div className="bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.15)] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[var(--warning)]">{totalRuns}</div>
          <div className="text-xs text-[var(--warning)]/60">Total Runs</div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`bg-[var(--glass-bg)] border rounded-2xl p-5 backdrop-blur-xl transition-all ${
              task.status === "active"
                ? "border-[rgba(16,185,129,0.15)]"
                : "border-[var(--glass-border)]"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    task.status === "active" ? "bg-[rgba(245,158,11,0.1)]" : "bg-[var(--glass-bg)]"
                  }`}
                >
                  <Clock
                    className={`w-5 h-5 ${task.status === "active" ? "text-[var(--warning)]" : "text-[var(--text-ghost)]"}`}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {task.name}
                  </h3>
                  <p className="text-xs text-[var(--text-ghost)] mt-0.5">
                    {task.description}
                  </p>
                </div>
              </div>
              {task.status === "active" ? (
                <span className="flex items-center gap-1 text-[10px] text-[var(--success)] bg-[rgba(16,185,129,0.1)] px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-[var(--warning)] bg-[rgba(245,158,11,0.1)] px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3" /> Paused
                </span>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mb-4 text-[11px] text-[var(--text-ghost)]">
              <span className="flex items-center gap-1 bg-[var(--glass-bg)] px-2 py-0.5 rounded-md font-mono">
                <Clock className="w-3 h-3" /> {task.cron}
              </span>
              <span className="text-[var(--text-ghost)]">=</span>
              <span className="text-[var(--text-muted)]">{cronHuman(task.cron)}</span>
              <span className="flex items-center gap-1">
                <Bot className="w-3 h-3" /> {task.agent_id}
              </span>
              <span>{task.runs} runs</span>
              <span>Last: {timeAgo(task.last_run)}</span>
              <span className="text-[var(--accent-cyan)]/60">
                Next: {timeAgo(task.next_run)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => runTask(task.id)}
                disabled={running === task.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[rgba(6,182,212,0.1)] text-[var(--accent-cyan)] border border-[rgba(6,182,212,0.15)] hover:bg-[rgba(6,182,212,0.15)] disabled:opacity-50"
              >
                {running === task.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                Run Now
              </button>
              <button
                onClick={() => toggleStatus(task.id, task.status)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--text-ghost)] liquid-glass hover:bg-[var(--glass-bg)]"
              >
                <Pause className="w-3 h-3" />
                {task.status === "active" ? "Pause" : "Resume"}
              </button>
              <button
                onClick={() => deleteTask(task.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--error)] bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.1)]"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-16 text-[var(--text-ghost)]">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No scheduled tasks. Create your first one!</p>
        </div>
      )}
    </div>
  );
}
