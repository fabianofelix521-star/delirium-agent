"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import {
  Send,
  Paperclip,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Code2,
  FolderTree,
  GitBranch,
  GitCommit,
  Play,
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  X,
  ArrowDown,
  Terminal,
  Eye,
  Monitor,
  Smartphone,
  Tablet,
  RotateCcw,
  Download,
  FileCode,
  Clock,
  Plus,
  Trash2,
  Layout,
} from "lucide-react";

/* ─── Types ─── */

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ProjectFile {
  path: string;
  content: string;
  language: string;
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  path: string;
  children?: FileNode[];
  language?: string;
}

interface GithubRepo {
  name: string;
  full_name: string;
  description: string;
  language: string;
  default_branch: string;
  updated_at: string;
  html_url: string;
}

interface SavedProject {
  id: string;
  title: string;
  previewHtml: string;
  files: ProjectFile[];
  messages: Message[];
  conversationId: string | null;
  createdAt: number;
  updatedAt: number;
  agentId?: string;
  provider?: string;
  model?: string;
}

/* ─── Project History Helpers ─── */

const PROJECTS_KEY = "delirium_code_projects";
const MAX_PROJECTS = 50;

function loadProjects(): SavedProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedProject[];
  } catch {
    return [];
  }
}

function saveProjects(projects: SavedProject[]) {
  localStorage.setItem(
    PROJECTS_KEY,
    JSON.stringify(projects.slice(0, MAX_PROJECTS)),
  );
}

function saveProject(project: SavedProject) {
  const all = loadProjects();
  const idx = all.findIndex((p) => p.id === project.id);
  if (idx >= 0) all[idx] = project;
  else all.unshift(project);
  saveProjects(all);
  window.dispatchEvent(new Event("delirium-code-projects-update"));
}

function deleteProject(id: string) {
  const all = loadProjects().filter((p) => p.id !== id);
  saveProjects(all);
  window.dispatchEvent(new Event("delirium-code-projects-update"));
}

function generateTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "Untitled Project";
  const text = first.content.slice(0, 60);
  return text.length < first.content.length ? text + "..." : text;
}

function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

/* ─── Constants ─── */

const PRESETS = [
  { label: "Desktop", icon: Monitor, width: "100%", height: "100%" },
  { label: "Tablet", icon: Tablet, width: "768px", height: "1024px" },
  { label: "Mobile", icon: Smartphone, width: "375px", height: "812px" },
];

const CODE_SYSTEM_PROMPT = `You are Delirium Code — an expert full-stack developer AI specialized in generating RUNNABLE code.

## CRITICAL RULES — ALWAYS FOLLOW:
1. When asked to create ANY UI, app, game, component, or website: output a COMPLETE, RUNNABLE HTML file.
2. The HTML file MUST contain ALL CSS (in <style>) and ALL JavaScript (in <script>) INLINE — ONE single file.
3. ALWAYS wrap the code in a markdown code block with the language tag: \`\`\`html
4. For React/Vue/Svelte, use CDN imports (unpkg.com, esm.sh) so the code runs directly in a browser.
5. NEVER output partial code, placeholders like "...", or "// rest of code here".
6. NEVER output JSON tool calls like {"tool": "..."}. You are a code generator, NOT a tool executor.
7. NEVER just describe what to do — generate the ACTUAL complete code.
8. For multi-file projects, put each file in a separate code block with a filename comment on the first line.

## Output Format Example:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My App</title>
  <style>/* all CSS here */</style>
</head>
<body>
  <!-- all HTML here -->
  <script>/* all JS here */</script>
</body>
</html>
\`\`\`

Be concise in explanations but generate COMPLETE, beautiful, production-quality code. Match the user's language.`;

const LANG_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  rs: "rust",
  go: "go",
  css: "css",
  html: "html",
  json: "json",
  yml: "yaml",
  yaml: "yaml",
  md: "markdown",
  sql: "sql",
  vue: "vue",
  svelte: "svelte",
  scss: "scss",
  less: "less",
};

/* ─── Think Tag Stripping ─── */

