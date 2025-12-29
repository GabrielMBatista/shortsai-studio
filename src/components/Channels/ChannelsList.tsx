import React, { useState } from 'react';
import { useChannels } from '../../hooks/useChannels';
import { channelsApi } from '../../api/channels';
import ChannelSidebarList from './ChannelSidebarList';
import { Youtube, Users, Video, Eye, RefreshCw, BarChart2, Star, Sparkles, ArrowLeft, Plus, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Channel } from '../../types/personas';
import { ChannelDetailsView } from './ChannelDetailsView';
import { FavoriteChannelDashboard } from './FavoriteChannelDashboard';
import { formatNumber } from '../../utils/format';
import { Button, Card, Badge } from '../ui';
import Toast, { ToastType } from '../Common/Toast';

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

interface ChannelsListProps {
    onConnect?: () => void;
    onImport?: () => void;
}

export default function ChannelsList({ onConnect, onImport }: ChannelsListProps = {}) {
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
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

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
        setSyncingIds(prev => new Set(prev).add(channel.id));
        try {
            // Call API to sync channel data
            await channelsApi.sync(channel.id);
            await refetch(); // Refresh all channels local list
            setToast({ message: `${channel.name} synced successfully`, type: 'success' });
            console.log('Synced channel:', channel.name);
        } catch (error: any) {
            console.error('Failed to sync channel:', error);
            const isAuthError = error.message.includes('reconnect') || error.message.includes('expired');
            setToast({
                message: error.message || 'Failed to sync channel',
                type: 'error'
            });
        } finally {
            setSyncingIds(prev => {
                const next = new Set(prev);
                next.delete(channel.id);
                return next;
            });
        }
    };

    const handleViewAnalytics = async (channel: Channel) => {
        setSelectedChannel(channel);
        setSelectedChannelId(channel.id);

        // Load videos for this channel
        setChannelVideos([]);
        setIsLoadingVideos(true);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            const url = `${apiUrl}/channels/${channel.id}/videos?limit=100`;

            console.log('[ChannelsList] Loading videos from:', url);

            const response = await fetch(url, {
                credentials: 'include'
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[ChannelsList] HTTP ${response.status}:`, errorText);
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const videos = Array.isArray(data) ? data : (data.videos || []);

            console.log('[ChannelsList] Loaded', videos.length, 'videos');
            setChannelVideos(videos);
        } catch (err) {
            console.error('[ChannelsList] Failed to fetch videos:', err);
            setChannelVideos([]);
        } finally {
            setIsLoadingVideos(false);
        }
    };

    const handleBackToChannels = () => {
        setSelectedChannel(null);
        setChannelVideos([]);
        setSelectedChannelId(null); // Reset sidebar selection too
    };

    // Auto-load analytics when a channel is selected from sidebar
    React.useEffect(() => {
        if (selectedChannelId && selectedChannelId !== selectedChannel?.id) {
            const channel = channels.find(ch => ch.id === selectedChannelId);
            if (channel) {
                handleViewAnalytics(channel);
            }
        }
    }, [selectedChannelId, channels]);

    const filteredChannels = selectedChannelId ? [] : channels;

    return (
        <div className="flex min-h-[calc(100vh-64px)]">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Sidebar */}
            <ChannelSidebarList
                className="fixed md:sticky md:top-16 z-50 h-[calc(100vh-64px)]"
                channels={channels}
                selectedChannelId={selectedChannelId}
                onSelectChannel={(id) => {
                    setSelectedChannelId(id);
                    setSelectedChannel(null); // Reset details view
                }}
                onViewAnalytics={(channel) => {
                    handleViewAnalytics(channel);
                }}
                onManageChannel={(channel) => {
                    // TODO: Implement manage channel (could open a modal or navigate)
                    console.log('Manage channel:', channel);
                    // For now, just show analytics
                    handleViewAnalytics(channel);
                }}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                isLoading={loading}
            />

            {/* Main Content */}
            <div className="flex-1 bg-[#0f172a] relative flex flex-col overflow-y-auto">
                <div className="w-full px-6 py-8">
                    {/* Header */}
                    {!selectedChannel && (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-fade-in-up">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">
                                    {t('channels.title')}
                                </h1>
                                <p className="text-slate-400">
                                    {t('channels.subtitle')}
                                </p>
                            </div>
                            {onImport && onConnect && (
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="secondary"
                                        size="md"
                                        leftIcon={<Download className="w-5 h-5" />}
                                        onClick={onImport}
                                    >
                                        {t('channels.import_existing')}
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="md"
                                        leftIcon={<Plus className="w-5 h-5" />}
                                        onClick={onConnect}
                                        className="bg-red-600 hover:bg-red-700 shadow-red-600/20"
                                    >
                                        {t('channels.connect_new')}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {error ? (
                        <Card variant="glass" padding="lg" className="bg-red-900/20 border-red-500/50 text-center">
                            <p className="text-red-400 font-medium">{error}</p>
                        </Card>
                    ) : selectedChannel ? (
                        // Channel Details View (Analytics & Videos)
                        <div className="animate-fade-in-up">
                            <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<ArrowLeft className="w-4 h-4" />}
                                onClick={handleBackToChannels}
                                className="mb-6"
                            >
                                {t('channels.back_to_list')}
                            </Button>
                            <ChannelDetailsView
                                channelId={selectedChannel.id}
                                channelName={selectedChannel.name}
                                videos={channelVideos}
                                isLoading={isLoadingVideos}
                            />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Favorite Channel Dashboard - só em All Channels */}
                            {!selectedChannelId && (() => {
                                const favoriteChannel = channels.find(ch => favorites.has(ch.id));
                                if (!favoriteChannel) return null;

                                return (
                                    <FavoriteChannelDashboard
                                        channel={favoriteChannel}
                                        onViewAnalytics={handleViewAnalytics}
                                        onSync={handleSync}
                                        isSyncing={syncingIds.has(favoriteChannel.id)}
                                    />
                                );
                            })()}

                            {/* Channels Grid - só em All Channels */}
                            {!selectedChannelId && filteredChannels.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredChannels.map(channel => (
                                        <Card
                                            key={channel.id}
                                            variant="glass"
                                            padding="lg"
                                            hoverable
                                            onClick={() => handleViewAnalytics(channel)}
                                            className={`flex flex-col h-full relative ${favorites.has(channel.id)
                                                ? 'border-yellow-500/30 bg-slate-800/80 shadow-[0_0_15px_rgba(234,179,8,0.1)]'
                                                : ''
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
                                                    <div className="text-[10px] text-slate-500">{t('channels.stats_subs')}</div>
                                                </div>
                                                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                                                    <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-1">
                                                        <Video className="w-3 h-3" />
                                                    </div>
                                                    <div className="text-sm font-bold text-white">
                                                        {channel.videoCount ?? '-'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">{t('channels.stats_videos')}</div>
                                                </div>
                                                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                                                    <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-1">
                                                        <Eye className="w-3 h-3" />
                                                    </div>
                                                    <div className="text-sm font-bold text-white">
                                                        {channel.viewCount ? formatNumber(Number(channel.viewCount)) : '-'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">{t('channels.stats_views')}</div>
                                                </div>
                                            </div>

                                            {/* Persona Badge */}
                                            {channel.persona && (
                                                <Badge variant="primary" size="md" className="mb-4 w-fit">
                                                    <Sparkles className="w-3 h-3" />
                                                    {channel.persona.name}
                                                </Badge>
                                            )}

                                            {/* Actions */}
                                            <div className="mt-auto flex items-center gap-2">
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    leftIcon={<BarChart2 className="w-4 h-4" />}
                                                    onClick={(e) => { e.stopPropagation(); handleViewAnalytics(channel); }}
                                                    className="flex-1"
                                                >
                                                    {t('channels.analytics_button')}
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); handleSync(channel); }}
                                                    isLoading={syncingIds.has(channel.id)}
                                                    disabled={syncingIds.has(channel.id)}
                                                >
                                                    <RefreshCw className={`w-4 h-4 ${syncingIds.has(channel.id) ? 'animate-spin' : ''}`} />
                                                </Button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
