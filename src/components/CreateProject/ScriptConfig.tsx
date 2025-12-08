import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, Clock, ChevronDown } from 'lucide-react';
import { AVAILABLE_LANGUAGES } from '../../types';

interface ScriptConfigProps {
    topic: string;
    setTopic: (value: string) => void;
    language: string;
    setLanguage: (value: string) => void;
    minDuration: number | '';
    setMinDuration: (value: number | '') => void;
    maxDuration: number | '';
    setMaxDuration: (value: number | '') => void;
    targetScenes: string;
    setTargetScenes: (value: string) => void;
    isBusy: boolean;
    bulkProjectsCount: number;
}

export const ScriptConfig: React.FC<ScriptConfigProps> = ({
    topic, setTopic,
    language, setLanguage,
    minDuration, setMinDuration,
    maxDuration, setMaxDuration,
    targetScenes, setTargetScenes,
    isBusy,
    bulkProjectsCount
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl hover:border-slate-600 transition-colors">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <Layers className="w-4 h-4 text-indigo-400" />
                    </div>
                    {t('input.concept_title')}
                </h3>
                <p className="text-sm text-slate-500 ml-9">{t('input.concept_subtitle')}</p>
            </div>

            <div className="space-y-4">
                <div className="relative group">
                    <label htmlFor="topic" className="sr-only">Topic</label>
                    <textarea
                        id="topic"
                        name="topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder={t('input.topic_placeholder')}
                        className={`w-full bg-slate-900/50 border rounded-xl px-4 py-4 text-white text-lg placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/50 outline-none h-32 resize-none transition-all group-hover:bg-slate-900 ${bulkProjectsCount > 0 ? 'border-green-500/50 focus:border-green-500' : 'border-slate-700 focus:border-indigo-500'
                            }`}
                        disabled={isBusy}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-slate-600 font-mono">
                        {bulkProjectsCount > 0
                            ? <span className="text-green-400 font-bold flex items-center gap-1"><Layers className="w-3 h-3" /> {bulkProjectsCount} Projects Detected</span>
                            : t('input.chars_count', { count: topic.length })
                        }
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="language" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{t('input.output_language')}</label>
                        <div className="relative">
                            <select
                                id="language"
                                name="language"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white appearance-none cursor-pointer hover:border-slate-600 transition-colors"
                                disabled={isBusy}
                            >
                                {AVAILABLE_LANGUAGES.map((l) => <option key={l.code} value={l.label}>{l.label}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
                        </div>
                    </div>

                    {/* DURATION CONFIG */}
                    <div className="flex flex-col">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {t('input.target_duration')}
                        </label>
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-3">
                            <label htmlFor="minDuration" className="sr-only">Min Duration</label>
                            <input
                                id="minDuration"
                                name="minDuration"
                                type="number" min="5" max="300"
                                value={minDuration}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setMinDuration(v === '' ? '' : parseInt(v));
                                }}
                                className="w-16 bg-transparent text-white text-center outline-none border-b border-transparent focus:border-indigo-500 transition-colors"
                                placeholder="Min"
                                disabled={isBusy}
                            />
                            <span className="text-slate-500 text-xs">{t('input.to')}</span>
                            <label htmlFor="maxDuration" className="sr-only">Max Duration</label>
                            <input
                                id="maxDuration"
                                name="maxDuration"
                                type="number" min="5" max="300"
                                value={maxDuration}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setMaxDuration(v === '' ? '' : parseInt(v));
                                }}
                                className="w-16 bg-transparent text-white text-center outline-none border-b border-transparent focus:border-indigo-500 transition-colors"
                                placeholder="Max"
                                disabled={isBusy}
                            />
                        </div>
                    </div>
                </div>

                {/* SCENE COUNT CONFIG */}
                <div className="bg-indigo-500/5 rounded-xl p-3 border border-indigo-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        <label htmlFor="targetScenes" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('input.scene_count')}</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            id="targetScenes"
                            name="targetScenes"
                            type="number" min="0" max="50"
                            value={targetScenes}
                            onChange={(e) => setTargetScenes(e.target.value)}
                            className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-center text-sm outline-none focus:border-indigo-500"
                            placeholder={t('input.auto')}
                            disabled={isBusy}
                        />
                        <span className="text-[10px] text-slate-500">{t('input.leave_empty_auto')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
