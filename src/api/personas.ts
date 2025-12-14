import { Persona, CreatePersonaData } from '../types/personas';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';

export const personasApi = {
    async getAll(): Promise<Persona[]> {
        const res = await fetch(`${API_URL}/personas`, {
            credentials: 'include'
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Failed to fetch personas' }));
            throw new Error(error.error || 'Failed to fetch personas');
        }
        const data = await res.json();
        return data.personas || [];
    },

    async getById(id: string): Promise<Persona> {
        const res = await fetch(`${API_URL}/personas/${id}`, {
            credentials: 'include'
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Persona not found' }));
            throw new Error(error.error || 'Persona not found');
        }
        return res.json();
    },

    async create(data: CreatePersonaData): Promise<Persona> {
        const res = await fetch(`${API_URL}/personas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Failed to create persona' }));
            throw new Error(error.error || 'Failed to create persona');
        }
        return res.json();
    },

    async update(id: string, data: Partial<Persona>): Promise<Persona> {
        const res = await fetch(`${API_URL}/personas/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Failed to update persona' }));
            throw new Error(error.error || 'Failed to update persona');
        }
        return res.json();
    },

    async delete(id: string): Promise<void> {
        const res = await fetch(`${API_URL}/personas/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Failed to delete persona' }));
            throw new Error(error.error || 'Failed to delete persona');
        }
    },

    async chat(id: string, message: string, history: any[] = [], channelId?: string): Promise<{ response: string }> {
        const res = await fetch(`${API_URL}/personas/${id}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ message, history, channelId })
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Failed to chat with persona' }));
            throw new Error(error.error || 'Failed to chat with persona');
        }
        return res.json();
    },

    async getJobStatus(jobId: string): Promise<{
        status: 'pending' | 'processing' | 'completed' | 'failed';
        result?: string;
        error?: string;
        progress?: number;
        message?: string;
    }> {
        const res = await fetch(`${API_URL}/personas/jobs/${jobId}`, {
            credentials: 'include'
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Failed to get job status' }));
            throw new Error(error.error || 'Failed to get job status');
        }
        return res.json();
    }
};
