# 🎬 Veo & AI Video Studio — Text-to-Video API Hub & Playground

An interactive developer studio and comprehensive guide exploring **Text-to-Video AI APIs**, comparing free tiers, trial credits, and paid options (including **Google Veo / Gemini Omni Flash**, **CogVideoX**, **Pollinations.ai**, and **Kling AI**). Includes an AI-powered cinematography prompt director, real-time camera motion synthesizer, and ready-to-run code generators for Node.js, Python, and cURL.

---

## 📌 The Big Question: Is there a Free API to create Text-to-Video?

### Quick Summary
* **Google Gemini API**: Text, Code, Vision, and Multimodal reasoning models (like `gemini-3.8-flash`) have a **100% Free Tier** with up to 15 requests/minute.
* **Google Veo / Gemini Video (`gemini-omni-1.1-flash`)**: Requires a paid tier / Google Cloud project because video rendering requires dedicated GPU clusters.
* **How to use Video Generation for FREE:**
  1. **Google Cloud $300 Trial Credits**: All new Google Cloud / AI Studio accounts receive **$300 in free trial credits** valid for 90 days. You can spend these credits directly on Google Veo API calls (`gemini-omni-1.1-flash`) without paying out-of-pocket!
  2. **Hugging Face Serverless Inference**: 100% Free community-hosted endpoints for open weights video models like **CogVideoX-5B** and **Wan2.1** (zero credit card required).
  3. **Pollinations.ai**: Keyless, open community video/animation API endpoint with no authentication required.
  4. **Daily / Monthly Free Credits**: **Kling AI** (66 daily free points ≈ 6 videos/day), **Luma Dream Machine** (30 free generations/month), and **Runway** (125 free starter credits).

---

## 🚀 Key Features of this Application

### 1. 🎥 Interactive Video Studio & Canvas Synthesizer
* **Text-to-Video Prompt Input**: Write custom video prompts or pick from curated cinematic presets (Cyberpunk Tokyo Drift, Bioluminescent Forest, Origami Crane Flight, Macro Steampunk Dragonfly).
* **Cinematic Controls**:
  * **Aspect Ratio**: `16:9` (Cinematic Landscape), `9:16` (TikTok/Reels/Shorts), `1:1` (Square).
  * **Shot Duration**: `5s` or `10s`.
  * **Resolution**: `720p`, `1080p`.
  * **Camera Movement**: Smooth Dolly In, Orbit 360, Drone Aerial Flyover, Tracking Shot, Macro Zoom, Static Pan.
  * **Visual Style**: Cinematic 35mm Film, Hyper-Realistic 8K, Anime / Studio Ghibli, Cyberpunk Neon Noir, Vintage 16mm, 3D Unreal Engine 5.
* **Real-Time Camera Motion Synthesizer**: Procedural 24fps motion simulator rendering camera paths, depth particles, lighting flares, and timecode HUD.
* **Direct WebM Video Recording**: Record and download procedural motion videos right from the browser.
* **Live Veo API Integration**: Connects to `gemini-omni-1.1-flash` via the server backend.

### 2. 🤖 Auto Pipeline: Article-to-Video Engine (`ttv`)
* **Integrated Engine (`free-content-pipeline`)**:
  * Reads **WordPress posts** or direct **Markdown/text** articles.
  * Turns articles into high-retention videos for **YouTube (16:9)** and **Shorts / TikTok / Reels (9:16)**.
  * Multi-language support: **English, French, Spanish, and Arabic (with RTL text shaping)**.
  * Hook in the first 3 seconds, short spoken sentences, photographic AI visual prompts per scene, and CTA linking back to your website.
  * Generates `publish.txt` with title, YouTube description, hashtags, and TikTok/Instagram captions.
  * Generates subtitle files (`.srt`), thumbnails, and video assets.
* **Pipeline Web Studio**: Ingest articles via URL or Markdown, customize brand/site, and generate scripts with 1 click.
* **Pipeline Doctor**: Built-in environment diagnostic for FFmpeg, Python, Arabic fonts, and voice services.

### 3. 🪄 AI Cinematographer Prompt Director
* Powered by `gemini-3.8-flash` in the free tier.
* Enhances basic concepts into production-grade prompts detailing:
  * Camera lens (e.g. 35mm Anamorphic f/1.8 Prime)
  * Camera motion vectors and speed
  * Volumetric lighting & atmospheric haze
  * Color grading (Kodak 5219 emulation, teal-orange split)
  * Soundscape and audio cues
  * Multi-second timeline scene beats

### 4. 🚀 Hostinger VPS & Cloud Deployment Ready
* Complete 1-click automated setup script: `bash scripts/deploy_hostinger_vps.sh`.
* Configures **Node.js 20 LTS**, **Python 3 virtualenv**, **FFmpeg**, **Arabic/Latin fonts**, **PM2 process manager**, **Nginx reverse proxy**, and **SSL certbot**.
* Automated nightly cron job to check WordPress and produce videos on autopilot.

### 5. 📚 Free & Freemium Video APIs Directory
* Verified, filterable comparison matrix of all major video generation APIs:
  * **Google Veo** (`gemini-omni-1.1-flash`)
  * **Hugging Face** (`THUDM/CogVideoX-5b`, `Wan2.1`)
  * **Pollinations.ai** (Free & keyless)
  * **Kling AI** (66 daily points)
  * **Luma Dream Machine** (30 monthly generations)
  * **Runway Gen-3 Alpha** (125 trial credits)
  * **Replicate** (Starter GPU credits on GitHub signup)
* Includes exact step-by-step instructions for getting free access to each service.

