
import { User, VideoProject, ApiKeys, SavedCharacter, Scene } from '../types';
import { encryptData, decryptData } from '../utils/security';

const API_BASE_URL = 'https://shortsai-api.vercel.app/api';
const SESSION_ID_KEY = 'shortsai_user_id'; 
const DB_NAME = 'ShortsAIDB';
const STORE_NAME = 'projects';

// --- Global User Cache ---
// This allows services (like ElevenLabs/Gemini) to access keys without prop drilling
let currentUserCache: User | null = null;

// --- IndexedDB Helpers (Offline Cache Only - Transient) ---
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const idbPut = async (project: VideoProject) => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).put(project);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
};

const idbDelete = async (id: string) => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
};

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
        throw new Error(`API Error ${res.status}: ${errorText}`);
      }
      
      const text = await res.text();
      return text ? JSON.parse(text) : {};
  } catch (error) {
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
            if (remoteKeys.elevenlabs_key) keys.elevenLabs = decryptData(remoteKeys.elevenlabs_key);
            if (remoteKeys.suno_key) keys.suno = decryptData(remoteKeys.suno_key);
        }

        let userData: any = { name: 'User', email: '', avatar_url: '' };
        try {
             const userRes = await apiFetch(`/users?user_id=${storedId}`);
             if (Array.isArray(userRes) && userRes.length > 0) userData = userRes[0];
             else if (userRes && userRes.id) userData = userRes;
        } catch(e) {}

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
    // 1. Create or Get User via API
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

    // 2. Fetch Keys
    if (userFromApi) {
        const userId = userFromApi.id || userFromApi._id;
        let apiKeys: ApiKeys = {};
        
        try {
            const remoteKeys = await apiFetch(`/user/apikeys?user_id=${userId}`);
            if (remoteKeys) {
                if (remoteKeys.gemini_key) apiKeys.gemini = decryptData(remoteKeys.gemini_key);
                if (remoteKeys.elevenlabs_key) apiKeys.elevenLabs = decryptData(remoteKeys.elevenlabs_key);
                if (remoteKeys.suno_key) apiKeys.suno = decryptData(remoteKeys.suno_key);
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
          elevenlabs_key: keys.elevenLabs ? encryptData(keys.elevenLabs) : "",
          suno_key: keys.suno ? encryptData(keys.suno) : ""
      };
      await apiFetch('/user/apikeys', { method: 'POST', body: JSON.stringify(payload) });
      const session = await restoreSession(); 
      return session ? { ...session, apiKeys: keys } : null;
  } catch (e) { 
      return null;
  }
};

// --- Projects CRUD ---

const toApiProject = (p: VideoProject) => ({
    user_id: p.userId,
    topic: p.topic,
    style: p.style,
    voice_name: p.voiceName,
    tts_provider: p.ttsProvider,
    language: p.language,
    include_music: p.includeMusic,
    bg_music_prompt: p.bgMusicPrompt,
    reference_image_url: p.referenceImageUrl,
    characterIds: p.referenceCharacters?.map(c => c.id).filter(Boolean) || []
});

const fromApiProject = (apiP: any): VideoProject => {
    const uniqueScenesMap = new Map<number, Scene>();
    
    if (apiP.scenes && Array.isArray(apiP.scenes)) {
        apiP.scenes.forEach((s: any) => {
            if (!uniqueScenesMap.has(s.scene_number)) {
                uniqueScenesMap.set(s.scene_number, {
                    id: s.id || s._id,
                    sceneNumber: s.scene_number,
                    visualDescription: s.visual_description,
                    narration: s.narration,
                    durationSeconds: s.duration_seconds,
                    imageUrl: s.image_url, 
                    audioUrl: s.audio_url,
                    imageStatus: s.image_url ? 'completed' : 'pending',
                    audioStatus: s.audio_url ? 'completed' : 'pending'
                });
            }
        });
    }

    return {
        id: apiP.id || apiP._id,
        userId: apiP.user_id,
        createdAt: new Date(apiP.created_at || Date.now()).getTime(),
        topic: apiP.topic,
        style: apiP.style,
        voiceName: apiP.voice_name,
        ttsProvider: apiP.tts_provider as any,
        language: apiP.language || 'en',
        includeMusic: apiP.include_music,
        bgMusicPrompt: apiP.bg_music_prompt,
        bgMusicUrl: apiP.bg_music_url, 
        generatedTitle: apiP.generated_title,
        generatedDescription: apiP.generated_description,
        referenceImageUrl: apiP.reference_image_url,
        scenes: Array.from(uniqueScenesMap.values()).sort((a, b) => a.sceneNumber - b.sceneNumber),
        characterIds: apiP.characterIds || [] // Keep raw IDs for hydration
    };
};

