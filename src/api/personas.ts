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

    async chat(
        id: string,
        message: string,
        history: any[] = [],
        channelId?: string,
        language?: string,
        voice?: string,
        onProgress?: (progress: number, status: string) => void
    ): Promise<{ response: string }> {
        const res = await fetch(`${API_URL}/personas/${id}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ message, history, channelId, language, voice })
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Failed to chat with persona' }));
            throw new Error(error.error || 'Failed to chat with persona');
        }

        const data = await res.json();

        // Check if response is async (has jobId)
        if (data.jobId) {
            console.log('[PersonasAPI] Async job started:', data.jobId);

            // Poll for completion
            return this.pollJobUntilComplete(data.jobId, onProgress);
        }

        // Synchronous response
        return data;
    },

    async pollJobUntilComplete(
        jobId: string,
        onProgress?: (progress: number, status: string) => void
    ): Promise<{ response: string }> {
        const maxAttempts = 120; // 10 minutes (5s interval)
        let attempts = 0;

        while (attempts < maxAttempts) {
            attempts++;

            try {
                const status = await this.getJobStatus(jobId);

                // Update progress if callback provided
                if (onProgress) {
                    onProgress(status.progress || 0, status.status);
                }

                switch (status.status) {
                    case 'completed':
                        console.log('[PersonasAPI] Job completed!', jobId);
                        return { response: status.result || '' };

                    case 'failed':
                        console.error('[PersonasAPI] Job failed:', status.error);
                        throw new Error(status.error || 'Job failed');

                    case 'processing':
                    case 'pending':
                        // Continue polling
                        console.log(`[PersonasAPI] Job ${status.status} (${status.progress || 0}%)...`);
                        break;
                }
            } catch (error) {
                console.error('[PersonasAPI] Polling error:', error);
                // Don't throw, just retry
            }

            // Wait 5 seconds before next poll
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        throw new Error('Job polling timeout (10 minutes)');
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
