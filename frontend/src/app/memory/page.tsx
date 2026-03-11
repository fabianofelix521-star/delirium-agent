"use client";

import { useState } from "react";
import {
    Search,
    Brain,
    Clock,
    Tag,
    Trash2,
    Download,
    Database,
    Sparkles,
} from "lucide-react";

export default function MemoryPage() {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");

    const memories = [
        { id: 1, type: "interaction", content: "User asked about Python web scraping with BeautifulSoup", importance: 0.8, timestamp: Date.now() - 3600000 },
        { id: 2, type: "fact", content: "User prefers dark mode and Portuguese language", importance: 0.9, timestamp: Date.now() - 7200000 },
        { id: 3, type: "interaction", content: "Analyzed project structure for React migration", importance: 0.6, timestamp: Date.now() - 86400000 },
        { id: 4, type: "task", content: "Scheduled daily backup at 3:00 AM", importance: 0.7, timestamp: Date.now() - 172800000 },
        { id: 5, type: "fact", content: "User's tech stack: Next.js, FastAPI, Supabase, Tailwind CSS", importance: 0.95, timestamp: Date.now() - 259200000 },
        { id: 6, type: "interaction", content: "Helped debug CORS issue in FastAPI backend", importance: 0.5, timestamp: Date.now() - 345600000 },
    ];

    const filtered = memories.filter((m) => {
        const matchSearch = m.content.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === "all" || m.type === filter;
        return matchSearch && matchFilter;
    });

    const timeAgo = (ts: number) => {
        const diff = Date.now() - ts;
        if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
        return `${Math.round(diff / 86400000)}d ago`;
    };

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)" }}>
                        <Brain size={18} style={{ color: "var(--accent-violet)" }} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Memory</h1>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{memories.length} memories · 2.4K tokens</p>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <div className="relative flex-1 md:flex-none">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-ghost)" }} />
                        <input type="text" placeholder="Search memories..." value={search} onChange={(e) => setSearch(e.target.value)}
                            className="input-glass pl-9 w-full md:w-52" />
                    </div>
                    <button className="btn-ghost flex items-center gap-1.5 text-[11px] shrink-0">
                        <Download size={12} /> Export
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-1.5">
                {[
                    { key: "all", icon: Database },
                    { key: "interaction", icon: Sparkles },
                    { key: "fact", icon: Tag },
                    { key: "task", icon: Clock },
                ].map((f) => {
                    const Icon = f.icon;
                    return (
                        <button key={f.key} onClick={() => setFilter(f.key)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all flex items-center gap-1.5"
                            style={{
                                background: filter === f.key ? "rgba(99,102,241,0.1)" : "transparent",
                                color: filter === f.key ? "var(--accent-indigo)" : "var(--text-muted)",
                                border: `1px solid ${filter === f.key ? "rgba(99,102,241,0.2)" : "transparent"}`,
                            }}
                        >
                            <Icon size={11} /> {f.key}
                        </button>
                    );
                })}
            </div>

            {/* Memory list */}
            <div className="space-y-2">
                {filtered.map((mem) => (
                    <div key={mem.id} className="liquid-glass liquid-glass-hover p-3.5 transition-all">
                        <div className="flex items-start justify-between gap-3 relative z-10">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`badge text-[9px] ${mem.type === "fact" ? "badge-success" : mem.type === "task" ? "badge-warning" : "badge-accent"}`}>
                                        {mem.type}
                                    </span>
                                    <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-ghost)" }}>
                                        <Clock size={9} /> {timeAgo(mem.timestamp)}
                                    </span>
                                </div>
                                <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{mem.content}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="w-12 progress-bar" style={{ height: 3 }}>
                                    <div className="progress-fill" style={{ width: `${mem.importance * 100}%` }} />
                                </div>
                                <button className="p-1 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--text-ghost)" }}>
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Stats */}
            <div className="liquid-glass p-4">
                <h3 className="text-[12px] font-semibold mb-3 relative z-10" style={{ color: "var(--text-primary)" }}>Statistics</h3>
                <div className="grid grid-cols-3 gap-4 text-center relative z-10">
                    <div>
                        <p className="text-lg font-bold gradient-text">{memories.length}</p>
                        <p className="text-[9px] font-semibold" style={{ color: "var(--text-ghost)" }}>Total</p>
                    </div>
                    <div>
                        <p className="text-lg font-bold" style={{ color: "var(--accent-violet)" }}>2.4K</p>
                        <p className="text-[9px] font-semibold" style={{ color: "var(--text-ghost)" }}>Tokens</p>
                    </div>
                    <div>
                        <p className="text-lg font-bold" style={{ color: "var(--success)" }}>89%</p>
                        <p className="text-[9px] font-semibold" style={{ color: "var(--text-ghost)" }}>Recall</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
