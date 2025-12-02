import React, { useState, useRef, useEffect } from 'react';
import { Scene, AVAILABLE_VOICES, AVAILABLE_LANGUAGES, Voice, TTSProvider, IS_SUNO_ENABLED } from '../types';
import { Sparkles, Waves, Globe, Play, Square, RefreshCw, StopCircle, ImageIcon, PlayCircle, Loader2, Music, Youtube, Check, Copy, ChevronDown, ChevronUp, LayoutTemplate, AlertTriangle, SkipForward, Play as PlayIcon, Download, Plus, Clock, Video } from 'lucide-react';
import { generatePreviewAudio, getVoices } from '../services/geminiService';
import SceneCard from './script/SceneCard';
import AudioPlayerButton from './common/AudioPlayerButton';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableSceneCard } from './script/SortableSceneCard';

interface ScriptViewProps {
    projectTopic: string;
    projectStyle: string;
    projectVoice: string;
    projectProvider: TTSProvider;
    projectLanguage: string;
    projectVideoModel?: string;
    scenes: Scene[];
    generatedTitle?: string;
    generatedDescription?: string;
    onStartImageGeneration: () => void;
    onGenerateImagesOnly: () => void;
    onGenerateAudioOnly: () => void;
    onRegenerateAudio: (newVoice: string, newProvider: TTSProvider, newLanguage: string) => void;
    onRegenerateSceneImage: (sceneIndex: number, force: boolean) => void;
    onRegenerateSceneAudio?: (sceneIndex: number, force: boolean, overrides?: { voice?: string, provider?: TTSProvider, language?: string }) => void;
    onRegenerateSceneVideo?: (sceneIndex: number, force: boolean) => void;
    onUpdateScene: (index: number, updates: Partial<Scene>) => void;
    isGeneratingImages: boolean;
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
    onAddScene?: () => void;
    onExport?: () => void;
    onUpdateProjectSettings: (settings: { voiceName?: string; ttsProvider?: TTSProvider; language?: string; videoModel?: string }) => Promise<void>;
    onReorderScenes?: (oldIndex: number, newIndex: number) => void;
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
    projectTopic, projectStyle, projectVoice, projectProvider, projectLanguage, projectVideoModel, scenes,
    generatedTitle, generatedDescription,
    onStartImageGeneration, onGenerateImagesOnly, onGenerateAudioOnly, onRegenerateAudio, onRegenerateSceneImage, onRegenerateSceneAudio, onRegenerateSceneVideo, onUpdateScene, isGeneratingImages, onCancelGeneration,
    canPreview, onPreview, includeMusic, musicStatus, musicUrl, musicPrompt, onRegenerateMusic,
    isPaused, fatalError, onResume, onSkip, generationMessage, onRemoveScene, onAddScene, onExport, onUpdateProjectSettings, onReorderScenes
}) => {
    const [selectedProvider, setSelectedProvider] = useState<TTSProvider>(projectProvider);
    const [selectedVoice, setSelectedVoice] = useState(projectVoice);
    const [selectedLanguage, setSelectedLanguage] = useState(projectLanguage);
    const [selectedVideoModel, setSelectedVideoModel] = useState(projectVideoModel || 'veo-2.0-generate-001');

    const [previewState, setPreviewState] = useState<{ status: 'idle' | 'loading' | 'playing' }>({ status: 'idle' });
    const [showMusicPrompt, setShowMusicPrompt] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isAddingScene, setIsAddingScene] = useState(false);
    const prevSceneCount = useRef(scenes.length);

    useEffect(() => {
        if (scenes.length > prevSceneCount.current) {
            setIsAddingScene(false);
        }
        prevSceneCount.current = scenes.length;
    }, [scenes.length]);

    const handleAddScene = () => {
        setIsAddingScene(true);
        if (onAddScene) onAddScene();
    };

    const previewAudioRef = useRef<HTMLAudioElement | null>(null);
    const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = scenes.findIndex((s) => (s.id || `temp-${s.sceneNumber}`) === active.id);
            const newIndex = scenes.findIndex((s) => (s.id || `temp-${s.sceneNumber}`) === over.id);

            if (oldIndex !== -1 && newIndex !== -1 && onReorderScenes) {
                onReorderScenes(oldIndex, newIndex);
            }
        }
    };

    useEffect(() => {
        const loadVoices = async () => {
            setIsLoadingVoices(true);
            if (selectedProvider === 'elevenlabs') {
                try {
                    const voices = await getVoices();
                    setAvailableVoices(voices);
                } catch (e) {
                    console.error("Failed to load ElevenLabs voices", e);
                    setAvailableVoices([]);
                }
            } else if (selectedProvider === 'groq') {
                const { GROQ_VOICES } = await import('../types');
                setAvailableVoices(GROQ_VOICES);
            } else {
                setAvailableVoices(AVAILABLE_VOICES);
            }
            setIsLoadingVoices(false);
        };
        loadVoices();
    }, [selectedProvider]);

    const filteredVoices = availableVoices.filter(v => {
        if (!selectedLanguage) return true;
        const langObj = AVAILABLE_LANGUAGES.find(l => l.label === selectedLanguage);
        if (!langObj) return true;

        if (v.supportedLanguages && v.supportedLanguages.length > 0) {
            return v.supportedLanguages.includes(langObj.code) || v.supportedLanguages.includes('multilingual');
        }
        return true;
    });

    useEffect(() => {
        if (isLoadingVoices) return;

        if (filteredVoices.length > 0) {
            if (!filteredVoices.find(v => v.name === selectedVoice)) {
                setSelectedVoice(filteredVoices[0].name);
            }
        } else {
            if (!isLoadingVoices && availableVoices.length > 0) {
                setSelectedVoice('');
            }
        }
    }, [selectedLanguage, selectedProvider, filteredVoices, isLoadingVoices, availableVoices.length]);

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

            <header className="mb-6 flex flex-col items-center">
                {/* 1. Title (Moved Up) */}
                <div className="text-center mb-3 px-4 w-full max-w-4xl">
                    <h1 className="text-xl font-bold text-white leading-tight tracking-tight truncate" title={generatedTitle || projectTopic}>
                        {(() => {
                            const text = generatedTitle || projectTopic || "Untitled Project";
                            return text.trim().startsWith('{') ? "Untitled Project" : text;
                        })()}
                    </h1>
                </div>

                {/* 2. Ultra-Compact Toolbar */}
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-lg flex items-center justify-center px-2 py-1.5 text-xs text-slate-400 mb-3 overflow-x-auto whitespace-nowrap gap-3 max-w-full scrollbar-hide">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 hover:text-indigo-300 transition-colors cursor-default" title="Visual Style">
                            <LayoutTemplate className="w-3 h-3" />
                            <span className="font-medium text-slate-300">{projectStyle}</span>
                        </div>
                        <div className="w-px h-3 bg-slate-700/50"></div>
                        <div className="flex items-center gap-1.5 hover:text-emerald-300 transition-colors cursor-default" title="Estimated Duration">
                            <Clock className="w-3 h-3" />
                            <span className="font-medium text-slate-300">
                                {(() => {
                                    const totalSeconds = scenes.reduce((acc, s) => {
                                        if (s.durationSeconds && Number(s.durationSeconds) > 0) return acc + Number(s.durationSeconds);
                                        const wordCount = s.narration ? s.narration.split(/\s+/).length : 0;
                                        return acc + Math.max(3, wordCount / 2.5);
                                    }, 0);
                                    const minutes = Math.floor(totalSeconds / 60);
                                    const seconds = Math.round(totalSeconds % 60);
                                    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                                })()}
                            </span>
                        </div>
                        <div className="w-px h-3 bg-slate-700/50"></div>
                        <div className="flex items-center gap-1.5">
                            <Globe className="w-3 h-3" />
                            <select
                                value={selectedLanguage}
                                onChange={(e) => {
                                    const newVal = e.target.value;
                                    setSelectedLanguage(newVal);
                                    localStorage.setItem('shortsai_pref_language', newVal);
                                    onUpdateProjectSettings({ language: newVal });
                                }}
                                disabled={isGeneratingImages}
                                className="bg-transparent text-slate-300 outline-none cursor-pointer hover:text-white transition-colors font-medium appearance-none pr-2"
                            >
                                {AVAILABLE_LANGUAGES.map(lang => <option key={lang.code} value={lang.label} className="bg-slate-900">{lang.label}</option>)}
                            </select>
                        </div>
                        <div className="w-px h-3 bg-slate-700/50"></div>
                        <div className="flex items-center gap-1.5">
                            <Video className="w-3 h-3" />
                            <select
                                value={selectedVideoModel}
                                onChange={(e) => {
                                    const newVal = e.target.value;
                                    setSelectedVideoModel(newVal);
                                    localStorage.setItem('shortsai_pref_video_model', newVal);
                                    onUpdateProjectSettings({ videoModel: newVal });
                                }}
                                disabled={isGeneratingImages}
                                className="bg-transparent text-slate-300 outline-none cursor-pointer hover:text-white transition-colors font-medium appearance-none pr-2 max-w-[100px] truncate"
                            >
                                <option value="veo-2.0-generate-001" className="bg-slate-900">Veo 2.0 HQ</option>
                                <option value="veo-3.0-generate-preview" className="bg-slate-900">Veo 3.0 Preview</option>
                                <option value="veo-3.0-fast-generate-preview" className="bg-slate-900">Veo 3.0 Fast</option>
                            </select>
                        </div>
                        <div className="w-px h-3 bg-slate-700/50"></div>
                        <div className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <select
                                value={selectedProvider}
                                onChange={(e) => {
                                    const newVal = e.target.value as any;
                                    setSelectedProvider(newVal);
                                    onUpdateProjectSettings({ ttsProvider: newVal });
                                }}
                                className="bg-transparent text-slate-300 outline-none cursor-pointer hover:text-white transition-colors font-medium appearance-none pr-2"
                            >
                                <option value="gemini" className="bg-slate-900">Gemini</option>
                                <option value="elevenlabs" className="bg-slate-900">ElevenLabs</option>
                                <option value="groq" className="bg-slate-900">Groq</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 3. Compact Narration Card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-3 mb-3 text-xs">
                    <span className="text-slate-500 font-medium">Narrator:</span>
                    <div className="relative">
                        {isLoadingVoices ? (
                            <span className="text-slate-500 text-xs"><Loader2 className="w-3 h-3 animate-spin inline mr-1" />Loading...</span>
                        ) : (
                            <select
                                value={selectedVoice}
                                onChange={(e) => {
                                    const newVal = e.target.value;
                                    setSelectedVoice(newVal);
                                    localStorage.setItem('shortsai_pref_voice', newVal);
                                    onUpdateProjectSettings({ voiceName: newVal });
                                }}
                                disabled={isGeneratingImages || filteredVoices.length === 0}
                                className="bg-transparent text-indigo-300 font-medium outline-none cursor-pointer hover:text-indigo-200 transition-colors appearance-none pr-4 text-center min-w-[100px]"
                            >
                                {filteredVoices.length > 0 ? (
                                    filteredVoices.map(v => <option key={v.name} value={v.name} className="bg-slate-900">{v.label} ({v.gender})</option>)
                                ) : (
                                    <option value="" disabled>No voices</option>
                                )}
                            </select>
                        )}
                    </div>

                    <button
                        onClick={handlePreviewVoice}
                        disabled={isGeneratingImages || isLoadingVoices}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                        title="Preview Voice"
                    >
                        {previewState.status === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : previewState.status === 'playing' ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                    </button>

                    <div className="w-px h-3 bg-slate-700/50 mx-1"></div>

                    <button
                        onClick={() => onRegenerateAudio(selectedVoice, selectedProvider, selectedLanguage)}
                        disabled={isGeneratingImages || !isSettingsChanged}
                        className={`font-medium transition-colors ${isSettingsChanged ? 'text-indigo-400 hover:text-indigo-300 cursor-pointer underline decoration-indigo-500/30 underline-offset-2' : 'text-slate-600 cursor-not-allowed'}`}
                    >
                        Apply to All
                    </button>
                </div>

                {/* 4. Action Buttons Group */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-1.5 flex items-center gap-2">
                    {isGeneratingImages && onCancelGeneration ? (
                        <button onClick={onCancelGeneration} className="flex items-center px-4 py-1.5 rounded-md text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20 transition-all animate-pulse">
                            <StopCircle className="w-3.5 h-3.5 mr-1.5" /> Stop
                        </button>
                    ) : (
                        <button
                            onClick={onStartImageGeneration}
                            className="flex items-center px-4 py-1.5 rounded-md text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                        >
                            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate All
                        </button>
                    )}

                    <button
                        onClick={onPreview}
                        disabled={!canPreview}
                        className={`flex items-center px-4 py-1.5 rounded-md text-xs font-bold transition-all active:scale-95 ${canPreview ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`}
                    >
                        <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Preview
                    </button>

                    {onExport && (
                        <button
                            onClick={onExport}
                            className="flex items-center px-4 py-1.5 rounded-md text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-all active:scale-95"
                        >
                            <Download className="w-3.5 h-3.5 mr-1.5" /> Export
                        </button>
                    )}
                </div>

                {/* Music Section (Optional/Collapsible) */}
                {includeMusic && IS_SUNO_ENABLED && (
                    <div className="mt-3 flex items-center justify-center gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                            <Music className="w-3 h-3 text-pink-400" />
                            <span>Music:</span>
                            <span className={musicStatus === 'completed' ? 'text-emerald-400' : 'text-slate-400'}>
                                {musicStatus === 'completed' ? 'Ready' : musicStatus || 'Pending'}
                            </span>
                        </div>
                        {musicUrl && <AudioPlayerButton audioUrl={musicUrl} status={musicStatus || 'pending'} label="Play" icon={<Play className="w-2.5 h-2.5 fill-current" />} />}
                    </div>
                )}
            </header>

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

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={scenes.map(s => s.id || `temp-${s.sceneNumber}`)}
                    strategy={rectSortingStrategy}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {scenes.map((scene, index) => (
                            <SortableSceneCard
                                key={scene.id || `temp-${scene.sceneNumber}`}
                                id={scene.id || `temp-${scene.sceneNumber}`}
                                scene={scene}
                                sceneIndex={index}
                                onRegenerateImage={onRegenerateSceneImage}
                                onRegenerateAudio={(idx, force) => onRegenerateSceneAudio && onRegenerateSceneAudio(idx, force, { voice: selectedVoice, provider: selectedProvider, language: selectedLanguage })}
                                onRegenerateVideo={onRegenerateSceneVideo}
                                onUpdateScene={onUpdateScene}
                                onRemoveScene={onRemoveScene}
                            />
                        ))}



                        {onAddScene && (
                            <button
                                onClick={handleAddScene}
                                disabled={isAddingScene}
                                className={`flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-2xl transition-all group ${isAddingScene ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-800/50 hover:border-indigo-500/50'}`}
                            >
                                <div className="p-4 bg-slate-800 rounded-full mb-4 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
                                    {isAddingScene ? <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /> : <Plus className="w-8 h-8 text-slate-400 group-hover:text-indigo-400" />}
                                </div>
                                <span className="text-slate-400 font-semibold group-hover:text-indigo-300">{isAddingScene ? 'Adding Scene...' : 'Add New Scene'}</span>
                            </button>
                        )}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
};

export default ScriptView;
