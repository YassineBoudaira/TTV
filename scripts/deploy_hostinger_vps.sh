#!/usr/bin/env bash
# ==============================================================================
# Master One-Shot Setup Script for Hostinger VPS & Ubuntu Linux (22.04 / 24.04)
# Runs the full-stack Web Studio + Article-to-Video Pipeline (ttv)
# ==============================================================================
set -e
export DEBIAN_FRONTEND=noninteractive

echo "=========================================================="
echo "🚀 Starting Hostinger VPS & AI Video Pipeline Installation"
echo "=========================================================="

# 1. Update System
echo "==> Step 1/7: Updating system packages..."
apt-get update -y && apt-get upgrade -y

# 2. Configure 2GB Linux Swap Space (Prevents Out-Of-Memory kills on 1-2GB VPS)
echo "==> Step 2/8: Checking and Configuring Linux Swap Partition..."
CURRENT_SWAP=$(free -m | awk '/^Swap:/ {print $2}')
if [ "$CURRENT_SWAP" -lt 1000 ]; then
  echo "Allocating 2GB swap partition to protect Node.js and FFmpeg processes..."
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile || true
  if ! grep -q "/swapfile" /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
  sysctl vm.swappiness=10 || true
else
  echo "Swap partition adequate ($CURRENT_SWAP MB detected)."
fi

# 3. Install System Dependencies (FFmpeg, Python, Fonts, Build Essentials)
echo "==> Step 3/8: Installing FFmpeg, Python 3, Arabic Fonts & Nginx..."
apt-get install -y \
  curl \
  wget \
  git \
  unzip \
  tmux \
  ufw \
  fail2ban \
  ffmpeg \
  python3 \
  python3-pip \
  python3-venv \
  fonts-noto-core \
  fonts-noto-cjk \
  fonts-noto-color-emoji \
  fonts-dejavu-core \
  libraqm0 \
  espeak-ng \
  nginx

# 4. Install Node.js 20 LTS (Required for the Web Studio)
echo "==> Step 4/8: Installing Node.js 20 LTS & PM2..."
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
npm install -g pm2

# 5. Setup Python Virtual Environment for Video Pipeline
echo "==> Step 5/8: Setting up Python Environment for ttv..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
cd "$APP_DIR"

if [ -d "free-content-pipeline" ]; then
  cd free-content-pipeline
  python3 -m venv venv
  ./venv/bin/pip install --upgrade pip
  ./venv/bin/pip install -r requirements.txt
  ./venv/bin/pip install edge-tts || true
  cd "$APP_DIR"
fi

# 6. Build Frontend Web Application
echo "==> Step 6/8: Building Web Application..."
npm install
npm run build

# 7. Configure PM2 Process Manager in High-Performance Cluster Mode
echo "==> Step 7/8: Starting Full-Stack Server in PM2 Cluster Mode..."
pm2 delete ai-video-studio 2>/dev/null || true
pm2 start server.ts --name "ai-video-studio" --interpreter tsx -i max --max-memory-restart 1200M --env NODE_ENV=production
pm2 save
pm2 startup systemd -u root --hp /root || true

# 8. Configure Nginx Reverse Proxy with Gzip & High-Throughput Buffers
echo "==> Step 8/8: Configuring High-Performance Nginx Proxy & Firewall..."
ufw allow OpenSSH || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw allow 3000/tcp || true
ufw --force enable || true

cat << 'EOF' > /etc/nginx/sites-available/ai-video-studio
server {
    listen 80;
    server_name _;

    client_max_body_size 120M;

    # Gzip Compression
    gzip on;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # High-throughput buffers for video streaming
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
}
EOF

ln -sf /etc/nginx/sites-available/ai-video-studio /etc/nginx/sites-enabled/default
systemctl reload nginx || systemctl restart nginx

echo "=========================================================="
echo "✅ Installation Complete! Your AI Video Studio is running."
echo "Access via browser: http://YOUR_VPS_IP"
echo ""
echo "Helpful Commands:"
echo "  - Check web logs:      pm2 logs ai-video-studio"
echo "  - Restart web app:     pm2 restart ai-video-studio"
echo "  - Run Python Pipeline: cd free-content-pipeline && ./venv/bin/python pipeline.py --site"
echo "  - SSL Let's Encrypt:   apt install certbot python3-certbot-nginx && certbot --nginx -d yourdomain.com"
echo "=========================================================="
