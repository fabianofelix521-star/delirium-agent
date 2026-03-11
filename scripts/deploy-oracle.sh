#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# Delirium Infinite — Oracle Cloud Deploy Script
# Free Tier: ARM Ampere A1 (4 OCPU, 24GB RAM)
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

# ─── CONFIG ──────────────────────────────────────────────
REMOTE_USER="${REMOTE_USER:-ubuntu}"
REMOTE_HOST="${REMOTE_HOST:-}"
SSH_KEY="${SSH_KEY:-~/.ssh/id_rsa}"
APP_DIR="/home/${REMOTE_USER}/delirium"
DOMAIN="${DELIRIUM_DOMAIN:-}"

print_banner() {
    echo -e "${PURPLE}"
    echo "  ╔═══════════════════════════════════════════════╗"
    echo "  ║   DELIRIUM INFINITE — Oracle Cloud Deploy     ║"
    echo "  ║   Free Tier ARM Ampere A1 (4 OCPU / 24GB)    ║"
    echo "  ╚═══════════════════════════════════════════════╝"
    echo -e "${NC}"
}

usage() {
    echo -e "${CYAN}Usage:${NC}"
    echo "  REMOTE_HOST=<ip> bash $0 setup     — First-time server setup"
    echo "  REMOTE_HOST=<ip> bash $0 deploy    — Deploy/update the app"
    echo "  REMOTE_HOST=<ip> bash $0 logs      — View live logs"
    echo "  REMOTE_HOST=<ip> bash $0 status    — Check service status"
    echo ""
    echo -e "${CYAN}Environment variables:${NC}"
    echo "  REMOTE_HOST   — Oracle VPS public IP (required)"
    echo "  REMOTE_USER   — SSH user (default: ubuntu)"
    echo "  SSH_KEY       — SSH private key path (default: ~/.ssh/id_rsa)"
    echo "  DELIRIUM_DOMAIN — Your domain (optional, for HTTPS)"
    echo ""
    echo -e "${CYAN}Example:${NC}"
    echo "  REMOTE_HOST=129.153.xx.xx bash $0 setup"
    echo "  REMOTE_HOST=129.153.xx.xx DELIRIUM_DOMAIN=delirium.example.com bash $0 deploy"
}

ssh_cmd() {
    ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "${REMOTE_USER}@${REMOTE_HOST}" "$@"
}

scp_cmd() {
    scp -o StrictHostKeyChecking=no -i "$SSH_KEY" "$@"
}

# ─── SETUP: First-time server configuration ─────────────
cmd_setup() {
    echo -e "${BLUE}${BOLD}[1/5] Updating system packages...${NC}"
    ssh_cmd "sudo apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq"

    echo -e "${BLUE}${BOLD}[2/5] Installing Docker...${NC}"
    ssh_cmd '
        if ! command -v docker &>/dev/null; then
            curl -fsSL https://get.docker.com | sh
            sudo usermod -aG docker $USER
            echo "Docker installed — you may need to reconnect for group to take effect."
        else
            echo "Docker already installed."
        fi
    '

    echo -e "${BLUE}${BOLD}[3/5] Installing Docker Compose plugin...${NC}"
    ssh_cmd '
        if ! docker compose version &>/dev/null; then
            sudo apt-get install -y -qq docker-compose-plugin
        else
            echo "Docker Compose already installed."
        fi
    '

    echo -e "${BLUE}${BOLD}[4/5] Configuring firewall (iptables)...${NC}"
    ssh_cmd '
        # Oracle Cloud uses iptables, not ufw
        sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
        sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
        sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8080 -j ACCEPT
        sudo netfilter-persistent save 2>/dev/null || sudo iptables-save | sudo tee /etc/iptables/rules.v4 >/dev/null
        echo "Firewall rules added for ports 80, 443, 8080."
    '

    echo -e "${BLUE}${BOLD}[5/5] Creating app directory...${NC}"
    ssh_cmd "mkdir -p ${APP_DIR}"

    echo ""
    echo -e "${GREEN}${BOLD}✅ Server setup complete!${NC}"
    echo -e "${CYAN}Next steps:${NC}"
    echo "  1. Configure Oracle Cloud Security List:"
    echo "     - Go to: Networking → Virtual Cloud Networks → your VCN → Security Lists"
    echo "     - Add Ingress Rules for ports 80, 443, 8080 (0.0.0.0/0, TCP)"
    echo "  2. Run: REMOTE_HOST=${REMOTE_HOST} bash $0 deploy"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Also open ports 80, 443, 8080 in Oracle Cloud Security Lists!${NC}"
    echo "     Oracle has TWO firewalls: iptables (done) + Security Lists (you must do manually)"
}

