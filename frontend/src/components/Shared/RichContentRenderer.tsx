"use client";

import { useMemo, useState } from "react";
import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ContentBlock =
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

export function stripThinkTags(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
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
        html +=
          '<ul class="my-3 ml-5 list-disc space-y-1 text-[var(--text-secondary)]">';
        inUnorderedList = true;
      }
      html += `<li>${inlineMarkdownToHtml(trimmed.replace(/^[-*]\s+/, ""))}</li>`;
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      if (!inOrderedList) {
        closeLists();
        html +=
          '<ol class="my-3 ml-5 list-decimal space-y-1 text-[var(--text-secondary)]">';
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
      return {
        type: "image",
        url: imageMatch[2],
        alt: imageMatch[1] || "Generated image",
      } satisfies ContentBlock;
    }

    const markdownLinkMatch = part.match(
      /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/,
    );
    if (markdownLinkMatch) {
      const mediaKind = getMediaKind(markdownLinkMatch[2]);
      if (mediaKind === "pdf") {
        return {
          type: "pdf",
          url: markdownLinkMatch[2],
        } satisfies ContentBlock;
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
        return {
          type: "image",
          url: rawUrlMatch[1],
          alt: "Generated image",
        } satisfies ContentBlock;
      }
      if (mediaKind === "video") {
        return { type: "video", url: rawUrlMatch[1] } satisfies ContentBlock;
      }
      if (mediaKind === "pdf") {
        return { type: "pdf", url: rawUrlMatch[1] } satisfies ContentBlock;
      }
      return {
        type: "file",
        url: rawUrlMatch[1],
        label: rawUrlMatch[1],
      } satisfies ContentBlock;
    }

    return { type: "text", content: part } satisfies ContentBlock;
  });
}

export function parseRichBlocks(content: string): ContentBlock[] {
  const normalized = stripThinkTags(content).replace(/\r\n/g, "\n").trim();
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

function groupBlocksForGallery(blocks: ContentBlock[]) {
  const groups: Array<ContentBlock | ContentBlock[]> = [];
  let imageBuffer: ContentBlock[] = [];

  const flush = () => {
    if (imageBuffer.length === 1) groups.push(imageBuffer[0]);
    if (imageBuffer.length > 1) groups.push([...imageBuffer]);
    imageBuffer = [];
  };

  for (const block of blocks) {
    if (block.type === "image") {
      imageBuffer.push(block);
      continue;
    }
    flush();
    groups.push(block);
  }

  flush();
  return groups;
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

interface RichContentRendererProps {
  content: string;
  className?: string;
}

export default function RichContentRenderer({
  content,
  className,
}: RichContentRendererProps) {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const blocks = useMemo(() => parseRichBlocks(content), [content]);
  const groups = useMemo(() => groupBlocksForGallery(blocks), [blocks]);

  const copySnippet = async (snippet: string, key: string) => {
    await navigator.clipboard.writeText(snippet);
    setCopiedSnippet(key);
    window.setTimeout(() => setCopiedSnippet(null), 1400);
  };

  const renderBlock = (block: ContentBlock, index: number) => {
    if (block.type === "code") {
      return (
        <div
          key={`${block.type}-${index}`}
          className="overflow-hidden rounded-[20px] border border-white/10 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        >
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
                onClick={() =>
                  downloadText(`snippet.${block.language || "txt"}`, block.code)
                }
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
        <figure
          key={`${block.type}-${index}`}
          className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20 p-3"
        >
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
        <div
          key={`${block.type}-${index}`}
          className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20 p-3"
        >
          <video
            controls
            playsInline
            className="max-h-[460px] w-full rounded-[18px] bg-black"
            src={block.url}
          />
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-2">
              <Video className="h-4 w-4 text-[var(--accent-cyan)]" />
              Vídeo anexado ao conteúdo
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
    <div className={cn("space-y-4", className)}>
      {groups.map((group, index) => {
        if (Array.isArray(group)) {
          return (
            <div
              key={`gallery-${index}`}
              className={cn(
                "grid gap-3",
                group.length === 2
                  ? "sm:grid-cols-2"
                  : "sm:grid-cols-2 xl:grid-cols-3",
              )}
            >
              {group.map((item, itemIndex) =>
                renderBlock(item, index + itemIndex),
              )}
            </div>
          );
        }
        return renderBlock(group, index);
      })}
    </div>
  );
}