function stripThinkTags(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

/* ─── Extraction Helpers ─── */

function extractAllCodeBlocks(rawContent: string): ProjectFile[] {
  const content = stripThinkTags(rawContent);
  const files: ProjectFile[] = [];
  // Match ``` and ~~~ fenced code blocks (some models use ~~~)
  const regex = /(?:```|~~~)(\w*)\s*\n([\s\S]*?)(?:```|~~~)/g;
  let match;
  let index = 0;

  while ((match = regex.exec(content)) !== null) {
    const lang = match[1] || "text";
    const code = match[2].trim();
    if (!code) continue;
    const filenameMatch = code.match(
      /^(?:\/\/|#|<!--)\s*(?:file:\s*)?(\S+\.\w+)/i,
    );
    const name = filenameMatch
      ? filenameMatch[1]
      : lang === "html"
        ? index === 0
          ? "index.html"
          : `page-${index}.html`
        : `file-${index}.${lang || "txt"}`;
    files.push({ path: name, content: code, language: lang });
    index++;
  }

  // Fallback: detect bare HTML (no code blocks) — some models output raw HTML
  if (files.length === 0) {
    const bareHtml = extractBareHtml(content);
    if (bareHtml) {
      files.push({ path: "index.html", content: bareHtml, language: "html" });
    }
  }

  return files;
}

/** Extract bare HTML from content that has no code fences */
function extractBareHtml(content: string): string | null {
  const lower = content.toLowerCase();
  // Look for <!DOCTYPE or <html as start markers
  const dtIdx = lower.indexOf("<!doctype");
  const htmlIdx = lower.indexOf("<html");
  const startIdx = dtIdx >= 0 ? dtIdx : htmlIdx;
  if (startIdx < 0) return null;
  // Look for closing </html>
  const endTag = "</html>";
  const endIdx = lower.lastIndexOf(endTag);
  if (endIdx > startIdx) {
    return content.slice(startIdx, endIdx + endTag.length).trim();
  }
  // No closing tag? Take everything from the start marker
  const rest = content.slice(startIdx).trim();
  if (
    rest.length > 100 &&
    (rest.includes("<body") ||
      rest.includes("<div") ||
      rest.includes("<script"))
  ) {
    return rest;
  }
  return null;
}

function extractProjectFromToolCall(rawContent: string): ProjectFile[] | null {
  const content = stripThinkTags(rawContent);
  const jsonMatch = content.match(/```json\n([\s\S]*?)```/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[1]);
    if (parsed.tool === "create_project" && parsed.args?.files) {
      const files: ProjectFile[] = [];
      for (const [path, fileContent] of Object.entries(parsed.args.files)) {
        const ext = path.split(".").pop() || "";
        files.push({
          path,
          content: fileContent as string,
          language: LANG_MAP[ext] || ext,
        });
      }
      return files;
    }
  } catch {
    // Not valid JSON tool call
  }
  return null;
}

function extractPreviewHtml(rawContent: string): string | null {
  const content = stripThinkTags(rawContent);
  const projectFiles = extractProjectFromToolCall(content);
  if (projectFiles) {
    const htmlFile = projectFiles.find((f) => f.path.endsWith(".html"));
    if (htmlFile) {
      const raw = htmlFile.content;
      if (
        raw.toLowerCase().includes("<!doctype") ||
        raw.toLowerCase().includes("<html")
      )
        return raw;
      return wrapFragmentInHtml(raw);
    }
    const jsxFile = projectFiles.find(
      (f) =>
        f.language === "javascript" ||
        f.language === "typescript" ||
        f.path.endsWith(".jsx") ||
        f.path.endsWith(".tsx"),
    );
    if (jsxFile) return wrapJsxInHtml(jsxFile.content);
  }

  // Match ``` and ~~~ html blocks
  const htmlMatch = content.match(/(?:```|~~~)html\s*\n([\s\S]*?)(?:```|~~~)/);
  if (htmlMatch) {
    const raw = htmlMatch[1].trim();
    if (
      raw.toLowerCase().includes("<!doctype") ||
      raw.toLowerCase().includes("<html")
    )
      return raw;
    return wrapFragmentInHtml(raw);
  }

  const jsxMatch = content.match(
    /(?:```|~~~)(?:jsx|tsx)\s*\n([\s\S]*?)(?:```|~~~)/,
  );
  if (jsxMatch) return wrapJsxInHtml(jsxMatch[1].trim());

  // Fallback: any fenced code block with HTML content
  const anyBlock = content.match(/(?:```|~~~)\w*\s*\n([\s\S]*?)(?:```|~~~)/);
  if (anyBlock) {
    const code = anyBlock[1].trim();
    if (code.includes("<") && code.includes(">")) {
      if (
        code.toLowerCase().includes("<!doctype") ||
        code.toLowerCase().includes("<html")
      )
        return code;
      if (
        code.includes("<div") ||
        code.includes("<body") ||
        code.includes("<section") ||
        code.includes("<main") ||
        code.includes("<h1") ||
        code.includes("<canvas") ||
        code.includes("<style") ||
        code.includes("<script")
      )
        return wrapFragmentInHtml(code);
    }
  }

  // Aggressive fallback: detect bare HTML outside code blocks (models that skip fences)
  const bareHtml = extractBareHtml(content);
  if (bareHtml) return bareHtml;

  // Last resort: find substantial inline HTML tags without any fences
  const inlineHtmlMatch = content.match(
    /(<(?:div|section|main|body|table|form|canvas|svg)[\s\S]{200,})/i,
  );
  if (inlineHtmlMatch) {
    const fragment = inlineHtmlMatch[1].trim();
    // Find a reasonable end point
    const lastClose = Math.max(
      fragment.lastIndexOf("</div>"),
      fragment.lastIndexOf("</section>"),
      fragment.lastIndexOf("</main>"),
      fragment.lastIndexOf("</body>"),
      fragment.lastIndexOf("</script>"),
    );
    const cleaned = lastClose > 0 ? fragment.slice(0, lastClose + 7) : fragment;
    return wrapFragmentInHtml(cleaned);
  }

  return null;
}

function wrapFragmentInHtml(fragment: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }</style>
</head>
<body>${fragment}</body>
</html>`;
}

function wrapJsxInHtml(jsx: string): string {
  return (
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></` +
    `script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></` +
    `script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></` +
    `script>
  <style>*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
${jsx}
const _comps = Object.keys(window).filter(k => typeof window[k] === 'function' && /^[A-Z]/.test(k));
const _Root = typeof App !== 'undefined' ? App : (_comps.length ? window[_comps[_comps.length-1]] : () => React.createElement('div', null, 'No component found'));
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(_Root));
  </` +
    `script>
</body>
</html>`
  );
}

function buildFileTree(files: ProjectFile[]): FileNode[] {
  const root: FileNode[] = [];
  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      if (isLast) {
        current.push({
          name: part,
          type: "file",
          path: file.path,
          language: file.language,
        });
      } else {
        let folder = current.find(
          (n) => n.name === part && n.type === "folder",
        );
        if (!folder) {
          folder = {
            name: part,
            type: "folder",
            path: parts.slice(0, i + 1).join("/"),
            children: [],
          };
          current.push(folder);
        }
        current = folder.children!;
      }
    }
  }
  const sortNodes = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => {
      if (n.children) sortNodes(n.children);
    });
  };
  sortNodes(root);
  return root;
}

/* ─── Component ─── */

