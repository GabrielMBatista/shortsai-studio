import { getCurrentUser } from "./storageService";
import { Voice, ELEVEN_LABS_VOICES } from "../types";
import { trackUsage } from "./quotaService";

const ELEVEN_LABS_API_URL = "https://api.elevenlabs.io/v1";

export const getElevenLabsVoices = async (): Promise<Voice[]> => {
    const user = getCurrentUser();
    const apiKey = user?.apiKeys?.elevenLabs;

    // If no key, we can't fetch user cloned voices.
    if (!apiKey) {
        return ELEVEN_LABS_VOICES;
    }

    try {
        const response = await fetch(`${ELEVEN_LABS_API_URL}/voices`, {
            method: 'GET',
            headers: { 'xi-api-key': apiKey.trim() }
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.warn("ElevenLabs API Key is invalid or expired. Using default voices.");
            } else {
                console.warn(`ElevenLabs API Error: ${response.status} ${response.statusText}`);
            }
            return ELEVEN_LABS_VOICES;
        }

        const data = await response.json();
        
        if (!data.voices || !Array.isArray(data.voices)) {
            return ELEVEN_LABS_VOICES;
        }

        const mappedVoices: Voice[] = data.voices.map((v: any) => ({
            name: v.voice_id,
            label: v.name,
            gender: (v.labels?.gender === 'female') ? 'Female' : 'Male', 
            description: v.labels?.description || v.category || 'Premium Voice',
            provider: 'elevenlabs',
            previewUrl: v.preview_url,
            labels: v.labels
        }));

        // Sort: Cloned/Generated first, then Premade
        return mappedVoices.sort((a, b) => {
             const aIsCloned = a.description === 'cloned' || a.description === 'generated';
             const bIsCloned = b.description === 'cloned' || b.description === 'generated';
             if (aIsCloned && !bIsCloned) return -1;
             if (!aIsCloned && bIsCloned) return 1;
             return a.label.localeCompare(b.label);
        });

    } catch (error) {
        console.error("ElevenLabs Fetch Error", error);
        return ELEVEN_LABS_VOICES;
    }
};

export const generateElevenLabsAudio = async (text: string, voiceId: string, languageCode: string = 'en'): Promise<string> => {
    const user = getCurrentUser();
    const apiKey = user?.apiKeys?.elevenLabs;

    if (!apiKey) throw new Error("ElevenLabs API Key missing. Please add it in Settings.");

    // Select model based on language
    // v2 supports more languages better
    const modelId = (languageCode && languageCode !== 'en') ? "eleven_multilingual_v2" : "eleven_monolingual_v1";

    try {
        const response = await fetch(`${ELEVEN_LABS_API_URL}/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': apiKey.trim()
            },
            body: JSON.stringify({
                text: text,
                model_id: modelId,
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            if (response.status === 401) {
                throw new Error("Invalid ElevenLabs API Key. Please check your settings.");
            }
            throw new Error(`ElevenLabs Error: ${errText}`);
        }

        // Track usage (generic counter for ElevenLabs)
        trackUsage('elevenlabs-tts', 1);

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error("ElevenLabs Generation Failed", error);
        throw error;
    }
};