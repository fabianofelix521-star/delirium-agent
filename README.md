```
    ██████╗ ███████╗██╗     ██╗██████╗ ██╗██╗   ██╗███╗   ███╗
    ██╔══██╗██╔════╝██║     ██║██╔══██╗██║██║   ██║████╗ ████║
    ██║  ██║█████╗  ██║     ██║██████╔╝██║██║   ██║██╔████╔██║
    ██║  ██║██╔══╝  ██║     ██║██╔══██╗██║██║   ██║██║╚██╔╝██║
    ██████╔╝███████╗███████╗██║██║  ██║██║╚██████╔╝██║ ╚═╝ ██║
    ╚═════╝ ╚══════╝╚══════╝╚═╝╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝     ╚═╝
                    ∞  I N F I N I T E  ∞
```

# DELIRIUM INFINITE

**Autonomous AI Agent with Full Web Interface** — Zero CLI, 100% visual, accessible from any device.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)](https://fastapi.tiangolo.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)](https://typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Features

- 🧠 **Multi-Provider LLM Support** — OpenAI, Anthropic, Google, Alibaba (Qwen), Groq, Ollama, and any OpenAI-compatible API
- 💬 **Chat Interface** — Streaming responses, markdown rendering, code blocks with syntax highlighting
- 🎤 **Voice Mode** — Jarvis-style voice conversation with waveform visualization
- 🛠️ **Tools System** — Code execution, web browsing, file management, shell commands, and more
- 📊 **Dashboard** — Real-time CPU/RAM/Disk monitoring, service status, live logs
- 🔌 **Plugins** — Extensible with custom Python plugins
- 📧 **Integrations** — Gmail, WhatsApp, Telegram, Google Drive, Binance, and more
- 🤖 **Multi-Agent** — Create and orchestrate teams of AI agents
- 📱 **Mobile-First** — PWA installable, fully responsive, works on any device
- 🔐 **Secure** — JWT authentication, master password, rate limiting
- 🌙 **Dark/Light Theme** — Beautiful glassmorphism UI with smooth animations

## 🚀 Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/your-username/delirium-infinite.git
cd delirium-infinite

# 2. Install dependencies
./install.sh
# OR manually:
cd backend && pip install -r requirements.txt && cd ..
cd frontend && npm install && cd ..

# 3. Start development
make dev
# Backend: http://localhost:8000
# Frontend: http://localhost:3000
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER                          │
│  ┌──────────────────────────────────────────────┐  │
│  │     Next.js 16 + TypeScript + Tailwind       │  │
│  │  Chat │ Voice │ Tools │ Dashboard │ Settings │  │
│  └──────────────────────────┬───────────────────┘  │
│                             │ HTTP/SSE/WebSocket    │
└─────────────────────────────┼──────────────────────┘
                              │
┌─────────────────────────────┼──────────────────────┐
│                     BACKEND │                      │
│  ┌──────────────────────────┴──────────────────┐  │
│  │          FastAPI + WebSocket Server          │  │
│  ├──────────┬──────────┬──────────┬─────────── │  │
│  │ Agent    │ LLM      │ Tools    │ Voice     │  │
│  │ Core     │ Router   │ System   │ Engine    │  │
│  └──────────┴────┬─────┴──────────┴───────────┘  │
│                  │                                 │
│  ┌───────────────┼────────────────────────────┐  │
│  │         PROVIDER LAYER                     │  │
│  │ Ollama│OpenAI│Claude│Gemini│Groq│Custom    │  │
│  └───────────────┴────────────────────────────┘  │
│                                                    │
│  ┌────────────┐ ┌──────────┐ ┌────────────────┐  │
│  │   Redis    │ │  Qdrant  │ │    SQLite       │  │
│  │  (cache)   │ │(vectors) │ │  (timeline)     │  │
│  └────────────┘ └──────────┘ └────────────────┘  │
└────────────────────────────────────────────────────┘
```

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, TypeScript 5, Tailwind CSS, React 19 |
| **Backend** | FastAPI, Python 3.11+, Pydantic V2 |
| **LLM** | Multi-provider: Ollama, OpenAI, Anthropic, Google, Groq, Custom |
| **Database** | Redis (cache), Qdrant (vectors), SQLite (timeline) |
| **Infrastructure** | Docker, Caddy (reverse proxy + auto-SSL) |

## 📂 Project Structure

```
delirium-infinite/
├── backend/          # FastAPI Python backend
│   ├── agent/        # Agent orchestrator, LLM router, memory
│   ├── providers/    # LLM providers (OpenAI, Claude, Gemini...)
│   ├── tools/        # Agent tools (code, web, file, shell...)
│   ├── voice/        # STT/TTS/WebRTC voice engine
│   ├── api/routes/   # REST + WebSocket API endpoints
│   └── integrations/ # External service connectors
├── frontend/         # Next.js 16 web application
│   └── src/
│       ├── app/      # Pages (chat, voice, tools, dashboard...)
│       ├── components/ # React components
│       └── lib/      # API client, utilities
├── scripts/          # Deployment & backup scripts
├── docs/             # Documentation
└── docker-compose.yml
```

## 🔧 Configuration

Copy `.env.example` to `.env` and configure your providers:

```bash
cp .env.example .env
```

All APIs are configurable via the web interface at `/settings/apis` — no need to edit files manually.

## 🐳 Docker Deploy

```bash
# Start all services
make up

# Access at http://localhost:8080

# View logs
make logs

# Stop
make down
```

## 📜 License

MIT License — feel free to use, modify, and distribute.

---

**Built with 🔥 by the Delirium Team**
