
import React, { useState, useRef, useEffect } from 'react';
import { VIDEO_STYLES, AVAILABLE_VOICES, AVAILABLE_LANGUAGES, TTSProvider, Voice, IS_SUNO_ENABLED, User } from '../types';
import { Sparkles, ArrowRight, Mic, Play, Square, Loader2, ChevronDown, Music, Zap, Image as ImageIcon, LayoutTemplate, Plus, User as UserIcon, Trash2, CheckCircle2, X, Upload, Wand2, Clock, Layers, Palette, Film, Paintbrush, Box, MonitorPlay } from 'lucide-react';
import { generatePreviewAudio, analyzeCharacterFeatures, getVoices } from '../services/geminiService';
import { useCharacterLibrary } from '../hooks/useCharacterLibrary';
import Loader from './Loader';
import { ToastType } from './Toast';
import ConfirmModal from './ConfirmModal';

const VoicePreviewButton = ({ voice, provider, voices }: { voice: string, provider: TTSProvider, voices: Voice[] }) => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'playing'>('idle');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handlePlay = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (status === 'playing') {
            audioRef.current?.pause();
            setStatus('idle');
            return;
        }

        setStatus('loading');
        try {
            const vObj = voices.find(v => v.name === voice);
            if (!vObj) throw new Error("Voice not found");

            let url = vObj.previewUrl;
            if (!url) {
                // Use backend to generate preview if no static preview url
                url = await generatePreviewAudio(`Hello! I am ${vObj.label}.`, vObj.name, provider);
            }

            if (!url) throw new Error("No preview");

            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => setStatus('idle');
            await audio.play();
            setStatus('playing');
        } catch (e) {
            console.error(e);
            setStatus('idle');
        }
    };

    return (
        <button type="button" onClick={handlePlay} className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-700/50 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-all border border-slate-600 hover:border-indigo-500">
            {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : status === 'playing' ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
        </button>
    );
};

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

// Moved outside to prevent re-creation on render
const SectionTitle = ({ icon: Icon, title, subtitle }: any) => (
    <div className="mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <Icon className="w-4 h-4 text-indigo-400" />
            </div>
            {title}
        </h3>
        {subtitle && <p className="text-sm text-slate-500 ml-9">{subtitle}</p>}
    </div>
);

interface InputSectionProps {
    user: User | null;
    onGenerate: (
        topic: string,
        style: string,
        voice: string,
        provider: TTSProvider,
        language: string,
        refs: any[],
        includeMusic: boolean,
        durationConfig: { min: number, max: number, targetScenes?: number }
    ) => Promise<void>; // Make this return a Promise
    isLoading: boolean;
    loadingMessage?: string;
    showToast: (message: string, type: ToastType) => void;
}

