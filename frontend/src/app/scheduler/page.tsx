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
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const activeCount = tasks.filter((t) => t.status === "active").length;
  const totalRuns = tasks.reduce((a, t) => a + t.runs, 0);

  return (
    <div className="min-h-screen bg-linear-to-br from-[#0a0a14] via-[#0d0d1a] to-[#0a0a14] p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Calendar className="w-8 h-8 text-amber-400" />
            Scheduler
          </h1>
          <p className="text-white/50 mt-1">
            {tasks.length} tasks · {activeCount} active · {totalRuns} total runs
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="mb-6 bg-white/3 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">
              Schedule New Task
            </h3>
            <button
              onClick={() => setShowCreate(false)}
              className="text-white/30 hover:text-white/60"
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
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
            />
            <input
              type="text"
              value={newCron}
              onChange={(e) => setNewCron(e.target.value)}
              placeholder="Cron expression (0 * * * *)"
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50 font-mono"
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description..."
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
            />
            <select
              value={newAgent}
              onChange={(e) => setNewAgent(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50"
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
            className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
          >
            Create Task
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white/3 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{tasks.length}</div>
          <div className="text-xs text-white/40">Scheduled Tasks</div>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {activeCount}
          </div>
          <div className="text-xs text-emerald-400/60">Active</div>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{totalRuns}</div>
          <div className="text-xs text-amber-400/60">Total Runs</div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`bg-white/3 border rounded-2xl p-5 backdrop-blur-xl transition-all ${
              task.status === "active"
                ? "border-emerald-500/20"
                : "border-white/10"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    task.status === "active" ? "bg-amber-500/10" : "bg-white/5"
                  }`}
                >
                  <Clock
                    className={`w-5 h-5 ${task.status === "active" ? "text-amber-400" : "text-white/30"}`}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {task.name}
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5">
                    {task.description}
                  </p>
                </div>
              </div>
              {task.status === "active" ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3" /> Paused
                </span>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mb-4 text-[11px] text-white/30">
              <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md font-mono">
                <Clock className="w-3 h-3" /> {task.cron}
              </span>
              <span className="text-white/20">=</span>
              <span className="text-white/50">{cronHuman(task.cron)}</span>
              <span className="flex items-center gap-1">
                <Bot className="w-3 h-3" /> {task.agent_id}
              </span>
              <span>{task.runs} runs</span>
              <span>Last: {timeAgo(task.last_run)}</span>
              <span className="text-cyan-400/60">
                Next: {timeAgo(task.next_run)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => runTask(task.id)}
                disabled={running === task.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 disabled:opacity-50"
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 bg-white/5 border border-white/10 hover:bg-white/10"
              >
                <Pause className="w-3 h-3" />
                {task.status === "active" ? "Pause" : "Resume"}
              </button>
              <button
                onClick={() => deleteTask(task.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400/60 bg-red-500/5 border border-red-500/10 hover:bg-red-500/10"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-16 text-white/30">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No scheduled tasks. Create your first one!</p>
        </div>
      )}
    </div>
  );
}
