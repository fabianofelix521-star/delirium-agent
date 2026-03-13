"use client";

import { useState, useEffect, useMemo } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import {
  Radio,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  MessageCircle,
  Users,
  Code2,
  Bell,
  Globe,
} from "lucide-react";

/* ─── Types ──────────────────────────────────── */
interface ChannelField {
  key: string;
  label: string;
  type: string;
}

interface Channel {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  status: string;
  docs: string;
  fields: ChannelField[];
  connected: boolean;
}

/* ─── Category Icons ─────────────────────────── */
const CAT_ICONS: Record<string, typeof MessageCircle> = {
  messaging: MessageCircle,
  social: Globe,
  enterprise: Users,
  developer: Code2,
  notifications: Bell,
};

const CAT_LABELS: Record<string, string> = {
  messaging: "Messaging",
  social: "Social",
  enterprise: "Enterprise",
  developer: "Developer",
  notifications: "Notifications",
};

/* ─── Channels Page ──────────────────────────── */
export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/channels`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => setChannels(data.channels || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(channels.map((c) => c.category));
    return ["all", ...Array.from(cats)];
  }, [channels]);

  const filtered = useMemo(() => {
    let list = channels;
    if (activeCategory !== "all")
      list = list.filter((c) => c.category === activeCategory);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [channels, activeCategory, search]);

  const connectedCount = channels.filter((c) => c.connected).length;

  const handleConnect = async (ch: Channel) => {
    setConnecting(ch.id);
    try {
      const res = await fetch(`${API_BASE}/api/channels/${ch.id}/connect`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ config: configValues }),
      });
      if (res.ok) {
        setChannels((prev) =>
          prev.map((c) => (c.id === ch.id ? { ...c, connected: true } : c)),
        );
        setExpandedId(null);
        setConfigValues({});
      }
    } catch {
      /* */
    }
    setConnecting(null);
  };

  const handleDisconnect = async (id: string) => {
    await fetch(`${API_BASE}/api/channels/${id}/disconnect`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, connected: false } : c)),
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-cyan)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <Radio className="w-8 h-8 text-[var(--accent-cyan)]" />
          Channels
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          {channels.length} channels available · {connectedCount} connected
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-ghost)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search channels..."
            className="w-full pl-10 pr-4 py-2.5 liquid-glass rounded-xl text-[var(--text-primary)] text-sm placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-[rgba(6,182,212,0.3)]"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => {
            const Icon = cat === "all" ? Zap : CAT_ICONS[cat] || Zap;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? "bg-[rgba(6,182,212,0.15)] text-[var(--accent-cyan)] border border-[rgba(6,182,212,0.2)]"
                    : "bg-[var(--glass-bg)] text-[var(--text-muted)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat === "all" ? "All" : CAT_LABELS[cat] || cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Channel Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((ch) => {
          const isExpanded = expandedId === ch.id;
          return (
            <div
              key={ch.id}
              className="liquid-glass liquid-glass-hover rounded-2xl p-4 backdrop-blur-xl hover:border-[var(--glass-border-hover)] transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ch.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      {ch.name}
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--glass-bg)] text-[var(--text-ghost)] uppercase tracking-wider">
                      {ch.category}
                    </span>
                  </div>
                </div>
                {ch.connected ? (
                  <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                ) : (
                  <XCircle className="w-5 h-5 text-[var(--text-ghost)]" />
                )}
              </div>

              <p className="text-xs text-[var(--text-ghost)] mb-3 line-clamp-2">
                {ch.description}
              </p>

              {ch.connected ? (
                <div className="flex gap-2">
                  <span className="flex-1 text-center text-xs py-1.5 rounded-lg bg-[rgba(16,185,129,0.1)] text-[var(--success)] border border-[rgba(16,185,129,0.15)]">
                    Connected
                  </span>
                  <button
                    onClick={() => handleDisconnect(ch.id)}
                    className="px-3 py-1.5 rounded-lg text-xs text-[var(--error)] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.15)] hover:bg-[rgba(239,68,68,0.15)]"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setExpandedId(isExpanded ? null : ch.id);
                    setConfigValues({});
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-[var(--accent-cyan)] bg-[rgba(6,182,212,0.1)] border border-[rgba(6,182,212,0.15)] hover:bg-[rgba(6,182,212,0.15)] transition-all"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  {isExpanded ? "Cancel" : "Connect"}
                </button>
              )}

              {/* Config Form */}
              {isExpanded && !ch.connected && (
                <div className="mt-3 pt-3 border-t border-[var(--glass-border)] space-y-2">
                  {ch.fields.map((f) => (
                    <div key={f.key}>
                      <label className="text-[10px] text-[var(--text-ghost)] uppercase tracking-wider">
                        {f.label}
                      </label>
                      <input
                        type={f.type === "password" ? "password" : "text"}
                        value={configValues[f.key] || ""}
                        onChange={(e) =>
                          setConfigValues({
                            ...configValues,
                            [f.key]: e.target.value,
                          })
                        }
                        className="w-full mt-0.5 px-2.5 py-1.5 liquid-glass rounded-lg text-xs text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-[rgba(6,182,212,0.3)]"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => handleConnect(ch)}
                    disabled={connecting === ch.id}
                    className="w-full mt-2 py-2 rounded-lg text-xs font-medium bg-[rgba(6,182,212,0.15)] text-[var(--accent-cyan)] border border-[rgba(6,182,212,0.2)] hover:bg-[rgba(6,182,212,0.2)] disabled:opacity-50 transition-all"
                  >
                    {connecting === ch.id ? (
                      <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                    ) : (
                      "Save & Connect"
                    )}
                  </button>
                  {ch.docs && (
                    <a
                      href={ch.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center text-[10px] text-[var(--text-ghost)] hover:text-[var(--accent-cyan)]"
                    >
                      View Documentation →
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-[var(--text-ghost)]">
          <Radio className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No channels match your search</p>
        </div>
      )}
    </div>
  );
}
