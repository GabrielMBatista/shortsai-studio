import { Scene } from '../types';
import { apiFetch } from './api';
import { getProject } from './projects';

export const lockSceneAsset = async (projectId: string, sceneId: string, assetType: 'image' | 'audio' | 'video', force: boolean = false): Promise<Scene> => {
    const payload = {
        type: assetType,
        asset_type: assetType,
        status: 'processing',
        force_regen: force
    };

    const res = await apiFetch(`/scenes/${sceneId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
    });

    return {
        ...res,
        sceneNumber: res.scene_number,
        imageStatus: res.image_status,
        audioStatus: res.audio_status,
        imageUrl: res.image_url,
        audioUrl: res.audio_url,
        sfxUrl: res.sfx_url,
        sfxStatus: res.sfx_status,
        videoUrl: res.video_url,
        videoStatus: res.video_status
    } as Scene;
};

export const saveSceneAsset = async (projectId: string, sceneId: string, assetType: 'image' | 'audio' | 'video', dataUrl: string): Promise<Scene> => {
    let urlField = 'image_url';
    let statusField = 'image_status';

    if (assetType === 'audio') {
        urlField = 'audio_url';
        statusField = 'audio_status';
    } else if (assetType === 'video') {
        urlField = 'video_url';
        statusField = 'video_status';
    }

    const payload = {
        type: assetType,
        asset_type: assetType,
        [urlField]: dataUrl,
        [statusField]: 'completed',
        status: 'completed'
    };

    const res = await apiFetch(`/scenes/${sceneId}/asset`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
    });

    return {
        ...res,
        sceneNumber: res.scene_number,
        imageStatus: res.image_status,
        audioStatus: res.audio_status,
        imageUrl: res.image_url,
        audioUrl: res.audio_url,
        sfxUrl: res.sfx_url,
        sfxStatus: res.sfx_status,
        videoUrl: res.video_url,
        videoStatus: res.video_status
    } as Scene;
};

export const saveSceneSFX = async (projectId: string, sceneId: string, sfxUrl: string): Promise<Scene> => {
    const payload = {
        sfx_url: sfxUrl,
        sfx_status: 'completed'
    };

    const res = await apiFetch(`/scenes/${sceneId}/sfx`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
    });

    return {
        ...res,
        sceneNumber: res.scene_number,
        imageStatus: res.image_status,
        audioStatus: res.audio_status,
        imageUrl: res.image_url,
        audioUrl: res.audio_url,
        sfxUrl: res.sfx_url,
        sfxStatus: res.sfx_status,
        videoUrl: res.video_url,
        videoStatus: res.video_status
    } as Scene;
};


export const reportSceneError = async (projectId: string, sceneId: string, assetType: 'image' | 'audio' | 'video', errorMessage: string): Promise<void> => {
    let statusField = 'image_status';
    if (assetType === 'audio') statusField = 'audio_status';
    else if (assetType === 'video') statusField = 'video_status';
    const payload = {
        [statusField]: 'error',
        error_message: errorMessage
    };

    await apiFetch(`/scenes/${sceneId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
    });
};

export const patchScene = async (projectId: string, scene: Partial<Scene> & { sceneNumber: number }) => {
    const project = await getProject(projectId);
    if (!project) return;

    const targetScene = project.scenes.find(s => s.sceneNumber === scene.sceneNumber);
    if (!targetScene || !targetScene.id) return;

    const payload: any = {};
    if (scene.narration !== undefined) payload.narration = scene.narration;
    if (scene.visualDescription !== undefined) payload.visual_description = scene.visualDescription;
    if (scene.mediaType !== undefined) payload.media_type = scene.mediaType;
    if (scene.characters !== undefined) payload.characterIds = scene.characters.map(c => c.id);

    if (Object.keys(payload).length > 0) {
        try {
            await apiFetch(`/scenes/${targetScene.id}`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            });
        } catch (e) { console.warn("Patch scene failed", e); }
    }
};

export const deleteScene = async (sceneId: string) => {
    try {
        await apiFetch(`/scenes/${sceneId}`, { method: 'DELETE' });
    } catch (e) {
        console.warn("Delete scene failed", e);
        throw e;
    }
};

// In-memory cache for media
const mediaCache = new Map<string, { image_base64?: string | null, audio_base64?: string | null, video_base64?: string | null }>();

export const getSceneMedia = async (sceneId: string) => {
    if (mediaCache.has(sceneId)) {
        return mediaCache.get(sceneId);
    }

    try {
        const res = await apiFetch(`/scenes/${sceneId}/media`);
        if (res) {
            mediaCache.set(sceneId, res);
        }
        return res;
    } catch (e) {
        console.warn("Failed to fetch scene media", e);
        return null;
    }
};
