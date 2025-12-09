

export enum AppStep {
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  SHOWS = 'SHOWS', // Novo passo para gestão de shows
  SETTINGS = 'SETTINGS',
  INPUT = 'INPUT',
  SCRIPTING = 'SCRIPTING',
  GENERATING_IMAGES = 'GENERATING_IMAGES',
  PREVIEW = 'PREVIEW',
  ADMIN = 'ADMIN',
  GUIDES = 'GUIDES'
}

// ...

export interface Show {
  id: string;
  name: string;
  description?: string;
  style_preset?: string;
  visual_prompt?: string;
  default_tts_provider?: TTSProvider;
  created_at: string;
  _count?: {
    episodes: number;
    characters: number;
  }
}

export type WorkflowAction =
  | 'generate_all'
  | 'generate_image'
  | 'generate_all_images'
  | 'regenerate_image'
  | 'generate_audio'
  | 'generate_all_audio'
  | 'regenerate_audio'
  | 'generate_music'
  | 'generate_video'
  | 'regenerate_video'
  | 'cancel'
  | 'pause'
  | 'resume'
  | 'skip_scene';

// Feature Flags
export const IS_SUNO_ENABLED = Boolean(process.env.ENABLE_SUNO);


// Force Demo Login if explicitly set
export const IS_DEMO_LOGIN = (process.env.USE_DEMO_LOGIN as unknown) === true;

export interface ApiKeys {
  gemini?: string; // User specific key
  elevenlabs?: string;
  suno?: string;
  groq?: string;
}

export type Role = 'USER' | 'ADMIN';
export type SubscriptionPlan = 'FREE' | 'PRO';

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  monthly_images_limit: number;
  monthly_videos_limit: number;
  monthly_minutes_tts: number;
  daily_requests_limit: number;
  daily_videos_limit: number;
  features?: any;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  apiKeys: ApiKeys;
  subscriptionPlan?: 'FREE' | 'PRO';
  role?: Role;
  isBlocked?: boolean;
}

export interface SavedCharacter {
  id: string;
  userId: string;
  name: string;
  description?: string;
  images: string[];
  imageUrl?: string; // Legacy support
  createdAt: number;
}

// Aligned with Prisma SceneStatus
export type BackendSceneStatus = 'pending' | 'queued' | 'processing' | 'loading' | 'completed' | 'failed' | 'error';
export type BackendProjectStatus = 'draft' | 'generating' | 'completed' | 'failed' | 'paused' | 'processing' | 'pending';

export interface Scene {
  id?: string; // Backend ID
  sceneNumber: number;
  visualDescription: string;
  narration: string;
  durationSeconds: number;

  // Asset State
  imageUrl?: string;
  imageStatus: BackendSceneStatus;

  audioUrl?: string;
  audioStatus: BackendSceneStatus;

  // SFX State
  sfxUrl?: string;
  sfxStatus: BackendSceneStatus;

  // Video State (Veo 2)
  videoUrl?: string;
  videoStatus: BackendSceneStatus;
  mediaType?: string;

  // Orchestration Metadata
  imageAttempts?: number;
  audioAttempts?: number;
  errorMessage?: string;
  wordTimings?: { word: string; start: number; end: number }[];
  characters?: SavedCharacter[];
}

export type TTSProvider = 'gemini' | 'elevenlabs' | 'groq';

export interface ReferenceCharacter {
  id?: string; // Added ID for backend reference
  name: string;
  description?: string;
  images: string[];
}

export interface VideoProject {
  id: string;
  userId: string;
  createdAt: number;
  topic: string;
  style: string;

  // Voice Settings
  voiceName: string;
  ttsProvider: TTSProvider;
  audioModel?: string;
  videoModel?: string;

  language: string;

  // New Character Structure
  referenceCharacters?: ReferenceCharacter[];
  projectCharacters?: SavedCharacter[]; // Full character objects from DB

  // Legacy fields
  referenceCharacter?: ReferenceCharacter;
  referenceImageUrl?: string;
  characterIds?: string[]; // IDs for backend mapping

  scenes: Scene[];

  // Metadata
  generatedTitle?: string;
  generatedDescription?: string;

  // Configuration Metadata
  durationConfig?: {
    min: number;
    max: number;
    targetScenes?: number;
  };

