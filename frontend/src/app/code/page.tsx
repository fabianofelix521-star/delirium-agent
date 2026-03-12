"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import {
  Send,
  Paperclip,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Code2,
  FolderTree,
  GitBranch,
  GitCommit,
  Play,
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  X,
  ArrowDown,
  Terminal,
  Eye,
  Monitor,
  Smartphone,
  Tablet,
  RotateCcw,
  ExternalLink,
  Globe,
  SplitSquareHorizontal,
} from "lucide-react";

/* ─── Types ─── */

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  path: string;
  children?: FileNode[];
  language?: string;
}

interface GithubRepo {
  name: string;
  full_name: string;
  description: string;
  language: string;
  default_branch: string;
  updated_at: string;
  html_url: string;
}

/* ─── Constants ─── */

const PRESETS = [
  { label: "Desktop", icon: Monitor, width: "100%", height: "100%" },
  { label: "Tablet", icon: Tablet, width: "768px", height: "1024px" },
  { label: "Mobile", icon: Smartphone, width: "375px", height: "812px" },
];

const PREVIEW_STORAGE_KEY = "delirium_preview_url";

const CODE_SYSTEM_PROMPT = `You are Delirium Code — an expert full-stack developer AI assistant.
Your job is to help the user create, debug, and ship applications.
Always respond with working code. Use markdown code blocks with language tags.
When the user asks you to create UI, generate complete HTML pages with inline CSS and JavaScript.
Wrap HTML output in \`\`\`html code blocks so it can be rendered in the live preview.
When creating a project, provide complete file structures.
When debugging, explain the root cause and provide the fix.
Be concise but thorough. Prefer modern best practices.`;

/* ─── HTML Extraction ─── */

function extractPreviewHtml(content: string): string | null {
  // Look for ```html blocks first
  const htmlMatch = content.match(/```html\n([\s\S]*?)```/);
  if (htmlMatch) {
    const raw = htmlMatch[1].trim();
    // If it's already a full HTML document, use as-is
    if (
      raw.toLowerCase().includes("<!doctype") ||
      raw.toLowerCase().includes("<html")
    ) {
      return raw;
    }
    // Otherwise wrap in a minimal HTML shell
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body>
${raw}
</body>
</html>`;
  }

  // Look for ```jsx or ```tsx blocks and wrap in a basic page
  const jsxMatch = content.match(/```(?:jsx|tsx)\n([\s\S]*?)```/);
  if (jsxMatch) {
    const raw = jsxMatch[1].trim();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
${raw}

// Attempt to render the default export or last component
const components = Object.keys(window).filter(k => typeof window[k] === 'function' && /^[A-Z]/.test(k));
const RootComponent = typeof App !== 'undefined' ? App : (components.length ? window[components[components.length - 1]] : () => React.createElement('div', null, 'No component found'));
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(RootComponent));
  </script>
</body>
</html>`;
  }

  return null;
}

/* ─── Component ─── */

