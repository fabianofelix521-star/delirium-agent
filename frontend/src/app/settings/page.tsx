"use client";

import Link from "next/link";
import {
    Settings,
    Bot,
    Mic,
    Shield,
    Bell,
    HardDrive,
    Zap,
    ChevronRight,
    Moon,
    Volume2,
    Monitor,
    Save,
} from "lucide-react";
import { useState } from "react";

const settingsSections = [
    { href: "/settings/apis", icon: Bot, color: "#6366f1", title: "API Providers", description: "Configure LLM providers (OpenAI, Claude, Gemini, Ollama...)" },
    { href: "#general", icon: Monitor, color: "#3b82f6", title: "General", description: "Language, timezone, and theme preferences" },
    { href: "#voice", icon: Mic, color: "#8b5cf6", title: "Voice", description: "TTS engine, voice selection, speed and pitch" },
    { href: "#security", icon: Shield, color: "#ef4444", title: "Security", description: "Password, 2FA, API tokens, session management" },
    { href: "#notifications", icon: Bell, color: "#f59e0b", title: "Notifications", description: "Desktop, email, push, and sound settings" },
    { href: "#backup", icon: HardDrive, color: "#10b981", title: "Backup", description: "Automatic backup configuration and restore" },
    { href: "#advanced", icon: Zap, color: "#ec4899", title: "Advanced", description: "God mode, debug mode, experimental features" },
];

export default function SettingsPage() {
    const [toggles, setToggles] = useState({
        darkMode: true,
        sounds: true,
        desktop: false,
        autosave: true,
    });

    const toggle = (key: keyof typeof toggles) => {
        setToggles((p) => ({ ...p, [key]: !p[key] }));
    };

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
                    <Settings size={18} style={{ color: "var(--accent-indigo)" }} />
                </div>
                <div>
                    <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Settings</h1>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Configure your experience</p>
                </div>
            </div>

            <div className="space-y-2 stagger-children">
                {settingsSections.map((section) => {
                    const Icon = section.icon;
                    return (
                        <Link key={section.title} href={section.href}
                            className="liquid-glass liquid-glass-hover flex items-center gap-4 p-4 transition-all group block"
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative z-10"
                                style={{ background: `${section.color}12`, color: section.color }}
                            >
                                <Icon size={20} strokeWidth={1.8} />
                            </div>
                            <div className="flex-1 min-w-0 relative z-10">
                                <h3 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{section.title}</h3>
                                <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{section.description}</p>
                            </div>
                            <ChevronRight size={16} className="shrink-0 group-hover:translate-x-0.5 transition-transform relative z-10"
                                style={{ color: "var(--text-ghost)" }} />
                        </Link>
                    );
                })}
            </div>

            {/* Quick toggles */}
            <div className="liquid-glass p-5 mt-6">
                <h3 className="text-sm font-semibold mb-4 relative z-10" style={{ color: "var(--text-primary)" }}>Quick Settings</h3>
                <div className="space-y-3.5 relative z-10">
                    {[
                        { key: "darkMode" as const, label: "Dark Mode", icon: Moon },
                        { key: "sounds" as const, label: "Sound Effects", icon: Volume2 },
                        { key: "desktop" as const, label: "Desktop Notifications", icon: Bell },
                        { key: "autosave" as const, label: "Auto-save Conversations", icon: Save },
                    ].map((item) => {
                        const Icon = item.icon;
                        return (
                            <div key={item.key} className="flex items-center justify-between">
                                <span className="text-[13px] flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                                    <Icon size={14} style={{ color: "var(--text-muted)" }} /> {item.label}
                                </span>
                                <div className="toggle-switch" data-on={toggles[item.key].toString()} onClick={() => toggle(item.key)}>
                                    <div className="toggle-knob" style={{ left: toggles[item.key] ? "20px" : "2px" }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="text-center mt-8">
                <p className="text-[11px] font-medium" style={{ color: "var(--text-ghost)" }}>
                    Delirium Infinite v1.0.0
                </p>
            </div>
        </div>
    );
}
