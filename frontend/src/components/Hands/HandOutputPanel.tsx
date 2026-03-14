"use client";

import { useMemo, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Play,
  Sparkles,
  Terminal,
  Video,
} from "lucide-react";

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

type ContentBlock =
  | { type: "text"; content: string }
  | { type: "code"; language: string; code: string }
  | { type: "image"; url: string; alt: string }
  | { type: "video"; url: string }
  | { type: "pdf"; url: string }
  | { type: "file"; url: string; label: string };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineMarkdownToHtml(value: string) {
  let html = escapeHtml(value);
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer" class="text-[var(--accent-cyan)] underline decoration-white/10 underline-offset-4 break-all">$1</a>',
  );
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[0.9em] text-[var(--text-primary)]">$1</code>',
  );
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(
    /(^|[\s(])(https?:\/\/[^\s<]+)/g,
    '$1<a href="$2" target="_blank" rel="noreferrer" class="text-[var(--accent-cyan)] underline decoration-white/10 underline-offset-4 break-all">$2</a>',
  );
  return html;
}

function markdownTextToHtml(markdown: string) {
  const lines = markdown.split("\n");
  let html = "";
  let inUnorderedList = false;
  let inOrderedList = false;

  const closeLists = () => {
    if (inUnorderedList) {
      html += "</ul>";
      inUnorderedList = false;
    }
    if (inOrderedList) {
      html += "</ol>";
      inOrderedList = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      closeLists();
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeLists();
      const level = Math.min(heading[1].length, 6);
      html += `<h${level} class="mt-4 mb-2 font-semibold tracking-tight text-[var(--text-primary)]">${inlineMarkdownToHtml(heading[2])}</h${level}>`;
      continue;
    }

    if (/^>\s+/.test(trimmed)) {
      closeLists();
      html += `<blockquote class="my-3 border-l-2 border-white/10 pl-4 text-[var(--text-secondary)]">${inlineMarkdownToHtml(trimmed.replace(/^>\s+/, ""))}</blockquote>`;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      if (!inUnorderedList) {
        closeLists();
        html += '<ul class="my-3 ml-5 list-disc space-y-1 text-[var(--text-secondary)]">';
        inUnorderedList = true;
      }
      html += `<li>${inlineMarkdownToHtml(trimmed.replace(/^[-*]\s+/, ""))}</li>`;
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      if (!inOrderedList) {
        closeLists();
        html += '<ol class="my-3 ml-5 list-decimal space-y-1 text-[var(--text-secondary)]">';
        inOrderedList = true;
      }
      html += `<li>${inlineMarkdownToHtml(trimmed.replace(/^\d+\.\s+/, ""))}</li>`;
      continue;
    }

    closeLists();
    html += `<p class="my-3 leading-7 text-[var(--text-secondary)]">${inlineMarkdownToHtml(trimmed)}</p>`;
  }

  closeLists();
  return html;
}

function getMediaKind(url: string) {
  const normalized = url.toLowerCase();
  if (/(png|jpe?g|gif|webp|svg)$/.test(normalized.split("?")[0])) {
    return "image";
  }
  if (/(mp4|webm|mov|m4v)$/.test(normalized.split("?")[0])) {
    return "video";
  }
  if (normalized.split("?")[0].endsWith(".pdf")) {
    return "pdf";
  }
  return null;
}

function parseTextBlocks(chunk: string): ContentBlock[] {
  const parts = chunk
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.map((part) => {
    const imageMatch = part.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/);
    if (imageMatch) {
      return { type: "image", url: imageMatch[2], alt: imageMatch[1] || "Generated image" } satisfies ContentBlock;
    }

    const markdownLinkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (markdownLinkMatch) {
      const mediaKind = getMediaKind(markdownLinkMatch[2]);
      if (mediaKind === "pdf") {
        return { type: "pdf", url: markdownLinkMatch[2] } satisfies ContentBlock;
      }
      return {
        type: "file",
        url: markdownLinkMatch[2],
        label: markdownLinkMatch[1],
      } satisfies ContentBlock;
    }

    const rawUrlMatch = part.match(/^(https?:\/\/\S+)$/);
    if (rawUrlMatch) {
      const mediaKind = getMediaKind(rawUrlMatch[1]);
      if (mediaKind === "image") {
        return { type: "image", url: rawUrlMatch[1], alt: "Generated image" } satisfies ContentBlock;
      }
      if (mediaKind === "video") {
        return { type: "video", url: rawUrlMatch[1] } satisfies ContentBlock;
      }
      if (mediaKind === "pdf") {
        return { type: "pdf", url: rawUrlMatch[1] } satisfies ContentBlock;
      }
      return { type: "file", url: rawUrlMatch[1], label: rawUrlMatch[1] } satisfies ContentBlock;
    }

    return { type: "text", content: part } satisfies ContentBlock;
  });
}

