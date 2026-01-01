import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Plus, Trash2, Clock, Play, Square, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../services/api';

interface AudioEffect {
    type: string;
    timing: number; // Segundos
    volume: number; // 0-1
}

interface AudioEffectsEditorProps {
    sceneIndex: number;
    sceneDuration: number;
    audioEffects?: AudioEffect[];
    onUpdate: (updates: { audioEffects?: AudioEffect[] }) => void;
}

const STATIC_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const PreviewButton = ({ type }: { type: string }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const togglePlay = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isPlaying) {
            audioRef.current?.pause();
            audioRef.current = null;
            setIsPlaying(false);
            return;
        }

        // Determine ext. Assuming mp3 for now, or check both. Use source logic if needed.
        // For simplicity, trying mp3.
        const url = `${STATIC_URL}/cinematic-assets/audio/eden-pack/${type}.mp3`;

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.volume = 0.5;

        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
            console.error(`Audio not found: ${url}`);
            setIsPlaying(false);
            // Optionally alert user
        };

        audio.play().catch(err => {
            console.error(err);
            setIsPlaying(false);
        });
        setIsPlaying(true);
    };

    return (
        <button
            onClick={togglePlay}
            className={`p-1.5 rounded transition-all ${isPlaying ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
            title="Preview Sound"
        >
            {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>
    );
};

export const AudioEffectsEditor: React.FC<AudioEffectsEditorProps> = ({
    sceneIndex,
    sceneDuration,
    audioEffects = [],
    onUpdate
}) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [localEffects, setLocalEffects] = useState<AudioEffect[]>(audioEffects);

    useEffect(() => {
        setLocalEffects(audioEffects || []);
    }, [audioEffects, isOpen]);

    const edenPackSounds = [
        { value: 'impact-01', label: 'Impacto Dramático', category: 'Impacto', icon: '💥' },
        { value: 'impact-02', label: 'Boom Grave', category: 'Impacto', icon: '💥' },
        { value: 'impact-03', label: 'Hit Épico', category: 'Impacto', icon: '💥' },
        { value: 'transition-01', label: 'Whoosh Rápido', category: 'Transição', icon: '〰️' },
        { value: 'transition-02', label: 'Swipe Cinematográfico', category: 'Transição', icon: '〰️' },
        { value: 'transition-03', label: 'Rise-Up Tenso', category: 'Transição', icon: '〰️' },
        { value: 'atmosphere-01', label: 'Ambiente Misterioso', category: 'Atmosfera', icon: '🌫️' },
        { value: 'atmosphere-02', label: 'Tensão Grave', category: 'Atmosfera', icon: '🌫️' },
        { value: 'atmosphere-03', label: 'Épico Orquestral', category: 'Atmosfera', icon: '🌫️' },
        { value: 'spiritual-01', label: 'Coro Angelical', category: 'Espiritual', icon: '✨' },
        { value: 'spiritual-02', label: 'Sino Tibetano', category: 'Espiritual', icon: '✨' },
        { value: 'spiritual-03', label: 'Harpa Celestial', category: 'Espiritual', icon: '✨' }
    ];

    const addEffect = () => {
        const newEffect: AudioEffect = {
            type: 'impact-01',
            timing: 0,
            volume: 0.7
        };
        setLocalEffects([...localEffects, newEffect]);
    };

    const removeEffect = (index: number) => {
        setLocalEffects(localEffects.filter((_, i) => i !== index));
    };

    const updateEffect = (index: number, field: keyof AudioEffect, value: any) => {
        const updated = [...localEffects];
        updated[index] = { ...updated[index], [field]: value };
        setLocalEffects(updated);
    };

    const handleSave = () => {
        onUpdate({
            audioEffects: localEffects.length > 0 ? localEffects : undefined
        });
        setIsOpen(false);
    };

    const handleClear = () => {
        setLocalEffects([]);
        onUpdate({ audioEffects: undefined });
        setIsOpen(false);
    };

    const activeCount = audioEffects?.length || 0;

    return (
        <div className="relative flex items-center gap-2">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border ${activeCount > 0
                    ? 'bg-purple-600/20 border-purple-600/50 text-purple-400 hover:bg-purple-600/30'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                    }`}
                title="Efeitos Sonoros (Eden Pack)"
            >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{activeCount > 0 ? `SFX (${activeCount})` : 'SFX'}</span>
            </button>

            {/* Active Effects Badges (Mini Preview) */}
            {activeCount > 0 && (
                <div className="flex -space-x-2 hover:space-x-1 transition-all">
                    {localEffects.slice(0, 3).map((effect, idx) => {
                        const label = edenPackSounds.find(s => s.value === effect.type)?.icon || '🎵';
                        return (
                            <div key={idx}
                                className="w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[10px] shadow-sm relative z-0 hover:z-10 hover:scale-110 transition-all cursor-help"
                                title={`${edenPackSounds.find(s => s.value === effect.type)?.label} (${effect.timing}s)`}
                            >
                                {label}
                            </div>
                        );
                    })}
                    {activeCount > 3 && (
                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[8px] text-slate-400 font-bold z-10">
                            +{activeCount - 3}
                        </div>
                    )}
                </div>
            )}


            {/* Editor Modal */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-[60] p-4 pointer-events-none">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 pointer-events-auto">
                            <div className="flex items-center justify-between sticky top-0 bg-slate-900 -mt-6 pt-6 pb-3 z-10 border-b border-slate-800">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Volume2 className="w-4 h-4 text-purple-500" />
                                    Efeitos Sonoros (Eden Pack)
                                </h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-slate-500 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            <p className="text-[11px] text-slate-400 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                💡 Adicione efeitos sonoros para criar impacto emocional.
                                <br />
                                Duração da cena: <b className="text-white">{sceneDuration}s</b>
                            </p>

                            {/* Effects List */}
                            <div className="space-y-3">
                                {localEffects.map((effect, index) => (
                                    <div key={index} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-3 animate-fade-in">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-300">Efeito #{index + 1}</span>
                                                <PreviewButton type={effect.type} />
                                            </div>
                                            <button
                                                onClick={() => removeEffect(index)}
                                                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                                title="Remover"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div>
                                            <label className="text-xs text-slate-400 mb-1.5 block">Som</label>
                                            <div className="flex gap-2">
                                                <select
                                                    value={effect.type}
                                                    onChange={(e) => updateEffect(index, 'type', e.target.value)}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                >
                                                    {edenPackSounds.map(s => (
                                                        <option key={s.value} value={s.value}>
                                                            {s.icon} {s.label} ({s.category})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-slate-400 mb-1.5 block flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Timing (s)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={sceneDuration}
                                                    step="0.1"
                                                    value={effect.timing}
                                                    onChange={(e) => updateEffect(index, 'timing', parseFloat(e.target.value))}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 mb-1.5 block flex items-center gap-1">
                                                    <Volume2 className="w-3 h-3" />
                                                    Volume ({Math.round(effect.volume * 100)}%)
                                                </label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.1"
                                                    value={effect.volume}
                                                    onChange={(e) => updateEffect(index, 'volume', parseFloat(e.target.value))}
                                                    className="w-full h-9 accent-purple-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {localEffects.length === 0 && (
                                    <div className="text-center py-8 text-slate-500 text-sm flex flex-col items-center gap-2 border-2 border-dashed border-slate-800 rounded-xl">
                                        <Volume2 className="w-8 h-8 opacity-20" />
                                        Nenhum efeito sonoro adicionado
                                    </div>
                                )}
                            </div>

                            {/* Add Button */}
                            <button
                                onClick={addEffect}
                                className="w-full py-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-600/50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Adicionar Efeito
                            </button>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2 border-t border-slate-800 sticky bottom-0 bg-slate-900 pb-2">
                                {localEffects.length > 0 && (
                                    <button
                                        onClick={handleClear}
                                        className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-600/20"
                                    >
                                        Limpar
                                    </button>
                                )}
                                <div className="flex-1" />
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-purple-900/20"
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
