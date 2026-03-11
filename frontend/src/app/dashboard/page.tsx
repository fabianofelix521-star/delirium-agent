"use client";

import { useState, useEffect } from "react";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Circle,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Server,
} from "lucide-react";

export default function DashboardPage() {
  const [cpuHistory, setCpuHistory] = useState<number[]>(
    Array.from({ length: 30 }, () => Math.random() * 40 + 10),
  );
  const [cpuVal, setCpuVal] = useState(23);
  const [uptime, setUptime] = useState("4h 23m");

  const services = [
    {
      name: "Ollama",
      status: "online",
      icon: "🧠",
      latency: "12ms",
      model: "qwen2.5-coder:32b",
    },
    {
      name: "Redis",
      status: "online",
      icon: "🔴",
      latency: "3ms",
      model: "Cache active",
    },
    {
      name: "Qdrant",
      status: "offline",
      icon: "📊",
      latency: "—",
      model: "Vector DB",
    },
    {
      name: "OpenAI API",
      status: "online",
      icon: "🤖",
      latency: "245ms",
      model: "gpt-4o available",
    },
    {
      name: "Anthropic",
      status: "offline",
      icon: "🟣",
      latency: "—",
      model: "No API key",
    },
  ];

  const tasks = [
    {
      id: 1,
      name: "Analyzing codebase",
      status: "running",
      progress: 67,
      icon: "⚡",
      eta: "~2 min",
    },
    {
      id: 2,
      name: "Web scraping batch",
      status: "running",
      progress: 34,
      icon: "🌐",
      eta: "~5 min",
    },
    {
      id: 3,
      name: "File organization",
      status: "completed",
      progress: 100,
      icon: "📁",
      eta: "Done",
    },
    {
      id: 4,
      name: "Email summary report",
      status: "completed",
      progress: 100,
      icon: "📧",
      eta: "Done",
    },
    {
      id: 5,
      name: "Database backup",
      status: "scheduled",
      progress: 0,
      icon: "💾",
      eta: "3:00 AM",
    },
  ];

  const logs = [
    {
      time: "19:54:30",
      level: "INFO",
      msg: "Agent processing request: code analysis",
    },
    {
      time: "19:54:28",
      level: "INFO",
      msg: "LLM response received from ollama (1.2s)",
    },
    {
      time: "19:54:25",
      level: "DEBUG",
      msg: "Tool execution: file_ops.read_file",
    },
    {
      time: "19:54:22",
      level: "INFO",
      msg: "New chat session created: session_abc123",
    },
    {
      time: "19:54:18",
      level: "WARN",
      msg: "Qdrant service unreachable, using fallback",
    },
    {
      time: "19:54:15",
      level: "INFO",
      msg: "System metrics collected successfully",
    },
    {
      time: "19:54:10",
      level: "DEBUG",
      msg: "WebSocket client connected from 192.168.1.5",
    },
    { time: "19:54:05", level: "INFO", msg: "Auto-backup completed (2.4 MB)" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      const v = Math.random() * 60 + 10;
      setCpuVal(Math.round(v));
      setCpuHistory((p) => [...p.slice(1), v]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const SparklineChart = ({
    data,
    color,
    height = 48,
  }: {
    data: number[];
    color: string;
    height?: number;
  }) => {
    const max = Math.max(...data, 100);
    const w = 200;
    const pts = data
      .map(
        (v, i) =>
          `${(i / (data.length - 1)) * w},${height - (v / max) * height}`,
      )
      .join(" ");
    return (
      <svg
        viewBox={`0 0 ${w} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height }}
      >
        <defs>
          <linearGradient
            id={`fill-${color.replace("#", "")}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          fill={`url(#fill-${color.replace("#", "")})`}
          points={`0,${height} ${pts} ${w},${height}`}
        />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pts}
        />
      </svg>
    );
  };

  const metricCards = [
    {
      label: "CPU",
      value: `${cpuVal}%`,
      icon: Cpu,
      color: "#6366f1",
      data: cpuHistory,
      trend: cpuVal > 30 ? "up" : "down",
    },
    {
      label: "Memory",
      value: "45%",
      icon: MemoryStick,
      color: "#8b5cf6",
      data: Array.from({ length: 30 }, () => Math.random() * 30 + 30),
      trend: "stable",
    },
    {
      label: "Disk",
      value: "32%",
      icon: HardDrive,
      color: "#10b981",
      data: Array.from({ length: 30 }, () => 32 + Math.random() * 2),
      trend: "stable",
    },
    {
      label: "Network",
      value: "↑1.2 ↓3.4",
      icon: Wifi,
      color: "#06b6d4",
      data: Array.from({ length: 30 }, () => Math.random() * 50 + 20),
      trend: "up",
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.1)" }}
          >
            <Activity size={18} style={{ color: "var(--accent-indigo)" }} />
          </div>
          <div>
            <h1
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Dashboard
            </h1>
            <p
              className="text-[11px] flex items-center gap-1"
              style={{ color: "var(--text-muted)" }}
            >
              <Server size={10} /> Uptime: {uptime} · Last refresh: just now
            </p>
          </div>
        </div>
        <button className="btn-ghost flex items-center gap-1.5 text-[11px]">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metricCards.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="liquid-glass p-3.5 group overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2 relative z-10">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${m.color}10` }}
                  >
                    <Icon size={13} style={{ color: m.color }} />
                  </div>
                  <span
                    className="text-[11px] font-semibold truncate"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {m.label}
                  </span>
                </div>
                <span
                  className="text-xs font-bold tabular-nums shrink-0 ml-1"
                  style={{ color: m.color }}
                >
                  {m.value}
                </span>
              </div>
              <div className="relative z-10 mt-1">
                <SparklineChart data={m.data} color={m.color} height={36} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Services */}
        <div className="liquid-glass p-4">
          <h2
            className="text-[13px] font-semibold mb-3 flex items-center gap-2 relative z-10"
            style={{ color: "var(--text-primary)" }}
          >
            <Zap size={13} style={{ color: "var(--accent-violet)" }} /> Services
            <span className="badge badge-success ml-auto text-[9px]">
              {services.filter((s) => s.status === "online").length}/
              {services.length} online
            </span>
          </h2>
          <div className="space-y-1.5 relative z-10">
            {services.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-sm w-6 text-center">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[12px] font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {s.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: "var(--text-ghost)" }}
                      >
                        {s.latency}
                      </span>
                      <div
                        className={`status-dot ${s.status === "online" ? "status-online" : "status-offline"}`}
                        style={{ width: 6, height: 6 }}
                      />
                    </div>
                  </div>
                  <p
                    className="text-[10px] truncate"
                    style={{ color: "var(--text-ghost)" }}
                  >
                    {s.model}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div className="liquid-glass p-4 lg:col-span-2 overflow-hidden">
          <h2
            className="text-[13px] font-semibold mb-3 flex items-center gap-2 relative z-10"
            style={{ color: "var(--text-primary)" }}
          >
            <Activity size={13} style={{ color: "var(--accent-indigo)" }} />{" "}
            Active Tasks
            <span className="badge badge-accent ml-auto text-[9px]">
              {tasks.filter((t) => t.status === "running").length} running
            </span>
          </h2>
          <div className="space-y-2.5 relative z-10">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <span className="text-sm w-6 text-center">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-[12px] font-medium truncate"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {t.name}
                    </span>
                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      <span
                        className="text-[10px] font-mono hidden sm:inline"
                        style={{ color: "var(--text-ghost)" }}
                      >
                        {t.eta}
                      </span>
                      <span
                        className="badge text-[7px] whitespace-nowrap px-1.5 py-0.5"
                        style={{
                          background:
                            t.status === "running"
                              ? "rgba(99,102,241,0.1)"
                              : t.status === "completed"
                                ? "rgba(16,185,129,0.1)"
                                : "rgba(245,158,11,0.1)",
                          color:
                            t.status === "running"
                              ? "var(--accent-indigo)"
                              : t.status === "completed"
                                ? "var(--success)"
                                : "var(--warning)",
                        }}
                      >
                        {t.status === "running" && (
                          <Circle size={4} fill="currentColor" />
                        )}
                        {t.status === "completed" && <CheckCircle2 size={7} />}
                        {t.status === "scheduled" && <Clock size={7} />}
                        {t.status}
                      </span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${t.progress}%`,
                        background:
                          t.status === "completed"
                            ? "var(--success)"
                            : undefined,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Logs */}
      <div className="liquid-glass p-4">
        <div className="flex items-center justify-between mb-2.5 relative z-10">
          <h2
            className="text-[13px] font-semibold flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            <Activity size={13} style={{ color: "var(--accent-indigo)" }} />{" "}
            Live Logs
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className="status-dot status-online"
                style={{ width: 5, height: 5 }}
              />
              <span
                className="text-[10px] font-semibold"
                style={{ color: "var(--text-ghost)" }}
              >
                LIVE
              </span>
            </div>
          </div>
        </div>
        <div
          className="font-mono text-[11px] space-y-0.5 max-h-48 overflow-y-auto relative z-10"
          style={{ color: "var(--text-secondary)" }}
        >
          {logs.map((log, i) => (
            <div
              key={i}
              className="flex gap-3 py-1 hover:bg-white/[0.02] rounded px-2 -mx-1 transition-colors"
            >
              <span
                className="shrink-0 tabular-nums"
                style={{ color: "var(--text-ghost)" }}
              >
                {log.time}
              </span>
              <span
                className="w-11 text-center shrink-0 font-bold rounded px-1"
                style={{
                  color:
                    log.level === "ERROR"
                      ? "var(--error)"
                      : log.level === "WARN"
                        ? "var(--warning)"
                        : log.level === "DEBUG"
                          ? "var(--text-ghost)"
                          : "var(--accent-indigo)",
                  background:
                    log.level === "WARN"
                      ? "rgba(245,158,11,0.06)"
                      : log.level === "ERROR"
                        ? "rgba(239,68,68,0.06)"
                        : "transparent",
                }}
              >
                {log.level}
              </span>
              <span className="flex-1 truncate">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
