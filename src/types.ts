export interface VideoApiInfo {
  id: string;
  name: string;
  company: string;
  modelId: string;
  freeTierStatus: string;
  costSummary: string;
  pricing: string;
  resolution: string;
  maxDuration: string;
  hasOfficialApi: boolean;
  sdkLanguage: string;
  keyRequired: boolean;
  badgeType: 'free' | 'trial' | 'freemium' | 'paid';
  freeAccessInstructions: string;
  curlSnippet: string;
  pythonSnippet?: string;
  nodeSnippet?: string;
  webUrl: string;
  features: string[];
}

export interface DirectorEnhancement {
  enhancedPrompt: string;
  negativePrompt?: string;
  directorNotes: {
    cameraMovement: string;
    lens: string;
    lighting: string;
    colorGrading: string;
    soundscape?: string;
  };
  scenes?: Array<{
    time: string;
    description: string;
  }>;
}

export interface GenerationConfig {
  prompt: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  duration: '5s' | '10s';
  resolution: '720p' | '1080p';
  style: string;
  cameraMovement: string;
  lighting: string;
  fps: number;
}