export default function CodeArenaPage() {
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [activeProvider, setActiveProvider] = useState("alibaba");
  const [activeModel, setActiveModel] = useState("qwen3-coder-plus");

  // GitHub panel state
  const [sidePanel, setSidePanel] = useState<"repos" | "files" | null>(null);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [repoFiles, setRepoFiles] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [previewCode, setPreviewCode] = useState<{
    content: string;
    name: string;
    language: string;
  } | null>(null);

  // Conversation state
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Arena layout state
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState("http://localhost:3001");
  const [previewInputUrl, setPreviewInputUrl] = useState(
    "http://localhost:3001",
  );
  const [device, setDevice] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);
  const [splitView, setSplitView] = useState(true);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  /* ─── Scroll helpers ─── */

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const fromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollBtn(fromBottom > 100);
    };
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  /* ─── Model sync ─── */

  useEffect(() => {
    const saved = localStorage.getItem("delirium_selected_model");
    if (saved) {
      const [prov, ...modelParts] = saved.split("/");
      if (prov && modelParts.length) {
        setActiveProvider(prov);
        setActiveModel(modelParts.join("/"));
      }
    }
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.providerKey && detail?.name) {
        setActiveProvider(detail.providerKey);
        setActiveModel(detail.name);
      }
    };
    window.addEventListener("delirium-model-change", handler);
    return () => window.removeEventListener("delirium-model-change", handler);
  }, []);

  /* ─── Preview URL persistence ─── */

  useEffect(() => {
    const saved = localStorage.getItem(PREVIEW_STORAGE_KEY);
    if (saved) {
      setPreviewUrl(saved);
      setPreviewInputUrl(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PREVIEW_STORAGE_KEY, previewUrl);
  }, [previewUrl]);

  /* ─── GitHub ─── */

  useEffect(() => {
    fetch(`${API_BASE}/api/github/status`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        setGithubConnected(data.connected);
        if (data.connected) loadRepos();
      })
      .catch(() => {});
  }, []);

  const loadRepos = async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch(`${API_BASE}/api/github/repos`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRepos(data.repos || []);
      }
    } catch {
      /* */
    }
    setLoadingRepos(false);
  };

  const loadRepoFiles = async (repo: GithubRepo) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/github/repos/${repo.full_name}/tree`,
        { headers: getAuthHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        setRepoFiles(data.tree || []);
      }
    } catch {
      /* */
    }
  };

  const loadFileContent = async (repo: GithubRepo, path: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/github/repos/${repo.full_name}/file?path=${encodeURIComponent(path)}`,
        { headers: getAuthHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        const ext = path.split(".").pop() || "";
        const langMap: Record<string, string> = {
          ts: "typescript",
          tsx: "typescript",
          js: "javascript",
          jsx: "javascript",
          py: "python",
          rs: "rust",
          go: "go",
          css: "css",
          html: "html",
          json: "json",
          yml: "yaml",
          yaml: "yaml",
          md: "markdown",
          sql: "sql",
        };
        setPreviewCode({
          content: data.content,
          name: path.split("/").pop() || path,
          language: langMap[ext] || ext,
        });
      }
    } catch {
      /* */
    }
  };

  /* ─── Copy ─── */

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  /* ─── Preview helpers ─── */

  const navigatePreview = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      let target = previewInputUrl.trim();
      if (target && !target.startsWith("http")) target = `http://${target}`;
      setPreviewUrl(target);
      setPreviewHtml(""); // switching to URL mode
      setIframeKey((k) => k + 1);
    },
    [previewInputUrl],
  );

  const refreshPreview = () => setIframeKey((k) => k + 1);

  /* ─── Chat send ─── */

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const contextParts: string[] = [];
      if (selectedRepo) {
        contextParts.push(
          `[Active Repo: ${selectedRepo.full_name} (${selectedRepo.language || "unknown"})]`,
        );
      }
      if (previewCode) {
        contextParts.push(
          `[Viewing file: ${previewCode.name}]\n\`\`\`${previewCode.language}\n${previewCode.content.slice(0, 2000)}\n\`\`\``,
        );
      }

      const fullMessage = contextParts.length
        ? `${contextParts.join("\n")}\n\nUser: ${userMsg.content}`
        : userMsg.content;

      const token = localStorage.getItem("delirium_token");
      const res = await fetch(`${API_BASE}/api/chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: `${CODE_SYSTEM_PROMPT}\n\n${fullMessage}`,
          conversation_id: conversationId || undefined,
          stream: true,
          provider: activeProvider,
          model: activeModel,
        }),
      });

      let finalContent = "";

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "start" && data.conversation_id) {
                  setConversationId(data.conversation_id);
                }
                if (data.type === "token") {
                  finalContent += data.content;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant") last.content = finalContent;
                    return updated;
                  });
                }
              } catch {
                /* skip */
              }
            }
          }
        }

        // After streaming completes, extract HTML for preview
        const extracted = extractPreviewHtml(finalContent);
        if (extracted) {
          setPreviewHtml(extracted);
          setIframeKey((k) => k + 1);
        }
      } else {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            last.content =
              "⚠️ Could not connect to the backend. Make sure the server is running.";
          }
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          last.content =
            "⚠️ Connection error. Check that the backend is running on port 8000.";
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  /* ─── Markdown renderer ─── */

  const renderMarkdown = (text: string) => {
    return text
      .replace(
        /```(\w*)\n([\s\S]*?)```/g,
        (_match, lang: string, code: string) => {
          return `<div class="code-block-wrapper my-3 rounded-xl overflow-hidden" style="background:rgba(8,8,20,0.6);border:1px solid var(--glass-border)">
          <div class="flex items-center justify-between px-3 py-1.5" style="border-bottom:1px solid var(--glass-border);background:rgba(255,255,255,0.02)">
            <span style="color:var(--text-ghost);font-size:0.65rem;font-weight:600;text-transform:uppercase">${lang || "code"}</span>
            <button class="copy-code-btn" style="color:var(--text-ghost);font-size:0.65rem;padding:2px 6px;border-radius:4px;cursor:pointer">Copy</button>
          </div>
          <pre style="margin:0;border:0;border-radius:0;background:transparent !important"><code class="language-${lang}">${code}</code></pre>
        </div>`;
        },
      )
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(
        /^- (.+)/gm,
        '<li class="ml-4 list-disc" style="margin-bottom:2px">$1</li>',
      )
      .replace(/\n/g, "<br/>");
  };

  /* ─── File tree ─── */

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <button
          onClick={() => {
            if (node.type === "folder") toggleFolder(node.path);
            else if (selectedRepo) loadFileContent(selectedRepo, node.path);
          }}
          className="flex items-center gap-1.5 w-full px-2 py-1 text-left rounded-md transition-all hover:bg-white/[0.04] text-[11px]"
          style={{
            paddingLeft: `${depth * 12 + 8}px`,
            color: "var(--text-secondary)",
          }}
        >
          {node.type === "folder" ? (
            expandedFolders.has(node.path) ? (
              <ChevronDown size={10} style={{ color: "var(--text-ghost)" }} />
            ) : (
              <ChevronRight size={10} style={{ color: "var(--text-ghost)" }} />
            )
          ) : (
            <span style={{ width: 10 }} />
          )}
          {node.type === "folder" ? (
            <Folder size={12} style={{ color: "#f59e0b" }} />
          ) : (
            <File size={12} style={{ color: "var(--text-ghost)" }} />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {node.type === "folder" &&
          expandedFolders.has(node.path) &&
          node.children &&
          renderFileTree(node.children, depth + 1)}
      </div>
    ));
  };

  /* ─── Suggestions ─── */

  const codeSuggestions = [
    {
      icon: Code2,
      text: "Create a Next.js app",
      desc: "Full-stack project",
      color: "#6366f1",
    },
    {
      icon: Terminal,
      text: "Build a REST API",
      desc: "FastAPI / Express",
      color: "#06b6d4",
    },
    {
      icon: GitBranch,
      text: "Fix a bug in my repo",
      desc: "Debugging",
      color: "#ec4899",
    },
    {
      icon: Play,
      text: "Generate React component",
      desc: "UI component",
      color: "#10b981",
    },
  ];

  /* ─── Derived state ─── */

  const preset = PRESETS[device];
  const DeviceIcon = preset.icon;
  const hasPreview = previewHtml.length > 0;

  /* ─────────────────────────────────────────────── */
  /* ─── RENDER ──────────────────────────────────── */
  /* ─────────────────────────────────────────────── */

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* ═══ TOP TOOLBAR ═══ */}
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{
          borderBottom: "1px solid var(--glass-border)",
          background: "var(--bg-surface)",
        }}
      >
        {/* Left: Tab switcher */}
        <div
          className="flex rounded-lg overflow-hidden"
          style={{
            border: "1px solid var(--glass-border)",
            background: "var(--bg-elevated)",
          }}
        >
          <button
            onClick={() => setActiveTab("code")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold transition-all"
            style={{
              background:
                activeTab === "code"
                  ? "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.10))"
                  : "transparent",
              color:
                activeTab === "code"
                  ? "var(--accent-indigo)"
                  : "var(--text-muted)",
              borderRight: "1px solid var(--glass-border)",
            }}
          >
            <Code2 size={13} />
            Code
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold transition-all"
            style={{
              background:
                activeTab === "preview"
                  ? "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.10))"
                  : "transparent",
              color:
                activeTab === "preview"
                  ? "var(--accent-indigo)"
                  : "var(--text-muted)",
            }}
          >
            <Eye size={13} />
            Preview
            {hasPreview && (
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#10b981" }}
              />
            )}
          </button>
        </div>

        {/* Split view toggle (md+ only) */}
        <button
          onClick={() => setSplitView(!splitView)}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
          style={{
            background: splitView
              ? "rgba(99,102,241,0.1)"
              : "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            color: splitView ? "var(--accent-indigo)" : "var(--text-muted)",
          }}
          title={splitView ? "Single view" : "Split view"}
        >
          <SplitSquareHorizontal size={13} />
        </button>

        <div className="flex-1" />

        {/* URL bar (visible when preview is showing) */}
        <form
          onSubmit={navigatePreview}
          className="hidden md:flex items-center gap-1.5 flex-1 max-w-md"
          style={{
            opacity: splitView || activeTab === "preview" ? 1 : 0.4,
            pointerEvents:
              splitView || activeTab === "preview" ? "auto" : "none",
          }}
        >
          <div
            className="flex items-center gap-2 flex-1 px-2.5 py-1.5 rounded-lg"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <Globe size={12} style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              value={previewInputUrl}
              onChange={(e) => setPreviewInputUrl(e.target.value)}
              placeholder="http://localhost:3001"
              className="flex-1 bg-transparent text-[12px] outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          <button
            type="submit"
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
            style={{ background: "var(--accent-gradient)", color: "white" }}
          >
            Go
          </button>
        </form>

        {/* Device switcher */}
        <div className="relative">
          <button
            onClick={() => setShowDeviceMenu(!showDeviceMenu)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px]"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            <DeviceIcon size={13} />
            <span className="hidden sm:inline">{preset.label}</span>
            <ChevronDown size={10} />
          </button>

          {showDeviceMenu && (
            <div
              className="absolute top-full right-0 mt-1 rounded-lg overflow-hidden z-50"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--glass-border)",
                boxShadow: "var(--glass-shadow)",
              }}
            >
              {PRESETS.map((p, i) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.label}
                    onClick={() => {
                      setDevice(i);
                      setShowDeviceMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-[11px] hover:opacity-80"
                    style={{
                      color:
                        i === device
                          ? "var(--accent-indigo)"
                          : "var(--text-secondary)",
                      background:
                        i === device ? "rgba(99,102,241,0.08)" : "transparent",
                    }}
                  >
                    <Icon size={13} />
                    {p.label}
                    <span
                      style={{ color: "var(--text-muted)", fontSize: "10px" }}
                    >
                      {p.width === "100%" ? "Full" : p.width}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Preview actions */}
        <button
          onClick={refreshPreview}
          className="p-1.5 rounded-lg hover:opacity-80"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-muted)",
          }}
          title="Refresh preview"
        >
          <RotateCcw size={13} />
        </button>
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg hover:opacity-80"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-muted)",
          }}
          title="Open in new tab"
        >
          <ExternalLink size={13} />
        </a>
      </div>

      {/* ═══ MAIN SPLIT LAYOUT ═══ */}
      <div className="flex flex-1 min-h-0 relative">
        {/* ─── Side Panel (GitHub repos/files) ─── */}
        {sidePanel && (
          <div
            className="fixed inset-0 z-40 md:relative md:inset-auto md:z-auto w-full md:w-[260px] shrink-0 flex flex-col border-r overflow-hidden animate-fade-in"
            style={{
              background: "var(--glass-bg-solid)",
              borderColor: "var(--glass-border)",
            }}
          >
            {/* Panel Header */}
            <div
              className="flex items-center justify-between px-3 py-2.5"
              style={{ borderBottom: "1px solid var(--glass-border)" }}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidePanel("repos")}
                  className={`text-[11px] font-semibold px-2 py-1 rounded-md transition-all ${sidePanel === "repos" ? "bg-white/[0.06]" : ""}`}
                  style={{
                    color:
                      sidePanel === "repos"
                        ? "var(--text-primary)"
                        : "var(--text-ghost)",
                  }}
                >
                  <GitBranch size={11} className="inline mr-1" /> Repos
                </button>
                {selectedRepo && (
                  <button
                    onClick={() => setSidePanel("files")}
                    className={`text-[11px] font-semibold px-2 py-1 rounded-md transition-all ${sidePanel === "files" ? "bg-white/[0.06]" : ""}`}
                    style={{
                      color:
                        sidePanel === "files"
                          ? "var(--text-primary)"
                          : "var(--text-ghost)",
                    }}
                  >
                    <FolderTree size={11} className="inline mr-1" /> Files
                  </button>
                )}
              </div>
              <button
                onClick={() => setSidePanel(null)}
                className="p-1 rounded-md hover:bg-white/[0.04]"
                style={{ color: "var(--text-ghost)" }}
              >
                <X size={13} />
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-2">
              {sidePanel === "repos" && (
                <>
                  {!githubConnected ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ background: "rgba(99,102,241,0.1)" }}
                      >
                        <GitBranch
                          size={22}
                          style={{ color: "var(--accent-indigo)" }}
                        />
                      </div>
                      <p
                        className="text-[12px] font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Connect GitHub
                      </p>
                      <p
                        className="text-[11px]"
                        style={{ color: "var(--text-ghost)" }}
                      >
                        Add your GitHub token in Settings → APIs to access your
                        repositories.
                      </p>
                      <a
                        href="/settings/apis"
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                        style={{
                          background: "var(--accent-gradient)",
                          color: "white",
                        }}
                      >
                        Configure
                      </a>
                    </div>
                  ) : loadingRepos ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2
                        size={18}
                        className="animate-spin"
                        style={{ color: "var(--accent-indigo)" }}
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {repos.map((repo) => (
                        <button
                          key={repo.full_name}
                          onClick={() => {
                            setSelectedRepo(repo);
                            setSidePanel("files");
                            loadRepoFiles(repo);
                          }}
                          className="w-full text-left p-2.5 rounded-lg transition-all hover:bg-white/[0.04]"
                          style={{
                            background:
                              selectedRepo?.full_name === repo.full_name
                                ? "rgba(99,102,241,0.08)"
                                : undefined,
                            border: "1px solid transparent",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <GitCommit
                              size={12}
                              style={{ color: "var(--accent-indigo)" }}
                            />
                            <span
                              className="text-[12px] font-medium truncate"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {repo.name}
                            </span>
                          </div>
                          {repo.description && (
                            <p
                              className="text-[10px] mt-0.5 truncate"
                              style={{ color: "var(--text-ghost)" }}
                            >
                              {repo.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {repo.language && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded-full"
                                style={{
                                  background: "rgba(99,102,241,0.1)",
                                  color: "var(--accent-indigo)",
                                }}
                              >
                                {repo.language}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {sidePanel === "files" && selectedRepo && (
                <div>
                  <div
                    className="flex items-center gap-2 px-2 py-1.5 mb-1"
                    style={{ borderBottom: "1px solid var(--glass-border)" }}
                  >
                    <GitCommit
                      size={11}
                      style={{ color: "var(--accent-indigo)" }}
                    />
                    <span
                      className="text-[11px] font-medium truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {selectedRepo.name}
                    </span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full ml-auto"
                      style={{
                        background: "rgba(99,102,241,0.1)",
                        color: "var(--accent-indigo)",
                      }}
                    >
                      {selectedRepo.default_branch}
                    </span>
                  </div>
                  {repoFiles.length > 0 ? (
                    renderFileTree(repoFiles)
                  ) : (
                    <div className="flex items-center justify-center h-20">
                      <Loader2
                        size={14}
                        className="animate-spin"
                        style={{ color: "var(--text-ghost)" }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── LEFT PANEL: Code / Chat ─── */}
        <div
          className={`flex-col min-w-0 ${
            activeTab === "code"
              ? "flex flex-1"
              : splitView
                ? "hidden md:flex md:flex-1"
                : "hidden"
          }`}
          style={{
            borderRight: splitView
              ? "1px solid var(--glass-border)"
              : undefined,
          }}
        >
          {/* Code Preview bar (viewing a file from GitHub) */}
          {previewCode && (
            <div
              className="shrink-0 border-b"
              style={{
                background: "var(--bg-secondary)",
                borderColor: "var(--glass-border)",
              }}
            >
              <div className="flex items-center justify-between px-4 py-1.5">
                <div className="flex items-center gap-2">
                  <File size={12} style={{ color: "var(--accent-indigo)" }} />
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {previewCode.name}
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{
                      background: "rgba(99,102,241,0.1)",
                      color: "var(--accent-indigo)",
                    }}
                  >
                    {previewCode.language}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      handleCopy(previewCode.content, "preview-file")
                    }
                    className="p-1 rounded-md hover:bg-white/[0.04]"
                    style={{ color: "var(--text-ghost)" }}
                  >
                    {copied === "preview-file" ? (
                      <Check size={12} />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                  <button
                    onClick={() => setPreviewCode(null)}
                    className="p-1 rounded-md hover:bg-white/[0.04]"
                    style={{ color: "var(--text-ghost)" }}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
              <pre
                className="px-4 pb-2 overflow-x-auto text-[11px] leading-relaxed max-h-[200px] overflow-y-auto"
                style={{
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <code>{previewCode.content}</code>
              </pre>
            </div>
          )}

          {/* Messages area */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-4 md:px-6 py-4 relative"
          >
            {messages.length === 0 ? (
              /* ─── Empty state ─── */
              <div className="flex flex-col items-center justify-center h-full animate-fade-in">
                <div className="relative mb-6">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center animate-float relative"
                    style={{
                      background: "linear-gradient(135deg, #6366f1, #06b6d4)",
                      boxShadow: "0 0 30px rgba(99,102,241,0.3)",
                    }}
                  >
                    <Code2 size={28} color="white" strokeWidth={1.8} />
                  </div>
                </div>

                <h2 className="text-xl font-bold gradient-text mb-1">
                  Delirium Code
                </h2>
                <p
                  className="text-[13px] mb-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  AI coding assistant with live preview
                </p>

                {/* Status badges */}
                <div className="flex items-center gap-2 mb-6">
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium cursor-pointer"
                    onClick={() => setSidePanel(sidePanel ? null : "repos")}
                    style={{
                      background: githubConnected
                        ? "rgba(16,185,129,0.1)"
                        : "rgba(239,68,68,0.1)",
                      border: `1px solid ${githubConnected ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                      color: githubConnected ? "#10b981" : "#ef4444",
                    }}
                  >
                    <GitBranch size={11} />
                    {githubConnected
                      ? "GitHub Connected"
                      : "GitHub Not Connected"}
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <Code2 size={11} /> {activeModel}
                  </div>
                </div>

                {/* Suggestion cards */}
                <div className="grid grid-cols-2 gap-2.5 w-full max-w-md">
                  {codeSuggestions.map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => setInput(s.text + "...")}
                        className="liquid-glass liquid-glass-hover p-3 text-left transition-all group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                            style={{
                              background: `${s.color}12`,
                              color: s.color,
                            }}
                          >
                            <Icon size={15} strokeWidth={1.8} />
                          </div>
                          <div className="min-w-0">
                            <p
                              className="text-[12px] font-medium truncate"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {s.text}
                            </p>
                            <p
                              className="text-[10px]"
                              style={{ color: "var(--text-ghost)" }}
                            >
                              {s.desc}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ─── Chat messages ─── */
              <div className="space-y-1 max-w-3xl mx-auto">
                {messages.map((msg) => (
                  <div key={msg.id} className="animate-fade-in">
                    {msg.role === "user" ? (
                      <div className="flex justify-end mb-4">
                        <div
                          className="max-w-[85%] rounded-2xl rounded-br-lg px-4 py-3 text-[13px] leading-relaxed"
                          style={{
                            background: "var(--accent-indigo)",
                            color: "white",
                            boxShadow: "0 4px 12px rgba(99,102,241,0.25)",
                          }}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-6">
                        <div className="flex gap-3">
                          <div
                            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                            style={{
                              background:
                                "linear-gradient(135deg, #6366f1, #06b6d4)",
                              boxShadow: "0 2px 8px rgba(99,102,241,0.2)",
                            }}
                          >
                            <Code2 size={13} color="white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className="rounded-2xl rounded-bl-lg px-4 py-3 text-[13px] leading-relaxed"
                              style={{
                                background: "var(--glass-bg-solid)",
                                border: "1px solid var(--glass-border)",
                                boxShadow: "var(--glass-shadow)",
                                color: "var(--text-primary)",
                              }}
                            >
                              {msg.content ? (
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: renderMarkdown(msg.content),
                                  }}
                                />
                              ) : isStreaming ? (
                                <div className="flex gap-1.5 py-1">
                                  <div className="typing-dot" />
                                  <div className="typing-dot" />
                                  <div className="typing-dot" />
                                </div>
                              ) : null}
                            </div>
                            {msg.content && !isStreaming && (
                              <div className="flex items-center gap-0.5 mt-1.5 ml-1">
                                <button
                                  onClick={() =>
                                    handleCopy(msg.content, msg.id)
                                  }
                                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium hover:bg-white/[0.04] transition-colors"
                                  style={{ color: "var(--text-ghost)" }}
                                >
                                  {copied === msg.id ? (
                                    <Check
                                      size={11}
                                      style={{ color: "var(--success)" }}
                                    />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                  {copied === msg.id ? "Copied" : "Copy"}
                                </button>
                                {/* Show in preview button for code blocks */}
                                {(msg.content.includes("```html") ||
                                  msg.content.includes("```jsx") ||
                                  msg.content.includes("```tsx")) && (
                                  <button
                                    onClick={() => {
                                      const html = extractPreviewHtml(
                                        msg.content,
                                      );
                                      if (html) {
                                        setPreviewHtml(html);
                                        setIframeKey((k) => k + 1);
                                        setActiveTab("preview");
                                      }
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium hover:bg-white/[0.04] transition-colors"
                                    style={{ color: "var(--accent-indigo)" }}
                                  >
                                    <Eye size={11} />
                                    Preview
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}

            {showScrollBtn && messages.length > 0 && (
              <button
                onClick={scrollToBottom}
                className="sticky bottom-2 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 z-30 animate-fade-in"
                style={{
                  background: "var(--glass-bg-solid)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-muted)",
                  boxShadow: "var(--glass-shadow-lg)",
                }}
              >
                <ArrowDown size={15} />
              </button>
            )}
          </div>
        </div>

        {/* ─── RIGHT PANEL: Live Preview ─── */}
        <div
          className={`flex-col min-w-0 ${
            activeTab === "preview"
              ? "flex flex-1"
              : splitView
                ? "hidden md:flex md:flex-1"
                : "hidden"
          }`}
        >
          {/* Mobile URL bar (only on mobile when preview tab is active) */}
          <form
            onSubmit={navigatePreview}
            className="md:hidden flex items-center gap-2 px-3 py-2"
            style={{
              borderBottom: "1px solid var(--glass-border)",
              background: "var(--bg-surface)",
            }}
          >
            <div
              className="flex items-center gap-2 flex-1 px-2.5 py-1.5 rounded-lg"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <Globe size={12} style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                value={previewInputUrl}
                onChange={(e) => setPreviewInputUrl(e.target.value)}
                placeholder="http://localhost:3001"
                className="flex-1 bg-transparent text-[12px] outline-none"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
            <button
              type="submit"
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
              style={{ background: "var(--accent-gradient)", color: "white" }}
            >
              Go
            </button>
          </form>

          {/* Preview content */}
          <div
            className="flex-1 flex items-center justify-center overflow-auto relative"
            style={{ background: "var(--bg-void)" }}
          >
            {/* No preview placeholder */}
            {!hasPreview && !previewUrl ? (
              <div className="flex flex-col items-center gap-4 text-center px-6">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(99,102,241,0.1)" }}
                >
                  <Eye size={24} style={{ color: "var(--accent-indigo)" }} />
                </div>
                <p
                  className="text-[13px] font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Live Preview
                </p>
                <p
                  className="text-[11px] max-w-xs"
                  style={{ color: "var(--text-ghost)" }}
                >
                  Ask the AI to generate HTML or React code and it will appear
                  here automatically. You can also enter a URL above.
                </p>
              </div>
            ) : (
              <div
                className="relative rounded-xl overflow-hidden transition-all duration-300"
                style={{
                  width: preset.width,
                  height: preset.height,
                  maxWidth: "100%",
                  maxHeight: "100%",
                  border:
                    device > 0 ? "8px solid var(--glass-border)" : undefined,
                  borderRadius: device > 0 ? "24px" : "8px",
                  boxShadow:
                    device > 0 ? "0 20px 60px rgba(0,0,0,0.3)" : undefined,
                }}
              >
                <iframe
                  key={iframeKey}
                  ref={iframeRef}
                  {...(hasPreview
                    ? { srcDoc: previewHtml }
                    : { src: previewUrl })}
                  className="w-full h-full"
                  style={{ background: "white", border: "none" }}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                  title="Live Preview"
                />
              </div>
            )}
          </div>

          {/* Preview status bar */}
          <div
            className="flex items-center justify-between px-3 py-1.5 text-[10px] shrink-0"
            style={{
              borderTop: "1px solid var(--glass-border)",
              background: "var(--bg-surface)",
              color: "var(--text-muted)",
            }}
          >
            <div className="flex items-center gap-2">
              {hasPreview && (
                <span
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "rgba(16,185,129,0.1)",
                    color: "#10b981",
                  }}
                >
                  <Sparkles size={9} /> Generated
                </span>
              )}
              <span className="truncate max-w-[200px]">
                {hasPreview ? "HTML from AI response" : previewUrl}
              </span>
              <span style={{ color: "var(--text-ghost)" }}>
                {preset.label} (
                {preset.width === "100%" ? "Full" : preset.width})
              </span>
            </div>
            {hasPreview && (
              <button
                onClick={() => {
                  setPreviewHtml("");
                  setIframeKey((k) => k + 1);
                }}
                className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                style={{ color: "var(--text-ghost)" }}
              >
                <X size={10} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ INPUT AREA (full width bottom) ═══ */}
      <div className="shrink-0 px-4 md:px-6 pb-3 pt-1">
        <div
          className="liquid-glass-solid relative overflow-visible"
          style={{ borderRadius: "var(--radius-2xl)" }}
        >
          <div className="flex items-end gap-1 p-2">
            <button
              onClick={() => setSidePanel(sidePanel ? null : "repos")}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/[0.04] shrink-0"
              style={{
                color: sidePanel ? "var(--accent-indigo)" : "var(--text-ghost)",
              }}
              title="Toggle repos"
            >
              <GitBranch size={16} strokeWidth={2} />
            </button>
            <button
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/[0.04] shrink-0"
              style={{ color: "var(--text-ghost)" }}
              title="Attach file"
            >
              <Paperclip size={16} strokeWidth={2} />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to build..."
              rows={1}
              className="flex-1 bg-transparent text-[13px] outline-none resize-none py-2 px-1"
              style={{ color: "var(--text-primary)", maxHeight: "200px" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 disabled:opacity-30"
              style={{
                background: input.trim()
                  ? "linear-gradient(135deg, #6366f1, #06b6d4)"
                  : "var(--bg-elevated)",
                color: "white",
                boxShadow: input.trim()
                  ? "0 2px 12px rgba(99,102,241,0.3)"
                  : "none",
              }}
            >
              {isStreaming ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 pb-2">
            {selectedRepo && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium"
                style={{
                  background: "rgba(99,102,241,0.08)",
                  color: "var(--accent-indigo)",
                }}
              >
                <GitCommit size={10} /> {selectedRepo.name}
                <button
                  onClick={() => setSelectedRepo(null)}
                  className="ml-1 hover:opacity-70"
                >
                  <X size={9} />
                </button>
              </div>
            )}
            <div className="flex-1" />
            <span
              className="hidden md:inline text-[10px] font-medium"
              style={{ color: "var(--text-ghost)" }}
            >
              <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> new line
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
