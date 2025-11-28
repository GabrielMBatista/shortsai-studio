
import React, { useState, useRef, useEffect } from 'react';
import { Scene, AVAILABLE_VOICES, AVAILABLE_LANGUAGES, Voice, TTSProvider, IS_SUNO_ENABLED } from '../types';
import { Sparkles, Waves, Globe, Play, Square, RefreshCw, StopCircle, ImageIcon, PlayCircle, Loader2, Music, Youtube, Check, Copy, ChevronDown, ChevronUp, LayoutTemplate, AlertTriangle, SkipForward, Play as PlayIcon } from 'lucide-react';
import { generatePreviewAudio, getVoices } from '../services/geminiService';
import SceneCard from './script/SceneCard';
import AudioPlayerButton from './common/AudioPlayerButton';

interface ScriptViewProps {
    projectTopic: string;
    projectStyle: string;
    projectVoice: string;
    projectProvider: TTSProvider;
    projectLanguage: string;
    scenes: Scene[];
    generatedTitle?: string;
    generatedDescription?: string;
    onStartImageGeneration: () => void;
    onGenerateImagesOnly: () => void;
    onGenerateAudioOnly: () => void;
    onRegenerateAudio: (newVoice: string, newProvider: TTSProvider, newLanguage: string) => void;
    onRegenerateSceneImage: (sceneIndex: number, force: boolean) => void;
    onRegenerateSceneAudio?: (sceneIndex: number, force: boolean, overrides?: { voice?: string, provider?: TTSProvider, language?: string }) => void;
    onUpdateScene: (index: number, updates: Partial<Scene>) => void;
    isGeneratingImages: boolean; // Renamed concept: now "isGeneratingWorkflow"
    onCancelGeneration?: () => void;
    canPreview: boolean;
    onPreview: () => void;
    includeMusic?: boolean;
    musicStatus?: 'pending' | 'queued' | 'loading' | 'completed' | 'failed' | 'error';
    musicUrl?: string;
    musicPrompt?: string;
    onRegenerateMusic?: () => void;

    isPaused?: boolean;
    fatalError?: string | null;
    onResume?: () => void;
    onSkip?: () => void;
    generationMessage?: string;
    onRemoveScene: (index: number) => void;
}

