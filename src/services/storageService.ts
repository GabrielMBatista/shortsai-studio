
import { User, VideoProject, ApiKeys, SavedCharacter, Scene, UsageLog, BackendProjectStatus } from '../types';
import { encryptData, decryptData } from '../utils/security';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const SESSION_ID_KEY = 'shortsai_user_id';

// --- Global User Cache ---
let currentUserCache: User | null = null;

// --- API Helper ---
async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
        'Accept': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!res.ok) {
            const errorText = await res.text();
            const error = new Error(`API Error ${res.status}: ${errorText}`);
            (error as any).status = res.status;
            throw error;
        }

        const text = await res.text();
        return text ? JSON.parse(text) : {};
    } catch (error) {
        if (endpoint === '/usage') {
            throw error;
        }
        console.warn(`API Request failed for ${endpoint}:`, error);
        throw error;
    }
}

// --- Auth & Session Management ---
export const restoreSession = async (): Promise<User | null> => {
    const storedId = localStorage.getItem(SESSION_ID_KEY);
    if (!storedId) {
        currentUserCache = null;
        return null;
    }

    try {
        const remoteKeys = await apiFetch(`/user/apikeys?user_id=${storedId}`);

        const keys: ApiKeys = {};
        if (remoteKeys) {
            if (remoteKeys.gemini_key) keys.gemini = decryptData(remoteKeys.gemini_key);
            if (remoteKeys.elevenlabs_key) keys.elevenlabs = decryptData(remoteKeys.elevenlabs_key);
            if (remoteKeys.suno_key) keys.suno = decryptData(remoteKeys.suno_key);
            if (remoteKeys.groq_key) keys.groq = decryptData(remoteKeys.groq_key);
        }

        let userData: any = { name: 'User', email: '', avatar_url: '' };
        try {
            const userRes = await apiFetch(`/users?user_id=${storedId}`);
            if (Array.isArray(userRes) && userRes.length > 0) userData = userRes[0];
            else if (userRes && userRes.id) userData = userRes;
        } catch (e) { }

        const user = {
            id: storedId,
            name: userData.name || 'Returning User',
            email: userData.email || '',
            avatar: userData.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + storedId,
            apiKeys: keys
        };

        currentUserCache = user;
        return user;

    } catch (e) {
        console.error("Session restore failed", e);
        currentUserCache = null;
        return null;
    }
};

export const loginUser = async (email: string, name: string, avatar: string, id?: string): Promise<User> => {
    let user: User | null = null;

    try {
        let userFromApi;
        try {
            const users = await apiFetch(`/users?email=${encodeURIComponent(email)}`);
            userFromApi = Array.isArray(users) ? users[0] : users;
        } catch (e) { }

        if (!userFromApi) {
            try {
                await apiFetch('/users', {
                    method: 'POST',
                    body: JSON.stringify({ email, name, avatar_url: avatar, google_id: id || '' })
                });
                const usersRetry = await apiFetch(`/users?email=${encodeURIComponent(email)}`);
                userFromApi = Array.isArray(usersRetry) ? usersRetry[0] : usersRetry;
            } catch (e) { }
        }

        if (userFromApi) {
            const userId = userFromApi.id || userFromApi._id;
            let apiKeys: ApiKeys = {};

            try {
                const remoteKeys = await apiFetch(`/user/apikeys?user_id=${userId}`);
                if (remoteKeys) {
                    if (remoteKeys.gemini_key) apiKeys.gemini = decryptData(remoteKeys.gemini_key);
                    if (remoteKeys.elevenlabs_key) apiKeys.elevenlabs = decryptData(remoteKeys.elevenlabs_key);
                    if (remoteKeys.suno_key) apiKeys.suno = decryptData(remoteKeys.suno_key);
                    if (remoteKeys.groq_key) apiKeys.groq = decryptData(remoteKeys.groq_key);
                }
            } catch (e) { }

            user = {
                id: userId,
                name: userFromApi.name,
                email: userFromApi.email,
                avatar: userFromApi.avatar_url || avatar,
                apiKeys: apiKeys
            };
        }
    } catch (error) {
        console.error("Online login failed", error);
        throw error;
    }

    if (user) {
        localStorage.setItem(SESSION_ID_KEY, user.id);
        currentUserCache = user;
    }

    return user!;
};

export const logoutUser = () => {
    localStorage.removeItem(SESSION_ID_KEY);
    currentUserCache = null;
};

export const updateUserApiKeys = async (userId: string, keys: ApiKeys): Promise<User | null> => {
    try {
        const payload = {
            user_id: userId,
            gemini_key: keys.gemini ? encryptData(keys.gemini) : "",
            elevenlabs_key: keys.elevenlabs ? encryptData(keys.elevenlabs) : "",
            suno_key: keys.suno ? encryptData(keys.suno) : "",
            groq_key: keys.groq ? encryptData(keys.groq) : ""
        };
        await apiFetch('/user/apikeys', { method: 'POST', body: JSON.stringify(payload) });
        const session = await restoreSession();
        return session ? { ...session, apiKeys: keys } : null;
    } catch (e) {
        return null;
    }
};

