import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, Clock, Sparkles, Send, Loader2, Bot } from 'lucide-react';
import { AVAILABLE_LANGUAGES } from '../../types';
import { Persona } from '../../types/personas';
import { personasApi } from '../../api/personas';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Textarea,
    Select,
    Button,
    Input
} from '../ui';

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
    activePersona?: Persona | null;
    selectedChannelId?: string | null;
}

export const ScriptConfig: React.FC<ScriptConfigProps> = ({
    topic, setTopic,
    language, setLanguage,
    minDuration, setMinDuration,
    maxDuration, setMaxDuration,
    targetScenes, setTargetScenes,
    isBusy,
    bulkProjectsCount,
    activePersona,
    selectedChannelId
}) => {
    const { t } = useTranslation();
    const [personaPrompt, setPersonaPrompt] = useState('');
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

    const handleAskPersona = async () => {
        if (!activePersona || !personaPrompt.trim()) return;

        setIsGeneratingPrompt(true);
        try {
            // Context to guide the persona to generate a topic
            const systemContext = `
You are an expert creative assistant. The user will give you a rough idea or keyword.
Your task is to Write a detailed, engaging VIDEO TITLE and CONCEPT/TOPIC based on that idea.
It should be optimized for a short video script.
Directly output the topic/concept. Do not add conversational filler like "Here is an idea:".
            `.trim();

            const history = [{ role: 'user' as const, parts: [{ text: systemContext }] }];
            const response = await personasApi.chat(
                activePersona.id,
                `Generate a video concept for: ${personaPrompt}`,
                history,
                selectedChannelId || undefined
            );

            // Check if backend returned a job signal (async processing)
            let parsedResponse: any = null;
            try {
                parsedResponse = JSON.parse(response.response);
            } catch {
                // Not JSON, it's a normal text response
            }

            if (parsedResponse && parsedResponse.type === 'job_started') {
                // Backend started an async job, we need to poll
                const jobId = parsedResponse.jobId;
                console.log(`[ScriptConfig] Job started: ${jobId}. Starting polling...`);

                // Poll every 3 seconds
                const pollInterval = setInterval(async () => {
                    try {
                        const jobStatus = await personasApi.getJobStatus(jobId);

                        if (jobStatus.status === 'completed') {
                            clearInterval(pollInterval);
                            setIsGeneratingPrompt(false);

                            // Apply result to topic field
                            if (jobStatus.result) {
                                setTopic(jobStatus.result);
                                setPersonaPrompt(''); // Clear input after success
                            }
                        } else if (jobStatus.status === 'failed') {
                            clearInterval(pollInterval);
                            setIsGeneratingPrompt(false);
                            console.error('[ScriptConfig] Job failed:', jobStatus.error);
                            // Optional: Show toast notification
                        }
                        // If status is 'pending' or 'processing', keep polling
                    } catch (pollError) {
                        console.error('[ScriptConfig] Polling error:', pollError);
                        clearInterval(pollInterval);
                        setIsGeneratingPrompt(false);
                    }
                }, 3000);

                // Safety timeout: stop polling after 5 minutes
                setTimeout(() => {
                    clearInterval(pollInterval);
                    setIsGeneratingPrompt(false);
                    console.warn('[ScriptConfig] Polling timeout reached');
                }, 300000);

            } else {
                // Normal text response, apply immediately
                if (response && response.response) {
                    setTopic(response.response);
                    setPersonaPrompt(''); // Clear input after success
                }
                setIsGeneratingPrompt(false);
            }
        } catch (error) {
            console.error('Failed to ask persona:', error);
            setIsGeneratingPrompt(false);
            // Optional: Show toast error
        }
    };

    return (
        <Card variant="glass" hoverable>
            <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                            <Layers className="w-4 h-4 text-indigo-400" />
                        </div>
                        {t('input.concept_title')}
                    </div>
                </CardTitle>
                <p className="text-sm text-slate-500 ml-9">{t('input.concept_subtitle')}</p>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* AI Persona Prompt Generator */}
                {activePersona && (
                    <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-3 mb-4 animate-fade-in">
                        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                            <Bot className="w-3 h-3" />
                            {t('input.ask_persona_label', { name: activePersona.name })}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={personaPrompt}
                                onChange={(e) => setPersonaPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAskPersona()}
                                placeholder={t('input.ask_persona_placeholder')}
                                className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder:text-slate-600 transition-all"
                                disabled={isGeneratingPrompt || isBusy}
                            />
                            <Button
                                size="sm"
                                variant="primary"
                                onClick={handleAskPersona}
                                disabled={!personaPrompt.trim() || isGeneratingPrompt || isBusy}
                                isLoading={isGeneratingPrompt}
                                className="shrink-0"
                            >
                                <Sparkles className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}

                <div className="relative group">
                    <Textarea
                        label="Topic / Script Concept"
                        id="input-topic"
                        name="topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder={t('input.topic_placeholder')}
                        className={`h-32 ${bulkProjectsCount > 0 ? 'border-green-500/50 focus:border-green-500' : ''}`}
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
                    <Select
                        label={t('input.output_language')}
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        disabled={isBusy}
                    >
                        {AVAILABLE_LANGUAGES.map((l) => <option key={l.code} value={l.label}>{l.label}</option>)}
                    </Select>

                    {/* DURATION CONFIG */}
                    <div className="flex flex-col">
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {t('input.target_duration')}
                        </label>
                        <div id="input-duration" className="flex items-center gap-2 bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-3 h-[50px]">
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
            </CardContent>
        </Card>
    );
};
