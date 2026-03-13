"use client";

import { useState, useEffect } from "react";
import {
  Github,
  Rocket,
  Terminal,
  FolderOpen,
  Plus,
  Check,
  X,
  Loader2,
  ExternalLink,
  Cpu,
  Sparkles,
  Code2,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

import { API_BASE, getAuthHeaders } from "@/lib/api";

interface CopilotStatus {
  provider: {
    name: string;
    status: string;
    models: {
      id: string;
      name: string;
      context: number;
      description: string;
    }[];
    env_var: string;
    base_url: string;
  };
  cli: {
    installed: boolean;
    authenticated: boolean;
    user: string | null;
    gh_path?: string;
  };
  token_configured: boolean;
  features: string[];
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  stack: string[];
  command: string;
}

interface WorkspaceApp {
  name: string;
  dir: string;
  path: string;
  framework: string;
  has_git: boolean;
}

interface GhStatus {
  installed: boolean;
  authenticated: boolean;
  user: string | null;
  recent_repos: {
    name: string;
    url: string;
    isPrivate: boolean;
    updatedAt: string;
  }[];
}

/* -- Reusable glass panel styles -- */
const glassCard: React.CSSProperties = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(var(--glass-blur))",
  WebkitBackdropFilter: "blur(var(--glass-blur))",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--glass-shadow)",
  position: "relative",
  overflow: "hidden",
};

const glassSolid: React.CSSProperties = {
  background: "var(--glass-bg-solid)",
  backdropFilter: "blur(32px)",
  WebkitBackdropFilter: "blur(32px)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius-xl)",
  boxShadow: "var(--glass-shadow-lg)",
  position: "relative",
  overflow: "hidden",
};

const shineOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 50%)",
  borderRadius: "inherit",
  pointerEvents: "none",
  zIndex: 1,
};

function GlassHover(
  e: React.MouseEvent<HTMLDivElement | HTMLButtonElement>,
  enter: boolean,
) {
  const t = e.currentTarget;
  if (enter) {
    t.style.borderColor = "var(--glass-border-hover)";
    t.style.boxShadow = "var(--glass-shadow-lg), var(--accent-glow)";
    t.style.transform = "translateY(-2px)";
  } else {
    t.style.borderColor = "var(--glass-border)";
    t.style.boxShadow = "var(--glass-shadow)";
    t.style.transform = "translateY(0)";
  }
}

