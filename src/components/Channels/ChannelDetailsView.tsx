import React from 'react';
import { Youtube, BarChart2, Calendar, ThumbsUp, MessageCircle, Tag, Eye } from 'lucide-react';
import { Card } from '../ui';

interface VideoAnalytics {
    id: string;
    title: string;
    url: string;
    thumbnail?: string;
    description?: string;
    publishedAt?: string;
    tags?: string[];
    stats: {
        views: number;
        likes: number;
        comments: number;
    };
}

interface ChannelDetailsViewProps {
    channelName: string;
    videos: VideoAnalytics[];
    isLoading: boolean;
}

export function ChannelDetailsView({ channelName, videos, isLoading }: ChannelDetailsViewProps) {
    const [activeTab, setActiveTab] = React.useState<'overview' | 'videos'>('overview');
    const [expandedDescriptions, setExpandedDescriptions] = React.useState<Set<string>>(new Set());

    // Stats
    const totalViews = videos.reduce((sum, v) => sum + v.stats.views, 0);
    const totalLikes = videos.reduce((sum, v) => sum + v.stats.likes, 0);
    const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;
    const engagementRate = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(2) : '0';
    const topVideo = videos.length > 0 ? [...videos].sort((a, b) => b.stats.views - a.stats.views)[0] : null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <BarChart2 className="w-7 h-7 text-indigo-400" />
                        {channelName}
                    </h2>
                    <p className="text-slate-400 mt-1">Video Analytics & Insights</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('videos')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'videos' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                    Videos ({videos.length})
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <Card key={i} variant="glass" padding="md" className="animate-pulse">
                            <div className="flex gap-4">
                                <div className="w-32 h-20 bg-slate-700 rounded-lg"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                                    <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : videos.length === 0 ? (
                <Card variant="glass" padding="lg" className="text-center py-12">
                    <Youtube className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No videos found</p>
                </Card>
            ) : (
                <>
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card variant="glass" padding="md">
                                    <div className="text-xs text-slate-500 mb-1">Total Views</div>
                                    <div className="text-2xl font-bold text-white">{totalViews.toLocaleString()}</div>
                                </Card>
                                <Card variant="glass" padding="md">
                                    <div className="text-xs text-slate-500 mb-1">Avg Views</div>
                                    <div className="text-2xl font-bold text-emerald-400">{avgViews.toLocaleString()}</div>
                                </Card>
                                <Card variant="glass" padding="md">
                                    <div className="text-xs text-slate-500 mb-1">Total Likes</div>
                                    <div className="text-2xl font-bold text-white">{totalLikes.toLocaleString()}</div>
                                </Card>
                                <Card variant="glass" padding="md">
                                    <div className="text-xs text-slate-500 mb-1">Engagement</div>
                                    <div className="text-2xl font-bold text-indigo-400">{engagementRate}%</div>
                                </Card>
                            </div>

                            {/* Top Video */}
                            {topVideo && (
                                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-6">
                                    <div className="text-sm font-semibold text-indigo-300 mb-4 flex items-center gap-2">
                                        <span className="text-xl">🏆</span> Top Performing Video
                                    </div>
                                    <div className="flex gap-4">
                                        {topVideo.thumbnail && (
                                            <img
                                                src={topVideo.thumbnail}
                                                alt={topVideo.title}
                                                className="w-48 h-28 rounded-lg object-cover flex-shrink-0"
                                            />
                                        )}
                                        <div className="flex-1">
                                            <h3 className="text-white font-semibold mb-3 text-lg">{topVideo.title}</h3>
                                            <div className="flex items-center gap-6 text-sm text-slate-300">
                                                <span className="flex items-center gap-1">
                                                    <Eye className="w-4 h-4" /> {topVideo.stats.views.toLocaleString()} views
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <ThumbsUp className="w-4 h-4" /> {topVideo.stats.likes.toLocaleString()} likes
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MessageCircle className="w-4 h-4" /> {topVideo.stats.comments.toLocaleString()} comments
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'videos' && (
                        <div className="space-y-3">
                            {videos.map(video => (
                                <Card key={video.id} variant="glass" padding="md" hoverable>
                                    <div className="flex gap-4">
                                        {video.thumbnail && (
                                            <img
                                                src={video.thumbnail}
                                                alt={video.title}
                                                className="w-48 h-28 rounded-lg object-cover flex-shrink-0"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-semibold mb-2 line-clamp-2">{video.title}</h3>

                                            {video.description && (
                                                <div className="mb-3">
                                                    <p className={`text-sm text-slate-400 ${!expandedDescriptions.has(video.id) && video.description.length > 150 ? 'line-clamp-2' : ''}`}>
                                                        {video.description}
                                                    </p>
                                                    {video.description.length > 150 && (
                                                        <button
                                                            onClick={() => {
                                                                const next = new Set(expandedDescriptions);
                                                                if (expandedDescriptions.has(video.id)) next.delete(video.id);
                                                                else next.add(video.id);
                                                                setExpandedDescriptions(next);
                                                            }}
                                                            className="text-xs text-indigo-400 hover:text-indigo-300 mt-1"
                                                        >
                                                            {expandedDescriptions.has(video.id) ? 'Show less' : 'Show more'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-4 text-xs text-slate-400 mb-2">
                                                <div className="flex items-center gap-1"><Eye className="w-3 h-3" />{video.stats.views.toLocaleString()}</div>
                                                <div className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{video.stats.likes.toLocaleString()}</div>
                                                <div className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{video.stats.comments.toLocaleString()}</div>
                                                {video.publishedAt && <div className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(video.publishedAt).toLocaleDateString()}</div>}
                                            </div>

                                            {video.tags && video.tags.length > 0 && (
                                                <div className="flex items-start gap-1 flex-wrap">
                                                    <Tag className="w-3 h-3 text-slate-500 mt-0.5 flex-shrink-0" />
                                                    {video.tags.map(tag => <span key={tag} className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">{tag}</span>)}
                                                </div>
                                            )}
                                        </div>
                                        <a
                                            href={video.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded-lg transition-colors flex items-center gap-1 h-fit"
                                        >
                                            <Youtube className="w-3 h-3" />
                                            Watch
                                        </a>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
