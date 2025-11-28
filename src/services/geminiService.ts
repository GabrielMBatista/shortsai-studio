
import { Scene, ReferenceCharacter } from "../types";
import { getCurrentUser } from "./storageService";

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

const getHeaders = () => {
  return {
    'Content-Type': 'application/json'
  };
};

export const generateScript = async (
  topic: string,
  style: string,
  language: string = 'English',
  config: { minDuration: number; maxDuration: number; targetScenes?: number } = { minDuration: 55, maxDuration: 65 }
): Promise<{ scenes: Scene[]; metadata: { title: string; description: string; } }> => {
  const user = getCurrentUser();
  if (!user) throw new Error("User not authenticated");

  const response = await fetch(`${API_URL}/api/ai/generate-script`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      userId: user.id,
      topic,
      style,
      language,
      durationConfig: { min: config.minDuration, max: config.maxDuration, targetScenes: config.targetScenes },
      apiKeys: user.apiKeys
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Script generation failed");
  }

  const data = await response.json();

  // Backend now guarantees standardized camelCase format
  return {
    scenes: data.scenes,
    metadata: {
      title: data.videoTitle,
      description: data.videoDescription
    }
  };
};

export const generateMusicPrompt = async (topic: string, style: string): Promise<string> => {
  const user = getCurrentUser();
  if (!user) throw new Error("User not authenticated");

  const response = await fetch(`${API_URL}/api/ai/generate-music-prompt`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      userId: user.id,
      topic,
      style,
      apiKeys: user.apiKeys
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Music prompt generation failed");
  }

  const data = await response.json();
  return data.prompt;
};

export const analyzeCharacterFeatures = async (base64Image: string): Promise<string> => {
  const user = getCurrentUser();
  if (!user) throw new Error("User not authenticated");

  const response = await fetch(`${API_URL}/api/ai/analyze-character`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      userId: user.id,
      image: base64Image,
      apiKeys: user.apiKeys
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Character analysis failed");
  }

  const data = await response.json();
  return data.result;
};

export const optimizeReferenceImage = async (base64ImageUrl: string): Promise<string> => {
  const user = getCurrentUser();
  if (!user) throw new Error("User not authenticated");

  const response = await fetch(`${API_URL}/api/ai/optimize-image`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      userId: user.id,
      image: base64ImageUrl,
      apiKeys: user.apiKeys
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Image optimization failed");
  }

  const data = await response.json();
  return data.result;
};

export const generatePreviewAudio = async (text: string, voice: string, provider: 'gemini' | 'elevenlabs' | 'groq' = 'gemini'): Promise<string> => {
  const user = getCurrentUser();
  if (!user) throw new Error("User not authenticated");

  const response = await fetch(`${API_URL}/api/ai/generate-audio`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      userId: user.id,
      text,
      voice,
      provider,
      apiKeys: user.apiKeys
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Audio generation failed");
  }

  const data = await response.json();
  return data.audioUrl;
};

export const getVoices = async (): Promise<any[]> => {
  const user = getCurrentUser();
  if (!user) return [];

  const response = await fetch(`${API_URL}/api/ai/voices`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      apiKeys: user.apiKeys
    })
  });

  if (!response.ok) {
    console.warn("Failed to fetch voices");
    return [];
  }

  const data = await response.json();
  return data.voices;
};
