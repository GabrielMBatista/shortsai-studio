import { getCurrentUser } from "./storageService";
import { trackUsage } from "./quotaService";

const SUNO_BASE_URL = "https://api.sunoapi.org/api/v1";

export const generateMusic = async (stylePrompt: string): Promise<string> => {
    const user = getCurrentUser();
    const apiKey = user?.apiKeys?.suno;

    if (!apiKey) throw new Error("Suno API Key missing.");

    try {
        const payload = {
            customMode: true, 
            instrumental: true,
            style: stylePrompt, 
            title: "ShortsAI Soundtrack",
            model: "V3_5",
            callBackUrl: "https://example.com/callback" 
        };
        
        const response = await fetch(`${SUNO_BASE_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Suno Request Failed");

        const resJson = await response.json();
        const taskId = resJson.data?.taskId;
        if (!taskId) throw new Error("No taskId returned");

        trackUsage('suno-music', 1);
        return await pollForMusicCompletion(taskId, apiKey);
    } catch (error) {
        console.error("Suno generation failed:", error);
        throw error;
    }
};

async function pollForMusicCompletion(taskId: string, apiKey: string): Promise<string> {
    const maxRetries = 60; 
    const interval = 5000;

    for (let i = 0; i < maxRetries; i++) {
        await new Promise(r => setTimeout(r, interval));
        try {
            const res = await fetch(`${SUNO_BASE_URL}/generate/record-info?taskId=${taskId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            const json = await res.json();
            const recordData = json.data;
            const status = recordData?.status;

            if (status === 'SUCCESS' || status === 'FIRST_SUCCESS') {
                const clip = recordData.response?.sunoData?.[0];
                if (clip?.audioUrl) return clip.audioUrl;
            }
            if (['CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED'].includes(status)) throw new Error("Music generation failed");
        } catch (e) { console.warn("Polling error", e); }
    }
    throw new Error("Music generation timed out");
}