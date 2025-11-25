
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Scene, ReferenceCharacter } from "../types";
import { getCurrentUser } from "./storageService";
import { trackUsage } from "./quotaService";

// Helper to get AI instance
const getAI = () => {
  const user = getCurrentUser();
  // Prioritize user's key, fallback to env variable
  const apiKey = user?.apiKeys?.gemini || process.env.API_KEY;
  
  if (!apiKey) {
      throw new Error("Gemini API Key is missing. Please add it in Settings.");
  }

  return new GoogleGenAI({ apiKey });
};

// --- QUEUE SYSTEM (Concurrency Control) ---
class RequestQueue {
    private queue: (() => Promise<void>)[] = [];
    private running = 0;
    private maxConcurrent = 3; 

    async add<T>(task: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            const wrapper = async () => {
                try {
                    const result = await task();
                    resolve(result);
                } catch (e) {
                    reject(e);
                } finally {
                    this.running--;
                    this.processNext();
                }
            };
            this.queue.push(wrapper);
            this.processNext();
        });
    }

    private processNext() {
        if (this.running < this.maxConcurrent && this.queue.length > 0) {
            this.running++;
            const next = this.queue.shift();
            if (next) next();
        }
    }
}

const generationQueue = new RequestQueue();

// --- RETRY LOGIC ---
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryWithBackoff<T>(
  fn: () => Promise<T>, 
  retries = 3,
  baseDelay = 2000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = 
      error?.status === 429 || 
      error?.status === 503 || 
      (error?.message && error.message.includes("429")) ||
      (error?.message && error.message.includes("RESOURCE_EXHAUSTED"));

    if (retries > 0 && isQuotaError) {
      console.warn(`Quota hit (429). Retrying in ${baseDelay}ms... (${retries} retries left)`);
      await wait(baseDelay);
      return retryWithBackoff(fn, retries - 1, baseDelay * 2);
    }
    throw error;
  }
}

// --- AUDIO HELPERS ---

// Convert Base64 string to Uint8Array
const base64ToUint8Array = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Convert Uint8Array to Base64 string
const uint8ArrayToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Create WAV File (Header + PCM) and return as Base64 Data URI
// This is crucial for saving to DB (Blob URLs die on refresh)
const createWavDataUri = (base64Pcm: string): string => {
  const pcmBytes = base64ToUint8Array(base64Pcm);
  const len = pcmBytes.length;
  
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + len, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, 24000, true); // 24kHz
  view.setUint32(28, 24000 * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, len, true);

  // Concatenate Header and PCM
  const headerBytes = new Uint8Array(wavHeader);
  const wavBytes = new Uint8Array(headerBytes.length + pcmBytes.length);
  wavBytes.set(headerBytes, 0);
  wavBytes.set(pcmBytes, headerBytes.length);

  return `data:audio/wav;base64,${uint8ArrayToBase64(wavBytes)}`;
};

export const getAudioDuration = (audioUrl: string): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio(audioUrl);
    audio.onloadedmetadata = () => {
      if (audio.duration === Infinity || isNaN(audio.duration)) {
         resolve(0); 
      } else {
        resolve(audio.duration);
      }
    };
    audio.onerror = () => resolve(0);
  });
};

interface StyleConfig {
  role: string;
}

interface ScriptResponse {
    scenes: Scene[];
    metadata: { title: string; description: string; }
}

const cleanJson = (text: string) => {
    // 1. Remove markdown code blocks
    let clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // 2. Find the JSON array or object
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        clean = clean.substring(firstBrace, lastBrace + 1);
    }
    
    return clean.trim();
};

export const generateScript = async (topic: string, style: string, language: string = 'English'): Promise<ScriptResponse> => {
  const ai = getAI();
  
  const prompt = `
  You are an expert viral video director.
  Create a script for a 60-second vertical short video about: "${topic}".
  Style: "${style}". Language: "${language}".
  
  Output ONLY valid JSON. No markdown, no conversation.
  Structure:
  {
    "videoTitle": "Viral Title",
    "videoDescription": "Description with hashtags",
    "scenes": [
       { "sceneNumber": 1, "visualDescription": "Detailed visual prompt for AI image generator", "narration": "Voiceover text", "durationSeconds": 5 }
    ]
  }
  Ensure exactly 6 scenes.
  `;

  return generationQueue.add(() => retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            videoTitle: { type: Type.STRING },
            videoDescription: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sceneNumber: { type: Type.INTEGER },
                  visualDescription: { type: Type.STRING },
                  narration: { type: Type.STRING },
                  durationSeconds: { type: Type.INTEGER }
                },
                required: ["sceneNumber", "visualDescription", "narration", "durationSeconds"]
              }
            }
          },
          required: ["videoTitle", "videoDescription", "scenes"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No script generated");
    
    trackUsage('gemini-2.5-flash', 1);

    const cleanedText = cleanJson(text);
    
    try {
        const rawData = JSON.parse(cleanedText);
        const scenes = rawData.scenes.map((s: any) => ({
          ...s,
          imageStatus: 'pending',
          audioStatus: 'pending'
        }));

        return {
            scenes,
            metadata: {
                title: rawData.videoTitle || topic,
                description: rawData.videoDescription || `#shorts ${topic}`
            }
        };
    } catch (e) {
        console.error("JSON Parse Error", cleanedText);
        throw new Error("Failed to parse script format. Please try again.");
    }
  }));
};

