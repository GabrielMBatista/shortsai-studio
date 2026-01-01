import React, { useState } from 'react';
import { Sparkles, MonitorPlay, Zap, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EffectConfig } from '../../utils/video-effects/canvasEffects';

interface VideoEffectsEditorProps {
    sceneIndex: number;
    effectConfig?: EffectConfig;
    onUpdate: (updates: { effectConfig?: EffectConfig }) => void;
}

export const VideoEffectsEditor: React.FC<VideoEffectsEditorProps> = ({
    sceneIndex,
    effectConfig = {},
    onUpdate
}) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    // Internal state mirrors the object structure of EffectConfig
    const [localConfig, setLocalConfig] = useState<EffectConfig>({ ...effectConfig });

    const handleSave = () => {
        onUpdate({ effectConfig: localConfig });
        setIsOpen(false);
    };

    const handleClear = () => {
        setLocalConfig({});
        onUpdate({ effectConfig: undefined });
        setIsOpen(false);
    };

    // Helper to toggle effects on/off
    const toggleEffect = (key: keyof EffectConfig, defaultVal: any) => {
        setLocalConfig(prev => {
            if (prev[key]) {
                const copy = { ...prev };
                delete copy[key];
                return copy;
            } else {
                return { ...prev, [key]: defaultVal };
            }
        });
    };

    // Helper to update specific parameters of an effect
    const updateEffectParam = (key: keyof EffectConfig, param: string, val: number) => {
        setLocalConfig(prev => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                [param]: val
            } as any
        }));
    };

    // Calculate active effects count
    const activeCount = Object.keys(effectConfig || {}).length;

    return (
        <div className="relative flex items-center gap-2">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border ${activeCount > 0
                    ? 'bg-purple-600/20 border-purple-600/50 text-purple-300 hover:bg-purple-600/30'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                    }`}
                title={t('effects.editor_tooltip', 'Efeitos Visuais')}
            >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                    {activeCount > 0
                        ? t('effects.active_count', { count: activeCount })
                        : 'FX'}
                </span>
            </button>

            {/* Active Effects Badges */}
            {activeCount > 0 && (
                <div className="flex -space-x-2 hover:space-x-1 transition-all">
                    {Object.keys(effectConfig || {}).map((key) => {
                        let icon = <Sparkles className="w-3 h-3" />;
                        let colorClass = "bg-slate-700 border-slate-600";
                        let label = key;

                        switch (key) {
                            case 'vignette':
                                icon = <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />;
                                colorClass = "bg-indigo-900/50 border-indigo-500/50";
                                label = "Vignette";
                                break;
                            case 'grain':
                                icon = <div className="w-2.5 h-2.5 rounded-full bg-amber-400 opacity-50 border border-amber-200" />;
                                colorClass = "bg-amber-900/50 border-amber-500/50";
                                label = "Film Grain";
                                break;
                            case 'scanlines':
                                icon = <MonitorPlay className="w-3 h-3 text-teal-400" />;
                                colorClass = "bg-teal-900/50 border-teal-500/50";
                                label = "Scanlines";
                                break;
                            case 'sepia':
                                icon = <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />;
                                colorClass = "bg-orange-900/50 border-orange-500/50";
                                label = "Sepia";
                                break;
                            case 'shake':
                                icon = <Activity className="w-3 h-3 text-red-400" />;
                                colorClass = "bg-red-900/50 border-red-500/50";
                                label = "Camera Shake";
                                break;
                            case 'glitch':
                                icon = <Zap className="w-3 h-3 text-cyan-400" />;
                                colorClass = "bg-cyan-900/50 border-cyan-500/50";
                                label = "Glitch";
                                break;
                            case 'flash':
                                icon = <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />;
                                colorClass = "bg-slate-700 border-white/50";
                                label = "Flash";
                                break;
                        }

                        return (
                            <div key={key}
                                className={`w-6 h-6 rounded-full border flex items-center justify-center shadow-sm relative z-0 hover:z-10 hover:scale-110 transition-all cursor-help ${colorClass}`}
                                title={label}
                            >
                                {icon}
                            </div>
                        );
                    })}
                </div>
            )}


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
                        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto p-6 space-y-4">
                            <div className="flex items-center justify-between sticky top-0 bg-slate-900 -mt-6 pt-6 pb-3 z-10 border-b border-slate-800/50">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-purple-500" />
                                    {t('effects.editor_title', 'Efeitos Visuais')}
                                </h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-slate-500 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-4">

                                {/* Vignette */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${localConfig.vignette ? 'bg-indigo-500' : 'bg-slate-700'}`} />
                                            <span className="text-xs font-medium text-slate-300">Vignette (Borda Escura)</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!!localConfig.vignette}
                                                onChange={() => toggleEffect('vignette', { strength: 0.5 })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                    {localConfig.vignette && (
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={localConfig.vignette.strength}
                                            onChange={(e) => updateEffectParam('vignette', 'strength', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                    )}
                                </div>

                                {/* Film Grain */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${localConfig.grain ? 'bg-amber-600' : 'bg-slate-700'}`} />
                                            <span className="text-xs font-medium text-slate-300">Film Grain (Ruído)</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!!localConfig.grain}
                                                onChange={() => toggleEffect('grain', { intensity: 20 })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                                        </label>
                                    </div>
                                    {localConfig.grain && (
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="5"
                                            value={localConfig.grain.intensity}
                                            onChange={(e) => updateEffectParam('grain', 'intensity', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                        />
                                    )}
                                </div>

                                {/* Scanlines */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <MonitorPlay className={`w-3.5 h-3.5 ${localConfig.scanlines ? 'text-teal-400' : 'text-slate-600'}`} />
                                            <span className="text-xs font-medium text-slate-300">Scanlines (TV Retro)</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!!localConfig.scanlines}
                                                onChange={() => toggleEffect('scanlines', { intensity: 0.2, spacing: 4 })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                                        </label>
                                    </div>
                                    {localConfig.scanlines && (
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={localConfig.scanlines.intensity}
                                            onChange={(e) => updateEffectParam('scanlines', 'intensity', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                                        />
                                    )}
                                </div>

                                {/* Sepia Filter */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${localConfig.sepia ? 'bg-orange-400' : 'bg-slate-700'}`} />
                                            <span className="text-xs font-medium text-slate-300">Sepia Filter</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!!localConfig.sepia}
                                                onChange={() => toggleEffect('sepia', { intensity: 0.5 })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                                        </label>
                                    </div>
                                    {localConfig.sepia && (
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={localConfig.sepia.intensity}
                                            onChange={(e) => updateEffectParam('sepia', 'intensity', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                        />
                                    )}
                                </div>

                                {/* Camera Shake */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Activity className={`w-3.5 h-3.5 ${localConfig.shake ? 'text-red-400' : 'text-slate-600'}`} />
                                            <span className="text-xs font-medium text-slate-300">Camera Shake</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!!localConfig.shake}
                                                onChange={() => toggleEffect('shake', { intensity: 5 })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                                        </label>
                                    </div>
                                    {localConfig.shake && (
                                        <input
                                            type="range"
                                            min="1"
                                            max="20"
                                            step="1"
                                            value={localConfig.shake.intensity}
                                            onChange={(e) => updateEffectParam('shake', 'intensity', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                                        />
                                    )}
                                </div>

                                {/* Glitch Effect */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Zap className={`w-3.5 h-3.5 ${localConfig.glitch ? 'text-cyan-400' : 'text-slate-600'}`} />
                                            <span className="text-xs font-medium text-slate-300">Digital Glitch</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!!localConfig.glitch}
                                                onChange={() => toggleEffect('glitch', { intensity: 0.3, seed: 1 })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                                        </label>
                                    </div>
                                    {localConfig.glitch && (
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={localConfig.glitch.intensity}
                                            onChange={(e) => updateEffectParam('glitch', 'intensity', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                        />
                                    )}
                                </div>

                                {/* Flash (Strobe) */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${localConfig.flash ? 'bg-white' : 'bg-slate-700'}`} />
                                            <span className="text-xs font-medium text-slate-300">Flash (Strobe)</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!!localConfig.flash}
                                                onChange={() => toggleEffect('flash', { intensity: 0.3 })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-white rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-500"></div>
                                        </label>
                                    </div>
                                    {localConfig.flash && (
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={localConfig.flash.intensity}
                                            onChange={(e) => updateEffectParam('flash', 'intensity', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white"
                                        />
                                    )}
                                </div>

                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-4 border-t border-slate-800/50">
                                {activeCount > 0 && (
                                    <button
                                        onClick={handleClear}
                                        className="px-3 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg text-xs font-semibold transition-colors"
                                    >
                                        Limpar
                                    </button>
                                )}
                                <div className="flex-1" />
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-lg shadow-purple-900/20"
                                >
                                    Aplicar FX
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
