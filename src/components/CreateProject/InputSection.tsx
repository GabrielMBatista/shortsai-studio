import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, ArrowRight } from 'lucide-react';
import JSON5 from 'json5';

import { VIDEO_STYLES, AVAILABLE_LANGUAGES, TTSProvider, User, AVAILABLE_VOICES, IS_SUNO_ENABLED } from '../../types';
import { useCharacterLibrary } from '../../hooks/useCharacterLibrary';
import { useChannels } from '../../hooks/useChannels';
import { usePersonas } from '../../hooks/usePersonas';
import Loader from '../Common/Loader';
import { ToastType } from '../Common/Toast';
import { Button } from '../ui/Button';
import { apiFetch } from '../../services/api';



import { ScriptConfig } from './ScriptConfig';
import { StyleSelector } from './StyleSelector';
import { CharacterManager } from './CharacterManager';
import { AudioStudio } from './AudioStudio';
import { ChannelPersonaSelector } from './ChannelPersonaSelector';

// ...


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
        folderId?: string,
        channelId?: string | null,  // 🆕 NOVO
        personaId?: string | null    // 🆕 NOVO
    ) => Promise<void>;
    isLoading: boolean;
    loadingMessage?: string;
    showToast: (message: string, type: ToastType) => void;
    editingProject?: import('../../types').VideoProject | null;
    initialPersonaId?: string | null;
}

