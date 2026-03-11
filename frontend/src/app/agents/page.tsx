"use client";

import { Bot, Plus, Users, Play, Pause, Activity, ChevronRight } from "lucide-react";

export default function AgentsPage() {
    const agents = [
        { id: "ceo", name: "CEO Agent", role: "Orchestrator", status: "active", tasks: 12, icon: "👔", color: "#6366f1", successRate: 98 },
        { id: "dev", name: "Developer", role: "Code & Debug", status: "active", tasks: 45, icon: "💻", color: "#8b5cf6", successRate: 96 },
        { id: "researcher", name: "Researcher", role: "Web Research", status: "idle", tasks: 23, icon: "🔬", color: "#06b6d4", successRate: 92 },
        { id: "writer", name: "Writer", role: "Content Creation", status: "idle", tasks: 8, icon: "✍️", color: "#ec4899", successRate: 95 },
    ];

    const teams = [
        { name: "Dev Team", agents: ["CEO Agent", "Developer", "Researcher"], active: true },
        { name: "Research Team", agents: ["Researcher", "Writer"], active: false },
        { name: "Full Stack", agents: ["CEO Agent", "Developer", "Researcher", "Writer"], active: false },
    ];

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto animate-fade-in space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
                        <Bot size={18} style={{ color: "var(--accent-indigo)" }} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Agents</h1>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                            {agents.filter(a => a.status === "active").length} active · {agents.reduce((a, b) => a + b.tasks, 0)} tasks done
                        </p>
                    </div>
                </div>
                <button className="btn-primary flex items-center gap-1.5 text-[12px]">
                    <Plus size={13} /> Create Agent
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {agents.map((a) => (
                    <div key={a.id} className="liquid-glass liquid-glass-hover p-4 transition-all group cursor-pointer">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                                    style={{ background: `${a.color}10` }}
                                >
                                    {a.icon}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className={`status-dot ${a.status === "active" ? "status-online" : ""}`}
                                        style={{ width: 6, height: 6, background: a.status === "active" ? "var(--success)" : "var(--text-ghost)" }} />
                                    <span className="text-[10px] capitalize font-medium" style={{ color: "var(--text-ghost)" }}>{a.status}</span>
                                </div>
                            </div>
                            <h3 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{a.name}</h3>
                            <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>{a.role}</p>
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] font-medium" style={{ color: "var(--text-ghost)" }}>{a.tasks} tasks</span>
                                        <span className="text-[9px] font-bold tabular-nums" style={{ color: "var(--success)" }}>{a.successRate}%</span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 3 }}>
                                        <div className="progress-fill" style={{ width: `${a.successRate}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <h2 className="text-[13px] font-semibold flex items-center gap-2 pt-2" style={{ color: "var(--text-primary)" }}>
                <Users size={13} style={{ color: "var(--accent-violet)" }} /> Team Templates
            </h2>
            <div className="space-y-2">
                {teams.map((team, i) => (
                    <div key={i} className="liquid-glass flex items-center justify-between p-3.5">
                        <div className="relative z-10 flex-1 min-w-0">
                            <h3 className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>{team.name}</h3>
                            <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{team.agents.join(" · ")}</p>
                        </div>
                        <button className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all relative z-10 shrink-0"
                            style={{
                                background: team.active ? "rgba(16,185,129,0.1)" : "var(--bg-elevated)",
                                color: team.active ? "var(--success)" : "var(--text-muted)",
                                border: `1px solid ${team.active ? "rgba(16,185,129,0.2)" : "var(--glass-border)"}`,
                            }}
                        >
                            {team.active ? <><Pause size={11} /> Active</> : <><Play size={11} /> Activate</>}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
