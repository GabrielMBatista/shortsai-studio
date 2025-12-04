import { VideoProject, BackendProjectStatus } from '../types';
import { apiFetch, API_BASE_URL } from './api';
import { fromApiProject, toApiProject } from './mappers';
import { getUserCharacters } from './characters';

export const getProject = async (projectId: string): Promise<VideoProject | null> => {
    try {
        const apiData = await apiFetch(`/projects/${projectId}`);
        return fromApiProject(apiData);
    } catch (e) {
        console.warn("API unavailable", e);
        return null;
    }
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
                // Match by ID if available
                let existing = scene.id ? existingScenes.find(s => s.id === scene.id) : null;

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
                } else {
                    // Update scene order if changed
                    if (existing.sceneNumber !== scene.sceneNumber) {
                        try {
                            await apiFetch(`/scenes/${existing.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ scene_number: scene.sceneNumber })
                            });
                        } catch (e) { console.warn("Failed to update scene order", e); }
                    }
                    return { ...scene, id: existing.id };
                }
            }));
            savedProject.scenes = updatedScenes;
        } catch (e) { console.warn("Scene sync failed", e); }
    }

    return savedProject;
};

export const patchProjectMetadata = async (projectId: string, updates: { folder_id?: string | null, is_archived?: boolean, tags?: string[] }) => {
    try {
        await apiFetch(`/projects/${projectId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    } catch (e) {
        console.warn("Patch project metadata failed", e);
        throw e;
    }
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

export const exportProjectContext = async (folderId?: string | null, tag?: string, limit: number = 100) => {
    const params = new URLSearchParams();
    if (folderId) {
        params.append('folderId', folderId);
    } else if (folderId === null) {
        params.append('folderId', 'root');
    }
    if (tag) params.append('tag', tag);
    params.append('limit', limit.toString());

    // We fetch directly to get the blob/json
    const res = await fetch(`${API_BASE_URL}/projects/export-context?${params.toString()}`);
    if (!res.ok) throw new Error("Export failed");
    return await res.json();
};
