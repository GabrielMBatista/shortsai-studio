import React, { useState } from 'react';
import { useChannels } from '../hooks/useChannels';
import ChannelPersonaSelector from './ChannelPersonaSelector';
import { Youtube, Users, Video, Eye, RefreshCw, BarChart2, Calendar, ThumbsUp, MessageCircle, Tag, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Channel } from '../types/personas';

interface VideoAnalytics {
    id: string;
    title: string;
    description: string;
    publishedAt: string;
    thumbnail: string;
    tags: string[];
    duration: string;
    stats: {
        views: number;
        likes: number;
        comments: number;
    };
    url: string;
}

const ChannelVideosModal = ({
    isOpen,
    onClose,
    channelName,
    videos,
    isLoading
}: {
    isOpen: boolean;
    onClose: () => void;
    channelName: string;
    videos: VideoAnalytics[];
    isLoading: boolean;
}) => {
    if (!isOpen) return null;

    const formatDuration = (iso: string) => {
        if (!iso) return '00:00';
        const match = iso.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        if (!match) return iso;
        const h = (match[1] || '').replace('H', '');
        const m = (match[2] || '').replace('M', '');
        const s = (match[3] || '').replace('S', '');
        const hStr = h ? `${h.padStart(2, '0')}:` : '';
        const mStr = m ? `${m.padStart(2, '0')}:` : '00:';
        const sStr = s ? s.padStart(2, '0') : '00';
        return `${hStr}${mStr}${sStr}`;
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0f172a] border border-slate-700 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-indigo-400" />
                            Analytics: {channelName}
                        </h2>
                        <p className="text-sm text-slate-400">Last 20 uploaded videos performance</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                            <p>Analyzing channel videos...</p>
                        </div>
                    ) : videos.length === 0 ? (
                        <div className="text-center text-slate-500 py-12">No videos found for this channel.</div>
                    ) : (
                        <div className="space-y-4">
                            {videos.map((video) => (
                                <div key={video.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col md:flex-row gap-4 hover:bg-slate-800/60 transition-colors group">
                                    <div className="relative shrink-0 w-full md:w-48 aspect-video rounded-lg overflow-hidden bg-slate-900">
                                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                                        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                                            {formatDuration(video.duration)}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <a href={video.url} target="_blank" rel="noreferrer" className="block">
                                            <h3 className="text-white font-semibold truncate group-hover:text-indigo-400 transition-colors" title={video.title}>
                                                {video.title}
                                            </h3>
                                        </a>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 mb-3">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(video.publishedAt).toLocaleDateString()}
                                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                            {new Date(video.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 max-w-sm mb-3">
                                            <div className="flex items-center gap-2" title="Views">
                                                <Eye className="w-4 h-4 text-emerald-400" />
                                                <span className="text-sm font-medium text-slate-200">{formatNumber(video.stats.views)}</span>
                                            </div>
                                            <div className="flex items-center gap-2" title="Likes">
                                                <ThumbsUp className="w-4 h-4 text-blue-400" />
                                                <span className="text-sm font-medium text-slate-200">{formatNumber(video.stats.likes)}</span>
                                            </div>
                                            <div className="flex items-center gap-2" title="Comments">
                                                <MessageCircle className="w-4 h-4 text-purple-400" />
                                                <span className="text-sm font-medium text-slate-200">{formatNumber(video.stats.comments)}</span>
                                            </div>
                                        </div>
                                        {video.tags && video.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-auto">
                                                {video.tags.slice(0, 5).map(tag => (
                                                    <span key={tag} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded-full border border-slate-700">
                                                        <Tag className="w-2.5 h-2.5" />
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function ChannelsList() {
    const { t } = useTranslation();
    const { channels, loading, error, refetch, updateChannel } = useChannels();
    const [selectedChannel, setSelectedChannel] = useState<{ id: string, name: string } | null>(null);
    const [channelVideos, setChannelVideos] = useState<VideoAnalytics[]>([]);
    const [isLoadingVideos, setIsLoadingVideos] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL || '/api';

    const fetchChannelVideos = async (channel: Channel) => {
        setSelectedChannel({ id: channel.id, name: channel.name });
        setIsLoadingVideos(true);

        const accId = channel.account?.id;

        if (!accId) {
            console.error("Missing accountId for video analytics");
            setIsLoadingVideos(false);
            return;
        }

        try {
            const res = await fetch(`${apiUrl}/channels/${channel.id}/videos?accountId=${accId}`);
            if (res.ok) {
                const data = await res.json();
                setChannelVideos(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingVideos(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading channels...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6 text-center">
                <p className="text-red-400 font-medium">{error}</p>
                <button
                    onClick={refetch}
                    className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (channels.length === 0) {
        return (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-8 text-center border-dashed">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Youtube className="w-10 h-10 text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Channels Connected</h3>
                <p className="text-slate-400 max-w-sm mx-auto mb-6">
                    Connect your YouTube channel to assign personas and track performance.
                </p>
                {/* Note: The parent component handles the connection logic usually, 
                    but here we just show the state. The parent ChannelsPage shows the connect button 
                    if the list is empty or always in header.
                */}
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {/* Header NOT needed here if ChannelsPage provides it, but ChannelsList is self-contained.
                    If used inside ChannelsPage, ChannelsPage has the header. 
                    Let's revert to NOT having a header here to avoid duplication if ChannelsPage has it.
                    Actually, the original had a header "My Channels".
                    I'll keep it simple: Just the grid.
                */}

                {/* Channels Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {channels.map(channel => (
                        <div
                            key={channel.id}
                            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800 transition-all group flex flex-col h-full"
                        >
                            {/* Channel Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    {channel.thumbnail ? (
                                        <img
                                            src={channel.thumbnail}
                                            alt={channel.name}
                                            className="w-12 h-12 rounded-full border-2 border-slate-700"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
                                            <Youtube className="w-6 h-6 text-slate-400" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <h3 className="text-white font-bold truncate max-w-[150px]">
                                            {channel.name}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                            <Youtube className="w-3 h-3 text-red-500" />
                                            YouTube
                                        </div>
                                    </div>
                                </div>
                                <div className={`w-2.5 h-2.5 rounded-full ${channel.isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-600'}`}></div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2 py-4 border-t border-b border-slate-700/50 mb-4 bg-slate-900/30 -mx-6 px-6">
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                                        <Users className="w-3 h-3" />
                                        Subs
                                    </div>
                                    <div className="text-lg font-bold text-white">
                                        {channel.subscriberCount ? formatNumber(channel.subscriberCount) : '-'}
                                    </div>
                                </div>
                                <div className="text-center border-l border-slate-700/50">
                                    <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                                        <Video className="w-3 h-3" />
                                        Videos
                                    </div>
                                    <div className="text-lg font-bold text-white">
                                        {channel.videoCount ?? '-'}
                                    </div>
                                </div>
                                <div className="text-center border-l border-slate-700/50">
                                    <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                                        <Eye className="w-3 h-3" />
                                        Views
                                    </div>
                                    <div className="text-lg font-bold text-white">
                                        {channel.viewCount ? formatNumber(Number(channel.viewCount)) : '-'}
                                    </div>
                                </div>
                            </div>

                            {/* Persona Selector */}
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Tag className="w-3 h-3 text-indigo-400" />
                                    AI Persona
                                </label>
                                <ChannelPersonaSelector
                                    channel={channel}
                                    onUpdate={updateChannel}
                                />
                            </div>

                            {/* Actions */}
                            <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center justify-between gap-3">
                                <button
                                    onClick={() => fetchChannelVideos(channel)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700/30 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                                >
                                    <BarChart2 className="w-3.5 h-3.5" />
                                    Analytics
                                </button>
                            </div>

                            {/* Last Synced */}
                            {channel.lastSyncedAt && (
                                <div className="mt-3 text-[10px] text-center text-slate-600">
                                    Last synced: {new Date(channel.lastSyncedAt).toLocaleString()}
                                </div>
                            )}
                        </div>
                    ))}
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

function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}
