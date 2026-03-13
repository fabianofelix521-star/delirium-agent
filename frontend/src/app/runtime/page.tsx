"use client";

import { useState, useEffect, useCallback } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import {
  Server,
  Cpu,
  HardDrive,
  MemoryStick,
  RefreshCw,
  Package,
  Globe,
  Terminal,
} from "lucide-react";

interface RuntimeData {
  system: {
    platform: string;
    python_version: string;
    architecture: string;
    hostname: string;
    os: string;
    os_version: string;
  };
  process: {
    pid: number;
    uptime_seconds: number;
    uptime_human: string;
    working_directory: string;
  };
  cpu: {
    cores_physical: number;
    cores_logical: number;
    usage_percent: number;
    frequency_mhz: number | null;
  };
  memory: {
    total_gb: number;
    used_gb: number;
    available_gb: number;
    percent: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    percent: number;
  };
  environment: Record<string, string>;
  dependencies: Record<string, string>;
}

export default function RuntimePage() {
  const [data, setData] = useState<RuntimeData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    fetch(`${API_BASE}/api/runtime`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 10000);
    return () => clearInterval(iv);
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div
          className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full"
          style={{
            borderColor: "var(--accent-indigo)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  const sections = [
    {
      icon: Server,
      title: "System",
      color: "#6366f1",
      items: [
        { label: "Platform", value: data.system.platform },
        {
          label: "OS",
          value: `${data.system.os} ${data.system.os_version.slice(0, 30)}`,
        },
        { label: "Architecture", value: data.system.architecture },
        { label: "Hostname", value: data.system.hostname },
        { label: "Python", value: data.system.python_version.split(" ")[0] },
      ],
    },
    {
      icon: Terminal,
      title: "Process",
      color: "#8b5cf6",
      items: [
        { label: "PID", value: String(data.process.pid) },
        { label: "Uptime", value: data.process.uptime_human },
        { label: "Working Directory", value: data.process.working_directory },
      ],
    },
    {
      icon: Cpu,
      title: "CPU",
      color: "#f59e0b",
      items: [
        { label: "Physical Cores", value: String(data.cpu.cores_physical) },
        { label: "Logical Cores", value: String(data.cpu.cores_logical) },
        { label: "Usage", value: `${data.cpu.usage_percent}%` },
        ...(data.cpu.frequency_mhz
          ? [
              {
                label: "Frequency",
                value: `${data.cpu.frequency_mhz.toFixed(0)} MHz`,
              },
            ]
          : []),
      ],
    },
    {
      icon: MemoryStick,
      title: "Memory",
      color: "#3b82f6",
      items: [
        { label: "Total", value: `${data.memory.total_gb} GB` },
        { label: "Used", value: `${data.memory.used_gb} GB` },
        { label: "Available", value: `${data.memory.available_gb} GB` },
        { label: "Usage", value: `${data.memory.percent}%` },
      ],
    },
    {
      icon: HardDrive,
      title: "Disk",
      color: "#22c55e",
      items: [
        { label: "Total", value: `${data.disk.total_gb} GB` },
        { label: "Used", value: `${data.disk.used_gb} GB` },
        { label: "Free", value: `${data.disk.free_gb} GB` },
        { label: "Usage", value: `${data.disk.percent}%` },
      ],
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Runtime
        </h2>
        <button
          onClick={fetchData}
          className="p-2 rounded-lg hover:bg-white/5"
          style={{ color: "var(--text-muted)" }}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Resource Bars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: "CPU", value: data.cpu.usage_percent, color: "#f59e0b" },
          { label: "Memory", value: data.memory.percent, color: "#3b82f6" },
          { label: "Disk", value: data.disk.percent, color: "#22c55e" },
        ].map((r) => (
          <div
            key={r.label}
            className="rounded-xl p-4"
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div className="flex justify-between mb-2">
              <span
                className="text-xs font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                {r.label}
              </span>
              <span
                className="text-xs font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {r.value}%
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(r.value, 100)}%`,
                  background: r.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Info Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((sec) => (
          <div
            key={sec.title}
            className="rounded-xl overflow-hidden"
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div
              className="px-4 py-3 flex items-center gap-2"
              style={{ borderBottom: "1px solid var(--glass-border)" }}
            >
              <sec.icon size={14} style={{ color: sec.color }} />
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {sec.title}
              </span>
            </div>
            <div className="p-3 space-y-2">
              {sec.items.map((item) => (
                <div key={item.label} className="flex justify-between px-2">
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--text-ghost)" }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="text-[11px] font-medium text-right max-w-[60%] truncate"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Environment */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: "1px solid var(--glass-border)" }}
          >
            <Globe size={14} style={{ color: "#ec4899" }} />
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Environment
            </span>
          </div>
          <div className="p-3 space-y-2">
            {Object.entries(data.environment).map(([k, v]) => (
              <div key={k} className="flex justify-between px-2">
                <span
                  className="text-[11px] font-mono"
                  style={{ color: "var(--text-ghost)" }}
                >
                  {k}
                </span>
                <span
                  className="text-[11px] font-medium truncate max-w-[50%]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Dependencies */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: "1px solid var(--glass-border)" }}
          >
            <Package size={14} style={{ color: "#10b981" }} />
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Dependencies
            </span>
          </div>
          <div className="p-3 space-y-2">
            {Object.entries(data.dependencies).map(([k, v]) => (
              <div key={k} className="flex justify-between px-2">
                <span
                  className="text-[11px]"
                  style={{ color: "var(--text-ghost)" }}
                >
                  {k}
                </span>
                <span
                  className="text-[11px] font-mono"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
