"use client";

import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";
import {
  Link2,
  Mail,
  MessageCircle,
  Send as SendIcon,
  Cloud,
  FileText,
  Calendar,
  Apple,
  TrendingUp,
  CreditCard,
  Wallet,
  Loader2,
} from "lucide-react";

const iconMap: Record<
  string,
  React.ComponentType<{ size?: number; strokeWidth?: number }>
> = {
  gmail: Mail,
  whatsapp: MessageCircle,
  telegram: SendIcon,
  gdrive: Cloud,
  notion: FileText,
  calendar: Calendar,
  icloud: Apple,
  binance: TrendingUp,
  nubank: CreditCard,
  mercadopago: Wallet,
};

const colorMap: Record<string, string> = {
  gmail: "#ef4444",
  whatsapp: "#22c55e",
  telegram: "#3b82f6",
  gdrive: "#f59e0b",
  notion: "#f8f8f8",
  calendar: "#3b82f6",
  icloud: "#8b8ba3",
  binance: "#f59e0b",
  nubank: "#8b5cf6",
  mercadopago: "#06b6d4",
};

interface Integration {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: string;
  config: Record<string, string>;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [connecting, setConnecting] = useState<string | null>(null);
  const categories = ["all", "communication", "productivity", "finance"];

  useEffect(() => {
    fetch(`${API_BASE}/api/integrations/`)
      .then((r) => r.json())
      .then((data) => setIntegrations(data))
      .catch(() => {});
  }, []);

  const toggleConnection = async (id: string) => {
    const int = integrations.find((i) => i.id === id);
    if (!int) return;
    const action = int.status === "connected" ? "disconnect" : "connect";
    setConnecting(id);
    try {
      const res = await fetch(`${API_BASE}/api/integrations/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: {} }),
      });
      if (res.ok) {
        const data = await res.json();
        setIntegrations((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: data.status } : i)),
        );
      }
    } catch {}
    setConnecting(null);
  };

  // Categorize integrations
  const categoryMap: Record<string, string> = {
    gmail: "communication",
    whatsapp: "communication",
    telegram: "communication",
    gdrive: "productivity",
    notion: "productivity",
    calendar: "productivity",
    icloud: "productivity",
    binance: "finance",
    nubank: "finance",
    mercadopago: "finance",
  };

  const filtered = integrations.filter(
    (i) => activeCategory === "all" || categoryMap[i.id] === activeCategory,
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(6,182,212,0.1)" }}
        >
          <Link2 size={18} style={{ color: "var(--accent-cyan)" }} />
        </div>
        <div>
          <h1
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Integrations
          </h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Connect external services
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all"
            style={{
              background:
                activeCategory === cat
                  ? "rgba(99,102,241,0.1)"
                  : "var(--bg-elevated)",
              color:
                activeCategory === cat
                  ? "var(--accent-indigo)"
                  : "var(--text-muted)",
              border: `1px solid ${activeCategory === cat ? "rgba(99,102,241,0.2)" : "var(--glass-border)"}`,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
        {filtered.length === 0 ? (
          <div className="col-span-full liquid-glass p-8 text-center">
            <p
              className="text-sm animate-pulse"
              style={{ color: "var(--text-muted)" }}
            >
              Loading integrations...
            </p>
          </div>
        ) : (
          filtered.map((int) => {
            const Icon = iconMap[int.id] || Link2;
            const color = colorMap[int.id] || "#6366f1";
            return (
              <div
                key={int.id}
                className="liquid-glass liquid-glass-hover p-4 transition-all"
              >
                <div className="flex items-start gap-3 relative z-10">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${color}12`, color }}
                  >
                    <Icon size={22} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3
                        className="text-[13px] font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {int.name}
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`status-dot ${int.status === "connected" ? "status-online" : ""}`}
                          style={{
                            width: 6,
                            height: 6,
                            background:
                              int.status === "connected"
                                ? "var(--success)"
                                : "var(--text-ghost)",
                          }}
                        />
                        <span
                          className="text-[10px] capitalize font-medium"
                          style={{ color: "var(--text-ghost)" }}
                        >
                          {int.status}
                        </span>
                      </div>
                    </div>
                    <p
                      className="text-xs mt-0.5 mb-3"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {int.description}
                    </p>
                    <button
                      onClick={() => toggleConnection(int.id)}
                      disabled={connecting === int.id}
                      className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${int.status === "connected" ? "btn-ghost" : "btn-primary"}`}
                      style={
                        int.status === "connected"
                          ? {
                              color: "var(--error)",
                              borderColor: "rgba(239,68,68,0.2)",
                            }
                          : {}
                      }
                    >
                      {connecting === int.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : null}
                      {int.status === "connected" ? "Disconnect" : "Connect"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
