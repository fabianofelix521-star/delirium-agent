"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { API_BASE } from "@/lib/api";
import {
  Send,
  Paperclip,
  Plus,
  Sparkles,
  Loader2,
  Copy,
  RefreshCw,
  Code,
  Globe,
  BarChart3,
  Bug,
  Check,
  Terminal,
  FileText,
  Search,
  Zap,
  ChevronRight,
  Eye,
  ArrowDown,
} from "lucide-react";

interface AgentStep {
  id: string;
  type: "thinking" | "tool" | "search" | "code" | "result";
  label: string;
  content?: string;
  status: "running" | "done";
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  steps?: AgentStep[];
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState<Record<string, boolean>>({});
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState("alibaba");
  const [activeModel, setActiveModel] = useState("qwen3-coder-plus");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load existing conversation from URL param
  const loadConversation = useCallback((id: string) => {
    fetch(`${API_BASE}/api/chat/conversations/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setConversationId(data.id);
        const msgs: Message[] = data.messages.map(
          (m: { role: string; content: string }, i: number) => ({
            id: `${data.id}-${i}`,
            role: m.role as "user" | "assistant",
            content: m.content,
            timestamp: data.updated_at * 1000,
          }),
        );
        setMessages(msgs);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) loadConversation(id);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id === conversationId) {
        setMessages([]);
        setConversationId(null);
      }
    };
    window.addEventListener("delirium-conversation-deleted", handler);
    return () =>
      window.removeEventListener("delirium-conversation-deleted", handler);
  }, [searchParams, loadConversation, conversationId]);

  // Sync model selection from Navbar
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

    // Agent steps simulation
    const agentSteps: AgentStep[] = [
      {
        id: "s1",
        type: "thinking",
        label: "Analyzing request...",
        status: "running",
      },
    ];

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      steps: agentSteps,
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setShowSteps((prev) => ({ ...prev, [assistantMsg.id]: true }));

    try {
      const res = await fetch(`${API_BASE}/api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          conversation_id: conversationId || undefined,
          stream: true,
          provider: activeProvider,
          model: activeModel,
        }),
      });

      if (res.ok && res.body) {
        // Mark thinking as done, start streaming
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.steps) last.steps[0].status = "done";
          return updated;
        });

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
        // No backend connection fallback
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            last.content =
              "⚡ **Backend unavailable.** Start the backend server and configure an LLM provider in **Settings → APIs**.";
            if (last.steps) last.steps[0].status = "done";
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
            "⚡ **Cannot reach backend.** Make sure the server is running.";
          if (last.steps) last.steps[0].status = "done";
        }
        return updated;
      });
    } finally {
      window.dispatchEvent(new Event("delirium-conversation-update"));
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

  const getStepIcon = (type: string) => {
    switch (type) {
      case "thinking":
        return <Sparkles size={10} />;
      case "tool":
        return <Terminal size={10} />;
      case "search":
        return <Search size={10} />;
      case "code":
        return <Code size={10} />;
      case "result":
        return <Check size={10} />;
      default:
        return <Zap size={10} />;
    }
  };

  const suggestions = [
    {
      icon: Code,
      text: "Write a Python script",
      desc: "Code execution",
      color: "#6366f1",
    },
    {
      icon: Globe,
      text: "Search the web",
      desc: "Web browsing",
      color: "#06b6d4",
    },
    {
      icon: BarChart3,
      text: "Analyze this data",
      desc: "Data analysis",
      color: "#8b5cf6",
    },
    { icon: Bug, text: "Fix this error", desc: "Debugging", color: "#ec4899" },
    {
      icon: Terminal,
      text: "Run a command",
      desc: "Shell access",
      color: "#10b981",
    },
    {
      icon: FileText,
      text: "Read and edit files",
      desc: "File operations",
      color: "#f59e0b",
    },
  ];

  return (
    <div className="flex h-full relative">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-16 xl:px-24 py-4 relative"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full animate-fade-in">
              {/* Hero logo */}
              <div className="relative mb-8">
                <div
                  className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center animate-float relative"
                  style={{
                    background: "var(--accent-gradient)",
                    boxShadow: "var(--accent-glow-strong)",
                  }}
                >
                  <Sparkles size={30} color="white" strokeWidth={1.8} />
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)",
                    }}
                  />
                </div>
                <div
                  className="absolute -inset-5 rounded-3xl animate-pulse-glow"
                  style={{ border: "1px solid rgba(99,102,241,0.12)" }}
                />
              </div>

              <h2 className="text-2xl font-bold gradient-text mb-1 tracking-tight">
                What can I help with?
              </h2>
              <p
                className="text-[13px] mb-10"
                style={{ color: "var(--text-muted)" }}
              >
                I can code, browse the web, manage files, and much more.
              </p>

              {/* Suggestions grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 w-full max-w-2xl">
                {suggestions.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => setInput(s.text + "...")}
                      className="liquid-glass liquid-glass-hover p-3.5 text-left transition-all group"
                    >
                      <div className="flex items-center gap-2.5 relative z-10">
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

              {/* Capabilities bar */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-6 sm:mt-8">
                {[
                  { icon: "☁️", label: activeModel },
                  { icon: "⚡", label: "6 Tools" },
                  { icon: "🔗", label: "10 Integrations" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <span className="text-xs">{item.icon}</span>
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1 max-w-3xl mx-auto">
              {messages.map((msg) => (
                <div key={msg.id} className="animate-fade-in">
                  {msg.role === "user" ? (
                    /* User message */
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
                    /* Assistant message */
                    <div className="mb-6">
                      {/* Agent steps */}
                      {msg.steps && msg.steps.length > 0 && (
                        <div className="mb-2 ml-11">
                          <button
                            onClick={() =>
                              setShowSteps((p) => ({
                                ...p,
                                [msg.id]: !p[msg.id],
                              }))
                            }
                            className="flex items-center gap-1.5 text-[11px] font-medium mb-1.5 transition-colors hover:opacity-80"
                            style={{ color: "var(--text-ghost)" }}
                          >
                            <ChevronRight
                              size={11}
                              className={`transition-transform ${showSteps[msg.id] ? "rotate-90" : ""}`}
                            />
                            {
                              msg.steps.filter((s) => s.status === "done")
                                .length
                            }
                            /{msg.steps.length} steps
                            {msg.steps.some((s) => s.status === "running") && (
                              <Loader2
                                size={10}
                                className="animate-spin"
                                style={{ color: "var(--accent-indigo)" }}
                              />
                            )}
                          </button>
                          {showSteps[msg.id] && (
                            <div className="space-y-1 animate-fade-in">
                              {msg.steps.map((step) => (
                                <div
                                  key={step.id}
                                  className="flex items-center gap-2 py-0.5"
                                >
                                  <div
                                    className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                                    style={{
                                      background:
                                        step.status === "done"
                                          ? "rgba(16,185,129,0.1)"
                                          : "rgba(99,102,241,0.1)",
                                      color:
                                        step.status === "done"
                                          ? "var(--success)"
                                          : "var(--accent-indigo)",
                                    }}
                                  >
                                    {step.status === "running" ? (
                                      <Loader2
                                        size={10}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      getStepIcon(step.type)
                                    )}
                                  </div>
                                  <span
                                    className="text-[11px]"
                                    style={{
                                      color:
                                        step.status === "done"
                                          ? "var(--text-ghost)"
                                          : "var(--text-secondary)",
                                    }}
                                  >
                                    {step.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            background: "var(--accent-gradient)",
                            boxShadow: "0 2px 8px rgba(99,102,241,0.2)",
                          }}
                        >
                          <Sparkles size={14} color="white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="rounded-2xl rounded-bl-lg px-4 py-3 text-[13px] leading-relaxed relative"
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

                          {/* Message actions */}
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
                              <button
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium hover:bg-white/[0.04] transition-colors"
                                style={{ color: "var(--text-ghost)" }}
                              >
                                <RefreshCw size={11} /> Retry
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

          {/* Scroll to bottom FAB */}
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
        <div className="shrink-0 px-4 md:px-8 lg:px-16 xl:px-24 pb-4 pt-1">
          <div
            className="liquid-glass-solid relative overflow-visible"
            style={{ borderRadius: "var(--radius-2xl)" }}
          >
            {/* Input row */}
            <div className="flex items-end gap-1 p-2">
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
                placeholder="Message Delirium..."
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
                    ? "var(--accent-gradient)"
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

            {/* Bottom bar with capabilities */}
            <div className="flex items-center gap-2 px-3 pb-2 relative z-10">
              {[
                { icon: Code, label: "Code" },
                { icon: Globe, label: "Web" },
                { icon: Eye, label: "Vision" },
                { icon: Terminal, label: "Shell" },
              ].map((cap) => {
                const Icon = cap.icon;
                return (
                  <button
                    key={cap.label}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all hover:bg-white/[0.03]"
                    style={{ color: "var(--text-ghost)" }}
                  >
                    <Icon size={11} /> {cap.label}
                  </button>
                );
              })}
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
