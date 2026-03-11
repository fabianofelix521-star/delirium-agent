"use client";

import { useState, useRef, useEffect } from "react";
import { API_BASE } from "@/lib/api";
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
  Plus,
  Download,
  Play,
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  X,
  RefreshCw,
  ArrowDown,
  Terminal,
  Eye,
} from "lucide-react";

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

const CODE_SYSTEM_PROMPT = `You are Delirium Code — an expert full-stack developer AI assistant.
Your job is to help the user create, debug, and ship applications.
Always respond with working code. Use markdown code blocks with language tags.
When creating a project, provide complete file structures.
When debugging, explain the root cause and provide the fix.
Be concise but thorough. Prefer modern best practices.`;

export default function CodeChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [activeProvider, setActiveProvider] = useState("alibaba");
  const [activeModel, setActiveModel] = useState("qwen3-coder-plus");
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Sync model from Navbar
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

  // Check GitHub connection
  useEffect(() => {
    fetch(`${API_BASE}/api/github/status`)
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
      const res = await fetch(`${API_BASE}/api/github/repos`);
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

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

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
      const contextParts = [];
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

      const res = await fetch(`${API_BASE}/api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: fullMessage,
          stream: true,
          provider: activeProvider,
          model: activeModel,
          system_prompt: CODE_SYSTEM_PROMPT,
        }),
      });

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
                if (data.type === "token") {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant") last.content += data.content;
                    return updated;
                  });
                }
              } catch {
                /* skip */
              }
            }
          }
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

  return (
    <div className="flex h-full relative">
      {/* Side Panel - Repos & Files */}
      {sidePanel && (
        <div
          className="fixed inset-0 z-40 md:relative md:inset-auto md:z-auto w-full md:w-[280px] shrink-0 flex flex-col border-r overflow-hidden animate-fade-in"
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Code Preview bar */}
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
                  onClick={() => handleCopy(previewCode.content, "preview")}
                  className="p-1 rounded-md hover:bg-white/[0.04]"
                  style={{ color: "var(--text-ghost)" }}
                >
                  {copied === "preview" ? (
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

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-12 py-4 relative"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full animate-fade-in">
              <div className="relative mb-8">
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
                Your AI coding assistant. Build apps from anywhere.
              </p>

              {/* GitHub connection status */}
              <div className="flex items-center gap-2 mb-8">
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

              {/* Suggestions */}
              <div className="grid grid-cols-2 gap-2.5 w-full max-w-lg">
                {codeSuggestions.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => setInput(s.text + "...")}
                      className="liquid-glass liquid-glass-hover p-3.5 text-left transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                          style={{ background: `${s.color}12`, color: s.color }}
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
            <div className="space-y-1 max-w-3xl mx-auto">
              {messages.map((msg) => (
                <div key={msg.id} className="animate-fade-in">
                  {msg.role === "user" ? (
                    <div className="flex justify-end mb-4">
                      <div
                        className="max-w-[75%] rounded-2xl rounded-br-lg px-4 py-3 text-[13px] leading-relaxed"
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
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            background:
                              "linear-gradient(135deg, #6366f1, #06b6d4)",
                            boxShadow: "0 2px 8px rgba(99,102,241,0.2)",
                          }}
                        >
                          <Code2 size={14} color="white" />
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
                                onClick={() => handleCopy(msg.content, msg.id)}
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
              className="fixed bottom-24 right-6 md:right-8 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 z-30 animate-fade-in"
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

        {/* Input area */}
        <div className="shrink-0 px-4 md:px-8 lg:px-12 pb-4 pt-1">
          <div
            className="liquid-glass-solid relative overflow-visible"
            style={{ borderRadius: "var(--radius-2xl)" }}
          >
            <div className="flex items-end gap-1 p-2">
              <button
                onClick={() => setSidePanel(sidePanel ? null : "repos")}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/[0.04] shrink-0"
                style={{
                  color: sidePanel
                    ? "var(--accent-indigo)"
                    : "var(--text-ghost)",
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
    </div>
  );
}
