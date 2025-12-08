import { VideoProject, BackendProjectStatus } from '../types';
import { apiFetch, API_BASE_URL } from './api';
import { fromApiProject, toApiProject } from './mappers';

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
    // 🔒 NEVER save mock/tour projects to backend
    if (project.id === '__mock__-tour-project') {
        console.log('[saveProject] Skipping save for mock tour project');
        return project;
    }

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
        // Typical behavior: We try to UPDATE first. If it fails with 404, it means the ID is new or deleted on backend.
        // So we proceed to CREATE.
        if (e.status === 404 || e.message?.includes('404')) {
            // This is expected for new projects.
        } else {
            console.warn("Update project failed with non-404 error:", e);
            throw e; // Rethrow real errors
        }

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
    }

    if (apiSuccess && savedProject.scenes && savedProject.scenes.length > 0) {
        try {
            const freshProject = await getProject(backendProjectId);

            if (!freshProject) {
                console.warn("Failed to fetch project state, skipping scene sync");
                return savedProject;
            }

            const existingScenes = freshProject.scenes || [];

            const updatedScenes = await Promise.all(savedProject.scenes.map(async (scene) => {
                // Match by ID if available
                let existing = scene.id ? existingScenes.find(s => s.id === scene.id) : null;

                if (!existing) {
                    if (scene.id) {
                        console.warn(`Scene ${scene.id} not found in backend. Skipping recreation.`);
                        return scene;
                    }

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

export const getUserProjects = async (userId: string, limit: number = 100, page: number = 1, folderId?: string | null, isArchived?: boolean): Promise<{ projects: VideoProject[], total: number }> => {
    try {
        const offset = (page - 1) * limit;
        let url = `/projects?user_id=${userId}&limit=${limit}&offset=${offset}`;

        if (folderId) {
            url += `&folder_id=${folderId}`;
        } else if (folderId === null) {
            // Explicitly fetch root folder (no folder)
            url += `&folder_id=root`;
        }

        if (isArchived !== undefined) {
            url += `&is_archived=${isArchived}`;
        }

        const response = await apiFetch(url);

        let data = [];
        let total = 0;

        if (Array.isArray(response)) {
            data = response;
            total = response.length;
        } else if (response.data && Array.isArray(response.data)) {
            data = response.data;
            total = response.meta?.total || 0;
        }

        const mappedProjects = data
            .map((p: any) => fromApiProject(p))
            .filter(p =>
                !p.id.includes('mock-project-') &&
                p.id !== '__mock__-tour-project' // Filter mock tour projects
            )
            .sort((a, b) => b.createdAt - a.createdAt);

        return { projects: mappedProjects, total };

    } catch (e) {
        console.error("Failed to fetch projects", e);
    }

    return { projects: [], total: 0 };
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
