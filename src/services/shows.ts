import { apiFetch } from './api';

export interface Show {
    id: string;
    name: string;
    description?: string;
    style_preset?: string;
    created_at: string;
    _count?: {
        episodes: number;
        characters: number;
    }
}

export interface ShowDetail extends Show {
    characters: any[]; // Tiparemos melhor depois
    episodes: any[];
}

export const getShows = async (): Promise<Show[]> => {
    return apiFetch('/shows');
};

export const getShowById = async (id: string): Promise<ShowDetail> => {
    return apiFetch(`/shows/${id}`);
};

export const createShow = async (data: Partial<Show>) => {
    return apiFetch('/shows', {
        method: 'POST',
        body: JSON.stringify(data)
    });
};

export const updateShow = async (id: string, data: Partial<Show>) => {
    return apiFetch(`/shows/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    });
};

export const deleteShow = async (id: string) => {
    return apiFetch(`/shows/${id}`, {
        method: 'DELETE'
    });
};
