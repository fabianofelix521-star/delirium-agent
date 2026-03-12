"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic,
  Settings2,
  AudioLines,
  PhoneOff,
  Loader2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

interface VoiceSettings {
  sttEngine: string;
  ttsEngine: string;
  voice: string;
  speed: number;
  language: string;
}

const STORAGE_KEY = "delirium_voice_settings";

function loadSettings(): VoiceSettings {
  if (typeof window === "undefined")
    return {
      sttEngine: "groq_whisper",
      ttsEngine: "edge_tts",
      voice: "pt-BR-AntonioNeural",
      speed: 1,
      language: "pt",
    };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {
    sttEngine: "groq_whisper",
    ttsEngine: "edge_tts",
    voice: "pt-BR-AntonioNeural",
    speed: 1,
    language: "pt",
  };
}

function saveSettings(s: VoiceSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

interface EngineInfo {
  id: string;
  name: string;
  description?: string;
  free?: boolean;
  configured?: boolean;
}

interface VoiceInfo {
  id: string;
  name: string;
  language: string;
  engine?: string;
}

export default function VoicePage() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [settings, setSettings] = useState<VoiceSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [engines, setEngines] = useState<{
    stt: EngineInfo[];
    tts: EngineInfo[];
    voices: VoiceInfo[];
  }>({ stt: [], tts: [], voices: [] });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch engines from backend
  useEffect(() => {
    fetch(`${API_BASE}/api/voice/engines`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data)
          setEngines({
            stt: data.stt || [],
            tts: data.tts || [],
            voices: data.voices || [],
          });
      })
      .catch(() => {});
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
        const baseRadius =
          isListening || isSpeaking ? 30 + r * 18 : 20 + r * 12;
        const points = 128;
        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const noise =
            isListening || isSpeaking
              ? Math.sin(angle * 8 + time * 3 + r) * (8 + Math.random() * 12) +
                Math.sin(angle * 3 + time * 2) * 6
              : Math.sin(angle * 4 + time * 0.8 + r) * 2;
          const radius = baseRadius + noise;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        const alpha =
          isListening || isSpeaking ? 0.5 - r * 0.12 : 0.12 - r * 0.03;
        const hue = isSpeaking ? 280 + r * 15 : 245 + r * 15;
        ctx.strokeStyle = `hsla(${hue}, 80%, 65%, ${alpha})`;
        ctx.lineWidth = isListening || isSpeaking ? 2 - r * 0.3 : 1;
        ctx.stroke();
        if ((isListening || isSpeaking) && r === 0) {
          ctx.fillStyle = `hsla(${hue}, 80%, 65%, 0.03)`;
          ctx.fill();
        }
      }
      animationRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationRef.current);
  }, [isListening, isSpeaking]);

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

  // Play TTS audio
  const playTTS = useCallback(
    async (text: string) => {
      setIsSpeaking(true);
      try {
        const formData = new FormData();
        formData.append("text", text);
        formData.append("engine", settings.ttsEngine);
        formData.append("voice", settings.voice);
        formData.append("speed", String(settings.speed));

        const resp = await fetch(`${API_BASE}/api/voice/tts`, {
          method: "POST",
          body: formData,
        });

        if (!resp.ok) {
          setIsSpeaking(false);
          return;
        }

        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

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
    [settings],
  );

  // Get AI response
  const getAIResponse = useCallback(
    async (text: string) => {
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
          body: JSON.stringify({
            message: text,
            provider,
            model,
            stream: true,
          }),
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
        if (fullResponse) {
          playTTS(fullResponse.slice(0, 1000));
        } else {
          setResponse("No response from AI.");
        }
      } catch {
        setResponse("Error: could not connect to backend.");
      } finally {
        setIsProcessing(false);
      }
    },
    [playTTS],
  );

  // Send audio to backend STT
  const sendToSTT = useCallback(
    async (audioBlob: Blob) => {
      setIsProcessing(true);
      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        formData.append("engine", settings.sttEngine);
        formData.append("language", settings.language);

        const resp = await fetch(`${API_BASE}/api/voice/stt`, {
          method: "POST",
          body: formData,
        });

        if (!resp.ok) {
          const err = await resp.text();
          setTranscript(`STT Error: ${err}`);
          setIsProcessing(false);
          return;
        }

        const data = await resp.json();
        const text = data.text || "";
        setTranscript(text);

        if (text.trim()) {
          await getAIResponse(text);
        } else {
          setIsProcessing(false);
        }
      } catch (err) {
        setTranscript(`Error: ${err}`);
        setIsProcessing(false);
      }
    },
    [settings, getAIResponse],
  );

  // Start recording
  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) sendToSTT(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsListening(true);
      setTranscript("");
      setResponse("");
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }, [sendToSTT]);

  // Stop recording
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const toggleListening = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (isListening) {
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

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <AudioLines size={18} style={{ color: "var(--accent-violet)" }} />
          <h1 className="text-xl font-bold gradient-text">Voice Mode</h1>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="ml-2 p-1.5 rounded-lg hover:opacity-80"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <Settings2 size={14} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>
        <p
          className="text-[11px] font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          {isSpeaking
            ? "Speaking..."
            : isProcessing
              ? "Processing..."
              : isListening
                ? `Recording · ${formatTime(elapsed)}`
                : "Tap to start"}
        </p>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div
          className="w-full max-w-sm mb-6 p-4 rounded-xl animate-fade-in"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <h3
            className="text-[13px] font-semibold mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            Voice Settings
          </h3>

          {/* STT Engine */}
          <div className="mb-3">
            <label
              className="text-[11px] font-medium mb-1 block"
              style={{ color: "var(--text-muted)" }}
            >
              STT Engine (Speech → Text)
            </label>
            <select
              value={settings.sttEngine}
              onChange={(e) => updateSetting("sttEngine", e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-[12px]"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              {engines.stt.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} {e.configured ? "✓" : e.free ? "" : "(needs key)"}
                </option>
              ))}
            </select>
          </div>

          {/* TTS Engine */}
          <div className="mb-3">
            <label
              className="text-[11px] font-medium mb-1 block"
              style={{ color: "var(--text-muted)" }}
            >
              TTS Engine (Text → Speech)
            </label>
            <select
              value={settings.ttsEngine}
              onChange={(e) => updateSetting("ttsEngine", e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-[12px]"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              {engines.tts.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} {e.configured ? "✓" : e.free ? "" : "(needs key)"}
                </option>
              ))}
            </select>
          </div>

          {/* Voice */}
          <div className="mb-3">
            <label
              className="text-[11px] font-medium mb-1 block"
              style={{ color: "var(--text-muted)" }}
            >
              Voice
            </label>
            <select
              value={settings.voice}
              onChange={(e) => updateSetting("voice", e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-[12px]"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              {engines.voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.language})
                </option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div className="mb-3">
            <label
              className="text-[11px] font-medium mb-1 block"
              style={{ color: "var(--text-muted)" }}
            >
              Language (STT)
            </label>
            <select
              value={settings.language}
              onChange={(e) => updateSetting("language", e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-[12px]"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <option value="pt">Portugues</option>
              <option value="en">English</option>
              <option value="es">Espanol</option>
            </select>
          </div>

          {/* Speed */}
          <div>
            <label
              className="text-[11px] font-medium mb-1 block"
              style={{ color: "var(--text-muted)" }}
            >
              Speed: {settings.speed.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.speed}
              onChange={(e) =>
                updateSetting("speed", parseFloat(e.target.value))
              }
              className="w-full"
            />
          </div>

          <p
            className="text-[10px] mt-3"
            style={{ color: "var(--text-muted)" }}
          >
            Configure API keys in Settings → APIs (GROQ_API_KEY, OPENAI_API_KEY,
            ELEVENLABS_API_KEY)
          </p>
        </div>
      )}

      {/* Circular Waveform */}
      <div className="relative mb-6">
        <canvas
          ref={canvasRef}
          className="rounded-full"
          style={{
            width: 200,
            height: 200,
            filter:
              isListening || isSpeaking ? "brightness(1.3)" : "brightness(0.6)",
            transition: "filter 0.5s ease",
          }}
        />
        <button
          onClick={toggleListening}
          disabled={isProcessing}
          className="absolute inset-0 m-auto w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 z-10 disabled:opacity-50"
          style={{
            background:
              isListening || isSpeaking
                ? "var(--accent-gradient)"
                : "var(--bg-elevated)",
            border: `2px solid ${isListening || isSpeaking ? "rgba(99,102,241,0.4)" : "var(--glass-border)"}`,
            boxShadow:
              isListening || isSpeaking
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
          ) : isSpeaking ? (
            <VolumeX size={22} color="white" />
          ) : isListening ? (
            <PhoneOff size={22} color="white" />
          ) : (
            <Mic size={22} style={{ color: "var(--text-muted)" }} />
          )}
        </button>
        {(isListening || isSpeaking) && (
          <div
            className="absolute inset-0 m-auto w-16 h-16 rounded-full animate-pulse-glow"
            style={{
              border: "1px solid rgba(99,102,241,0.15)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Transcript */}
      {transcript && (
        <div
          className="w-full max-w-md mb-4 p-4 rounded-xl animate-fade-in"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Mic size={12} style={{ color: "var(--accent-indigo)" }} />
            <span
              className="text-[11px] font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              You said:
            </span>
          </div>
          <p className="text-[13px]" style={{ color: "var(--text-primary)" }}>
            {transcript}
          </p>
        </div>
      )}

      {/* AI Response */}
      {response && (
        <div
          className="w-full max-w-md p-4 rounded-xl animate-fade-in"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Volume2 size={12} style={{ color: "var(--accent-violet)" }} />
            <span
              className="text-[11px] font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              AI Response:
            </span>
            {!isSpeaking && response && (
              <button
                onClick={() => playTTS(response.slice(0, 1000))}
                className="ml-auto p-1 rounded hover:opacity-80"
                style={{ color: "var(--accent-indigo)" }}
                title="Replay audio"
              >
                <Volume2 size={12} />
              </button>
            )}
          </div>
          <p
            className="text-[13px] whitespace-pre-wrap"
            style={{ color: "var(--text-primary)" }}
          >
            {response}
          </p>
        </div>
      )}
    </div>
  );
}