  // Orchestration Status
  status?: BackendProjectStatus;
  currentGenerationIndex?: number; // Pointer to resume from

  // Music Fields
  includeMusic?: boolean;
  bgMusicPrompt?: string;
  bgMusicUrl?: string;
  bgMusicStatus?: 'pending' | 'queued' | 'loading' | 'completed' | 'failed' | 'error';

  // Organization
  folderId?: string | null;
  isArchived?: boolean;
  tags?: string[];
}

export interface Folder {
  id: string;
  name: string;
  userId: string;
  parent_id?: string | null;  // Matches backend field
  createdAt: string;
  updatedAt: string;
  _count?: {
    projects: number;
    children?: number; // Optional child folder count
  };
}

export interface UsageLog {
  id: string;
  userId: string;
  projectId?: string;
  actionType: 'GENERATE_SCRIPT' | 'GENERATE_IMAGE' | 'GENERATE_TTS' | 'GENERATE_MUSIC';
  provider: string;
  modelName: string;
  tokensInput?: number;
  tokensOutput?: number;
  durationSeconds?: number;
  status: 'success' | 'failed';
  errorMessage?: string;
  timestamp: number;
  idempotencyKey?: string;
}

export const VIDEO_STYLES = [
  "Realistic Cinematic",
  "3D Animation Pixar Style",
  "Cyberpunk Neon",
  "Watercolor Painting",
  "Retro 80s Anime",
  "Minimalist Vector",
  "Dark Fantasy"
];

export interface Voice {
  name: string; // API name or ID
  label: string; // UI Label
  gender: 'Male' | 'Female';
  description: string;
  provider: TTSProvider;
  previewUrl?: string;
  labels?: any;
  language?: string; // Primary language
  supportedLanguages?: string[]; // List of supported language codes
}

export const AVAILABLE_VOICES: Voice[] = [
  { name: 'Kore', label: 'Kore', gender: 'Female', description: 'Calm, soothing, nature documentary style.', provider: 'gemini', supportedLanguages: ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'ja', 'ko'] },
  { name: 'Zephyr', label: 'Zephyr', gender: 'Female', description: 'Energetic, polished, news anchor style.', provider: 'gemini', supportedLanguages: ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'ja', 'ko'] },
  { name: 'Puck', label: 'Puck', gender: 'Male', description: 'Soft, slightly British, storytelling style.', provider: 'gemini', supportedLanguages: ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'ja', 'ko'] },
  { name: 'Charon', label: 'Charon', gender: 'Male', description: 'Deep, authoritative, movie trailer style.', provider: 'gemini', supportedLanguages: ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'ja', 'ko'] },
  { name: 'Fenrir', label: 'Fenrir', gender: 'Male', description: 'Intense, fast-paced, gaming/tech style.', provider: 'gemini', supportedLanguages: ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'ja', 'ko'] },
];

// ID mapping for ElevenLabs
export const ELEVEN_LABS_VOICES: Voice[] = [
  {
    name: '21m00Tcm4TlvDq8ikWAM',
    label: 'Rachel',
    gender: 'Female',
    description: 'American, calm, narration.',
    provider: 'elevenlabs',
    labels: { accent: 'american', gender: 'female' },
    previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/21m00Tcm4TlvDq8ikWAM/6945037e-6169-4505-b3eb-5110df5c6351.mp3',
    supportedLanguages: ['en']
  },
  {
    name: 'AZnzlk1XvdvUeBnXmlld',
    label: 'Domi',
    gender: 'Female',
    description: 'Strong, emphatic, storytelling.',
    provider: 'elevenlabs',
    labels: { accent: 'american', gender: 'female' },
    previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/AZnzlk1XvdvUeBnXmlld/50381567-ff7b-4d48-9617-147b38c20352.mp3',
    supportedLanguages: ['en']
  },
  {
    name: 'ErXwobaYiN019PkySvjV',
    label: 'Antoni',
    gender: 'Male',
    description: 'American, well-rounded, narration.',
    provider: 'elevenlabs',
    labels: { accent: 'american', gender: 'male' },
    previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/ErXwobaYiN019PkySvjV/38d60155-3883-49d7-9e7b-ebf4236b281b.mp3',
    supportedLanguages: ['en']
  },
  {
    name: 'TxGEqnHWrfWFTfGW9XjX',
    label: 'Josh',
    gender: 'Male',
    description: 'Deep, resonant, warm.',
    provider: 'elevenlabs',
    labels: { accent: 'american', gender: 'male' },
    previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/TxGEqnHWrfWFTfGW9XjX/44f506e7-0335-46f9-9524-814d9b62788d.mp3',
    supportedLanguages: ['en']
  },
  {
    name: 'ODq5zmih8GrVes37Dizj',
    label: 'Patrick',
    gender: 'Male',
    description: 'Punchy, energetic, movie trailer.',
    provider: 'elevenlabs',
    labels: { accent: 'american', gender: 'male' },
    previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/ODq5zmih8GrVes37Dizj/07545b77-3e1b-4020-ac3b-00772714a84d.mp3',
    supportedLanguages: ['en']
  },
];

