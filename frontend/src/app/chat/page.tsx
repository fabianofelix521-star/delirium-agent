"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
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
  Mic,
  MicOff,
  Volume2,
  VolumeX,
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

function ChatPageInner() {
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

  // ─── Voice state ──────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const sendVoiceMessageRef = useRef<(text: string) => void>(undefined);
  const [activeModes, setActiveModes] = useState<Set<string>>(new Set());
  const suggestionTextRef = useRef<string>("");

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

  // ─── Voice: TTS playback ──────────────────────
  const playTTS = useCallback(async (text: string) => {
    try {
      const formData = new FormData();
      formData.append("text", text.slice(0, 1000));
      formData.append("engine", "edge_tts");
      formData.append("voice", "pt-BR-AntonioNeural");
      formData.append("speed", "1.0");
      const resp = await fetch(`${API_BASE}/api/voice/tts`, {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) return;
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      setIsSpeaking(false);
    }
  }, []);

  const stopTTS = useCallback(() => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // ─── Voice: Start recording ───────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) return;
        // STT
        setIsTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "recording.webm");
          fd.append("engine", "groq_whisper");
          fd.append("language", "pt");
          const resp = await fetch(`${API_BASE}/api/voice/stt`, {
            method: "POST",
            body: fd,
          });
          if (resp.ok) {
            const data = await resp.json();
            const text = data.text?.trim() || "";
            if (text) {
              setInput(text);
              // Auto-send after a short delay so user sees what was transcribed
              setTimeout(() => {
                setInput("");
                sendVoiceMessageRef.current?.(text);
              }, 400);
            }
          }
        } catch {
          /* silent */
        }
        setIsTranscribing(false);
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setVoiceEnabled(true);
    } catch (err) {
      console.error("Mic denied:", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording")
      mediaRecorderRef.current.stop();
    setIsRecording(false);
  }, []);

  // ─── Voice: Send transcribed message (reuses handleSend logic with TTS) ───
  const sendVoiceMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        steps: [
          {
            id: "s1",
            type: "thinking",
            label: "Analyzing...",
            status: "running",
          },
        ],
      };
      setMessages((prev) => [...prev, assistantMsg]);

      try {
        const modePrefix =
          activeModes.size > 0
            ? `[Active modes: ${Array.from(activeModes).join(", ")}] `
            : "";
        const res = await fetch(`${API_BASE}/api/chat/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: modePrefix + text,
            conversation_id: conversationId || undefined,
            stream: true,
            provider: activeProvider,
            model: activeModel,
          }),
        });
        if (res.ok && res.body) {
          setMessages((prev) => {
            const u = [...prev];
            const l = u[u.length - 1];
            if (l.steps) l.steps[0].status = "done";
            return u;
          });
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let fullResp = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const d = JSON.parse(line.slice(6));
                  if (d.type === "start" && d.conversation_id)
                    setConversationId(d.conversation_id);
                  if (d.type === "token") {
                    fullResp += d.content;
                    setMessages((prev) => {
                      const u = [...prev];
                      const l = u[u.length - 1];
                      if (l.role === "assistant") l.content = fullResp;
                      return u;
                    });
                  }
                } catch {
                  /* skip */
                }
              }
            }
          }
          // Auto-play TTS for voice messages
          if (fullResp) playTTS(fullResp);
        }
      } catch {
        /* silent */
      }
      window.dispatchEvent(new Event("delirium-conversation-update"));
      setIsStreaming(false);
    },
    [
      isStreaming,
      conversationId,
      activeProvider,
      activeModel,
      playTTS,
      activeModes,
    ],
  );

  // Keep ref in sync so startRecording always calls current version
  useEffect(() => {
    sendVoiceMessageRef.current = sendVoiceMessage;
  }, [sendVoiceMessage]);

  const handleSendDirect = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
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
      const modePrefix =
        activeModes.size > 0
          ? `[Active modes: ${Array.from(activeModes).join(", ")}] `
          : "";
      const res = await fetch(`${API_BASE}/api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: modePrefix + text.trim(),
          conversation_id: conversationId || undefined,
          stream: true,
          provider: activeProvider,
          model: activeModel,
        }),
      });

      if (res.ok && res.body) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.steps) last.steps[0].status = "done";
          return updated;
        });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullResp = "";

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
                  fullResp += data.content;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant") last.content = fullResp;
                    return updated;
                  });
                }
              } catch {
                /* skip */
              }
            }
          }
        }
        if (voiceEnabled && fullResp) playTTS(fullResp);
      } else {
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

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    await handleSendDirect(input);
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
      text: "Write a Python script to scrape a website",
      desc: "Code execution",
      color: "#6366f1",
    },
    {
      icon: Globe,
      text: "Search the web for the latest AI news",
      desc: "Web browsing",
      color: "#06b6d4",
    },
    {
      icon: BarChart3,
      text: "Analyze and visualize data from a CSV file",
      desc: "Data analysis",
      color: "#8b5cf6",
    },
    {
      icon: Bug,
      text: "Debug and fix this error in my code",
      desc: "Debugging",
      color: "#ec4899",
    },
    {
      icon: Terminal,
      text: "Run shell commands to set up a project",
      desc: "Shell access",
      color: "#10b981",
    },
    {
      icon: FileText,
      text: "Create a full project structure with files",
      desc: "File operations",
      color: "#f59e0b",
    },
  ];

  const handleSuggestionClick = (text: string) => {
    setInput(text);
    // Use ref to pass text directly since state won't be updated yet
    suggestionTextRef.current = text;
    requestAnimationFrame(() => {
      handleSendDirect(suggestionTextRef.current);
      suggestionTextRef.current = "";
    });
  };

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
                      onClick={() => handleSuggestionClick(s.text)}
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
              {/* Mic button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isStreaming || isTranscribing}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 disabled:opacity-30 ${isRecording ? "animate-pulse" : ""}`}
                style={{
                  background: isRecording
                    ? "linear-gradient(135deg, #ef4444, #dc2626)"
                    : isTranscribing
                      ? "var(--bg-elevated)"
                      : "var(--bg-elevated)",
                  color: isRecording ? "white" : "var(--text-ghost)",
                  border: isRecording
                    ? "none"
                    : "1px solid var(--glass-border)",
                  boxShadow: isRecording
                    ? "0 2px 12px rgba(239,68,68,0.3)"
                    : "none",
                }}
                title={
                  isRecording
                    ? "Stop recording"
                    : isTranscribing
                      ? "Transcribing..."
                      : "Voice message"
                }
              >
                {isTranscribing ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : isRecording ? (
                  <MicOff size={15} />
                ) : (
                  <Mic size={15} />
                )}
              </button>
              {/* TTS stop button */}
              {isSpeaking && (
                <button
                  onClick={stopTTS}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0"
                  style={{
                    background: "rgba(139,92,246,0.15)",
                    color: "var(--accent-violet)",
                  }}
                  title="Stop speaking"
                >
                  <VolumeX size={15} />
                </button>
              )}
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
                const isActive = activeModes.has(cap.label);
                return (
                  <button
                    key={cap.label}
                    onClick={() =>
                      setActiveModes((prev) => {
                        const next = new Set(prev);
                        if (next.has(cap.label)) next.delete(cap.label);
                        else next.add(cap.label);
                        return next;
                      })
                    }
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${isActive ? "" : "hover:bg-white/[0.03]"}`}
                    style={{
                      color: isActive
                        ? "var(--accent-indigo)"
                        : "var(--text-ghost)",
                      background: isActive
                        ? "rgba(99,102,241,0.1)"
                        : "transparent",
                      border: isActive
                        ? "1px solid rgba(99,102,241,0.2)"
                        : "1px solid transparent",
                    }}
                  >
                    <Icon size={11} /> {cap.label}
                  </button>
                );
              })}
              <button
                onClick={() => setVoiceEnabled((v) => !v)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${voiceEnabled ? "" : "hover:bg-white/[0.03]"}`}
                style={{
                  color: voiceEnabled
                    ? "var(--accent-violet)"
                    : "var(--text-ghost)",
                  background: voiceEnabled
                    ? "rgba(139,92,246,0.1)"
                    : "transparent",
                  border: voiceEnabled
                    ? "1px solid rgba(139,92,246,0.2)"
                    : "1px solid transparent",
                }}
                title={voiceEnabled ? "Disable auto TTS" : "Enable auto TTS"}
              >
                {voiceEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
                {voiceEnabled ? "TTS On" : "TTS"}
              </button>
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

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex-1 flex items-center justify-center"
          style={{ background: "var(--bg-void)" }}
        >
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{
              borderColor: "var(--accent-primary)",
              borderTopColor: "transparent",
            }}
          />
        </div>
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}
