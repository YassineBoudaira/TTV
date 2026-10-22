import React, { useState } from 'react';
import {
  Server,
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  Cpu,
  Clock,
  Layers,
  Globe,
  FileCode,
  Download,
  AlertCircle,
  Zap,
  Gift,
  HardDrive,
  Sliders,
  Sparkles
} from 'lucide-react';

type ProviderId = 'quicksrv' | 'oracle' | 'hostinger' | 'hetzner' | 'digitalocean' | 'hpanel' | 'cpanel';

interface ProviderInfo {
  id: ProviderId;
  name: string;
  tagline: string;
  category: 'vps' | 'hosting';
  price: string;
  freeTier: string;
  badge: 'Recommended' | 'Free Forever' | 'Fast NVMe' | 'Budget Cloud' | 'No-CLI' | 'Popular';
  url: string;
  specs: {
    cpu: string;
    ram: string;
    storage: string;
    os: string;
  };
  tips: string[];
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'quicksrv',
    name: 'QuickSRV',
    tagline: 'High-Speed NVMe Storage VPS',
    category: 'vps',
    price: 'From ~$3.00 / month',
    freeTier: 'Fast budget plans, instant deployment',
    badge: 'Fast NVMe',
    url: 'https://quicksrv.io/',
    specs: {
      cpu: '1 to 4 AMD/Intel Cores',
      ram: '2GB - 8GB RAM',
      storage: 'Pure NVMe High-Speed SSD',
      os: 'Ubuntu 22.04 / 24.04 or Debian 12',
    },
    tips: [
      'Pure NVMe storage provides 5x faster video disk caching for FFmpeg rendering.',
      'Select Ubuntu 22.04 LTS or 24.04 LTS during checkout.',
      'Instant root access via SSH provided right after provisioning.',
    ],
  },
  {
    id: 'oracle',
    name: 'Oracle Cloud (OCI)',
    tagline: 'Always Free Tier — 4 Cores & 24GB RAM',
    category: 'vps',
    price: '$0.00 / month (100% Free Forever)',
    freeTier: '4 OCPUs, 24 GB RAM, 200 GB Disk',
    badge: 'Free Forever',
    url: 'https://www.oracle.com/cloud/free/',
    specs: {
      cpu: '4 OCPUs (ARM Ampere A1 Architecture)',
      ram: '24 GB RAM (Free Tier)',
      storage: '200 GB Block Volume',
      os: 'Ubuntu 22.04 / 24.04 (aarch64)',
    },
    tips: [
      'The single best free VPS on the internet: 24GB RAM means multiple 1080p videos render in parallel.',
      'Important: In Oracle Cloud Console > Virtual Cloud Network (VCN) > Default Security List, add Ingress Rules for Ports 80, 443, and 3000.',
      'Our universal script automatically handles ARM64 architecture and opens Oracle iptables firewall rules.',
    ],
  },
  {
    id: 'hostinger',
    name: 'Hostinger VPS',
    tagline: 'KVM 1 / KVM 2 / KVM 4 Cloud VPS',
    category: 'vps',
    price: 'From ~$5.99 / month',
    freeTier: '30-day money-back guarantee',
    badge: 'Recommended',
    url: 'https://www.hostinger.com/vps-hosting',
    specs: {
      cpu: '1 to 4 vCPU Cores',
      ram: '4GB - 16GB RAM',
      storage: '50GB - 200GB NVMe Storage',
      os: 'Ubuntu 22.04 / 24.04 64-bit',
    },
    tips: [
      'Great control panel with 1-click OS reinstall and automated weekly backups.',
      'Choose the KVM 2 (2 vCPU, 8GB RAM) plan for optimal video rendering and smooth 24/7 web studio.',
      'Pre-configured dedicated IPv4 and IPv6 included.',
    ],
  },
  {
    id: 'hetzner',
    name: 'Hetzner Cloud',
    tagline: 'European & US High-Performance Cloud',
    category: 'vps',
    price: 'From ~€3.79 / month',
    freeTier: 'Pay-per-hour billing',
    badge: 'Budget Cloud',
    url: 'https://www.hetzner.com/cloud',
    specs: {
      cpu: '2 to 4 vCPUs (AMD/Intel or Ampere)',
      ram: '4GB - 8GB RAM',
      storage: '40GB - 80GB NVMe',
      os: 'Ubuntu 22.04 / 24.04',
    },
    tips: [
      'Unmatched price-to-performance ratio in Europe and North America.',
      'Choose the CPX21 (3 vCPUs, 4GB RAM) or CAX11 (2 ARM cores, 4GB RAM).',
      'Instant cloud-init deployment supported.',
    ],
  },
  {
    id: 'digitalocean',
    name: 'DigitalOcean / Linode',
    tagline: 'Standard Droplets & Compute Instances',
    category: 'vps',
    price: 'From ~$6.00 / month',
    freeTier: '$200 Free 60-day credit on signup',
    badge: 'Popular',
    url: 'https://www.digitalocean.com/',
    specs: {
      cpu: '1 to 2 vCPUs',
      ram: '2GB - 4GB RAM',
      storage: '50GB SSD',
      os: 'Ubuntu 22.04 LTS',
    },
    tips: [
      'New accounts receive $200 in promotional trial credits valid for 60 days.',
      'Select the 2GB or 4GB Basic Droplet with Premium Intel or AMD NVMe.',
    ],
  },
  {
    id: 'hpanel',
    name: 'Hostinger hPanel (Shared/Cloud)',
    tagline: 'Hostinger Cloud Hosting with Node.js App Selector',
    category: 'hosting',
    price: 'Included with Hostinger Cloud / Business Plans',
    freeTier: 'No terminal / root SSH needed',
    badge: 'No-CLI',
    url: 'https://hpanel.hostinger.com/',
    specs: {
      cpu: 'Cloud Managed Environment',
      ram: 'Shared Cloud RAM',
      storage: 'Web Storage',
      os: 'CloudLinux + Node.js 20 Selector',
    },
    tips: [
      'Perfect if you do not want to manage an Ubuntu command line.',
      'Use the built-in Node.js application manager in hPanel to run server.ts.',
    ],
  },
  {
    id: 'cpanel',
    name: 'cPanel Hosting',
    tagline: 'Standard cPanel with Setup Node.js App',
    category: 'hosting',
    price: 'Any cPanel provider',
    freeTier: 'Shared hosting standard',
    badge: 'No-CLI',
    url: 'https://cpanel.net/',
    specs: {
      cpu: 'Shared Cloud Environment',
      ram: 'Shared',
      storage: 'Web Storage',
      os: 'CloudLinux + cPanel',
    },
    tips: [
      'Find "Setup Node.js App" in cPanel, create application with Node.js 20, upload files, and enter GEMINI_API_KEY.',
    ],
  },
];