const toApiProject = (p: VideoProject) => {
    const apiObj = {
        user_id: p.userId,
        topic: p.topic,
        style: p.style,
        voice_name: p.voiceName,
        tts_provider: p.ttsProvider,
        language: p.language,
        include_music: p.includeMusic,
        bg_music_prompt: p.bgMusicPrompt,
        bg_music_url: p.bgMusicUrl,
        bg_music_status: p.bgMusicStatus,
        generated_title: p.generatedTitle,
        generated_description: p.generatedDescription,
        reference_image_url: p.referenceImageUrl,
        duration_config: p.durationConfig,
        status: p.status
    };
    return apiObj;
};

const fromApiProject = (apiP: any): VideoProject => {
    const uniqueScenesMap = new Map<number, Scene>();

    if (apiP.scenes && Array.isArray(apiP.scenes)) {
        apiP.scenes.forEach((s: any) => {
            if (!uniqueScenesMap.has(s.scene_number)) {
                uniqueScenesMap.set(s.scene_number, {
                    id: s.id || s._id,
                    sceneNumber: s.scene_number,
                    visualDescription: s.visualDescription || s.visual_description || '',
                    narration: s.narration,
                    durationSeconds: Number(s.duration_seconds) || 5,
                    imageUrl: s.image_url,
                    audioUrl: s.audio_url,
                    sfxUrl: s.sfx_url,
                    // Use status from backend as-is
                    imageStatus: s.image_status,
                    audioStatus: s.audio_status,
                    sfxStatus: s.sfx_status,
                    imageAttempts: s.image_attempts || 0,
                    audioAttempts: s.audio_attempts || 0,
                    errorMessage: s.error_message
                });
            }

        });
    }

    let recoveredTitle = apiP.generated_title || apiP.generatedTitle || apiP.title;
    let recoveredDesc = apiP.generated_description || apiP.generatedDescription || apiP.description;

    return {
        id: apiP.id || apiP._id,
        userId: apiP.user_id,
        createdAt: new Date(apiP.created_at || Date.now()).getTime(),
        topic: apiP.topic,
        style: apiP.style,
        voiceName: apiP.voice_name || apiP.voiceName,
        ttsProvider: (apiP.tts_provider || apiP.ttsProvider) as any,
        language: apiP.language || 'en',
        includeMusic: apiP.include_music || apiP.includeMusic,
        bgMusicPrompt: apiP.bg_music_prompt || apiP.bgMusicPrompt,
        bgMusicUrl: apiP.bg_music_url || apiP.bgMusicUrl,
        bgMusicStatus: apiP.bg_music_status || apiP.bgMusicStatus,
        generatedTitle: recoveredTitle || apiP.topic,
        generatedDescription: recoveredDesc || '',
        referenceImageUrl: apiP.reference_image_url || apiP.referenceImageUrl,
        scenes: Array.from(uniqueScenesMap.values()).sort((a, b) => a.sceneNumber - b.sceneNumber),
        characterIds: apiP.characterIds || apiP.character_ids || [],
        durationConfig: apiP.duration_config || apiP.durationConfig,
        status: apiP.status || 'draft'
    };
};

// --- STRICT SOURCE OF TRUTH HELPERS ---

export const getProject = async (projectId: string): Promise<VideoProject | null> => {
    try {
        const apiData = await apiFetch(`/projects/${projectId}`);
        return fromApiProject(apiData);
    } catch (e) {
        console.warn("API unavailable", e);
        return null;
    }
};

export const lockSceneAsset = async (projectId: string, sceneId: string, assetType: 'image' | 'audio', force: boolean = false): Promise<Scene> => {
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
        sfxStatus: res.sfx_status
    } as Scene;
};

export const saveSceneAsset = async (projectId: string, sceneId: string, assetType: 'image' | 'audio', dataUrl: string): Promise<Scene> => {
    const urlField = assetType === 'image' ? 'image_url' : 'audio_url';
    const statusField = assetType === 'image' ? 'image_status' : 'audio_status';

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
        sfxStatus: res.sfx_status
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
        sfxStatus: res.sfx_status
    } as Scene;
};

