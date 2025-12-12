import React, { useState } from 'react';
import { Channel } from '../types/personas';
import { usePersonas } from '../hooks/usePersonas';
import { useChannels } from '../hooks/useChannels';
import { Sparkles, ChevronDown, Loader2 } from 'lucide-react';

interface ChannelPersonaSelectorProps {
    channel: Channel;
    onUpdate?: (channel: Channel) => void;
}

export default function ChannelPersonaSelector({ channel, onUpdate }: ChannelPersonaSelectorProps) {
    const { personas, loading: loadingPersonas } = usePersonas();
    const { assignPersona } = useChannels();
    const [isOpen, setIsOpen] = useState(false);
    const [updating, setUpdating] = useState(false);

    const handleSelectPersona = async (personaId: string | null) => {
        try {
            setUpdating(true);
            const updated = await assignPersona(channel.id, personaId);
            if (onUpdate) onUpdate(updated);
            setIsOpen(false);
        } catch (error: any) {
            console.error('Failed to assign persona:', error);
            alert(error.message || 'Failed to assign persona');
        } finally {
            setUpdating(false);
        }
    };

    const currentPersona = channel.persona;

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={loadingPersonas || updating}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-800 hover:border-indigo-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-medium text-white">
                        {currentPersona ? currentPersona.name : 'No Persona'}
                    </span>
                    {currentPersona && currentPersona.category && (
                        <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-900/50 rounded">
                            {currentPersona.category}
                        </span>
                    )}
                </div>
                {updating ? (
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                ) : (
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
            </button>

            {/* Dropdown */}
            {isOpen && !loadingPersonas && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Menu */}
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
                        {/* No Persona Option */}
                        <button
                            onClick={() => handleSelectPersona(null)}
                            className={`w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors border-b border-slate-700/50 ${!currentPersona ? 'bg-slate-700/50' : ''
                                }`}
                        >
                            <div className="text-sm font-medium text-slate-400">
                                No Persona (Default)
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                Use standard script generation
                            </div>
                        </button>

                        {/* Personas List */}
                        {personas.map(persona => (
                            <button
                                key={persona.id}
                                onClick={() => handleSelectPersona(persona.id)}
                                className={`w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0 ${currentPersona?.id === persona.id ? 'bg-indigo-900/30 border-indigo-500/30' : ''
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium text-white">
                                            {persona.name}
                                        </div>
                                        {persona.description && (
                                            <div className="text-xs text-slate-400 mt-1 line-clamp-1">
                                                {persona.description}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {persona.isPremium && (
                                            <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                                                PRO
                                            </span>
                                        )}
                                        {persona.isFeatured && (
                                            <Sparkles className="w-3 h-3 text-emerald-400" />
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