export default function CodeArenaPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [activeProvider, setActiveProvider] = useState("alibaba");
  const [activeModel, setActiveModel] = useState("qwen3-coder-plus");

  const [sidePanel, setSidePanel] = useState<"repos" | "files" | null>(null);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [repoFiles, setRepoFiles] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [previewCode, setPreviewCode] = useState<{
    content: string;
    name: string;
    language: string;
  } | null>(null);

  const [conversationId, setConversationId] = useState<string | null>(null);

  // Right panel — LM Arena style
  const [rightTab, setRightTab] = useState<"preview" | "code" | "files">(
    "preview",
  );
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [projectTree, setProjectTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [device, setDevice] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);
  const [splitView, setSplitView] = useState(true);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [treeExpanded, setTreeExpanded] = useState<Set<string>>(new Set());

  // ─── Project History ───
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Mobile view mode: 'chat' or 'preview'
  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load saved projects on mount
  useEffect(() => {
    setSavedProjects(loadProjects());
    const handler = () => setSavedProjects(loadProjects());
    window.addEventListener("delirium-code-projects-update", handler);
    return () =>
      window.removeEventListener("delirium-code-projects-update", handler);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const fromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollBtn(fromBottom > 100);
    };
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("delirium_selected_model");
    if (saved) {
      const [prov, ...modelParts] = saved.split("/");
      if (prov && modelParts.length) {
        setActiveProvider(prov);
        setActiveModel(modelParts.join("/"));
      }
    }
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.providerKey && detail?.name) {
        setActiveProvider(detail.providerKey);
        setActiveModel(detail.name);
      }
    };
    window.addEventListener("delirium-model-change", handler);
    return () => window.removeEventListener("delirium-model-change", handler);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/github/status`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        setGithubConnected(data.connected);
        if (data.connected) loadRepos();
      })
      .catch(() => {});
  }, []);

  const loadRepos = async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch(`${API_BASE}/api/github/repos`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setRepos(data.repos || []);
      }
    } catch {
      /* */
    }
    setLoadingRepos(false);
  };

  const loadRepoFiles = async (repo: GithubRepo) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/github/repos/${repo.full_name}/tree`,
        { headers: getAuthHeaders() },
      );
      if (res.ok) {
        const data = await res.json();
        setRepoFiles(data.tree || []);
      }
    } catch {
      /* */
    }
  };

  const loadFileContent = async (repo: GithubRepo, path: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/github/repos/${repo.full_name}/file?path=${encodeURIComponent(path)}`,
        { headers: getAuthHeaders() },
      );
      if (res.ok) {
        const data = await res.json();
        const ext = path.split(".").pop() || "";
        setPreviewCode({
          content: data.content,
          name: path.split("/").pop() || path,
          language: LANG_MAP[ext] || ext,
        });
      }
    } catch {
      /* */
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const processAiResponse = useCallback(
    (
      content: string,
      currentMessages: Message[],
      currentConvId: string | null,
    ) => {
      let files = extractProjectFromToolCall(content);
      if (!files || files.length === 0) files = extractAllCodeBlocks(content);

      if (files.length > 0) {
        setProjectFiles(files);
        setProjectTree(buildFileTree(files));
        setSelectedFile(files[0]);
        const folders = new Set<string>();
        files.forEach((f) => {
          const parts = f.path.split("/");
          if (parts.length > 1) folders.add(parts[0]);
        });
        setTreeExpanded(folders);
      }

      const html = extractPreviewHtml(content);
      if (html) {
        setPreviewHtml(html);
        setIframeKey((k) => k + 1);
        setRightTab("preview");
        setSplitView(true);
      }

      // Save project to history
      if (files.length > 0 || html) {
        const projId = activeProjectId || `proj_${Date.now()}`;
        const project: SavedProject = {
          id: projId,
          title: generateTitle(currentMessages),
          previewHtml: html || "",
          files: files.length > 0 ? files : [],
          messages: currentMessages,
          conversationId: currentConvId,
          createdAt: activeProjectId
            ? loadProjects().find((p) => p.id === projId)?.createdAt ||
              Date.now()
            : Date.now(),
          updatedAt: Date.now(),
          agentId: localStorage.getItem("delirium_active_agent") || undefined,
          provider: activeProvider,
          model: activeModel,
        };
        setActiveProjectId(projId);
        saveProject(project);
      }
    },
    [activeProjectId, activeProvider, activeModel],
  );

  const restoreProject = useCallback((project: SavedProject) => {
    setMessages(project.messages);
    setConversationId(project.conversationId);
    setActiveProjectId(project.id);
    setPreviewHtml(project.previewHtml);
    if (project.files.length > 0) {
      setProjectFiles(project.files);
      setProjectTree(buildFileTree(project.files));
      setSelectedFile(project.files[0]);
    }
    if (project.previewHtml) {
      setIframeKey((k) => k + 1);
      setRightTab("preview");
      setSplitView(true);
    }
    setShowHistory(false);
  }, []);

  const startNewProject = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setActiveProjectId(null);
    setPreviewHtml("");
    setProjectFiles([]);
    setProjectTree([]);
    setSelectedFile(null);
    setInput("");
  }, []);

  // Listen for sidebar restore events
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail?.id;
      if (!id) return;
      const projects = loadProjects();
      const proj = projects.find((p) => p.id === id);
      if (proj) restoreProject(proj);
    };
    window.addEventListener("delirium-restore-code-project", handler);
    return () =>
      window.removeEventListener("delirium-restore-code-project", handler);
  }, [restoreProject]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    setInput("");
    setIsStreaming(true);

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const contextParts: string[] = [];
      if (selectedRepo)
        contextParts.push(
          `[Active Repo: ${selectedRepo.full_name} (${selectedRepo.language || "unknown"})]`,
        );
      if (previewCode)
        contextParts.push(
          `[Viewing file: ${previewCode.name}]\n\`\`\`${previewCode.language}\n${previewCode.content.slice(0, 2000)}\n\`\`\``,
        );
      // Add code-output instruction to user message so ALL models follow it
      // (some models like Kimi K2.5 and MiniMax ignore system prompts)
      const codeReminder =
        "[IMPORTANT: Output COMPLETE runnable code in a ```html code block. Do NOT just describe — generate the actual code.]";
      const baseMessage = contextParts.length
        ? `${contextParts.join("\n")}\n\nUser: ${userMsg.content}`
        : userMsg.content;
      const fullMessage = `${codeReminder}\n\n${baseMessage}`;

      const token = localStorage.getItem("delirium_token");
      const res = await fetch(`${API_BASE}/api/chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: fullMessage,
          conversation_id: conversationId || undefined,
          stream: true,
          provider: activeProvider,
          model: activeModel,
          system_prompt: CODE_SYSTEM_PROMPT,
        }),
      });

      let rawContent = "";
      let displayContent = "";
      let inThink = false;

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "start" && data.conversation_id)
                  setConversationId(data.conversation_id);
                if (data.type === "token") {
                  const tk = data.content;
                  rawContent += tk;
                  // Strip think tags for display
                  if (tk.includes("<think>")) {
                    inThink = true;
                    const before = tk.split("<think>")[0];
                    if (before) displayContent += before;
                  } else if (inThink && tk.includes("</think>")) {
                    inThink = false;
                    const after = tk.split("</think>")[1] || "";
                    if (after) displayContent += after;
                  } else if (!inThink) {
                    displayContent += tk;
                  }
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant")
                      last.content = displayContent;
                    return updated;
                  });
                }
              } catch {
                /* skip */
              }
            }
          }
        }
        processAiResponse(
          rawContent,
          [...currentMessages, { ...assistantMsg, content: displayContent }],
          conversationId,
        );
      } else {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant")
            last.content = "⚠️ Could not connect to the backend.";
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") last.content = "⚠️ Connection error.";
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const renderMarkdown = (text: string) => {
    const clean = stripThinkTags(text);
    return clean
      .replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang: string, code: string) => {
        const escaped = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<div class="code-block-wrapper my-3 rounded-xl overflow-hidden" style="background:rgba(8,8,20,0.6);border:1px solid var(--glass-border)">
          <div class="flex items-center justify-between px-3 py-1.5" style="border-bottom:1px solid var(--glass-border);background:rgba(255,255,255,0.02)">
            <span style="color:var(--text-muted);font-size:0.65rem;font-weight:600;text-transform:uppercase">${lang || "code"}</span>
          </div>
          <pre style="margin:0;border:0;border-radius:0;background:transparent !important;overflow-x:auto;padding:12px;font-size:12px;line-height:1.5"><code style="color:var(--text-secondary)">${escaped}</code></pre>
        </div>`;
      })
      .replace(
        /`([^`]+)`/g,
        '<code style="background:var(--bg-elevated);padding:1px 5px;border-radius:4px;font-size:0.85em">$1</code>',
      )
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(
        /^- (.+)/gm,
        '<li class="ml-4 list-disc" style="margin-bottom:2px">$1</li>',
      )
      .replace(/\n/g, "<br/>");
  };

  const toggleFolder = (path: string) =>
    setExpandedFolders((prev) => {
      const n = new Set(prev);
      if (n.has(path)) n.delete(path);
      else n.add(path);
      return n;
    });
  const toggleTreeFolder = (path: string) =>
    setTreeExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(path)) n.delete(path);
      else n.add(path);
      return n;
    });

  const renderGithubFileTree = (nodes: FileNode[], depth = 0) =>
    nodes.map((node) => (
      <div key={node.path}>
        <button
          onClick={() => {
            if (node.type === "folder") toggleFolder(node.path);
            else if (selectedRepo) loadFileContent(selectedRepo, node.path);
          }}
          className="flex items-center gap-1.5 w-full px-2 py-1 text-left rounded-md transition-all hover:bg-white/[0.04] text-[11px]"
          style={{
            paddingLeft: `${depth * 12 + 8}px`,
            color: "var(--text-secondary)",
          }}
        >
          {node.type === "folder" ? (
            expandedFolders.has(node.path) ? (
              <ChevronDown size={10} style={{ color: "var(--text-ghost)" }} />
            ) : (
              <ChevronRight size={10} style={{ color: "var(--text-ghost)" }} />
            )
          ) : (
            <span style={{ width: 10 }} />
          )}
          {node.type === "folder" ? (
            <Folder size={12} style={{ color: "#f59e0b" }} />
          ) : (
            <File size={12} style={{ color: "var(--text-ghost)" }} />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {node.type === "folder" &&
          expandedFolders.has(node.path) &&
          node.children &&
          renderGithubFileTree(node.children, depth + 1)}
      </div>
    ));

  const renderProjectTree = (nodes: FileNode[], depth = 0) =>
    nodes.map((node) => (
      <div key={node.path}>
        <button
          onClick={() => {
            if (node.type === "folder") toggleTreeFolder(node.path);
            else {
              const file = projectFiles.find((f) => f.path === node.path);
              if (file) {
                setSelectedFile(file);
                setRightTab("code");
              }
            }
          }}
          className="flex items-center gap-1.5 w-full px-2 py-1 text-left rounded-md transition-all hover:bg-white/[0.04] text-[11px]"
          style={{
            paddingLeft: `${depth * 12 + 8}px`,
            color:
              selectedFile?.path === node.path
                ? "var(--accent-indigo)"
                : "var(--text-secondary)",
            background:
              selectedFile?.path === node.path
                ? "rgba(99,102,241,0.08)"
                : undefined,
          }}
        >
          {node.type === "folder" ? (
            treeExpanded.has(node.path) ? (
              <ChevronDown size={10} style={{ color: "var(--text-ghost)" }} />
            ) : (
              <ChevronRight size={10} style={{ color: "var(--text-ghost)" }} />
            )
          ) : (
            <span style={{ width: 10 }} />
          )}
          {node.type === "folder" ? (
            <Folder size={12} style={{ color: "#f59e0b" }} />
          ) : (
            <FileCode size={12} style={{ color: "var(--accent-indigo)" }} />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {node.type === "folder" &&
          treeExpanded.has(node.path) &&
          node.children &&
          renderProjectTree(node.children, depth + 1)}
      </div>
    ));

  const codeSuggestions = [
    {
      icon: Code2,
      text: "Create a landing page",
      desc: "Full HTML + CSS + JS",
      color: "#6366f1",
    },
    {
      icon: Terminal,
      text: "Build a REST API",
      desc: "FastAPI / Express",
      color: "#06b6d4",
    },
    {
      icon: Play,
      text: "Create a Snake game",
      desc: "Canvas game",
      color: "#10b981",
    },
    {
      icon: GitBranch,
      text: "React dashboard",
      desc: "Components + charts",
      color: "#ec4899",
    },
  ];

  const preset = PRESETS[device];
  const DeviceIcon = preset.icon;
  const hasPreview = previewHtml.length > 0;
  const hasProject = projectFiles.length > 0;

  const downloadProject = () => {
    if (!projectFiles.length) return;
    const content = projectFiles
      .map((f) => `// === ${f.path} ===\n${f.content}`)
      .join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project-code.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ─── RENDER ─── */
  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Mobile Tab Switcher */}
      {(hasPreview || hasProject) && (
        <div
          className="flex md:hidden shrink-0"
          style={{
            borderBottom: "1px solid var(--glass-border)",
            background: "var(--bg-surface)",
          }}
        >
          <button
            onClick={() => setMobileView("chat")}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-all"
            style={{
              color:
                mobileView === "chat"
                  ? "var(--accent-indigo)"
                  : "var(--text-muted)",
              borderBottom:
                mobileView === "chat"
                  ? "2px solid var(--accent-indigo)"
                  : "2px solid transparent",
            }}
          >
            <Send size={13} /> Chat
          </button>
          <button
            onClick={() => {
              setMobileView("preview");
              setRightTab("preview");
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-all"
            style={{
              color:
                mobileView === "preview" && rightTab === "preview"
                  ? "var(--accent-indigo)"
                  : "var(--text-muted)",
              borderBottom:
                mobileView === "preview" && rightTab === "preview"
                  ? "2px solid var(--accent-indigo)"
                  : "2px solid transparent",
            }}
          >
            <Eye size={13} /> Preview
            {hasPreview && (
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#10b981" }}
              />
            )}
          </button>
          <button
            onClick={() => {
              setMobileView("preview");
              setRightTab("code");
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-all"
            style={{
              color:
                mobileView === "preview" && rightTab === "code"
                  ? "var(--accent-indigo)"
                  : "var(--text-muted)",
              borderBottom:
                mobileView === "preview" && rightTab === "code"
                  ? "2px solid var(--accent-indigo)"
                  : "2px solid transparent",
            }}
          >
            <Code2 size={13} /> Code
            {hasProject && (
              <span
                className="text-[9px] ml-0.5 px-1 py-0.5 rounded"
                style={{
                  background: "rgba(99,102,241,0.1)",
                  color: "var(--accent-indigo)",
                }}
              >
                {projectFiles.length}
              </span>
            )}
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0 relative">
        {/* ─── Side Panel (GitHub) ─── */}
        {sidePanel && (
          <div
            className="fixed inset-0 z-40 md:relative md:inset-auto md:z-auto w-full md:w-[240px] shrink-0 flex flex-col border-r overflow-hidden animate-fade-in"
            style={{
              background: "var(--glass-bg-solid)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div
              className="flex items-center justify-between px-3 py-2.5"
              style={{ borderBottom: "1px solid var(--glass-border)" }}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidePanel("repos")}
                  className={`text-[11px] font-semibold px-2 py-1 rounded-md ${sidePanel === "repos" ? "bg-white/[0.06]" : ""}`}
                  style={{
                    color:
                      sidePanel === "repos"
                        ? "var(--text-primary)"
                        : "var(--text-ghost)",
                  }}
                >
                  <GitBranch size={11} className="inline mr-1" /> Repos
                </button>
                {selectedRepo && (
                  <button
                    onClick={() => setSidePanel("files")}
                    className={`text-[11px] font-semibold px-2 py-1 rounded-md ${sidePanel === "files" ? "bg-white/[0.06]" : ""}`}
                    style={{
                      color:
                        sidePanel === "files"
                          ? "var(--text-primary)"
                          : "var(--text-ghost)",
                    }}
                  >
                    <FolderTree size={11} className="inline mr-1" /> Files
                  </button>
                )}
              </div>
              <button
                onClick={() => setSidePanel(null)}
                className="p-1 rounded-md hover:bg-white/[0.04]"
                style={{ color: "var(--text-ghost)" }}
              >
                <X size={13} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {sidePanel === "repos" &&
                (!githubConnected ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(99,102,241,0.1)" }}
                    >
                      <GitBranch
                        size={22}
                        style={{ color: "var(--accent-indigo)" }}
                      />
                    </div>
                    <p
                      className="text-[12px] font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Connect GitHub
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-ghost)" }}
                    >
                      Add your token in Settings → APIs.
                    </p>
                    <a
                      href="/settings/apis"
                      className="text-[11px] font-semibold px-3 py-1.5 rounded-lg"
                      style={{
                        background: "var(--accent-gradient)",
                        color: "white",
                      }}
                    >
                      Configure
                    </a>
                  </div>
                ) : loadingRepos ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2
                      size={18}
                      className="animate-spin"
                      style={{ color: "var(--accent-indigo)" }}
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    {repos.map((repo) => (
                      <button
                        key={repo.full_name}
                        onClick={() => {
                          setSelectedRepo(repo);
                          setSidePanel("files");
                          loadRepoFiles(repo);
                        }}
                        className="w-full text-left p-2.5 rounded-lg hover:bg-white/[0.04]"
                        style={{
                          background:
                            selectedRepo?.full_name === repo.full_name
                              ? "rgba(99,102,241,0.08)"
                              : undefined,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <GitCommit
                            size={12}
                            style={{ color: "var(--accent-indigo)" }}
                          />
                          <span
                            className="text-[12px] font-medium truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {repo.name}
                          </span>
                        </div>
                        {repo.description && (
                          <p
                            className="text-[10px] mt-0.5 truncate"
                            style={{ color: "var(--text-ghost)" }}
                          >
                            {repo.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              {sidePanel === "files" && selectedRepo && (
                <div>
                  <div
                    className="flex items-center gap-2 px-2 py-1.5 mb-1"
                    style={{ borderBottom: "1px solid var(--glass-border)" }}
                  >
                    <GitCommit
                      size={11}
                      style={{ color: "var(--accent-indigo)" }}
                    />
                    <span
                      className="text-[11px] font-medium truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {selectedRepo.name}
                    </span>
                  </div>
                  {repoFiles.length > 0 ? (
                    renderGithubFileTree(repoFiles)
                  ) : (
                    <div className="flex items-center justify-center h-20">
                      <Loader2
                        size={14}
                        className="animate-spin"
                        style={{ color: "var(--text-ghost)" }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Project History Panel ─── */}
        {showHistory && (
          <div
            className="fixed inset-0 z-40 md:relative md:inset-auto md:z-auto w-full md:w-[260px] shrink-0 flex flex-col border-r overflow-hidden animate-fade-in"
            style={{
              background: "var(--glass-bg-solid)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div
              className="flex items-center justify-between px-3 py-2.5 shrink-0"
              style={{ borderBottom: "1px solid var(--glass-border)" }}
            >
              <div className="flex items-center gap-2">
                <Clock size={13} style={{ color: "var(--accent-indigo)" }} />
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Projects
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "rgba(99,102,241,0.1)",
                    color: "var(--accent-indigo)",
                  }}
                >
                  {savedProjects.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={startNewProject}
                  className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors"
                  style={{ color: "var(--accent-indigo)" }}
                  title="New Project"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 rounded-md hover:bg-white/[0.04]"
                  style={{ color: "var(--text-ghost)" }}
                >
                  <X size={13} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {savedProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(99,102,241,0.1)" }}
                  >
                    <Layout
                      size={22}
                      style={{ color: "var(--accent-indigo)" }}
                    />
                  </div>
                  <p
                    className="text-[12px] font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    No projects yet
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--text-ghost)" }}
                  >
                    Create an app or site and it will appear here automatically.
                  </p>
                </div>
              ) : (
                savedProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="group rounded-xl overflow-hidden cursor-pointer transition-all hover:ring-1 hover:ring-white/10"
                    style={{
                      background:
                        activeProjectId === proj.id
                          ? "rgba(99,102,241,0.08)"
                          : "var(--bg-elevated)",
                      border: `1px solid ${activeProjectId === proj.id ? "rgba(99,102,241,0.2)" : "var(--glass-border)"}`,
                    }}
                    onClick={() => restoreProject(proj)}
                  >
                    {/* Thumbnail preview */}
                    {proj.previewHtml && (
                      <div
                        className="relative w-full h-[80px] overflow-hidden"
                        style={{ background: "white" }}
                      >
                        <iframe
                          srcDoc={proj.previewHtml}
                          className="w-full border-none pointer-events-none"
                          style={{
                            height: "400px",
                            transform: "scale(0.2)",
                            transformOrigin: "top left",
                            width: "500%",
                          }}
                          sandbox="allow-same-origin"
                          tabIndex={-1}
                          title={proj.title}
                        />
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.3))",
                          }}
                        />
                      </div>
                    )}
                    <div className="px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="text-[11px] font-medium leading-tight line-clamp-2"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {proj.title}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProject(proj.id);
                            if (activeProjectId === proj.id) startNewProject();
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/[0.08] shrink-0"
                          style={{ color: "var(--text-ghost)" }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-[9px]"
                          style={{ color: "var(--text-ghost)" }}
                        >
                          {timeAgo(proj.updatedAt)}
                        </span>
                        {proj.files.length > 0 && (
                          <span
                            className="text-[9px]"
                            style={{ color: "var(--text-ghost)" }}
                          >
                            {proj.files.length} files
                          </span>
                        )}
                        {proj.model && (
                          <span
                            className="text-[8px] px-1 py-0.5 rounded"
                            style={{
                              background: "rgba(99,102,241,0.08)",
                              color: "var(--accent-indigo)",
                            }}
                          >
                            {proj.model.split("/").pop()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── LEFT: Chat ─── */}
        <div
          className={`flex flex-col min-w-0 ${mobileView === "preview" ? "hidden md:flex" : "flex"} ${splitView ? "md:w-[45%]" : "flex-1"}`}
          style={{
            borderRight: splitView
              ? "1px solid var(--glass-border)"
              : undefined,
          }}
        >
          {previewCode && (
            <div
              className="shrink-0 border-b"
              style={{
                background: "var(--bg-secondary)",
                borderColor: "var(--glass-border)",
              }}
            >
              <div className="flex items-center justify-between px-4 py-1.5">
                <div className="flex items-center gap-2">
                  <File size={12} style={{ color: "var(--accent-indigo)" }} />
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {previewCode.name}
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{
                      background: "rgba(99,102,241,0.1)",
                      color: "var(--accent-indigo)",
                    }}
                  >
                    {previewCode.language}
                  </span>
                </div>
                <button
                  onClick={() => setPreviewCode(null)}
                  className="p-1 rounded-md hover:bg-white/[0.04]"
                  style={{ color: "var(--text-ghost)" }}
                >
                  <X size={12} />
                </button>
              </div>
              <pre
                className="px-4 pb-2 overflow-x-auto text-[11px] leading-relaxed max-h-[200px] overflow-y-auto"
                style={{
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <code>{previewCode.content}</code>
              </pre>
            </div>
          )}

          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-4 py-4 relative"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full animate-fade-in">
                <div className="relative mb-6">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center animate-float"
                    style={{
                      background: "linear-gradient(135deg, #6366f1, #06b6d4)",
                      boxShadow: "0 0 30px rgba(99,102,241,0.3)",
                    }}
                  >
                    <Code2 size={28} color="white" strokeWidth={1.8} />
                  </div>
                </div>
                <h2 className="text-xl font-bold gradient-text mb-1">
                  Delirium Code
                </h2>
                <p
                  className="text-[13px] mb-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  Build anything — preview instantly
                </p>
                <div className="flex items-center gap-2 mb-6">
                  {savedProjects.length > 0 && (
                    <button
                      onClick={() => setShowHistory(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium cursor-pointer"
                      style={{
                        background: "rgba(99,102,241,0.1)",
                        border: "1px solid rgba(99,102,241,0.2)",
                        color: "var(--accent-indigo)",
                      }}
                    >
                      <Clock size={11} /> {savedProjects.length} Projects
                    </button>
                  )}
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium cursor-pointer"
                    onClick={() => setSidePanel(sidePanel ? null : "repos")}
                    style={{
                      background: githubConnected
                        ? "rgba(16,185,129,0.1)"
                        : "rgba(239,68,68,0.1)",
                      border: `1px solid ${githubConnected ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                      color: githubConnected ? "#10b981" : "#ef4444",
                    }}
                  >
                    <GitBranch size={11} />{" "}
                    {githubConnected
                      ? "GitHub Connected"
                      : "GitHub Not Connected"}
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <Code2 size={11} /> {activeModel}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5 w-full max-w-md">
                  {codeSuggestions.map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => setInput(s.text)}
                        className="liquid-glass liquid-glass-hover p-3 text-left transition-all group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                            style={{
                              background: `${s.color}12`,
                              color: s.color,
                            }}
                          >
                            <Icon size={15} strokeWidth={1.8} />
                          </div>
                          <div className="min-w-0">
                            <p
                              className="text-[12px] font-medium truncate"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {s.text}
                            </p>
                            <p
                              className="text-[10px]"
                              style={{ color: "var(--text-ghost)" }}
                            >
                              {s.desc}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-1 max-w-3xl mx-auto">
                {messages.map((msg) => (
                  <div key={msg.id} className="animate-fade-in">
                    {msg.role === "user" ? (
                      <div className="flex justify-end mb-4">
                        <div
                          className="max-w-[85%] rounded-2xl rounded-br-lg px-4 py-3 text-[13px] leading-relaxed"
                          style={{
                            background: "var(--accent-indigo)",
                            color: "white",
                            boxShadow: "0 4px 12px rgba(99,102,241,0.25)",
                          }}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-6">
                        <div className="flex gap-3">
                          <div
                            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                            style={{
                              background:
                                "linear-gradient(135deg, #6366f1, #06b6d4)",
                              boxShadow: "0 2px 8px rgba(99,102,241,0.2)",
                            }}
                          >
                            <Code2 size={13} color="white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className="rounded-2xl rounded-bl-lg px-4 py-3 text-[13px] leading-relaxed"
                              style={{
                                background: "var(--glass-bg-solid)",
                                border: "1px solid var(--glass-border)",
                                boxShadow: "var(--glass-shadow)",
                                color: "var(--text-primary)",
                              }}
                            >
                              {msg.content ? (
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: renderMarkdown(msg.content),
                                  }}
                                />
                              ) : isStreaming ? (
                                <div className="flex gap-1.5 py-1">
                                  <div className="typing-dot" />
                                  <div className="typing-dot" />
                                  <div className="typing-dot" />
                                </div>
                              ) : null}
                            </div>
                            {msg.content && !isStreaming && (
                              <div className="flex items-center gap-0.5 mt-1.5 ml-1">
                                <button
                                  onClick={() =>
                                    handleCopy(msg.content, msg.id)
                                  }
                                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium hover:bg-white/[0.04]"
                                  style={{ color: "var(--text-ghost)" }}
                                >
                                  {copied === msg.id ? (
                                    <Check
                                      size={11}
                                      style={{ color: "var(--success)" }}
                                    />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                  {copied === msg.id ? "Copied" : "Copy"}
                                </button>
                                {(msg.content.includes("```html") ||
                                  msg.content.includes("```jsx") ||
                                  msg.content.includes("```tsx") ||
                                  msg.content.includes("```json")) && (
                                  <button
                                    onClick={() =>
                                      processAiResponse(
                                        msg.content,
                                        messages,
                                        conversationId,
                                      )
                                    }
                                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium hover:bg-white/[0.04]"
                                    style={{ color: "var(--accent-indigo)" }}
                                  >
                                    <Eye size={11} /> Preview
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
            {showScrollBtn && messages.length > 0 && (
              <button
                onClick={scrollToBottom}
                className="sticky bottom-2 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full flex items-center justify-center z-30 animate-fade-in"
                style={{
                  background: "var(--glass-bg-solid)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-muted)",
                  boxShadow: "var(--glass-shadow-lg)",
                }}
              >
                <ArrowDown size={15} />
              </button>
            )}
          </div>

          <div className="shrink-0 px-4 pb-3 pt-1">
            <div
              className="liquid-glass-solid relative overflow-visible"
              style={{ borderRadius: "var(--radius-2xl)" }}
            >
              <div className="flex items-end gap-1 p-2">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/[0.04] shrink-0"
                  style={{
                    color: showHistory
                      ? "var(--accent-indigo)"
                      : "var(--text-ghost)",
                  }}
                  title="Project History"
                >
                  <Clock size={16} strokeWidth={2} />
                </button>
                <button
                  onClick={() => setSidePanel(sidePanel ? null : "repos")}
                  className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/[0.04] shrink-0"
                  style={{
                    color: sidePanel
                      ? "var(--accent-indigo)"
                      : "var(--text-ghost)",
                  }}
                  title="Repos"
                >
                  <GitBranch size={16} strokeWidth={2} />
                </button>
                <button
                  className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/[0.04] shrink-0"
                  style={{ color: "var(--text-ghost)" }}
                  title="Attach"
                >
                  <Paperclip size={16} strokeWidth={2} />
                </button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe what you want to build..."
                  rows={1}
                  className="flex-1 bg-transparent text-[13px] outline-none resize-none py-2 px-1"
                  style={{ color: "var(--text-primary)", maxHeight: "200px" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-30"
                  style={{
                    background: input.trim()
                      ? "linear-gradient(135deg, #6366f1, #06b6d4)"
                      : "var(--bg-elevated)",
                    color: "white",
                    boxShadow: input.trim()
                      ? "0 2px 12px rgba(99,102,241,0.3)"
                      : "none",
                  }}
                >
                  {isStreaming ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 px-3 pb-2">
                {selectedRepo && (
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium"
                    style={{
                      background: "rgba(99,102,241,0.08)",
                      color: "var(--accent-indigo)",
                    }}
                  >
                    <GitCommit size={10} /> {selectedRepo.name}
                    <button
                      onClick={() => setSelectedRepo(null)}
                      className="ml-1 hover:opacity-70"
                    >
                      <X size={9} />
                    </button>
                  </div>
                )}
                <div className="flex-1" />
                <span
                  className="hidden md:inline text-[10px] font-medium"
                  style={{ color: "var(--text-ghost)" }}
                >
                  <kbd>Enter</kbd> send · <kbd>Shift+Enter</kbd> new line
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Preview / Code / Files (LM Arena style) ─── */}
        {(splitView || mobileView === "preview") && (
          <div
            className={`${mobileView === "preview" ? "flex md:flex" : "hidden md:flex"} flex-col flex-1 min-w-0`}
          >
            <div
              className="hidden md:flex items-center gap-1 px-3 py-2 shrink-0"
              style={{
                borderBottom: "1px solid var(--glass-border)",
                background: "var(--bg-surface)",
              }}
            >
              <div
                className="flex rounded-lg overflow-hidden"
                style={{
                  border: "1px solid var(--glass-border)",
                  background: "var(--bg-elevated)",
                }}
              >
                <button
                  onClick={() => setRightTab("preview")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold"
                  style={{
                    background:
                      rightTab === "preview"
                        ? "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.10))"
                        : "transparent",
                    color:
                      rightTab === "preview"
                        ? "var(--accent-indigo)"
                        : "var(--text-muted)",
                    borderRight: "1px solid var(--glass-border)",
                  }}
                >
                  <Eye size={12} /> Preview{" "}
                  {hasPreview && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "#10b981" }}
                    />
                  )}
                </button>
                <button
                  onClick={() => setRightTab("code")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold"
                  style={{
                    background:
                      rightTab === "code"
                        ? "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.10))"
                        : "transparent",
                    color:
                      rightTab === "code"
                        ? "var(--accent-indigo)"
                        : "var(--text-muted)",
                    borderRight: "1px solid var(--glass-border)",
                  }}
                >
                  <Code2 size={12} /> Code{" "}
                  {hasProject && (
                    <span
                      className="text-[9px] ml-1 px-1 py-0.5 rounded"
                      style={{
                        background: "rgba(99,102,241,0.1)",
                        color: "var(--accent-indigo)",
                      }}
                    >
                      {projectFiles.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setRightTab("files")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold"
                  style={{
                    background:
                      rightTab === "files"
                        ? "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.10))"
                        : "transparent",
                    color:
                      rightTab === "files"
                        ? "var(--accent-indigo)"
                        : "var(--text-muted)",
                  }}
                >
                  <FolderTree size={12} /> Files
                </button>
              </div>
              <div className="flex-1" />

              {rightTab === "preview" && (
                <>
                  <div className="relative">
                    <button
                      onClick={() => setShowDeviceMenu(!showDeviceMenu)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px]"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <DeviceIcon size={13} />{" "}
                      <span className="hidden lg:inline">{preset.label}</span>{" "}
                      <ChevronDown size={10} />
                    </button>
                    {showDeviceMenu && (
                      <div
                        className="absolute top-full right-0 mt-1 rounded-lg overflow-hidden z-50"
                        style={{
                          background: "var(--glass-bg-solid)",
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
                                setShowDeviceMenu(false);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-[11px] hover:opacity-80"
                              style={{
                                color:
                                  i === device
                                    ? "var(--accent-indigo)"
                                    : "var(--text-secondary)",
                                background:
                                  i === device
                                    ? "rgba(99,102,241,0.08)"
                                    : "transparent",
                              }}
                            >
                              <Icon size={13} /> {p.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setIframeKey((k) => k + 1)}
                    className="p-1.5 rounded-lg hover:opacity-80"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-muted)",
                    }}
                    title="Refresh"
                  >
                    <RotateCcw size={13} />
                  </button>
                </>
              )}

              {rightTab === "code" && hasProject && (
                <>
                  <button
                    onClick={() =>
                      handleCopy(selectedFile?.content || "", "sel-file")
                    }
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {copied === "sel-file" ? (
                      <Check size={11} style={{ color: "var(--success)" }} />
                    ) : (
                      <Copy size={11} />
                    )}{" "}
                    Copy
                  </button>
                  <button
                    onClick={downloadProject}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <Download size={11} /> Download
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  setSplitView(false);
                  setMobileView("chat");
                }}
                className="hidden md:flex p-1.5 rounded-lg hover:opacity-80"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-muted)",
                }}
                title="Close"
              >
                <X size={13} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden relative">
              {rightTab === "preview" && (
                <div
                  className="h-full flex items-center justify-center overflow-auto"
                  style={{ background: "var(--bg-void)" }}
                >
                  {!hasPreview ? (
                    <div className="flex flex-col items-center gap-4 text-center px-6">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{ background: "rgba(99,102,241,0.1)" }}
                      >
                        <Eye
                          size={24}
                          style={{ color: "var(--accent-indigo)" }}
                        />
                      </div>
                      <p
                        className="text-[13px] font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Live Preview
                      </p>
                      <p
                        className="text-[11px] max-w-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Ask the AI to create an app, game, or component. The
                        preview appears here automatically.
                      </p>
                    </div>
                  ) : (
                    <div
                      className="relative rounded-xl overflow-hidden transition-all duration-300"
                      style={{
                        width: preset.width,
                        height: preset.height,
                        maxWidth: "100%",
                        maxHeight: "100%",
                        border:
                          device > 0
                            ? "8px solid var(--glass-border)"
                            : undefined,
                        borderRadius: device > 0 ? "24px" : "8px",
                        boxShadow:
                          device > 0
                            ? "0 20px 60px rgba(0,0,0,0.3)"
                            : undefined,
                      }}
                    >
                      <iframe
                        key={iframeKey}
                        ref={iframeRef}
                        srcDoc={previewHtml}
                        className="w-full h-full"
                        style={{ background: "white", border: "none" }}
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                        title="Live Preview"
                      />
                    </div>
                  )}
                </div>
              )}

              {rightTab === "code" && (
                <div className="h-full flex flex-col">
                  {hasProject ? (
                    <>
                      <div
                        className="flex items-center gap-0.5 px-2 py-1.5 overflow-x-auto shrink-0"
                        style={{
                          borderBottom: "1px solid var(--glass-border)",
                          background: "var(--bg-secondary)",
                        }}
                      >
                        {projectFiles.map((f) => (
                          <button
                            key={f.path}
                            onClick={() => setSelectedFile(f)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap"
                            style={{
                              background:
                                selectedFile?.path === f.path
                                  ? "rgba(99,102,241,0.1)"
                                  : "transparent",
                              color:
                                selectedFile?.path === f.path
                                  ? "var(--accent-indigo)"
                                  : "var(--text-muted)",
                              border:
                                selectedFile?.path === f.path
                                  ? "1px solid rgba(99,102,241,0.2)"
                                  : "1px solid transparent",
                            }}
                          >
                            <FileCode size={11} /> {f.path.split("/").pop()}
                          </button>
                        ))}
                      </div>
                      <div
                        className="flex-1 overflow-auto p-4"
                        style={{ background: "var(--bg-primary)" }}
                      >
                        {selectedFile && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <span
                                className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded"
                                style={{
                                  background: "rgba(99,102,241,0.1)",
                                  color: "var(--accent-indigo)",
                                }}
                              >
                                {selectedFile.language}
                              </span>
                              <span
                                className="text-[11px]"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {selectedFile.path}
                              </span>
                            </div>
                            <pre
                              className="text-[12px] leading-relaxed overflow-x-auto whitespace-pre-wrap"
                              style={{
                                color: "var(--text-secondary)",
                                fontFamily:
                                  "'JetBrains Mono', 'Fira Code', monospace",
                              }}
                            >
                              <code>{selectedFile.content}</code>
                            </pre>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <Code2 size={28} style={{ color: "var(--text-ghost)" }} />
                      <p
                        className="text-[12px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        No code generated yet
                      </p>
                    </div>
                  )}
                </div>
              )}

              {rightTab === "files" && (
                <div className="h-full flex flex-col">
                  {hasProject ? (
                    <>
                      <div
                        className="px-3 py-2 shrink-0"
                        style={{
                          borderBottom: "1px solid var(--glass-border)",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <FolderTree
                            size={12}
                            style={{ color: "var(--accent-indigo)" }}
                          />
                          <span
                            className="text-[11px] font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            Project Structure
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              background: "rgba(99,102,241,0.1)",
                              color: "var(--accent-indigo)",
                            }}
                          >
                            {projectFiles.length} files
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2">
                        {renderProjectTree(projectTree)}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <FolderTree
                        size={28}
                        style={{ color: "var(--text-ghost)" }}
                      />
                      <p
                        className="text-[12px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        No project files yet
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              className="flex items-center justify-between px-3 py-1.5 text-[10px] shrink-0"
              style={{
                borderTop: "1px solid var(--glass-border)",
                background: "var(--bg-surface)",
                color: "var(--text-muted)",
              }}
            >
              <div className="flex items-center gap-2">
                {hasPreview && rightTab === "preview" && (
                  <span
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                    style={{
                      background: "rgba(16,185,129,0.1)",
                      color: "#10b981",
                    }}
                  >
                    <Sparkles size={9} /> Live
                  </span>
                )}
                {rightTab === "code" && selectedFile && (
                  <span>{selectedFile.path}</span>
                )}
                {rightTab === "files" && (
                  <span>{projectFiles.length} files</span>
                )}
                {rightTab === "preview" && (
                  <span>
                    {preset.label} (
                    {preset.width === "100%" ? "Full" : preset.width})
                  </span>
                )}
              </div>
              {hasPreview && rightTab === "preview" && (
                <button
                  onClick={() => {
                    setPreviewHtml("");
                    setProjectFiles([]);
                    setProjectTree([]);
                    setSelectedFile(null);
                  }}
                  className="flex items-center gap-1 hover:opacity-80"
                  style={{ color: "var(--text-ghost)" }}
                >
                  <X size={10} /> Clear
                </button>
              )}
            </div>
          </div>
        )}

        {!splitView && (hasPreview || hasProject) && mobileView === "chat" && (
          <button
            onClick={() => {
              setSplitView(true);
              setMobileView("preview");
            }}
            className="fixed bottom-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-[12px] font-semibold shadow-lg hover:scale-105 md:bottom-6"
            style={{
              background: "var(--accent-gradient)",
              color: "white",
              boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
            }}
          >
            <Eye size={16} /> View Preview
          </button>
        )}
      </div>
    </div>
  );
}
