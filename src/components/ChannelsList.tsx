import React from 'react';
import { useChannels } from '../hooks/useChannels';
import ChannelPersonaSelector from './ChannelPersonaSelector';
import { Youtube, Users, Video, Eye, RefreshCw } from 'lucide-react';

export default function ChannelsList() {
    const { channels, loading, error, refetch } = useChannels();

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
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-8 text-center">
                <Youtube className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Channels Connected</h3>
                <p className="text-slate-400 mb-6">
                    Connect your YouTube channel to assign personas and track performance
                </p>
                <p className="text-sm text-slate-500">
                    Use the existing Channels page to import your YouTube channels
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Youtube className="w-6 h-6 text-red-500" />
                        My Channels
                    </h2>
                    <p className="text-slate-400 mt-1">Manage content style for each channel</p>
                </div>
                <button
                    onClick={refetch}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Channels Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {channels.map(channel => (
                    <div
                        key={channel.id}
                        className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-indigo-500/30 transition-all"
                    >
                        {/* Channel Header */}
                        <div className="flex items-start gap-4 mb-6">
                            {channel.thumbnail ? (
                                <img
                                    src={channel.thumbnail}
                                    alt={channel.name}
                                    className="w-16 h-16 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                                    <Youtube className="w-8 h-8 text-white" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-white truncate">
                                    {channel.name}
                                </h3>
                                {channel.description && (
                                    <p className="text-sm text-slate-400 line-clamp-2 mt-1">
                                        {channel.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-slate-700/50">
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-1">
                                    <Users className="w-3 h-3" />
                                    Subs
                                </div>
                                <div className="text-lg font-bold text-white">
                                    {channel.subscriberCount ? formatNumber(channel.subscriberCount) : '-'}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-1">
                                    <Video className="w-3 h-3" />
                                    Videos
                                </div>
                                <div className="text-lg font-bold text-white">
                                    {channel.videoCount ?? '-'}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-1">
                                    <Eye className="w-3 h-3" />
                                    Views
                                </div>
                                <div className="text-lg font-bold text-white">
                                    {channel.viewCount ? formatNumber(Number(channel.viewCount)) : '-'}
                                </div>
                            </div>
                        </div>

                        {/* Persona Selector */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Content Style
                            </label>
                            <ChannelPersonaSelector channel={channel} />
                        </div>

                        {/* Last Synced */}
                        {channel.lastSyncedAt && (
                            <div className="mt-4 text-xs text-slate-500">
                                Last synced: {new Date(channel.lastSyncedAt).toLocaleString()}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}