const InputSection: React.FC<InputSectionProps> = ({ user, onGenerate, isLoading, loadingMessage, showToast, editingProject, initialPersonaId }) => {
    const { t } = useTranslation();
    const { characters, addCharacter, removeCharacter, isLoading: isCharLoading } = useCharacterLibrary(user);
    const { channels } = useChannels();

    // --- State Management ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(initialPersonaId || null);

    // Update if initial changes (e.g. returning from Persona Library)
    useEffect(() => {
        if (initialPersonaId) setSelectedPersonaId(initialPersonaId);
    }, [initialPersonaId]);

    // Fetch Personas for Selector
    const { personas } = usePersonas();

    // Script & Config
    const [topic, setTopic] = useState('');
    const [language, setLanguage] = useState(() => localStorage.getItem('shortsai_pref_language') || AVAILABLE_LANGUAGES[0].code);
    const [minDuration, setMinDuration] = useState<number | ''>(60);
    const [maxDuration, setMaxDuration] = useState<number | ''>(70);
    const [targetScenes, setTargetScenes] = useState<string>("");
    const [bulkProjects, setBulkProjects] = useState<any[]>([]);
    const lastProcessedTopic = React.useRef<string>('');
    const debounceTimer = React.useRef<NodeJS.Timeout | null>(null);

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
            sceneNumber: s.sceneNumber || s.scene || (idx + 1),
            // Ensure asset reuse fields are preserved
            assetId: s.assetId,
            assetType: s.assetType
        }));
        return {
            ...p,
            topic: p.meta?.titulo_otimizado || p.topic || p.title || p.projectTitle || p.titulo || p.tema_dia || "Untitled Project",
            scenes,
            hook_falado: p.hook_falado || p.hook // preserve hook for generation
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

    // --- State for JSON Validation ---
    const [jsonParseError, setJsonParseError] = useState<string | null>(null);

    // --- JSON & Duration Logic (Debounced) ---
    useEffect(() => {
        const trimmed = topic.trim();
        if (trimmed === lastProcessedTopic.current) return;

        // Reset state for short topics
        if (!trimmed || trimmed.length < 10) {
            setJsonParseError(null);
            if (bulkProjects.length > 0) setBulkProjects([]);
            lastProcessedTopic.current = trimmed;
            return;
        }

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(async () => {
            lastProcessedTopic.current = trimmed;
            setJsonParseError(null);

            const tryParse = (str: string) => {
                try { return JSON5.parse(str); } catch (e: any) { return e.message; }
            };

            let json = null;
            let foundProjects: any[] = [];
            let error = null;

            const firstBrace = trimmed.indexOf('{');
            const lastBrace = trimmed.lastIndexOf('}');
            const firstBracket = trimmed.indexOf('[');
            const lastBracket = trimmed.lastIndexOf(']');

            // Naive check: does it look like JSON?
            const looksLikeJson = (firstBrace === 0) || (firstBracket === 0);

            // Optimization: if it doesn't look like JSON and it's just a few words, don't even try deep parsing
            if (!looksLikeJson && trimmed.split(' ').length < 10 && !trimmed.includes('{')) {
                return;
            }

            if (firstBrace !== -1 && lastBrace > firstBrace) {
                const result = tryParse(trimmed.substring(firstBrace, lastBrace + 1));
                if (typeof result === 'object' && result !== null) {
                    json = result;
                } else if (looksLikeJson && typeof result === 'string') {
                    error = result;
                }
            } else if (looksLikeJson && (lastBrace === -1 || lastBrace < firstBrace)) {
                error = "Incomplete JSON: Missing closing brace '}'";
            }


            if ((!json || (!json.scenes && !Array.isArray(json) && !json.cronograma && !json.id_do_roteiro)) && firstBracket !== -1 && lastBracket > firstBracket) {
                const substring = trimmed.substring(firstBracket, lastBracket + 1);
                const arrayJson = tryParse(substring);
                if (Array.isArray(arrayJson)) {
                    json = arrayJson;
                    error = null;
                } else if (looksLikeJson && typeof arrayJson === 'string') {
                    if (!error) error = arrayJson;
                }
            }


            if (json) {
                try {
                    console.log('[InputSection] Sending to /scripts/normalize:', JSON.stringify(json).substring(0, 300));

                    // Use apiFetch for consistency and to avoid double /api
                    const data = await apiFetch('/scripts/normalize', {
                        method: 'POST',
                        body: JSON.stringify({
                            scriptJson: json,
                            fallbackTopic: 'Untitled'
                        })
                    });

                    if (data && data.success && data.normalized && data.normalized.scenes && data.normalized.scenes.length > 0) {
                        console.log(`✅ Backend detected valid script: ${data.normalized.scenes.length} scenes`);

                        // CRITICAL: Mark as already normalized to prevent re-normalization
                        const normalizedProject = {
                            ...data.normalized,
                            _isNormalized: true,  // Flag to skip re-normalization
                            title: data.normalized.videoTitle,  // Preserve title
                            description: data.normalized.videoDescription  // Preserve description
                        };

                        setBulkProjects([normalizedProject]);
                        showToast(t('input.json_detected', { count: 1 }), 'success');

                        // Auto-duration logic
                        handleAutoDuration(normalizedProject);
                        return;
                    }
                } catch (normErr) {
                    console.warn('Backend normalization failed, using local extraction:', normErr);
                }

                foundProjects = extractProjects(json);
                if (foundProjects.length > 0) {
                    setBulkProjects(foundProjects);
                    showToast(t('input.json_detected', { count: foundProjects.length }), 'success');
                    handleAutoDuration(foundProjects[0]);
                }
            } else if (looksLikeJson && error) {
                setJsonParseError(error);
                setBulkProjects([]);
            }
        }, 800);

        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [topic]);

    const handleAutoDuration = (projectData: any) => {
        if (!projectData) return;
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

                showToast(t('input.duration_adjusted', { seconds: Math.round(totalDuration) }), 'success');
            }
            if (count > 0) {
                setTargetScenes(count.toString());
            }
        }
    };

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
                const { createFolder } = await import('../../services/folders');

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
                        targetFolderId,
                        selectedChannelId, // 🆕 Pass channel
                        selectedChannelId ? channels.find(ch => ch.id === selectedChannelId)?.personaId : null // 🆕 Pass persona
                    );
                    processed++;
                }
                showToast(t('input.queued_success', { count: processed }), 'success');
            } else {
                await onGenerate(
                    topic,
                    style,
                    voice,
                    ttsProvider,
                    language,
                    selectedRefs,
                    includeMusic && IS_SUNO_ENABLED,
                    config,
                    audioModel,
                    false,
                    undefined, // folderId
                    selectedChannelId, // 🆕 Pass channel
                    // logic: if channel selected, use channel's persona. Else use manually selected persona.
                    selectedChannelId
                        ? (channels.find(ch => ch.id === selectedChannelId)?.personaId || null)
                        : selectedPersonaId
                );
            }
        } catch (e) {
            console.error(e);
            setIsSubmitting(false);
        }
    };

    const isBusy = isLoading || isSubmitting;

    // --- Active Persona Logic ---
    const activePersona = React.useMemo(() => {
        if (selectedChannelId) {
            const channel = channels.find(c => c.id === selectedChannelId);
            if (channel?.personaId) {
                return personas.find(p => p.id === channel.personaId) || null;
            }
        }
        if (selectedPersonaId) {
            return personas.find(p => p.id === selectedPersonaId) || null;
        }
        return null;
    }, [selectedChannelId, selectedPersonaId, channels, personas]);

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
                    {/* Channel & Persona Selector */}
                    <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl hover:border-slate-600 transition-colors">
                        <ChannelPersonaSelector
                            channels={channels}
                            personas={personas}
                            selectedChannelId={selectedChannelId}
                            selectedPersonaId={selectedPersonaId}
                            onChannelSelect={setSelectedChannelId}
                            onPersonaSelect={setSelectedPersonaId}
                            disabled={isBusy}
                        />
                    </div>

                    <ScriptConfig
                        topic={topic} setTopic={setTopic}
                        language={language} setLanguage={setLanguage}
                        minDuration={minDuration} setMinDuration={setMinDuration}
                        maxDuration={maxDuration} setMaxDuration={setMaxDuration}
                        targetScenes={targetScenes} setTargetScenes={setTargetScenes}
                        isBusy={isBusy}
                        bulkProjectsCount={bulkProjects.length}
                        activePersona={activePersona}
                        selectedChannelId={selectedChannelId}
                    />

                    {jsonParseError && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-xl text-sm animate-pulse-fast transition-all">
                            <div className="flex items-center gap-2 mb-1 font-semibold">
                                ⚠️ JSON Parsing Error
                            </div>
                            <code className="block whitespace-pre-wrap font-mono text-xs opacity-90 break-all">
                                {jsonParseError}
                            </code>
                            <p className="mt-2 text-xs opacity-75">Check for missing closing braces {'}}'} or commas.</p>
                        </div>
                    )}

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
                    <Button
                        id="btn-generate"
                        type="submit"
                        disabled={!topic.trim() || isBusy}
                        isLoading={isBusy}
                        variant="primary"
                        size="lg"
                        fullWidth
                        className="py-6 text-xl shadow-2xl shadow-indigo-900/40"
                        leftIcon={!isBusy ? <Sparkles className="w-6 h-6 text-indigo-200" /> : undefined}
                        rightIcon={!isBusy ? <ArrowRight className="w-6 h-6 opacity-60" /> : undefined}
                    >
                        {isBusy
                            ? (isSubmitting ? t('input.generating') : (loadingMessage || t('input.processing')))
                            : (bulkProjects.length > 0 ? `Generate ${bulkProjects.length} Projects` : t('input.generate_button'))
                        }
                    </Button>
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