export const GROQ_VOICES: Voice[] = [
  { name: 'Arista-PlayAI', label: 'Arista', gender: 'Female', description: 'Groq PlayAI Voice', provider: 'groq', supportedLanguages: ['en'] },
  { name: 'Atlas-PlayAI', label: 'Atlas', gender: 'Male', description: 'Groq PlayAI Voice', provider: 'groq', supportedLanguages: ['en'] },
  { name: 'Basil-PlayAI', label: 'Basil', gender: 'Male', description: 'Groq PlayAI Voice', provider: 'groq', supportedLanguages: ['en'] },
  { name: 'Briggs-PlayAI', label: 'Briggs', gender: 'Male', description: 'Groq PlayAI Voice', provider: 'groq', supportedLanguages: ['en'] },
  { name: 'Calum-PlayAI', label: 'Calum', gender: 'Male', description: 'Groq PlayAI Voice', provider: 'groq', supportedLanguages: ['en'] },
  { name: 'Celeste-PlayAI', label: 'Celeste', gender: 'Female', description: 'Groq PlayAI Voice', provider: 'groq', supportedLanguages: ['en'] },
  { name: 'Cheyenne-PlayAI', label: 'Cheyenne', gender: 'Female', description: 'Groq PlayAI Voice', provider: 'groq', supportedLanguages: ['en'] },
  { name: 'Chip-PlayAI', label: 'Chip', gender: 'Male', description: 'Groq PlayAI Voice', provider: 'groq', supportedLanguages: ['en'] },
  { name: 'Cillian-PlayAI', label: 'Cillian', gender: 'Male', description: 'Groq PlayAI Voice', provider: 'groq', supportedLanguages: ['en'] },
  { name: 'Deedee-PlayAI', label: 'Deedee', gender: 'Female', description: 'Groq PlayAI Voice', provider: 'groq', supportedLanguages: ['en'] },
  { name: 'Fritz-PlayAI', label: 'Fritz', gender: 'Male', description: 'Groq PlayAI Voice', provider: 'groq', supportedLanguages: ['en'] },
  { name: 'Gail-PlayAI', label: 'Gail', gender: 'Female', description: 'Groq PlayAI Voice', provider: 'groq', supportedLanguages: ['en'] },
  { name: 'Indigo-PlayAI', label: 'Indigo', gender: 'Female', description: 'Groq PlayAI Voice', provider: 'groq', supportedLanguages: ['en'] },
  { name: 'Mamaw-PlayAI', label: 'Mamaw', gender: 'Female', description: 'Groq PlayAI Voice', provider: 'groq', supportedLanguages: ['en'] },
  { name: 'Mason-PlayAI', label: 'Mason', gender: 'Male', description: 'Groq PlayAI Voice', provider: 'groq', supportedLanguages: ['en'] },
  { name: 'Mikail-PlayAI', label: 'Mikail', gender: 'Male', description: 'Groq PlayAI Voice', provider: 'groq', supportedLanguages: ['en'] },
  { name: 'Mitch-PlayAI', label: 'Mitch', gender: 'Male', description: 'Groq PlayAI Voice', provider: 'groq', supportedLanguages: ['en'] },
  { name: 'Quinn-PlayAI', label: 'Quinn', gender: 'Female', description: 'Groq PlayAI Voice', provider: 'groq', supportedLanguages: ['en'] },
  { name: 'Thunder-PlayAI', label: 'Thunder', gender: 'Male', description: 'Groq PlayAI Voice', provider: 'groq', supportedLanguages: ['en'] },
];

export const AVAILABLE_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
];
