"use client";

import { useMemo, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  Paperclip,
  Play,
  Sparkles,
  Terminal,
} from "lucide-react";
import RichContentRenderer from "@/components/Shared/RichContentRenderer";
import { exportRichReportPdf } from "@/lib/exportRichReportPdf";
import { uploadAttachment } from "@/lib/api";

interface HandSummary {
  id: string;
  name: string;
  icon: string;
}

interface HandOutputPanelProps {
  hand: HandSummary | null;
  output: string;
  running: boolean;
  task: string;
  onTaskChange: (value: string) => void;
  onRun: () => void;
  onClose: () => void;
}

interface ToolActivity {
  id: string;
  tool: string;
  status: "success" | "error" | "running";
  content: string;
}

function extractToolResult(segment: string) {
  const trimmed = segment.trim();
  if (!trimmed) {
    return { activityContent: "Aguardando retorno da tool...", leftover: "" };
  }

  const leadingCodeBlock = trimmed.match(/^```[\w-]*\n[\s\S]*?```/);
  if (leadingCodeBlock) {
    return {
      activityContent: leadingCodeBlock[0].trim(),
      leftover: trimmed.slice(leadingCodeBlock[0].length).trim(),
    };
  }

  const splitIndex = trimmed.indexOf("\n\n");
  if (splitIndex >= 0) {
    return {
      activityContent: trimmed.slice(0, splitIndex).trim(),
      leftover: trimmed.slice(splitIndex).trim(),
    };
  }

  return { activityContent: trimmed, leftover: "" };
}

function parseHandOutput(output: string) {
  const normalized = output.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return { activities: [] as ToolActivity[], finalReport: "" };
  }

  const withoutToolJson = normalized.replace(
    /```json\s*\{[\s\S]*?"tool"\s*:\s*"[^"]+"[\s\S]*?```/g,
    "",
  );

  const marker = /🔧 \*\*Executing tool: ([^*]+)\*\*/g;
  const matches = [...withoutToolJson.matchAll(marker)];
  if (matches.length === 0) {
    return {
      activities: [] as ToolActivity[],
      finalReport: withoutToolJson.trim(),
    };
  }

  const activities: ToolActivity[] = [];
  const reportParts: string[] = [];

  const intro = withoutToolJson.slice(0, matches[0].index).trim();
  if (intro) reportParts.push(intro);

  matches.forEach((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const nextStart = matches[index + 1]?.index ?? withoutToolJson.length;
    const segment = withoutToolJson.slice(start, nextStart).trim();
    const { activityContent, leftover } = extractToolResult(segment);

    activities.push({
      id: `${match[1].trim()}-${index}`,
      tool: match[1].trim(),
      status: activityContent.includes("❌ Error") ? "error" : "success",
      content: activityContent,
    });

    if (leftover) reportParts.push(leftover);
  });

  return {
    activities,
    finalReport: reportParts.join("\n\n").trim(),
  };
}