const InputSection: React.FC<InputSectionProps> = ({ user, onGenerate, isLoading, loadingMessage, showToast }) => {
    const { characters, addCharacter, removeCharacter, isLoading: isCharLoading } = useCharacterLibrary(user);

    // Local Loading State for "Create Project" button
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [topic, setTopic] = useState('');
    const [style, setStyle] = useState(VIDEO_STYLES[0]);
    const [language, setLanguage] = useState(AVAILABLE_LANGUAGES[0].label);

    // Duration & Scene Config
    const [minDuration, setMinDuration] = useState<number | ''>(60);
    const [maxDuration, setMaxDuration] = useState<number | ''>(70);
    const [targetScenes, setTargetScenes] = useState<string>("");

    // TTS State
    const [ttsProvider, setTtsProvider] = useState<TTSProvider>('gemini');
    const [voice, setVoice] = useState('');
    const [dynamicVoices, setDynamicVoices] = useState<Voice[]>(AVAILABLE_VOICES);

    // Selection State
    const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
    const [optimizeRef, setOptimizeRef] = useState(false);
    const [includeMusic, setIncludeMusic] = useState(false);

    // Add Character Modal State
    const [isAddingChar, setIsAddingChar] = useState(false);
    const [newCharName, setNewCharName] = useState('');
    const [newCharDesc, setNewCharDesc] = useState('');
    const [newCharImages, setNewCharImages] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Confirm Delete Modal
    const [deleteCharModal, setDeleteCharModal] = useState<{ isOpen: boolean; charId: string | null }>({ isOpen: false, charId: null });

    useEffect(() => {
        // Load Voices logic
        const fetchVoices = async () => {
            if (ttsProvider === 'elevenlabs') {
                const v = await getVoices();
                setDynamicVoices(v);
                if (v.length > 0) {
                    if (!v.find(existing => existing.name === voice)) {
                        setVoice(v[0].name);
                    }
                }
            } else if (ttsProvider === 'groq') {
                const { GROQ_VOICES } = await import('../types');
                setDynamicVoices(GROQ_VOICES);
                if (!GROQ_VOICES.find(existing => existing.name === voice)) {
                    setVoice(GROQ_VOICES[0].name);
                }
            } else {
                setDynamicVoices(AVAILABLE_VOICES);
                if (!AVAILABLE_VOICES.find(existing => existing.name === voice)) {
                    setVoice(AVAILABLE_VOICES[0].name);
                }
            }
        };
        fetchVoices();
    }, [ttsProvider]);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach((file: File) => {
                const reader = new FileReader();
                reader.onload = () => setNewCharImages(prev => [...prev, reader.result as string]);
                reader.readAsDataURL(file);
            });
        }
    };

    const handleAutoDescription = async () => {
        if (newCharImages.length === 0) return;
        setIsAnalyzing(true);
        try {
            const desc = await analyzeCharacterFeatures(newCharImages[0]);
            setNewCharDesc(prev => (prev ? prev + ", " + desc : desc));
            showToast("Character described by AI", 'success');
        } catch (e) {
            console.error("Analysis failed", e);
            showToast("Failed to analyze image", 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveChar = async () => {
        try {
            const char = await addCharacter(newCharName, newCharDesc, newCharImages, optimizeRef);
            if (char) {
                setSelectedCharIds(prev => [...prev, char.id]);
                setIsAddingChar(false);
                setNewCharName(''); setNewCharDesc(''); setNewCharImages([]);
                showToast("Character saved successfully", 'success');
            }
        } catch (e) {
            showToast("Failed to save character", 'error');
        }
    };

    const confirmDeleteCharacter = async () => {
        if (deleteCharModal.charId) {
            await removeCharacter(deleteCharModal.charId);
            if (selectedCharIds.includes(deleteCharModal.charId)) {
                setSelectedCharIds(prev => prev.filter(id => id !== deleteCharModal.charId));
            }
            setDeleteCharModal({ isOpen: false, charId: null });
            showToast("Character deleted", 'success');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Local Submission State (Lock Button)
        setIsSubmitting(true);

        const selectedRefs = characters
            .filter(c => selectedCharIds.includes(c.id))
            .map(c => ({ id: c.id, name: c.name, description: c.description, images: c.images }));

        let safeMin = typeof minDuration === 'number' ? Math.max(5, minDuration) : 30;
        let safeMax = typeof maxDuration === 'number' ? Math.max(safeMin, maxDuration) : 60;

        const config = {
            min: safeMin,
            max: safeMax,
            targetScenes: targetScenes ? parseInt(targetScenes) : undefined
        };

        try {
            await onGenerate(topic, style, voice, ttsProvider, language, selectedRefs, includeMusic && IS_SUNO_ENABLED, config);
        } catch (e) {
            // If error, unlock button. If success, component unmounts anyway.
            setIsSubmitting(false);
        }
    };

    // Combined Loading State: Global or Local Submission
    const isBusy = isLoading || isSubmitting;

    return (
        <div className="max-w-6xl mx-auto w-full px-4 py-8 flex flex-col items-center">

            <ConfirmModal
                isOpen={deleteCharModal.isOpen}
                title="Delete Character?"
                message="This character will be removed from your library. This action cannot be undone."
                onConfirm={confirmDeleteCharacter}
                onCancel={() => setDeleteCharModal({ isOpen: false, charId: null })}
                isDestructive={true}
                confirmText="Delete Character"
            />

            <div className="text-center mb-12 animate-fade-in-up">
                <h1 className="text-4xl md:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-4 tracking-tight pb-2">
                    Create Your Story
                </h1>
                <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
                    AI Director, Cinematographer, and Narrator. <br />All in one place.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEFT COLUMN */}
                <div className="lg:col-span-7 space-y-8">
                    {/* SCRIPT INPUT ... (No changes in logic here) */}
                    <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl hover:border-slate-600 transition-colors">
                        <SectionTitle icon={LayoutTemplate} title="Concept & Script" subtitle="What's this video about?" />
                        <div className="space-y-4">
                            <div className="relative group">
                                <label htmlFor="topic" className="sr-only">Topic</label>
                                <textarea
                                    id="topic"
                                    name="topic"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g. A cyberpunk detective searching for his lost android cat in Neo-Tokyo..."
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-4 text-white text-lg placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none h-32 resize-none transition-all group-hover:bg-slate-900"
                                    disabled={isBusy}
                                />
                                <div className="absolute bottom-3 right-3 text-xs text-slate-600 font-mono">
                                    {topic.length} chars
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="language" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Output Language</label>
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
                                        <Clock className="w-3 h-3" /> Target Duration (Sec)
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
                                        <span className="text-slate-500 text-xs">to</span>
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
                                    <label htmlFor="targetScenes" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scene Count</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        id="targetScenes"
                                        name="targetScenes"
                                        type="number" min="0" max="50"
                                        value={targetScenes}
                                        onChange={(e) => setTargetScenes(e.target.value)}
                                        className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-center text-sm outline-none focus:border-indigo-500"
                                        placeholder="Auto"
                                        disabled={isBusy}
                                    />
                                    <span className="text-[10px] text-slate-500">(Leave empty for Auto)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STYLE & CHARACTERS ... (Visuals) */}
                    <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl">
                        <SectionTitle icon={ImageIcon} title="Visual Style" subtitle="Choose the aesthetic for your storyboard." />

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

                        {/* Character Manager Section (Same as before) */}
                        <div className="mt-8 border-t border-slate-700/50 pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                    <UserIcon className="w-4 h-4 text-indigo-400" /> Character Consistency
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsAddingChar(true)}
                                    disabled={isBusy}
                                    className="text-xs font-bold bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" /> New Character
                                </button>
                            </div>

                            {isAddingChar && (
                                <div className="bg-slate-800 rounded-xl p-4 mb-4 border border-indigo-500/50 shadow-2xl animate-fade-in-up">
                                    {/* ... Character Add Form (Kept same) ... */}
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-xs font-bold text-white uppercase">Add New Character</h4>
                                        <button type="button" onClick={() => setIsAddingChar(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                                    </div>
                                    <input
                                        id="charName"
                                        name="charName"
                                        type="text" placeholder="Character Name (e.g. Neo)" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mb-2 focus:border-indigo-500 outline-none"
                                        value={newCharName} onChange={e => setNewCharName(e.target.value)}
                                    />

                                    <div className="relative">
                                        <textarea
                                            id="charDesc"
                                            name="charDesc"
                                            placeholder="Visual Description (e.g. A tall man in a black trench coat...)" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mb-2 h-20 focus:border-indigo-500 outline-none resize-none pr-10"
                                            value={newCharDesc} onChange={e => setNewCharDesc(e.target.value)}
                                        />
                                        {newCharImages.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleAutoDescription}
                                                disabled={isAnalyzing}
                                                className="absolute bottom-4 right-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-lg"
                                                title="Auto-Describe with AI"
                                            >
                                                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex gap-2 mb-3 overflow-x-auto p-1">
                                        <div onClick={() => fileInputRef.current?.click()} className="w-14 h-14 flex-shrink-0 bg-slate-900 border-dashed border-2 border-slate-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:text-indigo-400 transition-colors text-slate-500">
                                            <Upload className="w-5 h-5" />
                                        </div>
                                        <input id="charImages" name="charImages" ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
                                        {newCharImages.map((img, i) => (
                                            <img key={i} src={img} className="w-14 h-14 rounded-lg object-cover border border-slate-700 shadow-md" />
                                        ))}
                                    </div>
                                    <button type="button" onClick={handleSaveChar} disabled={isCharLoading || !newCharName} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 rounded-lg transition-colors">Save Character</button>
                                </div>
                            )}

                            {/* Character List */}
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide min-h-[90px]">
                                <div
                                    onClick={() => setSelectedCharIds([])}
                                    className={`flex-shrink-0 w-20 flex flex-col items-center gap-2 cursor-pointer p-2 rounded-xl border transition-all ${selectedCharIds.length === 0 ? 'bg-indigo-500/10 border-indigo-500/50' : 'border-transparent hover:bg-slate-800'}`}
                                >
                                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-slate-900 ${selectedCharIds.length === 0 ? 'border-indigo-500 text-indigo-400' : 'border-slate-700 text-slate-600'}`}>
                                        <X className="w-5 h-5" />
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase ${selectedCharIds.length === 0 ? 'text-indigo-300' : 'text-slate-500'}`}>No Char</span>
                                </div>

                                {isCharLoading ? (
                                    <div className="flex items-center px-4 h-20">
                                        <Loader size="sm" text="Syncing..." />
                                    </div>
                                ) : (
                                    characters.map(c => {
                                        const isSelected = selectedCharIds.includes(c.id);
                                        return (
                                            <div key={c.id} onClick={() => {
                                                setSelectedCharIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]);
                                            }} className={`flex-shrink-0 w-20 flex flex-col items-center gap-2 cursor-pointer group relative p-2 rounded-xl border transition-all ${isSelected ? 'bg-indigo-500/10 border-indigo-500/50' : 'border-transparent hover:bg-slate-800'}`}>
                                                <div className={`w-12 h-12 rounded-full border-2 overflow-hidden relative shadow-md ${isSelected ? 'border-indigo-500' : 'border-slate-700'}`}>
                                                    <img src={c.images[0] || c.imageUrl} className="w-full h-full object-cover" />
                                                    {isSelected && <div className="absolute inset-0 bg-indigo-500/40 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-white" /></div>}
                                                </div>
                                                <span className={`text-[10px] font-medium truncate w-full text-center ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>{c.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setDeleteCharModal({ isOpen: true, charId: c.id }); }}
                                                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                                                    title="Delete Character"
                                                >
                                                    <Trash2 className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="lg:col-span-5 space-y-8">
                    <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl h-full flex flex-col">
                        <SectionTitle icon={Mic} title="Audio Studio" subtitle="Select the narrator and soundtrack." />

                        {/* Provider Selector */}
                        <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1.5 rounded-xl mb-6">
                            <button type="button" onClick={() => setTtsProvider('gemini')} disabled={isBusy} className={`py-2.5 rounded-lg text-xs font-bold transition-all ${ttsProvider === 'gemini' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>Google Gemini</button>
                            <button type="button" onClick={() => setTtsProvider('elevenlabs')} disabled={isBusy} className={`py-2.5 rounded-lg text-xs font-bold transition-all ${ttsProvider === 'elevenlabs' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>ElevenLabs</button>
                            <button type="button" onClick={() => setTtsProvider('groq')} disabled={isBusy} className={`py-2.5 rounded-lg text-xs font-bold transition-all ${ttsProvider === 'groq' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>Groq (PlayAI)</button>
                        </div>

                        <label htmlFor="voice" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Voice Model</label>
                        <div className="flex gap-3 mb-8">
                            <div className="relative flex-1">
                                <select id="voice" name="voice" value={voice} onChange={(e) => setVoice(e.target.value)} disabled={isBusy} className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-10 py-3 text-white appearance-none cursor-pointer hover:border-slate-500 transition-colors h-12">
                                    {dynamicVoices.map(v => <option key={v.name} value={v.name}>{v.label} ({v.gender})</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
                            </div>
                            <VoicePreviewButton voice={voice} provider={ttsProvider} voices={dynamicVoices} />
                        </div>

                        {IS_SUNO_ENABLED && (
                            <div
                                onClick={() => !isBusy && setIncludeMusic(!includeMusic)}
                                className={`mt-auto relative overflow-hidden p-5 rounded-2xl border cursor-pointer flex items-center gap-4 transition-all duration-300 group ${includeMusic ? 'bg-gradient-to-br from-pink-500/20 to-purple-600/20 border-pink-500/50' : 'bg-slate-900 border-slate-700 hover:border-pink-500/30'
                                    } ${isBusy ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <div className={`p-3 rounded-full transition-colors ${includeMusic ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/40' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700 group-hover:text-pink-400'}`}>
                                    <Music className="w-6 h-6" />
                                </div>
                                <div className="flex-1 z-10">
                                    <h4 className={`font-bold text-base ${includeMusic ? 'text-pink-100' : 'text-slate-300'}`}>Background Music</h4>
                                    <p className="text-xs text-slate-500 mt-1">AI Generated soundtrack (Instrumental)</p>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${includeMusic ? 'bg-pink-500 border-pink-500' : 'border-slate-600'}`}>
                                    {includeMusic && <Zap className="w-3 h-3 text-white" />}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-12 mt-4 pb-12">
                    <button
                        type="submit"
                        disabled={!topic.trim() || isBusy}
                        className="group relative w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-size-200 hover:bg-pos-100 text-white text-xl font-bold py-6 rounded-2xl shadow-2xl shadow-indigo-900/40 flex items-center justify-center gap-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 transform"
                        style={{ backgroundSize: '200% auto' }}
                    >
                        {isBusy ? (
                            <div className="flex items-center gap-4 py-2">
                                <Loader size="sm" />
                                <span className="animate-pulse">{isSubmitting ? "Generating Script & Scenes..." : (loadingMessage || "Processing...")}</span>
                            </div>
                        ) : (
                            <>
                                <Sparkles className="w-7 h-7 text-indigo-200 group-hover:text-white transition-colors" />
                                <span>Generate Video Workflow</span>
                                <ArrowRight className="w-7 h-7 opacity-60 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                    <p className="text-center text-slate-500 text-xs mt-4">Generates a detailed storyboard, script, and audio assets.</p>
                </div>
            </form>
        </div>
    );
};

export default InputSection;
