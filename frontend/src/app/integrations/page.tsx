"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  Store,
  Download,
  Trash2,
  Search,
  Star,
  Package,
  Settings2,
  X,
  Check,
  Sparkles,
  Zap,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────── */

interface Integration {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: string;
  config: Record<string, string>;
}

interface McpItem {
  id: string;
  name: string;
  description: string;
  author: string;
  category: string;
  icon: string;
  stars: number;
  command: string;
  args: string[];
  env: Record<string, string>;
  featured: boolean;
  installed: boolean;
  config?: Record<string, string>;
}

/* ─── Static Maps ────────────────────────────────── */

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

const intCategoryMap: Record<string, string> = {
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

const categoryColors: Record<string, string> = {
  system: "#6366f1",
  developer: "#8b5cf6",
  database: "#06b6d4",
  search: "#f59e0b",
  browser: "#ec4899",
  communication: "#3b82f6",
  productivity: "#10b981",
  finance: "#f97316",
  reasoning: "#a855f7",
  design: "#ec4899",
};

/* ─── Main Component ─────────────────────────────── */

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<"integrations" | "store">(
    "integrations",
  );

  // Integrations state
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [intCategory, setIntCategory] = useState("all");
  const [connecting, setConnecting] = useState<string | null>(null);
  const intCategories = ["all", "communication", "productivity", "finance"];

  // MCP Store state
  const [mcpCatalog, setMcpCatalog] = useState<McpItem[]>([]);
  const [mcpCategories, setMcpCategories] = useState<string[]>([]);
  const [mcpLoading, setMcpLoading] = useState(false);
  const [mcpSearch, setMcpSearch] = useState("");
  const [mcpCategory, setMcpCategory] = useState("all");
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [uninstallingId, setUninstallingId] = useState<string | null>(null);
  const [configFormId, setConfigFormId] = useState<string | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});

  /* ─── Data Fetching ──────────────────────────── */

  useEffect(() => {
    fetch(`${API_BASE}/api/integrations/`)
      .then((r) => r.json())
      .then((data) => setIntegrations(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === "store") {
      setMcpLoading(true);
      Promise.all([
        fetch(`${API_BASE}/api/mcp/catalog`).then((r) => r.json()),
        fetch(`${API_BASE}/api/mcp/categories`).then((r) => r.json()),
      ])
        .then(([catalog, cats]) => {
          setMcpCatalog(catalog);
          // categories may come as [{id,name,count}] or string[]
          const catList = Array.isArray(cats)
            ? cats.map((c: string | { id: string }) =>
                typeof c === "string" ? c : c.id,
              )
            : [];
          setMcpCategories(catList);
        })
        .catch(() => {})
        .finally(() => setMcpLoading(false));
    }
  }, [activeTab]);

  /* ─── Integration Actions ────────────────────── */

  const toggleConnection = useCallback(
    async (id: string) => {
      const int = integrations.find((i) => i.id === id);
      if (!int) return;
      const action = int.status === "connected" ? "disconnect" : "connect";
      setConnecting(id);
      try {
        const res = await fetch(
          `${API_BASE}/api/integrations/${id}/${action}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config: {} }),
          },
        );
        if (res.ok) {
          const data = await res.json();
          setIntegrations((prev) =>
            prev.map((i) => (i.id === id ? { ...i, status: data.status } : i)),
          );
        }
      } catch {
        /* silent */
      }
      setConnecting(null);
    },
    [integrations],
  );

  /* ─── MCP Actions ────────────────────────────── */

  const installMcp = useCallback(
    async (mcp: McpItem) => {
      const envKeys = Object.keys(mcp.env || {});
      if (envKeys.length > 0 && configFormId !== mcp.id) {
        setConfigFormId(mcp.id);
        setConfigValues(mcp.config || {});
        return;
      }
      setInstallingId(mcp.id);
      try {
        const res = await fetch(`${API_BASE}/api/mcp/${mcp.id}/install`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ env: configValues }),
        });
        if (res.ok) {
          setMcpCatalog((prev) =>
            prev.map((m) =>
              m.id === mcp.id
                ? { ...m, installed: true, config: { ...configValues } }
                : m,
            ),
          );
          setConfigFormId(null);
          setConfigValues({});
        }
      } catch {
        /* silent */
      }
      setInstallingId(null);
    },
    [configFormId, configValues],
  );

  const uninstallMcp = useCallback(async (id: string) => {
    setUninstallingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/mcp/${id}/uninstall`, {
        method: "POST",
      });
      if (res.ok) {
        setMcpCatalog((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, installed: false, config: undefined } : m,
          ),
        );
      }
    } catch {
      /* silent */
    }
    setUninstallingId(null);
  }, []);

  const configureMcp = useCallback(
    async (id: string) => {
      setInstallingId(id);
      try {
        const res = await fetch(`${API_BASE}/api/mcp/${id}/configure`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ env: configValues }),
        });
        if (res.ok) {
          setMcpCatalog((prev) =>
            prev.map((m) =>
              m.id === id ? { ...m, config: { ...configValues } } : m,
            ),
          );
          setConfigFormId(null);
          setConfigValues({});
        }
      } catch {
        /* silent */
      }
      setInstallingId(null);
    },
    [configValues],
  );

  /* ─── Filtered Data ──────────────────────────── */

  const filteredIntegrations = integrations.filter(
    (i) => intCategory === "all" || intCategoryMap[i.id] === intCategory,
  );

  const featuredMcps = useMemo(
    () => mcpCatalog.filter((m) => m.featured),
    [mcpCatalog],
  );

  const filteredMcps = useMemo(() => {
    const q = mcpSearch.toLowerCase();
    return mcpCatalog.filter((m) => {
      const matchCategory = mcpCategory === "all" || m.category === mcpCategory;
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [mcpCatalog, mcpSearch, mcpCategory]);

  const installedMcpCount = mcpCatalog.filter((m) => m.installed).length;

  /* ─── Render ─────────────────────────────────── */

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(6,182,212,0.1)" }}
        >
          <Link2 size={18} style={{ color: "var(--accent-cyan)" }} />
        </div>
        <div className="flex-1">
          <h1
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Integrations
          </h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Connect services &amp; install MCP servers
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 liquid-glass p-1 w-fit rounded-xl">
        <button
          onClick={() => setActiveTab("integrations")}
          className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all"
          style={{
            background:
              activeTab === "integrations"
                ? "rgba(99,102,241,0.15)"
                : "transparent",
            color:
              activeTab === "integrations"
                ? "var(--accent-indigo)"
                : "var(--text-muted)",
          }}
        >
          <Link2 size={14} />
          My Integrations
        </button>
        <button
          onClick={() => setActiveTab("store")}
          className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all"
          style={{
            background:
              activeTab === "store" ? "rgba(99,102,241,0.15)" : "transparent",
            color:
              activeTab === "store"
                ? "var(--accent-indigo)"
                : "var(--text-muted)",
          }}
        >
          <Store size={14} />
          MCP Store
          {installedMcpCount > 0 && (
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                background: "rgba(16,185,129,0.15)",
                color: "var(--success)",
              }}
            >
              {installedMcpCount}
            </span>
          )}
        </button>
      </div>

      {/* ════════════ MY INTEGRATIONS TAB ════════════ */}
      {activeTab === "integrations" && (
        <div className="animate-fade-in">
          {/* Browse Store CTA */}
          <button
            onClick={() => setActiveTab("store")}
            className="liquid-glass liquid-glass-hover w-full p-4 mb-6 flex items-center gap-3 text-left transition-all"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(99,102,241,0.1)" }}
            >
              <Sparkles size={20} style={{ color: "var(--accent-indigo)" }} />
            </div>
            <div className="flex-1 relative z-10">
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Browse MCP Marketplace
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Discover &amp; install MCP servers to extend your agent
                capabilities
              </p>
            </div>
            <Zap size={16} style={{ color: "var(--accent-violet)" }} />
          </button>

          {/* Category Filter */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {intCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setIntCategory(cat)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all"
                style={{
                  background:
                    intCategory === cat
                      ? "rgba(99,102,241,0.1)"
                      : "var(--bg-elevated)",
                  color:
                    intCategory === cat
                      ? "var(--accent-indigo)"
                      : "var(--text-muted)",
                  border: `1px solid ${intCategory === cat ? "rgba(99,102,241,0.2)" : "var(--glass-border)"}`,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Integration Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
            {filteredIntegrations.length === 0 ? (
              <div className="col-span-full liquid-glass p-12 text-center">
                <Package
                  size={32}
                  className="mx-auto mb-3"
                  style={{ color: "var(--text-ghost)" }}
                />
                <p
                  className="text-sm font-medium mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  No integrations connected
                </p>
                <p
                  className="text-xs mb-4"
                  style={{ color: "var(--text-muted)" }}
                >
                  Connect services or browse the MCP Store
                </p>
                <button
                  onClick={() => setActiveTab("store")}
                  className="btn-primary text-xs px-4 py-2 rounded-lg font-semibold inline-flex items-center gap-2"
                >
                  <Store size={14} />
                  Browse MCP Store
                </button>
              </div>
            ) : (
              filteredIntegrations.map((int) => {
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
                              className="status-dot"
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
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
                          {connecting === int.id && (
                            <Loader2 size={12} className="animate-spin" />
                          )}
                          {int.status === "connected"
                            ? "Disconnect"
                            : "Connect"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ════════════ MCP STORE TAB ════════════ */}
      {activeTab === "store" && (
        <div className="animate-fade-in">
          {/* Store Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
            <div className="flex items-center gap-2 flex-1">
              <Store size={18} style={{ color: "var(--accent-violet)" }} />
              <h2
                className="text-base font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                MCP Marketplace
              </h2>
            </div>

            {/* Search */}
            <div
              className="liquid-glass flex items-center gap-2 px-3 py-2 rounded-xl w-full sm:w-72"
              style={{ border: "1px solid var(--glass-border)" }}
            >
              <Search size={14} style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search MCPs..."
                value={mcpSearch}
                onChange={(e) => setMcpSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-xs flex-1"
                style={{ color: "var(--text-primary)" }}
              />
              {mcpSearch && (
                <button
                  onClick={() => setMcpSearch("")}
                  aria-label="Clear search"
                >
                  <X size={12} style={{ color: "var(--text-muted)" }} />
                </button>
              )}
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setMcpCategory("all")}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
              style={{
                background:
                  mcpCategory === "all"
                    ? "rgba(99,102,241,0.1)"
                    : "var(--bg-elevated)",
                color:
                  mcpCategory === "all"
                    ? "var(--accent-indigo)"
                    : "var(--text-muted)",
                border: `1px solid ${mcpCategory === "all" ? "rgba(99,102,241,0.2)" : "var(--glass-border)"}`,
              }}
            >
              All
            </button>
            {mcpCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setMcpCategory(cat)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all"
                style={{
                  background:
                    mcpCategory === cat
                      ? "rgba(99,102,241,0.1)"
                      : "var(--bg-elevated)",
                  color:
                    mcpCategory === cat
                      ? "var(--accent-indigo)"
                      : "var(--text-muted)",
                  border: `1px solid ${mcpCategory === cat ? "rgba(99,102,241,0.2)" : "var(--glass-border)"}`,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {mcpLoading ? (
            <div className="liquid-glass p-12 text-center">
              <Loader2
                size={24}
                className="animate-spin mx-auto mb-2"
                style={{ color: "var(--accent-indigo)" }}
              />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Loading marketplace...
              </p>
            </div>
          ) : (
            <>
              {/* Featured Section */}
              {mcpCategory === "all" &&
                !mcpSearch &&
                featuredMcps.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles
                        size={14}
                        style={{ color: "var(--accent-violet)" }}
                      />
                      <h3
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Featured
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {featuredMcps.map((mcp) => (
                        <McpCard
                          key={mcp.id}
                          mcp={mcp}
                          featured
                          installingId={installingId}
                          uninstallingId={uninstallingId}
                          configFormId={configFormId}
                          configValues={configValues}
                          onInstall={installMcp}
                          onUninstall={uninstallMcp}
                          onConfigure={configureMcp}
                          onOpenConfig={(id, cfg) => {
                            setConfigFormId(id);
                            setConfigValues(cfg || {});
                          }}
                          onCloseConfig={() => {
                            setConfigFormId(null);
                            setConfigValues({});
                          }}
                          onConfigChange={(key, val) =>
                            setConfigValues((prev) => ({ ...prev, [key]: val }))
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

              {/* All MCPs */}
              <div className="mb-2 flex items-center gap-2">
                <Package size={14} style={{ color: "var(--text-muted)" }} />
                <h3
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  {mcpCategory === "all" ? "All Servers" : mcpCategory}
                  <span className="ml-2 font-normal normal-case">
                    ({filteredMcps.length})
                  </span>
                </h3>
              </div>

              {filteredMcps.length === 0 ? (
                <div className="liquid-glass p-12 text-center">
                  <Search
                    size={32}
                    className="mx-auto mb-3"
                    style={{ color: "var(--text-ghost)" }}
                  />
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    No MCPs found
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Try a different search or category
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
                  {filteredMcps.map((mcp) => (
                    <McpCard
                      key={mcp.id}
                      mcp={mcp}
                      installingId={installingId}
                      uninstallingId={uninstallingId}
                      configFormId={configFormId}
                      configValues={configValues}
                      onInstall={installMcp}
                      onUninstall={uninstallMcp}
                      onConfigure={configureMcp}
                      onOpenConfig={(id, cfg) => {
                        setConfigFormId(id);
                        setConfigValues(cfg || {});
                      }}
                      onCloseConfig={() => {
                        setConfigFormId(null);
                        setConfigValues({});
                      }}
                      onConfigChange={(key, val) =>
                        setConfigValues((prev) => ({ ...prev, [key]: val }))
                      }
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MCP Card Component
   ═══════════════════════════════════════════════════════════ */

interface McpCardProps {
  mcp: McpItem;
  featured?: boolean;
  installingId: string | null;
  uninstallingId: string | null;
  configFormId: string | null;
  configValues: Record<string, string>;
  onInstall: (mcp: McpItem) => void;
  onUninstall: (id: string) => void;
  onConfigure: (id: string) => void;
  onOpenConfig: (id: string, cfg?: Record<string, string>) => void;
  onCloseConfig: () => void;
  onConfigChange: (key: string, val: string) => void;
}

function McpCard({
  mcp,
  featured,
  installingId,
  uninstallingId,
  configFormId,
  configValues,
  onInstall,
  onUninstall,
  onConfigure,
  onOpenConfig,
  onCloseConfig,
  onConfigChange,
}: McpCardProps) {
  const isInstalling = installingId === mcp.id;
  const isUninstalling = uninstallingId === mcp.id;
  const isConfigOpen = configFormId === mcp.id;
  const catColor = categoryColors[mcp.category] || "#6366f1";
  const envKeys = Object.keys(mcp.env || {});

  return (
    <div
      className={`liquid-glass liquid-glass-hover p-4 transition-all ${featured ? "liquid-glass-accent" : ""}`}
      style={featured ? { borderColor: "rgba(139,92,246,0.2)" } : undefined}
    >
      <div className="relative z-10">
        {/* Top row: icon + meta */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ background: `${catColor}15` }}
          >
            {mcp.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className="text-[13px] font-semibold truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {mcp.name}
              </h3>
              {mcp.featured && (
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0"
                  style={{
                    background: "rgba(139,92,246,0.15)",
                    color: "var(--accent-violet)",
                  }}
                >
                  Featured
                </span>
              )}
              {mcp.installed && (
                <Check
                  size={14}
                  className="shrink-0"
                  style={{ color: "var(--success)" }}
                />
              )}
            </div>
            <p
              className="text-[10px] mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              {mcp.author}
            </p>
          </div>
          <div
            className="flex items-center gap-1 shrink-0"
            title={`${mcp.stars} stars`}
          >
            <Star size={11} style={{ color: "#f59e0b", fill: "#f59e0b" }} />
            <span
              className="text-[10px] font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {mcp.stars}
            </span>
          </div>
        </div>

        {/* Description */}
        <p
          className="text-xs mb-3 line-clamp-2"
          style={{ color: "var(--text-secondary)" }}
        >
          {mcp.description}
        </p>

        {/* Category tag */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
            style={{ background: `${catColor}15`, color: catColor }}
          >
            {mcp.category}
          </span>
        </div>

        {/* Config Form (inline) */}
        {isConfigOpen && envKeys.length > 0 && (
          <div
            className="mb-3 p-3 rounded-xl"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <p
                className="text-[11px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Configuration
              </p>
              <button onClick={onCloseConfig} aria-label="Close config">
                <X size={12} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
            <div className="space-y-2">
              {envKeys.map((key) => (
                <div key={key}>
                  <label
                    className="text-[10px] font-medium block mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {key}
                  </label>
                  <input
                    type={
                      key.toLowerCase().includes("key") ||
                      key.toLowerCase().includes("secret")
                        ? "password"
                        : "text"
                    }
                    placeholder={mcp.env[key] || key}
                    value={configValues[key] || ""}
                    onChange={(e) => onConfigChange(key, e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-transparent outline-none"
                    style={{
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() =>
                mcp.installed ? onConfigure(mcp.id) : onInstall(mcp)
              }
              disabled={isInstalling}
              className="btn-primary text-xs font-semibold px-3 py-1.5 rounded-lg mt-3 w-full flex items-center justify-center gap-1.5"
            >
              {isInstalling ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Check size={12} />
              )}
              {mcp.installed ? "Save Config" : "Install"}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {mcp.installed ? (
            <>
              {envKeys.length > 0 && (
                <button
                  onClick={() => onOpenConfig(mcp.id, mcp.config)}
                  className="btn-ghost text-[11px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                >
                  <Settings2 size={12} />
                  Configure
                </button>
              )}
              <button
                onClick={() => onUninstall(mcp.id)}
                disabled={isUninstalling}
                className="btn-ghost text-[11px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                style={{
                  color: "var(--error)",
                  borderColor: "rgba(239,68,68,0.2)",
                }}
              >
                {isUninstalling ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}
                Uninstall
              </button>
            </>
          ) : (
            <button
              onClick={() => onInstall(mcp)}
              disabled={isInstalling}
              className="btn-primary text-[11px] font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5"
            >
              {isInstalling ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Download size={12} />
              )}
              Install
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