### 4. 💻 Multi-Language Code Playground
* Ready-to-copy, working code snippets for:
  * **Google GenAI SDK (Node.js/TypeScript)** using `ai.interactions.create`
  * **Google GenAI SDK (Python)**
  * **Hugging Face Serverless API (cURL & Python)**
  * **Pollinations.ai (HTTP GET)**
  * **cURL REST API**

### 5. 🧱 Prompt Formula & Architecture Guide
* Visual, interactive 4-pillar prompt builder:
  1. Primary Subject & Appearance
  2. Action & Physics Dynamics
  3. Camera Trajectory & Focal Movement
  4. Atmospheric Lighting & Mood
* Assemble complete Hollywood-style prompts and send them straight into the Studio with 1 click.

### 6. 🧮 Cost & Free Credit ROI Calculator
* Interactive sliders to calculate the cost for 1 to 200 videos.
* Shows how many free videos you can generate using your **$300 Google Cloud credit**, **Kling daily points**, or **Hugging Face community queues**.

---

## 🛠️ Tech Stack & Architecture

* **Frontend**:
  * [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
  * [Vite](https://vitejs.dev/) for fast compilation and bundling
  * [Tailwind CSS v4](https://tailwindcss.com/) for modern styling
  * [Lucide React](https://lucide.dev/) icons
  * HTML5 Canvas 2D & Web MediaRecorder API for video synthesis and export
* **Backend**:
  * [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)
  * [`@google/genai` TypeScript SDK](https://www.npmjs.com/package/@google/genai) for Gemini and Veo interactions
  * Server-side proxy architecture protecting API keys

---

## 📁 Project Structure

```text
├── index.html                   # Entry HTML with meta tags and title
├── metadata.json                # AI Studio app metadata
├── package.json                 # Dependencies and npm scripts
├── server.ts                    # Express backend & Vite middleware
├── tsconfig.json                # TypeScript compiler configuration
├── vite.config.ts               # Vite configuration
├── src/
│   ├── main.tsx                 # React DOM root entry
│   ├── App.tsx                  # Main application router and state
│   ├── index.css                # Global styles and Tailwind imports
│   ├── types.ts                 # TypeScript interfaces for video APIs and models
│   ├── data/
│   │   └── videoApis.ts         # Curated catalog of video APIs, presets, and snippets
│   └── components/
│       ├── Header.tsx           # Navigation bar with status pills
│       ├── DirectAnswerBanner.tsx # Answer to "Is there a free video API?"
│       ├── VideoStudio.tsx      # Interactive prompt director & generator
│       ├── CinematicPlayer.tsx  # Canvas motion synthesizer & video player
│       ├── ApiDirectory.tsx     # Filterable video API matrix & code samples
│       ├── PromptGuide.tsx      # Interactive video prompt formula builder
│       └── CostCalculator.tsx   # ROI & credits estimator
```

---

## ⚙️ How to Run & Work With the Project

### Prerequisites
* Node.js 18+ or 20+
* npm or pnpm

### 1. Installation
Clone or open the project folder and install dependencies:
```bash
npm install
```

### 2. Environment Variables
Create or verify your `.env` file in the root directory:
```env
# Gemini API Key (Injected automatically in Google AI Studio)
GEMINI_API_KEY="your-gemini-api-key"

# Host application URL
APP_URL="http://localhost:3000"
```

> **Note on API Keys:** The frontend never touches or exposes the API key. All calls to `@google/genai` happen securely inside `server.ts`.

### 3. Running in Development
Start the full-stack server (runs Express with Vite middlewares on port 3000):
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### 4. Production Build & Start
```bash
# Build the production frontend
npm run build

# Start the full-stack production server
npm start
```

### 5. Type Checking & Linting
```bash
npm run lint
```

---

## 🔌 Backend API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/status` | Returns system status, key presence, and free tier availability. |
| `POST` | `/api/enhance-prompt` | Uses `gemini-3.8-flash` to enrich video prompts with cinematic camera, lighting, and timeline notes. |
| `POST` | `/api/generate-video` | Calls `@google/genai` Interactions API (`gemini-omni-1.1-flash`) with error handling for billing/quota. |
| `GET` | `/api/free-apis` | Returns the directory of free and freemium video APIs with code snippets. |

---

## 💡 Code Examples

### 1. Google Veo (Omni Flash) — Node.js / TypeScript
```typescript
import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const interaction = await ai.interactions.create({
  model: "gemini-omni-1.1-flash",
  input: "Cinematic drone shot soaring over misty pine mountains at sunrise, 4K, 24fps",
  response_format: {
    type: "video",
    aspect_ratio: "16:9",
    duration: "5s",
    resolution: "720p"
  }
}, { timeout: 300000 });

if (interaction.output_video?.data) {
  const buffer = Buffer.from(interaction.output_video.data, "base64");
  fs.writeFileSync("output.mp4", buffer);
  console.log("Saved video to output.mp4");
}
```

### 2. Hugging Face Serverless API (100% Free) — cURL
```bash
curl -X POST "https://api-inference.huggingface.co/models/THUDM/CogVideoX-5b" \
  -H "Authorization: Bearer $HF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inputs": "A cute red panda wearing glasses working on a tiny laptop"}' \
  --output video.mp4
```

### 3. Pollinations.ai (Keyless & Free) — JavaScript
```javascript
const prompt = encodeURIComponent("cyberpunk neon sports car drifting in the rain");
const videoUrl = `https://image.pollinations.ai/prompt/${prompt}?model=video`;

console.log("Free playable video URL:", videoUrl);
```

---

## 📄 License
Apache-2.0 License. Built for developers exploring AI text-to-video generation.