export const VpsDeployGuide: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>('quicksrv');
  const [vpsIp, setVpsIp] = useState<string>('YOUR_VPS_IP');
  const [customDomain, setCustomDomain] = useState<string>('yourdomain.com');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const currentProvider = PROVIDERS.find((p) => p.id === selectedProvider) || PROVIDERS[0];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const universalDeployCmd = `bash scripts/deploy_vps_universal.sh`;

  const sshConnectCmd = `ssh ${selectedProvider === 'oracle' ? 'ubuntu' : 'root'}@${vpsIp}`;

  const scpUploadCmd = `scp -r ./ai-video-studio ${selectedProvider === 'oracle' ? 'ubuntu' : 'root'}@${vpsIp}:/root/ai-video-studio`;

  const certbotCmd = `sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ${customDomain} -d www.${customDomain}`;

  const cronCmd = `0 2 * * * cd /root/ai-video-studio/free-content-pipeline && ./venv/bin/python pipeline.py --site --limit 2 >> /root/ai-video-studio/free-content-pipeline/cron.log 2>&1`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                Multi-Cloud Hosting & VPS Hub
              </span>
              <span className="text-xs text-slate-400 font-medium">Choose Your Hosting Infrastructure</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white">
              Deploy AI Video Studio & Pipeline Anywhere
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Select your preferred hosting provider below: from fast budget NVMe VPS (<strong>QuickSRV</strong>) and <strong>Oracle Cloud Always Free (24GB RAM)</strong>, to <strong>Hostinger VPS / Cloud</strong> and <strong>Hetzner</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Universal Linux & Cloud Ready
            </span>
          </div>
        </div>

        {/* IP & Domain Dynamic Customizer Bar */}
        <div className="mt-5 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Your VPS Server IP Address (Auto-Customizes Commands):
            </label>
            <input
              type="text"
              value={vpsIp}
              onChange={(e) => setVpsIp(e.target.value.trim() || 'YOUR_VPS_IP')}
              placeholder="e.g. 195.179.231.10"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-xs text-slate-200 font-mono outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Your Custom Domain (For Free SSL):
            </label>
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value.trim() || 'yourdomain.com')}
              placeholder="e.g. myvideostudio.com"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-xs text-slate-200 font-mono outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Provider Selector Grid */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
          Select Your Hosting or VPS Platform:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {PROVIDERS.map((provider) => {
            const isSelected = selectedProvider === provider.id;
            return (
              <button
                key={provider.id}
                onClick={() => setSelectedProvider(provider.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                    {provider.name}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      provider.badge === 'Free Forever'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : provider.badge === 'Fast NVMe'
                        ? 'bg-amber-500/20 text-amber-300'
                        : provider.badge === 'Recommended'
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {provider.badge}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block truncate">{provider.tagline}</span>
                <span className="text-[10px] text-indigo-300/80 font-mono block mt-1">{provider.price}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Provider Details Card */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-white">{currentProvider.name}</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {currentProvider.tagline}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Pricing: <strong className="text-slate-200">{currentProvider.price}</strong> • Free Tier / Trial: <span className="text-emerald-400 font-medium">{currentProvider.freeTier}</span>
            </p>
          </div>

          <a
            href={currentProvider.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors"
          >
            Visit {currentProvider.name} Portal
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>

        {/* Hardware Recommendations Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">Recommended CPU</span>
            <span className="font-bold text-white block">{currentProvider.specs.cpu}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">Recommended RAM</span>
            <span className="font-bold text-white block">{currentProvider.specs.ram}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">Disk Type</span>
            <span className="font-bold text-white block">{currentProvider.specs.storage}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">Operating System</span>
            <span className="font-bold text-white block">{currentProvider.specs.os}</span>
          </div>
        </div>

        {/* Provider Specific Pro Tips */}
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1.5">
          <div className="font-bold text-indigo-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Important Configuration Tips for {currentProvider.name}:
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
            {currentProvider.tips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>

        {/* Step-by-Step Commands for VPS vs Managed Hosting */}
        {currentProvider.category === 'vps' ? (
          <div className="space-y-4 text-xs">
            <h4 className="text-sm font-bold text-white">
              Installation Steps for {currentProvider.name} (Ubuntu / Debian VPS):
            </h4>

            {/* Step 1: Connect via SSH */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">
                  Step 1: Connect to your {currentProvider.name} instance via SSH
                </span>
                <button
                  onClick={() => handleCopy(sshConnectCmd, 'ssh')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'ssh' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedKey === 'ssh' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-2.5 rounded bg-black font-mono text-indigo-300 overflow-x-auto">
                <code>{sshConnectCmd}</code>
              </pre>
            </div>

            {/* Step 2: Upload Files */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">
                  Step 2: Upload project files to your server
                </span>
                <button
                  onClick={() => handleCopy(scpUploadCmd, 'scp')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'scp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedKey === 'scp' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-2.5 rounded bg-black font-mono text-indigo-300 overflow-x-auto">
                <code>{scpUploadCmd}</code>
              </pre>
            </div>

            {/* Step 3: Run Master Universal Script */}
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  Step 3: Run the Universal Setup Script (Installs Node.js, Python, FFmpeg, PM2 & Nginx)
                </span>
                <button
                  onClick={() => handleCopy(`cd /root/ai-video-studio && ${universalDeployCmd}`, 'universal')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'universal' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'universal' ? 'Copied' : 'Copy Command'}
                </button>
              </div>
              <pre className="p-2.5 rounded bg-black font-mono text-emerald-300 overflow-x-auto">
                <code>{`cd /root/ai-video-studio
${universalDeployCmd}`}</code>
              </pre>
            </div>

            {/* Step 4: Configure Free SSL & Domain */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">
                  Step 4: Attach Domain & Enable Free SSL (HTTPS with Let's Encrypt)
                </span>
                <button
                  onClick={() => handleCopy(certbotCmd, 'cert')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'cert' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedKey === 'cert' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-2.5 rounded bg-black font-mono text-indigo-300 overflow-x-auto">
                <code>{certbotCmd}</code>
              </pre>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <h4 className="text-sm font-bold text-white">
              Installation Steps for {currentProvider.name} (Managed Web Panel):
            </h4>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 leading-relaxed text-slate-300">
              <p>
                1. <strong>Open Application Manager:</strong> Log into your hosting dashboard (hPanel or cPanel) and navigate to <strong>"Node.js App"</strong>.
              </p>
              <p>
                2. <strong>Create Application:</strong> Select <strong>Node.js 20.x LTS</strong>, set mode to <strong>Production</strong>, set directory to <code className="text-indigo-300 font-mono">ai-video-studio</code>, and startup file to <code className="text-indigo-300 font-mono">server.ts</code>.
              </p>
              <p>
                3. <strong>Upload Project Files:</strong> Using the File Manager or FTP, upload all project files.
              </p>
              <p>
                4. <strong>Install NPM Packages:</strong> Click the <strong>"NPM Install"</strong> button in the panel.
              </p>
              <p>
                5. <strong>Environment Variables:</strong> In the environment settings, add <code className="text-indigo-300 font-mono">GEMINI_API_KEY</code>, <code className="text-indigo-300 font-mono">PORT=3000</code>, and <code className="text-indigo-300 font-mono">NODE_ENV=production</code>.
              </p>
              <p>
                6. <strong>Start & Restart:</strong> Click Restart. Your site is live!
              </p>
            </div>
          </div>
        )}

        {/* Nightly Automated Cron Job Box */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Automated Nightly Article-to-Video Cron (Optional)
            </span>
            <button
              onClick={() => handleCopy(cronCmd, 'cron')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === 'cron' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedKey === 'cron' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Automatically processes new WordPress posts at 2:00 AM every night and saves videos to the <code className="text-slate-300">output/</code> directory:
          </p>
          <pre className="p-2.5 rounded bg-black font-mono text-emerald-300 overflow-x-auto text-[11px]">
            <code>{cronCmd}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
