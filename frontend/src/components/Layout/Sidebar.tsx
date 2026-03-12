"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "@/lib/api";
import {
  MessageCircle,
  Wrench,
  Brain,
  LayoutDashboard,
  Puzzle,
  Link2,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Plus,
  Hash,
  Trash2,
  Zap,
  Code2,
  Monitor,
} from "lucide-react";

const navItems = [
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/code", label: "Code", icon: Code2 },
  { href: "/preview", label: "Preview", icon: Monitor },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plugins", label: "Plugins", icon: Puzzle },
  { href: "/integrations", label: "Integrations", icon: Link2 },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface ConversationItem {
  id: string;
  title: string;
  updated_at: number;
  message_count: number;
}

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const isChat = pathname === "/chat" || pathname?.startsWith("/chat/");

  const fetchConversations = useCallback(() => {
    fetch(`${API_BASE}/api/chat/conversations`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setConversations(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchConversations();
    const handler = () => fetchConversations();
    window.addEventListener("delirium-conversation-update", handler);
    return () =>
      window.removeEventListener("delirium-conversation-update", handler);
  }, [fetchConversations]);

  const deleteConversation = (id: string) => {
    fetch(`${API_BASE}/api/chat/conversations/${id}`, { method: "DELETE" })
      .then(() => {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        window.dispatchEvent(
          new CustomEvent("delirium-conversation-deleted", { detail: { id } }),
        );
      })
      .catch(() => {});
  };

  return (
    <aside
      className={`hidden md:flex flex-col transition-all duration-300 ease-in-out relative z-10 ${
        collapsed ? "w-[68px]" : "w-[260px]"
      }`}
      style={{
        background: "var(--glass-bg-solid)",
        borderRight: "1px solid var(--glass-border)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-between px-4 h-[60px] shrink-0"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 animate-pulse-glow relative"
            style={{ background: "var(--accent-gradient)" }}
          >
            <Sparkles size={18} color="white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="animate-fade-in overflow-hidden">
              <h1 className="text-[13px] font-bold tracking-wide gradient-text leading-tight">
                DELIRIUM
              </h1>
              <p
                className="text-[9px] font-medium tracking-[0.2em]"
                style={{ color: "var(--text-muted)" }}
              >
                INFINITE
              </p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/[0.04]"
            style={{ color: "var(--text-ghost)" }}
          >
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {/* New Chat button */}
      {!collapsed && (
        <div className="px-4 pt-3 pb-1">
          <Link
            href="/chat"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all w-full btn-primary justify-center"
          >
            <Plus size={14} strokeWidth={2.5} /> New Chat
          </Link>
        </div>
      )}
      {collapsed && (
        <div className="px-3 pt-3 pb-1">
          <Link
            href="/chat"
            className="w-full flex items-center justify-center p-2.5 rounded-xl transition-all"
            style={{ background: "var(--accent-gradient)" }}
            title="New Chat"
          >
            <Plus size={16} color="white" strokeWidth={2.5} />
          </Link>
        </div>
      )}

      {/* Recent conversations (only when on chat and expanded) */}
      {!collapsed && isChat && conversations.length > 0 && (
        <div className="px-4 pt-2 pb-1 animate-fade-in">
          <p
            className="text-[10px] uppercase tracking-widest font-semibold px-1 mb-1.5"
            style={{ color: "var(--text-ghost)" }}
          >
            Recent
          </p>
          <div className="space-y-0.5">
            {conversations.slice(0, 8).map((conv) => (
              <Link
                key={conv.id}
                href={`/chat?id=${conv.id}`}
                className="conversation-item group"
              >
                <Hash
                  size={12}
                  style={{ color: "var(--text-ghost)" }}
                  className="shrink-0"
                />
                <span
                  className="flex-1 text-[12px] truncate"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {conv.title}
                </span>
                <span
                  className="text-[10px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-ghost)" }}
                >
                  {timeAgo(conv.updated_at)}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/[0.05]"
                  style={{ color: "var(--text-ghost)" }}
                >
                  <Trash2 size={12} />
                </button>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      {!collapsed && isChat && (
        <div
          className="mx-5 my-1"
          style={{ borderBottom: "1px solid var(--glass-border)" }}
        />
      )}

      {/* Navigation */}
      <nav className="flex-1 py-2 px-3 overflow-y-auto space-y-0.5">
        {!collapsed && (
          <p
            className="text-[10px] uppercase tracking-widest font-semibold px-2 mb-1 mt-1"
            style={{ color: "var(--text-ghost)" }}
          >
            Navigation
          </p>
        )}
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[12.5px] font-medium transition-all duration-200 relative group ${
                collapsed ? "justify-center" : ""
              }`}
              style={{
                background: isActive
                  ? "rgba(99, 102, 241, 0.1)"
                  : "transparent",
                color: isActive
                  ? "var(--accent-indigo)"
                  : "var(--text-secondary)",
              }}
            >
              {isActive && (
                <div
                  className="absolute -left-3 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
                  style={{ background: "var(--accent-gradient)" }}
                />
              )}
              <Icon
                size={17}
                strokeWidth={isActive ? 2.2 : 1.8}
                className="shrink-0 transition-colors"
                style={{
                  filter: isActive
                    ? "drop-shadow(0 0 6px rgba(99,102,241,0.4))"
                    : "none",
                }}
              />
              {!collapsed && <span className="flex-1">{item.label}</span>}

              {!isActive && (
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                />
              )}

              {collapsed && (
                <div
                  className="absolute left-full ml-2 px-2.5 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50"
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--glass-border)",
                    boxShadow: "var(--glass-shadow)",
                  }}
                >
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div
        className="px-4 py-3 space-y-2"
        style={{ borderTop: "1px solid var(--glass-border)" }}
      >
        {/* Agent status */}
        <div
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${collapsed ? "justify-center px-2" : ""}`}
          style={{ background: "rgba(16,185,129,0.04)" }}
        >
          <div className="relative">
            <div className="status-dot status-online" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p
                className="text-[11px] font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                Agent Online
              </p>
              <p className="text-[9px]" style={{ color: "var(--text-ghost)" }}>
                <Zap
                  size={8}
                  className="inline mr-0.5"
                  style={{ color: "var(--success)" }}
                />
                {conversations.length} conversations
              </p>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full flex items-center justify-center p-2 rounded-xl transition-all hover:bg-white/[0.03]"
            style={{ color: "var(--text-muted)" }}
          >
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </aside>
  );
}
