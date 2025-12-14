import { apiFetch } from './api';

export const getFolders = async (forceRefresh?: boolean): Promise<{ folders: any[]; rootCount: number }> => {
    try {
        const url = forceRefresh ? '/folders?refresh=true' : '/folders';
        const data = await apiFetch(url);
        if (Array.isArray(data)) return { folders: data, rootCount: 0 };
        return { folders: data.folders || [], rootCount: data.rootCount || 0 };
    } catch (e) {
        return { folders: [], rootCount: 0 };
    }
};

export const createFolder = async (name: string, parentId?: string) => {
    return await apiFetch('/folders', {
        method: 'POST',
        body: JSON.stringify({ name, parent_id: parentId })
    });
};

export const updateFolder = async (id: string, name?: string, parentId?: string | null, channelId?: string | null) => {
    const body: any = {};
    if (name !== undefined) body.name = name;
    if (parentId !== undefined) body.parent_id = parentId;
    if (channelId !== undefined) body.channel_id = channelId;

    return await apiFetch(`/folders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
    });
};

export const deleteFolder = async (id: string) => {
    return await apiFetch(`/folders/${id}`, {
        method: 'DELETE'
    });
};
