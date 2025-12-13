import React, { useState } from 'react';
import { useChannels } from '../hooks/useChannels';
import ChannelPersonaSelector from './ChannelPersonaSelector';
import ChannelSidebarList from './ChannelSidebarList';
import { Youtube, Users, Video, Eye, RefreshCw, BarChart2, Star, Sparkles, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Channel } from '../types/personas';
import { ChannelVideosModal } from './Channels/ChannelVideosModal';
import { FavoriteChannelDashboard } from './Channels/FavoriteChannelDashboard';
import { formatNumber } from '../utils/format';

interface VideoAnalytics {
    id: string;
    title: string;
    url: string;
    thumbnail?: string;
    description?: string;
    publishedAt?: string;
    tags?: string[];
    stats: { views: number; likes: number; comments: number };
}

export default function ChannelsList() {
    const { t } = useTranslation();
    const { channels, loading, error, refetch, updateChannel } = useChannels();
    const [selectedChannel, setSelectedChannel] = useState<{ id: string, name: string } | null>(null);
    const [channelVideos, setChannelVideos] = useState<VideoAnalytics[]>([]);
    const [isLoadingVideos, setIsLoadingVideos] = useState(false);
    const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
    const [favorites, setFavorites] = useState<Set<string>>(() => {
        const saved = localStorage.getItem('favoriteChannels');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

    const apiUrl = import.meta.env.VITE_API_URL || '/api';

    const toggleFavorite = (id: string) => {
        setFavorites(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            localStorage.setItem('favoriteChannels', JSON.stringify(Array.from(next)));
            return next;
        });
    };

    const handleSync = async (channel: Channel) => {
        if (syncingIds.has(channel.id)) return;

        setSyncingIds(prev => new Set(prev).add(channel.id));
        try {
            await refetch();
        } catch (err) {
            console.error("Sync failed", err);
        } finally {
            setSyncingIds(prev => {
                const next = new Set(prev);
                next.delete(channel.id);
                return next;
            });
        }
    };

    const handleViewAnalytics = async (channel: Channel) => {
        setSelectedChannel({ id: channel.id, name: channel.name });
        setIsLoadingVideos(true);

        try {
            const response = await fetch(`${apiUrl}/channels/${channel.id}/videos?accountId=${channel.googleAccountId}`);
            if (!response.ok) throw new Error('Failed to fetch videos');
            const videos: VideoAnalytics[] = await response.json();
            setChannelVideos(videos);
        } catch (err) {
            console.error('[ChannelsList] Failed to fetch videos:', err);
            setChannelVideos([]);
        } finally {
            setIsLoadingVideos(false);
        }
    };

    const filteredChannels = selectedChannelId
        ? channels.filter(ch => ch.id === selectedChannelId)
        : channels;

    return (
        <>
            <div className="flex min-h-[calc(100vh-64px)]">
                {/* Sidebar */}
                <ChannelSidebarList
                    className="fixed md:sticky md:top-16 z-50 h-[calc(100vh-64px)]"
                    channels={channels}
                    selectedChannelId={selectedChannelId}
                    onSelectChannel={setSelectedChannelId}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    isLoading={loading}
                />

                {/* Main Content */}
                <div className="flex-1 bg-[#0f172a] relative flex flex-col overflow-y-auto">
                    <div className="w-full px-6 py-8">
                        {error ? (
                            <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6 text-center">
                                <p className="text-red-400 font-medium">{error}</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Favorite Channel Dashboard */}
                                {(() => {
                                    const favoriteChannel = channels.find(ch => favorites.has(ch.id));
                                    if (!favoriteChannel || selectedChannelId) return null;

                                    return (
                                        <FavoriteChannelDashboard
                                            channel={favoriteChannel}
                                            onViewAnalytics={handleViewAnalytics}
                                            onSync={handleSync}
                                            isSyncing={syncingIds.has(favoriteChannel.id)}
                                        />
                                    );
                                })()}

                                {/* Channels Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredChannels.map(channel => (
                                        <div
                                            key={channel.id}
                                            onClick={() => handleViewAnalytics(channel)}
                                            className={`bg-slate-800/50 border rounded-xl p-6 hover:bg-slate-800 transition-all group flex flex-col h-full relative cursor-pointer ${favorites.has(channel.id)
                                                    ? 'border-yellow-500/30 bg-slate-800/80 shadow-[0_0_15px_rgba(234,179,8,0.1)]'
                                                    : 'border-slate-700/50'
                                                }`}
                                        >
                                            {/* Channel Header */}
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-4">
                                                    {channel.thumbnail ? (
                                                        <img
                                                            src={channel.thumbnail}
                                                            alt={channel.name}
                                                            className="w-16 h-16 rounded-full border-2 border-slate-700/50"
                                                        />
                                                    ) : (
                                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-xl font-bold">
                                                            <Youtube className="w-8 h-8" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h3 className="font-bold text-white text-lg group-hover:text-indigo-400 transition-colors">
                                                            {channel.name}
                                                        </h3>
                                                        {channel.description && (
                                                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                                                {channel.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(channel.id); }}
                                                    className={`p-2 rounded-lg transition-all ${favorites.has(channel.id)
                                                            ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-yellow-400'
                                                        }`}
                                                >
                                                    <Star className={`w-5 h-5 ${favorites.has(channel.id) ? 'fill-yellow-400' : ''}`} />
                                                </button>
                                            </div>

                                            {/* Stats */}
                                            <div className="grid grid-cols-3 gap-2 mb-4">
                                                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                                                    <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-1">
                                                        <Users className="w-3 h-3" />
                                                    </div>
                                                    <div className="text-sm font-bold text-white">
                                                        {channel.subscriberCount ? formatNumber(channel.subscriberCount) : '-'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">subs</div>
                                                </div>
                                                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                                                    <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-1">
                                                        <Video className="w-3 h-3" />
                                                    </div>
                                                    <div className="text-sm font-bold text-white">
                                                        {channel.videoCount ?? '-'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">videos</div>
                                                </div>
                                                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                                                    <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-1">
                                                        <Eye className="w-3 h-3" />
                                                    </div>
                                                    <div className="text-sm font-bold text-white">
                                                        {channel.viewCount ? formatNumber(Number(channel.viewCount)) : '-'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">views</div>
                                                </div>
                                            </div>

                                            {/* Persona Badge */}
                                            {channel.persona && (
                                                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-lg mb-4">
                                                    <Sparkles className="w-4 h-4 text-indigo-400" />
                                                    <span className="text-sm text-indigo-300 font-medium">{channel.persona.name}</span>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="mt-auto flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleViewAnalytics(channel); }}
                                                    className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <BarChart2 className="w-4 h-4" />
                                                    Analytics
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleSync(channel); }}
                                                    className={`px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors ${syncingIds.has(channel.id) ? 'animate-pulse' : ''}`}
                                                    disabled={syncingIds.has(channel.id)}
                                                >
                                                    <RefreshCw className={`w-4 h-4 ${syncingIds.has(channel.id) ? 'animate-spin' : ''}`} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Analytics Modal */}
            {selectedChannel && (
                <ChannelVideosModal
                    isOpen={!!selectedChannel}
                    onClose={() => setSelectedChannel(null)}
                    channelName={selectedChannel.name}
                    videos={channelVideos}
                    isLoading={isLoadingVideos}
                />
            )}
        </>
    );
}
