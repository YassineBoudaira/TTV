import { VideoApiInfo } from '../types';

export const VIDEO_APIS: VideoApiInfo[] = [
  {
    id: 'google-veo',
    name: 'Google Veo (Gemini Omni Flash)',
    company: 'Google DeepMind',
    modelId: 'gemini-omni-1.1-flash',
    freeTierStatus: '$300 Free GCP Trial Credits',
    badgeType: 'trial',
    costSummary: 'Requires paid key or $300 new-user Cloud credits',
    pricing: '~$0.05 - $0.15 / generation (metered compute)',
    resolution: 'Up to 4K / 1080p / 720p',
    maxDuration: '5s or 10s per shot (extendable)',
    hasOfficialApi: true,
    sdkLanguage: 'TypeScript (@google/genai) / Python / REST',
    keyRequired: true,
    features: ['High temporal consistency', 'Realistic cinematic physics', 'Multi-turn editing', 'Storyboarding reference images'],
    freeAccessInstructions: 'Google Cloud gives all new accounts $300 in free trial credits valid for 90 days. You can create an AI Studio API key linked to that billing account and use Veo without paying out-of-pocket.',
    webUrl: 'https://aistudio.google.com/',
    curlSnippet: `curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \\
  -H "Content-Type: application/json" \\
  -H "x-goog-api-key: $GEMINI_API_KEY" \\
  -d '{
    "model": "gemini-omni-1.1-flash",
    "input": "A cinematic shot of a glowing futuristic train speeding through a misty pine forest at twilight",
    "response_format": {
      "type": "video",
      "aspect_ratio": "16:9",
      "duration": "5s",
      "resolution": "720p"
    }
  }'`,
    pythonSnippet: `from google import genai

client = genai.Client()
interaction = client.interactions.create(
    model="gemini-omni-1.1-flash",
    input="A cinematic drone shot through misty pine mountains at sunrise",
    response_format={
        "type": "video",
        "aspect_ratio": "16:9",
        "duration": "5s",
        "resolution": "720p"
    }
)

video_bytes = interaction.output_video.data
with open("cinematic.mp4", "wb") as f:
    f.write(video_bytes)
print("Video saved successfully!")`,
    nodeSnippet: `import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const interaction = await ai.interactions.create({
  model: "gemini-omni-1.1-flash",
  input: "A cinematic drone shot over turquoise ocean waters crashing on black volcanic cliffs",
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
  console.log("Generated video saved to output.mp4");
}`,
  },
  {
    id: 'huggingface-cogvideo',
    name: 'Hugging Face Inference (CogVideoX & Wan2.1)',
    company: 'THUDM / Alibaba Wan / Hugging Face',
    modelId: 'THUDM/CogVideoX-5b',
    freeTierStatus: '100% Free Community Tier',
    badgeType: 'free',
    costSummary: 'Completely free Serverless Inference API (Zero credit card required)',
    pricing: 'Free with rate limits on shared community GPUs',
    resolution: '720p / 480p',
    maxDuration: '6 seconds',
    hasOfficialApi: true,
    sdkLanguage: 'Python (huggingface_hub) / cURL / JS',
    keyRequired: true, // Free token
    features: ['100% Open Weights', 'Free serverless access', 'Local run option', 'Text-to-video & image-to-video'],
    freeAccessInstructions: 'Go to huggingface.co, create a free account, navigate to Settings > Access Tokens, and generate a free Read token. You can immediately call the CogVideoX or Wan2.1 endpoints.',
    webUrl: 'https://huggingface.co/THUDM/CogVideoX-5b',
    curlSnippet: `curl -X POST "https://api-inference.huggingface.co/models/THUDM/CogVideoX-5b" \\
  -H "Authorization: Bearer $HF_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"inputs": "A cyberpunk astronaut gazing at a celestial nebula from a glass balcony"}' \\
  --output nebula.mp4`,
    pythonSnippet: `import requests

API_URL = "https://api-inference.huggingface.co/models/THUDM/CogVideoX-5b"
headers = {"Authorization": f"Bearer {HF_TOKEN}"}

response = requests.post(API_URL, headers=headers, json={
    "inputs": "An origami paper crane flying through a vibrant cherry blossom festival"
})

with open("paper_crane.mp4", "wb") as f:
    f.write(response.content)
print("Saved video from Hugging Face!")`,
    nodeSnippet: `import fetch from 'node-fetch';
import fs from 'fs';

const response = await fetch("https://api-inference.huggingface.co/models/THUDM/CogVideoX-5b", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${process.env.HF_TOKEN}\`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ inputs: "Neon city rain reflection at midnight" })
});

const arrayBuffer = await response.arrayBuffer();
fs.writeFileSync("output.mp4", Buffer.from(arrayBuffer));`,
  },
  {
    id: 'pollinations',
    name: 'Pollinations.ai Free Community API',
    company: 'Pollinations AI Community',
    modelId: 'pollinations-video',
    freeTierStatus: '100% Free & No API Key Needed',
    badgeType: 'free',
    costSummary: 'Keyless, open community generative endpoints',
    pricing: 'Completely free',
    resolution: '512x512 / 768x432',
    maxDuration: '3 - 5 seconds',
    hasOfficialApi: true,
    sdkLanguage: 'Direct HTTP GET / Web Fetch',
    keyRequired: false,
    features: ['Zero registration', 'No API key needed', 'Instant URL generation', 'Ideal for prototypes & hacks'],
    freeAccessInstructions: 'No signup, no keys, no credit cards required. You can make HTTP GET requests directly to their public URL endpoints or embed them directly in HTML/React apps.',
    webUrl: 'https://pollinations.ai/',
    curlSnippet: `curl -L "https://image.pollinations.ai/prompt/cyberpunk%20car%20racing%20through%20neon%20city?model=video" \\
  --output video.mp4`,
    pythonSnippet: `import urllib.request

prompt = "majestic eagle gliding over snow capped peaks"
encoded_prompt = urllib.parse.quote(prompt)
url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?model=video"

urllib.request.urlretrieve(url, "free_video.mp4")
print("Downloaded free video without API key!")`,
    nodeSnippet: `// Direct URL can be used in an HTML video tag or downloaded
const videoUrl = "https://image.pollinations.ai/prompt/" + 
  encodeURIComponent("golden retriever playing with a glowing butterfly") + 
  "?model=video";

console.log("Free direct video URL:", videoUrl);`,
  },
  {
    id: 'kling-ai',
    name: 'Kling AI (Kuaishou)',
    company: 'Kuaishou Technology',
    modelId: 'kling-v1.5-pro',
    freeTierStatus: '66 Daily Free Credits',
    badgeType: 'freemium',
    costSummary: '66 free points refreshed every single day in the web app',
    pricing: 'Free daily credits; paid plans from $10/mo',
    resolution: '1080p, 30fps realistic physics simulation',
    maxDuration: '5s (extendable to 10s)',
    hasOfficialApi: true,
    sdkLanguage: 'REST / Open API',
    keyRequired: true,
    features: ['Realistic physical motion', 'Complex human body dynamics', 'Lip sync audio', 'Camera control pathing'],
    freeAccessInstructions: 'Create an account on klingai.com. Every day at 00:00 UTC, your account gets 66 free points (enough for ~6 videos daily without paying).',
    webUrl: 'https://klingai.com/',
    curlSnippet: `curl -X POST "https://api.klingai.com/v1/videos/text2video" \\
  -H "Authorization: Bearer $KLING_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "kling-v1",
    "prompt": "Hyper-realistic slow motion drop of liquid glass shattering into light",
    "aspect_ratio": "16:9",
    "duration": 5
  }'`,
  },
  {
    id: 'luma-dream-machine',
    name: 'Luma Dream Machine',
    company: 'Luma AI',
    modelId: 'dream-machine-1.5',
    freeTierStatus: '30 Free Web Generations / Month',
    badgeType: 'freemium',
    costSummary: '30 free monthly video generations via website, metered developer API',
    pricing: 'Free monthly web tier; API is ~$0.003 - $0.05/sec',
    resolution: '1080p with camera path controls',
    maxDuration: '5s shots with seamless looping',
    hasOfficialApi: true,
    sdkLanguage: 'Python / TypeScript',
    keyRequired: true,
    features: ['Camera path movements', 'Character consistency', 'High motion dynamic range', 'Loop mode'],
    freeAccessInstructions: 'Sign in at lumalabs.ai using Google. You get 30 free video generations every month in the web studio.',
    webUrl: 'https://lumalabs.ai/dream-machine',
    curlSnippet: `curl -X POST "https://api.lumalabs.ai/dream-machine/v1/generations" \\
  -H "Authorization: Bearer $LUMA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "A futuristic submarine navigating through an underwater crystal trench",
    "aspect_ratio": "16:9",
    "loop": true
  }'`,
  },
  {
    id: 'runway-gen3',
    name: 'Runway Gen-3 Alpha & Gen-2',
    company: 'RunwayML',
    modelId: 'gen3a_turbo',
    freeTierStatus: '125 Free Starter Credits',
    badgeType: 'trial',
    costSummary: '125 free credits upon registration (approx 25s of video)',
    pricing: '5 credits per second ($0.05/sec) or subscription',
    resolution: '1080p, 720p',
    maxDuration: '5s or 10s',
    hasOfficialApi: true,
    sdkLanguage: 'Python (runwayml) / REST',
    keyRequired: true,
    features: ['Industry standard VFX', 'Director mode camera controls', 'Motion brush', 'Lip sync'],
    freeAccessInstructions: 'Sign up for a free account at runwayml.com to get 125 free one-time credits to test video generation.',
    webUrl: 'https://runwayml.com/',
    curlSnippet: `curl -X POST "https://api.dev.runwayml.com/v1/tasks" \\
  -H "Authorization: Bearer $RUNWAY_API_KEY" \\
  -H "X-Runway-Version: 2024-09-13" \\
  -H "Content-Type: application/json" \\
  -d '{
    "taskType": "gen3a_turbo",
    "promptText": "Cinematic wide angle shot of a solitary lighthouse surrounded by crashing storm waves at midnight"
  }'`,
  },
  {
    id: 'replicate',
    name: 'Replicate (Open-Sora, Wan2.1, AnimateDiff)',
    company: 'Replicate Inc',
    modelId: 'wan-video / open-sora',
    freeTierStatus: 'Free Trial Compute with GitHub',
    badgeType: 'trial',
    costSummary: 'Free trial credits given on sign up, pay per GPU second',
    pricing: '~$0.00055/sec on Nvidia T4, ~$0.0014/sec on A40',
    resolution: '480p, 720p, 1080p',
    maxDuration: '4 - 10s',
    hasOfficialApi: true,
    sdkLanguage: 'Python (replicate) / Node.js / cURL',
    keyRequired: true,
    features: ['Dozens of open-source video models', 'Run your own fine-tunes', 'Serverless autoscaling', 'Fast webhooks'],
    freeAccessInstructions: 'Sign up using a GitHub account on replicate.com to receive initial credit balance to run models.',
    webUrl: 'https://replicate.com/',
    curlSnippet: `curl -X POST "https://api.replicate.com/v1/predictions" \\
  -H "Authorization: Bearer $REPLICATE_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "version": "a42421f1e73797c729c1c5e6fbc3a19b22a0fc0298a287c8d92994e43e5c7075",
    "input": {
      "prompt": "An astronaut walking in a bioluminescent jungle with glowing alien flowers"
    }
  }'`,
  },
];

