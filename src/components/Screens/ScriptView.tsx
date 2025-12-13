import React, { useState, useRef, useEffect } from 'react';
import { Scene, AVAILABLE_VOICES, AVAILABLE_LANGUAGES, Voice, TTSProvider, IS_SUNO_ENABLED, ApiKeys, User } from '../../types';
import { Sparkles, Waves, Globe, Play, Square, RefreshCw, StopCircle, ImageIcon, PlayCircle, Loader2, Music, Youtube, Check, Copy, ChevronDown, ChevronUp, LayoutTemplate, AlertTriangle, SkipForward, Play as PlayIcon, Download, Plus, Clock, Video, Edit2 } from 'lucide-react';
import { generatePreviewAudio, getVoices } from '../../services/geminiService';
import SceneCard from '../Scripts/SceneCard';
import AudioPlayerButton from '../Common/AudioPlayerButton';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableSceneCard } from '../Scripts/SortableSceneCard';
import { useTranslation } from 'react-i18next';
import { useCharacterLibrary } from '../../hooks/useCharacterLibrary';
import ProjectSettingsModal from '../Project/ProjectSettingsModal';

interface ScriptViewProps {
    projectTopic: string;
    projectStyle: string;
    projectVoice: string;
    projectProvider: TTSProvider;
    projectLanguage: string;
    projectVideoModel?: string;
    projectAudioModel?: string;
    scenes: Scene[];
    generatedTitle?: string;
    generatedDescription?: string;
    generatedShortsHashtags?: string[];
    generatedTiktokText?: string;
    generatedTiktokHashtags?: string[];
    onStartImageGeneration: () => void;
    onGenerateImagesOnly: () => void;
    onGenerateAudioOnly: () => void;
    onRegenerateAudio: (newVoice: string, newProvider: TTSProvider, newLanguage: string, newAudioModel?: string) => void;
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
    onRegenerateScript?: () => void;
    isPaused?: boolean;
    fatalError?: string | null;
    onResume?: () => void;
    onSkip?: () => void;
    generationMessage?: string;
    onRemoveScene: (index: number) => void;
    onAddScene?: () => void;
    onExport?: () => void;
    onUpdateProjectSettings: (settings: {
        voiceName?: string;
        ttsProvider?: TTSProvider;
        language?: string;
        videoModel?: string;
        audioModel?: string;
        generatedTitle?: string;
        generatedDescription?: string;
        characterIds?: string[];
    }) => Promise<void>;
    onReorderScenes?: (oldIndex: number, newIndex: number) => void;
    projectId: string;
    userId: string;
    apiKeys: ApiKeys;
    showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
    projectCharacters: import('../../types').SavedCharacter[];
    currentUser?: User | null;
}

// Helper to detect mock projects
const isMockProject = (projectId: string) => projectId === '__mock__-tour-project';

