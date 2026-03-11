"use client";

import { useState } from "react";
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
} from "lucide-react";

const integrations = [
    { id: "gmail", name: "Gmail", icon: Mail, color: "#ef4444", description: "Send and receive emails", status: "disconnected", category: "communication" },
    { id: "whatsapp", name: "WhatsApp", icon: MessageCircle, color: "#22c55e", description: "WhatsApp messaging", status: "disconnected", category: "communication" },
    { id: "telegram", name: "Telegram", icon: SendIcon, color: "#3b82f6", description: "Telegram bot & userbot", status: "disconnected", category: "communication" },
    { id: "gdrive", name: "Google Drive", icon: Cloud, color: "#f59e0b", description: "Cloud file storage", status: "disconnected", category: "productivity" },
    { id: "notion", name: "Notion", icon: FileText, color: "#f8f8f8", description: "Workspace & databases", status: "disconnected", category: "productivity" },
    { id: "calendar", name: "Google Calendar", icon: Calendar, color: "#3b82f6", description: "Calendar & events", status: "disconnected", category: "productivity" },
    { id: "icloud", name: "iCloud", icon: Apple, color: "#8b8ba3", description: "Apple ecosystem sync", status: "disconnected", category: "productivity" },
    { id: "binance", name: "Binance", icon: TrendingUp, color: "#f59e0b", description: "Crypto trading", status: "disconnected", category: "finance" },
    { id: "nubank", name: "Nubank", icon: CreditCard, color: "#8b5cf6", description: "Pix & banking", status: "disconnected", category: "finance" },
    { id: "mercadopago", name: "Mercado Pago", icon: Wallet, color: "#06b6d4", description: "Payments & Pix", status: "disconnected", category: "finance" },
];

export default function IntegrationsPage() {
    const [integrationState, setIntegrationState] = useState(integrations);
    const [activeCategory, setActiveCategory] = useState("all");
    const categories = ["all", "communication", "productivity", "finance"];

    const toggleConnection = (id: string) => {
        setIntegrationState((prev) => prev.map((i) =>
            i.id === id ? { ...i, status: i.status === "connected" ? "disconnected" : "connected" } : i
        ));
    };

    const filtered = integrationState.filter((i) => activeCategory === "all" || i.category === activeCategory);

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(6,182,212,0.1)" }}>
                    <Link2 size={18} style={{ color: "var(--accent-cyan)" }} />
                </div>
                <div>
                    <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Integrations</h1>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Connect external services</p>
                </div>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {categories.map((cat) => (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all"
                        style={{
                            background: activeCategory === cat ? "rgba(99,102,241,0.1)" : "var(--bg-elevated)",
                            color: activeCategory === cat ? "var(--accent-indigo)" : "var(--text-muted)",
                            border: `1px solid ${activeCategory === cat ? "rgba(99,102,241,0.2)" : "var(--glass-border)"}`,
                        }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
                {filtered.map((int) => {
                    const Icon = int.icon;
                    return (
                        <div key={int.id} className="liquid-glass liquid-glass-hover p-4 transition-all">
                            <div className="flex items-start gap-3 relative z-10">
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: `${int.color}12`, color: int.color }}
                                >
                                    <Icon size={22} strokeWidth={1.8} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{int.name}</h3>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`status-dot ${int.status === "connected" ? "status-online" : ""}`}
                                                style={{ width: 6, height: 6, background: int.status === "connected" ? "var(--success)" : "var(--text-ghost)" }} />
                                            <span className="text-[10px] capitalize font-medium" style={{ color: "var(--text-ghost)" }}>{int.status}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs mt-0.5 mb-3" style={{ color: "var(--text-muted)" }}>{int.description}</p>
                                    <button onClick={() => toggleConnection(int.id)}
                                        className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all ${int.status === "connected" ? "btn-ghost" : "btn-primary"}`}
                                        style={int.status === "connected" ? { color: "var(--error)", borderColor: "rgba(239,68,68,0.2)" } : {}}
                                    >
                                        {int.status === "connected" ? "Disconnect" : "Connect"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
