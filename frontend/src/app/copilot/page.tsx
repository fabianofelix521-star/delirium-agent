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

const API_BASE = "";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = localStorage.getItem("auth_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

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
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
            <Github className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">GitHub Copilot</h1>
            <p className="text-white/50 text-sm">
              LLM Provider + App Builder + CLI Integration
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSuggest(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            <Terminal className="w-4 h-4" />
            Command Suggest
          </button>
          <button
            onClick={() => {
              setShowCreate(true);
              setCreateResult(null);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition"
          >
            <Plus className="w-4 h-4" />
            Create App
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Provider Status */}
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white/70">
              LLM Provider
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-2 h-2 rounded-full ${status?.token_configured ? "bg-green-400" : "bg-red-400"}`}
            />
            <span className="text-white text-sm">
              {status?.token_configured ? "Configured" : "Not Configured"}
            </span>
          </div>
          <p className="text-white/40 text-xs mb-3">
            {status?.provider.env_var}: GITHUB_TOKEN
          </p>
          <div className="space-y-1">
            {status?.provider.models.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-white/60">{m.name}</span>
                <span className="text-white/30">
                  {(m.context / 1000).toFixed(0)}K ctx
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CLI Status */}
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-white/70">
              GitHub CLI
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${status?.cli.installed ? "bg-green-400" : "bg-red-400"}`}
              />
              <span className="text-white text-sm">
                gh CLI {status?.cli.installed ? "Installed" : "Not Found"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${status?.cli.authenticated ? "bg-green-400" : "bg-yellow-400"}`}
              />
              <span className="text-white text-sm">
                {status?.cli.authenticated
                  ? `Authenticated as ${status.cli.user}`
                  : "Not Authenticated"}
              </span>
            </div>
          </div>
          {ghStatus?.recent_repos && ghStatus.recent_repos.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-white/40 text-xs mb-2">Recent Repos</p>
              {ghStatus.recent_repos.slice(0, 3).map((r) => (
                <div
                  key={r.name}
                  className="flex items-center justify-between text-xs py-0.5"
                >
                  <span className="text-white/60">{r.name}</span>
                  <span className="text-white/30">
                    {r.isPrivate ? "🔒" : "🌐"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Capabilities */}
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-white/70">
              Capabilities
            </span>
          </div>
          <div className="space-y-2">
            {status?.features.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                <span className="text-white/60">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* App Templates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Rocket className="w-5 h-5 text-orange-400" />
            App Templates
          </h2>
          <span className="text-white/40 text-sm">
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
              className="text-left rounded-xl bg-white/[0.03] border border-white/10 p-4 hover:bg-white/[0.06] hover:border-purple-500/30 transition group"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{t.icon}</span>
                <span className="text-white font-medium text-sm group-hover:text-purple-300 transition">
                  {t.name}
                </span>
              </div>
              <p className="text-white/40 text-xs mb-3 line-clamp-2">
                {t.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {t.stack.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 rounded-full bg-white/5 text-white/50 text-[10px]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Workspace Apps */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-cyan-400" />
            Workspace Apps
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-sm">
              {workspace?.count ?? 0} apps
            </span>
            <button
              onClick={loadAll}
              className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition"
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
                className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/10 p-4"
              >
                <div className="flex items-center gap-3">
                  <Code2 className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white font-medium text-sm">{app.name}</p>
                    <p className="text-white/40 text-xs">
                      {app.framework} · {app.path}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {app.has_git && (
                    <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs">
                      git
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/50 text-xs">
                    {app.framework}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-8 text-center">
            <FolderOpen className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-white/40 text-sm">
              No apps yet. Click &quot;Create App&quot; to get started!
            </p>
          </div>
        )}
      </div>

      {/* Create App Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Rocket className="w-5 h-5 text-purple-400" />
                Create New App
              </h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Template Select */}
              <div>
                <label className="text-white/60 text-sm mb-1 block">
                  Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:border-purple-500/50 focus:outline-none"
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
                <label className="text-white/60 text-sm mb-1 block">
                  App Name
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="my-awesome-app"
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-white/60 text-sm mb-1 block">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={appDesc}
                  onChange={(e) => setAppDesc(e.target.value)}
                  placeholder="A brief description of your app"
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none"
                />
              </div>

              {/* GitHub Repo Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Github className="w-4 h-4 text-white/50" />
                  <span className="text-white/60 text-sm">
                    Create GitHub Repository
                  </span>
                </div>
                <button
                  onClick={() => setCreateGhRepo(!createGhRepo)}
                  className={`relative w-11 h-6 rounded-full transition ${createGhRepo ? "bg-purple-500" : "bg-white/10"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${createGhRepo ? "translate-x-5" : ""}`}
                  />
                </button>
              </div>

              {/* Selected template info */}
              {selectedTemplate && (
                <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                  {(() => {
                    const t = templates.find((x) => x.id === selectedTemplate);
                    if (!t) return null;
                    return (
                      <div>
                        <p className="text-white/70 text-sm font-medium">
                          {t.icon} {t.name}
                        </p>
                        <p className="text-white/40 text-xs mt-1">
                          {t.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {t.stack.map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[10px]"
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
                  className={`rounded-lg border p-3 ${(createResult as { success?: boolean }).success ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}
                >
                  {(createResult as { success?: boolean }).success ? (
                    <div className="space-y-2">
                      <p className="text-green-400 text-sm font-medium flex items-center gap-2">
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
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <X className="w-3 h-3 text-red-400" />
                          )}
                          <span className="text-white/60">{s.step}</span>
                          {s.repo_url && (
                            <a
                              href={s.repo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" /> repo
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-red-400 text-sm">
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
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-green-400" />
                Copilot Command Suggest
              </h3>
              <button
                onClick={() => setShowSuggest(false)}
                className="text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-white/60 text-sm mb-1 block">
                  What do you want to do?
                </label>
                <textarea
                  value={suggestPrompt}
                  onChange={(e) => setSuggestPrompt(e.target.value)}
                  placeholder="e.g., List all files larger than 100MB, Create a docker network..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-sm placeholder:text-white/30 focus:border-green-500/50 focus:outline-none resize-none"
                />
              </div>
              {suggestion && (
                <div className="rounded-lg bg-black/50 border border-white/10 p-3">
                  <p className="text-white/40 text-xs mb-1">Suggestion:</p>
                  <pre className="text-green-400 text-sm whitespace-pre-wrap font-mono">
                    {suggestion}
                  </pre>
                </div>
              )}
              <button
                onClick={handleSuggest}
                disabled={suggesting || !suggestPrompt.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 font-medium hover:bg-green-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