function parseRichBlocks(content: string): ContentBlock[] {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const blocks: ContentBlock[] = [];
  const codeRegex = /```([\w-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeRegex.exec(normalized)) !== null) {
    const before = normalized.slice(lastIndex, match.index);
    if (before.trim()) {
      blocks.push(...parseTextBlocks(before));
    }
    blocks.push({
      type: "code",
      language: match[1] || "text",
      code: match[2].trimEnd(),
    });
    lastIndex = match.index + match[0].length;
  }

  const after = normalized.slice(lastIndex);
  if (after.trim()) {
    blocks.push(...parseTextBlocks(after));
  }

  return blocks;
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
    return { activities: [] as ToolActivity[], finalReport: withoutToolJson.trim() };
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
  return content.replace(/```[\w-]*\n?|```/g, "").replace(/\s+/g, " ").trim().slice(0, 120) || "Sem preview ainda.";
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
  const [exportingPdf, setExportingPdf] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const { activities, finalReport } = useMemo(
    () => parseHandOutput(output),
    [output],
  );

  const activityCount = activities.length;
  const reportBlocks = useMemo(() => parseRichBlocks(finalReport), [finalReport]);

  const copySnippet = async (content: string, key: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedSnippet(key);
    window.setTimeout(() => setCopiedSnippet(null), 1400);
  };

  const exportPdf = async () => {
    if (!reportRef.current || !finalReport.trim()) return;

    setExportingPdf(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#09111a",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const renderWidth = pageWidth - margin * 2;
      const renderHeight = (canvas.height * renderWidth) / canvas.width;
      const image = canvas.toDataURL("image/png");

      let currentHeightLeft = renderHeight;
      let positionY = margin;
      pdf.addImage(image, "PNG", margin, positionY, renderWidth, renderHeight, undefined, "FAST");
      currentHeightLeft -= pageHeight - margin * 2;

      while (currentHeightLeft > 0) {
        pdf.addPage();
        positionY = margin - (renderHeight - currentHeightLeft);
        pdf.addImage(image, "PNG", margin, positionY, renderWidth, renderHeight, undefined, "FAST");
        currentHeightLeft -= pageHeight - margin * 2;
      }

      pdf.save(`${hand?.id || "hand"}-report.pdf`);
    } finally {
      setExportingPdf(false);
    }
  };

  const renderBlock = (block: ContentBlock, index: number) => {
    if (block.type === "code") {
      return (
        <div key={`${block.type}-${index}`} className="overflow-hidden rounded-[20px] border border-white/10 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-ghost)]">
              {block.language}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copySnippet(block.code, `code-${index}`)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-[var(--text-secondary)] transition hover:bg-white/[0.08]"
              >
                {copiedSnippet === `code-${index}` ? "Copiado" : "Copiar"}
              </button>
              <button
                onClick={() => downloadText(`snippet.${block.language || "txt"}`, block.code)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-[var(--text-secondary)] transition hover:bg-white/[0.08]"
              >
                Baixar
              </button>
            </div>
          </div>
          <pre className="overflow-x-auto px-4 py-4 text-[12px] leading-6 text-slate-100">
            <code>{block.code}</code>
          </pre>
        </div>
      );
    }

    if (block.type === "image") {
      return (
        <figure key={`${block.type}-${index}`} className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.url}
            alt={block.alt}
            className="max-h-[440px] w-full rounded-[18px] object-cover"
          />
          <figcaption className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-[var(--accent-cyan)]" />
              {block.alt || "Imagem gerada"}
            </span>
            <a
              href={block.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[var(--accent-cyan)]"
            >
              Abrir <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </figcaption>
        </figure>
      );
    }

    if (block.type === "video") {
      return (
        <div key={`${block.type}-${index}`} className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20 p-3">
          <video
            controls
            playsInline
            className="max-h-[460px] w-full rounded-[18px] bg-black"
            src={block.url}
          />
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-2">
              <Video className="h-4 w-4 text-[var(--accent-cyan)]" />
              Vídeo anexado ao relatório
            </span>
            <a
              href={block.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[var(--accent-cyan)]"
            >
              Abrir <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      );
    }

    if (block.type === "pdf") {
      return (
        <a
          key={`${block.type}-${index}`}
          href={block.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-[var(--text-secondary)] transition hover:bg-white/[0.05]"
        >
          <span className="inline-flex items-center gap-3">
            <FileText className="h-5 w-5 text-[var(--accent-cyan)]" />
            Relatório em PDF detectado
          </span>
          <ExternalLink className="h-4 w-4 text-[var(--accent-cyan)]" />
        </a>
      );
    }

    if (block.type === "file") {
      return (
        <a
          key={`${block.type}-${index}`}
          href={block.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-[var(--text-secondary)] transition hover:bg-white/[0.05]"
        >
          <span className="truncate">{block.label}</span>
          <ExternalLink className="h-4 w-4 shrink-0 text-[var(--accent-cyan)]" />
        </a>
      );
    }

    return (
      <div
        key={`${block.type}-${index}`}
        className="report-markdown"
        dangerouslySetInnerHTML={{ __html: markdownTextToHtml(block.content) }}
      />
    );
  };

  return (
    <section className="apple-liquid-panel relative overflow-hidden rounded-[30px] border border-white/10 p-4 md:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_65%)] opacity-80" />

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-[var(--text-ghost)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
              Hand Delivery Surface
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.06] text-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                {hand?.icon || <Bot className="h-5 w-5 text-[var(--accent-cyan)]" />}
              </div>
              <div>
                <h3 className="text-base font-semibold tracking-tight text-[var(--text-primary)] md:text-lg">
                  {hand ? hand.name : "Hand Output"}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Atividade das ferramentas separada da entrega final, pronta para texto, código, imagens e mídia.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
              {activityCount} tool{activityCount === 1 ? "" : "s"}
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
              {running ? "Executando" : finalReport ? "Entrega pronta" : "Aguardando"}
            </div>
            <button
              onClick={() => downloadText(`${hand?.id || "hand"}-report.md`, finalReport || output)}
              disabled={!output.trim()}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
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
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-white/[0.08]"
            >
              Fechar
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex flex-col gap-2 sm:flex-row">
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
                className="min-w-0 flex-1 rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-ghost)] focus:border-cyan-400/40"
              />
              <button
                onClick={onRun}
                disabled={running || !hand}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,rgba(94,234,212,0.85),rgba(56,189,248,0.85))] px-5 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(34,211,238,0.25)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {running ? "Executando" : "Run Hand"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.76fr)_minmax(320px,0.54fr)]">
          <div className="apple-liquid-panel rounded-[28px] border border-white/10 bg-white/[0.03] p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] md:text-base">
                  Entrega final
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  Conteúdo otimizado para leitura, código, imagem, vídeo e exportação.
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
              className="report-surface max-h-[70vh] overflow-y-auto rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-4 md:p-6"
            >
              {reportBlocks.length > 0 ? (
                <div className="space-y-4">{reportBlocks.map(renderBlock)}</div>
              ) : (
                <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-black/10 px-6 text-center">
                  <Sparkles className="mb-3 h-9 w-9 text-[var(--accent-cyan)]" />
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {running ? "A entrega está sendo montada em tempo real." : "A entrega final aparecerá aqui."}
                  </p>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                    O painel já está preparado para markdown bonito, imagens, código e, futuramente, vídeos e anexos mais complexos.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="apple-liquid-panel rounded-[28px] border border-white/10 bg-white/[0.03] p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] md:text-base">
                  Ferramentas em ação
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  Cada execução fica isolada em accordion para inspeção sem poluir a entrega.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-[var(--text-secondary)]">
                <Terminal className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
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
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm text-[var(--text-primary)] marker:hidden">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${activity.status === "error" ? "bg-rose-400" : "bg-emerald-400"}`} />
                          <span className="font-medium">{activity.tool}</span>
                        </div>
                        <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                          {getActivityPreview(activity.content)}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-ghost)] transition group-open:rotate-180" />
                    </summary>
                    <div className="border-t border-white/10 px-4 py-4">
                      <div className="space-y-3">{parseRichBlocks(activity.content).map(renderBlock)}</div>
                    </div>
                  </details>
                ))
              ) : (
                <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-black/10 px-5 text-center">
                  <Terminal className="mb-3 h-8 w-8 text-[var(--accent-cyan)]" />
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Nenhuma atividade de tool registrada ainda.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Quando a hand começar a executar tools, cada etapa aparecerá aqui em blocos recolhíveis.
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