# ─── DEPLOY: Send code and start services ────────────────
cmd_deploy() {
    echo -e "${BLUE}${BOLD}[1/4] Syncing project files to server...${NC}"

    # Create a temporary tarball excluding unnecessary files
    TMPTAR=$(mktemp /tmp/delirium-deploy-XXXXX.tar.gz)
    tar czf "$TMPTAR" \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='__pycache__' \
        --exclude='.git' \
        --exclude='venv' \
        --exclude='.env.local' \
        --exclude='*.pyc' \
        -C "$(dirname "$0")/.." .

    scp_cmd "$TMPTAR" "${REMOTE_USER}@${REMOTE_HOST}:/tmp/delirium-deploy.tar.gz"
    rm -f "$TMPTAR"

    ssh_cmd "
        mkdir -p ${APP_DIR}
        cd ${APP_DIR}
        tar xzf /tmp/delirium-deploy.tar.gz
        rm -f /tmp/delirium-deploy.tar.gz
    "

    echo -e "${BLUE}${BOLD}[2/4] Setting environment variables...${NC}"
    if [[ -n "$DOMAIN" ]]; then
        ssh_cmd "cd ${APP_DIR} && sed -i 's|^APP_URL=.*|APP_URL=https://${DOMAIN}|' .env"
        ssh_cmd "cd ${APP_DIR} && grep -q '^DELIRIUM_DOMAIN=' .env && sed -i 's|^DELIRIUM_DOMAIN=.*|DELIRIUM_DOMAIN=${DOMAIN}|' .env || echo 'DELIRIUM_DOMAIN=${DOMAIN}' >> .env"
        echo -e "  Domain: ${GREEN}${DOMAIN}${NC} (HTTPS via Let's Encrypt)"
    else
        echo -e "  ${YELLOW}No domain set. Using IP:8080 (HTTP only).${NC}"
    fi
    ssh_cmd "cd ${APP_DIR} && sed -i 's|^APP_ENV=.*|APP_ENV=production|' .env"

    echo -e "${BLUE}${BOLD}[3/4] Building and starting containers...${NC}"
    ssh_cmd "cd ${APP_DIR} && docker compose build --no-cache 2>&1 | tail -5"
    ssh_cmd "cd ${APP_DIR} && docker compose up -d 2>&1"

    echo -e "${BLUE}${BOLD}[4/4] Waiting for health check...${NC}"
    sleep 10

    local health
    health=$(ssh_cmd "curl -sf http://localhost:8000/health 2>/dev/null" || echo '{"status":"starting"}')
    echo -e "  Backend health: ${GREEN}${health}${NC}"

    echo ""
    echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}  ✅ DELIRIUM INFINITE DEPLOYED!${NC}"
    echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
    echo ""
    if [[ -n "$DOMAIN" ]]; then
        echo -e "  🌐 URL: ${CYAN}https://${DOMAIN}${NC}"
    else
        echo -e "  🌐 URL: ${CYAN}http://${REMOTE_HOST}:8080${NC}"
    fi
    echo -e "  📱 Acesse pelo celular com essa URL!"
    echo ""
}

# ─── LOGS ────────────────────────────────────────────────
cmd_logs() {
    echo -e "${CYAN}Streaming logs (Ctrl+C to stop)...${NC}"
    ssh_cmd "cd ${APP_DIR} && docker compose logs -f --tail=50"
}

# ─── STATUS ──────────────────────────────────────────────
cmd_status() {
    echo -e "${CYAN}Service status:${NC}"
    ssh_cmd "cd ${APP_DIR} && docker compose ps"
    echo ""
    ssh_cmd "cd ${APP_DIR} && docker compose stats --no-stream 2>/dev/null" || true
}

# ─── MAIN ────────────────────────────────────────────────
print_banner

if [[ -z "$REMOTE_HOST" ]]; then
    echo -e "${RED}Error: REMOTE_HOST not set.${NC}"
    echo ""
    usage
    exit 1
fi

case "${1:-}" in
    setup)  cmd_setup  ;;
    deploy) cmd_deploy ;;
    logs)   cmd_logs   ;;
    status) cmd_status ;;
    *)      usage      ;;
esac
