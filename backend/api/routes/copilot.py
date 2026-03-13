"""Copilot API Route — GitHub Copilot integration: LLM provider + CLI tools for app creation."""

import asyncio
import os
import shutil
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# ─── Models ──────────────────────────────────

COPILOT_MODELS = [
    {"id": "gpt-4o", "name": "GPT-4o", "context": 128000, "description": "Most capable model for complex tasks"},
    {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "context": 128000, "description": "Fast and cost-effective"},
    {"id": "o1-preview", "name": "o1 Preview", "context": 128000, "description": "Advanced reasoning model"},
    {"id": "o1-mini", "name": "o1 Mini", "context": 128000, "description": "Efficient reasoning model"},
]

# ─── App Templates ──────────────────────────

APP_TEMPLATES = [
    {
        "id": "nextjs-full",
        "name": "Next.js Full-Stack",
        "description": "Next.js 14+ App Router with Tailwind, shadcn/ui, Supabase Auth, and API routes.",
        "icon": "▲",
        "stack": ["Next.js", "React", "TypeScript", "Tailwind", "Supabase"],
        "command": "npx create-next-app@latest {name} --typescript --tailwind --eslint --app --src-dir --use-npm",
    },
    {
        "id": "vite-react",
        "name": "Vite + React",
        "description": "Fast React app with Vite, TypeScript, and Tailwind CSS.",
        "icon": "⚡",
        "stack": ["Vite", "React", "TypeScript", "Tailwind"],
        "command": "npm create vite@latest {name} -- --template react-ts",
    },
    {
        "id": "expo-mobile",
        "name": "Expo Mobile App",
        "description": "Cross-platform mobile app with Expo, React Native, and TypeScript.",
        "icon": "📱",
        "stack": ["Expo", "React Native", "TypeScript"],
        "command": "npx create-expo-app@latest {name} --template blank-typescript",
    },
    {
        "id": "fastapi-backend",
        "name": "FastAPI Backend",
        "description": "Python FastAPI backend with async support and auto-docs.",
        "icon": "🐍",
        "stack": ["Python", "FastAPI", "Pydantic", "uvicorn"],
        "command": "mkdir -p {name} && cd {name} && python3 -m venv .venv",
    },
    {
        "id": "express-api",
        "name": "Express.js API",
        "description": "Node.js REST API with Express, TypeScript, and Prisma.",
        "icon": "🟢",
        "stack": ["Node.js", "Express", "TypeScript", "Prisma"],
        "command": "mkdir -p {name} && cd {name} && npm init -y",
    },
    {
        "id": "astro-site",
        "name": "Astro Website",
        "description": "Fast static site with Astro, Islands architecture, and Tailwind.",
        "icon": "🚀",
        "stack": ["Astro", "TypeScript", "Tailwind"],
        "command": "npm create astro@latest {name} -- --template minimal --typescript strict --install --no-git",
    },
    {
        "id": "nuxt-app",
        "name": "Nuxt 3 App",
        "description": "Vue.js full-stack framework with Nuxt 3.",
        "icon": "💚",
        "stack": ["Nuxt 3", "Vue 3", "TypeScript", "Tailwind"],
        "command": "npx nuxi@latest init {name}",
    },
    {
        "id": "svelte-app",
        "name": "SvelteKit App",
        "description": "SvelteKit with TypeScript and Tailwind CSS.",
        "icon": "🔥",
        "stack": ["SvelteKit", "Svelte", "TypeScript"],
        "command": "npm create svelte@latest {name}",
    },
    {
        "id": "electron-desktop",
        "name": "Electron Desktop",
        "description": "Cross-platform desktop app with Electron and React.",
        "icon": "🖥️",
        "stack": ["Electron", "React", "TypeScript"],
        "command": "npm create electron-vite@latest {name} -- --template react-ts",
    },
    {
        "id": "tauri-desktop",
        "name": "Tauri Desktop",
        "description": "Lightweight desktop app with Tauri (Rust) + React.",
        "icon": "🦀",
        "stack": ["Tauri", "Rust", "React", "TypeScript"],
        "command": "npm create tauri-app@latest {name} -- --template react-ts --manager npm",
    },
    {
        "id": "remix-app",
        "name": "Remix App",
        "description": "Full-stack web framework with Remix and React.",
        "icon": "💿",
        "stack": ["Remix", "React", "TypeScript"],
        "command": "npx create-remix@latest {name} --template remix-run/indie-stack",
    },
    {
        "id": "flask-api",
        "name": "Flask API",
        "description": "Python Flask micro-framework with REST API.",
        "icon": "🧪",
        "stack": ["Python", "Flask", "SQLAlchemy"],
        "command": "mkdir -p {name} && cd {name} && python3 -m venv .venv",
    },
]


# ─── Helpers ─────────────────────────────────

