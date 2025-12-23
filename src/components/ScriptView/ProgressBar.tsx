import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProgressBarProps {
    isGenerating: boolean;
    progress: number;
    generationMessage?: string;
    isPaused?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    isGenerating,
    progress,
    generationMessage,
    isPaused
}) => {
    const { t } = useTranslation();

    return (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <div className="flex items-center gap-2">
                    <span>{t('script.workflow_progress')}</span>
                    {generationMessage && (
                        <span className="text-indigo-400 normal-case ml-2 border-l border-slate-600 pl-2 hidden md:inline animate-pulse">
                            {generationMessage}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isGenerating && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>{Math.round(progress)}%</span>
                </div>
            </div>
            <div className="bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                <div
                    className={`h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_15px_rgba(99,102,241,0.6)] ${isPaused ? 'bg-yellow-500' : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500'}`}
                    style={{ width: `${progress}%`, backgroundSize: '200% 100%' }}
                />
            </div>
        </div>
    );
};
