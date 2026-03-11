#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# Delirium Infinite - Universal Installer
# ═══════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'

print_banner() {
    echo -e "${PURPLE}"
    cat << 'EOF'
    ██████╗ ███████╗██╗     ██╗██████╗ ██╗██╗   ██╗███╗   ███╗
    ██╔══██╗██╔════╝██║     ██║██╔══██╗██║██║   ██║████╗ ████║
    ██║  ██║█████╗  ██║     ██║██████╔╝██║██║   ██║██╔████╔██║
    ██║  ██║██╔══╝  ██║     ██║██╔══██╗██║██║   ██║██║╚██╔╝██║
    ██████╔╝███████╗███████╗██║██║  ██║██║╚██████╔╝██║ ╚═╝ ██║
    ╚═════╝ ╚══════╝╚══════╝╚═╝╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝     ╚═╝
                    ∞  I N F I N I T E  ∞
EOF
    echo -e "${NC}"
    echo -e "${CYAN}${BOLD}  Autonomous AI Agent — Full Web Interface${NC}"
    echo ""
}

detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        ARCH=$(uname -m)
        echo -e "${GREEN}✅ Detected: macOS ($ARCH)${NC}"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        ARCH=$(uname -m)
        echo -e "${GREEN}✅ Detected: Linux ($ARCH)${NC}"
    else
        echo -e "${RED}❌ Unsupported OS: $OSTYPE${NC}"
        exit 1
    fi
}

check_dependency() {
    if command -v "$1" &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} $1 found"
        return 0
    else
        echo -e "  ${YELLOW}✗${NC} $1 not found"
        return 1
    fi
}

install_dependencies() {
    echo -e "\n${BLUE}${BOLD}📦 Checking dependencies...${NC}"

    # Node.js
    if ! check_dependency node; then
        echo -e "${CYAN}Installing Node.js 20...${NC}"
        if [[ "$OS" == "macos" ]]; then
            brew install node@20
        else
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
    fi

    # Python
    if ! check_dependency python3; then
        echo -e "${CYAN}Installing Python 3.11...${NC}"
        if [[ "$OS" == "macos" ]]; then
            brew install python@3.11
        else
            sudo apt-get install -y python3.11 python3.11-venv python3-pip
        fi
    fi

    # Docker
    if ! check_dependency docker; then
        echo -e "${CYAN}Installing Docker...${NC}"
        if [[ "$OS" == "macos" ]]; then
            echo -e "${YELLOW}Please install Docker Desktop from https://docker.com/products/docker-desktop${NC}"
            echo -e "Press Enter after installation..."
            read -r
        else
            curl -fsSL https://get.docker.com | sh
            sudo usermod -aG docker "$USER"
        fi
    fi

    check_dependency npm
    check_dependency git
}

setup_env() {
    echo -e "\n${BLUE}${BOLD}⚙️  Setting up environment...${NC}"

    if [[ ! -f .env ]]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env from template${NC}"
    else
        echo -e "${YELLOW}⚠️  .env already exists, skipping${NC}"
    fi
}

setup_backend() {
    echo -e "\n${BLUE}${BOLD}🐍 Setting up backend...${NC}"
    cd backend

    python3 -m venv venv 2>/dev/null || python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt --quiet

    cd ..
    echo -e "${GREEN}✅ Backend ready${NC}"
}

setup_frontend() {
    echo -e "\n${BLUE}${BOLD}⚛️  Setting up frontend...${NC}"
    cd frontend

    npm install --silent
    
    cd ..
    echo -e "${GREEN}✅ Frontend ready${NC}"
}

choose_deployment() {
    echo -e "\n${BLUE}${BOLD}🌐 Where do you want to host Delirium?${NC}"
    echo ""
    echo -e "  ${CYAN}[1]${NC} Oracle Cloud Free ${GREEN}(GRÁTIS pra sempre)${NC} ⭐ RECOMENDADO"
    echo -e "  ${CYAN}[2]${NC} Local only ${YELLOW}(seu computador)${NC}"
    echo -e "  ${CYAN}[3]${NC} Docker Compose ${BLUE}(local com containers)${NC}"
    echo ""
    read -r -p "Choose [1-3]: " choice

    case $choice in
        1)
            echo -e "\n${CYAN}Oracle Cloud deployment selected.${NC}"
            echo -e "Run ${BOLD}make deploy${NC} after setup to deploy."
            DEPLOY_MODE="oracle"
            ;;
        2)
            echo -e "\n${CYAN}Local development mode selected.${NC}"
            DEPLOY_MODE="local"
            ;;
        3)
            echo -e "\n${CYAN}Docker Compose mode selected.${NC}"
            DEPLOY_MODE="docker"
            ;;
        *)
            echo -e "${YELLOW}Defaulting to local mode.${NC}"
            DEPLOY_MODE="local"
            ;;
    esac
}

start_services() {
    if [[ "$DEPLOY_MODE" == "docker" ]]; then
        echo -e "\n${BLUE}${BOLD}🐳 Starting Docker services...${NC}"
        docker compose up -d
        echo -e "${GREEN}✅ All services running${NC}"
    elif [[ "$DEPLOY_MODE" == "local" ]]; then
        echo -e "\n${BLUE}${BOLD}🚀 Starting local dev servers...${NC}"
        echo -e "  Run: ${CYAN}make dev${NC}"
    fi
}

print_success() {
    echo ""
    echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}  ✅ DELIRIUM INFINITE - INSTALLED SUCCESSFULLY${NC}"
    echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${CYAN}Start dev servers:${NC}  make dev"
    echo -e "  ${CYAN}Docker mode:${NC}        make up"
    echo -e "  ${CYAN}Open in browser:${NC}    http://localhost:3000"
    echo ""
    echo -e "  ${PURPLE}Configure your APIs at:${NC} http://localhost:3000/settings"
    echo ""
    echo -e "${YELLOW}${BOLD}  🔥 Let's go! 🔥${NC}"
    echo ""
}

# ─── Main ─────────────────────────────────────────────────
main() {
    print_banner
    detect_os
    install_dependencies
    choose_deployment
    setup_env
    setup_backend
    setup_frontend
    start_services
    print_success
}

main "$@"