async def _run_command(cmd: str, cwd: str | None = None, timeout: int = 120) -> dict:
    """Run a shell command asynchronously with timeout."""
    try:
        proc = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=cwd,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return {
            "exit_code": proc.returncode,
            "stdout": stdout.decode(errors="replace")[-2000:],  # last 2KB
            "stderr": stderr.decode(errors="replace")[-2000:],
        }
    except asyncio.TimeoutError:
        proc.kill()
        return {"exit_code": -1, "stdout": "", "stderr": "Command timed out"}
    except Exception as e:
        return {"exit_code": -1, "stdout": "", "stderr": str(e)}


def _get_workspace_dir() -> str:
    """Get the workspace directory for app creation."""
    workspace = os.getenv("WORKSPACE_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "workspace"))
    os.makedirs(workspace, exist_ok=True)
    return workspace


async def _check_gh_auth() -> dict:
    """Check if gh CLI is installed and authenticated."""
    gh_path = shutil.which("gh")
    if not gh_path:
        return {"installed": False, "authenticated": False, "user": None, "error": "gh CLI not found"}
    result = await _run_command("gh auth status 2>&1", timeout=10)
    authenticated = result["exit_code"] == 0
    user = None
    if authenticated:
        for line in result["stdout"].split("\n"):
            if "Logged in to" in line and "account" in line:
                parts = line.split("account")
                if len(parts) > 1:
                    user = parts[1].strip().split(" ")[0].strip()
                break
    return {"installed": True, "authenticated": authenticated, "user": user, "gh_path": gh_path}


# ─── Request Models ──────────────────────────

class CopilotPromptRequest(BaseModel):
    prompt: str
    model: str = "gpt-4o"


class CreateAppRequest(BaseModel):
    template_id: str
    app_name: str
    github_repo: bool = False
    description: str = ""


class CopilotChatRequest(BaseModel):
    prompt: str
    context: str = ""


class ScaffoldRequest(BaseModel):
    description: str
    framework: str = "nextjs"
    features: list[str] = []


# ─── Routes ──────────────────────────────────

@router.get("")
@router.get("/")
async def copilot_status():
    """Get GitHub Copilot integration status."""
    gh_status = await _check_gh_auth()
    github_token = os.getenv("GITHUB_TOKEN", "")
    has_token = bool(github_token)
    return {
        "provider": {
            "name": "GitHub Copilot",
            "status": "configured" if has_token else "not_configured",
            "models": COPILOT_MODELS,
            "env_var": "GITHUB_TOKEN",
            "base_url": "https://models.inference.ai.azure.com",
        },
        "cli": gh_status,
        "token_configured": has_token,
        "features": [
            "LLM Chat (GPT-4o, o1 via GitHub Models API)",
            "App Scaffolding (12+ templates)",
            "GitHub Repo Creation",
            "Code Generation & Explanation",
            "Shell Command Suggestions",
        ],
    }


@router.get("/models")
async def list_models():
    """List available Copilot models."""
    return COPILOT_MODELS


@router.get("/templates")
async def list_templates():
    """List available app templates."""
    return APP_TEMPLATES


@router.post("/create-app")
async def create_app(req: CreateAppRequest):
    """Create a new app from template using Copilot-powered scaffolding."""
    # Validate template
    template = next((t for t in APP_TEMPLATES if t["id"] == req.template_id), None)
    if not template:
        return {"error": f"Template '{req.template_id}' not found", "templates": [t["id"] for t in APP_TEMPLATES]}

    # Sanitize app name
    safe_name = "".join(c for c in req.app_name if c.isalnum() or c in "-_").strip("-_")
    if not safe_name:
        return {"error": "Invalid app name"}

    workspace = _get_workspace_dir()
    app_dir = os.path.join(workspace, safe_name)

    if os.path.exists(app_dir):
        return {"error": f"Directory '{safe_name}' already exists in workspace"}

    steps: list[dict] = []

    # Step 1: Create app from template
    cmd = template["command"].format(name=safe_name)
    result = await _run_command(cmd, cwd=workspace, timeout=180)
    steps.append({
        "step": "create_app",
        "command": cmd,
        "success": result["exit_code"] == 0,
        "output": result["stdout"][-500:] if result["stdout"] else result["stderr"][-500:],
    })

    # Step 2: Install additional deps for certain templates
    post_install = {
        "nextjs-full": "cd {name} && npm install @supabase/supabase-js @supabase/ssr lucide-react clsx tailwind-merge framer-motion",
        "vite-react": "cd {name} && npm install && npm install -D tailwindcss @tailwindcss/vite",
        "expo-mobile": "cd {name} && npx expo install expo-router expo-linking",
    }
    if req.template_id in post_install:
        dep_cmd = post_install[req.template_id].format(name=safe_name)
        dep_result = await _run_command(dep_cmd, cwd=workspace, timeout=180)
        steps.append({
            "step": "install_deps",
            "command": dep_cmd,
            "success": dep_result["exit_code"] == 0,
            "output": dep_result["stdout"][-500:] if dep_result["stdout"] else dep_result["stderr"][-500:],
        })

    # Step 3: Init git
    git_result = await _run_command(f"cd {safe_name} && git init && git add -A && git commit -m 'Initial commit from Delirium × Copilot'", cwd=workspace, timeout=30)
    steps.append({
        "step": "git_init",
        "success": git_result["exit_code"] == 0,
        "output": git_result["stdout"][-300:],
    })

    # Step 4: Create GitHub repo if requested
    if req.github_repo:
        gh_status = await _check_gh_auth()
        if gh_status["authenticated"]:
            desc_flag = f' --description "{req.description}"' if req.description else ""
            repo_cmd = f'cd {safe_name} && gh repo create {gh_status["user"]}/{safe_name} --public{desc_flag} --source=. --push'
            repo_result = await _run_command(repo_cmd, cwd=workspace, timeout=60)
            steps.append({
                "step": "github_repo",
                "command": repo_cmd,
                "success": repo_result["exit_code"] == 0,
                "output": repo_result["stdout"][-300:] if repo_result["stdout"] else repo_result["stderr"][-300:],
                "repo_url": f"https://github.com/{gh_status['user']}/{safe_name}" if repo_result["exit_code"] == 0 else None,
            })
        else:
            steps.append({"step": "github_repo", "success": False, "output": "GitHub CLI not authenticated"})

    return {
        "app_name": safe_name,
        "template": template["name"],
        "stack": template["stack"],
        "path": app_dir,
        "steps": steps,
        "success": all(s["success"] for s in steps),
    }


@router.post("/suggest-command")
async def suggest_command(req: CopilotChatRequest):
    """Use gh copilot suggest to get shell command suggestions."""
    gh_status = await _check_gh_auth()
    if not gh_status["installed"]:
        return {"error": "GitHub CLI not installed"}

    # Use gh copilot for command suggestion
    result = await _run_command(
        f'gh copilot suggest -t shell "{req.prompt}" 2>&1',
        timeout=30,
    )
    return {
        "prompt": req.prompt,
        "suggestion": result["stdout"].strip(),
        "exit_code": result["exit_code"],
    }


@router.post("/explain")
async def explain_command(req: CopilotChatRequest):
    """Use gh copilot explain to understand a command or code."""
    gh_status = await _check_gh_auth()
    if not gh_status["installed"]:
        return {"error": "GitHub CLI not installed"}

    result = await _run_command(
        f'gh copilot explain "{req.context}" 2>&1',
        timeout=30,
    )
    return {
        "context": req.context,
        "explanation": result["stdout"].strip(),
        "exit_code": result["exit_code"],
    }


@router.get("/workspace")
async def list_workspace_apps():
    """List apps in the workspace directory."""
    workspace = _get_workspace_dir()
    apps = []
    if os.path.exists(workspace):
        for entry in sorted(os.listdir(workspace)):
            app_path = os.path.join(workspace, entry)
            if os.path.isdir(app_path) and not entry.startswith("."):
                # Detect framework
                framework = "unknown"
                if os.path.exists(os.path.join(app_path, "next.config.mjs")) or os.path.exists(os.path.join(app_path, "next.config.js")):
                    framework = "Next.js"
                elif os.path.exists(os.path.join(app_path, "vite.config.ts")) or os.path.exists(os.path.join(app_path, "vite.config.js")):
                    framework = "Vite"
                elif os.path.exists(os.path.join(app_path, "app.json")):
                    framework = "Expo"
                elif os.path.exists(os.path.join(app_path, "requirements.txt")):
                    framework = "Python"
                elif os.path.exists(os.path.join(app_path, "astro.config.mjs")):
                    framework = "Astro"
                elif os.path.exists(os.path.join(app_path, "nuxt.config.ts")):
                    framework = "Nuxt"

                has_git = os.path.isdir(os.path.join(app_path, ".git"))
                pkg_path = os.path.join(app_path, "package.json")
                name = entry
                if os.path.exists(pkg_path):
                    try:
                        import json
                        with open(pkg_path) as f:
                            pkg = json.load(f)
                            name = pkg.get("name", entry)
                    except Exception:
                        pass
                apps.append({
                    "name": name,
                    "dir": entry,
                    "path": app_path,
                    "framework": framework,
                    "has_git": has_git,
                })
    return {"workspace": workspace, "apps": apps, "count": len(apps)}


@router.get("/gh-status")
async def github_status():
    """Get detailed GitHub CLI status."""
    gh_status = await _check_gh_auth()
    repos = []
    if gh_status["authenticated"]:
        result = await _run_command("gh repo list --limit 10 --json name,url,isPrivate,updatedAt 2>&1", timeout=15)
        if result["exit_code"] == 0:
            try:
                import json
                repos = json.loads(result["stdout"])
            except Exception:
                pass
    return {**gh_status, "recent_repos": repos}
