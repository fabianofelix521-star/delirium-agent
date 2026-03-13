"""Skills API Route — ClawHub Skill Bank: browse, install, and manage agent skills."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# ─── Skill Catalog (extensible marketplace) ────────────────────────

SKILL_CATALOG: list[dict] = [
    # ═══════════════════════════════════════════════════════════════
    # RESEARCH & WEB
    # ═══════════════════════════════════════════════════════════════
    {
        "id": "web-search",
        "name": "Web Search",
        "description": "Busca inteligente na web com DuckDuckGo. Encontra informações atualizadas sobre qualquer tema.",
        "category": "research",
        "icon": "🔍",
        "color": "#06b6d4",
        "author": "Delirium Core",
        "version": "1.2.0",
        "tags": ["web", "search", "research"],
        "compatible_agents": ["orchestrator", "researcher", "analyst", "fullstack", "writer"],
    },
    {
        "id": "web-scraping",
        "name": "Web Scraping",
        "description": "Extrai conteúdo e dados estruturados de qualquer página web com parsing inteligente.",
        "category": "research",
        "icon": "🕷️",
        "color": "#8b5cf6",
        "author": "Delirium Core",
        "version": "1.1.0",
        "tags": ["web", "scraping", "data", "extraction"],
        "compatible_agents": ["researcher", "analyst", "developer"],
    },
    {
        "id": "competitive-intel",
        "name": "Competitive Intelligence",
        "description": "Análise de concorrentes, market research, trend spotting e benchmarking.",
        "category": "research",
        "icon": "🔬",
        "color": "#06b6d4",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["research", "competitive", "market", "trends"],
        "compatible_agents": ["researcher", "analyst", "writer"],
    },
    {
        "id": "academic-research",
        "name": "Academic Research",
        "description": "Pesquisa acadêmica: papers, citações, revisão bibliográfica e resumos de artigos científicos.",
        "category": "research",
        "icon": "🎓",
        "color": "#1d4ed8",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["academic", "papers", "citations", "science"],
        "compatible_agents": ["researcher", "analyst", "writer"],
    },
    {
        "id": "news-aggregator",
        "name": "News Aggregator",
        "description": "Agrega e sumariza notícias de múltiplas fontes em tempo real por tema ou região.",
        "category": "research",
        "icon": "📰",
        "color": "#0ea5e9",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["news", "aggregation", "realtime", "media"],
        "compatible_agents": ["researcher", "writer", "orchestrator"],
    },
    {
        "id": "social-media-intel",
        "name": "Social Media Intelligence",
        "description": "Monitora trends, hashtags, engajamento e sentimento em redes sociais.",
        "category": "research",
        "icon": "📱",
        "color": "#e11d48",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["social", "twitter", "instagram", "trends", "sentiment"],
        "compatible_agents": ["researcher", "analyst", "writer"],
    },
    # ═══════════════════════════════════════════════════════════════
    # DEVELOPMENT
    # ═══════════════════════════════════════════════════════════════
    {
        "id": "code-generation",
        "name": "Code Generation",
        "description": "Gera código production-ready em TypeScript, Python, React, Rust, Go e mais de 30 linguagens.",
        "category": "development",
        "icon": "💻",
        "color": "#6366f1",
        "author": "Delirium Core",
        "version": "2.0.0",
        "tags": ["code", "typescript", "python", "react", "rust", "go"],
        "compatible_agents": ["developer", "fullstack", "mobile", "orchestrator"],
    },
    {
        "id": "database-ops",
        "name": "Database Operations",
        "description": "CRUD completo: Supabase, PostgreSQL, MySQL, MongoDB, Redis. Queries, migrações, RLS.",
        "category": "development",
        "icon": "🗄️",
        "color": "#10b981",
        "author": "Delirium Core",
        "version": "1.2.0",
        "tags": ["database", "supabase", "sql", "mongodb", "redis", "crud"],
        "compatible_agents": ["developer", "fullstack", "analyst", "devops"],
    },
    {
        "id": "mobile-app",
        "name": "Mobile App Builder",
        "description": "Cria apps React Native/Expo/Flutter com navegação, gestos, câmera e design nativo.",
        "category": "development",
        "icon": "📱",
        "color": "#3b82f6",
        "author": "Delirium Core",
        "version": "1.1.0",
        "tags": ["mobile", "react-native", "expo", "flutter", "ios", "android"],
        "compatible_agents": ["mobile", "fullstack", "developer"],
    },
    {
        "id": "api-design",
        "name": "API Design & Integration",
        "description": "Projeta e implementa APIs RESTful, GraphQL, gRPC, WebSocket com validação e docs automáticos.",
        "category": "development",
        "icon": "🔌",
        "color": "#06b6d4",
        "author": "Delirium Core",
        "version": "1.1.0",
        "tags": ["api", "rest", "graphql", "grpc", "websocket", "fastapi"],
        "compatible_agents": ["developer", "fullstack", "devops"],
    },
    {
        "id": "testing-qa",
        "name": "Testing & QA",
        "description": "Testes unitários, integração, e2e, snapshot, load testing com Jest, Vitest, Playwright, Cypress.",
        "category": "development",
        "icon": "🧪",
        "color": "#10b981",
        "author": "Delirium Core",
        "version": "1.1.0",
        "tags": ["testing", "jest", "vitest", "playwright", "cypress", "qa"],
        "compatible_agents": ["developer", "fullstack", "devops"],
    },
    {
        "id": "ecommerce-builder",
        "name": "E-Commerce Builder",
        "description": "Cria lojas completas: catálogo, carrinho, checkout, pagamento Stripe/MercadoPago, estoque.",
        "category": "development",
        "icon": "🛒",
        "color": "#f59e0b",
        "author": "Delirium Core",
        "version": "1.1.0",
        "tags": ["ecommerce", "store", "stripe", "mercadopago", "cart", "checkout"],
        "compatible_agents": ["fullstack", "designer", "developer"],
    },
    {
        "id": "code-refactor",
        "name": "Code Refactoring",
        "description": "Refatora código: clean code, SOLID, design patterns, performance optimization, debt reduction.",
        "category": "development",
        "icon": "♻️",
        "color": "#22c55e",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["refactor", "clean-code", "solid", "patterns", "optimization"],
        "compatible_agents": ["developer", "fullstack"],
    },
    {
        "id": "code-review",
        "name": "Code Review",
        "description": "Review automatizado: bugs, vulnerabilidades, performance issues, code smells e sugestões de melhoria.",
        "category": "development",
        "icon": "👁️",
        "color": "#a78bfa",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["review", "bugs", "quality", "lint"],
        "compatible_agents": ["developer", "fullstack", "devops"],
    },
    {
        "id": "regex-builder",
        "name": "Regex Builder",
        "description": "Cria, testa e explica expressões regulares complexas com exemplos e edge cases.",
        "category": "development",
        "icon": "🔤",
        "color": "#f472b6",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["regex", "pattern", "matching", "validation"],
        "compatible_agents": ["developer", "fullstack"],
    },
    {
        "id": "realtime-websocket",
        "name": "Real-time & WebSocket",
        "description": "Sistemas real-time: WebSocket, SSE, Supabase Realtime, Socket.IO, pub/sub.",
        "category": "development",
        "icon": "⚡",
        "color": "#facc15",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["realtime", "websocket", "sse", "socket-io", "pubsub"],
        "compatible_agents": ["developer", "fullstack"],
    },
    {
        "id": "auth-system",
        "name": "Auth & Identity",
        "description": "Sistemas de autenticação: OAuth, JWT, RBAC, MFA, social login, SSO, Supabase Auth.",
        "category": "development",
        "icon": "🔐",
        "color": "#7c3aed",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["auth", "oauth", "jwt", "rbac", "mfa", "sso"],
        "compatible_agents": ["developer", "fullstack", "devops"],
    },
    {
        "id": "cms-builder",
        "name": "CMS Builder",
        "description": "Cria sistemas de gerenciamento de conteúdo: WYSIWYG, markdown, media library, drafts.",
        "category": "development",
        "icon": "📝",
        "color": "#2563eb",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["cms", "content", "wysiwyg", "markdown", "admin"],
        "compatible_agents": ["fullstack", "developer"],
    },
    {
        "id": "pwa-builder",
        "name": "PWA Builder",
        "description": "Progressive Web Apps: service worker, offline, push notifications, install prompt.",
        "category": "development",
        "icon": "📲",
        "color": "#0891b2",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["pwa", "offline", "service-worker", "push", "manifest"],
        "compatible_agents": ["fullstack", "developer", "mobile"],
    },
    # ═══════════════════════════════════════════════════════════════
    # DESIGN & UI
    # ═══════════════════════════════════════════════════════════════
    {
        "id": "liquid-glass-design",
        "name": "Liquid Glass Design",
        "description": "Interfaces premium com glassmorphism, gradients, blur effects e animações Apple-tier.",
        "category": "design",
        "icon": "🎨",
        "color": "#ec4899",
        "author": "Delirium Core",
        "version": "1.1.0",
        "tags": ["ui", "design", "glassmorphism", "css", "tailwind"],
        "compatible_agents": ["designer", "fullstack", "mobile"],
    },
    {
        "id": "animation-motion",
        "name": "Animation & Motion",
        "description": "Animações premium com Framer Motion, GSAP, Lottie, CSS transitions e micro-interações.",
        "category": "design",
        "icon": "✨",
        "color": "#ec4899",
        "author": "Delirium Core",
        "version": "1.1.0",
        "tags": ["animation", "framer-motion", "gsap", "lottie", "transitions"],
        "compatible_agents": ["designer", "fullstack", "mobile"],
    },
    {
        "id": "responsive-layout",
        "name": "Responsive Layout",
        "description": "Layouts responsivos: mobile-first, grid systems, breakpoints, container queries.",
        "category": "design",
        "icon": "📐",
        "color": "#14b8a6",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["responsive", "layout", "grid", "flexbox", "mobile-first"],
        "compatible_agents": ["designer", "fullstack", "mobile"],
    },
    {
        "id": "design-system",
        "name": "Design System",
        "description": "Cria design systems completos: tokens, componentes, variantes, documentação e Storybook.",
        "category": "design",
        "icon": "🧩",
        "color": "#d946ef",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["design-system", "tokens", "components", "storybook"],
        "compatible_agents": ["designer", "fullstack"],
    },
    {
        "id": "icon-svg",
        "name": "Icon & SVG Design",
        "description": "Cria ícones SVG customizados, icon sets, logos e ilustrações vetoriais.",
        "category": "design",
        "icon": "🎯",
        "color": "#f43f5e",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["svg", "icons", "logo", "vector", "illustration"],
        "compatible_agents": ["designer"],
    },
    {
        "id": "dark-mode",
        "name": "Dark Mode & Themes",
        "description": "Implementa dark mode, themes dinâmicos, CSS variables e theme switching.",
        "category": "design",
        "icon": "🌙",
        "color": "#1e293b",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["dark-mode", "themes", "css-variables", "toggle"],
        "compatible_agents": ["designer", "fullstack"],
    },
    {
        "id": "accessibility",
        "name": "Accessibility (a11y)",
        "description": "WCAG compliance: ARIA labels, keyboard navigation, screen readers, contrast ratio.",
        "category": "design",
        "icon": "♿",
        "color": "#0284c7",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["accessibility", "a11y", "wcag", "aria", "keyboard"],
        "compatible_agents": ["designer", "fullstack", "developer"],
    },
    # ═══════════════════════════════════════════════════════════════
    # DEVOPS & INFRASTRUCTURE
    # ═══════════════════════════════════════════════════════════════
    {
        "id": "git-ops",
        "name": "Git & GitHub",
        "description": "Controle de versão: commit, push, PR, issues, branches, merge strategies, git flow.",
        "category": "devops",
        "icon": "📦",
        "color": "#f59e0b",
        "author": "Delirium Core",
        "version": "1.1.0",
        "tags": ["git", "github", "version-control", "branches", "pr"],
        "compatible_agents": ["developer", "devops", "fullstack"],
    },
    {
        "id": "docker-deploy",
        "name": "Docker & Containers",
        "description": "Containerização: Dockerfile, docker-compose, multi-stage builds, registries.",
        "category": "devops",
        "icon": "🐳",
        "color": "#3b82f6",
        "author": "Delirium Core",
        "version": "1.1.0",
        "tags": ["docker", "container", "dockerfile", "compose"],
        "compatible_agents": ["devops", "developer", "fullstack"],
    },
    {
        "id": "ci-cd-pipeline",
        "name": "CI/CD Pipeline",
        "description": "Pipelines de deploy: GitHub Actions, GitLab CI, Vercel, Railway, Netlify auto-deploy.",
        "category": "devops",
        "icon": "🚀",
        "color": "#16a34a",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["ci-cd", "github-actions", "deploy", "vercel", "railway"],
        "compatible_agents": ["devops", "developer"],
    },
    {
        "id": "cloud-infra",
        "name": "Cloud Infrastructure",
        "description": "AWS, GCP, Azure, DigitalOcean: compute, storage, CDN, DNS, load balancers.",
        "category": "devops",
        "icon": "☁️",
        "color": "#f97316",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["aws", "gcp", "azure", "cloud", "infrastructure"],
        "compatible_agents": ["devops"],
    },
    {
        "id": "monitoring-logging",
        "name": "Monitoring & Logging",
        "description": "Observabilidade: logs, métricas, alertas, health checks, Sentry, Datadog, Grafana.",
        "category": "devops",
        "icon": "📡",
        "color": "#dc2626",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["monitoring", "logging", "sentry", "metrics", "alerts"],
        "compatible_agents": ["devops", "developer"],
    },
    {
        "id": "nginx-caddy",
        "name": "Reverse Proxy & SSL",
        "description": "Configura Nginx, Caddy, Traefik: reverse proxy, SSL/TLS, rate limiting, caching.",
        "category": "devops",
        "icon": "🔀",
        "color": "#059669",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["nginx", "caddy", "ssl", "proxy", "traefik"],
        "compatible_agents": ["devops"],
    },
    # ═══════════════════════════════════════════════════════════════
    # SECURITY
    # ═══════════════════════════════════════════════════════════════
    {
        "id": "security-audit",
        "name": "Security Audit",
        "description": "Auditoria OWASP Top 10, RLS, headers, CSP, XSS, CSRF, SQL injection, rate limiting.",
        "category": "security",
        "icon": "🛡️",
        "color": "#ef4444",
        "author": "Delirium Core",
        "version": "1.1.0",
        "tags": ["security", "owasp", "audit", "rls", "xss", "csrf"],
        "compatible_agents": ["developer", "devops", "fullstack"],
    },
    {
        "id": "encryption-crypto",
        "name": "Encryption & Crypto",
        "description": "Criptografia: hashing, AES, RSA, tokens, key management, secure storage.",
        "category": "security",
        "icon": "🔒",
        "color": "#b91c1c",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["encryption", "crypto", "hashing", "aes", "rsa"],
        "compatible_agents": ["developer", "devops"],
    },
    {
        "id": "pentest-scanner",
        "name": "Vulnerability Scanner",
        "description": "Scan de vulnerabilidades: dependency audit, secret detection, SAST, DAST.",
        "category": "security",
        "icon": "🔓",
        "color": "#991b1b",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["pentest", "vulnerability", "scan", "dependency-audit"],
        "compatible_agents": ["devops", "developer"],
    },
    # ═══════════════════════════════════════════════════════════════
    # CONTENT & WRITING
    # ═══════════════════════════════════════════════════════════════
    {
        "id": "seo-copywriting",
        "name": "SEO & Copywriting",
        "description": "Conteúdo otimizado para SEO, copy persuasiva, headlines, meta tags e microcopy.",
        "category": "content",
        "icon": "✍️",
        "color": "#a855f7",
        "author": "Delirium Core",
        "version": "1.1.0",
        "tags": ["seo", "copywriting", "content", "marketing", "meta"],
        "compatible_agents": ["writer", "researcher", "orchestrator"],
    },
    {
        "id": "translation",
        "name": "Multi-language Translation",
        "description": "Tradução profissional em 50+ idiomas com contexto e tom correto, i18n para apps.",
        "category": "content",
        "icon": "🌐",
        "color": "#0ea5e9",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["translation", "i18n", "multilingual", "localization"],
        "compatible_agents": ["writer", "orchestrator", "fullstack"],
    },
    {
        "id": "documentation",
        "name": "Technical Documentation",
        "description": "Docs técnicos: README, API docs, guides, changelogs, Swagger/OpenAPI, JSDoc.",
        "category": "content",
        "icon": "📚",
        "color": "#6d28d9",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["docs", "readme", "api-docs", "swagger", "jsdoc"],
        "compatible_agents": ["writer", "developer", "fullstack"],
    },
    {
        "id": "email-templates",
        "name": "Email Templates",
        "description": "Cria templates de email responsivos: transacional, marketing, newsletter com MJML.",
        "category": "content",
        "icon": "📧",
        "color": "#8b5cf6",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["email", "template", "newsletter", "mjml", "marketing"],
        "compatible_agents": ["writer", "designer", "fullstack"],
    },
    {
        "id": "blog-writer",
        "name": "Blog & Article Writer",
        "description": "Escreve artigos, posts de blog, threads e conteúdo longo com SEO e storytelling.",
        "category": "content",
        "icon": "📝",
        "color": "#7c3aed",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["blog", "article", "writing", "storytelling"],
        "compatible_agents": ["writer", "researcher"],
    },
    {
        "id": "social-content",
        "name": "Social Media Content",
        "description": "Cria posts, captions, hashtags e calendário editorial para redes sociais.",
        "category": "content",
        "icon": "💬",
        "color": "#e11d48",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["social", "posts", "captions", "hashtags", "calendar"],
        "compatible_agents": ["writer"],
    },
    # ═══════════════════════════════════════════════════════════════
    # ANALYTICS & DATA
    # ═══════════════════════════════════════════════════════════════
    {
        "id": "data-analysis",
        "name": "Data Analysis",
        "description": "Análise de dados com pandas, numpy, métricas, KPIs, relatórios e dashboards.",
        "category": "analytics",
        "icon": "📊",
        "color": "#f97316",
        "author": "Delirium Core",
        "version": "1.1.0",
        "tags": ["data", "pandas", "numpy", "analysis", "metrics", "kpi"],
        "compatible_agents": ["analyst", "researcher", "developer"],
    },
    {
        "id": "data-visualization",
        "name": "Data Visualization",
        "description": "Gráficos e dashboards: Chart.js, D3.js, Recharts, Plotly, mapas de calor, geo.",
        "category": "analytics",
        "icon": "📈",
        "color": "#ea580c",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["charts", "d3", "recharts", "plotly", "dashboard"],
        "compatible_agents": ["analyst", "designer", "fullstack"],
    },
    {
        "id": "spreadsheet-ops",
        "name": "Spreadsheet Operations",
        "description": "Manipula CSV, Excel, Google Sheets: parsing, transformação, pivot tables, fórmulas.",
        "category": "analytics",
        "icon": "📋",
        "color": "#16a34a",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["csv", "excel", "sheets", "pivot", "formulas"],
        "compatible_agents": ["analyst", "researcher"],
    },
    {
        "id": "financial-analysis",
        "name": "Financial Analysis",
        "description": "Análise financeira: projeções, valuation, ROI, fluxo de caixa, relatórios contábeis.",
        "category": "analytics",
        "icon": "💰",
        "color": "#059669",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["finance", "roi", "valuation", "cashflow", "accounting"],
        "compatible_agents": ["analyst"],
    },
    {
        "id": "statistics",
        "name": "Statistics & ML Basics",
        "description": "Estatística, regressão, classificação, clustering, A/B testing, scikit-learn basics.",
        "category": "analytics",
        "icon": "🧮",
        "color": "#7c3aed",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["statistics", "ml", "regression", "classification", "ab-testing"],
        "compatible_agents": ["analyst", "researcher", "developer"],
    },
    # ═══════════════════════════════════════════════════════════════
    # MEDIA & CREATIVE
    # ═══════════════════════════════════════════════════════════════
    {
        "id": "voice-tts-stt",
        "name": "Voice & Speech",
        "description": "Text-to-Speech e Speech-to-Text com Edge TTS, ElevenLabs, OpenAI Whisper e Groq.",
        "category": "media",
        "icon": "🎙️",
        "color": "#ef4444",
        "author": "Delirium Core",
        "version": "1.1.0",
        "tags": ["voice", "tts", "stt", "speech", "whisper"],
        "compatible_agents": ["orchestrator", "fullstack"],
    },
    {
        "id": "image-generation",
        "name": "Image Generation",
        "description": "Gera imagens com DALL-E, Stable Diffusion, Midjourney, Flux. Prompts otimizados.",
        "category": "media",
        "icon": "🖼️",
        "color": "#a855f7",
        "author": "Delirium Core",
        "version": "1.1.0",
        "tags": ["image", "dalle", "stable-diffusion", "midjourney", "flux"],
        "compatible_agents": ["designer", "writer", "orchestrator"],
    },
    {
        "id": "video-editing",
        "name": "Video Processing",
        "description": "Processamento de vídeo: ffmpeg, thumbnail gen, transcrição, legendas automáticas.",
        "category": "media",
        "icon": "🎬",
        "color": "#dc2626",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["video", "ffmpeg", "transcription", "subtitles", "thumbnail"],
        "compatible_agents": ["designer", "orchestrator"],
    },
    {
        "id": "audio-processing",
        "name": "Audio Processing",
        "description": "Manipulação de áudio: conversão, noise removal, concatenação, podcast editing.",
        "category": "media",
        "icon": "🎵",
        "color": "#9333ea",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["audio", "podcast", "noise-removal", "conversion"],
        "compatible_agents": ["orchestrator"],
    },
    {
        "id": "pdf-processor",
        "name": "PDF Processor",
        "description": "Lê, extrai, gera e manipula PDFs: merge, split, OCR, formulários, assinaturas.",
        "category": "media",
        "icon": "📄",
        "color": "#dc2626",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["pdf", "ocr", "merge", "split", "forms"],
        "compatible_agents": ["analyst", "writer", "orchestrator"],
    },
    {
        "id": "qr-barcode",
        "name": "QR Code & Barcode",
        "description": "Gera e decodifica QR codes, barcodes, data matrix para apps e marketing.",
        "category": "media",
        "icon": "📷",
        "color": "#1e293b",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["qr", "barcode", "generator", "scanner"],
        "compatible_agents": ["developer", "fullstack", "designer"],
    },
    # ═══════════════════════════════════════════════════════════════
    # AI & MACHINE LEARNING
    # ═══════════════════════════════════════════════════════════════
    {
        "id": "prompt-engineering",
        "name": "Prompt Engineering",
        "description": "Otimiza prompts para LLMs: chain-of-thought, few-shot, system prompts, RAG patterns.",
        "category": "ai",
        "icon": "🧠",
        "color": "#8b5cf6",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["prompt", "llm", "cot", "few-shot", "rag"],
        "compatible_agents": ["orchestrator", "researcher", "developer"],
    },
    {
        "id": "embeddings-vectordb",
        "name": "Embeddings & Vector DB",
        "description": "Embeddings, vector search, RAG pipelines com Pinecone, Supabase pgvector, Chroma.",
        "category": "ai",
        "icon": "🔮",
        "color": "#7c3aed",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["embeddings", "vector", "rag", "pinecone", "pgvector"],
        "compatible_agents": ["developer", "researcher"],
    },
    {
        "id": "nlp-text",
        "name": "NLP & Text Processing",
        "description": "Processamento de linguagem: sentiment analysis, NER, summarization, classification.",
        "category": "ai",
        "icon": "🗣️",
        "color": "#6366f1",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["nlp", "sentiment", "ner", "summarization", "classification"],
        "compatible_agents": ["researcher", "analyst", "developer"],
    },
    {
        "id": "agent-builder",
        "name": "AI Agent Builder",
        "description": "Cria agentes personalizados: tool use, memory, multi-step reasoning, function calling.",
        "category": "ai",
        "icon": "🤖",
        "color": "#4f46e5",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["agent", "tools", "function-calling", "reasoning"],
        "compatible_agents": ["orchestrator", "developer"],
    },
    {
        "id": "fine-tuning",
        "name": "Model Fine-tuning",
        "description": "Fine-tune de modelos: dataset preparation, LoRA, RLHF, evaluation, deployment.",
        "category": "ai",
        "icon": "⚙️",
        "color": "#3730a3",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["fine-tuning", "lora", "rlhf", "training", "dataset"],
        "compatible_agents": ["researcher", "developer"],
    },
    # ═══════════════════════════════════════════════════════════════
    # AUTOMATION & WORKFLOW
    # ═══════════════════════════════════════════════════════════════
    {
        "id": "task-automation",
        "name": "Task Automation",
        "description": "Automatiza tarefas repetitivas: file ops, cron jobs, data pipelines, batch processing.",
        "category": "automation",
        "icon": "⚡",
        "color": "#eab308",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["automation", "cron", "pipeline", "batch", "scripting"],
        "compatible_agents": ["devops", "developer", "orchestrator"],
    },
    {
        "id": "workflow-builder",
        "name": "Workflow Builder",
        "description": "Cria workflows multi-step: n8n, Zapier-style, event-driven, state machines.",
        "category": "automation",
        "icon": "🔄",
        "color": "#f59e0b",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["workflow", "n8n", "zapier", "event-driven", "state-machine"],
        "compatible_agents": ["orchestrator", "devops", "developer"],
    },
    {
        "id": "notification-system",
        "name": "Notification System",
        "description": "Push notifications, email alerts, SMS, webhook, Slack/Discord/Telegram bots.",
        "category": "automation",
        "icon": "🔔",
        "color": "#f97316",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["notification", "push", "email", "sms", "webhook", "bot"],
        "compatible_agents": ["developer", "fullstack", "devops"],
    },
    {
        "id": "scheduler",
        "name": "Task Scheduler",
        "description": "Agendamento de tarefas: cron expressions, queue management, retry logic, dead-letter.",
        "category": "automation",
        "icon": "⏰",
        "color": "#0891b2",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["scheduler", "cron", "queue", "retry", "jobs"],
        "compatible_agents": ["devops", "developer"],
    },
    {
        "id": "web-automation",
        "name": "Web Automation",
        "description": "Automação web: Puppeteer, Playwright, form filling, screenshots, scraping avançado.",
        "category": "automation",
        "icon": "🌐",
        "color": "#4f46e5",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["puppeteer", "playwright", "browser", "scraping", "automation"],
        "compatible_agents": ["developer", "researcher", "devops"],
    },
    # ═══════════════════════════════════════════════════════════════
    # BUSINESS & PRODUCTIVITY
    # ═══════════════════════════════════════════════════════════════
    {
        "id": "project-management",
        "name": "Project Management",
        "description": "Gestão de projetos: sprints, kanban, milestones, burndown, Jira/Linear/Notion integration.",
        "category": "business",
        "icon": "📋",
        "color": "#2563eb",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["project", "sprint", "kanban", "jira", "management"],
        "compatible_agents": ["orchestrator", "analyst"],
    },
    {
        "id": "pitch-deck",
        "name": "Pitch Deck & Presentations",
        "description": "Cria pitch decks, apresentações e slides persuasivos com storytelling e dados.",
        "category": "business",
        "icon": "🎤",
        "color": "#7c3aed",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["pitch", "presentation", "slides", "startup", "investor"],
        "compatible_agents": ["writer", "analyst"],
    },
    {
        "id": "legal-contracts",
        "name": "Legal & Contracts",
        "description": "Gera e revisa contratos, termos de uso, privacy policy, NDA, LGPD compliance.",
        "category": "business",
        "icon": "⚖️",
        "color": "#4b5563",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["legal", "contracts", "privacy", "lgpd", "terms"],
        "compatible_agents": ["writer", "analyst"],
    },
    {
        "id": "invoice-finance",
        "name": "Invoice & Billing",
        "description": "Gera invoices, recibos, relatórios financeiros, integração com gateways de pagamento.",
        "category": "business",
        "icon": "🧾",
        "color": "#059669",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["invoice", "billing", "receipt", "payment", "finance"],
        "compatible_agents": ["analyst", "fullstack"],
    },
    {
        "id": "crm-builder",
        "name": "CRM Builder",
        "description": "Cria sistemas CRM: contacts, deals, pipeline, follow-ups, automações de vendas.",
        "category": "business",
        "icon": "🤝",
        "color": "#0d9488",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["crm", "sales", "contacts", "pipeline", "deals"],
        "compatible_agents": ["fullstack", "developer"],
    },
    {
        "id": "calendar-scheduling",
        "name": "Calendar & Scheduling",
        "description": "Integração com calendários: agendamento, disponibilidade, booking, reminders.",
        "category": "business",
        "icon": "📅",
        "color": "#0284c7",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["calendar", "scheduling", "booking", "reminders"],
        "compatible_agents": ["orchestrator", "fullstack"],
    },
    # ═══════════════════════════════════════════════════════════════
    # MATH & SCIENCE
    # ═══════════════════════════════════════════════════════════════
    {
        "id": "math-solver",
        "name": "Math Solver",
        "description": "Resolve equações, cálculo, álgebra linear, otimização, LaTeX rendering.",
        "category": "science",
        "icon": "🔢",
        "color": "#6366f1",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["math", "equations", "calculus", "algebra", "latex"],
        "compatible_agents": ["analyst", "researcher"],
    },
    {
        "id": "weather-geo",
        "name": "Weather & Geolocation",
        "description": "Dados de clima em tempo real, previsões, geocoding, mapas e coordenadas.",
        "category": "science",
        "icon": "🌤️",
        "color": "#0ea5e9",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["weather", "geo", "maps", "coordinates", "api"],
        "compatible_agents": ["researcher", "orchestrator"],
    },
    {
        "id": "unit-converter",
        "name": "Unit Converter",
        "description": "Converte unidades: moedas, medidas, timestamps, timezones, encodings.",
        "category": "science",
        "icon": "⚖️",
        "color": "#14b8a6",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["converter", "units", "currency", "timezone", "encoding"],
        "compatible_agents": ["orchestrator", "analyst"],
    },
    # ═══════════════════════════════════════════════════════════════
    # MCP & INTEGRATIONS
    # ═══════════════════════════════════════════════════════════════
    {
        "id": "mcp-server",
        "name": "MCP Server Builder",
        "description": "Cria e gerencia MCP servers: tool definitions, transport, auth, resource management.",
        "category": "integrations",
        "icon": "🔗",
        "color": "#4f46e5",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["mcp", "server", "tools", "protocol", "integration"],
        "compatible_agents": ["developer", "orchestrator"],
    },
    {
        "id": "webhook-manager",
        "name": "Webhook Manager",
        "description": "Gerencia webhooks: incoming/outgoing, signature verification, retry, logging.",
        "category": "integrations",
        "icon": "🪝",
        "color": "#0891b2",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["webhook", "http", "signature", "events"],
        "compatible_agents": ["developer", "devops"],
    },
    {
        "id": "oauth-connector",
        "name": "OAuth Connector",
        "description": "Conecta com 50+ serviços via OAuth: Google, GitHub, Slack, Discord, Notion, Spotify.",
        "category": "integrations",
        "icon": "🔑",
        "color": "#f59e0b",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["oauth", "google", "github", "slack", "discord", "notion"],
        "compatible_agents": ["developer", "fullstack", "orchestrator"],
    },
    {
        "id": "stripe-payments",
        "name": "Stripe Payments",
        "description": "Integração Stripe: checkout, subscriptions, invoices, webhooks, customer portal.",
        "category": "integrations",
        "icon": "💳",
        "color": "#6366f1",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["stripe", "payments", "subscription", "checkout", "billing"],
        "compatible_agents": ["fullstack", "developer"],
    },
    {
        "id": "supabase-advanced",
        "name": "Supabase Advanced",
        "description": "Supabase pro: Edge Functions, Realtime, Storage, Row Level Security, triggers, RPCs.",
        "category": "integrations",
        "icon": "⚡",
        "color": "#10b981",
        "author": "Delirium Core",
        "version": "1.0.0",
        "tags": ["supabase", "edge-functions", "realtime", "storage", "rls"],
        "compatible_agents": ["developer", "fullstack", "devops"],
    },
    # ═══════════════════════════════════════════════════════════════
    # RESEARCH & WEB (MORE)
    # ═══════════════════════════════════════════════════════════════
    {"id": "patent-search", "name": "Patent Search", "description": "Busca e análise de patentes em bases USPTO, EPO e WIPO.", "category": "research", "icon": "📜", "color": "#7c3aed", "author": "Community", "version": "1.0.0", "tags": ["patent", "intellectual-property", "search"], "compatible_agents": ["researcher", "analyst"]},
    {"id": "arxiv-explorer", "name": "ArXiv Explorer", "description": "Pesquisa artigos científicos no ArXiv por tema, autor ou categoria.", "category": "research", "icon": "📚", "color": "#b91c1c", "author": "Community", "version": "1.0.0", "tags": ["arxiv", "papers", "science", "preprints"], "compatible_agents": ["researcher", "analyst", "writer"]},
    {"id": "fact-checker", "name": "Fact Checker", "description": "Verificação de fatos com múltiplas fontes e score de credibilidade.", "category": "research", "icon": "✅", "color": "#059669", "author": "Community", "version": "1.0.0", "tags": ["fact-check", "verification", "credibility"], "compatible_agents": ["researcher", "writer", "analyst"]},
    {"id": "google-scholar", "name": "Google Scholar", "description": "Busca artigos acadêmicos, citações e perfis no Google Scholar.", "category": "research", "icon": "🎓", "color": "#4338ca", "author": "Community", "version": "1.0.0", "tags": ["scholar", "academic", "citations", "research"], "compatible_agents": ["researcher", "analyst"]},
    {"id": "company-research", "name": "Company Research", "description": "Pesquisa completa de empresas: financeiro, equipe, produtos, competidores.", "category": "research", "icon": "🏢", "color": "#0369a1", "author": "Community", "version": "1.1.0", "tags": ["company", "business", "research", "financials"], "compatible_agents": ["researcher", "analyst"]},
    {"id": "wikipedia-tool", "name": "Wikipedia Tool", "description": "Busca e extrai informações estruturadas da Wikipedia.", "category": "research", "icon": "📖", "color": "#6b7280", "author": "Community", "version": "1.0.0", "tags": ["wikipedia", "encyclopedia", "knowledge"], "compatible_agents": ["researcher", "writer", "orchestrator"]},
    {"id": "legal-research", "name": "Legal Research", "description": "Pesquisa jurídica: legislação, jurisprudência, doutrina e casos.", "category": "research", "icon": "⚖️", "color": "#78350f", "author": "Community", "version": "1.0.0", "tags": ["legal", "law", "jurisprudence", "compliance"], "compatible_agents": ["researcher", "analyst"]},
    {"id": "market-data", "name": "Market Data", "description": "Dados de mercado em tempo real: ações, crypto, forex, commodities.", "category": "research", "icon": "📊", "color": "#16a34a", "author": "Community", "version": "1.2.0", "tags": ["stocks", "crypto", "forex", "market", "trading"], "compatible_agents": ["researcher", "analyst"]},
    # ═══════════════════════════════════════════════════════════════
    # DEVELOPMENT (MORE)
    # ═══════════════════════════════════════════════════════════════
    {"id": "graphql-builder", "name": "GraphQL Builder", "description": "Cria schemas, queries, mutations e resolvers GraphQL.", "category": "development", "icon": "◆", "color": "#e10098", "author": "Community", "version": "1.0.0", "tags": ["graphql", "api", "schema", "queries"], "compatible_agents": ["developer", "fullstack"]},
    {"id": "grpc-proto", "name": "gRPC & Protobuf", "description": "Gera .proto files, stubs e serviços gRPC em múltiplas linguagens.", "category": "development", "icon": "🔗", "color": "#244c5a", "author": "Community", "version": "1.0.0", "tags": ["grpc", "protobuf", "rpc", "microservices"], "compatible_agents": ["developer", "devops"]},
    {"id": "rust-dev", "name": "Rust Development", "description": "Desenvolvimento Rust: ownership, lifetimes, cargo, async, macros.", "category": "development", "icon": "🦀", "color": "#dea584", "author": "Community", "version": "1.0.0", "tags": ["rust", "cargo", "systems", "performance"], "compatible_agents": ["developer"]},
    {"id": "go-dev", "name": "Go Development", "description": "Desenvolvimento Go: goroutines, channels, módulos, HTTP servers.", "category": "development", "icon": "🐹", "color": "#00add8", "author": "Community", "version": "1.0.0", "tags": ["go", "golang", "concurrency", "backend"], "compatible_agents": ["developer", "devops"]},
    {"id": "python-advanced", "name": "Python Advanced", "description": "Python avançado: decorators, metaclasses, asyncio, type hints, dataclasses.", "category": "development", "icon": "🐍", "color": "#3776ab", "author": "Community", "version": "1.1.0", "tags": ["python", "advanced", "asyncio", "typing"], "compatible_agents": ["developer", "fullstack", "analyst"]},
    {"id": "java-spring", "name": "Java & Spring Boot", "description": "Java enterprise: Spring Boot, JPA, Security, microservices, Maven/Gradle.", "category": "development", "icon": "☕", "color": "#5382a1", "author": "Community", "version": "1.0.0", "tags": ["java", "spring", "enterprise", "microservices"], "compatible_agents": ["developer"]},
    {"id": "csharp-dotnet", "name": "C# & .NET", "description": "Desenvolvimento C#/.NET: ASP.NET Core, Entity Framework, LINQ, Blazor.", "category": "development", "icon": "🟣", "color": "#512bd4", "author": "Community", "version": "1.0.0", "tags": ["csharp", "dotnet", "aspnet", "blazor"], "compatible_agents": ["developer"]},
    {"id": "swift-ios", "name": "Swift & iOS", "description": "Desenvolvimento iOS: SwiftUI, UIKit, CoreData, Combine, SPM.", "category": "development", "icon": "🍎", "color": "#f05138", "author": "Community", "version": "1.0.0", "tags": ["swift", "ios", "swiftui", "apple", "mobile"], "compatible_agents": ["developer", "mobile"]},
    {"id": "kotlin-android", "name": "Kotlin & Android", "description": "Desenvolvimento Android: Jetpack Compose, Hilt, Room, Coroutines.", "category": "development", "icon": "🤖", "color": "#7f52ff", "author": "Community", "version": "1.0.0", "tags": ["kotlin", "android", "jetpack", "compose"], "compatible_agents": ["developer", "mobile"]},
    {"id": "flutter-dart", "name": "Flutter & Dart", "description": "Desenvolvimento cross-platform com Flutter: widgets, state management, packages.", "category": "development", "icon": "🦋", "color": "#02569b", "author": "Community", "version": "1.0.0", "tags": ["flutter", "dart", "cross-platform", "mobile"], "compatible_agents": ["developer", "mobile"]},
    {"id": "elixir-phoenix", "name": "Elixir & Phoenix", "description": "Elixir/Phoenix: LiveView, Ecto, GenServer, OTP, channels.", "category": "development", "icon": "💧", "color": "#4e2a8e", "author": "Community", "version": "1.0.0", "tags": ["elixir", "phoenix", "liveview", "erlang"], "compatible_agents": ["developer"]},
    {"id": "sql-mastery", "name": "SQL Mastery", "description": "SQL avançado: CTEs, window functions, pivots, query optimization, migrations.", "category": "development", "icon": "🗃️", "color": "#336791", "author": "Community", "version": "1.0.0", "tags": ["sql", "postgres", "mysql", "optimization"], "compatible_agents": ["developer", "analyst", "fullstack"]},
    {"id": "orm-builder", "name": "ORM Builder", "description": "Gera models e migrations para Prisma, Drizzle, TypeORM, Sequelize.", "category": "development", "icon": "🏗️", "color": "#2d3748", "author": "Community", "version": "1.0.0", "tags": ["orm", "prisma", "drizzle", "typeorm", "models"], "compatible_agents": ["developer", "fullstack"]},
    {"id": "electron-desktop", "name": "Electron Desktop", "description": "Cria apps desktop com Electron: IPC, auto-update, tray, native menus.", "category": "development", "icon": "🖥️", "color": "#47848f", "author": "Community", "version": "1.0.0", "tags": ["electron", "desktop", "cross-platform", "nodejs"], "compatible_agents": ["developer", "fullstack"]},
    {"id": "tauri-desktop", "name": "Tauri Desktop", "description": "Apps desktop leves com Tauri: Rust backend, web frontend, system tray.", "category": "development", "icon": "🦀", "color": "#ffc131", "author": "Community", "version": "1.0.0", "tags": ["tauri", "desktop", "rust", "lightweight"], "compatible_agents": ["developer"]},
    {"id": "wasm-dev", "name": "WebAssembly", "description": "Desenvolvimento WebAssembly: compilação Rust/C++, WASI, bindings JavaScript.", "category": "development", "icon": "⚙️", "color": "#654ff0", "author": "Community", "version": "1.0.0", "tags": ["wasm", "webassembly", "performance", "binary"], "compatible_agents": ["developer"]},
    {"id": "microservices", "name": "Microservices Architecture", "description": "Design de microserviços: service mesh, event-driven, CQRS, saga patterns.", "category": "development", "icon": "🔀", "color": "#0891b2", "author": "Community", "version": "1.0.0", "tags": ["microservices", "architecture", "cqrs", "event-driven"], "compatible_agents": ["developer", "devops", "fullstack"]},
    {"id": "blockchain-web3", "name": "Blockchain & Web3", "description": "Smart contracts Solidity, ethers.js, DApps, NFTs, DeFi protocols.", "category": "development", "icon": "⛓️", "color": "#3c3c3d", "author": "Community", "version": "1.1.0", "tags": ["blockchain", "web3", "solidity", "ethereum", "nft"], "compatible_agents": ["developer", "fullstack"]},
    {"id": "game-dev", "name": "Game Development", "description": "Game dev: Unity C#, Godot GDScript, Phaser.js, game mechanics, physics.", "category": "development", "icon": "🎮", "color": "#1a1a2e", "author": "Community", "version": "1.0.0", "tags": ["game", "unity", "godot", "phaser", "gamedev"], "compatible_agents": ["developer"]},
    {"id": "cli-tool-builder", "name": "CLI Tool Builder", "description": "Cria CLIs profissionais: arg parsing, subcommands, interactive prompts, colors.", "category": "development", "icon": "💻", "color": "#22c55e", "author": "Community", "version": "1.0.0", "tags": ["cli", "terminal", "commander", "inquirer"], "compatible_agents": ["developer", "devops"]},
    {"id": "package-publisher", "name": "Package Publisher", "description": "Publica packages npm, PyPI, crates.io, NuGet: versioning, changelogs, CI.", "category": "development", "icon": "📦", "color": "#cb3837", "author": "Community", "version": "1.0.0", "tags": ["npm", "pypi", "packages", "publish", "versioning"], "compatible_agents": ["developer"]},
    # ═══════════════════════════════════════════════════════════════
    # DESIGN (MORE)
    # ═══════════════════════════════════════════════════════════════
    {"id": "figma-integration", "name": "Figma Integration", "description": "Converte designs Figma para código: components, tokens, assets.", "category": "design", "icon": "🎨", "color": "#a259ff", "author": "Community", "version": "1.0.0", "tags": ["figma", "design-to-code", "tokens", "components"], "compatible_agents": ["designer", "fullstack"]},
    {"id": "3d-modeling", "name": "3D Modeling", "description": "Three.js, React Three Fiber, 3D scenes, shaders, GLTF.", "category": "design", "icon": "🧊", "color": "#049ef4", "author": "Community", "version": "1.0.0", "tags": ["3d", "threejs", "webgl", "shaders", "r3f"], "compatible_agents": ["designer", "developer"]},
    {"id": "color-palette", "name": "Color Palette Generator", "description": "Gera paletas harmoniosas: complementar, análoga, triádica, com acessibilidade.", "category": "design", "icon": "🌈", "color": "#f472b6", "author": "Community", "version": "1.0.0", "tags": ["color", "palette", "harmony", "accessibility"], "compatible_agents": ["designer"]},
    {"id": "typography", "name": "Typography System", "description": "Sistema tipográfico: fluid type, modular scale, pairing, variable fonts.", "category": "design", "icon": "🔤", "color": "#475569", "author": "Community", "version": "1.0.0", "tags": ["typography", "fonts", "fluid-type", "pairing"], "compatible_agents": ["designer", "fullstack"]},
    {"id": "css-art", "name": "CSS Art & Effects", "description": "CSS artístico: shapes, gradients, blend modes, clip-path, glassmorphism.", "category": "design", "icon": "✨", "color": "#ec4899", "author": "Community", "version": "1.0.0", "tags": ["css", "art", "effects", "gradients", "glassmorphism"], "compatible_agents": ["designer", "fullstack"]},
    {"id": "ui-patterns", "name": "UI Patterns Library", "description": "Catálogo de UI patterns: modals, toasts, drawers, tooltips, menus.", "category": "design", "icon": "📐", "color": "#6366f1", "author": "Community", "version": "1.0.0", "tags": ["ui", "patterns", "components", "library"], "compatible_agents": ["designer", "fullstack"]},
    {"id": "motion-design", "name": "Motion Design", "description": "Motion design avançado: Lottie, GSAP, spring physics, page transitions.", "category": "design", "icon": "🎬", "color": "#ea580c", "author": "Community", "version": "1.0.0", "tags": ["motion", "animation", "lottie", "gsap", "transitions"], "compatible_agents": ["designer", "fullstack"]},
    {"id": "wireframe-gen", "name": "Wireframe Generator", "description": "Gera wireframes e protótipos rápidos a partir de descrições textuais.", "category": "design", "icon": "📝", "color": "#94a3b8", "author": "Community", "version": "1.0.0", "tags": ["wireframe", "prototype", "layout", "sketch"], "compatible_agents": ["designer"]},
    # ═══════════════════════════════════════════════════════════════
    # AI & ML (MORE)
    # ═══════════════════════════════════════════════════════════════
    {"id": "llm-fine-tuning", "name": "LLM Fine-Tuning", "description": "Fine-tuning de LLMs: LoRA, QLoRA, dataset prep, hyperparameter tuning.", "category": "ai", "icon": "🔧", "color": "#7c3aed", "author": "Community", "version": "1.0.0", "tags": ["fine-tuning", "lora", "training", "llm"], "compatible_agents": ["developer", "researcher"]},
    {"id": "embedding-search", "name": "Embedding & Vector Search", "description": "Embeddings, vector databases (Pinecone, Chroma, Weaviate), semantic search.", "category": "ai", "icon": "🧮", "color": "#0891b2", "author": "Community", "version": "1.0.0", "tags": ["embedding", "vectors", "semantic-search", "rag"], "compatible_agents": ["developer", "researcher"]},
    {"id": "rag-pipeline", "name": "RAG Pipeline", "description": "Retrieval-Augmented Generation: document ingestion, chunking, retrieval, reranking.", "category": "ai", "icon": "📑", "color": "#059669", "author": "Community", "version": "1.1.0", "tags": ["rag", "retrieval", "augmented", "documents"], "compatible_agents": ["developer", "researcher"]},
    {"id": "agent-framework", "name": "Agent Framework", "description": "Frameworks de agentes: LangChain, CrewAI, AutoGen, tool calling, memory.", "category": "ai", "icon": "🤖", "color": "#1e40af", "author": "Community", "version": "1.0.0", "tags": ["agents", "langchain", "crewai", "autogen"], "compatible_agents": ["developer", "researcher"]},
    {"id": "computer-vision", "name": "Computer Vision", "description": "CV: detecção de objetos, segmentação, OCR, face detection, YOLO.", "category": "ai", "icon": "👁️", "color": "#dc2626", "author": "Community", "version": "1.0.0", "tags": ["vision", "yolo", "detection", "ocr", "segmentation"], "compatible_agents": ["developer", "researcher"]},
    {"id": "speech-ai", "name": "Speech AI", "description": "Speech: Whisper STT, TTS avançado, voice cloning, speaker diarization.", "category": "ai", "icon": "🗣️", "color": "#7c2d12", "author": "Community", "version": "1.0.0", "tags": ["speech", "whisper", "tts", "stt", "voice"], "compatible_agents": ["developer", "researcher"]},
    {"id": "ml-ops", "name": "MLOps", "description": "MLOps: model registry, experiment tracking, serving, monitoring, A/B testing.", "category": "ai", "icon": "📈", "color": "#0d9488", "author": "Community", "version": "1.0.0", "tags": ["mlops", "deployment", "monitoring", "experiments"], "compatible_agents": ["developer", "devops"]},
    {"id": "diffusion-models", "name": "Diffusion Models", "description": "Stable Diffusion, DALL-E, Midjourney prompts, ControlNet, img2img.", "category": "ai", "icon": "🎨", "color": "#a855f7", "author": "Community", "version": "1.0.0", "tags": ["diffusion", "stable-diffusion", "image-gen", "controlnet"], "compatible_agents": ["designer", "researcher"]},
    {"id": "multimodal-ai", "name": "Multimodal AI", "description": "AI multimodal: vision-language models, audio-text, document understanding.", "category": "ai", "icon": "🔮", "color": "#6d28d9", "author": "Community", "version": "1.0.0", "tags": ["multimodal", "vision-language", "document-ai"], "compatible_agents": ["developer", "researcher"]},
    # ═══════════════════════════════════════════════════════════════
    # DEVOPS & INFRA (MORE)
    # ═══════════════════════════════════════════════════════════════
    {"id": "kubernetes", "name": "Kubernetes", "description": "K8s: deployments, services, ingress, helm charts, operators, scaling.", "category": "devops", "icon": "☸️", "color": "#326ce5", "author": "Community", "version": "1.1.0", "tags": ["kubernetes", "k8s", "helm", "containers", "orchestration"], "compatible_agents": ["devops", "developer"]},
    {"id": "terraform", "name": "Terraform IaC", "description": "Infrastructure as Code: providers, modules, state management, workspaces.", "category": "devops", "icon": "🏗️", "color": "#844fba", "author": "Community", "version": "1.0.0", "tags": ["terraform", "iac", "infrastructure", "providers"], "compatible_agents": ["devops"]},
    {"id": "ansible", "name": "Ansible Automation", "description": "Ansible: playbooks, roles, inventory, vault, AWX/Tower.", "category": "devops", "icon": "📋", "color": "#1a1918", "author": "Community", "version": "1.0.0", "tags": ["ansible", "automation", "configuration", "playbooks"], "compatible_agents": ["devops"]},
    {"id": "aws-tools", "name": "AWS Tools", "description": "AWS: EC2, S3, Lambda, RDS, CloudFront, IAM, CDK, SAM.", "category": "devops", "icon": "☁️", "color": "#ff9900", "author": "Community", "version": "1.2.0", "tags": ["aws", "lambda", "s3", "ec2", "cloud"], "compatible_agents": ["devops", "developer"]},
    {"id": "gcp-tools", "name": "Google Cloud Tools", "description": "GCP: Cloud Run, Cloud Functions, BigQuery, Firestore, Pub/Sub.", "category": "devops", "icon": "☁️", "color": "#4285f4", "author": "Community", "version": "1.0.0", "tags": ["gcp", "google-cloud", "bigquery", "cloud-run"], "compatible_agents": ["devops", "developer"]},
    {"id": "azure-tools", "name": "Azure Tools", "description": "Azure: Functions, Cosmos DB, App Service, AKS, DevOps pipelines.", "category": "devops", "icon": "☁️", "color": "#0078d4", "author": "Community", "version": "1.0.0", "tags": ["azure", "functions", "cosmos", "devops"], "compatible_agents": ["devops", "developer"]},
    {"id": "github-actions", "name": "GitHub Actions", "description": "CI/CD com GitHub Actions: workflows, actions, matrix builds, secrets.", "category": "devops", "icon": "🔄", "color": "#2088ff", "author": "Community", "version": "1.1.0", "tags": ["github-actions", "ci-cd", "workflows", "automation"], "compatible_agents": ["devops", "developer"]},
    {"id": "prometheus-grafana", "name": "Prometheus & Grafana", "description": "Monitoring stack: métricas, alertas, dashboards, exporters.", "category": "devops", "icon": "📊", "color": "#e6522c", "author": "Community", "version": "1.0.0", "tags": ["prometheus", "grafana", "monitoring", "alerting"], "compatible_agents": ["devops"]},
    {"id": "service-mesh", "name": "Service Mesh", "description": "Service mesh: Istio, Linkerd, sidecar proxies, mTLS, traffic management.", "category": "devops", "icon": "🕸️", "color": "#466bb0", "author": "Community", "version": "1.0.0", "tags": ["istio", "linkerd", "mesh", "mtls"], "compatible_agents": ["devops"]},
    {"id": "log-management", "name": "Log Management", "description": "ELK Stack, Loki, Fluentd: log aggregation, search, alerting.", "category": "devops", "icon": "📜", "color": "#f9d71c", "author": "Community", "version": "1.0.0", "tags": ["elk", "loki", "fluentd", "logs", "aggregation"], "compatible_agents": ["devops"]},
    # ═══════════════════════════════════════════════════════════════
    # SECURITY (MORE)
    # ═══════════════════════════════════════════════════════════════
    {"id": "owasp-scanner", "name": "OWASP Scanner", "description": "Scan OWASP Top 10: injection, XSS, CSRF, broken auth, misconfig.", "category": "security", "icon": "🛡️", "color": "#dc2626", "author": "Community", "version": "1.1.0", "tags": ["owasp", "scanner", "vulnerabilities", "web-security"], "compatible_agents": ["devops", "developer"]},
    {"id": "dependency-audit", "name": "Dependency Audit", "description": "Audita dependências: CVEs, supply chain attacks, license compliance.", "category": "security", "icon": "📦", "color": "#b91c1c", "author": "Community", "version": "1.0.0", "tags": ["audit", "dependencies", "cve", "supply-chain"], "compatible_agents": ["devops", "developer"]},
    {"id": "crypto-toolkit", "name": "Cryptography Toolkit", "description": "Criptografia: hashing, encryption, JWT, certificates, key management.", "category": "security", "icon": "🔐", "color": "#7c2d12", "author": "Community", "version": "1.0.0", "tags": ["crypto", "encryption", "hashing", "jwt", "certificates"], "compatible_agents": ["developer", "devops"]},
    {"id": "secret-scanner", "name": "Secret Scanner", "description": "Detecta secrets/credentials vazados: API keys, tokens, passwords em código.", "category": "security", "icon": "🔎", "color": "#991b1b", "author": "Community", "version": "1.0.0", "tags": ["secrets", "scanner", "credentials", "leak-detection"], "compatible_agents": ["devops", "developer"]},
    {"id": "network-security", "name": "Network Security", "description": "Firewall rules, VPN config, TLS/SSL, port scanning, network hardening.", "category": "security", "icon": "🌐", "color": "#1e3a5f", "author": "Community", "version": "1.0.0", "tags": ["network", "firewall", "tls", "vpn", "hardening"], "compatible_agents": ["devops"]},
    {"id": "rbac-policies", "name": "RBAC & Policies", "description": "Access control: RBAC, ABAC, OPA policies, permission models.", "category": "security", "icon": "👥", "color": "#4c1d95", "author": "Community", "version": "1.0.0", "tags": ["rbac", "abac", "policies", "access-control"], "compatible_agents": ["developer", "devops"]},
    {"id": "soc2-compliance", "name": "SOC2 Compliance", "description": "SOC2, GDPR, HIPAA compliance: checklists, audit logs, data handling.", "category": "security", "icon": "📋", "color": "#065f46", "author": "Community", "version": "1.0.0", "tags": ["soc2", "gdpr", "hipaa", "compliance", "audit"], "compatible_agents": ["devops", "analyst"]},
    # ═══════════════════════════════════════════════════════════════
    # ANALYTICS & DATA (MORE)
    # ═══════════════════════════════════════════════════════════════
    {"id": "etl-pipeline", "name": "ETL Pipeline", "description": "ETL: extração, transformação, carga de dados. Apache Airflow, dbt, Luigi.", "category": "analytics", "icon": "🔄", "color": "#0d9488", "author": "Community", "version": "1.0.0", "tags": ["etl", "pipeline", "airflow", "dbt", "data"], "compatible_agents": ["analyst", "developer"]},
    {"id": "data-warehouse", "name": "Data Warehouse", "description": "DW design: star schema, snowflake, BigQuery, Redshift, Snowflake.", "category": "analytics", "icon": "🏭", "color": "#1e40af", "author": "Community", "version": "1.0.0", "tags": ["data-warehouse", "bigquery", "redshift", "snowflake"], "compatible_agents": ["analyst", "developer"]},
    {"id": "bi-dashboards", "name": "BI Dashboards", "description": "Business Intelligence: Metabase, Superset, Tableau, Power BI, Looker.", "category": "analytics", "icon": "📊", "color": "#f59e0b", "author": "Community", "version": "1.0.0", "tags": ["bi", "dashboards", "metabase", "tableau", "powerbi"], "compatible_agents": ["analyst"]},
    {"id": "web-analytics", "name": "Web Analytics", "description": "Analytics web: Google Analytics, Plausible, Mixpanel, event tracking.", "category": "analytics", "icon": "📈", "color": "#ea580c", "author": "Community", "version": "1.0.0", "tags": ["analytics", "ga4", "plausible", "mixpanel", "tracking"], "compatible_agents": ["analyst", "fullstack"]},
    {"id": "ab-testing", "name": "A/B Testing", "description": "Testes A/B: experiment design, statistical significance, feature flags.", "category": "analytics", "icon": "🧪", "color": "#7c3aed", "author": "Community", "version": "1.0.0", "tags": ["ab-testing", "experiments", "feature-flags", "statistics"], "compatible_agents": ["analyst", "developer"]},
    {"id": "geospatial", "name": "Geospatial Analysis", "description": "Dados geoespaciais: mapas, GIS, PostGIS, GeoJSON, clustering geográfico.", "category": "analytics", "icon": "🗺️", "color": "#15803d", "author": "Community", "version": "1.0.0", "tags": ["geospatial", "gis", "maps", "postgis", "geojson"], "compatible_agents": ["analyst", "developer"]},
    {"id": "time-series", "name": "Time Series Analysis", "description": "Análise temporal: forecasting, anomaly detection, seasonal decomposition.", "category": "analytics", "icon": "⏱️", "color": "#0284c7", "author": "Community", "version": "1.0.0", "tags": ["time-series", "forecasting", "anomaly", "temporal"], "compatible_agents": ["analyst", "researcher"]},
    # ═══════════════════════════════════════════════════════════════
    # CONTENT & WRITING (MORE)
    # ═══════════════════════════════════════════════════════════════
    {"id": "technical-writing", "name": "Technical Writing", "description": "Docs técnicos: API docs, READMEs, wikis, architecture decision records.", "category": "content", "icon": "📖", "color": "#1e3a5f", "author": "Community", "version": "1.0.0", "tags": ["technical", "writing", "docs", "api-docs", "readme"], "compatible_agents": ["writer", "developer"]},
    {"id": "creative-writing", "name": "Creative Writing", "description": "Escrita criativa: storytelling, world building, character development.", "category": "content", "icon": "✍️", "color": "#be123c", "author": "Community", "version": "1.0.0", "tags": ["creative", "storytelling", "fiction", "narrative"], "compatible_agents": ["writer"]},
    {"id": "copywriting-pro", "name": "Copywriting Pro", "description": "Copy profissional: headlines, CTAs, landing pages, A/B copy testing.", "category": "content", "icon": "💎", "color": "#d97706", "author": "Community", "version": "1.0.0", "tags": ["copywriting", "headlines", "cta", "landing-page"], "compatible_agents": ["writer"]},
    {"id": "newsletter-builder", "name": "Newsletter Builder", "description": "Cria newsletters: templates, subject lines, segmentation, analytics.", "category": "content", "icon": "📬", "color": "#0369a1", "author": "Community", "version": "1.0.0", "tags": ["newsletter", "email", "templates", "marketing"], "compatible_agents": ["writer"]},
    {"id": "podcast-script", "name": "Podcast Script", "description": "Scripts de podcast: roteiros, show notes, timestamps, transcrições.", "category": "content", "icon": "🎙️", "color": "#7c2d12", "author": "Community", "version": "1.0.0", "tags": ["podcast", "script", "show-notes", "transcription"], "compatible_agents": ["writer"]},
    {"id": "presentation-gen", "name": "Presentation Generator", "description": "Gera apresentações: slides, pitch decks, keynotes com narrativa.", "category": "content", "icon": "📽️", "color": "#ea580c", "author": "Community", "version": "1.0.0", "tags": ["presentation", "slides", "pitch-deck", "keynote"], "compatible_agents": ["writer", "designer"]},
    {"id": "resume-builder", "name": "Resume Builder", "description": "Cria CVs e cartas de apresentação otimizados para ATS.", "category": "content", "icon": "📄", "color": "#475569", "author": "Community", "version": "1.0.0", "tags": ["resume", "cv", "cover-letter", "career"], "compatible_agents": ["writer"]},
    {"id": "grant-writing", "name": "Grant Writing", "description": "Propostas de financiamento: grants, funding applications, project proposals.", "category": "content", "icon": "💰", "color": "#059669", "author": "Community", "version": "1.0.0", "tags": ["grant", "funding", "proposal", "writing"], "compatible_agents": ["writer", "researcher"]},
    # ═══════════════════════════════════════════════════════════════
    # BUSINESS & PRODUCTIVITY (MORE)
    # ═══════════════════════════════════════════════════════════════
    {"id": "invoice-gen", "name": "Invoice Generator", "description": "Gera faturas e recibos profissionais: PDF, cálculos, taxes.", "category": "business", "icon": "🧾", "color": "#16a34a", "author": "Community", "version": "1.0.0", "tags": ["invoice", "billing", "pdf", "finance"], "compatible_agents": ["analyst", "orchestrator"]},
    {"id": "crm-manager", "name": "CRM Manager", "description": "Gerencia contatos, leads, pipeline de vendas e follow-ups.", "category": "business", "icon": "👤", "color": "#2563eb", "author": "Community", "version": "1.0.0", "tags": ["crm", "sales", "leads", "pipeline"], "compatible_agents": ["orchestrator", "analyst"]},
    {"id": "meeting-notes", "name": "Meeting Notes", "description": "Transcreve e sumariza reuniões: action items, decisions, attendees.", "category": "business", "icon": "📝", "color": "#7c3aed", "author": "Community", "version": "1.0.0", "tags": ["meetings", "notes", "summary", "action-items"], "compatible_agents": ["writer", "orchestrator"]},
    {"id": "okr-tracker", "name": "OKR Tracker", "description": "Rastreia OKRs e KPIs: objectives, key results, progress tracking.", "category": "business", "icon": "🎯", "color": "#dc2626", "author": "Community", "version": "1.0.0", "tags": ["okr", "kpi", "objectives", "tracking"], "compatible_agents": ["orchestrator", "analyst"]},
    {"id": "lean-canvas", "name": "Lean Canvas", "description": "Business model canvas: problema, solução, métricas, channels, revenue.", "category": "business", "icon": "📋", "color": "#0ea5e9", "author": "Community", "version": "1.0.0", "tags": ["lean-canvas", "business-model", "startup", "strategy"], "compatible_agents": ["orchestrator", "analyst", "writer"]},
    {"id": "competitor-analysis", "name": "Competitor Analysis", "description": "Análise competitiva: SWOT, market positioning, feature comparison.", "category": "business", "icon": "🏆", "color": "#b45309", "author": "Community", "version": "1.0.0", "tags": ["competitor", "swot", "analysis", "market"], "compatible_agents": ["analyst", "researcher"]},
    {"id": "budget-planner", "name": "Budget Planner", "description": "Planejamento orçamentário: previsões, categorias, alertas, relatórios.", "category": "business", "icon": "💵", "color": "#15803d", "author": "Community", "version": "1.0.0", "tags": ["budget", "planning", "finance", "forecast"], "compatible_agents": ["analyst", "orchestrator"]},
    {"id": "legal-templates", "name": "Legal Templates", "description": "Templates de contratos: NDA, SLA, ToS, privacy policy, EULA.", "category": "business", "icon": "⚖️", "color": "#44403c", "author": "Community", "version": "1.0.0", "tags": ["legal", "contracts", "nda", "terms", "privacy"], "compatible_agents": ["writer", "orchestrator"]},
    # ═══════════════════════════════════════════════════════════════
    # MEDIA & CREATIVE (MORE)
    # ═══════════════════════════════════════════════════════════════
    {"id": "audio-mixer", "name": "Audio Mixer", "description": "Processamento de áudio: noise reduction, EQ, compression, mixing.", "category": "media", "icon": "🎧", "color": "#7c2d12", "author": "Community", "version": "1.0.0", "tags": ["audio", "processing", "mixing", "noise-reduction"], "compatible_agents": ["designer"]},
    {"id": "music-generation", "name": "Music Generation", "description": "Geração de música AI: melodies, beats, ambient, jingles.", "category": "media", "icon": "🎵", "color": "#be185d", "author": "Community", "version": "1.0.0", "tags": ["music", "generation", "ai", "composition"], "compatible_agents": ["designer"]},
    {"id": "video-transcription", "name": "Video Transcription", "description": "Transcreve vídeos: legendas SRT/VTT, timestamps, speaker labels.", "category": "media", "icon": "📹", "color": "#b91c1c", "author": "Community", "version": "1.0.0", "tags": ["video", "transcription", "subtitles", "captions"], "compatible_agents": ["writer", "designer"]},
    {"id": "thumbnail-gen", "name": "Thumbnail Generator", "description": "Gera thumbnails para YouTube, blogs e social media com AI.", "category": "media", "icon": "🖼️", "color": "#dc2626", "author": "Community", "version": "1.0.0", "tags": ["thumbnail", "youtube", "image", "social-media"], "compatible_agents": ["designer"]},
    {"id": "qr-code-gen", "name": "QR Code Generator", "description": "Gera QR codes customizados: cores, logos, formatos, tracking.", "category": "media", "icon": "📱", "color": "#1e293b", "author": "Community", "version": "1.0.0", "tags": ["qrcode", "generator", "custom", "tracking"], "compatible_agents": ["designer", "fullstack"]},
    {"id": "meme-generator", "name": "Meme Generator", "description": "Gera memes com templates populares, texto custom e AI.", "category": "media", "icon": "😂", "color": "#f97316", "author": "Community", "version": "1.0.0", "tags": ["meme", "humor", "social", "viral"], "compatible_agents": ["designer", "writer"]},
    {"id": "screenshot-tool", "name": "Screenshot & Mockup", "description": "Screenshots, browser mockups, device frames, app store previews.", "category": "media", "icon": "📸", "color": "#6366f1", "author": "Community", "version": "1.0.0", "tags": ["screenshot", "mockup", "device-frame", "preview"], "compatible_agents": ["designer"]},
    # ═══════════════════════════════════════════════════════════════
    # AUTOMATION (MORE)
    # ═══════════════════════════════════════════════════════════════
    {"id": "zapier-integration", "name": "Zapier Integration", "description": "Conecta 5000+ apps via Zapier: triggers, actions, multi-step zaps.", "category": "automation", "icon": "⚡", "color": "#ff4a00", "author": "Community", "version": "1.0.0", "tags": ["zapier", "integration", "automation", "no-code"], "compatible_agents": ["orchestrator", "devops"]},
    {"id": "n8n-workflows", "name": "n8n Workflows", "description": "Workflows n8n: nodes, triggers, webhooks, self-hosted automation.", "category": "automation", "icon": "🔗", "color": "#ea4b71", "author": "Community", "version": "1.0.0", "tags": ["n8n", "workflows", "automation", "self-hosted"], "compatible_agents": ["orchestrator", "devops"]},
    {"id": "cron-scheduler", "name": "Cron Scheduler", "description": "Agendamento cron avançado: expressions, timezone, retry, dead-letter queue.", "category": "automation", "icon": "⏰", "color": "#0369a1", "author": "Community", "version": "1.0.0", "tags": ["cron", "scheduler", "jobs", "recurring"], "compatible_agents": ["devops", "developer"]},
    {"id": "webhook-router", "name": "Webhook Router", "description": "Gerencia webhooks: routing, retry, signing, payload transformation.", "category": "automation", "icon": "🪝", "color": "#6d28d9", "author": "Community", "version": "1.0.0", "tags": ["webhook", "events", "routing", "integration"], "compatible_agents": ["developer", "devops"]},
    {"id": "browser-automation", "name": "Browser Automation", "description": "Automação web: Playwright, Puppeteer, scraping, form filling, testing.", "category": "automation", "icon": "🌐", "color": "#2563eb", "author": "Community", "version": "1.0.0", "tags": ["playwright", "puppeteer", "browser", "automation"], "compatible_agents": ["developer", "devops"]},
    {"id": "file-watcher", "name": "File Watcher", "description": "Monitora mudanças em arquivos e pastas: trigger actions, sync, backup.", "category": "automation", "icon": "👀", "color": "#0891b2", "author": "Community", "version": "1.0.0", "tags": ["file-watcher", "monitoring", "sync", "trigger"], "compatible_agents": ["devops", "developer"]},
    {"id": "data-scraping", "name": "Data Scraping Pro", "description": "Scraping avançado: pagination, anti-bot bypass, structured extraction.", "category": "automation", "icon": "🕷️", "color": "#4338ca", "author": "Community", "version": "1.1.0", "tags": ["scraping", "extraction", "pagination", "data"], "compatible_agents": ["researcher", "developer"]},
    # ═══════════════════════════════════════════════════════════════
    # SCIENCE & MATH (MORE)
    # ═══════════════════════════════════════════════════════════════
    {"id": "bioinformatics", "name": "Bioinformatics", "description": "Análise bioinformática: sequência DNA/RNA, phylogenetics, proteomics.", "category": "science", "icon": "🧬", "color": "#059669", "author": "Community", "version": "1.0.0", "tags": ["bioinformatics", "dna", "rna", "genomics", "proteomics"], "compatible_agents": ["researcher", "analyst"]},
    {"id": "chemistry-tools", "name": "Chemistry Tools", "description": "Ferramentas de química: molecular structures, reactions, SMILES notation.", "category": "science", "icon": "⚗️", "color": "#7c3aed", "author": "Community", "version": "1.0.0", "tags": ["chemistry", "molecular", "reactions", "smiles"], "compatible_agents": ["researcher"]},
    {"id": "physics-sim", "name": "Physics Simulation", "description": "Simulações físicas: mechanics, thermodynamics, electromagnetism, optics.", "category": "science", "icon": "⚛️", "color": "#0284c7", "author": "Community", "version": "1.0.0", "tags": ["physics", "simulation", "mechanics", "thermodynamics"], "compatible_agents": ["researcher"]},
    {"id": "linear-algebra", "name": "Linear Algebra", "description": "Álgebra linear: matrizes, eigenvalues, SVD, transformações, proofs.", "category": "science", "icon": "📐", "color": "#1e40af", "author": "Community", "version": "1.0.0", "tags": ["linear-algebra", "matrices", "eigenvalues", "math"], "compatible_agents": ["researcher", "analyst"]},
    {"id": "calculus-solver", "name": "Calculus Solver", "description": "Cálculo: derivadas, integrais, limites, séries, equações diferenciais.", "category": "science", "icon": "∫", "color": "#7c2d12", "author": "Community", "version": "1.0.0", "tags": ["calculus", "derivatives", "integrals", "differential-equations"], "compatible_agents": ["researcher", "analyst"]},
    {"id": "climate-data", "name": "Climate Data", "description": "Dados climáticos: temperature, precipitation, satellite imagery, forecasting.", "category": "science", "icon": "🌍", "color": "#15803d", "author": "Community", "version": "1.0.0", "tags": ["climate", "weather", "satellite", "environmental"], "compatible_agents": ["researcher", "analyst"]},
    # ═══════════════════════════════════════════════════════════════
    # INTEGRATIONS (MORE)
    # ═══════════════════════════════════════════════════════════════
    {"id": "slack-bot", "name": "Slack Bot", "description": "Bot Slack: mensagens, threads, slash commands, Block Kit, webhooks.", "category": "integrations", "icon": "💬", "color": "#4a154b", "author": "Community", "version": "1.0.0", "tags": ["slack", "bot", "messaging", "webhooks"], "compatible_agents": ["developer", "orchestrator"]},
    {"id": "discord-bot", "name": "Discord Bot", "description": "Bot Discord: commands, embeds, reactions, voice channels, moderation.", "category": "integrations", "icon": "🎮", "color": "#5865f2", "author": "Community", "version": "1.0.0", "tags": ["discord", "bot", "commands", "embeds"], "compatible_agents": ["developer", "orchestrator"]},
    {"id": "telegram-bot", "name": "Telegram Bot", "description": "Bot Telegram: inline keyboards, webhooks, groups, channels, payments.", "category": "integrations", "icon": "✈️", "color": "#0088cc", "author": "Community", "version": "1.0.0", "tags": ["telegram", "bot", "keyboards", "channels"], "compatible_agents": ["developer", "orchestrator"]},
    {"id": "notion-api", "name": "Notion API", "description": "Integração Notion: databases, pages, blocks, filters, sorting.", "category": "integrations", "icon": "📓", "color": "#000000", "author": "Community", "version": "1.0.0", "tags": ["notion", "api", "databases", "pages"], "compatible_agents": ["developer", "orchestrator"]},
    {"id": "google-workspace", "name": "Google Workspace", "description": "Google APIs: Sheets, Docs, Drive, Calendar, Gmail automation.", "category": "integrations", "icon": "🟢", "color": "#4285f4", "author": "Community", "version": "1.1.0", "tags": ["google", "sheets", "docs", "drive", "gmail"], "compatible_agents": ["developer", "orchestrator", "analyst"]},
    {"id": "twilio-sms", "name": "Twilio SMS/Voice", "description": "Twilio: SMS, WhatsApp, voice calls, IVR, phone number verification.", "category": "integrations", "icon": "📞", "color": "#f22f46", "author": "Community", "version": "1.0.0", "tags": ["twilio", "sms", "voice", "whatsapp", "verification"], "compatible_agents": ["developer", "orchestrator"]},
    {"id": "sendgrid-email", "name": "SendGrid Email", "description": "SendGrid: transactional emails, templates, analytics, deliverability.", "category": "integrations", "icon": "📧", "color": "#1a82e2", "author": "Community", "version": "1.0.0", "tags": ["sendgrid", "email", "transactional", "templates"], "compatible_agents": ["developer", "orchestrator"]},
    {"id": "shopify-api", "name": "Shopify API", "description": "Shopify: products, orders, customers, webhooks, Liquid templates.", "category": "integrations", "icon": "🛍️", "color": "#96bf48", "author": "Community", "version": "1.0.0", "tags": ["shopify", "ecommerce", "api", "products", "orders"], "compatible_agents": ["developer", "fullstack"]},
    {"id": "openai-api", "name": "OpenAI API", "description": "OpenAI: GPT-4o, embeddings, assistants, function calling, fine-tuning.", "category": "integrations", "icon": "🤖", "color": "#412991", "author": "Community", "version": "1.2.0", "tags": ["openai", "gpt", "embeddings", "assistants"], "compatible_agents": ["developer", "researcher"]},
    {"id": "anthropic-api", "name": "Anthropic API", "description": "Anthropic: Claude, tool use, long context, system prompts, batches.", "category": "integrations", "icon": "🧠", "color": "#d4a574", "author": "Community", "version": "1.1.0", "tags": ["anthropic", "claude", "tool-use", "ai"], "compatible_agents": ["developer", "researcher"]},
    {"id": "vercel-deploy", "name": "Vercel Deploy", "description": "Deploy Vercel: Edge Functions, ISR, Analytics, Environment Variables.", "category": "integrations", "icon": "▲", "color": "#000000", "author": "Community", "version": "1.0.0", "tags": ["vercel", "deploy", "edge", "serverless"], "compatible_agents": ["devops", "fullstack"]},
    {"id": "railway-deploy", "name": "Railway Deploy", "description": "Deploy Railway: environments, volumes, cron jobs, metrics, logs.", "category": "integrations", "icon": "🚂", "color": "#0b0d0e", "author": "Community", "version": "1.0.0", "tags": ["railway", "deploy", "containers", "hosting"], "compatible_agents": ["devops", "fullstack"]},
    {"id": "cloudflare-tools", "name": "Cloudflare Tools", "description": "Cloudflare: Workers, KV, R2, D1, Pages, DNS, WAF, CDN.", "category": "integrations", "icon": "☁️", "color": "#f48120", "author": "Community", "version": "1.0.0", "tags": ["cloudflare", "workers", "kv", "r2", "cdn"], "compatible_agents": ["devops", "developer"]},
    {"id": "firebase-tools", "name": "Firebase Tools", "description": "Firebase: Auth, Firestore, Storage, Hosting, Cloud Functions.", "category": "integrations", "icon": "🔥", "color": "#ffca28", "author": "Community", "version": "1.0.0", "tags": ["firebase", "firestore", "auth", "hosting"], "compatible_agents": ["developer", "fullstack", "mobile"]},
    {"id": "redis-tools", "name": "Redis Tools", "description": "Redis: caching, pub/sub, streams, rate limiting, session storage.", "category": "integrations", "icon": "🔴", "color": "#dc382d", "author": "Community", "version": "1.0.0", "tags": ["redis", "cache", "pubsub", "streams", "session"], "compatible_agents": ["developer", "devops"]},
    {"id": "mongodb-tools", "name": "MongoDB Tools", "description": "MongoDB: aggregation, indexes, Atlas, change streams, transactions.", "category": "integrations", "icon": "🍃", "color": "#47a248", "author": "Community", "version": "1.0.0", "tags": ["mongodb", "nosql", "atlas", "aggregation"], "compatible_agents": ["developer", "fullstack"]},
    {"id": "rabbitmq-tools", "name": "RabbitMQ Tools", "description": "RabbitMQ: queues, exchanges, routing, dead-letter, delayed messages.", "category": "integrations", "icon": "🐰", "color": "#ff6600", "author": "Community", "version": "1.0.0", "tags": ["rabbitmq", "queues", "messaging", "amqp"], "compatible_agents": ["developer", "devops"]},
    {"id": "kafka-tools", "name": "Kafka Tools", "description": "Apache Kafka: topics, consumers, producers, streams, connect.", "category": "integrations", "icon": "📨", "color": "#231f20", "author": "Community", "version": "1.0.0", "tags": ["kafka", "streaming", "events", "pubsub"], "compatible_agents": ["developer", "devops"]},
    {"id": "elasticsearch", "name": "Elasticsearch", "description": "Elasticsearch: full-text search, aggregations, mappings, analyzers.", "category": "integrations", "icon": "🔎", "color": "#fed10a", "author": "Community", "version": "1.0.0", "tags": ["elasticsearch", "search", "full-text", "aggregations"], "compatible_agents": ["developer", "devops"]},
    # ═══════════════════════════════════════════════════════════════
    # EDUCATION & LEARNING
    # ═══════════════════════════════════════════════════════════════
    {"id": "flashcard-gen", "name": "Flashcard Generator", "description": "Gera flashcards de estudo: Anki format, spaced repetition, quizzes.", "category": "education", "icon": "🃏", "color": "#2563eb", "author": "Community", "version": "1.0.0", "tags": ["flashcards", "anki", "study", "spaced-repetition"], "compatible_agents": ["writer", "researcher"]},
    {"id": "quiz-builder", "name": "Quiz Builder", "description": "Cria quizzes: múltipla escolha, V/F, fill-in-the-blank, auto-grading.", "category": "education", "icon": "❓", "color": "#7c3aed", "author": "Community", "version": "1.0.0", "tags": ["quiz", "assessment", "grading", "testing"], "compatible_agents": ["writer", "researcher"]},
    {"id": "lesson-planner", "name": "Lesson Planner", "description": "Planeja aulas: objectives, activities, materials, assessment criteria.", "category": "education", "icon": "📚", "color": "#059669", "author": "Community", "version": "1.0.0", "tags": ["lesson", "planning", "teaching", "curriculum"], "compatible_agents": ["writer", "orchestrator"]},
    {"id": "code-tutor", "name": "Code Tutor", "description": "Tutoria de programação: exercícios progressivos, hints, code review.", "category": "education", "icon": "👨‍🏫", "color": "#0891b2", "author": "Community", "version": "1.0.0", "tags": ["tutor", "programming", "exercises", "learning"], "compatible_agents": ["developer", "writer"]},
    {"id": "language-tutor", "name": "Language Tutor", "description": "Tutoria de idiomas: conversação, gramática, vocabulário, pronúncia.", "category": "education", "icon": "🌍", "color": "#dc2626", "author": "Community", "version": "1.0.0", "tags": ["language", "tutor", "grammar", "vocabulary"], "compatible_agents": ["writer", "orchestrator"]},
    {"id": "mind-map-gen", "name": "Mind Map Generator", "description": "Gera mind maps: conceitos, relações, hierarquias, export Mermaid/PNG.", "category": "education", "icon": "🧠", "color": "#d946ef", "author": "Community", "version": "1.0.0", "tags": ["mind-map", "concepts", "visualization", "mermaid"], "compatible_agents": ["writer", "researcher"]},
    # ═══════════════════════════════════════════════════════════════
    # COMMUNICATION & MESSAGING
    # ═══════════════════════════════════════════════════════════════
    {"id": "whatsapp-channel", "name": "WhatsApp Channel", "description": "Canal WhatsApp Business: mensagens, templates, quick replies, media.", "category": "communication", "icon": "💚", "color": "#25d366", "author": "Community", "version": "1.0.0", "tags": ["whatsapp", "messaging", "business", "channel"], "compatible_agents": ["orchestrator"]},
    {"id": "signal-channel", "name": "Signal Channel", "description": "Integração Signal: mensagens criptografadas, grupos, media sharing.", "category": "communication", "icon": "🔵", "color": "#3a76f0", "author": "Community", "version": "1.0.0", "tags": ["signal", "encrypted", "messaging", "privacy"], "compatible_agents": ["orchestrator"]},
    {"id": "irc-channel", "name": "IRC Channel", "description": "Conecta a redes IRC: channels, commands, nickserv, bouncers.", "category": "communication", "icon": "💬", "color": "#6b7280", "author": "Community", "version": "1.0.0", "tags": ["irc", "chat", "channels", "networking"], "compatible_agents": ["orchestrator"]},
    {"id": "matrix-channel", "name": "Matrix/Element", "description": "Matrix protocol: rooms, encryption, bridges, bots, federation.", "category": "communication", "icon": "🟩", "color": "#0dbd8b", "author": "Community", "version": "1.0.0", "tags": ["matrix", "element", "encryption", "federation"], "compatible_agents": ["orchestrator", "developer"]},
    {"id": "email-automation", "name": "Email Automation", "description": "Automação de emails: sequences, triggers, personalization, analytics.", "category": "communication", "icon": "📧", "color": "#4f46e5", "author": "Community", "version": "1.0.0", "tags": ["email", "automation", "sequences", "marketing"], "compatible_agents": ["orchestrator", "writer"]},
    # ═══════════════════════════════════════════════════════════════
    # HEALTH & WELLNESS
    # ═══════════════════════════════════════════════════════════════
    {"id": "nutrition-calc", "name": "Nutrition Calculator", "description": "Cálculos nutricionais: macros, calorias, meal planning, dietary analysis.", "category": "health", "icon": "🥗", "color": "#16a34a", "author": "Community", "version": "1.0.0", "tags": ["nutrition", "macros", "calories", "meal-planning"], "compatible_agents": ["analyst", "researcher"]},
    {"id": "fitness-planner", "name": "Fitness Planner", "description": "Planos de treino: exercícios, séries, progressão, recovery, splits.", "category": "health", "icon": "💪", "color": "#dc2626", "author": "Community", "version": "1.0.0", "tags": ["fitness", "workout", "training", "exercise"], "compatible_agents": ["orchestrator", "writer"]},
    {"id": "medical-research", "name": "Medical Research", "description": "Pesquisa médica: PubMed, clinical trials, drug interactions, symptoms.", "category": "health", "icon": "🏥", "color": "#0369a1", "author": "Community", "version": "1.0.0", "tags": ["medical", "pubmed", "clinical", "research"], "compatible_agents": ["researcher"]},
    {"id": "mental-health", "name": "Mental Health Tools", "description": "Ferramentas de saúde mental: journaling, CBT exercises, mood tracking.", "category": "health", "icon": "🧘", "color": "#7c3aed", "author": "Community", "version": "1.0.0", "tags": ["mental-health", "journaling", "cbt", "wellness"], "compatible_agents": ["writer", "orchestrator"]},
    # ═══════════════════════════════════════════════════════════════
    # GAMING & INTERACTIVE
    # ═══════════════════════════════════════════════════════════════
    {"id": "character-gen", "name": "Character Generator", "description": "Gera personagens: RPG stats, backstory, abilities, artwork descriptions.", "category": "gaming", "icon": "🧙", "color": "#7c2d12", "author": "Community", "version": "1.0.0", "tags": ["character", "rpg", "backstory", "generation"], "compatible_agents": ["writer", "designer"]},
    {"id": "world-builder", "name": "World Builder", "description": "Cria mundos fictícios: geography, cultures, history, magic systems.", "category": "gaming", "icon": "🌎", "color": "#1e40af", "author": "Community", "version": "1.0.0", "tags": ["worldbuilding", "fantasy", "lore", "geography"], "compatible_agents": ["writer"]},
    {"id": "dungeon-master", "name": "Dungeon Master AI", "description": "DM virtual: narração, encounters, NPCs, loot tables, story arcs.", "category": "gaming", "icon": "🐉", "color": "#b91c1c", "author": "Community", "version": "1.0.0", "tags": ["dnd", "dungeon-master", "rpg", "narration"], "compatible_agents": ["writer", "orchestrator"]},
    {"id": "quiz-game", "name": "Quiz Game Engine", "description": "Engine de quiz interativo: trivia, leaderboards, categories, multiplayer.", "category": "gaming", "icon": "🏆", "color": "#eab308", "author": "Community", "version": "1.0.0", "tags": ["quiz", "game", "trivia", "leaderboard"], "compatible_agents": ["developer", "writer"]},
    # ═══════════════════════════════════════════════════════════════
    # DEVTOOLS & UTILITIES
    # ═══════════════════════════════════════════════════════════════
    {"id": "json-yaml-tools", "name": "JSON/YAML Tools", "description": "Manipulação JSON/YAML: validation, formatting, conversion, diff.", "category": "devtools", "icon": "📋", "color": "#0891b2", "author": "Community", "version": "1.0.0", "tags": ["json", "yaml", "validation", "formatting", "conversion"], "compatible_agents": ["developer", "devops"]},
    {"id": "base64-encoder", "name": "Base64 & Encoding", "description": "Encoding tools: base64, URL encode, HTML entities, Unicode.", "category": "devtools", "icon": "🔤", "color": "#6b7280", "author": "Community", "version": "1.0.0", "tags": ["base64", "encoding", "url", "unicode"], "compatible_agents": ["developer"]},
    {"id": "uuid-generator", "name": "UUID & ID Generator", "description": "Gera IDs: UUID v4/v7, ULID, nanoid, snowflake, CUID.", "category": "devtools", "icon": "🆔", "color": "#4338ca", "author": "Community", "version": "1.0.0", "tags": ["uuid", "id", "nanoid", "ulid", "generator"], "compatible_agents": ["developer"]},
    {"id": "diff-tool", "name": "Diff & Merge Tool", "description": "Compara e faz merge de texto, código, JSON, XML com highlighted diffs.", "category": "devtools", "icon": "🔀", "color": "#dc2626", "author": "Community", "version": "1.0.0", "tags": ["diff", "merge", "compare", "text"], "compatible_agents": ["developer"]},
    {"id": "env-manager", "name": "Environment Manager", "description": "Gerencia .env files: validation, sharing, secrets rotation, templates.", "category": "devtools", "icon": "🔒", "color": "#eab308", "author": "Community", "version": "1.0.0", "tags": ["env", "environment", "secrets", "configuration"], "compatible_agents": ["developer", "devops"]},
    {"id": "http-client", "name": "HTTP Client", "description": "Cliente HTTP avançado: requests, headers, auth, cookies, response parsing.", "category": "devtools", "icon": "🌐", "color": "#2563eb", "author": "Community", "version": "1.0.0", "tags": ["http", "client", "requests", "api-testing"], "compatible_agents": ["developer"]},
    {"id": "performance-profiler", "name": "Performance Profiler", "description": "Profiling: CPU, memory, network, Lighthouse, Core Web Vitals.", "category": "devtools", "icon": "⚡", "color": "#f97316", "author": "Community", "version": "1.0.0", "tags": ["performance", "profiling", "lighthouse", "web-vitals"], "compatible_agents": ["developer", "devops"]},
    {"id": "api-mock", "name": "API Mock Server", "description": "Mock server: fake APIs, dynamic responses, delay simulation, OpenAPI.", "category": "devtools", "icon": "🎭", "color": "#8b5cf6", "author": "Community", "version": "1.0.0", "tags": ["mock", "api", "testing", "simulation", "openapi"], "compatible_agents": ["developer"]},
    {"id": "docker-compose-gen", "name": "Docker Compose Gen", "description": "Gera docker-compose.yml: multi-service, volumes, networks, healthchecks.", "category": "devtools", "icon": "🐳", "color": "#2496ed", "author": "Community", "version": "1.0.0", "tags": ["docker", "compose", "generator", "containers"], "compatible_agents": ["devops", "developer"]},
    {"id": "openapi-gen", "name": "OpenAPI Generator", "description": "Gera specs OpenAPI/Swagger: schemas, endpoints, examples, validation.", "category": "devtools", "icon": "📄", "color": "#85ea2d", "author": "Community", "version": "1.0.0", "tags": ["openapi", "swagger", "api-docs", "schemas"], "compatible_agents": ["developer"]},
]

# In-memory installed skills per agent
_installed_skills: dict[str, set[str]] = {}

# All agents start with their default skills installed
_DEFAULT_SKILLS: dict[str, list[str]] = {
    "orchestrator": [
        "web-search", "code-generation", "voice-tts-stt", "prompt-engineering",
        "task-automation", "workflow-builder", "translation", "project-management",
        "calendar-scheduling", "news-aggregator",
    ],
    "designer": [
        "liquid-glass-design", "animation-motion", "image-generation", "responsive-layout",
        "design-system", "icon-svg", "dark-mode", "accessibility", "video-editing",
    ],
    "developer": [
        "code-generation", "database-ops", "git-ops", "api-design", "testing-qa",
        "code-refactor", "code-review", "regex-builder", "realtime-websocket",
        "auth-system", "mcp-server",
    ],
    "fullstack": [
        "code-generation", "liquid-glass-design", "database-ops", "ecommerce-builder",
        "mobile-app", "api-design", "auth-system", "pwa-builder", "cms-builder",
        "stripe-payments", "supabase-advanced", "notification-system",
    ],
    "researcher": [
        "web-search", "web-scraping", "competitive-intel", "data-analysis",
        "academic-research", "news-aggregator", "social-media-intel",
        "nlp-text", "statistics",
    ],
    "analyst": [
        "data-analysis", "web-search", "database-ops", "data-visualization",
        "spreadsheet-ops", "financial-analysis", "statistics", "math-solver",
    ],
    "writer": [
        "seo-copywriting", "web-search", "translation", "documentation",
        "email-templates", "blog-writer", "social-content", "image-generation",
    ],
    "devops": [
        "docker-deploy", "git-ops", "security-audit", "ci-cd-pipeline",
        "cloud-infra", "monitoring-logging", "nginx-caddy", "task-automation",
        "scheduler", "pentest-scanner",
    ],
    "mobile": [
        "mobile-app", "code-generation", "liquid-glass-design", "pwa-builder",
        "animation-motion", "responsive-layout", "auth-system",
    ],
}

def _get_agent_skills(agent_id: str) -> set[str]:
    if agent_id not in _installed_skills:
        defaults = _DEFAULT_SKILLS.get(agent_id, [])
        _installed_skills[agent_id] = set(defaults)
    return _installed_skills[agent_id]


class SkillInstall(BaseModel):
    agent_id: str


@router.get("")
@router.get("/")
async def list_skills(category: str | None = None) -> list[dict]:
    """List all available skills in the ClawHub catalog."""
    skills = []
    for skill in SKILL_CATALOG:
        data = {**skill, "install_count": sum(1 for a in _installed_skills.values() if skill["id"] in a) + sum(1 for a, defaults in _DEFAULT_SKILLS.items() if skill["id"] in defaults and a not in _installed_skills)}
        if category and skill["category"] != category:
            continue
        skills.append(data)
    return skills


@router.get("/categories")
async def list_skill_categories() -> list[dict]:
    """List all skill categories with counts."""
    cat_counts: dict[str, int] = {}
    for skill in SKILL_CATALOG:
        cat = skill["category"]
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
    return [{"id": k, "count": v} for k, v in sorted(cat_counts.items())]


@router.get("/installed/{agent_id}")
async def get_installed_skills(agent_id: str) -> list[dict]:
    """Get skills installed for a specific agent."""
    installed = _get_agent_skills(agent_id)
    return [s for s in SKILL_CATALOG if s["id"] in installed]


@router.post("/{skill_id}/install")
async def install_skill(skill_id: str, body: SkillInstall) -> dict:
    """Install a skill for an agent."""
    skill = next((s for s in SKILL_CATALOG if s["id"] == skill_id), None)
    if not skill:
        return {"error": "Skill not found"}
    if body.agent_id not in skill["compatible_agents"]:
        return {"error": f"Skill not compatible with agent '{body.agent_id}'"}
    skills = _get_agent_skills(body.agent_id)
    skills.add(skill_id)
    return {"status": "installed", "skill_id": skill_id, "agent_id": body.agent_id}


@router.post("/{skill_id}/uninstall")
async def uninstall_skill(skill_id: str, body: SkillInstall) -> dict:
    """Uninstall a skill from an agent."""
    skills = _get_agent_skills(body.agent_id)
    skills.discard(skill_id)
    return {"status": "uninstalled", "skill_id": skill_id, "agent_id": body.agent_id}


@router.get("/{skill_id}")
async def get_skill(skill_id: str) -> dict:
    """Get details for a specific skill."""
    skill = next((s for s in SKILL_CATALOG if s["id"] == skill_id), None)
    if not skill:
        return {"error": "Skill not found"}
    return {
        **skill,
        "installed_by": [a for a, skills in _installed_skills.items() if skill_id in skills] + [a for a, defaults in _DEFAULT_SKILLS.items() if skill_id in defaults and a not in _installed_skills],
    }
