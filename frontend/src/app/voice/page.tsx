"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Settings,
  Loader2,
  Play,
  Square,
  AudioWaveform,
} from "lucide-react";

/* ─── Types ─── */

interface VoiceMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isVoice?: boolean;
}

interface VoiceEngine {
  id: string;
  name: string;
  description: string;
  free: boolean;
  configured: boolean;
}

interface EngineList {
  stt: VoiceEngine[];
  tts: VoiceEngine[];
}

/* ─── Component ─── */

export default function VoicePage() {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoTTS, setAutoTTS] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Engine state
  const [engines, setEngines] = useState<EngineList | null>(null);
  const [sttEngine, setSttEngine] = useState("groq_whisper");
  const [ttsEngine, setTtsEngine] = useState("edge_tts");
  const [ttsVoice, setTtsVoice] = useState("pt-BR-AntonioNeural");
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [language, setLanguage] = useState("pt");

  // Model state
  const [activeProvider, setActiveProvider] = useState("alibaba");
  const [activeModel, setActiveModel] = useState("qwen3-coder-plus");

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessageRef = useRef<(text: string, isVoice?: boolean) => void>(
    () => {},
  );

  // Recording timer
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load engines
  useEffect(() => {
    fetch(`${API_BASE}/api/voice/engines`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => setEngines(data))
      .catch(() => {});
  }, []);

  // Sync model from navbar
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

  // ─── TTS ───
  const playTTS = useCallback(
    async (text: string) => {
      try {
        const cleanText = text
          .replace(/```[\s\S]*?```/g, "")
          .replace(/[*_#>`~\[\]]/g, "")
          .replace(/\n+/g, " ")
          .trim()
          .slice(0, 2000);
        if (!cleanText) return;

        const formData = new FormData();
        formData.append("text", cleanText);
        formData.append("engine", ttsEngine);
        formData.append("voice", ttsVoice);
        formData.append("speed", String(ttsSpeed));
        const resp = await fetch(`${API_BASE}/api/voice/tts`, {
          method: "POST",
          headers: (() => {
            const h = getAuthHeaders();
            delete h["Content-Type"];
            return h;
          })(),
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
    },
    [ttsEngine, ttsVoice, ttsSpeed],
  );

  const stopTTS = useCallback(() => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // ─── STT: Recording ───
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
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(
        () => setRecordingTime((t) => t + 1),
        1000,
      );
    } catch {
      /* mic not available */
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") {
      setIsRecording(false);
      return;
    }

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        recorder.stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setIsRecording(false);
        if (blob.size === 0) {
          resolve();
          return;
        }
        setIsTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "recording.webm");
          fd.append("engine", sttEngine);
          fd.append("language", language);
          const resp = await fetch(`${API_BASE}/api/voice/stt`, {
            method: "POST",
            headers: (() => {
              const h = getAuthHeaders();
              delete h["Content-Type"];
              return h;
            })(),
            body: fd,
          });
          if (resp.ok) {
            const data = await resp.json();
            const text = data.text?.trim() || "";
            if (text) {
              sendMessageRef.current(text, true);
            }
          }
        } catch {
          /* silent */
        }
        setIsTranscribing(false);
        resolve();
      };
      recorder.stop();
    });
  }, [sttEngine, language]);

  // ─── Send message ───
  const sendMessage = useCallback(
    async (text: string, isVoice = false) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: VoiceMessage = {
        id: Date.now().toString(),
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
        isVoice,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsStreaming(true);

      const assistantMsg: VoiceMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      try {
        const res = await fetch(`${API_BASE}/api/chat/send`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            message: text.trim(),
            conversation_id: conversationId || undefined,
            stream: true,
            provider: activeProvider,
            model: activeModel,
          }),
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let fullResp = "";
          let inThink = false;

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
                  if (data.type === "start" && data.conversation_id)
                    setConversationId(data.conversation_id);
                  if (data.type === "token") {
                    const tk = data.content;
                    if (tk.includes("<think>")) {
                      inThink = true;
                    } else if (inThink && tk.includes("</think>")) {
                      inThink = false;
                      const after = tk.split("</think>")[1] || "";
                      if (after) fullResp += after;
                    } else if (!inThink) {
                      fullResp += tk;
                    }
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
          if (fullResp && autoTTS) playTTS(fullResp);
        } else {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant")
              last.content =
                "⚠️ Backend indisponível. Verifique se o servidor está rodando.";
            return updated;
          });
        }
      } catch {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") last.content = "⚠️ Erro de conexão.";
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [
      isStreaming,
      conversationId,
      activeProvider,
      activeModel,
      playTTS,
      autoTTS,
    ],
  );

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const handleSend = () => {
    if (input.trim()) sendMessage(input);
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
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const TTS_VOICES = [
    { id: "pt-BR-AntonioNeural", name: "Antonio (M)", lang: "pt-BR" },
    { id: "pt-BR-FranciscaNeural", name: "Francisca (F)", lang: "pt-BR" },
    { id: "en-US-GuyNeural", name: "Guy (M)", lang: "en-US" },
    { id: "en-US-JennyNeural", name: "Jenny (F)", lang: "en-US" },
    { id: "es-ES-AlvaroNeural", name: "Alvaro (M)", lang: "es-ES" },
  ];

  /* ─── RENDER ─── */
  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #6366f1, #ec4899)",
              boxShadow: "0 0 20px rgba(99,102,241,0.3)",
            }}
          >
            <AudioWaveform size={18} color="white" />
          </div>
          <div>
            <h1
              className="text-sm font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Voice Assistant
            </h1>
            <p className="text-[10px]" style={{ color: "var(--text-ghost)" }}>
              {isSpeaking
                ? "🔊 Falando..."
                : isRecording
                  ? "🎙️ Gravando..."
                  : isTranscribing
                    ? "⏳ Transcrevendo..."
                    : "Pronto"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoTTS(!autoTTS)}
            className="p-2 rounded-lg transition-all"
            style={{
              background: autoTTS
                ? "rgba(99,102,241,0.15)"
                : "rgba(255,255,255,0.04)",
              color: autoTTS ? "var(--accent-indigo)" : "var(--text-ghost)",
            }}
            title={autoTTS ? "TTS Ativo" : "TTS Desativado"}
          >
            {autoTTS ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg transition-all hover:bg-white/4"
            style={{
              color: showSettings
                ? "var(--accent-indigo)"
                : "var(--text-ghost)",
            }}
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div
          className="shrink-0 px-4 py-3 space-y-3 animate-fade-in"
          style={{
            background: "var(--bg-elevated)",
            borderBottom: "1px solid var(--glass-border)",
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* STT Engine */}
            <div>
              <label
                className="text-[10px] font-semibold uppercase tracking-wider mb-1 block"
                style={{ color: "var(--text-ghost)" }}
              >
                Motor STT
              </label>
              <select
                value={sttEngine}
                onChange={(e) => setSttEngine(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg text-[12px] border-none outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                }}
              >
                {engines?.stt.map((e) => (
                  <option key={e.id} value={e.id} disabled={!e.configured}>
                    {e.name} {e.free ? "(Free)" : ""}{" "}
                    {!e.configured ? "⚠️" : "✓"}
                  </option>
                )) || <option value="groq_whisper">Groq Whisper</option>}
              </select>
            </div>

            {/* TTS Engine */}
            <div>
              <label
                className="text-[10px] font-semibold uppercase tracking-wider mb-1 block"
                style={{ color: "var(--text-ghost)" }}
              >
                Motor TTS
              </label>
              <select
                value={ttsEngine}
                onChange={(e) => setTtsEngine(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg text-[12px] border-none outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                }}
              >
                {engines?.tts.map((e) => (
                  <option key={e.id} value={e.id} disabled={!e.configured}>
                    {e.name} {e.free ? "(Free)" : ""}{" "}
                    {!e.configured ? "⚠️" : "✓"}
                  </option>
                )) || <option value="edge_tts">Edge TTS</option>}
              </select>
            </div>

            {/* Voice */}
            <div>
              <label
                className="text-[10px] font-semibold uppercase tracking-wider mb-1 block"
                style={{ color: "var(--text-ghost)" }}
              >
                Voz
              </label>
              <select
                value={ttsVoice}
                onChange={(e) => setTtsVoice(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg text-[12px] border-none outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                }}
              >
                {TTS_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {v.lang}
                  </option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label
                className="text-[10px] font-semibold uppercase tracking-wider mb-1 block"
                style={{ color: "var(--text-ghost)" }}
              >
                Idioma STT
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg text-[12px] border-none outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="pt">Português</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>

          {/* Speed slider */}
          <div>
            <label
              className="text-[10px] font-semibold uppercase tracking-wider mb-1 block"
              style={{ color: "var(--text-ghost)" }}
            >
              Velocidade TTS: {ttsSpeed.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={ttsSpeed}
              onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
              className="w-full accent-[#6366f1]"
            />
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 animate-fade-in">
            <div className="relative">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center animate-float"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #ec4899)",
                  boxShadow: "0 0 40px rgba(99,102,241,0.3)",
                }}
              >
                <Mic size={36} color="white" strokeWidth={1.5} />
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "#10b981" }}
              >
                <Volume2 size={12} color="white" />
              </div>
            </div>
            <div className="text-center">
              <h2
                className="text-lg font-bold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                Voice Assistant
              </h2>
              <p
                className="text-[13px] max-w-sm"
                style={{ color: "var(--text-muted)" }}
              >
                Clique no microfone para gravar ou digite uma mensagem. As
                respostas serão lidas em voz alta automaticamente.
              </p>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs mt-2">
              {[
                { text: "O que você pode fazer?", icon: "🤖" },
                { text: "Me conte uma curiosidade", icon: "💡" },
                { text: "Traduza para inglês: Olá", icon: "🌍" },
                { text: "Que horas são agora?", icon: "🕐" },
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q.text)}
                  className="flex items-center gap-2 p-3 rounded-xl text-left transition-all hover:scale-[1.02]"
                  style={{
                    background: "var(--glass-bg)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <span className="text-base">{q.icon}</span>
                  <span
                    className="text-[11px] leading-tight"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {q.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "rounded-br-md" : "rounded-bl-md"}`}
                  style={{
                    background:
                      msg.role === "user"
                        ? "var(--accent-gradient)"
                        : "var(--glass-bg)",
                    border:
                      msg.role === "user"
                        ? "none"
                        : "1px solid var(--glass-border)",
                    color:
                      msg.role === "user" ? "white" : "var(--text-primary)",
                  }}
                >
                  {msg.role === "user" && msg.isVoice && (
                    <div className="flex items-center gap-1 mb-1 opacity-70">
                      <Mic size={10} />
                      <span className="text-[9px]">voz</span>
                    </div>
                  )}
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                    {msg.content || (
                      <span className="flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin" />
                        <span style={{ color: "var(--text-ghost)" }}>
                          Pensando...
                        </span>
                      </span>
                    )}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span
                      className="text-[9px]"
                      style={{
                        color:
                          msg.role === "user"
                            ? "rgba(255,255,255,0.5)"
                            : "var(--text-ghost)",
                      }}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {msg.role === "assistant" && msg.content && (
                      <button
                        onClick={() => {
                          if (isSpeaking) stopTTS();
                          else playTTS(msg.content);
                        }}
                        className="p-1 rounded-md transition-all hover:bg-white/6"
                        style={{
                          color: isSpeaking
                            ? "var(--accent-indigo)"
                            : "var(--text-ghost)",
                        }}
                        title="Ouvir"
                      >
                        {isSpeaking ? <Square size={12} /> : <Play size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div
          className="shrink-0 flex items-center justify-center gap-3 py-3 animate-fade-in"
          style={{
            background: "rgba(239,68,68,0.08)",
            borderTop: "1px solid rgba(239,68,68,0.15)",
          }}
        >
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-semibold" style={{ color: "#ef4444" }}>
            Gravando {formatTime(recordingTime)}
          </span>
          <button
            onClick={stopRecording}
            className="px-3 py-1 rounded-lg text-[12px] font-semibold"
            style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
          >
            Parar
          </button>
        </div>
      )}

      {/* Transcribing indicator */}
      {isTranscribing && (
        <div
          className="shrink-0 flex items-center justify-center gap-2 py-2 animate-fade-in"
          style={{
            background: "rgba(99,102,241,0.08)",
            borderTop: "1px solid rgba(99,102,241,0.15)",
          }}
        >
          <Loader2
            size={14}
            className="animate-spin"
            style={{ color: "var(--accent-indigo)" }}
          />
          <span
            className="text-[12px] font-medium"
            style={{ color: "var(--accent-indigo)" }}
          >
            Transcrevendo áudio...
          </span>
        </div>
      )}

      {/* Input area */}
      <div
        className="shrink-0 px-4 py-3"
        style={{
          borderTop: "1px solid var(--glass-border)",
          background: "var(--bg-surface)",
        }}
      >
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
        >
          {/* Mic button */}
          <button
            onClick={() => {
              if (isRecording) stopRecording();
              else startRecording();
            }}
            disabled={isTranscribing || isStreaming}
            className="shrink-0 p-2.5 rounded-xl transition-all"
            style={{
              background: isRecording
                ? "rgba(239,68,68,0.15)"
                : "rgba(99,102,241,0.1)",
              color: isRecording ? "#ef4444" : "var(--accent-indigo)",
              opacity: isTranscribing || isStreaming ? 0.4 : 1,
            }}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite ou use o microfone..."
            rows={1}
            className="flex-1 bg-transparent border-none outline-none resize-none text-[13px] leading-relaxed"
            style={{ color: "var(--text-primary)", maxHeight: "120px" }}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="shrink-0 p-2.5 rounded-xl transition-all"
            style={{
              background:
                input.trim() && !isStreaming
                  ? "var(--accent-gradient)"
                  : "rgba(255,255,255,0.04)",
              color:
                input.trim() && !isStreaming ? "white" : "var(--text-ghost)",
            }}
          >
            {isStreaming ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
