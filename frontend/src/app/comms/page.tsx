"use client";

import { useState, useEffect, useCallback } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import {
  MessagesSquare,
  Send,
  ListTodo,
  RefreshCw,
  Plus,
  CheckCircle,
} from "lucide-react";

interface CommMessage {
  id: string;
  from_agent: string;
  to_agent: string;
  subject: string;
  content: string;
  priority: string;
  status: string;
  timestamp: number;
}

interface CommTask {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  priority: string;
  status: string;
  created_at: number;
}

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const priorityColors: Record<string, string> = {
  low: "#22c55e",
  normal: "#3b82f6",
  high: "#f59e0b",
  urgent: "#ef4444",
};

export default function CommsPage() {
  const [tab, setTab] = useState<"messages" | "tasks">("messages");
  const [messages, setMessages] = useState<CommMessage[]>([]);
  const [tasks, setTasks] = useState<CommTask[]>([]);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newMsg, setNewMsg] = useState({ to_agent: "", subject: "", content: "", priority: "normal" });
  const [newTask, setNewTask] = useState({ title: "", description: "", assigned_to: "", priority: "normal" });

  const fetchMessages = useCallback(() => {
    fetch(`${API_BASE}/api/comms/messages`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setMessages(d); })
      .catch(() => {});
  }, []);

  const fetchTasks = useCallback(() => {
    fetch(`${API_BASE}/api/comms/tasks`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setTasks(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchMessages();
    fetchTasks();
    const iv = setInterval(() => { fetchMessages(); fetchTasks(); }, 10000);
    return () => clearInterval(iv);
  }, [fetchMessages, fetchTasks]);

  const sendMessage = () => {
    fetch(`${API_BASE}/api/comms/messages`, {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(newMsg),
    }).then(() => {
      setShowSendModal(false);
      setNewMsg({ to_agent: "", subject: "", content: "", priority: "normal" });
      fetchMessages();
    });
  };

  const postTask = () => {
    fetch(`${API_BASE}/api/comms/tasks`, {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(newTask),
    }).then(() => {
      setShowTaskModal(false);
      setNewTask({ title: "", description: "", assigned_to: "", priority: "normal" });
      fetchTasks();
    });
  };

  const completeTask = (id: string) => {
    fetch(`${API_BASE}/api/comms/tasks/${id}/complete`, {
      method: "POST",
      headers: getAuthHeaders(),
    }).then(() => fetchTasks());
  };

  const inputStyle = {
    background: "var(--bg-elevated)",
    border: "1px solid var(--glass-border)",
    color: "var(--text-primary)",
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Agent Comms
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSendModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "rgba(99,102,241,0.15)", color: "var(--accent-indigo)", border: "1px solid rgba(99,102,241,0.3)" }}
          >
            <Send size={12} /> Send Message
          </button>
          <button
            onClick={() => setShowTaskModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}
          >
            <ListTodo size={12} /> Post Task
          </button>
          <button onClick={() => { fetchMessages(); fetchTasks(); }} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "var(--text-ghost)" }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
      >
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--glass-border)" }}>
          <MessagesSquare size={14} style={{ color: "var(--accent-indigo)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Messages</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.1)", color: "var(--accent-indigo)" }}>
            {messages.length}
          </span>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-center text-xs py-10" style={{ color: "var(--text-ghost)" }}>
              No messages yet. Send a message between agents.
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--glass-border)" }}>
              {messages.map((m) => (
                <div key={m.id} className="px-4 py-3 hover:bg-white/[0.02]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                      {m.from_agent}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--text-ghost)" }}>→</span>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {m.to_agent}
                    </span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-medium ml-auto"
                      style={{ color: priorityColors[m.priority] || "#3b82f6" }}
                    >
                      {m.priority}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--text-ghost)" }}>
                      {timeAgo(m.timestamp)}
                    </span>
                  </div>
                  {m.subject && (
                    <p className="text-[11px] font-medium mb-0.5" style={{ color: "var(--text-secondary)" }}>
                      {m.subject}
                    </p>
                  )}
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{m.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tasks */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
      >
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--glass-border)" }}>
          <ListTodo size={14} style={{ color: "#f59e0b" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Tasks</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
            {tasks.filter((t) => t.status === "pending").length} pending
          </span>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-3 space-y-2">
          {tasks.length === 0 ? (
            <p className="text-center text-xs py-8" style={{ color: "var(--text-ghost)" }}>
              No tasks posted yet.
            </p>
          ) : (
            tasks.map((t) => (
              <div key={t.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{t.title}</span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                      style={{ color: t.status === "completed" ? "#22c55e" : "#f59e0b" }}
                    >
                      {t.status}
                    </span>
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--text-ghost)" }}>{t.description}</p>
                  {t.assigned_to && (
                    <span className="text-[10px]" style={{ color: "var(--text-ghost)" }}>
                      Assigned to: {t.assigned_to}
                    </span>
                  )}
                </div>
                {t.status === "pending" && (
                  <button
                    onClick={() => completeTask(t.id)}
                    className="p-1.5 rounded-lg hover:bg-white/5 shrink-0"
                    style={{ color: "#22c55e" }}
                  >
                    <CheckCircle size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Send Message Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowSendModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
          <div
            className="relative rounded-xl p-6 w-full max-w-md space-y-4"
            style={{ background: "var(--glass-bg-solid)", border: "1px solid var(--glass-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Send Message</h3>
            <input placeholder="To Agent" value={newMsg.to_agent} onChange={(e) => setNewMsg({ ...newMsg, to_agent: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-xs" style={inputStyle} />
            <input placeholder="Subject" value={newMsg.subject} onChange={(e) => setNewMsg({ ...newMsg, subject: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-xs" style={inputStyle} />
            <textarea placeholder="Content" value={newMsg.content} onChange={(e) => setNewMsg({ ...newMsg, content: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-xs h-24 resize-none" style={inputStyle} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSendModal(false)} className="px-4 py-2 rounded-lg text-xs" style={{ color: "var(--text-muted)" }}>
                Cancel
              </button>
              <button onClick={sendMessage} className="px-4 py-2 rounded-lg text-xs font-medium btn-primary">
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowTaskModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
          <div
            className="relative rounded-xl p-6 w-full max-w-md space-y-4"
            style={{ background: "var(--glass-bg-solid)", border: "1px solid var(--glass-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Post Task</h3>
            <input placeholder="Title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-xs" style={inputStyle} />
            <textarea placeholder="Description" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-xs h-20 resize-none" style={inputStyle} />
            <input placeholder="Assign to agent" value={newTask.assigned_to} onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-xs" style={inputStyle} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 rounded-lg text-xs" style={{ color: "var(--text-muted)" }}>
                Cancel
              </button>
              <button onClick={postTask} className="px-4 py-2 rounded-lg text-xs font-medium btn-primary">
                Post Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
