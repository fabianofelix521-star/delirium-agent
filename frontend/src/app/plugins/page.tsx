"use client";

import { Puzzle, Plus, Package, Power } from "lucide-react";

export default function PluginsPage() {
    const plugins = [
        { id: "auto_git", name: "Auto Git", description: "Automatic git commit and push on file changes", author: "Delirium Team", version: "1.0.0", enabled: true, icon: Package, color: "#6366f1" },
        { id: "web_monitor", name: "Web Monitor", description: "Monitor websites for changes and get notified", author: "Community", version: "0.8.2", enabled: false, icon: Power, color: "#06b6d4" },
        { id: "code_review", name: "Code Reviewer", description: "Automatic code review with AI suggestions", author: "Delirium Team", version: "1.1.0", enabled: true, icon: Package, color: "#8b5cf6" },
        { id: "scheduler", name: "Task Scheduler", description: "Schedule recurring tasks with cron expressions", author: "Community", version: "0.9.1", enabled: true, icon: Package, color: "#10b981" },
    ];

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(168,85,247,0.1)" }}>
                        <Puzzle size={18} style={{ color: "var(--accent-purple)" }} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Plugins</h1>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Extend Delirium with custom plugins</p>
                    </div>
                </div>
                <button className="btn-primary flex items-center gap-1.5">
                    <Plus size={14} /> Create
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
                {plugins.map((p) => {
                    const Icon = p.icon;
                    return (
                        <div key={p.id} className="liquid-glass liquid-glass-hover p-4 transition-all">
                            <div className="flex items-start gap-3 relative z-10">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: `${p.color}12`, color: p.color }}
                                >
                                    <Icon size={20} strokeWidth={1.8} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{p.name}</h3>
                                        <div className="toggle-switch" data-on={p.enabled.toString()}>
                                            <div className="toggle-knob" style={{ left: p.enabled ? "20px" : "2px" }} />
                                        </div>
                                    </div>
                                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{p.description}</p>
                                    <div className="flex items-center gap-3 mt-2 text-[10px] font-medium" style={{ color: "var(--text-ghost)" }}>
                                        <span>by {p.author}</span>
                                        <span>v{p.version}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
