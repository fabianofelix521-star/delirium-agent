"use client";

import { useState, useEffect, useCallback } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  Activity,
  CheckCircle2,
  RefreshCw,
  Server,
  Zap,
  MessageSquare,
} from "lucide-react";

interface Metrics {
  cpu: { percent: number; cores: number };
  memory: { total_gb: number; used_gb: number; percent: number };
  disk: { total_gb: number; used_gb: number; percent: number };
  network: { bytes_sent: number; bytes_recv: number };
}

interface ServiceStatus {
  name: string;
  status: string;
  details: Record<string, unknown>;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [prevNetwork, setPrevNetwork] = useState<{
    sent: number;
    recv: number;
  } | null>(null);
  const [netSpeed, setNetSpeed] = useState({ up: "0", down: "0" });
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(30).fill(0));
  const [memHistory, setMemHistory] = useState<number[]>(Array(30).fill(0));
  const [conversations, setConversations] = useState<
    { id: string; title: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/system/metrics`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data: Metrics = await res.json();
      setMetrics(data);
      setCpuHistory((prev) => [...prev.slice(1), data.cpu.percent]);
      setMemHistory((prev) => [...prev.slice(1), data.memory.percent]);

      if (prevNetwork) {
        const upMB = (
          (data.network.bytes_sent - prevNetwork.sent) /
          1024 /
          1024
        ).toFixed(1);
        const downMB = (
          (data.network.bytes_recv - prevNetwork.recv) /
          1024 /
          1024
        ).toFixed(1);
        setNetSpeed({ up: upMB, down: downMB });
      }
      setPrevNetwork({
        sent: data.network.bytes_sent,
        recv: data.network.bytes_recv,
      });
      setLastRefresh(new Date());
    } catch {
      /* backend offline */
    }
  }, [prevNetwork]);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/system/services`, { headers: getAuthHeaders() });
      if (res.ok) setServices(await res.json());
    } catch {}
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/chat/conversations`, { headers: getAuthHeaders() });
      if (res.ok) setConversations(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchMetrics(),
        fetchServices(),
        fetchConversations(),
      ]);
      setLoading(false);
    };
    init();
    const metricsInterval = setInterval(fetchMetrics, 3000);
    const servicesInterval = setInterval(fetchServices, 15000);
    return () => {
      clearInterval(metricsInterval);
      clearInterval(servicesInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const metricCards = metrics
    ? [
        {
          label: "CPU",
          value: `${Math.round(metrics.cpu.percent)}%`,
          sub: `${metrics.cpu.cores} cores`,
          icon: Cpu,
          color: "#6366f1",
          data: cpuHistory,
        },
        {
          label: "Memory",
          value: `${Math.round(metrics.memory.percent)}%`,
          sub: `${metrics.memory.used_gb}/${metrics.memory.total_gb} GB`,
          icon: MemoryStick,
          color: "#8b5cf6",
          data: memHistory,
        },
        {
          label: "Disk",
          value: `${metrics.disk.percent}%`,
          sub: `${metrics.disk.used_gb}/${metrics.disk.total_gb} GB`,
          icon: HardDrive,
          color: "#10b981",
          data: Array(30).fill(metrics.disk.percent),
        },
        {
          label: "Network",
          value: `↑${netSpeed.up} ↓${netSpeed.down}`,
          sub: "MB/s",
          icon: Wifi,
          color: "#06b6d4",
          data: cpuHistory.map((_, i) => cpuHistory[i] || 0),
        },
      ]
    : [];

  const serviceIcons: Record<string, string> = {
    Redis: "🔴",
    Qdrant: "📊",
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto animate-fade-in space-y-4">
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
              <Server size={10} /> Last refresh:{" "}
              {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            fetchMetrics();
            fetchServices();
          }}
          className="btn-ghost flex items-center gap-1.5 text-[11px]"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {loading && !metrics ? (
        <div className="liquid-glass p-8 text-center">
          <p
            className="text-sm animate-pulse"
            style={{ color: "var(--text-muted)" }}
          >
            Connecting to backend...
          </p>
        </div>
      ) : !metrics ? (
        <div className="liquid-glass p-8 text-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Backend offline. Start the server to see real metrics.
          </p>
        </div>
      ) : (
        <>
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
                      <div className="min-w-0">
                        <span
                          className="text-[11px] font-semibold truncate block"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {m.label}
                        </span>
                        <span
                          className="text-[9px] truncate block"
                          style={{ color: "var(--text-ghost)" }}
                        >
                          {m.sub}
                        </span>
                      </div>
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
            <div className="liquid-glass p-4">
              <h2
                className="text-[13px] font-semibold mb-3 flex items-center gap-2 relative z-10"
                style={{ color: "var(--text-primary)" }}
              >
                <Zap size={13} style={{ color: "var(--accent-violet)" }} />{" "}
                Services
                <span className="badge badge-success ml-auto text-[9px]">
                  {services.filter((s) => s.status === "online").length}/
                  {services.length} online
                </span>
              </h2>
              <div className="space-y-1.5 relative z-10">
                {services.length === 0 ? (
                  <p
                    className="text-[11px] py-2"
                    style={{ color: "var(--text-ghost)" }}
                  >
                    No services detected
                  </p>
                ) : (
                  services.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <span className="text-sm w-6 text-center">
                        {serviceIcons[s.name] || "⚙️"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span
                            className="text-[12px] font-medium"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {s.name}
                          </span>
                          <div
                            className={`status-dot ${s.status === "online" ? "status-online" : "status-offline"}`}
                            style={{ width: 6, height: 6 }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="liquid-glass p-4 lg:col-span-2 overflow-hidden">
              <h2
                className="text-[13px] font-semibold mb-3 flex items-center gap-2 relative z-10"
                style={{ color: "var(--text-primary)" }}
              >
                <MessageSquare
                  size={13}
                  style={{ color: "var(--accent-indigo)" }}
                />{" "}
                Recent Conversations
                <span className="badge badge-accent ml-auto text-[9px]">
                  {conversations.length} total
                </span>
              </h2>
              <div className="space-y-2 relative z-10">
                {conversations.length === 0 ? (
                  <p
                    className="text-[11px] py-2"
                    style={{ color: "var(--text-ghost)" }}
                  >
                    No conversations yet. Start chatting!
                  </p>
                ) : (
                  conversations.slice(0, 6).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <CheckCircle2
                        size={12}
                        style={{ color: "var(--success)" }}
                      />
                      <span
                        className="text-[12px] font-medium truncate"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {c.title}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
