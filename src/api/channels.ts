import { Channel, DiscoveredChannel } from '../types/personas';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';

export const channelsApi = {
    async getUserChannels(): Promise<Channel[]> {
        const res = await fetch(`${API_URL}/channels/user`, {
            credentials: 'include'
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Failed to fetch channels' }));
            throw new Error(error.error || 'Failed to fetch channels');
        }
        const data = await res.json();
        return data.channels || [];
    },

    async discover(accountId: string): Promise<DiscoveredChannel[]> {
        const res = await fetch(`${API_URL}/channels/discover`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ accountId })
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Failed to discover channels' }));
            throw new Error(error.error || 'Failed to discover channels');
        }
        const data = await res.json();
        return data.channels || [];
    },

    async import(accountId: string, youtubeChannelId: string): Promise<Channel> {
        const res = await fetch(`${API_URL}/channels/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ accountId, youtubeChannelId })
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Failed to import channel' }));
            throw new Error(error.error || 'Failed to import channel');
        }
        return res.json();
    },

    async assignPersona(channelId: string, personaId: string | null): Promise<Channel> {
        const res = await fetch(`${API_URL}/channels/${channelId}/persona`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ personaId })
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Failed to assign persona' }));
            throw new Error(error.error || 'Failed to assign persona');
        }
        return res.json();
    }
};
