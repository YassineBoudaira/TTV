# 🌐 Complete Deployment Guide: Hostinger, QuickSRV & Oracle Cloud VPS

This guide details step-by-step how to deploy this entire project (**Full-Stack AI Video Web Studio + Python `ttv` Article-to-Video Pipeline**) onto **Hostinger VPS**, **QuickSRV (`quicksrv.io`)**, **Oracle Cloud Always Free (4 Cores & 24GB RAM)**, **Hetzner Cloud**, or **Hostinger hPanel Cloud Hosting**.

---

## 📋 Table of Contents
1. [Supported Providers & Comparison](#1-supported-providers--comparison)
2. [Quick Automated Setup on Any VPS (1 Universal Command)](#2-quick-automated-setup-on-any-vps-1-universal-command)
3. [Oracle Cloud (OCI) Always Free Setup (24GB RAM Free Forever)](#3-oracle-cloud-oci-always-free-setup-24gb-ram-free-forever)
4. [QuickSRV (quicksrv.io) NVMe VPS Setup](#4-quicksrv-quicksrvio-nvme-vps-setup)
5. [Hostinger VPS & hPanel Setup](#5-hostinger-vps--hpanel-setup)
6. [Configuring Free SSL (HTTPS) with Let's Encrypt](#6-configuring-free-ssl-https-with-lets-encrypt)
7. [Automating Nightly Video Generation with Cron](#7-automating-nightly-video-generation-with-cron)
8. [Troubleshooting & Maintenance Commands](#8-troubleshooting--maintenance-commands)

---

## 1. Supported Providers & Comparison

| Provider | Plans / Specs | Pricing | Best For |
| :--- | :--- | :--- | :--- |
| **Oracle Cloud (OCI)** | 4 OCPUs (ARM Ampere A1), 24 GB RAM, 200 GB Storage | **100% Free Forever** | Best Free Performance (Render 1080p in parallel) |
| **QuickSRV (`quicksrv.io`)** | Pure NVMe Storage, 1-4 Cores, 2-8GB RAM | Budget (~$3/mo) | Fastest Disk I/O for FFmpeg video encoding |
| **Hostinger VPS** | KVM 1 (4GB RAM) / KVM 2 (8GB RAM) | From ~$5.99/mo | All-in-one easy management with automated backups |
| **Hetzner Cloud** | CPX21 (3 vCPUs, 4GB RAM) / CAX11 | From ~€3.79/mo | Best European latency & compute value |
| **Hostinger hPanel** | Cloud / Business Web Hosting | Managed | No-CLI setup via Node.js App Selector |

---

## 2. Quick Automated Setup on Any VPS (1 Universal Command)

Our universal script detects Ubuntu, Debian, x86_64, and ARM64 architecture (including Oracle Ampere A1) automatically:

```bash
cd /root/ai-video-studio
bash scripts/deploy_vps_universal.sh
```

### Step 1: Connect to your Hostinger VPS
Open your terminal (PowerShell, Command Prompt, or Terminal on Mac/Linux):
```bash
ssh root@YOUR_HOSTINGER_VPS_IP
```

### Step 2: Upload or Clone the Project
Upload your project files via SCP or SFTP, or clone it directly:
```bash
# Example using SCP from your local PC:
scp -r ./ai-video-studio root@YOUR_HOSTINGER_VPS_IP:/root/ai-video-studio
```
Or directly on the VPS:
```bash
cd /root/ai-video-studio
```

### Step 3: Run the Master Setup Script
```bash
bash scripts/deploy_hostinger_vps.sh
```

This single script will:
* Install FFmpeg, Python 3, Python virtualenv, and Node.js 20 LTS.
* Install Arabic and multilingual fonts (`fonts-noto-core`, `libraqm0`).
* Install Python dependencies (`Pillow`, `arabic-reshaper`, `python-bidi`, `edge-tts`).
* Build the React frontend with Vite.
* Configure **PM2** to keep your web studio running 24/7.
* Configure **Nginx** reverse proxy so your site is accessible on port 80/443 without typing `:3000`.

---

## 3. Manual Step-by-Step VPS Setup

If you prefer to configure everything manually, run these exact steps:

### Step 1: Update Packages & Install Tools
```bash
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y ffmpeg python3 python3-pip python3-venv unzip wget git \
  fonts-noto-core fonts-dejavu-core libraqm0 espeak-ng nginx tmux ufw
```

### Step 2: Install Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2 tsx
```

### Step 3: Set up the Python Pipeline Virtual Environment
```bash
cd /root/ai-video-studio/free-content-pipeline
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
./venv/bin/pip install edge-tts
```

### Step 4: Configure `.env`
Create or edit `.env` in the project root:
```bash
cd /root/ai-video-studio
nano .env
```
Paste your keys:
```env
GEMINI_API_KEY="your-gemini-api-key"
PORT=3000
NODE_ENV=production
```

### Step 5: Build and Run with PM2
```bash
npm install
npm run build
pm2 start server.ts --name "video-studio" --interpreter tsx --env NODE_ENV=production
pm2 save
pm2 startup
```

### Step 6: Configure Nginx Reverse Proxy
```bash
sudo nano /etc/nginx/sites-available/default
```
Replace the `location /` block with:
```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
}
```
Reload Nginx:
```bash
sudo systemctl restart nginx
```

---

## 4. Setting Up on Hostinger Shared/Cloud Hosting (hPanel)

If you are using **Hostinger Business Web Hosting** or **Cloud Hosting** with hPanel (without root SSH access):

1. **Log in to hPanel** and find **Node.js** under the **Advanced** section.
2. Click **Create Application**:
   * **Node.js version**: Select `20.x` or latest LTS.
   * **Application Mode**: `Production`.
   * **Application Root**: Enter your project folder path (e.g., `ai-video-studio`).
   * **Application Startup File**: `server.ts` or `dist/server.js`.
3. In **File Manager**, upload all files (ensure `package.json`, `dist`, `server.ts`, and `free-content-pipeline` are uploaded).
4. Run `npm install` via the **NPM install** button in hPanel.
5. In **Environment Variables**, add `GEMINI_API_KEY`.
6. Click **Restart Application**.

---

## 5. Configuring Free SSL (HTTPS) with Let's Encrypt

To get a free `https://` lock on your domain:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Certbot will automatically modify your Nginx configuration and renew the certificate every 90 days.

---

## 6. Automating Nightly Video Generation with Cron

To have your VPS automatically check your WordPress site every night and convert new articles into videos:

```bash
crontab -e
```
Add this line to run every night at 2:00 AM:
```cron
0 2 * * * cd /root/ai-video-studio/free-content-pipeline && ./venv/bin/python pipeline.py --site --limit 2 >> /root/ai-video-studio/free-content-pipeline/cron.log 2>&1
```

---

## 7. Useful Maintenance Commands

| Action | Command |
| :--- | :--- |
| **Check Web Server Status** | `pm2 status` |
| **View Live Web Logs** | `pm2 logs video-studio` |
| **Restart Web Application** | `pm2 restart video-studio` |
| **Run Pipeline Diagnostic Doctor** | `cd free-content-pipeline && ./venv/bin/python pipeline.py --doctor` |
| **Run Pipeline for 1 Post** | `cd free-content-pipeline && ./venv/bin/python pipeline.py --site --limit 1` |
| **Show Pipeline Output Status** | `cd free-content-pipeline && ./venv/bin/python pipeline.py --status` |
| **Check Server Memory & CPU** | `htop` |

---

## 8. Summary of Ports & Firewall

* **Port 80**: HTTP (Nginx Web Server)
* **Port 443**: HTTPS (SSL Web Server)
* **Port 3000**: Internal Express + React Dev Server (proxied by Nginx)
* **Port 22**: SSH Remote Administration