export const generateMusicPrompt = async (topic: string, style: string): Promise<string> => {
  const ai = getAI();
  const prompt = `Create a text-to-audio prompt for Suno AI. Topic: "${topic}". Style: "${style}". Output: Max 25 words, include "instrumental, no vocals".`;

  return generationQueue.add(() => retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
    });
    trackUsage('gemini-2.5-flash', 1);
    return response.text?.trim() || "cinematic instrumental background music";
  }));
};

export const analyzeCharacterFeatures = async (base64Image: string): Promise<string> => {
  const ai = getAI();
  const base64Data = base64Image.split(',')[1];
  const prompt = `Analyze this character portrait. Describe the FACE in extreme detail for a stable diffusion prompt. Focus on: Skin tone, Eye color/shape, Hair style/color, Facial structure. Ignore clothing/background. Output a comma-separated list of visual adjectives.`;

  return generationQueue.add(() => retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", 
        contents: {
            parts: [
                { inlineData: { mimeType: "image/png", data: base64Data } },
                { text: prompt }
            ]
        }
    });
    
    trackUsage('gemini-2.5-flash-vision', 1);
    return response.text?.trim() || "Detailed character face description";
  }));
};

export const optimizeReferenceImage = async (base64ImageUrl: string): Promise<string> => {
  const ai = getAI();
  const base64Data = base64ImageUrl.split(',')[1];
  const prompt = `Generate a NEW image of ONLY the character's FACE and HAIR (Headshot). IGNORE original clothing. Solid WHITE background. 1:1 Aspect Ratio.`;

  return generationQueue.add(() => retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { mimeType: "image/png", data: base64Data } },
                { text: prompt }
            ]
        },
        config: { imageConfig: { aspectRatio: "1:1" } }
    });

    trackUsage('gemini-2.5-flash-image', 1);

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts?.[0]?.inlineData?.data) {
        return `data:image/png;base64,${candidate.content.parts[0].inlineData.data}`;
    }
    throw new Error("Optimization failed");
  }));
};

export const generateSceneImage = async (
    scene: Scene, 
    style: string, 
    referenceCharacters?: ReferenceCharacter[]
): Promise<string> => {
  const ai = getAI();
  let prompt = `Create a vertical (9:16) image in the style of ${style}. Scene: ${scene.visualDescription}.`;
  const parts: any[] = [];

  if (referenceCharacters && referenceCharacters.length > 0) {
      referenceCharacters.forEach((char) => {
          if (char.description) {
              prompt += `\n Character (${char.name}) appearance: ${char.description}.`;
          }
          if (char.images.length > 0) {
              char.images.forEach(imgUrl => {
                  parts.push({ inlineData: { mimeType: "image/png", data: imgUrl.split(',')[1] } });
              });
          }
      });
      prompt += `\n use the attached images as character reference.`;
  }
  parts.push({ text: prompt });

  return generationQueue.add(() => retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: parts },
        config: { imageConfig: { aspectRatio: "9:16" } }
    });

    trackUsage('gemini-2.5-flash-image', 1);

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts?.[0]?.inlineData?.data) {
        return `data:image/png;base64,${candidate.content.parts[0].inlineData.data}`;
    }
    throw new Error("Image generation failed");
  }));
};

export const generateNarrationAudio = async (text: string, voiceName: string = 'Kore'): Promise<string> => {
  const ai = getAI();
  
  return generationQueue.add(() => retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: { parts: [{ text: text }] },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
        },
    });

    trackUsage('gemini-2.5-flash-preview-tts', 1);

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts?.[0]?.inlineData?.data) {
        // CHANGED: Return Data URI instead of Blob URL for DB persistence
        return createWavDataUri(candidate.content.parts[0].inlineData.data);
    }
    throw new Error("Audio generation failed");
  }));
};
