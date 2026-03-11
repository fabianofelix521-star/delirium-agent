"use client";

import { useState } from "react";
import {
  Settings,
  ChevronDown,
  ChevronUp,
  Plug,
  TestTube,
  Save,
  Check,
  X,
  Loader2,
  Crown,
  Sparkles,
} from "lucide-react";

const providers = [
  {
    id: "ollama",
    name: "Ollama",
    icon: "🧠",
    description: "Local LLM inference",
    models: ["qwen2.5-coder:32b", "llama3.1:70b", "mistral:7b"],
    fields: [
      {
        key: "base_url",
        label: "Base URL",
        default: "http://localhost:11434",
        type: "url",
      },
    ],
    isLocal: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: "🤖",
    description: "GPT-4o, o1-preview, GPT-3.5",
    models: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo", "o1-preview", "o1-mini"],
    fields: [
      { key: "api_key", label: "API Key", default: "", type: "password" },
      { key: "org_id", label: "Organization ID", default: "", type: "text" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: "🟣",
    description: "Claude 3.5 Sonnet, Claude 3 Opus",
    models: [
      "claude-3-5-sonnet-20241022",
      "claude-3-opus-20240229",
      "claude-3-haiku-20240307",
    ],
    fields: [
      { key: "api_key", label: "API Key", default: "", type: "password" },
    ],
  },
  {
    id: "google",
    name: "Google",
    icon: "🔵",
    description: "Gemini 2.0 Flash, Gemini Pro",
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    fields: [
      { key: "api_key", label: "API Key", default: "", type: "password" },
    ],
  },
  {
    id: "alibaba",
    name: "Alibaba Cloud / DashScope",
    icon: "☁️",
    description: "GLM-5, Qwen3.5, Kimi-K2.5, MiniMax-M2.5",
    models: [
      "qwen3-coder-plus",
      "qwen3-coder-next",
      "qwen3.5-plus",
      "glm-5",
      "kimi-k2.5",
      "MiniMax-M2.5",
    ],
    fields: [
      { key: "api_key", label: "API Key", default: "", type: "password" },
      {
        key: "endpoint",
        label: "Endpoint URL",
        default: "https://coding-intl.dashscope.aliyuncs.com/v1",
        type: "url",
      },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    icon: "⚡",
    description: "Ultra-fast inference",
    models: [
      "llama-3.1-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
    ],
    fields: [
      { key: "api_key", label: "API Key", default: "", type: "password" },
    ],
  },
  {
    id: "together",
    name: "Together AI",
    icon: "🤝",
    description: "Open-source model hosting",
    models: ["meta-llama/Llama-3.1-70B", "Qwen/Qwen2.5-72B"],
    fields: [
      { key: "api_key", label: "API Key", default: "", type: "password" },
    ],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    icon: "🌬️",
    description: "Mistral Large, Codestral",
    models: ["mistral-large-latest", "codestral-latest"],
    fields: [
      { key: "api_key", label: "API Key", default: "", type: "password" },
    ],
  },
  {
    id: "cohere",
    name: "Cohere",
    icon: "🔶",
    description: "Command R+, Command R",
    models: ["command-r-plus", "command-r"],
    fields: [
      { key: "api_key", label: "API Key", default: "", type: "password" },
    ],
  },
  {
    id: "custom",
    name: "Custom API",
    icon: "🔧",
    description: "Any OpenAI-compatible endpoint",
    models: [],
    fields: [
      { key: "name", label: "Provider Name", default: "", type: "text" },
      { key: "base_url", label: "Base URL", default: "", type: "url" },
      { key: "api_key", label: "API Key", default: "", type: "password" },
      { key: "model", label: "Model ID", default: "", type: "text" },
    ],
  },
];

export default function APIsPage() {
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [configs, setConfigs] = useState<
    Record<string, Record<string, string>>
  >({});
  const [enabledProviders, setEnabledProviders] = useState<Set<string>>(
    new Set(["ollama", "alibaba"]),
  );
  const [defaultProvider, setDefaultProvider] = useState("alibaba");
  const [testResults, setTestResults] = useState<
    Record<string, "success" | "failed" | "testing">
  >({});

  const toggleProvider = (id: string) => {
    setEnabledProviders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const testConnection = (id: string) => {
    setTestResults((prev) => ({ ...prev, [id]: "testing" }));
    setTimeout(() => {
      setTestResults((prev) => ({
        ...prev,
        [id]:
          id === "ollama"
            ? "success"
            : Math.random() > 0.5
              ? "success"
              : "failed",
      }));
    }, 1500);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(99,102,241,0.1)" }}
        >
          <Settings size={18} style={{ color: "var(--accent-indigo)" }} />
        </div>
        <div>
          <h1
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            API Providers
          </h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {enabledProviders.size} active provider
            {enabledProviders.size !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Default provider */}
      <div className="liquid-glass p-4 mb-5">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <Crown size={14} style={{ color: "var(--accent-violet)" }} />
            <div>
              <h3
                className="text-[13px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Default Provider
              </h3>
              <p className="text-[10px]" style={{ color: "var(--text-ghost)" }}>
                Used when no specific provider is selected
              </p>
            </div>
          </div>
          <select
            value={defaultProvider}
            onChange={(e) => setDefaultProvider(e.target.value)}
            className="input-glass text-xs py-1.5 px-3"
          >
            {[...enabledProviders].map((id) => (
              <option key={id} value={id}>
                {providers.find((p) => p.id === id)?.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-4 mt-3 relative z-10">
          <label
            className="flex items-center gap-2 text-[11px] cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            <input
              type="checkbox"
              defaultChecked
              className="rounded accent-[var(--accent-indigo)]"
            />
            Auto-fallback if primary fails
          </label>
        </div>
      </div>

      {/* Provider cards */}
      <div className="space-y-3 stagger-children">
        {providers.map((provider) => {
          const isExpanded = activeProvider === provider.id;
          const isEnabled = enabledProviders.has(provider.id);
          const testStatus = testResults[provider.id];

          return (
            <div
              key={provider.id}
              className={`liquid-glass transition-all ${isEnabled ? "liquid-glass-accent" : ""}`}
              style={{ opacity: isEnabled ? 1 : 0.55 }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer relative z-10"
                onClick={() =>
                  setActiveProvider(isExpanded ? null : provider.id)
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl">{provider.icon}</span>
                  <div className="min-w-0">
                    <h3
                      className="text-[13px] font-semibold flex items-center gap-2"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {provider.name}
                      {provider.isLocal && (
                        <span className="badge badge-success">LOCAL</span>
                      )}
                    </h3>
                    <p
                      className="text-[11px] truncate"
                      style={{ color: "var(--text-ghost)" }}
                    >
                      {provider.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {testStatus && (
                    <span
                      className={`text-[11px] font-semibold flex items-center gap-1 ${testStatus === "success" ? "" : testStatus === "failed" ? "" : "animate-pulse"}`}
                      style={{
                        color:
                          testStatus === "success"
                            ? "var(--success)"
                            : testStatus === "failed"
                              ? "var(--error)"
                              : "var(--warning)",
                      }}
                    >
                      {testStatus === "success" ? (
                        <Check size={12} />
                      ) : testStatus === "failed" ? (
                        <X size={12} />
                      ) : (
                        <Loader2 size={12} className="animate-spin" />
                      )}
                      {testStatus === "success"
                        ? "Connected"
                        : testStatus === "failed"
                          ? "Failed"
                          : "Testing"}
                    </span>
                  )}
                  <div
                    className="toggle-switch"
                    data-on={isEnabled.toString()}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleProvider(provider.id);
                    }}
                  >
                    <div
                      className="toggle-knob"
                      style={{ left: isEnabled ? "20px" : "2px" }}
                    />
                  </div>
                  {isExpanded ? (
                    <ChevronUp
                      size={14}
                      style={{ color: "var(--text-ghost)" }}
                    />
                  ) : (
                    <ChevronDown
                      size={14}
                      style={{ color: "var(--text-ghost)" }}
                    />
                  )}
                </div>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div
                  className="px-4 pb-4 animate-fade-in relative z-10"
                  style={{ borderTop: "1px solid var(--glass-border)" }}
                >
                  <div className="pt-4 space-y-3">
                    {provider.fields.map((field) => (
                      <div key={field.key}>
                        <label
                          className="text-[11px] font-semibold mb-1.5 block"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          placeholder={
                            field.default ||
                            `Enter ${field.label.toLowerCase()}`
                          }
                          value={configs[provider.id]?.[field.key] || ""}
                          onChange={(e) =>
                            setConfigs((prev) => ({
                              ...prev,
                              [provider.id]: {
                                ...prev[provider.id],
                                [field.key]: e.target.value,
                              },
                            }))
                          }
                          className="input-glass w-full"
                        />
                      </div>
                    ))}
                    {provider.models.length > 0 && (
                      <div>
                        <label
                          className="text-[11px] font-semibold mb-1.5 block"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Default Model
                        </label>
                        <select className="input-glass w-full">
                          {provider.models.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => testConnection(provider.id)}
                        className="btn-ghost flex items-center gap-1.5"
                      >
                        <TestTube size={13} /> Test
                      </button>
                      <button className="btn-primary flex items-center gap-1.5">
                        <Save size={13} /> Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
