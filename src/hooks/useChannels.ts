import { useState, useEffect } from 'react';
import { Channel } from '../types/personas';
import { channelsApi } from '../api/channels';

export function useChannels() {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadChannels();
    }, []);

    const loadChannels = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await channelsApi.getUserChannels();
            setChannels(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load channels');
            console.error('Error loading channels:', err);
        } finally {
            setLoading(false);
        }
    };

    const assignPersona = async (channelId: string, personaId: string | null) => {
        try {
            const updated = await channelsApi.assignPersona(channelId, personaId);
            setChannels(prev =>
                prev.map(ch => ch.id === channelId ? { ...ch, ...updated } : ch)
            );
            return updated;
        } catch (err: any) {
            throw new Error(err.message || 'Failed to assign persona');
        }
    };

    const updateChannel = (updated: Channel) => {
        setChannels(prev =>
            prev.map(ch => ch.id === updated.id ? updated : ch)
        );
    };

    return {
        channels,
        loading,
        error,
        refetch: loadChannels,
        assignPersona,
        updateChannel
    };
}