function getActivityPreview(content: string) {
  return (
    content
      .replace(/```[\w-]*\n?|```/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "Sem preview ainda."
  );
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function HandOutputPanel({
  hand,
  output,
  running,
  task,
  onTaskChange,
  onRun,
  onClose,
}: HandOutputPanelProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const { activities, finalReport } = useMemo(
    () => parseHandOutput(output),
    [output],
  );

  const activityCount = activities.length;

  const exportPdf = async () => {
    if (!reportRef.current || !finalReport.trim()) return;

    setExportingPdf(true);
    try {
      await exportRichReportPdf({
        element: reportRef.current,
        filename: `${hand?.id || "hand"}-report.pdf`,
        title: hand ? `${hand.icon} ${hand.name}` : "Hand Output",
        subtitle:
          task ||
          "Entrega consolidada com branding Delirium Infinite e pré-visualização de mídia avançada.",
      });
    } finally {
      setExportingPdf(false);
    }
  };

  const handleAttachmentSelect = async (files: FileList | null) => {
    if (!files?.length || uploadingAttachment) return;
    setUploadingAttachment(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map((file) => uploadAttachment(file, "hands")),
      );
      const attachmentMarkdown = uploaded
        .map((item) => item.markdown)
        .join("\n");
      const nextTask = task.trim()
        ? `${task.trim()}\n\n${attachmentMarkdown}`
        : attachmentMarkdown;
      onTaskChange(nextTask);
    } finally {
      setUploadingAttachment(false);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
    }
  };

  return (
    <section className="apple-liquid-panel relative overflow-hidden rounded-[30px] border border-white/10 p-4 md:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_65%)] opacity-80" />

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div
              className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em]"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-ghost)",
              }}
            >
              <Sparkles
                className="h-3.5 w-3.5"
                style={{ color: "var(--accent-cyan)" }}
              />
              Hand Delivery Surface
            </div>
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center border border-white/10 text-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 18,
                }}
              >
                {hand?.icon || (
                  <Bot
                    className="h-5 w-5"
                    style={{ color: "var(--accent-cyan)" }}
                  />
                )}
              </div>
              <div>
                <h3
                  className="text-base font-semibold tracking-tight md:text-lg"
                  style={{ color: "var(--text-primary)" }}
                >
                  {hand ? hand.name : "Hand Output"}
                </h3>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Atividade das ferramentas separada da entrega final, pronta
                  para texto, código, imagens e mídia.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-secondary)",
              }}
            >
              {activityCount} tool{activityCount === 1 ? "" : "s"}
            </div>
            <div
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-secondary)",
              }}
            >
              {running
                ? "Executando"
                : finalReport
                  ? "Entrega pronta"
                  : "Aguardando"}
            </div>
            <button
              onClick={() =>
                downloadText(
                  `${hand?.id || "hand"}-report.md`,
                  finalReport || output,
                )
              }
              disabled={!output.trim()}
              className="glass-hover-8 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "var(--text-secondary)",
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Markdown
            </button>
            <button
              onClick={exportPdf}
              disabled={!finalReport.trim() || exportingPdf}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {exportingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              PDF
            </button>
            <button
              onClick={onClose}
              className="glass-hover-8 rounded-full border border-white/10 px-3 py-1.5 text-xs transition"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-secondary)",
              }}
            >
              Fechar
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div
            className="border border-white/10 bg-black/20 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            style={{ borderRadius: 24 }}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => handleAttachmentSelect(event.target.files)}
              />
              <input
                type="text"
                value={task}
                onChange={(event) => onTaskChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !running) {
                    onRun();
                  }
                }}
                placeholder="Descreva a tarefa da hand ou deixe vazio para usar o modo padrão..."
                className="min-w-0 flex-1 rounded-[18px] border border-white/10 px-4 py-3 text-sm outline-none focus:border-cyan-400/40"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                onClick={() => attachmentInputRef.current?.click()}
                disabled={uploadingAttachment}
                className="glass-hover-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] border border-white/10 px-4 text-sm transition disabled:cursor-not-allowed disabled:opacity-45"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--text-secondary)",
                }}
              >
                {uploadingAttachment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
                Anexar
              </button>
              <button
                onClick={onRun}
                disabled={running || !hand}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,rgba(94,234,212,0.85),rgba(56,189,248,0.85))] px-5 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(34,211,238,0.25)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {running ? "Executando" : "Run Hand"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.76fr)_minmax(320px,0.54fr)]">
          <div
            className="apple-liquid-panel rounded-[28px] border border-white/10 p-4 md:p-5"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h4
                  className="text-sm font-semibold md:text-base"
                  style={{ color: "var(--text-primary)" }}
                >
                  Entrega final
                </h4>
                <p
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Conteúdo otimizado para leitura, código, imagem, vídeo e
                  exportação.
                </p>
              </div>
              {running && (
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1 text-[11px] text-cyan-100">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  streaming
                </div>
              )}
            </div>

            <div
              ref={reportRef}
              className="report-surface max-h-[70vh] overflow-y-auto border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-4 md:p-6"
              style={{ borderRadius: 24 }}
            >
              {finalReport.trim() ? (
                <div className="space-y-5">
                  <div
                    className="border border-cyan-400/10 bg-[linear-gradient(135deg,rgba(73,194,255,0.08),rgba(255,255,255,0.02))] p-4 md:p-5"
                    style={{ borderRadius: 24 }}
                  >
                    <div
                      className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em]"
                      style={{ color: "var(--text-ghost)" }}
                    >
                      Delirium Infinite Report
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                      <div>
                        <h5
                          className="text-lg font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {hand ? `${hand.icon} ${hand.name}` : "Hand Output"}
                        </h5>
                        <p
                          className="mt-1 text-sm"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {task ||
                            "Entrega compilada com branding, mídia avançada e timeline destacada das tools."}
                        </p>
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--text-ghost)" }}
                      >
                        {new Date().toLocaleString("pt-BR")}
                      </div>
                    </div>
                  </div>
                  <RichContentRenderer content={finalReport} />
                </div>
              ) : (
                <div className="flex min-h-60 flex-col items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-black/10 px-6 text-center">
                  <Sparkles
                    className="mb-3 h-9 w-9"
                    style={{ color: "var(--accent-cyan)" }}
                  />
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {running
                      ? "A entrega está sendo montada em tempo real."
                      : "A entrega final aparecerá aqui."}
                  </p>
                  <p
                    className="mt-2 max-w-xl text-sm leading-6"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    O painel já está preparado para markdown bonito, imagens,
                    código e, futuramente, vídeos e anexos mais complexos.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div
            className="apple-liquid-panel rounded-[28px] border border-white/10 p-4 md:p-5"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h4
                  className="text-sm font-semibold md:text-base"
                  style={{ color: "var(--text-primary)" }}
                >
                  Ferramentas em ação
                </h4>
                <p
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Cada execução fica isolada em accordion para inspeção sem
                  poluir a entrega.
                </p>
              </div>
              <div
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-[11px]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text-secondary)",
                }}
              >
                <Terminal
                  className="h-3.5 w-3.5"
                  style={{ color: "var(--accent-cyan)" }}
                />
                timeline
              </div>
            </div>

            <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              {activities.length > 0 ? (
                activities.map((activity, index) => (
                  <details
                    key={activity.id}
                    open={index === activities.length - 1}
                    className="group overflow-hidden rounded-[20px] border border-white/10 bg-black/15"
                  >
                    <summary
                      className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm marker:hidden"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${activity.status === "error" ? "bg-rose-400" : "bg-emerald-400"}`}
                          />
                          <span className="font-medium">{activity.tool}</span>
                        </div>
                        <p
                          className="mt-1 truncate text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {getActivityPreview(activity.content)}
                        </p>
                      </div>
                      <ChevronDown
                        className="h-4 w-4 shrink-0 transition group-open:rotate-180"
                        style={{ color: "var(--text-ghost)" }}
                      />
                    </summary>
                    <div className="border-t border-white/10 px-4 py-4">
                      <RichContentRenderer
                        content={activity.content}
                        className="space-y-3"
                      />
                    </div>
                  </details>
                ))
              ) : (
                <div className="flex min-h-60 flex-col items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-black/10 px-5 text-center">
                  <Terminal className="mb-3 h-8 w-8" style={{ color: "var(--accent-cyan)" }} />
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Nenhuma atividade de tool registrada ainda.
                  </p>
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                    Quando a hand começar a executar tools, cada etapa aparecerá
                    aqui em blocos recolhíveis.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
