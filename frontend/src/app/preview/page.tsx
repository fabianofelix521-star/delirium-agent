"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Monitor,
  Smartphone,
  Tablet,
  RotateCcw,
  ExternalLink,
  Globe,
  Maximize2,
  ChevronDown,
} from "lucide-react";

const PRESETS = [
  { label: "Desktop", icon: Monitor, width: "100%", height: "100%" },
  { label: "Tablet", icon: Tablet, width: "768px", height: "1024px" },
  { label: "Mobile", icon: Smartphone, width: "375px", height: "812px" },
];

const STORAGE_KEY = "delirium_preview_url";

export default function PreviewPage() {
  const [url, setUrl] = useState(() => {
    if (typeof window === "undefined") return "http://localhost:3001";
    return localStorage.getItem(STORAGE_KEY) || "http://localhost:3001";
  });
  const [inputUrl, setInputUrl] = useState(url);
  const [device, setDevice] = useState(0);
  const [key, setKey] = useState(0);
  const [showPresets, setShowPresets] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{
          borderBottom: "1px solid var(--glass-border)",
          background: "var(--bg-surface)",
        }}
      >
        {/* URL Bar */}
        <form onSubmit={navigate} className="flex-1 flex gap-2">
          <div
            className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-lg"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <Globe size={14} style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="http://localhost:3001"
              className="flex-1 bg-transparent text-[13px] outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{
              background: "var(--accent-gradient)",
              color: "white",
            }}
          >
            Go
          </button>
        </form>

        {/* Device Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px]"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            <DeviceIcon size={14} />
            {preset.label}
            <ChevronDown size={12} />
          </button>

          {showPresets && (
            <div
              className="absolute top-full right-0 mt-1 rounded-lg overflow-hidden z-50"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--glass-border)",
                boxShadow: "var(--glass-shadow)",
              }}
            >
              {PRESETS.map((p, i) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.label}
                    onClick={() => {
                      setDevice(i);
                      setShowPresets(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-[12px] hover:opacity-80"
                    style={{
                      color:
                        i === device
                          ? "var(--accent-indigo)"
                          : "var(--text-secondary)",
                      background:
                        i === device ? "rgba(99,102,241,0.08)" : "transparent",
                    }}
                  >
                    <Icon size={14} />
                    {p.label}
                    <span style={{ color: "var(--text-muted)" }}>
                      {p.width} × {p.height}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
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
        <button
          onClick={() => setDevice(0)}
          className="p-1.5 rounded-lg hover:opacity-80"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-muted)",
          }}
          title="Fullscreen"
        >
          <Maximize2 size={14} />
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

      {/* Preview Area */}
      <div
        className="flex-1 flex items-center justify-center overflow-auto p-4"
        style={{ background: "var(--bg-void)" }}
      >
        <div
          className="relative rounded-xl overflow-hidden transition-all duration-300"
          style={{
            width: preset.width,
            height: preset.height,
            maxWidth: "100%",
            maxHeight: "100%",
            border: device > 0 ? "8px solid var(--glass-border)" : undefined,
            borderRadius: device > 0 ? "24px" : "8px",
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
        className="flex items-center justify-between px-4 py-1.5 text-[11px] shrink-0"
        style={{
          borderTop: "1px solid var(--glass-border)",
          background: "var(--bg-surface)",
          color: "var(--text-muted)",
        }}
      >
        <span>
          Preview: {url} · {preset.label} ({preset.width} × {preset.height})
        </span>
        <span>Auto-refresh: iframe reload</span>
      </div>
    </div>
  );
}