export default function CopilotPage() {
  const [status, setStatus] = useState<CopilotStatus | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [workspace, setWorkspace] = useState<{
    workspace: string;
    apps: WorkspaceApp[];
    count: number;
  } | null>(null);
  const [ghStatus, setGhStatus] = useState<GhStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Create App modal
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [appName, setAppName] = useState("");
  const [appDesc, setAppDesc] = useState("");
  const [createGhRepo, setCreateGhRepo] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<Record<
    string,
    unknown
  > | null>(null);

  // Command suggest
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestPrompt, setSuggestPrompt] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [statusRes, templatesRes, workspaceRes, ghRes] = await Promise.all([
        fetch(`${API_BASE}/api/copilot`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/copilot/templates`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/api/copilot/workspace`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/api/copilot/gh-status`, {
          headers: getAuthHeaders(),
        }),
      ]);
      if (statusRes.ok) setStatus(await statusRes.json());
      if (templatesRes.ok) setTemplates(await templatesRes.json());
      if (workspaceRes.ok) setWorkspace(await workspaceRes.json());
      if (ghRes.ok) setGhStatus(await ghRes.json());
    } catch (e) {
      console.error("Failed to load copilot data:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateApp() {
    if (!selectedTemplate || !appName.trim()) return;
    setCreating(true);
    setCreateResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/copilot/create-app`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          template_id: selectedTemplate,
          app_name: appName.trim(),
          github_repo: createGhRepo,
          description: appDesc.trim(),
        }),
      });
      const data = await res.json();
      setCreateResult(data);
      if (data.success) {
        // Reload workspace
        const wsRes = await fetch(`${API_BASE}/api/copilot/workspace`, {
          headers: getAuthHeaders(),
        });
        if (wsRes.ok) setWorkspace(await wsRes.json());
      }
    } catch (e) {
      setCreateResult({ error: String(e) });
    } finally {
      setCreating(false);
    }
  }

  async function handleSuggest() {
    if (!suggestPrompt.trim()) return;
    setSuggesting(true);
    setSuggestion("");
    try {
      const res = await fetch(`${API_BASE}/api/copilot/suggest-command`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ prompt: suggestPrompt }),
      });
      const data = await res.json();
      setSuggestion(data.suggestion || data.error || "No suggestion");
    } catch (e) {
      setSuggestion(String(e));
    } finally {
      setSuggesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "var(--accent-violet)" }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 flex items-center justify-center"
            style={{
              ...glassCard,
              borderRadius: "var(--radius-md)",
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))",
              boxShadow: "var(--accent-glow)",
            }}
          >
            <div style={shineOverlay} />
            <Github
              className="w-6 h-6"
              style={{
                color: "var(--accent-violet)",
                position: "relative",
                zIndex: 2,
              }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">GitHub Copilot</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              LLM Provider + App Builder + CLI Integration
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSuggest(true)}
            className="flex items-center gap-2 px-4 py-2 transition-all duration-300"
            style={{
              ...glassCard,
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--glass-border-hover)";
              e.currentTarget.style.boxShadow = "var(--glass-shadow-lg)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--glass-border)";
              e.currentTarget.style.boxShadow = "var(--glass-shadow)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Terminal className="w-4 h-4" />
            Command Suggest
          </button>
          <button
            onClick={() => {
              setShowCreate(true);
              setCreateResult(null);
            }}
            className="flex items-center gap-2 px-4 py-2 transition-all duration-300"
            style={{
              ...glassCard,
              borderRadius: "var(--radius-md)",
              borderColor: "rgba(99,102,241,0.25)",
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))",
              color: "var(--accent-violet)",
              boxShadow: "var(--accent-glow)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "var(--accent-glow-strong)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "var(--accent-glow)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Plus className="w-4 h-4" />
            Create App
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Provider Status */}
        <div
          className="p-5 transition-all duration-300"
          style={glassCard}
          onMouseEnter={(e) => GlassHover(e, true)}
          onMouseLeave={(e) => GlassHover(e, false)}
        >
          <div style={shineOverlay} />
          <div className="relative z-2">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4" style={{ color: "var(--info)" }} />
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                LLM Provider
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: status?.token_configured
                    ? "var(--success)"
                    : "var(--error)",
                  boxShadow: status?.token_configured
                    ? "0 0 8px rgba(16,185,129,0.4)"
                    : "0 0 8px rgba(239,68,68,0.4)",
                }}
              />
              <span
                className="text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                {status?.token_configured ? "Configured" : "Not Configured"}
              </span>
            </div>
            <p className="text-xs mb-3" style={{ color: "var(--text-ghost)" }}>
              {status?.provider.env_var}: GITHUB_TOKEN
            </p>
            <div className="space-y-1.5">
              {status?.provider.models.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span style={{ color: "var(--text-secondary)" }}>
                    {m.name}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px]"
                    style={{
                      background: "rgba(99,102,241,0.1)",
                      color: "var(--accent-indigo)",
                    }}
                  >
                    {(m.context / 1000).toFixed(0)}K
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CLI Status */}
        <div
          className="p-5 transition-all duration-300"
          style={glassCard}
          onMouseEnter={(e) => GlassHover(e, true)}
          onMouseLeave={(e) => GlassHover(e, false)}
        >
          <div style={shineOverlay} />
          <div className="relative z-2">
            <div className="flex items-center gap-2 mb-3">
              <Terminal
                className="w-4 h-4"
                style={{ color: "var(--success)" }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                GitHub CLI
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: status?.cli.installed
                      ? "var(--success)"
                      : "var(--error)",
                    boxShadow: status?.cli.installed
                      ? "0 0 8px rgba(16,185,129,0.4)"
                      : "0 0 8px rgba(239,68,68,0.4)",
                  }}
                />
                <span
                  className="text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  gh CLI {status?.cli.installed ? "Installed" : "Not Found"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: status?.cli.authenticated
                      ? "var(--success)"
                      : "var(--warning)",
                    boxShadow: status?.cli.authenticated
                      ? "0 0 8px rgba(16,185,129,0.4)"
                      : "0 0 8px rgba(245,158,11,0.4)",
                  }}
                />
                <span
                  className="text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {status?.cli.authenticated
                    ? `Authenticated as ${status.cli.user}`
                    : "Not Authenticated"}
                </span>
              </div>
            </div>
            {ghStatus?.recent_repos && ghStatus.recent_repos.length > 0 && (
              <div
                className="mt-3 pt-3"
                style={{ borderTop: "1px solid var(--glass-border)" }}
              >
                <p
                  className="text-xs mb-2"
                  style={{ color: "var(--text-ghost)" }}
                >
                  Recent Repos
                </p>
                {ghStatus.recent_repos.slice(0, 3).map((r) => (
                  <div
                    key={r.name}
                    className="flex items-center justify-between text-xs py-0.5"
                  >
                    <span style={{ color: "var(--text-secondary)" }}>
                      {r.name}
                    </span>
                    <span style={{ color: "var(--text-ghost)" }}>
                      {r.isPrivate ? "🔒" : "🌐"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Capabilities */}
        <div
          className="p-5 transition-all duration-300"
          style={glassCard}
          onMouseEnter={(e) => GlassHover(e, true)}
          onMouseLeave={(e) => GlassHover(e, false)}
        >
          <div style={shineOverlay} />
          <div className="relative z-2">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles
                className="w-4 h-4"
                style={{ color: "var(--accent-purple)" }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                Capabilities
              </span>
            </div>
            <div className="space-y-2">
              {status?.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <Check
                    className="w-3 h-3 shrink-0"
                    style={{ color: "var(--success)" }}
                  />
                  <span style={{ color: "var(--text-secondary)" }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* App Templates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg font-semibold flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            <Rocket className="w-5 h-5" style={{ color: "var(--warning)" }} />
            App Templates
          </h2>
          <span className="text-sm" style={{ color: "var(--text-ghost)" }}>
            {templates.length} templates
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelectedTemplate(t.id);
                setShowCreate(true);
                setCreateResult(null);
              }}
              className="text-left p-4 transition-all duration-300 group"
              style={glassCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)";
                e.currentTarget.style.boxShadow =
                  "var(--glass-shadow-lg), var(--accent-glow)";
                e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--glass-border)";
                e.currentTarget.style.boxShadow = "var(--glass-shadow)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={shineOverlay} />
              <div className="relative z-2">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{t.icon}</span>
                  <span
                    className="font-medium text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {t.name}
                  </span>
                </div>
                <p
                  className="text-xs mb-3 line-clamp-2"
                  style={{ color: "var(--text-ghost)" }}
                >
                  {t.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {t.stack.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-full text-[10px]"
                      style={{
                        background: "rgba(99,102,241,0.08)",
                        color: "var(--accent-indigo)",
                        border: "1px solid rgba(99,102,241,0.12)",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Workspace Apps */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg font-semibold flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            <FolderOpen
              className="w-5 h-5"
              style={{ color: "var(--accent-cyan)" }}
            />
            Workspace Apps
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: "var(--text-ghost)" }}>
              {workspace?.count ?? 0} apps
            </span>
            <button
              onClick={loadAll}
              className="p-1.5 rounded-lg transition-all duration-300"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--glass-bg)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        {workspace && workspace.apps.length > 0 ? (
          <div className="space-y-2">
            {workspace.apps.map((app) => (
              <div
                key={app.dir}
                className="flex items-center justify-between p-4 transition-all duration-300"
                style={glassCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--glass-border-hover)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--glass-border)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={shineOverlay} />
                <div className="flex items-center gap-3 relative z-2">
                  <Code2 className="w-5 h-5" style={{ color: "var(--info)" }} />
                  <div>
                    <p
                      className="font-medium text-sm"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {app.name}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-ghost)" }}
                    >
                      {app.framework} · {app.path}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 relative z-2">
                  {app.has_git && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: "rgba(16,185,129,0.1)",
                        color: "var(--success)",
                        border: "1px solid rgba(16,185,129,0.15)",
                      }}
                    >
                      git
                    </span>
                  )}
                  <span
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{
                      background: "rgba(99,102,241,0.08)",
                      color: "var(--accent-indigo)",
                      border: "1px solid rgba(99,102,241,0.12)",
                    }}
                  >
                    {app.framework}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center" style={glassCard}>
            <div style={shineOverlay} />
            <div className="relative z-2">
              <FolderOpen
                className="w-8 h-8 mx-auto mb-2"
                style={{ color: "var(--text-ghost)" }}
              />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No apps yet. Click &quot;Create App&quot; to get started!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create App Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
            style={glassSolid}
          >
            <div style={shineOverlay} />
            <div
              className="flex items-center justify-between p-5 relative z-2"
              style={{ borderBottom: "1px solid var(--glass-border)" }}
            >
              <h3
                className="text-lg font-semibold flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <Rocket
                  className="w-5 h-5"
                  style={{ color: "var(--accent-violet)" }}
                />
                Create New App
              </h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: "var(--text-ghost)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--text-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-ghost)")
                }
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 relative z-2">
              {/* Template Select */}
              <div>
                <label
                  className="text-sm mb-1 block"
                  style={{ color: "var(--text-muted)" }}
                >
                  Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full p-2.5 text-sm focus:outline-none"
                  style={{
                    background: "var(--glass-bg)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="">Select a template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.icon} {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* App Name */}
              <div>
                <label
                  className="text-sm mb-1 block"
                  style={{ color: "var(--text-muted)" }}
                >
                  App Name
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="my-awesome-app"
                  className="w-full p-2.5 text-sm focus:outline-none"
                  style={{
                    background: "var(--glass-bg)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label
                  className="text-sm mb-1 block"
                  style={{ color: "var(--text-muted)" }}
                >
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={appDesc}
                  onChange={(e) => setAppDesc(e.target.value)}
                  placeholder="A brief description of your app"
                  className="w-full p-2.5 text-sm focus:outline-none"
                  style={{
                    background: "var(--glass-bg)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* GitHub Repo Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Github
                    className="w-4 h-4"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Create GitHub Repository
                  </span>
                </div>
                <button
                  onClick={() => setCreateGhRepo(!createGhRepo)}
                  className="relative w-11 h-6 rounded-full transition-all duration-300"
                  style={{
                    background: createGhRepo
                      ? "var(--accent-indigo)"
                      : "var(--glass-bg)",
                    border: "1px solid",
                    borderColor: createGhRepo
                      ? "rgba(99,102,241,0.4)"
                      : "var(--glass-border)",
                    boxShadow: createGhRepo
                      ? "0 0 12px rgba(99,102,241,0.3)"
                      : "none",
                  }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                    style={{
                      transform: createGhRepo
                        ? "translateX(20px)"
                        : "translateX(0)",
                    }}
                  />
                </button>
              </div>

              {/* Selected template info */}
              {selectedTemplate && (
                <div
                  className="p-3"
                  style={{
                    background: "var(--glass-bg)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  {(() => {
                    const t = templates.find((x) => x.id === selectedTemplate);
                    if (!t) return null;
                    return (
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {t.icon} {t.name}
                        </p>
                        <p
                          className="text-xs mt-1"
                          style={{ color: "var(--text-ghost)" }}
                        >
                          {t.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {t.stack.map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded-full text-[10px]"
                              style={{
                                background: "rgba(139,92,246,0.1)",
                                color: "var(--accent-violet)",
                                border: "1px solid rgba(139,92,246,0.15)",
                              }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Create Result */}
              {createResult && (
                <div
                  className="p-3"
                  style={{
                    borderRadius: "var(--radius-md)",
                    background: (createResult as { success?: boolean }).success
                      ? "rgba(16,185,129,0.08)"
                      : "rgba(239,68,68,0.08)",
                    border: `1px solid ${(createResult as { success?: boolean }).success ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                  }}
                >
                  {(createResult as { success?: boolean }).success ? (
                    <div className="space-y-2">
                      <p
                        className="text-sm font-medium flex items-center gap-2"
                        style={{ color: "var(--success)" }}
                      >
                        <Check className="w-4 h-4" /> App created successfully!
                      </p>
                      {(
                        (createResult as Record<string, unknown>)
                          .steps as Array<{
                          step: string;
                          success: boolean;
                          output?: string;
                          repo_url?: string;
                        }>
                      )?.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs"
                        >
                          {s.success ? (
                            <Check
                              className="w-3 h-3"
                              style={{ color: "var(--success)" }}
                            />
                          ) : (
                            <X
                              className="w-3 h-3"
                              style={{ color: "var(--error)" }}
                            />
                          )}
                          <span style={{ color: "var(--text-secondary)" }}>
                            {s.step}
                          </span>
                          {s.repo_url && (
                            <a
                              href={s.repo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:underline"
                              style={{ color: "var(--accent-violet)" }}
                            >
                              <ExternalLink className="w-3 h-3" /> repo
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: "var(--error)" }}>
                      {(createResult as { error?: string }).error ||
                        "Failed to create app"}
                    </p>
                  )}
                </div>
              )}

              {/* Create Button */}
              <button
                onClick={handleCreateApp}
                disabled={creating || !selectedTemplate || !appName.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 font-medium transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "var(--accent-gradient)",
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                  boxShadow: "var(--accent-glow-strong)",
                  border: "1px solid rgba(99,102,241,0.3)",
                }}
                onMouseEnter={(e) => {
                  if (!creating)
                    e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    Create App
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Command Suggest Modal */}
      {showSuggest && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="w-full max-w-lg" style={glassSolid}>
            <div style={shineOverlay} />
            <div
              className="flex items-center justify-between p-5 relative z-2"
              style={{ borderBottom: "1px solid var(--glass-border)" }}
            >
              <h3
                className="text-lg font-semibold flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <Terminal
                  className="w-5 h-5"
                  style={{ color: "var(--success)" }}
                />
                Copilot Command Suggest
              </h3>
              <button
                onClick={() => setShowSuggest(false)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: "var(--text-ghost)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--text-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-ghost)")
                }
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 relative z-2">
              <div>
                <label
                  className="text-sm mb-1 block"
                  style={{ color: "var(--text-muted)" }}
                >
                  What do you want to do?
                </label>
                <textarea
                  value={suggestPrompt}
                  onChange={(e) => setSuggestPrompt(e.target.value)}
                  placeholder="e.g., List all files larger than 100MB, Create a docker network..."
                  rows={3}
                  className="w-full p-2.5 text-sm resize-none focus:outline-none"
                  style={{
                    background: "var(--glass-bg)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              {suggestion && (
                <div
                  className="p-3"
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-md)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <p
                    className="text-xs mb-1"
                    style={{ color: "var(--text-ghost)" }}
                  >
                    Suggestion:
                  </p>
                  <pre
                    className="text-sm whitespace-pre-wrap font-mono"
                    style={{ color: "var(--success)" }}
                  >
                    {suggestion}
                  </pre>
                </div>
              )}
              <button
                onClick={handleSuggest}
                disabled={suggesting || !suggestPrompt.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 font-medium transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--success)",
                  boxShadow: "0 0 20px rgba(16,185,129,0.08)",
                }}
                onMouseEnter={(e) => {
                  if (!suggesting) {
                    e.currentTarget.style.background = "rgba(16,185,129,0.18)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(16,185,129,0.12)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {suggesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Suggest Command
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
