import React, { useState } from 'react';
import { Youtube, Plus, MoreVertical, Edit2, Trash2, ChevronLeft, ChevronRight, PanelLeft, Sparkles, Star, Users, Video as VideoIcon, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Channel } from '../types/personas';
import { formatNumber } from '../utils/format';

interface ChannelSidebarListProps {
    channels: Channel[];
    selectedChannelId: string | null;
    onSelectChannel: (channelId: string | null) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    className?: string;
    isLoading?: boolean;
}

export default function ChannelSidebarList({
    channels,
    selectedChannelId,
    onSelectChannel,
    isCollapsed,
    onToggleCollapse,
    className,
    isLoading
}: ChannelSidebarListProps) {
    const { t } = useTranslation();
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    return (
        <div className={`bg-slate-900 md:bg-slate-900/50 border-r border-slate-800 flex flex-col gap-2 h-screen transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} ${className || ''}`}>
            {/* Header */}
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-4 mb-2`}>
                {!isCollapsed && <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Channels</h3>}
                <div className="flex gap-1">
                    <button
                        onClick={onToggleCollapse}
                        className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                    >
                        {isCollapsed ? (
                            <div className="flex items-center gap-0.5"><PanelLeft className="w-4 h-4" /><ChevronRight className="w-3 h-3" /></div>
                        ) : (
                            <div className="flex items-center gap-0.5"><ChevronLeft className="w-3 h-3" /><PanelLeft className="w-4 h-4 rotate-180" /></div>
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {/* All Channels */}
                <button
                    onClick={() => onSelectChannel(null)}
                    className={`flex items-center gap-3 px-3 py-2 w-full rounded-lg transition-colors text-sm font-medium ${selectedChannelId === null
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        } ${isCollapsed ? 'justify-center flex-col gap-1 py-3' : ''}`}
                    title={isCollapsed ? 'All Channels' : undefined}
                >
                    <Youtube className="w-4 h-4 flex-shrink-0" />
                    {!isCollapsed ? (
                        <>
                            <span className="truncate flex-1 text-left">All Channels</span>
                            {channels.length > 0 && <span className="text-xs text-slate-500">({channels.length})</span>}
                        </>
                    ) : <span className="text-[10px] font-bold">ALL</span>}
                </button>

                {/* Channel List */}
                <div className="space-y-1 pt-1">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={`h-9 rounded-lg bg-slate-800/50 animate-pulse ${isCollapsed ? 'mx-1' : ''}`} />
                        ))
                    ) : (
                        channels.map(channel => {
                            const isSelected = selectedChannelId === channel.id;

                            return (
                                <div
                                    key={channel.id}
                                    className="rounded-lg transition-colors"
                                >
                                    <div
                                        className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer ${isSelected
                                                ? 'bg-indigo-500/20 text-indigo-400'
                                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                            } ${isCollapsed ? 'justify-center flex-col gap-1 py-3' : ''}`}
                                        onClick={() => onSelectChannel(channel.id)}
                                        title={isCollapsed ? channel.name : undefined}
                                    >
                                        <div className={`flex items-center gap-2 truncate ${isCollapsed ? 'justify-center w-full flex-col gap-1' : ''}`}>
                                            {channel.thumbnail ? (
                                                <img
                                                    src={channel.thumbnail}
                                                    alt={channel.name}
                                                    className="w-6 h-6 rounded-full flex-shrink-0"
                                                />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                    {getInitials(channel.name)}
                                                </div>
                                            )}

                                            {!isCollapsed ? (
                                                <>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="truncate font-medium">{channel.name}</div>
                                                        {channel.subscriberCount && (
                                                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                                                <Users className="w-2.5 h-2.5" />
                                                                {formatNumber(channel.subscriberCount)}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {channel.persona && (
                                                        <Sparkles className="w-3 h-3 text-indigo-400 flex-shrink-0" title={channel.persona.name} />
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-[10px] font-bold">{getInitials(channel.name)}</span>
                                            )}
                                        </div>

                                        {!isCollapsed && (
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMenuOpenId(menuOpenId === channel.id ? null : channel.id);
                                                    }}
                                                    className={`p-1 rounded hover:bg-slate-700 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ${menuOpenId === channel.id ? 'opacity-100 bg-slate-700' : ''}`}
                                                >
                                                    <MoreVertical className="w-3 h-3" />
                                                </button>

                                                {menuOpenId === channel.id && (
                                                    <div className="absolute right-0 top-6 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setMenuOpenId(null);
                                                                // TODO: View analytics
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                                                        >
                                                            <Eye className="w-3 h-3" /> View Analytics
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setMenuOpenId(null);
                                                                // TODO: Manage persona
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                                                        >
                                                            <Sparkles className="w-3 h-3" /> Manage Persona
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