export const PROMPT_PRESETS = [
  {
    title: 'Cyberpunk Tokyo Drift',
    prompt: 'A sleek matte-black sports car with glowing turquoise underglow drifting around a tight neon-soaked corner in Shinjuku during heavy rain, water splashing off camera lens, 8k cinematic lighting, 35mm anamorphic.',
    style: 'Cyberpunk',
    camera: 'Tracking Shot',
    duration: '5s' as const,
  },
  {
    title: 'Bioluminescent Alien Forest',
    prompt: 'An astronaut in a golden reflective visor walking slowly through a dense bioluminescent jungle on Kepler-452b, glowing spore particles gently floating in zero gravity, soft atmospheric volumetric fog.',
    style: 'Sci-Fi Cinematic',
    camera: 'Dolly In',
    duration: '5s' as const,
  },
  {
    title: 'Origami Crane Flight',
    prompt: 'A delicate white paper origami crane coming to life, gently flapping its wings and flying through a blossoming Kyoto zen garden with cherry petals drifting on the wind, sunbeams filtering through leaves.',
    style: 'Anime / Ghibli',
    camera: 'Orbit 360',
    duration: '5s' as const,
  },
  {
    title: 'Macro Mechanical Dragonfly',
    prompt: 'Extreme macro close-up of an intricate steampunk mechanical dragonfly perched on a dewy emerald leaf, clockwork brass gears spinning inside transparent wings, morning light refractions.',
    style: 'Hyper-Realistic',
    camera: 'Macro Zoom',
    duration: '5s' as const,
  },
];