const MetadataCard: React.FC<{ title?: string; description?: string }> = ({ title, description }) => {
    const [isCopiedTitle, setIsCopiedTitle] = useState(false);
    const [isCopiedDesc, setIsCopiedDesc] = useState(false);

    const copyToClipboard = async (text: string, isTitle: boolean) => {
        try {
            await navigator.clipboard.writeText(text);
            if (isTitle) {
                setIsCopiedTitle(true);
                setTimeout(() => setIsCopiedTitle(false), 2000);
            } else {
                setIsCopiedDesc(true);
                setTimeout(() => setIsCopiedDesc(false), 2000);
            }
        } catch (err) { console.error("Failed to copy", err); }
    };

    return (
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 text-red-400 mb-4 pb-2 border-b border-white/5">
                <Youtube className="w-5 h-5" />
                <span className="font-semibold text-sm">YouTube Shorts Metadata</span>
            </div>
            <div className="space-y-4 flex-1">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Viral Title</label>
                        <button onClick={() => title && copyToClipboard(title, true)} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors">
                            {isCopiedTitle ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {isCopiedTitle ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm shadow-inner min-h-[40px]">{title || "Generating title..."}</div>
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Description & Hashtags</label>
                        <button onClick={() => description && copyToClipboard(description, false)} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors">
                            {isCopiedDesc ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {isCopiedDesc ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-300 text-sm whitespace-pre-wrap shadow-inner min-h-[100px]">{description || "Generating description..."}</div>
                </div>
            </div>
        </div>
    );
};

const OriginalConceptCard: React.FC<{ topic: string; style: string }> = ({ topic, style }) => {
    return (
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 text-indigo-400 mb-4 pb-2 border-b border-white/5">
                <LayoutTemplate className="w-5 h-5" />
                <span className="font-semibold text-sm">Original Concept & Prompt</span>
            </div>
            <div className="flex-1 flex flex-col">
                <div className="mb-4">
                    <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Selected Style</label>
                    <span className="inline-block px-2.5 py-1 bg-slate-800 rounded-md border border-slate-700 text-xs text-slate-300 shadow-sm">{style}</span>
                </div>
                <div className="flex-1 flex flex-col">
                    <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">User Prompt</label>
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-300 text-sm whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto scrollbar-hide shadow-inner flex-1">
                        {topic}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ScriptView: React.FC<ScriptViewProps> = ({
    projectTopic, projectStyle, projectVoice, projectProvider, projectLanguage, scenes,
    generatedTitle, generatedDescription,
    onStartImageGeneration, onGenerateImagesOnly, onGenerateAudioOnly, onRegenerateAudio, onRegenerateSceneImage, onRegenerateSceneAudio, onUpdateScene, isGeneratingImages, onCancelGeneration,
    canPreview, onPreview, includeMusic, musicStatus, musicUrl, musicPrompt, onRegenerateMusic,
    isPaused, fatalError, onResume, onSkip, generationMessage, onRemoveScene
}) => {
    const [selectedProvider, setSelectedProvider] = useState<TTSProvider>(projectProvider);
    const [selectedVoice, setSelectedVoice] = useState(projectVoice);
    const [selectedLanguage, setSelectedLanguage] = useState(projectLanguage);

    const [previewState, setPreviewState] = useState<{ status: 'idle' | 'loading' | 'playing' }>({ status: 'idle' });
    const [showMusicPrompt, setShowMusicPrompt] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const previewAudioRef = useRef<HTMLAudioElement | null>(null);
    const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(false);

    useEffect(() => {
        const loadVoices = async () => {
            setIsLoadingVoices(true);
            if (selectedProvider === 'elevenlabs') {
                try {
                    const voices = await getVoices();
                    setAvailableVoices(voices);
                    if (voices.length > 0) {
                        const currentVoiceExists = voices.find(v => v.name === selectedVoice);
                        if (!currentVoiceExists) setSelectedVoice(voices[0].name);
                    }
                } catch (e) {
                    console.error("Failed to load ElevenLabs voices", e);
                    setAvailableVoices([]);
                }
            } else if (selectedProvider === 'groq') {
                // Import GROQ_VOICES from types
                const { GROQ_VOICES } = await import('../types');
                setAvailableVoices(GROQ_VOICES);
                const currentVoiceExists = GROQ_VOICES.find(v => v.name === selectedVoice);
                if (!currentVoiceExists) setSelectedVoice(GROQ_VOICES[0].name);
            } else {
                setAvailableVoices(AVAILABLE_VOICES);
                const currentVoiceExists = AVAILABLE_VOICES.find(v => v.name === selectedVoice);
                if (!currentVoiceExists) setSelectedVoice(AVAILABLE_VOICES[0].name);
            }
            setIsLoadingVoices(false);
        };
        loadVoices();
    }, [selectedProvider]);

    const completedImages = scenes.filter(s => s.imageStatus === 'completed').length;
    const completedAudio = scenes.filter(s => s.audioStatus === 'completed').length;
    const totalTasks = scenes.length * 2;
    const completedTasks = completedImages + completedAudio;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const handlePreviewVoice = async () => {
        if (previewState.status === 'playing') {
            previewAudioRef.current?.pause();
            setPreviewState({ status: 'idle' });
            return;
        }
        setPreviewState({ status: 'loading' });
        try {
            const voiceObj = availableVoices.find(v => v.name === selectedVoice);
            const sampleText = `Hello, I am ${voiceObj?.label}.`;
            const url = await generatePreviewAudio(sampleText, selectedVoice, selectedProvider);

            const audio = new Audio(url);
            previewAudioRef.current = audio;
            audio.onended = () => setPreviewState({ status: 'idle' });
            await audio.play();
            setPreviewState({ status: 'playing' });
        } catch (e: any) {
            console.error("Preview failed", e);
            setPreviewState({ status: 'idle' });
            alert(e.message || "Failed to generate preview audio.");
        }
    };

    const isSettingsChanged = selectedVoice !== projectVoice || selectedProvider !== projectProvider || selectedLanguage !== projectLanguage;

    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-8 relative">
            {/* PAUSE / ERROR OVERLAY */}
            {isPaused && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-full">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Workflow Paused</h3>
                        </div>
                        <p className="text-slate-300 mb-6">
                            {fatalError ? (
                                <span className="text-red-300 block bg-red-500/10 p-3 rounded-lg border border-red-500/20">{fatalError}</span>
                            ) : "The backend has paused processing."}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={onCancelGeneration} className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold">Abort</button>
                            {onSkip && fatalError && (
                                <button onClick={onSkip} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-600 flex items-center gap-2 text-sm font-semibold">
                                    <SkipForward className="w-4 h-4" /> Skip
                                </button>
                            )}
                            {onResume && (
                                <button onClick={onResume} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg flex items-center gap-2 text-sm font-semibold">
                                    <PlayIcon className="w-4 h-4 fill-current" /> Resume
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <header className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8 backdrop-blur-sm shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
                    {/* Title Section */}
                    <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">{projectStyle}</span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">{projectLanguage}</span>
                        </div>

                        <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight break-words" title={generatedTitle || projectTopic}>
                            {generatedTitle || projectTopic}
                        </h2>
                    </div>

                    {/* Controls Section */}
                    <div className="flex flex-col gap-4 w-full lg:w-auto">

                        {/* Voice & Provider Settings */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/60 p-2 rounded-xl border border-slate-700/60 backdrop-blur-md">

                            {/* Provider Selection */}
                            <div className="flex items-center bg-slate-950/50 rounded-lg p-1 border border-slate-800 w-full sm:w-auto justify-center sm:justify-start">
                                <button
                                    type="button"
                                    onClick={() => setSelectedProvider('gemini')}
                                    className={`p-2 rounded-md transition-all duration-200 ${selectedProvider === 'gemini' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                                    title="Gemini"
                                >
                                    <Sparkles className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedProvider('elevenlabs')}
                                    className={`p-2 rounded-md transition-all duration-200 ${selectedProvider === 'elevenlabs' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                                    title="ElevenLabs"
                                >
                                    <Waves className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedProvider('groq')}
                                    className={`px-3 py-2 rounded-md transition-all duration-200 flex items-center justify-center ${selectedProvider === 'groq' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                                    title="Groq (PlayAI)"
                                >
                                    <span className="font-bold text-[10px] uppercase tracking-wider font-mono">GROQ</span>
                                </button>
                            </div>

                            {/* Divider (Hidden on mobile) */}
                            <div className="hidden sm:block w-px h-8 bg-slate-700/50"></div>

                            {/* Language & Voice Selectors */}
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
                                <div className="flex items-center gap-2 px-2">
                                    <Globe className="w-4 h-4 text-slate-500" />
                                    <select
                                        id="scriptLanguage"
                                        name="scriptLanguage"
                                        value={selectedLanguage}
                                        onChange={(e) => setSelectedLanguage(e.target.value)}
                                        disabled={isGeneratingImages}
                                        className="bg-transparent text-slate-200 text-sm py-1 outline-none cursor-pointer hover:text-white transition-colors appearance-none font-medium min-w-[80px]"
                                    >
                                        {AVAILABLE_LANGUAGES.map(lang => <option key={lang.code} value={lang.label} className="bg-slate-900">{lang.label}</option>)}
                                    </select>
                                </div>

                                <div className="h-4 w-px bg-slate-700/50 hidden sm:block"></div>

                                <div className="flex items-center gap-2">
                                    {isLoadingVoices ? (
                                        <div className="px-2 py-1 text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> <span className="hidden sm:inline">Loading...</span></div>
                                    ) : (
                                        <select
                                            id="scriptVoice"
                                            name="scriptVoice"
                                            value={selectedVoice}
                                            onChange={(e) => setSelectedVoice(e.target.value)}
                                            disabled={isGeneratingImages}
                                            className="bg-transparent text-white text-sm py-1 outline-none cursor-pointer hover:text-indigo-300 transition-colors appearance-none max-w-[150px] sm:max-w-[220px] truncate font-medium"
                                        >
                                            {availableVoices.map(v => <option key={v.name} value={v.name} className="bg-slate-900">{v.label} ({v.gender})</option>)}
                                        </select>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={handlePreviewVoice}
                                    disabled={isGeneratingImages || isLoadingVoices}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
                                    title="Preview Voice"
                                >
                                    {previewState.status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : previewState.status === 'playing' ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons Row */}
                        <div className="flex flex-wrap items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => onRegenerateAudio(selectedVoice, selectedProvider, selectedLanguage)}
                                disabled={isGeneratingImages || !isSettingsChanged}
                                className={`flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border ${isSettingsChanged ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'}`}
                                title="Apply new voice settings to all scenes"
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${isGeneratingImages ? 'animate-spin' : ''}`} />
                                <span>Apply Voice</span>
                            </button>

                            {isGeneratingImages && onCancelGeneration ? (
                                <button type="button" onClick={onCancelGeneration} className="flex items-center px-5 py-2.5 rounded-xl text-sm font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/50 shadow-lg shadow-red-500/10 active:scale-95 transition-all animate-pulse">
                                    <StopCircle className="w-4 h-4 mr-2" /> Stop
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={onStartImageGeneration}
                                    className="flex items-center px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-95"
                                    title="Generate All Assets"
                                >
                                    <Sparkles className="w-4 h-4 mr-2" /> Generate All
                                </button>
                            )}
                            <button type="button" onClick={onPreview} disabled={!canPreview} className={`flex items-center px-6 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${canPreview ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40' : 'bg-slate-800 border border-slate-700 text-slate-600 cursor-not-allowed'}`}>
                                <PlayCircle className="w-4 h-4 mr-2" /> Preview
                            </button>
                        </div>
                    </div>
                </div>

                {includeMusic && IS_SUNO_ENABLED && (
                    <div className="border-t border-slate-700/50 pt-4 flex flex-col md:flex-row items-center gap-4 bg-slate-900/30 p-4 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-pink-500/20 text-pink-400 rounded-lg"><Music className="w-5 h-5" /></div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">Background Music</h3>
                                {(musicStatus === 'loading' || musicStatus === 'queued') ? <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> {musicStatus === 'queued' ? 'Queued...' : 'Generating...'}</span> : (musicStatus === 'error' || musicStatus === 'failed') ? <span className="text-xs text-red-400">Failed</span> : musicStatus === 'completed' ? <span className="text-xs text-emerald-400">Ready</span> : <span className="text-xs text-slate-500">Pending...</span>}
                            </div>
                        </div>
                        <div className="flex-1 w-full md:w-auto">
                            {musicPrompt && (
                                <div className="relative group">
                                    <p onClick={() => setShowMusicPrompt(!showMusicPrompt)} className="text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded px-3 py-2 cursor-pointer hover:border-pink-500/30 truncate max-w-md">
                                        <span className="font-mono text-pink-500/70 mr-2">PROMPT:</span>{musicPrompt}
                                    </p>
                                    {showMusicPrompt && <div className="absolute top-full left-0 mt-2 p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 shadow-xl z-20 w-96">{musicPrompt}</div>}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {musicUrl && <AudioPlayerButton audioUrl={musicUrl} status={musicStatus || 'pending'} label="Preview Track" icon={<Play className="w-3 h-3 fill-current" />} />}
                            {onRegenerateMusic && musicStatus !== 'loading' && (
                                <button type="button" onClick={onRegenerateMusic} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors" title="Regenerate Music"><RefreshCw className="w-4 h-4" /></button>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* METADATA DROPDOWN */}
            <div className="mb-8 bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden transition-all duration-300 shadow-lg">
                <button
                    onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                    className="w-full flex items-center justify-between p-4 bg-slate-800/80 hover:bg-slate-700/50 transition-colors focus:outline-none"
                >
                    <div className="flex items-center gap-3 text-white">
                        <div className="p-1.5 bg-indigo-500/20 rounded-md border border-indigo-500/30">
                            <LayoutTemplate className="w-4 h-4 text-indigo-400" />
                        </div>
                        <span className="font-bold text-sm uppercase tracking-wide text-slate-200">Project Details & Metadata</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-medium hidden md:inline">
                            {isDetailsOpen ? 'Hide Details' : 'View Script Prompt & SEO Tags'}
                        </span>
                        {isDetailsOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                </button>

                {isDetailsOpen && (
                    <div className="p-6 bg-slate-900/30 border-t border-slate-700/50 animate-fade-in-up">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <MetadataCard
                                title={generatedTitle}
                                description={generatedDescription}
                            />
                            <OriginalConceptCard
                                topic={projectTopic}
                                style={projectStyle}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* PROGRESS BAR */}
            {(isGeneratingImages || completedImages > 0) && (
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <div className="flex items-center gap-2">
                            <span>Workflow Progress</span>
                            {generationMessage && (
                                <span className="text-indigo-400 normal-case ml-2 border-l border-slate-600 pl-2 hidden md:inline animate-pulse">
                                    {generationMessage}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {isGeneratingImages && <Loader2 className="w-3 h-3 animate-spin" />}
                            <span>{Math.round(progress)}%</span>
                        </div>
                    </div>
                    <div className="bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                        <div className={`h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_15px_rgba(99,102,241,0.6)] ${isPaused ? 'bg-yellow-500' : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500'}`} style={{ width: `${progress}%`, backgroundSize: '200% 100%' }}></div>
                    </div>
                </div>
            )}

            {/* SCENE GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {scenes.map((scene, index) => (
                    <SceneCard
                        key={`${scene.sceneNumber}-${index}`}
                        scene={scene}
                        sceneIndex={index}
                        onRegenerateImage={onRegenerateSceneImage}
                        onRegenerateAudio={(idx, force) => onRegenerateSceneAudio && onRegenerateSceneAudio(idx, force, { voice: selectedVoice, provider: selectedProvider, language: selectedLanguage })}
                        onUpdateScene={onUpdateScene}
                        onRemoveScene={onRemoveScene}
                    />
                ))}
            </div>
        </div>
    );
};

export default ScriptView;
