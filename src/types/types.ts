
/// <reference types="vite/client" />

export enum AppStep {
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  SETTINGS = 'SETTINGS',
  INPUT = 'INPUT',
  SCRIPTING = 'SCRIPTING',
  GENERATING_IMAGES = 'GENERATING_IMAGES',
  PREVIEW = 'PREVIEW'
}

// Feature Flag
export const IS_SUNO_ENABLED = Boolean(import.meta.env.VITE_ENABLE_SUNO);

export interface ApiKeys {
  gemini?: string;
  elevenlabs?: string;
  suno?: string;
  groq?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  apiKeys: ApiKeys;
}

export interface SavedCharacter {
  id: string;
  userId: string;
  name: string;
  description?: string; // New: Optional text description for better consistency
  images: string[]; // Array of Base64 strings
  imageUrl?: string; // Legacy support
  createdAt: number;
}

export interface Scene {
  sceneNumber: number;
  visualDescription: string;
  narration: string;
  durationSeconds: number;
  imageUrl?: string; // Base64 or URL
  imageStatus: 'pending' | 'loading' | 'completed' | 'error';
  audioUrl?: string; // Blob URL for WAV
  audioStatus: 'pending' | 'loading' | 'completed' | 'error';
  videoStatus: 'pending' | 'loading' | 'completed' | 'error';
  effectConfig?: import('../utils/video-effects/canvasEffects').EffectConfig;
}

export type TTSProvider = 'gemini' | 'elevenlabs';

export interface ReferenceCharacter {
  name: string;
  description?: string; // New
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

  language: string;

  // New Character Structure
  referenceCharacters?: ReferenceCharacter[];

  // Legacy fields
  referenceCharacter?: ReferenceCharacter;
  referenceImageUrl?: string;

  scenes: Scene[];

  // Metadata (New)
  generatedTitle?: string;
  generatedDescription?: string;

  // Music Fields
  includeMusic?: boolean;
  bgMusicPrompt?: string;
  bgMusicUrl?: string;
  bgMusicVolume?: number;
  bgMusicConfig?: {
    volume?: number;
    loop?: boolean;
    // Add other config options here as needed
  };
  bgMusicStatus?: 'pending' | 'loading' | 'completed' | 'error';
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
  previewUrl?: string; // Static URL for previewing without API cost
  labels?: any; // Metadata from provider
}

export const AVAILABLE_VOICES: Voice[] = [
  { name: 'Kore', label: 'Kore', gender: 'Female', description: 'Calm, soothing, nature documentary style.', provider: 'gemini' },
  { name: 'Zephyr', label: 'Zephyr', gender: 'Female', description: 'Energetic, polished, news anchor style.', provider: 'gemini' },
  { name: 'Puck', label: 'Puck', gender: 'Male', description: 'Soft, slightly British, storytelling style.', provider: 'gemini' },
  { name: 'Charon', label: 'Charon', gender: 'Male', description: 'Deep, authoritative, movie trailer style.', provider: 'gemini' },
  { name: 'Fenrir', label: 'Fenrir', gender: 'Male', description: 'Intense, fast-paced, gaming/tech style.', provider: 'gemini' },
];

// ID mapping for ElevenLabs (using standard pre-made voices)
export const ELEVEN_LABS_VOICES: Voice[] = [
  {
    name: '21m00Tcm4TlvDq8ikWAM',
    label: 'Rachel',
    gender: 'Female',
    description: 'American, calm, narration.',
    provider: 'elevenlabs',
    labels: { accent: 'american', gender: 'female' },
    previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/21m00Tcm4TlvDq8ikWAM/6945037e-6169-4505-b3eb-5110df5c6351.mp3'
  },
  {
    name: 'AZnzlk1XvdvUeBnXmlld',
    label: 'Domi',
    gender: 'Female',
    description: 'Strong, emphatic, storytelling.',
    provider: 'elevenlabs',
    labels: { accent: 'american', gender: 'female' },
    previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/AZnzlk1XvdvUeBnXmlld/50381567-ff7b-4d48-9617-147b38c20352.mp3'
  },
  {
    name: 'ErXwobaYiN019PkySvjV',
    label: 'Antoni',
    gender: 'Male',
    description: 'American, well-rounded, narration.',
    provider: 'elevenlabs',
    labels: { accent: 'american', gender: 'male' },
    previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/ErXwobaYiN019PkySvjV/38d60155-3883-49d7-9e7b-ebf4236b281b.mp3'
  },
  {
    name: 'TxGEqnHWrfWFTfGW9XjX',
    label: 'Josh',
    gender: 'Male',
    description: 'Deep, resonant, warm.',
    provider: 'elevenlabs',
    labels: { accent: 'american', gender: 'male' },
    previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/TxGEqnHWrfWFTfGW9XjX/44f506e7-0335-46f9-9524-814d9b62788d.mp3'
  },
  {
    name: 'ODq5zmih8GrVes37Dizj',
    label: 'Patrick',
    gender: 'Male',
    description: 'Punchy, energetic, movie trailer.',
    provider: 'elevenlabs',
    labels: { accent: 'american', gender: 'male' },
    previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/ODq5zmih8GrVes37Dizj/07545b77-3e1b-4020-ac3b-00772714a84d.mp3'
  },
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
