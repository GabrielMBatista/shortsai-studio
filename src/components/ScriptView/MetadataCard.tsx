import React, { useState } from 'react';
import { Check, Copy, Hash } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MetadataCardProps {
    title?: string;
    description?: string;
    shortsHashtags?: string[];
    tiktokText?: string;
    tiktokHashtags?: string[];
}

export const MetadataCard: React.FC<MetadataCardProps> = ({
    title,
    description,
    shortsHashtags,
    tiktokText,
    tiktokHashtags
}) => {
    const { t } = useTranslation();
    const [isCopiedTitle, setIsCopiedTitle] = useState(false);
    const [isCopiedDesc, setIsCopiedDesc] = useState(false);
    const [isCopiedShorts, setIsCopiedShorts] = useState(false);
    const [isCopiedTikTok, setIsCopiedTikTok] = useState(false);

    const copyToClipboard = async (text: string, type: 'title' | 'desc' | 'shorts' | 'tiktok') => {
        try {
            await navigator.clipboard.writeText(text);
            if (type === 'title') {
                setIsCopiedTitle(true);
                setTimeout(() => setIsCopiedTitle(false), 2000);
            } else if (type === 'desc') {
                setIsCopiedDesc(true);
                setTimeout(() => setIsCopiedDesc(false), 2000);
            } else if (type === 'shorts') {
                setIsCopiedShorts(true);
                setTimeout(() => setIsCopiedShorts(false), 2000);
            } else if (type === 'tiktok') {
                setIsCopiedTikTok(true);
                setTimeout(() => setIsCopiedTikTok(false), 2000);
            }
        } catch (err) {
            console.error("Failed to copy", err);
        }
    };

    const displayTitle = title?.trim().startsWith('{') ? t('script.untitled_project') : title;
    const displayDesc = description?.trim().startsWith('{') ? '' : description;

    const formatShortsHashtags = () => {
        if (!shortsHashtags || shortsHashtags.length === 0) return '';
        return shortsHashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
    };

    const formatTikTokContent = () => {
        const parts = [];
        if (tiktokText) parts.push(tiktokText);
        if (tiktokHashtags && tiktokHashtags.length > 0) {
            parts.push(tiktokHashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' '));
        }
        return parts.join('\n\n');
    };

    return (
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 text-indigo-400 mb-4 pb-2 border-b border-white/5">
                <Hash className="w-5 h-5" />
                <span className="font-semibold text-sm">{t('script.ai_generated_metadata')}</span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {/* Title */}
                {displayTitle && (
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">{t('script.title')}</label>
                            <button onClick={() => displayTitle && copyToClipboard(displayTitle, 'title')} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors">
                                {isCopiedTitle ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {isCopiedTitle ? t('script.copied') : t('script.copy')}
                            </button>
                        </div>
                        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-300 text-sm leading-relaxed shadow-inner">
                            {displayTitle}
                        </div>
                    </div>
                )}

                {/* Description */}
                {displayDesc && (
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">{t('script.description')}</label>
                            <button onClick={() => displayDesc && copyToClipboard(displayDesc, 'desc')} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors">
                                {isCopiedDesc ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {isCopiedDesc ? t('script.copied') : t('script.copy')}
                            </button>
                        </div>
                        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-300 text-sm leading-relaxed shadow-inner max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600">
                            {displayDesc}
                        </div>
                    </div>
                )}

                {/* YouTube Shorts Hashtags */}
                {shortsHashtags && shortsHashtags.length > 0 && (
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                                <span className="text-red-400">#</span> {t('script.youtube_shorts')}
                            </label>
                            <button onClick={() => copyToClipboard(formatShortsHashtags(), 'shorts')} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors">
                                {isCopiedShorts ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {isCopiedShorts ? t('script.copied') : t('script.copy')}
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {shortsHashtags.map((tag, i) => (
                                <span key={i} className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-md">
                                    {tag.startsWith('#') ? tag : `#${tag}`}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* TikTok Content */}
                {(tiktokText || (tiktokHashtags && tiktokHashtags.length > 0)) && (
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                                <span className="text-purple-400">#</span> TikTok
                            </label>
                            <button onClick={() => copyToClipboard(formatTikTokContent(), 'tiktok')} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors">
                                {isCopiedTikTok ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {isCopiedTikTok ? t('script.copied') : t('script.copy')}
                            </button>
                        </div>
                        {tiktokText && (
                            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-300 text-sm leading-relaxed shadow-inner mb-2">
                                {tiktokText}
                            </div>
                        )}
                        {tiktokHashtags && tiktokHashtags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tiktokHashtags.map((tag, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs rounded-md">
                                        {tag.startsWith('#') ? tag : `#${tag}`}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
