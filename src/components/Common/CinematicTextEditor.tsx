import React, { useState } from 'react';
import { Type, Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CinematicTextEditorProps {
    sceneIndex: number;
    hookText?: string;
    textStyle?: {
        font?: string;
        color?: string;
        position?: 'top' | 'center' | 'bottom';
        size?: 'small' | 'medium' | 'large';
    };
    particleOverlay?: string;
    onUpdate: (updates: { hookText?: string; textStyle?: any; particleOverlay?: string }) => void;
}

export const CinematicTextEditor: React.FC<CinematicTextEditorProps> = ({
    sceneIndex,
    hookText = '',
    textStyle = {},
    particleOverlay,
    onUpdate
}) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [localText, setLocalText] = useState(hookText);
    const [localStyle, setLocalStyle] = useState({
        font: textStyle.font || 'bebas-neue',
        color: textStyle.color || '#FFD700',
        position: textStyle.position || 'center',
        size: textStyle.size || 'large'
    });

    const fontOptions = [
        { value: 'bebas-neue', label: 'Bebas Neue (Impacto)' },
        { value: 'anton', label: 'Anton (Bold)' },
        { value: 'bangers', label: 'Bangers (Cartoon)' },
        { value: 'righteous', label: 'Righteous (Retro)' }
    ];

    const colorPresets = [
        { value: '#FFD700', label: 'Ouro', bg: 'bg-yellow-500' },
        { value: '#FFFFFF', label: 'Branco', bg: 'bg-white' },
        { value: '#FF4444', label: 'Vermelho', bg: 'bg-red-500' },
        { value: '#00F7FF', label: 'Ciano', bg: 'bg-cyan-400' }
    ];

    const positionOptions = [
        { value: 'top', label: 'Topo' },
        { value: 'center', label: 'Centro' },
        { value: 'bottom', label: 'Base' }
    ];

    const sizeOptions = [
        { value: 'small', label: 'Pequeno' },
        { value: 'medium', label: 'Médio' },
        { value: 'large', label: 'Grande' }
    ];

    const particleOptions = [
        { value: '', label: 'Nenhum', icon: '🚫' },
        { value: 'particles-dust', label: 'Poeira', icon: '✨' },
        { value: 'particles-embers', label: 'Faísca', icon: '🔥' },
        { value: 'particles-rain', label: 'Chuva', icon: '🌧️' },
        { value: 'particles-god-rays', label: 'Raios Divinos', icon: '☀️' },
        { value: 'particles-fog', label: 'Névoa', icon: '🌫️' },
        { value: 'particles-sparkles', label: 'Brilhos', icon: '⭐' },
        { value: 'particles-snow', label: 'Neve', icon: '❄️' },
        { value: 'particles-smoke', label: 'Fumaça', icon: '💨' }
    ];

    const [localParticle, setLocalParticle] = useState(particleOverlay || '');

    const handleSave = () => {
        onUpdate({
            hookText: localText || undefined,
            textStyle: localText ? localStyle : undefined,
            particleOverlay: localParticle || undefined
        });
        setIsOpen(false);
    };

    const handleClear = () => {
        setLocalText('');
        setLocalParticle('');
        onUpdate({ hookText: undefined, textStyle: undefined, particleOverlay: undefined });
        setIsOpen(false);
    };

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border ${hookText
                    ? 'bg-yellow-600/20 border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/30'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                    }`}
                title={t('cinematic.hook_text', 'Texto de Impacto (3s)')}
            >
                <Type className="w-3.5 h-3.5" />
                <span>{hookText ? `"${localText.slice(0, 12)}..."` : t('cinematic.add_hook', 'Manchete')}</span>
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
                        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6 space-y-4">
                            <div className="flex items-center justify-between sticky top-0 bg-slate-900 -mt-6 pt-6 pb-3 z-10">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Type className="w-4 h-4 text-yellow-500" />
                                    {t('cinematic.hook_editor', 'Editor de Manchete')}
                                </h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-slate-500 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Text Input */}
                            <div>
                                <label className="text-xs text-slate-400 mb-1.5 block">
                                    {t('cinematic.text', 'Texto (2-4 palavras)')}
                                </label>
                                <input
                                    type="text"
                                    value={localText}
                                    onChange={(e) => setLocalText(e.target.value)}
                                    placeholder="Ex: PARE AGORA"
                                    maxLength={30}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">
                                    {t('cinematic.hint', 'Frases curtas de impacto funcionam melhor')}
                                </p>
                            </div>

                            {/* Style Options */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Font */}
                                <div>
                                    <label className="text-xs text-slate-400 mb-1.5 block">Fonte</label>
                                    <select
                                        value={localStyle.font}
                                        onChange={(e) => setLocalStyle({ ...localStyle, font: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    >
                                        {fontOptions.map(f => (
                                            <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Size */}
                                <div>
                                    <label className="text-xs text-slate-400 mb-1.5 block">Tamanho</label>
                                    <select
                                        value={localStyle.size}
                                        onChange={(e) => setLocalStyle({ ...localStyle, size: e.target.value as any })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    >
                                        {sizeOptions.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Color */}
                            <div>
                                <label className="text-xs text-slate-400 mb-1.5 block flex items-center gap-1.5">
                                    <Palette className="w-3 h-3" />
                                    Cor
                                </label>
                                <div className="flex gap-2">
                                    {colorPresets.map(c => (
                                        <button
                                            key={c.value}
                                            onClick={() => setLocalStyle({ ...localStyle, color: c.value })}
                                            className={`flex-1 h-10 rounded-lg border-2 transition-all ${localStyle.color === c.value
                                                ? 'border-white scale-105'
                                                : 'border-slate-700 hover:border-slate-600'
                                                } ${c.bg}`}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Position */}
                            <div>
                                <label className="text-xs text-slate-400 mb-1.5 block">Posição</label>
                                <div className="flex gap-2">
                                    {positionOptions.map(p => (
                                        <button
                                            key={p.value}
                                            onClick={() => setLocalStyle({ ...localStyle, position: p.value as any })}
                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${localStyle.position === p.value
                                                ? 'bg-yellow-600/20 border-yellow-600 text-yellow-400'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                                }`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Particle Overlay */}
                            <div>
                                <label className="text-xs text-slate-400 mb-1.5 block flex items-center gap-1.5">
                                    ✨ Efeito de Partículas
                                </label>
                                <select
                                    value={localParticle}
                                    onChange={(e) => setLocalParticle(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                >
                                    {particleOptions.map(p => (
                                        <option key={p.value} value={p.value}>
                                            {p.icon} {p.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-slate-500 mt-1">
                                    Efeito visual sobreposto ao vídeo
                                </p>
                            </div>

                            {/* Preview */}
                            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                                <p className="text-[10px] text-slate-500 mb-2">Preview:</p>
                                <div className="relative w-full h-48 bg-gradient-to-br from-slate-800 to-slate-900 rounded overflow-hidden flex items-center justify-center">
                                    {localText && (
                                        <div
                                            className={`absolute ${localStyle.position === 'top' ? 'top-6' :
                                                localStyle.position === 'bottom' ? 'bottom-6' :
                                                    'top-1/2 -translate-y-1/2'
                                                } left-0 right-0 text-center px-3`}
                                        >
                                            <p
                                                className={`font-black uppercase ${localStyle.size === 'small' ? 'text-sm' :
                                                    localStyle.size === 'medium' ? 'text-base' :
                                                        'text-lg'
                                                    }`}
                                                style={{
                                                    color: localStyle.color,
                                                    fontFamily: localStyle.font === 'bebas-neue' ? 'Bebas Neue, sans-serif' : localStyle.font,
                                                    textShadow: '2px 2px 8px rgba(0,0,0,0.8), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                                                    letterSpacing: '0.05em'
                                                }}
                                            >
                                                {localText}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                                {hookText && (
                                    <button
                                        onClick={handleClear}
                                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        {t('common.clear', 'Limpar')}
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                                >
                                    {t('common.cancel', 'Cancelar')}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!localText.trim()}
                                    className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {t('common.save', 'Salvar')}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
