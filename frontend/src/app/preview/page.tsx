"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Monitor,
  Smartphone,
  Tablet,
  RotateCcw,
  ExternalLink,
  Globe,
} from "lucide-react";

const PRESETS = [
  { label: "Desktop", icon: Monitor, width: "100%", height: "100%" },
  { label: "Tablet", icon: Tablet, width: "768px", height: "1024px" },
  { label: "Mobile", icon: Smartphone, width: "375px", height: "812px" },
];

const STORAGE_KEY = "delirium_preview_url";

export default function PreviewPage() {
  const [url, setUrl] = useState("http://localhost:3001");
  const [inputUrl, setInputUrl] = useState("http://localhost:3001");
  const [device, setDevice] = useState(0);
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setUrl(saved);
      setInputUrl(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, url);
  }, [url]);

  const navigate = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      let target = inputUrl.trim();
      if (target && !target.startsWith("http")) target = `http://${target}`;
      setUrl(target);
      setKey((k) => k + 1);
    },
    [inputUrl],
  );

  const refresh = () => setKey((k) => k + 1);
  const preset = PRESETS[device];
  const DeviceIcon = preset.icon;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 shrink-0"
        style={{
          borderBottom: "1px solid var(--glass-border)",
          background: "var(--bg-surface)",
        }}
      >
        {/* URL Bar */}
        <form onSubmit={navigate} className="flex-1 flex gap-2 min-w-0">
          <div
            className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-lg min-w-0"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <Globe
              size={14}
              className="shrink-0"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="http://localhost:3001"
              className="flex-1 bg-transparent text-[13px] outline-none min-w-0"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium shrink-0"
            style={{
              background: "var(--accent-gradient)",
              color: "white",
            }}
          >
            Go
          </button>
        </form>

        {/* Controls Row */}
        <div className="flex items-center gap-1.5">
          {/* Device Switcher - icons only on mobile */}
          <div
            className="flex rounded-lg overflow-hidden"
            style={{
              border: "1px solid var(--glass-border)",
              background: "var(--bg-elevated)",
            }}
          >
            {PRESETS.map((p, i) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.label}
                  onClick={() => setDevice(i)}
                  className="flex items-center gap-1 px-2 py-1.5 text-[11px] transition-all"
                  style={{
                    color:
                      i === device
                        ? "var(--accent-indigo)"
                        : "var(--text-muted)",
                    background:
                      i === device ? "rgba(99,102,241,0.1)" : "transparent",
                    borderRight:
                      i < PRESETS.length - 1
                        ? "1px solid var(--glass-border)"
                        : "none",
                  }}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{p.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={refresh}
            className="p-1.5 rounded-lg hover:opacity-80"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-muted)",
            }}
            title="Refresh"
          >
            <RotateCcw size={14} />
          </button>
          <a
            href={url}
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
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Preview Area */}
      <div
        className="flex-1 flex items-center justify-center overflow-auto p-2 sm:p-4"
        style={{ background: "var(--bg-void)" }}
      >
        <div
          className="relative rounded-xl overflow-hidden transition-all duration-300"
          style={{
            width: preset.width,
            height: preset.height,
            maxWidth: "100%",
            maxHeight: "100%",
            border: device > 0 ? "4px solid var(--glass-border)" : undefined,
            borderRadius: device > 0 ? "16px" : "8px",
            boxShadow: device > 0 ? "0 20px 60px rgba(0,0,0,0.3)" : undefined,
          }}
        >
          <iframe
            key={key}
            ref={iframeRef}
            src={url}
            className="w-full h-full"
            style={{
              background: "white",
              border: "none",
            }}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            title="App Preview"
          />
        </div>
      </div>

      {/* Status bar */}
      <div
        className="flex items-center justify-between px-3 sm:px-4 py-1.5 text-[10px] sm:text-[11px] shrink-0"
        style={{
          borderTop: "1px solid var(--glass-border)",
          background: "var(--bg-surface)",
          color: "var(--text-muted)",
        }}
      >
        <span className="truncate">
          {url} · {preset.label}
        </span>
        <span className="hidden sm:inline">Auto-refresh: iframe reload</span>
      </div>
    </div>
  );
}
