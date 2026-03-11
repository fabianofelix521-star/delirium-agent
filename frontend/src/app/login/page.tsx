"use client";

import { useState } from "react";
import { Sparkles, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { API_BASE } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Credenciais inválidas");
      }
      const data = await res.json();
      localStorage.setItem("delirium_token", data.access_token);
      window.location.href = "/chat";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "var(--bg-void)" }}
    >
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)",
            filter: "blur(80px)",
            animation: "orbFloat 15s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)",
            filter: "blur(80px)",
            animation: "orbFloat 20s ease-in-out infinite reverse",
          }}
        />
      </div>

      <div className="w-full max-w-sm px-6 animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center animate-float"
              style={{
                background: "var(--accent-gradient)",
                boxShadow: "var(--accent-glow-strong)",
              }}
            >
              <Sparkles size={28} color="white" strokeWidth={1.8} />
            </div>
            <div
              className="absolute -inset-3 rounded-3xl animate-pulse-glow"
              style={{ border: "1px solid rgba(99,102,241,0.15)" }}
            />
          </div>
          <h1 className="text-2xl font-bold gradient-text tracking-tight">
            DELIRIUM INFINITE
          </h1>
          <p
            className="text-[13px] mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            Sign in to continue
          </p>
        </div>

        {error && (
          <div
            className="flex items-center gap-2 mb-4 p-3 rounded-lg text-sm"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#f87171",
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="text-[11px] font-semibold mb-1.5 block"
              style={{ color: "var(--text-muted)" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="input-glass w-full"
              autoFocus
            />
          </div>

          <div>
            <label
              className="text-[11px] font-semibold mb-1.5 block"
              style={{ color: "var(--text-muted)" }}
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="input-glass w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-ghost)" }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!email || !password || loading}
            className="w-full py-3 btn-primary disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Please wait...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