export const saveProject = async (project: VideoProject): Promise<VideoProject> => {
    // 1. Save locally (Buffer for offline/latency)
    await idbPut(project);

    let syncedProject = { ...project };
    let backendProjectId = project.id;
    let isNew = false;

    // 2. Sync with Backend
    try {
        try {
            const apiPayload = toApiProject(project);
            // CRITICAL: Remove user_id from PATCH payload
            const { user_id, ...patchPayload } = apiPayload;

            await apiFetch(`/projects/${project.id}`, {
                method: 'PATCH',
                body: JSON.stringify(patchPayload)
            });
        } catch (e: any) {
            // Enhanced detection: Check for 404 OR 500 with Prisma "not found" indicators
            const msg = e.message || "";
            const isNotFound = msg.includes('404') || 
                               msg.includes('P2025') || 
                               (msg.includes('record') && msg.includes('not found'));

            if (isNotFound) {
                const res = await apiFetch('/projects', {
                    method: 'POST',
                    body: JSON.stringify(toApiProject(project))
                });
                if (res.id || res._id) {
                    backendProjectId = res.id || res._id;
                    syncedProject.id = backendProjectId;
                    isNew = true;
                }
            } else { throw e; }
        }

        if (syncedProject.scenes && Array.isArray(syncedProject.scenes) && syncedProject.scenes.length > 0) {
            const updatedScenes = await Promise.all(syncedProject.scenes.map(async (scene) => {
                const scenePayload = {
                    project_id: backendProjectId,
                    scene_number: scene.sceneNumber,
                    visual_description: scene.visualDescription,
                    narration: scene.narration,
                    duration_seconds: scene.durationSeconds,
                    image_url: scene.imageUrl, 
                    audio_url: scene.audioUrl 
                };

                let savedSceneId = scene.id;
                try {
                    if (scene.id && !isNew) {
                         await apiFetch(`/scenes/${scene.id}`, { method: 'PATCH', body: JSON.stringify(scenePayload) });
                    } else {
                         const res = await apiFetch('/scenes', { method: 'POST', body: JSON.stringify(scenePayload) });
                         savedSceneId = res.id || res._id;
                    }
                } catch (e) {
                    console.warn(`Failed to sync scene ${scene.sceneNumber}`, e);
                }
                return { ...scene, id: savedSceneId };
            }));
            syncedProject.scenes = updatedScenes;
        }

        // Update local buffer if ID changed or just to ensure consistency
        if (syncedProject.id !== project.id) {
            await idbDelete(project.id);
            await idbPut(syncedProject);
        } else {
            await idbPut(syncedProject);
        }

    } catch (e) {
        console.warn("Backend sync failed, saved locally.", e);
    }

    return syncedProject;
};

export const getUserProjects = async (userId: string): Promise<VideoProject[]> => {
    try {
        const data = await apiFetch(`/projects?user_id=${userId}`);
        const characters = await getUserCharacters(userId);
        
        if (Array.isArray(data)) {
            return data.map((p: any) => {
                const mapped = fromApiProject(p);
                // Hydrate characters from Library
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
        }
    } catch (e) {
        console.warn("API failed, returning empty list.");
    }
    return [];
};

export const deleteProject = async (projectId: string) => {
    await idbDelete(projectId); // Clean buffer
    try { await apiFetch(`/projects/${projectId}`, { method: 'DELETE' }); } catch (e) { }
};

// --- Characters CRUD (Universal) ---

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

export const saveUsageLog = async (log: any) => {
    try {
        await apiFetch('/usage', {
            method: 'POST',
            body: JSON.stringify({
                user_id: log.userId,
                project_id: log.projectId,
                action_type: log.actionType,
                provider: log.provider,
                model_name: log.modelName,
                tokens_input: log.tokensInput,
                tokens_output: log.tokensOutput,
                status: log.status
            })
        });
    } catch (e) { }
};

export const getCurrentUserId = (): string | null => {
    return localStorage.getItem(SESSION_ID_KEY);
};

export const getCurrentUser = (): User | null => {
    return currentUserCache;
};
