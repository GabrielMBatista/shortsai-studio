import React, { useState } from 'react';
import { Sparkles, Plus, MoreVertical, Edit2, Trash2, ChevronLeft, ChevronRight, PanelLeft, Star, Crown, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Persona } from '../types/personas';

interface PersonaSidebarListProps {
    personas: Persona[];
    selectedPersonaId: string | null;
    onSelectPersona: (personaId: string | null) => void;
    onCreatePersona: () => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    className?: string;
    isLoading?: boolean;
}

export default function PersonaSidebarList({
    personas,
    selectedPersonaId,
    onSelectPersona,
    onCreatePersona,
    isCollapsed,
    onToggleCollapse,
    className,
    isLoading
}: PersonaSidebarListProps) {
    const { t } = useTranslation();
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    const getAvatarColor = (name: string) => {
        const colors = [
            'from-indigo-500 to-purple-500',
            'from-emerald-500 to-cyan-500',
            'from-amber-500 to-orange-500',
            'from-pink-500 to-rose-500',
            'from-blue-500 to-indigo-500',
        ];
        const index = name.length % colors.length;
        return colors[index];
    };

    const categories = React.useMemo(() => {
        const cats = new Set(personas.map(p => p.category).filter(Boolean));
        return ['all', ...Array.from(cats)];
    }, [personas]);

    const filteredPersonas = React.useMemo(() => {
        if (selectedCategory === 'all') return personas;
        return personas.filter(p => p.category === selectedCategory);
    }, [personas, selectedCategory]);

    return (
        <div className={`bg-slate-900 md:bg-slate-900/50 border-r border-slate-800 flex flex-col gap-2 h-screen transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'} ${className || ''}`}>
            {/* Header */}
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-4 mb-2`}>
                {!isCollapsed && <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Personas</h3>}
                <div className="flex gap-1">
                    {!isCollapsed && (
                        <button
                            onClick={onCreatePersona}
                            className="p-1 text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 rounded transition-colors"
                            title="Create Persona"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
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

            {/* Category Filters */}
            {!isCollapsed && (
                <div className="px-2 mb-2">
                    <div className="flex items-center gap-1 mb-2 px-2">
                        <Filter className="w-3 h-3 text-slate-500" />
                        <span className="text-xs text-slate-500 uppercase font-semibold">Filter</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${selectedCategory === cat
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                                    }`}
                            >
                                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {/* All Personas */}
                <button
                    onClick={() => onSelectPersona(null)}
                    className={`flex items-center gap-3 px-3 py-2 w-full rounded-lg transition-colors text-sm font-medium ${selectedPersonaId === null
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        } ${isCollapsed ? 'justify-center flex-col gap-1 py-3' : ''}`}
                    title={isCollapsed ? 'All Personas' : undefined}
                >
                    <Sparkles className="w-4 h-4 flex-shrink-0" />
                    {!isCollapsed ? (
                        <>
                            <span className="truncate flex-1 text-left">All Personas</span>
                            {filteredPersonas.length > 0 && <span className="text-xs text-slate-500">({filteredPersonas.length})</span>}
                        </>
                    ) : <span className="text-[10px] font-bold">ALL</span>}
                </button>

                {/* Persona List */}
                <div className="space-y-1 pt-1">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={`h-10 rounded-lg bg-slate-800/50 animate-pulse ${isCollapsed ? 'mx-1' : ''}`} />
                        ))
                    ) : (
                        filteredPersonas.map(persona => {
                            const isSelected = selectedPersonaId === persona.id;

                            return (
                                <div
                                    key={persona.id}
                                    className="rounded-lg transition-colors"
                                >
                                    <div
                                        className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer ${isSelected
                                            ? 'bg-indigo-500/20 text-indigo-400'
                                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                            } ${isCollapsed ? 'justify-center flex-col gap-1 py-3' : ''}`}
                                        onClick={() => onSelectPersona(persona.id)}
                                        title={isCollapsed ? persona.name : undefined}
                                    >
                                        <div className={`flex items-center gap-2 truncate ${isCollapsed ? 'justify-center w-full flex-col gap-1' : ''}`}>
                                            {/* Avatar */}
                                            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${getAvatarColor(persona.name)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ring-1 ring-white/10`}>
                                                {getInitials(persona.name)}
                                            </div>

                                            {!isCollapsed ? (
                                                <>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="truncate font-medium">{persona.name}</div>
                                                        {persona.category && (
                                                            <div className="text-[10px] text-slate-500">{persona.category}</div>
                                                        )}
                                                    </div>

                                                    {/* Badges */}
                                                    <div className="flex gap-0.5">
                                                        {persona.isOfficial && <Star className="w-3 h-3 text-blue-400 flex-shrink-0" />}
                                                        {persona.isFeatured && <Sparkles className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                                                        {persona.isPremium && <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-[10px] font-bold">{getInitials(persona.name)}</span>
                                            )}
                                        </div>

                                        {!isCollapsed && (
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMenuOpenId(menuOpenId === persona.id ? null : persona.id);
                                                    }}
                                                    className={`p-1 rounded hover:bg-slate-700 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ${menuOpenId === persona.id ? 'opacity-100 bg-slate-700' : ''}`}
                                                >
                                                    <MoreVertical className="w-3 h-3" />
                                                </button>

                                                {menuOpenId === persona.id && (
                                                    <div className="absolute right-0 top-6 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setMenuOpenId(null);
                                                                // TODO: Edit persona
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                                                        >
                                                            <Edit2 className="w-3 h-3" /> Edit
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setMenuOpenId(null);
                                                                // TODO: Delete persona
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                                        >
                                                            <Trash2 className="w-3 h-3" /> Delete
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
