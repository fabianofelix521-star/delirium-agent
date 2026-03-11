"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, Settings2, Wand2, AudioLines, Phone, PhoneOff } from "lucide-react";

export default function VoicePage() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [response, setResponse] = useState("");
    const [mode, setMode] = useState<"push" | "always">("push");
    const [elapsed, setElapsed] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

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

            // Draw circular waveform
            const rings = 3;
            for (let r = 0; r < rings; r++) {
                const baseRadius = isListening ? 30 + r * 18 : 20 + r * 12;
                const points = 128;
                ctx.beginPath();
                for (let i = 0; i <= points; i++) {
                    const angle = (i / points) * Math.PI * 2;
                    const noise = isListening
                        ? Math.sin(angle * 8 + time * 3 + r) * (8 + Math.random() * 12) + Math.sin(angle * 3 + time * 2) * 6
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

    useEffect(() => {
        if (isListening) {
            setElapsed(0);
            timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isListening]);

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

    const toggleListening = () => {
        setIsListening(!isListening);
        if (!isListening) {
            setTranscript("");
            setResponse("");
            setTimeout(() => setTranscript("Olá, como você está?"), 2000);
            setTimeout(() => {
                setIsListening(false);
                setResponse("Estou ótimo! Sou o Delirium Infinite. Como posso ajudar?");
            }, 4000);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full px-4 animate-fade-in">
            {/* Header */}
            <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <AudioLines size={18} style={{ color: "var(--accent-violet)" }} />
                    <h1 className="text-xl font-bold gradient-text">Voice Mode</h1>
                </div>
                <p className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                    {isListening ? `Listening · ${formatTime(elapsed)}` : "Tap to start a voice conversation"}
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
                {/* Center button overlay */}
                <button
                    onClick={toggleListening}
                    className="absolute inset-0 m-auto w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 z-10"
                    style={{
                        background: isListening ? "var(--accent-gradient)" : "var(--bg-elevated)",
                        border: `2px solid ${isListening ? "rgba(99,102,241,0.4)" : "var(--glass-border)"}`,
                        boxShadow: isListening ? "var(--accent-glow-strong)" : "var(--glass-shadow)",
                    }}
                >
                    {isListening ? <PhoneOff size={22} color="white" /> : <Mic size={22} style={{ color: "var(--text-muted)" }} />}
                </button>
                {isListening && (
                    <div className="absolute inset-0 m-auto w-16 h-16 rounded-full animate-pulse-glow" style={{ border: "1px solid rgba(99,102,241,0.15)" }} />
                )}
            </div>

            {/* Mode toggle */}
            <div className="liquid-glass flex rounded-xl overflow-hidden p-1 mb-6" style={{ borderRadius: "var(--radius-xl)" }}>
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
                        <p className="text-[9px] uppercase tracking-widest font-semibold mb-1 relative z-10" style={{ color: "var(--text-ghost)" }}>
                            You said
                        </p>
                        <p className="text-[13px] relative z-10" style={{ color: "var(--text-primary)" }}>{transcript}</p>
                    </div>
                )}
                {response && (
                    <div className="liquid-glass liquid-glass-accent p-3.5 animate-fade-in">
                        <p className="text-[9px] uppercase tracking-widest font-semibold mb-1 relative z-10" style={{ color: "var(--accent-violet)" }}>
                            Delirium
                        </p>
                        <p className="text-[13px] relative z-10" style={{ color: "var(--text-primary)" }}>{response}</p>
                    </div>
                )}
            </div>

            {/* Voice settings */}
            <div className="mt-6 liquid-glass p-4 w-full max-w-md">
                <h3 className="text-[11px] font-semibold mb-3 flex items-center gap-2 relative z-10" style={{ color: "var(--text-secondary)" }}>
                    <Settings2 size={12} /> Voice Settings
                </h3>
                <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Voice Engine</span>
                        <select className="input-glass text-[11px] py-1 px-2">
                            <option>Edge TTS (Free)</option>
                            <option>Coqui TTS (Free)</option>
                            <option>Piper TTS (Free)</option>
                            <option>ElevenLabs</option>
                        </select>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Voice</span>
                        <select className="input-glass text-[11px] py-1 px-2">
                            <option>Antonio (PT-BR)</option>
                            <option>Francisca (PT-BR)</option>
                            <option>Guy (EN-US)</option>
                            <option>Jenny (EN-US)</option>
                        </select>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                                <Volume2 size={11} /> Speed
                            </span>
                            <span className="text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>1.0x</span>
                        </div>
                        <input type="range" min="0.5" max="2" step="0.1" defaultValue="1"
                            className="w-full h-1 rounded-lg appearance-none cursor-pointer"
                            style={{ background: "var(--bg-elevated)", accentColor: "var(--accent-indigo)" }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
