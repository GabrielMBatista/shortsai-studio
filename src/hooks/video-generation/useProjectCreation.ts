import { useQueryClient } from '@tanstack/react-query';
import { AppStep, User, VideoProject, ReferenceCharacter, TTSProvider } from '../../types';
import { generateScript, generateMusicPrompt } from '../../services/geminiService';
import { saveProject } from '../../services/storageService';

// UUID generator compatible with all browsers
const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for browsers without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Generate week range name in format: DD-DD_MMM_YY (e.g., "16-22_DEZ_24")
const generateWeekRangeName = (): string => {
    const now = new Date();

    // Find next Monday (or today if it's Monday)
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
    const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;

    const monday = new Date(now);
    monday.setDate(now.getDate() + daysUntilMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    // Format dates
    const dayStart = monday.getDate();
    const dayEnd = sunday.getDate();

    const monthNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
        'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const month = monthNames[monday.getMonth()];
    const year = monday.getFullYear().toString().slice(-2);

    return `${dayStart}-${dayEnd}_${month}_${year}`;
};

export const useProjectCreation = (
    user: User | null,
    setProject: React.Dispatch<React.SetStateAction<VideoProject | null>>,
    onError: (msg: string) => void,
    onStepChange: (step: AppStep) => void
) => {
    const queryClient = useQueryClient();

    const generateNewProject = async (
        topic: string,
        style: string,
        voice: string,
        provider: TTSProvider,
        language: string,
        references: ReferenceCharacter[],
        includeMusic: boolean,
        durationConfig: { min: number; max: number; targetScenes?: number } = { min: 55, max: 65 },
        audioModel?: string,
        skipNavigation: boolean = false,
        folderId?: string,
        channelId?: string | null,
        personaId?: string | null
    ): Promise<void> => {
        if (!user) { onError("User not authenticated"); return; }

        let scenes: any[] = [];
        let metadata: any = { title: "", description: "" };
        let finalTopic = topic;

        // Bypassing AI if topic is a pre-generated JSON (Bulk Import)
        let isPreGenerated = false;
        try {
            const parsed = JSON.parse(topic);

            // Check for Batch Schedule JSON (id_da_semana)
            if (parsed && (parsed.id_da_semana || parsed.cronograma)) {
                console.log("Detected Batch Schedule JSON");
                let cronograma = null;
                let rootName = generateWeekRangeName(); // Default: next full week

                if (parsed.cronograma) {
                    // Case: Flat structure { id_da_semana: "...", cronograma: {...} }
                    cronograma = parsed.cronograma;

                    // Validate and use id_da_semana if present and valid format
                    if (typeof parsed.id_da_semana === 'string' &&
                        parsed.id_da_semana.match(/^\d{1,2}-\d{1,2}_[A-Z]{3}_\d{2}$/)) {
                        rootName = parsed.id_da_semana; // Use from JSON (e.g., "16-22_DEZ_24")
                        console.log(`✓ Using week range from JSON: ${rootName}`);
                    } else {
                        console.log(`⚠ Invalid or missing id_da_semana, using calculated: ${rootName}`);
                    }
                } else if (typeof parsed.id_da_semana === 'object' && parsed.id_da_semana?.cronograma) {
                    // Case: Nested structure { id_da_semana: { cronograma: {...} } }
                    cronograma = parsed.id_da_semana.cronograma;
                    console.log(`⚠ Nested structure detected, using calculated: ${rootName}`);
                }

                if (cronograma) {
                    try {

                        // Import dynamically to avoid circular dependencies if any, or just use imported
                        const { createFolder, getFolders } = await import('../../services/folders');

                        // Helper: Idempotent Create
                        const safeCreateFolder = async (name: string, parentId?: string): Promise<string> => {
                            // Check if folder exists FIRST
                            try {
                                const { folders } = await getFolders(false);
                                const targetParent = parentId || null;
                                const existing = folders.find((f: any) => f.name === name && f.parent_id === targetParent);
                                if (existing) {
                                    console.log(`✓ Folder "${name}" already exists, reusing.`);
                                    return existing.id;
                                }
                            } catch (fetchErr) {
                                console.warn('Could not fetch folders, will try to create:', fetchErr);
                            }

                            // Create only if doesn't exist
                            try {
                                const res = await createFolder(name, parentId);
                                console.log(`✓ Created folder "${name}"`);
                                return res.id || res._id;
                            } catch (e: any) {
                                // 409 = Conflict (race condition - someone created it)
                                if (e.status === 409 || (e.message && e.message.includes('exists'))) {
                                    const { folders } = await getFolders(true);
                                    const targetParent = parentId || null;
                                    const match = folders.find((f: any) => f.name === name && f.parent_id === targetParent);
                                    if (match) return match.id;
                                }
                                throw e;
                            }
                        };

                        // 1. Create Root Folder (Idempotent)
                        const rootId = await safeCreateFolder(rootName, undefined);

                        // 2. Iterate Days
                        for (const [dayKey, dayContent] of Object.entries(cronograma)) {
                            // dayKey: "segunda_feira" -> "Segunda Feira"
                            const dayName = dayKey
                                .split('_')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ');

                            console.log(`📁 Creating day folder: "${dayName}" under "${rootName}"`);
                            const dayId = await safeCreateFolder(dayName, rootId);

                            // 3. Iterate Videos
                            const contentObj = dayContent as any;
                            for (const [videoKey, videoData] of Object.entries(contentObj)) {
                                if (['tema_dia', 'meta_dia'].includes(videoKey)) continue;
                                if (!videoData || typeof videoData !== 'object') continue;

                                const vData = videoData as any;
                                if (!vData.scenes) continue;

                                // Helper to generate project
                                const newScenes = vData.scenes.map((s: any, idx: number) => ({
                                    ...s,
                                    visualDescription: s.visual || s.visualDescription || "Scene",
                                    narration: s.narration || "",
                                    sceneNumber: s.scene || s.sceneNumber || (idx + 1),
                                    durationSeconds: 5
                                }));

                                const title = vData.titulo || vData.title || vData.meta?.titulo_otimizado || `${dayName} - ${videoKey}`;

                                // Build generic description from available fields
                                const descParts = [];
                                if (vData.hook_falado || vData.hook_killer) descParts.push(`Hook: ${vData.hook_falado || vData.hook_killer}`);
                                if (vData.description) descParts.push(vData.description);
                                if (vData.meta?.citacao_chave) descParts.push(`"${vData.meta.citacao_chave}"`);
                                if (vData.meta?.mensagem_nuclear) descParts.push(`Mensagem: ${vData.meta.mensagem_nuclear}`);

                                // Hashtags
                                let hashtags: string[] = [];
                                if (Array.isArray(vData.hashtags)) hashtags = vData.hashtags;
                                else if (typeof vData.hashtags === 'string') hashtags = vData.hashtags.split(' ').filter((t: string) => t.trim().length > 0);
                                else if (vData.meta?.hashtags) hashtags = Array.isArray(vData.meta.hashtags) ? vData.meta.hashtags : [];

                                if (hashtags.length > 0) descParts.push(hashtags.join(' '));

                                const fullDesc = descParts.join('\n\n');

                                const newProject: VideoProject = {
                                    id: generateUUID(),
                                    userId: user.id,
                                    createdAt: Date.now(),
                                    topic: JSON.stringify(vData, null, 2), // Save full JSON as topic/prompt for reference
                                    style,
                                    voiceName: voice,
                                    ttsProvider: provider,
                                    language,
                                    audioModel,
                                    referenceCharacters: references,
                                    scenes: newScenes,
                                    generatedTitle: title,
                                    generatedDescription: fullDesc,
                                    generatedShortsHashtags: hashtags,
                                    scriptMetadata: vData, // Store full JSON in metadata as well
                                    durationConfig,
                                    includeMusic,
                                    bgMusicStatus: includeMusic ? 'pending' : undefined,
                                    bgMusicPrompt: includeMusic ? "Inspirational background music" : "",
                                    status: 'draft',
                                    folderId: dayId,
                                    channelId: channelId || undefined,
                                    personaId: personaId || undefined
                                };

                                console.log(`📄 Creating project "${title}" in folder ${dayId} (${dayName})`);
                                const saved = await saveProject(newProject, true);

                                // Robustness: Explicitly patch folder_id in case creation dropped it (stale API)
                                if (dayId) {
                                    try {
                                        // Dynamically import to ensure availability
                                        const { patchProjectMetadata } = await import('../../services/projects');
                                        await patchProjectMetadata(saved.id, { folder_id: dayId });
                                        console.log(`✅ Project "${title}" linked to folder ${dayId}`);
                                    } catch (patchErr) {
                                        console.error(`❌ Failed to patch folder_id for "${title}"`, patchErr);
                                    }
                                }
                            }
                        }

                        queryClient.invalidateQueries({ queryKey: ['projects', user.id] });

                        // We can't easily notify success via onError, but we can redirect.
                        if (!skipNavigation) {
                            onStepChange(AppStep.DASHBOARD);
                        }
                        return; // Exit function, job done.

                    } catch (err: any) {
                        console.error("Batch import failed", err);
                        onError("Falha na importação em lote: " + err.message);
                        return;
                    }
                }
            }


            // Check if parsing result is an object with 'scenes' or 'script'
            if (parsed && (Array.isArray(parsed.scenes) || Array.isArray(parsed.script))) {
                console.log("Detected pre-generated project JSON");
                isPreGenerated = true;
                scenes = parsed.scenes || parsed.script;

                // Normalize scenes
                scenes = scenes.map((s: any, idx: number) => ({
                    ...s,
                    visualDescription: s.visualDescription || s.visual || s.imagePrompt || s.desc || "Scene visual",
                    narration: s.narration || s.audio || s.text || s.speech || "",
                    sceneNumber: s.sceneNumber || s.scene || (idx + 1)
                }));

                const descParts = [];
                if (parsed.description) descParts.push(parsed.description);
                if (parsed.intro) descParts.push(parsed.intro);
                if (parsed.hook_falado) descParts.push(parsed.hook_falado);
                if (parsed.hashtags) descParts.push(parsed.hashtags);
                const combinedDesc = descParts.join("\n\n");

                metadata = {
                    title: parsed.title || parsed.projectTitle || parsed.titulo || "Untitled Project",
                    description: combinedDesc || ""
                };

                // Keep the JSON as the topic for reference, or extract the real topic if available
                finalTopic = parsed.topic || parsed.title || parsed.titulo || "Untitled Logic";
            }
        } catch (e) {
            // Not JSON, proceed with normal generation
        }

        try {
            if (!isPreGenerated) {
                const result = await generateScript(topic, style, language, {
                    minDuration: durationConfig.min,
                    maxDuration: durationConfig.max,
                    targetScenes: durationConfig.targetScenes
                }, { personaId: personaId || undefined, channelId: channelId || undefined });
                scenes = result.scenes;

                // Store metadata separately (not concatenated)
                metadata = {
                    title: result.metadata.title,
                    description: result.metadata.description,
                    shortsHashtags: result.metadata.shortsHashtags || [],
                    tiktokText: result.metadata.tiktokText || "",
                    tiktokHashtags: result.metadata.tiktokHashtags || [],
                    fullMetadata: result.metadata // Full JSON
                };
            }

            let bgMusicPrompt = "";
            if (includeMusic) {
                // Safely try toextract bgMusicPrompt if pre-generated
                let preGenBgMusic = "";
                if (isPreGenerated) {
                    try {
                        const parsed = JSON.parse(topic);
                        preGenBgMusic = parsed.bgMusicPrompt || parsed.musicPrompt;
                    } catch (e) { }
                }

                if (preGenBgMusic) {
                    bgMusicPrompt = preGenBgMusic;
                } else {
                    try {
                        bgMusicPrompt = await generateMusicPrompt(finalTopic, style);
                    } catch (e) {
                        console.warn("Music prompt gen failed", e);
                        bgMusicPrompt = "cinematic instrumental background music";
                    }
                }
            }

            const newProject: VideoProject = {
                id: generateUUID(),
                userId: user.id,
                createdAt: Date.now(),
                topic: finalTopic,
                style,
                voiceName: voice,
                ttsProvider: provider,
                language,
                audioModel,
                referenceCharacters: references,
                scenes,
                generatedTitle: metadata.title || "Untitled Project",
                generatedDescription: metadata.description || "No description generated.",
                generatedShortsHashtags: (metadata as any).shortsHashtags || [],
                generatedTiktokText: (metadata as any).tiktokText || "",
                generatedTiktokHashtags: (metadata as any).tiktokHashtags || [],
                scriptMetadata: (metadata as any).fullMetadata,
                durationConfig,
                includeMusic,
                bgMusicStatus: includeMusic ? 'pending' : undefined,
                bgMusicPrompt,
                status: 'draft',
                folderId: folderId || undefined,
                channelId: channelId || undefined,
                personaId: personaId || undefined
            };

            const savedProject = await saveProject(newProject, true);
            queryClient.invalidateQueries({ queryKey: ['projects', user.id] });

            if (!skipNavigation) {
                setProject(savedProject);
                localStorage.setItem('shortsai_last_project_id', savedProject.id);
                onStepChange(AppStep.SCRIPTING);
            }
        } catch (e: any) {
            console.error(e);
            if (e.message && (e.message.includes('403') || e.message.includes('429'))) {
                onError("Quota limit reached! Please check your plan or API keys.");
            } else {
                onError(e.message || "Failed to generate script.");
            }
            throw e;
        }
    };

    return { generateNewProject };
};
