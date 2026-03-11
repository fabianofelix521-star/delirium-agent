"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic,
  Volume2,
  Settings2,
  AudioLines,
  PhoneOff,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

interface VoiceSettings {
  ttsEngine: string;
  voice: string;
  speed: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

const STORAGE_KEY = "delirium_voice_settings";

function loadSettings(): VoiceSettings {
  if (typeof window === "undefined")
    return { ttsEngine: "edge_tts", voice: "pt-BR-AntonioNeural", speed: 1 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { ttsEngine: "edge_tts", voice: "pt-BR-AntonioNeural", speed: 1 };
}

function saveSettings(s: VoiceSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const W = window as any;
  return W.SpeechRecognition || W.webkitSpeechRecognition || null;
}

export default function VoicePage() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [mode, setMode] = useState<"push" | "always">("push");
  const [elapsed, setElapsed] = useState(0);
  const [supported, setSupported] = useState(true);
  const [settings, setSettings] = useState<VoiceSettings>(loadSettings);
  const [engines, setEngines] = useState<{
    tts: { id: string; name: string }[];
    voices: { id: string; name: string }[];
  }>({
    tts: [{ id: "edge_tts", name: "Edge TTS (Free)" }],
    voices: [{ id: "pt-BR-AntonioNeural", name: "Antonio (PT-BR)" }],
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const recognitionRef = useRef<SpeechRecognitionInstance>(null);

  // Check browser support
  useEffect(() => {
    setSupported(!!getSpeechRecognition());
  }, []);

  // Fetch engines from backend
  useEffect(() => {
    fetch(`${API_BASE}/api/voice/engines`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setEngines({ tts: data.tts, voices: data.voices });
      })
      .catch(() => {
        /* keep defaults */
      });
  }, []);

  // Canvas waveform animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    let time = 0;
    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      time += 0.016;
      const cx = w / 2;
      const cy = h / 2;
      const rings = 3;
      for (let r = 0; r < rings; r++) {
        const baseRadius = isListening ? 30 + r * 18 : 20 + r * 12;
        const points = 128;
        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const noise = isListening
            ? Math.sin(angle * 8 + time * 3 + r) * (8 + Math.random() * 12) +
              Math.sin(angle * 3 + time * 2) * 6
            : Math.sin(angle * 4 + time * 0.8 + r) * 2;
          const radius = baseRadius + noise;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        const alpha = isListening ? 0.5 - r * 0.12 : 0.12 - r * 0.03;
        const hue = 245 + r * 15;
        ctx.strokeStyle = `hsla(${hue}, 80%, 65%, ${alpha})`;
        ctx.lineWidth = isListening ? 2 - r * 0.3 : 1;
        ctx.stroke();
        if (isListening && r === 0) {
          ctx.fillStyle = `hsla(${hue}, 80%, 65%, 0.03)`;
          ctx.fill();
        }
      }
      animationRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationRef.current);
  }, [isListening]);

  // Timer
  useEffect(() => {
    if (isListening) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isListening]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // Send transcript to AI and get response
  const getAIResponse = useCallback(async (text: string) => {
    setIsProcessing(true);
    setResponse("");
    try {
      const token = localStorage.getItem("delirium_token");
      const provider =
        localStorage.getItem("delirium_default_provider") || undefined;
      const model =
        localStorage.getItem("delirium_selected_model") || undefined;
      const res = await fetch(`${API_BASE}/api/chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text, provider, model, stream: true }),
      });
      if (!res.ok || !res.body) {
        setResponse("Error: could not reach AI backend.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.type === "content" && parsed.content) {
                fullResponse += parsed.content;
                setResponse(fullResponse);
              }
            } catch {
              /* skip */
            }
          }
        }
      }
      if (!fullResponse) setResponse("No response from AI.");
    } catch {
      setResponse("Error: could not connect to backend.");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    setTranscript("");
    setResponse("");
    setIsListening(true);

    const recognition = new SpeechRecognition();
    recognition.lang = settings.voice.startsWith("pt") ? "pt-BR" : "en-US";
    recognition.continuous = mode === "always";
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    let finalTranscript = "";

    recognition.onresult = (event: {
      resultIndex: number;
      results: {
        length: number;
        [index: number]: {
          isFinal: boolean;
          [index: number]: { transcript: string };
        };
      };
    }) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          finalTranscript += r[0].transcript;
        } else {
          interim += r[0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      const text = finalTranscript.trim();
      if (text) {
        getAIResponse(text);
      }
    };

    recognition.onerror = (event: { error: string }) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.error("Speech recognition error:", event.error);
      }
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
  }, [settings.voice, mode, getAIResponse]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const updateSetting = <K extends keyof VoiceSettings>(
    key: K,
    value: VoiceSettings[K],
  ) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  };

  if (!supported) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 animate-fade-in">
        <div className="liquid-glass p-6 max-w-md text-center">
          <AlertTriangle
            size={32}
            style={{ color: "var(--accent-amber)", margin: "0 auto 12px" }}
          />
          <h2
            className="text-lg font-bold mb-2 relative z-10"
            style={{ color: "var(--text-primary)" }}
          >
            Speech Recognition Not Available
          </h2>
          <p
            className="text-[12px] relative z-10"
            style={{ color: "var(--text-muted)" }}
          >
            Your browser does not support the Web Speech API. Use Chrome, Edge,
            or Safari for voice features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <AudioLines size={18} style={{ color: "var(--accent-violet)" }} />
          <h1 className="text-xl font-bold gradient-text">Voice Mode</h1>
        </div>
        <p
          className="text-[11px] font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          {isProcessing
            ? "Processing response..."
            : isListening
              ? `Listening · ${formatTime(elapsed)}`
              : "Tap to start a voice conversation"}
        </p>
      </div>

      {/* Circular Waveform */}
      <div className="relative mb-6">
        <canvas
          ref={canvasRef}
          className="rounded-full"
          style={{
            width: 200,
            height: 200,
            filter: isListening ? "brightness(1.3)" : "brightness(0.6)",
            transition: "filter 0.5s ease",
          }}
        />
        <button
          onClick={toggleListening}
          disabled={isProcessing}
          className="absolute inset-0 m-auto w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 z-10 disabled:opacity-50"
          style={{
            background: isListening
              ? "var(--accent-gradient)"
              : "var(--bg-elevated)",
            border: `2px solid ${isListening ? "rgba(99,102,241,0.4)" : "var(--glass-border)"}`,
            boxShadow: isListening
              ? "var(--accent-glow-strong)"
              : "var(--glass-shadow)",
          }}
        >
          {isProcessing ? (
            <Loader2
              size={22}
              className="animate-spin"
              style={{ color: "var(--accent-indigo)" }}
            />
          ) : isListening ? (
            <PhoneOff size={22} color="white" />
          ) : (
            <Mic size={22} style={{ color: "var(--text-muted)" }} />
          )}
        </button>
        {isListening && (
          <div
            className="absolute inset-0 m-auto w-16 h-16 rounded-full animate-pulse-glow"
            style={{ border: "1px solid rgba(99,102,241,0.15)" }}
          />
        )}
      </div>

      {/* Mode toggle */}
      <div
        className="liquid-glass flex rounded-xl overflow-hidden p-1 mb-6"
        style={{ borderRadius: "var(--radius-xl)" }}
      >
        {(["push", "always"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-5 py-2 rounded-lg text-[11px] font-semibold transition-all relative z-10"
            style={{
              background: mode === m ? "rgba(99,102,241,0.12)" : "transparent",
              color: mode === m ? "var(--accent-indigo)" : "var(--text-ghost)",
            }}
          >
            {m === "push" ? "Push to Talk" : "Always Listening"}
          </button>
        ))}
      </div>

      {/* Transcript & Response */}
      <div className="w-full max-w-md space-y-2.5">
        {transcript && (
          <div className="liquid-glass p-3.5 animate-fade-in">
            <p
              className="text-[9px] uppercase tracking-widest font-semibold mb-1 relative z-10"
              style={{ color: "var(--text-ghost)" }}
            >
              You said
            </p>
            <p
              className="text-[13px] relative z-10"
              style={{ color: "var(--text-primary)" }}
            >
              {transcript}
            </p>
          </div>
        )}
        {response && (
          <div className="liquid-glass liquid-glass-accent p-3.5 animate-fade-in">
            <p
              className="text-[9px] uppercase tracking-widest font-semibold mb-1 relative z-10"
              style={{ color: "var(--accent-violet)" }}
            >
              Delirium
            </p>
            <p
              className="text-[13px] relative z-10 whitespace-pre-wrap"
              style={{ color: "var(--text-primary)" }}
            >
              {response}
            </p>
          </div>
        )}
      </div>

      {/* Voice settings */}
      <div className="mt-6 liquid-glass p-4 w-full max-w-md">
        <h3
          className="text-[11px] font-semibold mb-3 flex items-center gap-2 relative z-10"
          style={{ color: "var(--text-secondary)" }}
        >
          <Settings2 size={12} /> Voice Settings
        </h3>
        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <span
              className="text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              TTS Engine
            </span>
            <select
              className="input-glass text-[11px] py-1 px-2"
              value={settings.ttsEngine}
              onChange={(e) => updateSetting("ttsEngine", e.target.value)}
            >
              {engines.tts.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span
              className="text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              Voice
            </span>
            <select
              className="input-glass text-[11px] py-1 px-2"
              value={settings.voice}
              onChange={(e) => updateSetting("voice", e.target.value)}
            >
              {engines.voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="text-[11px] flex items-center gap-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                <Volume2 size={11} /> Speed
              </span>
              <span
                className="text-[11px] font-mono"
                style={{ color: "var(--text-secondary)" }}
              >
                {settings.speed.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.speed}
              onChange={(e) =>
                updateSetting("speed", parseFloat(e.target.value))
              }
              className="w-full h-1 rounded-lg appearance-none cursor-pointer"
              style={{
                background: "var(--bg-elevated)",
                accentColor: "var(--accent-indigo)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
