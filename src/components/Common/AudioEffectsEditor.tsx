import React, { useState } from 'react';
import { Volume2, Plus, Trash2, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

export const AudioEffectsEditor: React.FC<AudioEffectsEditorProps> = ({
    sceneIndex,
    sceneDuration,
    audioEffects = [],
    onUpdate
}) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [localEffects, setLocalEffects] = useState<AudioEffect[]>(audioEffects);

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
        <div className="relative">
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

            {/* Editor Modal */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 space-y-4">
                            <div className="flex items-center justify-between sticky top-0 bg-slate-900 -mt-6 pt-6 pb-3 z-10">
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
                                💡 Adicione efeitos sonoros em momentos específicos da cena para criar impacto emocional.
                                Duração da cena: <b className="text-white">{sceneDuration}s</b>
                            </p>

                            {/* Effects List */}
                            <div className="space-y-3">
                                {localEffects.map((effect, index) => (
                                    <div key={index} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-300">Efeito #{index + 1}</span>
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
                                                    Volume
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
                                                <span className="text-[10px] text-slate-500">{Math.round(effect.volume * 100)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {localEffects.length === 0 && (
                                    <div className="text-center py-8 text-slate-500 text-sm">
                                        Nenhum efeito adicionado
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
                            <div className="flex gap-2 pt-2">
                                {activeCount > 0 && (
                                    <button
                                        onClick={handleClear}
                                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Limpar Tudo
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    Salvar
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