const MetadataCard: React.FC<{
    title?: string;
    description?: string;
    shortsHashtags?: string[];
    tiktokText?: string;
    tiktokHashtags?: string[];
}> = ({ title, description, shortsHashtags, tiktokText, tiktokHashtags }) => {
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
        } catch (err) { console.error("Failed to copy", err); }
    };

    return (
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 text-red-400 mb-4 pb-2 border-b border-white/5">
                <Youtube className="w-5 h-5" />
                <span className="font-semibold text-sm">{t('script.metadata_title')}</span>
            </div>
            <div className="space-y-4 flex-1">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">{t('script.viral_title')}</label>
                        <button onClick={() => title && copyToClipboard(title, 'title')} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors">
                            {isCopiedTitle ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {isCopiedTitle ? t('script.copied') : t('script.copy')}
                        </button>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm shadow-inner min-h-[40px]">{title || t('script.generating_title')}</div>
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">{t('script.description_hashtags')}</label>
                        <button onClick={() => description && copyToClipboard(description, 'desc')} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors">
                            {isCopiedDesc ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {isCopiedDesc ? t('script.copied') : t('script.copy')}
                        </button>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-300 text-sm whitespace-pre-wrap shadow-inner min-h-[80px]">{description || t('script.generating_desc')}</div>
                </div>

                {/* YouTube Shorts Hashtags */}
                {shortsHashtags && shortsHashtags.length > 0 && (
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-semibold text-red-500 uppercase flex items-center gap-1">
                                <Youtube className="w-3 h-3" /> Shorts Hashtags
                            </label>
                            <button
                                onClick={() => copyToClipboard(shortsHashtags.join(' '), 'shorts')}
                                className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                {isCopiedShorts ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {isCopiedShorts ? t('script.copied') : t('script.copy')}
                            </button>
                        </div>
                        <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 flex flex-wrap gap-1.5 min-h-[60px]">
                            {shortsHashtags.map((tag, i) => (
                                <span key={i} className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-md">
                                    {tag.startsWith('#') ? tag : `#${tag}`}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* TikTok Section */}
                {(tiktokText || (tiktokHashtags && tiktokHashtags.length > 0)) && (
                    <div className="border-t border-slate-700/50 pt-4">
                        <div className="flex items-center gap-2 text-slate-400 mb-3">
                            <Video className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase">TikTok Strategy</span>
                        </div>

                        {tiktokText && (
                            <div className="mb-3">
                                <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Hook Text</label>
                                <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-300 text-xs italic">
                                    "{tiktokText}"
                                </div>
                            </div>
                        )}

                        {tiktokHashtags && tiktokHashtags.length > 0 && (
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Hashtags</label>
                                    <button
                                        onClick={() => copyToClipboard(tiktokHashtags.join(' '), 'tiktok')}
                                        className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                                    >
                                        {isCopiedTikTok ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {isCopiedTikTok ? t('script.copied') : t('script.copy')}
                                    </button>
                                </div>
                                <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 flex flex-wrap gap-1.5">
                                    {tiktokHashtags.map((tag, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs rounded-md">
                                            {tag.startsWith('#') ? tag : `#${tag}`}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const OriginalConceptCard: React.FC<{ topic: string; style: string; onRegenerate?: () => void; isGenerating?: boolean }> = ({ topic, style, onRegenerate, isGenerating }) => {
    const { t } = useTranslation();
    const [isCopied, setIsCopied] = useState(false);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) { console.error("Failed to copy", err); }
    };

    return (
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 text-indigo-400 mb-4 pb-2 border-b border-white/5">
                <LayoutTemplate className="w-5 h-5" />
                <span className="font-semibold text-sm">{t('script.original_concept')}</span>
            </div>
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
                        {topic}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ScriptView: React.FC<ScriptViewProps> = ({
    projectTopic, projectStyle, projectVoice, projectProvider, projectLanguage, projectVideoModel, projectAudioModel, scenes,
    generatedTitle, generatedDescription, generatedShortsHashtags, generatedTiktokText, generatedTiktokHashtags,
    onStartImageGeneration, onGenerateImagesOnly, onGenerateAudioOnly, onRegenerateAudio, onRegenerateSceneImage, onRegenerateSceneAudio, onRegenerateSceneVideo, onUpdateScene, isGeneratingImages, onCancelGeneration,
    canPreview, onPreview, includeMusic, musicStatus, musicUrl, musicPrompt, onRegenerateMusic, onRegenerateScript,
    isPaused, fatalError, onResume, onSkip, generationMessage, onRemoveScene, onAddScene, onExport, onUpdateProjectSettings, onReorderScenes, projectId, userId, apiKeys,
    showToast, projectCharacters, currentUser
}) => {
    const { t } = useTranslation();
    const [selectedProvider, setSelectedProvider] = useState<TTSProvider>(projectProvider);
    const [selectedVoice, setSelectedVoice] = useState(projectVoice);
    const [selectedLanguage, setSelectedLanguage] = useState(projectLanguage);
    const [selectedVideoModel, setSelectedVideoModel] = useState(projectVideoModel || 'veo-2.0-generate-001');
    const [selectedAudioModel, setSelectedAudioModel] = useState(projectAudioModel || 'eleven_turbo_v2_5');
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    const [previewState, setPreviewState] = useState<{ status: 'idle' | 'loading' | 'playing' }>({ status: 'idle' });
    const [showMusicPrompt, setShowMusicPrompt] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isAddingScene, setIsAddingScene] = useState(false);
    const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
    const prevSceneCount = useRef(scenes.length);

    // Fetch Global Character Library to allow linking any character
    const { characters: libraryCharacters } = useCharacterLibrary(currentUser || null);

    // Merge logic: prefer libraryCharacters, but fallback to projectCharacters if library not loaded yet or empty?
    // Actually, libraryCharacters should be the source of truth for "Available Characters to Link".
    // We use libraryCharacters instead of projectCharacters prop to show ALL characters.
    const availableCharacters = libraryCharacters && libraryCharacters.length > 0 ? libraryCharacters : projectCharacters;

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
                const { GROQ_VOICES } = await import('../../types');
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
            if (showToast) showToast(e.message || t('script.preview_failed'), 'error');
        }
    };

    const isSettingsChanged = selectedVoice !== projectVoice || selectedProvider !== projectProvider || selectedLanguage !== projectLanguage || (selectedProvider === 'elevenlabs' && selectedAudioModel !== (projectAudioModel || 'eleven_flash_v2_5'));

    return (
        <div className="w-full px-6 py-8 relative">
            <ProjectSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                currentTitle={generatedTitle}
                currentDescription={generatedDescription}
                currentUser={currentUser || null}
                initialCharacterIds={projectCharacters.map(c => c.id)}
                onSave={onUpdateProjectSettings}
            />

            {isPaused && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-full">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-white">{t('script.workflow_paused')}</h3>
                        </div>
                        <p className="text-slate-300 mb-6">
                            {fatalError ? (
                                <span className="text-red-300 block bg-red-500/10 p-3 rounded-lg border border-red-500/20">{fatalError}</span>
                            ) : t('script.backend_paused')}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={onCancelGeneration} className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold">{t('script.abort')}</button>
                            {onSkip && fatalError && (
                                <button onClick={onSkip} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-600 flex items-center gap-2 text-sm font-semibold">
                                    <SkipForward className="w-4 h-4" /> {t('script.skip')}
                                </button>
                            )}
                            {onResume && (
                                <button onClick={onResume} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg flex items-center gap-2 text-sm font-semibold">
                                    <PlayIcon className="w-4 h-4 fill-current" /> {t('script.resume')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showRegenerateConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-red-500/10 text-red-500 rounded-full">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white">{t('script.regenerate_script')}</h3>
                        </div>
                        <p className="text-slate-300 mb-6 text-sm leading-relaxed">
                            {t('script.confirm_regenerate_script')}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowRegenerateConfirm(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={() => {
                                    if (onRegenerateScript) onRegenerateScript();
                                    setShowRegenerateConfirm(false);
                                }}
                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg shadow-lg flex items-center gap-2 text-sm font-semibold transition-all"
                            >
                                <RefreshCw className="w-4 h-4" /> {t('common.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className="mb-8 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex flex-col xl:flex-row gap-6 items-start justify-between">
                    {/* Left Column: Title & Metadata */}
                    <div className="flex-1 min-w-0 space-y-4 w-full">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide uppercase">
                                {projectStyle}
                            </span>
                            <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium flex items-center gap-1.5">
                                <Globe className="w-3 h-3" />
                                {projectLanguage}
                            </span>
                            <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
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

                        <div className="flex items-center gap-3 group">
                            <h1 className="text-3xl font-bold text-white leading-tight tracking-tight break-words" title={generatedTitle || projectTopic}>
                                {(() => {
                                    const text = generatedTitle || projectTopic || t('script.untitled_project');
                                    return text.trim().startsWith('{') ? t('script.untitled_project') : text;
                                })()}
                            </h1>
                            <button
                                onClick={() => setIsSettingsModalOpen(true)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
                                title={t('script.edit_project_settings', 'Edit Settings')}
                            >
                                <Edit2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Controls */}
                    <div id="script-header-controls" className="flex flex-col gap-4 w-full xl:w-auto shrink-0">
                        {/* Row 1: Provider & Voice */}
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="flex items-center bg-slate-950/50 border border-slate-800 rounded-lg p-1.5 gap-1 self-start md:self-auto">
                                <button
                                    onClick={() => {
                                        setSelectedProvider('gemini');
                                        onUpdateProjectSettings({ ttsProvider: 'gemini' });
                                    }}
                                    className={`p-2 rounded-md transition-all ${selectedProvider === 'gemini' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                                    title="Gemini"
                                >
                                    <Sparkles className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedProvider('elevenlabs');
                                        onUpdateProjectSettings({ ttsProvider: 'elevenlabs' });
                                    }}
                                    className={`p-2 rounded-md transition-all ${selectedProvider === 'elevenlabs' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                                    title="ElevenLabs"
                                >
                                    <Waves className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedProvider('groq');
                                        onUpdateProjectSettings({ ttsProvider: 'groq' });
                                    }}
                                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${selectedProvider === 'groq' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:text-slate-400'}`}
                                    title="Groq (Fast)"
                                >
                                    GROQ
                                </button>
                            </div>

                            <div className="flex-1 bg-slate-950/50 border border-slate-800 rounded-lg px-3 flex items-center gap-3 w-full md:w-auto md:min-w-[320px]">
                                <div className="flex items-center gap-2 text-slate-400 border-r border-slate-800 pr-3 mr-1">
                                    <Globe className="w-3.5 h-3.5" />
                                    <select
                                        value={selectedLanguage}
                                        onChange={(e) => {
                                            const newVal = e.target.value;
                                            setSelectedLanguage(newVal);
                                            localStorage.setItem('shortsai_pref_language', newVal);
                                            onUpdateProjectSettings({ language: newVal });
                                        }}
                                        disabled={isGeneratingImages}
                                        className="bg-transparent text-xs font-medium outline-none cursor-pointer hover:text-white transition-colors appearance-none w-24"
                                    >
                                        {AVAILABLE_LANGUAGES.map(lang => <option key={lang.code} value={lang.label} className="bg-slate-900">{lang.label}</option>)}
                                    </select>
                                </div>

                                <div className="flex-1 relative min-w-[120px]">
                                    {isLoadingVoices ? (
                                        <span className="text-slate-500 text-xs flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-2" />{t('script.loading_voices')}</span>
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
                                            className="w-full bg-transparent text-slate-200 text-sm font-medium outline-none cursor-pointer hover:text-white transition-colors appearance-none"
                                        >
                                            {filteredVoices.length > 0 ? (
                                                filteredVoices.map(v => <option key={v.name} value={v.name} className="bg-slate-900">{v.label} ({v.gender})</option>)
                                            ) : (
                                                <option value="" disabled>{t('script.no_voices')}</option>
                                            )}
                                        </select>
                                    )}
                                </div>

                                {selectedProvider === 'elevenlabs' && (
                                    <div className="flex items-center gap-2 text-slate-400 border-l border-slate-800 pl-3 ml-1 shrink-0">
                                        <select
                                            value={selectedAudioModel}
                                            onChange={(e) => {
                                                const newVal = e.target.value;
                                                setSelectedAudioModel(newVal);
                                                onUpdateProjectSettings({ audioModel: newVal });
                                            }}
                                            className="bg-transparent text-xs font-medium outline-none cursor-pointer hover:text-white transition-colors appearance-none max-w-[100px]"
                                            title="ElevenLabs Model"
                                        >
                                            <option value="eleven_flash_v2_5" className="bg-slate-900">Flash v2.5</option>
                                            <option value="eleven_multilingual_v2" className="bg-slate-900">Multilingual v2</option>
                                            <option value="eleven_turbo_v2_5" className="bg-slate-900">Turbo v2.5</option>
                                        </select>
                                    </div>
                                )}

                                <button
                                    onClick={handlePreviewVoice}
                                    disabled={isGeneratingImages || isLoadingVoices}
                                    className="p-1.5 text-slate-500 hover:text-indigo-400 transition-colors shrink-0"
                                >
                                    {previewState.status === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : previewState.status === 'playing' ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Actions & Video Model */}
                        <div className="flex flex-wrap items-center gap-3 justify-start md:justify-end">
                            {/* Video Model Selector */}
                            <div className="flex items-center bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 gap-2 relative group">
                                <Video className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                                <select
                                    value={selectedVideoModel}
                                    onChange={(e) => {
                                        const newVal = e.target.value;
                                        setSelectedVideoModel(newVal);
                                        localStorage.setItem('shortsai_pref_video_model', newVal);
                                        onUpdateProjectSettings({ videoModel: newVal });
                                    }}
                                    disabled={isGeneratingImages}
                                    className="bg-transparent text-slate-300 text-xs font-medium outline-none cursor-pointer hover:text-white transition-colors appearance-none pr-4"
                                >
                                    <option value="veo-2.0-generate-001" className="bg-slate-900">{t('script.veo_high_quality')}</option>
                                    <option value="veo-3.0-generate-001" className="bg-slate-900">Veo 3.0</option>
                                    <option value="veo-3.0-fast-generate-001" className="bg-slate-900">Veo 3.0 Fast</option>
                                </select>
                                <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 pointer-events-none group-hover:text-white transition-colors" />
                            </div>

                            <button
                                onClick={() => onRegenerateAudio(selectedVoice, selectedProvider, selectedLanguage, selectedAudioModel)}
                                disabled={isGeneratingImages || !isSettingsChanged}
                                className={`px-4 py-2 rounded-lg border text-xs font-semibold transition-all flex items-center gap-2 ${isSettingsChanged ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20' : 'bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed'}`}
                            >
                                <RefreshCw className="w-3.5 h-3.5" /> {t('script.apply_voice')}
                            </button>



                            {isGeneratingImages && onCancelGeneration ? (
                                <button onClick={onCancelGeneration} className="flex items-center px-5 py-2 rounded-lg text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20 transition-all animate-pulse">
                                    <StopCircle className="w-4 h-4 mr-2" /> {t('script.stop')}
                                </button>
                            ) : (
                                <button
                                    id="btn-generate-all"
                                    onClick={() => {
                                        if (isMockProject(projectId)) return; // Silent for tours
                                        onStartImageGeneration();
                                    }}
                                    className="flex items-center px-5 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                                >
                                    <Sparkles className="w-4 h-4 mr-2" /> {t('script.generate_all')}
                                </button>
                            )}

                            <button
                                id="btn-preview"
                                onClick={onPreview}
                                disabled={!canPreview}
                                className={`flex items-center px-5 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${canPreview ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`}
                            >
                                <PlayCircle className="w-4 h-4 mr-2" /> {t('script.preview')}
                            </button>

                            {onExport && (
                                <button
                                    id="btn-export"
                                    onClick={() => {
                                        if (isMockProject(projectId)) return; // Silent for tours
                                        onExport();
                                    }}
                                    className="flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-all active:scale-95"
                                >
                                    <Download className="w-4 h-4 mr-2" /> {t('script.export_assets')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Music Section (Optional) */}
                {includeMusic && IS_SUNO_ENABLED && (
                    <div className="mt-6 pt-4 border-t border-slate-800/50 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                            <Music className="w-3.5 h-3.5 text-pink-400" />
                            <span className="font-medium text-slate-400">{t('script.background_music')}</span>
                            {musicStatus && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${musicStatus === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                    {musicStatus}
                                </span>
                            )}
                        </div>
                        {musicUrl && <AudioPlayerButton audioUrl={musicUrl} status={musicStatus || 'pending'} label={t('script.play_music')} />}
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
                        <span className="font-bold text-sm uppercase tracking-wide text-slate-200">{t('script.project_details')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-medium hidden md:inline">
                            {isDetailsOpen ? t('script.hide_details') : t('script.view_details')}
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
                                shortsHashtags={generatedShortsHashtags}
                                tiktokText={generatedTiktokText}
                                tiktokHashtags={generatedTiktokHashtags}
                            />
                            <OriginalConceptCard
                                topic={projectTopic}
                                style={projectStyle}
                                onRegenerate={onRegenerateScript ? () => setShowRegenerateConfirm(true) : undefined}
                                isGenerating={isGeneratingImages}
                            />
                        </div>
                    </div>
                )}
            </div>

            {(isGeneratingImages || completedImages > 0) && (
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
                    <div id="scene-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {scenes.map((scene, index) => {
                            // Silent wrappers for mock projects
                            const isMock = isMockProject(projectId);

                            const handleRegenerateImage = (idx: number, force: boolean) => {
                                if (isMock) return; // Silent no-op for tours
                                onRegenerateSceneImage(idx, force);
                            };

                            const handleRegenerateAudio = (idx: number, force: boolean) => {
                                if (isMock) return; // Silent no-op for tours
                                onRegenerateSceneAudio && onRegenerateSceneAudio(idx, force, { voice: selectedVoice, provider: selectedProvider, language: selectedLanguage });
                            };

                            const handleRegenerateVideo = (idx: number, force: boolean) => {
                                if (isMock) return; // Silent no-op for tours
                                onRegenerateSceneVideo && onRegenerateSceneVideo(idx, force);
                            };

                            const handleUpdateScene = (idx: number, updates: Partial<Scene>) => {
                                if (isMock) return; // Silent no-op for tours
                                onUpdateScene(idx, updates);
                            };

                            const handleRemoveScene = (idx: number) => {
                                if (isMock) return; // Silent no-op for tours
                                onRemoveScene(idx);
                            };

                            return (
                                <SortableSceneCard
                                    key={scene.id || `temp-${scene.sceneNumber}`}
                                    id={scene.id || `temp-${scene.sceneNumber}`}
                                    scene={scene}
                                    sceneIndex={index}
                                    onRegenerateImage={handleRegenerateImage}
                                    onRegenerateAudio={handleRegenerateAudio}
                                    onRegenerateVideo={handleRegenerateVideo}
                                    onUpdateScene={handleUpdateScene}
                                    onRemoveScene={handleRemoveScene}
                                    projectId={projectId}
                                    userId={userId}
                                    apiKeys={apiKeys}
                                    videoModel={selectedVideoModel}
                                    projectCharacters={availableCharacters}
                                />
                            );
                        })}



                        {onAddScene && (
                            <button
                                id="btn-add-scene"
                                onClick={handleAddScene}
                                disabled={isAddingScene}
                                className={`flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-2xl transition-all group ${isAddingScene ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-800/50 hover:border-indigo-500/50'}`}
                            >
                                <div className="p-4 bg-slate-800 rounded-full mb-4 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
                                    {isAddingScene ? <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /> : <Plus className="w-8 h-8 text-slate-400 group-hover:text-indigo-400" />}
                                </div>
                                <span className="text-slate-400 font-semibold group-hover:text-indigo-300">{isAddingScene ? t('script.adding_scene') : t('script.add_new_scene')}</span>
                            </button>
                        )}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
};

export default ScriptView;
