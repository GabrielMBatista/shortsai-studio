import React, { useState, useMemo } from 'react';
import { Persona } from '../types/personas';
import { usePersonas } from '../hooks/usePersonas';
import { Sparkles, Crown, Star, Filter } from 'lucide-react';

export default function PersonaGallery() {
    const { personas, loading, error } = usePersonas();
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const categories = useMemo(() => {
        const cats = new Set(personas.map(p => p.category).filter(Boolean));
        return ['all', ...Array.from(cats)];
    }, [personas]);

    const filteredPersonas = useMemo(() => {
        if (selectedCategory === 'all') return personas;
        return personas.filter(p => p.category === selectedCategory);
    }, [personas, selectedCategory]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading personas...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6 text-center">
                <p className="text-red-400 font-medium">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-indigo-400" />
                        Persona Library
                    </h2>
                    <p className="text-slate-400 mt-1">Choose your AI scriptwriter style</p>
                </div>
                <div className="text-sm text-slate-500">
                    {filteredPersonas.length} persona{filteredPersonas.length !== 1 ? 's' : ''} available
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-slate-500" />
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === cat
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`}
                    >
                        {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
            </div>

            {/* Grid */}
            {filteredPersonas.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    No personas found for this category
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPersonas.map(persona => (
                        <PersonaCard key={persona.id} persona={persona} />
                    ))}
                </div>
            )}
        </div>
    );
}

function PersonaCard({ persona }: { persona: Persona }) {
    const getBadges = () => {
        const badges = [];
        if (persona.isOfficial) badges.push({ icon: Star, text: 'Official', color: 'text-blue-400' });
        if (persona.isFeatured) badges.push({ icon: Sparkles, text: 'Featured', color: 'text-emerald-400' });
        if (persona.isPremium) badges.push({ icon: Crown, text: 'Premium', color: 'text-amber-400' });
        return badges;
    };

    const badges = getBadges();

    return (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                        {persona.name}
                    </h3>
                    {persona.category && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-slate-700/50 text-slate-400 text-xs rounded">
                            {persona.category}
                        </span>
                    )}
                </div>
            </div>

            {/* Badges */}
            {badges.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {badges.map((badge, i) => (
                        <div key={i} className={`flex items-center gap-1 text-xs ${badge.color}`}>
                            <badge.icon className="w-3 h-3" />
                            <span>{badge.text}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Description */}
            {persona.description && (
                <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                    {persona.description}
                </p>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-700/50">
                <div>
                    <span className="font-medium text-slate-400">{persona.usageCount}</span> uses
                </div>
                <div className="flex items-center gap-3">
                    <div>Temp: <span className="text-slate-400 font-mono">{persona.temperature}</span></div>
                    <div>Type: <span className={`font-medium ${persona.type === 'SYSTEM' ? 'text-blue-400' : 'text-purple-400'}`}>
                        {persona.type}
                    </span></div>
                </div>
            </div>

            {/* Tags */}
            {persona.tags && persona.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                    {persona.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-slate-900/50 text-slate-500 text-[10px] rounded">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
