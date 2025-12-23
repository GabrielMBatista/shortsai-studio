import React, { useState } from 'react';
import { RefreshCw, Check, Copy, LayoutTemplate, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OriginalConceptCardProps {
    topic: string;
    style: string;
    onRegenerate?: () => void;
    isGenerating?: boolean;
    onImport?: (json: string) => void;
}

export const OriginalConceptCard: React.FC<OriginalConceptCardProps> = ({
    topic,
    style,
    onRegenerate,
    isGenerating,
    onImport
}) => {
    const { t } = useTranslation();
    const [isCopied, setIsCopied] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importText, setImportText] = useState('');

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy", err);
        }
    };

    const handleImportSubmit = () => {
        if (onImport && importText.trim()) {
            onImport(importText);
            setIsImporting(false);
            setImportText('');
        }
    };

    return (
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-5 h-full flex flex-col">
            <div className="flex items-center justify-between text-indigo-400 mb-4 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <LayoutTemplate className="w-5 h-5" />
                    <span className="font-semibold text-sm">{t('script.original_concept')}</span>
                </div>
                {onImport && !isImporting && (
                    <button
                        onClick={() => setIsImporting(true)}
                        className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                        title={t('script.import_json', 'Import JSON')}
                    >
                        <Zap className="w-4 h-4" />
                    </button>
                )}
            </div>

            {isImporting ? (
                <div className="flex-1 flex flex-col animate-fade-in-up">
                    <textarea
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-300 text-xs font-mono focus:outline-none focus:border-indigo-500 mb-3 resize-none"
                        placeholder='Paste project JSON here... {"scenes": [...]}'
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsImporting(false)}
                            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleImportSubmit}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold"
                        >
                            Import
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col">
                    <div className="mb-4 flex justify-between items-start">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">{t('script.selected_style')}</label>
                            <span className="inline-block px-2.5 py-1 bg-slate-800 rounded-md border border-slate-700 text-xs text-slate-300 shadow-sm">{style}</span>
                        </div>

                        {onRegenerate && (
                            <button
                                onClick={onRegenerate}
                                disabled={isGenerating}
                                className="px-3 py-1.5 rounded-md border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-300 hover:text-white hover:bg-indigo-500/20 transition-all flex items-center gap-1.5"
                                title={t('script.regenerate_script')}
                            >
                                <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                                {t('script.regenerate_script')}
                            </button>
                        )}
                    </div>
                    <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">{t('script.user_prompt')}</label>
                            <button onClick={() => topic && copyToClipboard(topic)} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors">
                                {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {isCopied ? t('script.copied') : t('script.copy')}
                            </button>
                        </div>
                        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-300 text-sm whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto scrollbar-hide shadow-inner flex-1">
                            {(() => {
                                // Try to parse and pretty-print JSON
                                try {
                                    const parsed = JSON.parse(topic);
                                    return JSON.stringify(parsed, null, 2);
                                } catch {
                                    // Not JSON, show as-is
                                    return topic;
                                }
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
