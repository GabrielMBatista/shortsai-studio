import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Image as ImageIcon, Film, Box, Palette, Sparkles, Paintbrush, Zap, MonitorPlay
} from 'lucide-react';
import { VIDEO_STYLES } from '../../types';

// Icon map for styles
const getStyleIcon = (style: string) => {
    const s = style.toLowerCase();
    if (s.includes('cinematic')) return Film;
    if (s.includes('3d')) return Box;
    if (s.includes('painting') || s.includes('watercolor')) return Palette;
    if (s.includes('anime')) return Sparkles;
    if (s.includes('vector') || s.includes('minimalist')) return Paintbrush;
    if (s.includes('cyberpunk')) return Zap;
    return MonitorPlay;
};

interface StyleSelectorProps {
    style: string;
    setStyle: (style: string) => void;
    isBusy: boolean;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({ style, setStyle, isBusy }) => {
    const { t } = useTranslation();

    return (
        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <ImageIcon className="w-4 h-4 text-indigo-400" />
                    </div>
                    {t('input.visual_style')}
                </h3>
                <p className="text-sm text-slate-500 ml-9">{t('input.visual_style_subtitle')}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {VIDEO_STYLES.map((s) => {
                    const Icon = getStyleIcon(s);
                    const isSelected = style === s;
                    return (
                        <button
                            key={s}
                            type="button"
                            onClick={() => setStyle(s)}
                            disabled={isBusy}
                            className={`relative group p-3 rounded-xl border text-left transition-all duration-200 h-20 flex flex-col justify-between ${isSelected
                                ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-900/50'
                                : 'bg-slate-900/50 border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800'
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`} />
                            <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{s}</span>
                            {isSelected && <div className="absolute inset-0 border-2 border-white/20 rounded-xl" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
