import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Youtube, RefreshCw, Clock, X, BarChart2, ThumbsUp, MessageCircle, Eye, Calendar, Tag } from 'lucide-react';

interface Channel {
    id: string;
    accountId: string;
    name: string;
    email?: string;
    thumbnail?: string;
    statistics?: {
        subscriberCount: string;
        videoCount: string;
        viewCount: string;
    };
    provider: string;
    lastSync: string;
    status: 'active' | 'inactive' | 'error';
}

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

    // Helper to format ISO duration (PT1H2M10S -> 01:02:10)
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
                                    {/* Thumbnail */}
                                    <div className="relative shrink-0 w-full md:w-48 aspect-video rounded-lg overflow-hidden bg-slate-900">
                                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                                        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                                            {formatDuration(video.duration)}
                                        </div>
                                    </div>

                                    {/* Content */}
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

                                        {/* Stats Grid */}
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

                                        {/* Tags */}
                                        {video.tags && video.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-auto">
                                                {video.tags.slice(0, 5).map(tag => (
                                                    <span key={tag} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded-full border border-slate-700">
                                                        <Tag className="w-2.5 h-2.5" />
                                                        {tag}
                                                    </span>
                                                ))}
                                                {video.tags.length > 5 && (
                                                    <span className="text-[10px] text-slate-500 px-1 py-0.5 self-center">+{video.tags.length - 5}</span>
                                                )}
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

// Main Component
const ChannelsPage: React.FC = () => {
    const { t } = useTranslation();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Analytics Stats
    const [selectedChannel, setSelectedChannel] = useState<{ id: string, name: string, accountId: string } | null>(null);
    const [channelVideos, setChannelVideos] = useState<VideoAnalytics[]>([]);
    const [isLoadingVideos, setIsLoadingVideos] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL || '/api';

    const fetchData = async () => {
        try {
            const channelsRes = await fetch(`${apiUrl}/channels`);
            if (channelsRes.ok) setChannels(await channelsRes.json());
        } catch (error) {
            console.error("Failed to fetch channel data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchChannelVideos = async (channelId: string, accountId: string, name: string) => {
        setSelectedChannel({ id: channelId, accountId, name });
        setIsLoadingVideos(true);
        setChannelVideos([]); // Clear previous

        try {
            const res = await fetch(`${apiUrl}/channels/${channelId}/videos?accountId=${accountId}`);
            if (res.ok) {
                const data = await res.json();
                setChannelVideos(data);
            } else {
                console.error("Failed to fetch videos");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingVideos(false);
        }
    };

    const handleConnect = () => {
        // Authenticated users need to force a re-auth to add new accounts.
        // Using form submit to force correct flow in Auth.js v5 which prefers POST
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `${apiUrl}/auth/signin/google`;

        const callbackInput = document.createElement('input');
        callbackInput.type = 'hidden';
        callbackInput.name = 'callbackUrl';
        callbackInput.value = window.location.origin;
        form.appendChild(callbackInput);

        document.body.appendChild(form);
        form.submit();
    };

    const formatNumber = (num?: string) => {
        if (!num) return '0';
        const n = parseInt(num);
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n.toString();
    };

    return (
        <div className="flex-1 bg-[#0f172a] p-4 md:p-8 min-h-screen animate-fade-in relative">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{t('channels.title', 'Channel Manager')}</h1>
                        <p className="text-slate-400">{t('channels.subtitle', 'Manage your connected YouTube channels')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleConnect}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-red-600/20"
                        >
                            <Plus className="w-5 h-5" />
                            {t('channels.connect_new', 'Connect Channel')}
                        </button>
                    </div>
                </div>

                {/* Connected Channels Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {channels.length > 0 ? (
                        channels.map(channel => (
                            <div key={channel.id} className={`bg-slate-800/50 border ${channel.status === 'error' ? 'border-red-500/50' : 'border-slate-700/50'} rounded-xl p-6 backdrop-blur-sm hover:bg-slate-800 transition-colors group relative overflow-hidden`}>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-red-600/20 transition-colors"></div>

                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            {channel.thumbnail ? (
                                                <img src={channel.thumbnail} alt={channel.name} className="w-12 h-12 rounded-full border-2 border-slate-700" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-lg">
                                                    {channel.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-1">
                                                <Youtube className="w-4 h-4 text-red-500" />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold truncate max-w-[150px]" title={channel.name}>{channel.name}</h3>
                                            {channel.email && (
                                                <p className="text-[10px] text-slate-500 truncate max-w-[150px] mb-0.5" title={channel.email}>
                                                    {channel.email}
                                                </p>
                                            )}
                                            <p className="text-xs text-slate-400 capitalize flex items-center gap-1">
                                                {channel.provider} • <span className={channel.status === 'error' ? 'text-red-400' : ''}>{channel.status}</span>
                                            </p>
                                            {channel.status === 'error' && (
                                                <button onClick={handleConnect} className="text-xs text-red-400 hover:text-red-300 underline mt-1 flex items-center gap-1">
                                                    <RefreshCw className="w-3 h-3" /> Reconnect
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {channel.status === 'active' && <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>}
                                </div>

                                <div className="grid grid-cols-3 gap-2 py-4 border-t border-slate-700/50 mb-4">
                                    <div className="text-center">
                                        <p className="text-lg font-bold text-white">{formatNumber(channel.statistics?.subscriberCount)}</p>
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Subs</p>
                                    </div>
                                    <div className="text-center border-l border-slate-700/50">
                                        <p className="text-lg font-bold text-white">{formatNumber(channel.statistics?.videoCount)}</p>
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Videos</p>
                                    </div>
                                    <div className="text-center border-l border-slate-700/50">
                                        <p className="text-lg font-bold text-white">{formatNumber(channel.statistics?.viewCount)}</p>
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Views</p>
                                    </div>
                                </div>

                                {/* Action Button */}
                                {channel.status === 'active' && (
                                    <button
                                        onClick={() => fetchChannelVideos(channel.id, channel.accountId, channel.name)}
                                        className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors border border-slate-600/30"
                                    >
                                        <BarChart2 className="w-4 h-4" />
                                        Analyze Content
                                    </button>
                                )}

                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-3 pt-2 border-t border-slate-700/30">
                                    <Clock className="w-3.5 h-3.5" />
                                    Last synced: {new Date(channel.lastSync).toLocaleDateString()}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-800/20">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4 text-slate-600">
                                <Youtube className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-1">{isLoading ? 'Loading channels...' : 'No channels connected'}</h3>
                            <p className="text-slate-400 mb-4">Connect your YouTube account to see your channel stats.</p>
                            <button
                                onClick={handleConnect}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Connect Now
                            </button>
                        </div>
                    )}
                </div>

                {/* Analytics Modal */}
                <ChannelVideosModal
                    isOpen={!!selectedChannel}
                    onClose={() => setSelectedChannel(null)}
                    channelName={selectedChannel?.name || ''}
                    videos={channelVideos}
                    isLoading={isLoadingVideos}
                />
            </div>
        </div>
    );
};

export default ChannelsPage;
