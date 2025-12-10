import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, ArrowRight } from 'lucide-react';
import JSON5 from 'json5';

import { VIDEO_STYLES, AVAILABLE_LANGUAGES, TTSProvider, User, AVAILABLE_VOICES, IS_SUNO_ENABLED } from '../types';
import { useCharacterLibrary } from '../hooks/useCharacterLibrary';
import Loader from './Loader';
import { ToastType } from './Toast';

import { ScriptConfig } from './CreateProject/ScriptConfig';
import { StyleSelector } from './CreateProject/StyleSelector';
import { CharacterManager } from './CreateProject/CharacterManager';
import { AudioStudio } from './CreateProject/AudioStudio';

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
        durationConfig: { min: number, max: number, targetScenes?: number },
        audioModel?: string,
        skipNavigation?: boolean,
        folderId?: string
    ) => Promise<void>;
    isLoading: boolean;
    loadingMessage?: string;
    showToast: (message: string, type: ToastType) => void;
    editingProject?: import('../types').VideoProject | null;
}

const InputSection: React.FC<InputSectionProps> = ({ user, onGenerate, isLoading, loadingMessage, showToast, editingProject }) => {
    const { t } = useTranslation();
    const { characters, addCharacter, removeCharacter, isLoading: isCharLoading } = useCharacterLibrary(user);

    // --- State Management ---
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Script & Config
    const [topic, setTopic] = useState('');
    const [language, setLanguage] = useState(() => localStorage.getItem('shortsai_pref_language') || AVAILABLE_LANGUAGES[0].label);
    const [minDuration, setMinDuration] = useState<number | ''>(60);
    const [maxDuration, setMaxDuration] = useState<number | ''>(70);
    const [targetScenes, setTargetScenes] = useState<string>("");
    const [bulkProjects, setBulkProjects] = useState<any[]>([]);

    // Style & Characters
    const [style, setStyle] = useState(VIDEO_STYLES[0]);
    const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);

    // Audio
    const [ttsProvider, setTtsProvider] = useState<TTSProvider>(() => (localStorage.getItem('shortsai_pref_provider') as TTSProvider) || 'gemini');
    const [voice, setVoice] = useState(() => localStorage.getItem('shortsai_pref_voice') || '');
    const [audioModel, setAudioModel] = useState<string>(() => localStorage.getItem('shortsai_pref_audio_model') || 'eleven_multilingual_v2');
    const [includeMusic, setIncludeMusic] = useState(false);

    // --- Load Editing Project ---
    useEffect(() => {
        if (editingProject) {
            setTopic(editingProject.topic || '');
            setStyle(editingProject.style || VIDEO_STYLES[0]);
            setLanguage(editingProject.language || 'en');
            setVoice(editingProject.voiceName || '');
            setTtsProvider(editingProject.ttsProvider || 'gemini');
            setAudioModel(editingProject.audioModel || 'eleven_multilingual_v2');
            setIncludeMusic(editingProject.includeMusic || false);

            if (editingProject.durationConfig) {
                setMinDuration(editingProject.durationConfig.min || 60);
                setMaxDuration(editingProject.durationConfig.max || 70);
                if (editingProject.durationConfig.targetScenes) {
                    setTargetScenes(editingProject.durationConfig.targetScenes.toString());
                }
            }

            // Load characters
            const charIds = editingProject.characterIds || [];
            setSelectedCharIds(charIds);
        }
    }, [editingProject]);

    // --- Persistence ---
    useEffect(() => { localStorage.setItem('shortsai_pref_language', language); }, [language]);
    useEffect(() => { localStorage.setItem('shortsai_pref_provider', ttsProvider); }, [ttsProvider]);
    useEffect(() => { if (voice) localStorage.setItem('shortsai_pref_voice', voice); }, [voice]);
    useEffect(() => { localStorage.setItem('shortsai_pref_audio_model', audioModel); }, [audioModel]);

    // --- JSON & Duration Logic ---
    const normalizeProject = (p: any) => {
        const scenes = (p.scenes || p.script || []).map((s: any, idx: number) => ({
            ...s,
            visualDescription: s.visualDescription || s.visual || s.imagePrompt || s.desc || "Scene visual",
            narration: s.narration || s.audio || s.text || s.speech || "",
            sceneNumber: s.sceneNumber || s.scene || (idx + 1)
        }));
        return {
            ...p,
            topic: p.meta?.titulo_otimizado || p.topic || p.title || p.projectTitle || p.titulo || p.tema_dia || "Untitled Project",
            scenes
        };
    };

    const extractProjects = (data: any, projects: any[] = []) => {
        if (!data || typeof data !== 'object') return projects;

        // Structured Weekly Schedule Handling
        if (data.id_da_semana && data.cronograma) {
            // Week Folder Name
            const weekFolderName = data.id_da_semana.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

            Object.keys(data.cronograma).forEach((dayKey: string) => {
                const daySchedule = data.cronograma[dayKey];

                // Day Subfolder Name (e.g., "Segunda")
                const subFolderName = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);

                // Check direct children or deeply nested
                if (typeof daySchedule === 'object') {
                    // e.g. viral_1, viral_2, longo
                    Object.keys(daySchedule).forEach(key => {
                        const content = daySchedule[key];
                        // Skip if it's just a string property like 'tema_dia'
                        if (content && (content.scenes || content.script || typeof content === 'object')) {
                            // Try to normalize
                            if (content.scenes || content.script) {
                                const norm = normalizeProject(content);
                                // Prefix title with type if generic
                                if (!norm.topic || norm.topic === "Untitled Project") {
                                    norm.topic = `${key} - ${norm.scenes[0]?.narration?.slice(0, 20)}...`;
                                }

                                // Attach metadata for hierarchical folder creation
                                norm._folderName = weekFolderName;      // Parent
                                norm._subFolderName = subFolderName;    // Child

                                projects.push(norm);
                            }
                        }
                    });
                }
            });
            return projects;
        }

        if ((data.scenes && Array.isArray(data.scenes)) || (data.script && Array.isArray(data.script))) {
            projects.push(normalizeProject(data));
            return projects;
        }
        if (Array.isArray(data)) {
            data.forEach(item => extractProjects(item, projects));
        } else {
            Object.values(data).forEach(val => extractProjects(val, projects));
        }
        return projects;
    };

    useEffect(() => {
        const trimmed = topic.trim();
        if (!trimmed) {
            if (bulkProjects.length > 0) setBulkProjects([]);
            return;
        }

        const tryParse = (str: string) => {
            try { return JSON5.parse(str); } catch (e) { return null; }
        };

        let json = null;
        let foundProjects: any[] = [];

        const firstBrace = trimmed.indexOf('{');
        const lastBrace = trimmed.lastIndexOf('}');
        const firstBracket = trimmed.indexOf('[');
        const lastBracket = trimmed.lastIndexOf(']');

        if (firstBrace !== -1 && lastBrace > firstBrace) {
            json = tryParse(trimmed.substring(firstBrace, lastBrace + 1));
        }

        if ((!json || (!json.scenes && !Array.isArray(json) && !json.cronograma)) && firstBracket !== -1 && lastBracket > firstBracket) {
            const arrayJson = tryParse(trimmed.substring(firstBracket, lastBracket + 1));
            if (Array.isArray(arrayJson)) {
                json = arrayJson;
            }
        }

        if (json) {
            foundProjects = extractProjects(json);
        }

        if (foundProjects.length > 0) {
            setBulkProjects(foundProjects);
            showToast(`🚀 Detected ${foundProjects.length} projects from JSON!`, 'success');
        } else {
            setBulkProjects([]);
        }

        // Auto-duration logic
        const projectData = foundProjects.length === 1 ? foundProjects[0] : (json && (json.scenes || json.script) ? normalizeProject(json) : null);
        if (projectData) {
            const scenes = projectData.scenes;
            if (Array.isArray(scenes) && scenes.length > 0) {
                const count = scenes.length;
                const totalDuration = scenes.reduce((acc: number, s: any) => {
                    const d = s.duration || s.durationSeconds || s.duration_seconds || s.estimated_duration;
                    if (!d && s.narration) {
                        const words = s.narration.split(/\s+/).length;
                        return acc + Math.max(3, words / 2.5);
                    }
                    const val = typeof d === 'string' ? parseFloat(d) : Number(d);
                    return acc + (isNaN(val) ? 5 : val);
                }, 0);

                if (totalDuration > 0) {
                    const newMin = Math.round(Math.max(5, totalDuration - 5));
                    const newMax = Math.round(totalDuration + 5);
                    setMinDuration((prev) => (Math.abs((typeof prev === 'number' ? prev : 0) - newMin) > 2 ? newMin : prev));
                    setMaxDuration((prev) => (Math.abs((typeof prev === 'number' ? prev : 0) - newMax) > 2 ? newMax : prev));

                    if (!bulkProjects.length) {
                        showToast(`Duration adjusted to ~${Math.round(totalDuration)}s from script`, 'success');
                    }
                }
                if (count > 0) {
                    setTargetScenes(count.toString());
                }
            }
        }
    }, [topic]);

    // --- Handlers ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
            if (bulkProjects.length > 0) {
                let processed = 0;
                const { createFolder } = await import('../services/folders');

                // 1. Identify Unique Folders Structure
                // Map: WeekName -> { id: string, subfolders: Map<SubFolderName, string> }
                const structure = new Map<string, { id: string, subfolders: Map<string, string> }>();

                for (const p of bulkProjects) {
                    if (p._folderName) {
                        if (!structure.has(p._folderName)) {
                            structure.set(p._folderName, { id: '', subfolders: new Map() });
                        }
                        const entry = structure.get(p._folderName)!;
                        if (p._subFolderName && !entry.subfolders.has(p._subFolderName)) {
                            entry.subfolders.set(p._subFolderName, '');
                        }
                    }
                }

                // 2. Create Parent Folders (Weeks)
                for (const [weekName, entry] of structure) {
                    try {
                        // Create Week Folder
                        const res = await createFolder(weekName);
                        if (res && (res.id || res._id)) {
                            entry.id = res.id || res._id;

                            // 3. Create Subfolders (Days) inside Week
                            for (const [subName, _] of entry.subfolders) {
                                try {
                                    const subRes = await createFolder(subName, entry.id); // Pass parentId
                                    if (subRes && (subRes.id || subRes._id)) {
                                        entry.subfolders.set(subName, subRes.id || subRes._id);
                                    }
                                } catch (err) {
                                    console.warn(`Failed to create subfolder ${subName}`, err);
                                }
                            }
                        }
                    } catch (err) {
                        console.warn(`Failed to create folder ${weekName}`, err);
                    }
                }

                // 4. Create Projects in correct folders
                for (let i = 0; i < bulkProjects.length; i++) {
                    const p = bulkProjects[i];
                    const pTopic = JSON.stringify(p);
                    const pStyle = p.style || style;
                    const pVoice = p.voice || voice;
                    const isLast = i === bulkProjects.length - 1;

                    let targetFolderId = undefined;

                    // Resolve Folder ID
                    if (p._folderName && structure.has(p._folderName)) {
                        const entry = structure.get(p._folderName)!;
                        if (p._subFolderName && entry.subfolders.has(p._subFolderName)) {
                            // Use Subfolder ID (Day)
                            targetFolderId = entry.subfolders.get(p._subFolderName);
                        } else {
                            // Fallback to Parent ID (Week) if no subfolder
                            targetFolderId = entry.id;
                        }
                    }

                    await onGenerate(
                        pTopic,
                        pStyle,
                        pVoice,
                        ttsProvider,
                        language,
                        selectedRefs,
                        includeMusic && IS_SUNO_ENABLED,
                        config,
                        audioModel,
                        !isLast,
                        targetFolderId
                    );
                    processed++;
                }
                showToast(`Successfully queued ${processed} projects!`, 'success');
            } else {
                await onGenerate(topic, style, voice, ttsProvider, language, selectedRefs, includeMusic && IS_SUNO_ENABLED, config, audioModel, false);
            }
        } catch (e) {
            console.error(e);
            setIsSubmitting(false);
        }
    };

    const isBusy = isLoading || isSubmitting;

    return (
        <div className="max-w-6xl mx-auto w-full px-6 py-8 flex flex-col items-center">
            <div className="text-center mb-12 animate-fade-in-up">
                <h1 className="text-4xl md:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-4 tracking-tight pb-2">
                    {editingProject ? t('input.edit_title', 'Edit Your Story') : t('input.title')}
                </h1>
                <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto whitespace-pre-line">
                    {editingProject ? t('input.edit_subtitle', 'Adjust settings and regenerate your project') : t('input.subtitle')}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT COLUMN */}
                <div className="lg:col-span-7 space-y-8">
                    <ScriptConfig
                        topic={topic} setTopic={setTopic}
                        language={language} setLanguage={setLanguage}
                        minDuration={minDuration} setMinDuration={setMinDuration}
                        maxDuration={maxDuration} setMaxDuration={setMaxDuration}
                        targetScenes={targetScenes} setTargetScenes={setTargetScenes}
                        isBusy={isBusy}
                        bulkProjectsCount={bulkProjects.length}
                    />

                    <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl">
                        <StyleSelector
                            style={style}
                            setStyle={setStyle}
                            isBusy={isBusy}
                        />

                        <CharacterManager
                            characters={characters}
                            selectedCharIds={selectedCharIds}
                            setSelectedCharIds={setSelectedCharIds}
                            onAddCharacter={addCharacter}
                            onRemoveCharacter={removeCharacter}
                            isBusy={isBusy}
                            isCharLoading={isCharLoading}
                            showToast={showToast}
                        />
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="lg:col-span-5 space-y-8">
                    <AudioStudio
                        ttsProvider={ttsProvider} setTtsProvider={setTtsProvider}
                        voice={voice} setVoice={setVoice}
                        audioModel={audioModel} setAudioModel={setAudioModel}
                        language={language}
                        includeMusic={includeMusic} setIncludeMusic={setIncludeMusic}
                        isBusy={isBusy}
                    />
                </div>

                {/* FOOTER ACTION */}
                <div className="lg:col-span-12 mt-4 pb-12">
                    <button
                        id="btn-generate"
                        type="submit"
                        disabled={!topic.trim() || isBusy}
                        className="group relative w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-size-200 hover:bg-pos-100 text-white text-xl font-bold py-6 rounded-2xl shadow-2xl shadow-indigo-900/40 flex items-center justify-center gap-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 transform"
                        style={{ backgroundSize: '200% auto' }}
                    >
                        {isBusy ? (
                            <div className="flex items-center gap-4 py-2">
                                <Loader size="sm" />
                                <span className="animate-pulse">{isSubmitting ? t('input.generating') : (loadingMessage || t('input.processing'))}</span>
                            </div>
                        ) : (
                            <>
                                <Sparkles className="w-7 h-7 text-indigo-200 group-hover:text-white transition-colors" />
                                <span>{bulkProjects.length > 0 ? `Generate ${bulkProjects.length} Projects` : t('input.generate_button')}</span>
                                <ArrowRight className="w-7 h-7 opacity-60 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                    <p className="text-center text-slate-500 text-xs mt-4">
                        {t('input.footer_desc')} <br />
                        <span className="text-indigo-400 font-semibold">{t('input.daily_limit')}</span>
                    </p>
                </div>
            </form>
        </div>
    );
};

export default InputSection;
