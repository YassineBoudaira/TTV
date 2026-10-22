#!/usr/bin/env bash
# ==============================================================================
# Universal Linux Setup Script for Any VPS & Cloud Provider:
# Compatible with:
#   - Hostinger VPS (KVM)
#   - Oracle Cloud Always Free (x86_64 & ARM64 Ampere A1)
#   - QuickSRV (quicksrv.io NVMe VPS)
#   - Hetzner Cloud, DigitalOcean, Linode, Vultr, AWS EC2
# ==============================================================================
set -e
export DEBIAN_FRONTEND=noninteractive

echo "======================================================================"
echo "🚀 Starting Universal AI Video Studio & Pipeline VPS Installation"
echo "======================================================================"

# Detect Architecture (x86_64 vs aarch64 / ARM for Oracle Cloud)
ARCH="$(uname -m)"
echo "==> Detected Architecture: $ARCH"

# 1. Update Packages
echo "==> Step 1/6: Updating package repositories..."
apt-get update -y && apt-get upgrade -y

# 2. Configure Linux Swap Space (Prevents Out-Of-Memory kills on 1-2GB VPS)
echo "==> Step 2/7: Checking and Configuring Linux Swap Partition..."
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
fi

# 3. Install FFmpeg, Python3, Multilingual Fonts, and Nginx
echo "==> Step 3/7: Installing FFmpeg, Python 3, Noto Arabic Fonts & System Tools..."
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

# 4. Special Oracle Cloud Firewall Rule (Oracle blocks port 80/3000 in iptables by default)
if iptables -L INPUT -n 2>/dev/null | grep -q "REJECT"; then
  echo "==> Notice: Oracle Cloud / RedHat iptables reject rule detected. Opening ports 80, 443, 3000..."
  iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT || true
  iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT || true
  iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT || true
  netfilter-persistent save 2>/dev/null || true
fi

# 5. Install Node.js 20 LTS & PM2
echo "==> Step 4/7: Installing Node.js 20 LTS & PM2..."
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
npm install -g pm2 tsx

# 6. Set up Python Video Pipeline Virtual Environment
echo "==> Step 5/7: Configuring Python Virtual Environment (ttv)..."
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

# 7. Build Web Studio Frontend
echo "==> Step 6/7: Building Web Application..."
npm install
npm run build

# 8. Start Full-Stack Service with PM2 in Cluster Mode
echo "==> Step 7/7: Starting Background Service & Nginx Reverse Proxy..."
pm2 delete ai-video-studio 2>/dev/null || true
pm2 start server.ts --name "ai-video-studio" --interpreter tsx -i max --max-memory-restart 1200M --env NODE_ENV=production
pm2 save
pm2 startup systemd -u root --hp /root || true

# Configure Firewall
ufw allow OpenSSH || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw allow 3000/tcp || true
ufw --force enable || true

# Configure Nginx with High-Throughput Buffers & Gzip
cat << 'EOF' > /etc/nginx/sites-available/ai-video-studio
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 120M;

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

        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
}
EOF

ln -sf /etc/nginx/sites-available/ai-video-studio /etc/nginx/sites-enabled/default
systemctl reload nginx || systemctl restart nginx

echo "======================================================================"
echo "✅ Universal Installation Complete!"
echo "Your AI Video Studio & Pipeline is running 24/7."
echo ""
echo "Access your app at: http://$(curl -s ifconfig.me || hostname -I | awk '{print $1}')"
echo "Commands:"
echo "  - Monitor Service: pm2 status"
echo "  - Live Logs:       pm2 logs ai-video-studio"
echo "  - Restart:         pm2 restart ai-video-studio"
echo "  - Run Pipeline:    cd free-content-pipeline && ./venv/bin/python pipeline.py --site"
echo "======================================================================"
