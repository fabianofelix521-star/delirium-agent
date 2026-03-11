"use client";

import { useState } from "react";
import {
    Search,
    Zap,
    Globe,
    FolderOpen,
    Terminal,
    SearchIcon,
    GitBranch,
    Camera,
    Mail,
    MessageCircle,
    Send,
    Coins,
    TrendingUp,
} from "lucide-react";

const tools = [
    { id: "code_exec", name: "Code Execution", description: "Execute Python, Node.js, or Bash code in a sandbox", category: "code", icon: Zap, color: "#6366f1", enabled: true, execCount: 142, successRate: 96 },
    { id: "web_browse", name: "Web Browser", description: "Browse and scrape web pages with Playwright", category: "web", icon: Globe, color: "#06b6d4", enabled: true, execCount: 89, successRate: 92 },
    { id: "file_ops", name: "File Operations", description: "Read, write, list, and search files", category: "file", icon: FolderOpen, color: "#10b981", enabled: true, execCount: 234, successRate: 99 },
    { id: "shell", name: "Shell Commands", description: "Execute system shell commands", category: "system", icon: Terminal, color: "#f59e0b", enabled: true, execCount: 167, successRate: 94 },
    { id: "web_search", name: "Web Search", description: "Search the web for information", category: "web", icon: SearchIcon, color: "#8b5cf6", enabled: true, execCount: 56, successRate: 98 },
    { id: "git_ops", name: "Git Operations", description: "Git clone, commit, push, pull", category: "code", icon: GitBranch, color: "#ec4899", enabled: true, execCount: 45, successRate: 100 },
    { id: "screenshot", name: "Screenshot", description: "Capture screen and OCR text extraction", category: "system", icon: Camera, color: "#3b82f6", enabled: false, execCount: 0, successRate: 0 },
    { id: "send_email", name: "Email", description: "Send and read emails via Gmail", category: "communication", icon: Mail, color: "#ef4444", enabled: false, execCount: 0, successRate: 0 },
    { id: "whatsapp", name: "WhatsApp", description: "Send and receive WhatsApp messages", category: "communication", icon: MessageCircle, color: "#22c55e", enabled: false, execCount: 0, successRate: 0 },
    { id: "telegram", name: "Telegram", description: "Send messages via Telegram bot", category: "communication", icon: Send, color: "#3b82f6", enabled: false, execCount: 0, successRate: 0 },
    { id: "pix", name: "Pix Payment", description: "Send Pix payments via Nubank/Inter", category: "finance", icon: Coins, color: "#a855f7", enabled: false, execCount: 0, successRate: 0 },
    { id: "binance", name: "Binance Trading", description: "Trade crypto on Binance", category: "finance", icon: TrendingUp, color: "#f59e0b", enabled: false, execCount: 0, successRate: 0 },
];

const categories = ["all", "code", "web", "file", "system", "communication", "finance"];

export default function ToolsPage() {
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [toolState, setToolState] = useState(tools);

    const filtered = toolState.filter((t) => {
        const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
        const matchCategory = activeCategory === "all" || t.category === activeCategory;
        return matchSearch && matchCategory;
    });

    const toggleTool = (id: string) => {
        setToolState((prev) => prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)));
    };

    const totalRuns = toolState.reduce((a, t) => a + t.execCount, 0);
    const enabledCount = toolState.filter((t) => t.enabled).length;

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
                        <Zap size={18} style={{ color: "var(--accent-indigo)" }} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Tools</h1>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                            {enabledCount}/{toolState.length} active · {totalRuns} total runs
                        </p>
                    </div>
                </div>
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-ghost)" }} />
                    <input
                        type="text"
                        placeholder="Search tools..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-glass pl-9 w-full md:w-56"
                    />
                </div>
            </div>

            {/* Categories */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize whitespace-nowrap transition-all"
                        style={{
                            background: activeCategory === cat ? "rgba(99,102,241,0.1)" : "transparent",
                            color: activeCategory === cat ? "var(--accent-indigo)" : "var(--text-muted)",
                            border: `1px solid ${activeCategory === cat ? "rgba(99,102,241,0.2)" : "transparent"}`,
                        }}
                    >
                        {cat}{activeCategory === cat && ` (${filtered.length})`}
                    </button>
                ))}
            </div>

            {/* Tool Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((tool) => {
                    const Icon = tool.icon;
                    return (
                        <div
                            key={tool.id}
                            className="liquid-glass liquid-glass-hover p-4 transition-all"
                            style={{ opacity: tool.enabled ? 1 : 0.45 }}
                        >
                            <div className="flex items-start justify-between mb-2.5 relative z-10">
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                                        style={{ background: `${tool.color}10`, color: tool.color }}
                                    >
                                        <Icon size={17} strokeWidth={1.8} />
                                    </div>
                                    <div>
                                        <h3 className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
                                            {tool.name}
                                        </h3>
                                        <span className="badge badge-accent text-[8px]">{tool.category}</span>
                                    </div>
                                </div>
                                <div
                                    className="toggle-switch"
                                    data-on={tool.enabled.toString()}
                                    onClick={() => toggleTool(tool.id)}
                                >
                                    <div className="toggle-knob" style={{ left: tool.enabled ? "20px" : "2px" }} />
                                </div>
                            </div>
                            <p className="text-[11px] mb-2.5 relative z-10 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                                {tool.description}
                            </p>
                            {tool.enabled && tool.execCount > 0 && (
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: "var(--text-ghost)" }}>
                                        <span className="tabular-nums">{tool.execCount}</span> runs
                                    </div>
                                    <div className="flex-1 progress-bar" style={{ height: 3 }}>
                                        <div className="progress-fill" style={{ width: `${tool.successRate}%`, background: tool.successRate >= 95 ? "var(--success)" : "var(--warning)" }} />
                                    </div>
                                    <span className="text-[10px] font-bold tabular-nums" style={{ color: tool.successRate >= 95 ? "var(--success)" : "var(--warning)" }}>
                                        {tool.successRate}%
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