export const reportSceneError = async (projectId: string, sceneId: string, assetType: 'image' | 'audio', errorMessage: string): Promise<void> => {
    const statusField = assetType === 'image' ? 'image_status' : 'audio_status';
    const payload = {
        [statusField]: 'error',
        error_message: errorMessage
    };

    await apiFetch(`/scenes/${sceneId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
    });
};

export const setProjectStatus = async (projectId: string, status: BackendProjectStatus) => {
    try {
        await apiFetch(`/projects/${projectId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    } catch (e: any) {
        console.warn(`setProjectStatus(${status}) failed`, e);
    }
};

export const patchScene = async (projectId: string, scene: Partial<Scene> & { sceneNumber: number }) => {
    const project = await getProject(projectId);
    if (!project) return;

    const targetScene = project.scenes.find(s => s.sceneNumber === scene.sceneNumber);
    if (!targetScene || !targetScene.id) return;

    const payload: any = {};
    if (scene.narration !== undefined) payload.narration = scene.narration;
    if (scene.visualDescription !== undefined) payload.visual_description = scene.visualDescription;

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

export const saveProject = async (project: VideoProject): Promise<VideoProject> => {
    const apiPayload = toApiProject(project);
    let savedProject = { ...project };
    let backendProjectId = project.id;
    let apiSuccess = false;

    try {
        await apiFetch(`/projects/${project.id}`, {
            method: 'PATCH',
            body: JSON.stringify(apiPayload)
        });
        apiSuccess = true;
    } catch (e: any) {
        // If 404, try Create
        if (e.status === 404 || e.message?.includes('404')) {
            try {
                const res = await apiFetch('/projects', {
                    method: 'POST',
                    body: JSON.stringify(apiPayload)
                });
                backendProjectId = res.id || res._id;
                savedProject.id = backendProjectId;
                if (res.status) savedProject.status = res.status;
                if (res.bg_music_status) savedProject.bgMusicStatus = res.bg_music_status;
                apiSuccess = true;
            } catch (createErr) {
                console.warn("Create project failed", createErr);
                throw createErr;
            }
        } else {
            console.warn("Update project failed", e);
            throw e;
        }
    }

    if (apiSuccess && savedProject.scenes && savedProject.scenes.length > 0) {
        try {
            const freshProject = await getProject(backendProjectId);
            const existingScenes = freshProject?.scenes || [];

            const updatedScenes = await Promise.all(savedProject.scenes.map(async (scene) => {
                const existing = existingScenes.find(s => s.sceneNumber === scene.sceneNumber);
                if (!existing) {
                    if (!backendProjectId) {
                        console.warn("Skipping scene creation: No backendProjectId");
                        return scene;
                    }
                    const scenePayload = {
                        project_id: backendProjectId,
                        scene_number: scene.sceneNumber,
                        visual_description: scene.visualDescription || "Pending description",
                        narration: scene.narration || "Pending narration",
                        duration_seconds: scene.durationSeconds || 5
                    };
                    const res = await apiFetch('/scenes', { method: 'POST', body: JSON.stringify(scenePayload) });
                    return { ...scene, id: res.id || res._id };
                }
                return { ...scene, id: existing.id };
            }));
            savedProject.scenes = updatedScenes;
        } catch (e) { console.warn("Scene sync failed", e); }
    }

    return savedProject;
};

export const getUserProjects = async (userId: string): Promise<VideoProject[]> => {
    try {
        const data = await apiFetch(`/projects?user_id=${userId}`);
        const characters = await getUserCharacters(userId);

        if (Array.isArray(data)) {
            const mappedProjects = data.map((p: any) => {
                const mapped = fromApiProject(p);
                if (mapped.characterIds && mapped.characterIds.length > 0) {
                    mapped.referenceCharacters = characters
                        .filter(c => mapped.characterIds!.includes(c.id))
                        .map(c => ({
                            id: c.id,
                            name: c.name,
                            description: c.description,
                            images: c.images
                        }));
                }
                return mapped;
            }).sort((a, b) => b.createdAt - a.createdAt);

            return mappedProjects;
        }
    } catch (e) { }

    return [];
};

export const deleteProject = async (projectId: string) => {
    try { await apiFetch(`/projects/${projectId}`, { method: 'DELETE' }); } catch (e) { }
};

export const saveCharacter = async (character: SavedCharacter) => {
    await apiFetch('/characters', {
        method: 'POST',
        body: JSON.stringify({
            user_id: character.userId,
            name: character.name,
            description: character.description,
            images: character.images
        })
    });
};

export const getUserCharacters = async (userId: string): Promise<SavedCharacter[]> => {
    try {
        const data = await apiFetch(`/characters?user_id=${userId}`);
        if (!Array.isArray(data)) return [];
        return data.map((c: any) => ({
            id: c.id || c._id,
            userId: c.user_id,
            name: c.name,
            description: c.description,
            images: c.images || [],
            createdAt: new Date(c.created_at || Date.now()).getTime()
        }));
    } catch (e) { return []; }
};

export const deleteCharacter = async (characterId: string) => {
    try { await apiFetch(`/characters/${characterId}`, { method: 'DELETE' }); } catch (e) { }
};

export const saveUsageLog = async (log: UsageLog) => {
    try {
        const payload = {
            user_id: log.userId,
            project_id: log.projectId,
            action_type: log.actionType,
            provider: log.provider,
            model_name: log.modelName,
            tokens_input: log.tokensInput || 0,
            tokens_output: log.tokensOutput || 0,
            duration_seconds: log.durationSeconds,
            status: log.status,
            error_message: log.errorMessage,
            idempotency_key: log.idempotencyKey,
            created_at: new Date(log.timestamp).toISOString()
        };

        await apiFetch('/usage', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.warn("Failed to save usage log", e);
    }
};

export const getCurrentUserId = (): string | null => {
    return localStorage.getItem(SESSION_ID_KEY);
};

export const getCurrentUser = (): User | null => {
    return currentUserCache;
};
