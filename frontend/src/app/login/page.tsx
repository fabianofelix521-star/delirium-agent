"use client";

import { useState } from "react";
import { Sparkles, Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    const [password, setPassword] = useState("");
    const [isSetup, setIsSetup] = useState(true);
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            localStorage.setItem("delirium_token", "demo-token");
            window.location.href = "/chat";
        }, 1000);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: "var(--bg-void)" }}>
            {/* Ambient background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20"
                    style={{ background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)", filter: "blur(80px)", animation: "orbFloat 15s ease-in-out infinite" }} />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15"
                    style={{ background: "radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)", filter: "blur(80px)", animation: "orbFloat 20s ease-in-out infinite reverse" }} />
            </div>

            <div className="w-full max-w-sm px-6 animate-fade-in relative z-10">
                <div className="text-center mb-8">
                    <div className="relative inline-block mb-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-float"
                            style={{ background: "var(--accent-gradient)", boxShadow: "var(--accent-glow-strong)" }}>
                            <Sparkles size={28} color="white" strokeWidth={1.8} />
                        </div>
                        <div className="absolute -inset-3 rounded-3xl animate-pulse-glow" style={{ border: "1px solid rgba(99,102,241,0.15)" }} />
                    </div>
                    <h1 className="text-2xl font-bold gradient-text tracking-tight">DELIRIUM INFINITE</h1>
                    <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
                        {isSetup ? "Create your master password" : "Welcome back"}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                            {isSetup ? "Master Password" : "Password"}
                        </label>
                        <div className="relative">
                            <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password..." className="input-glass w-full pr-10" autoFocus />
                            <button type="button" onClick={() => setShowPw(!showPw)}
                                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-ghost)" }}>
                                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                    </div>

                    {isSetup && (
                        <div>
                            <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: "var(--text-muted)" }}>Confirm Password</label>
                            <input type="password" placeholder="Confirm password..." className="input-glass w-full" />
                        </div>
                    )}

                    <button type="submit" disabled={!password || loading}
                        className="w-full py-3 btn-primary disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
                    >
                        {loading ? <><Loader2 size={16} className="animate-spin" /> Please wait...</> : isSetup ? "Create Account" : "Sign In"}
                    </button>
                </form>

                <p className="text-center text-[11px] mt-4" style={{ color: "var(--text-ghost)" }}>
                    {isSetup ? "Already set up?" : "First time?"}{" "}
                    <button onClick={() => setIsSetup(!isSetup)} className="underline font-medium" style={{ color: "var(--accent-violet)" }}>
                        {isSetup ? "Sign in" : "Create password"}
                    </button>
                </p>
            </div>
        </div>
    );
}
