import { useQueryClient } from '@tanstack/react-query';
import { AppStep, User, VideoProject, ReferenceCharacter, TTSProvider } from '../../types';
import { generateScript, generateMusicPrompt } from '../../services/geminiService';
import { saveProject } from '../../services/storageService';

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
        folderId?: string
    ): Promise<void> => {
        if (!user) { onError("User not authenticated."); return; }

        let scenes: any[] = [];
        let metadata = { title: "", description: "" };
        let finalTopic = topic;

        // Bypassing AI if topic is a pre-generated JSON (Bulk Import)
        let isPreGenerated = false;
        try {
            const parsed = JSON.parse(topic);

            // Check for Batch Schedule JSON (id_da_semana)
            if (parsed && (parsed.id_da_semana || parsed.cronograma)) {
                console.log("Detected Batch Schedule JSON");
                let cronograma = null;
                let rootName = "Semana Importada " + new Date().toLocaleDateString();

                if (parsed.cronograma) {
                    // Case: Flat structure { id_da_semana: "...", cronograma: {...} }
                    cronograma = parsed.cronograma;
                    if (typeof parsed.id_da_semana === 'string') {
                        rootName = parsed.id_da_semana.replace(/_/g, ' ');
                    }
                } else if (typeof parsed.id_da_semana === 'object' && parsed.id_da_semana?.cronograma) {
                    // Case: Nested structure { id_da_semana: { cronograma: {...} } }
                    cronograma = parsed.id_da_semana.cronograma;
                    // Attempt to name based on context
                    if (parsed.id_da_semana.meta_global) {
                        rootName = "Semana Nova " + new Date().toLocaleDateString();
                    }
                }

                if (cronograma) {
                    try {
                        // Import dynamically to avoid circular dependencies if any, or just use imported
                        const { createFolder } = await import('../../services/folders');

                        // 1. Create Root Folder
                        const rootFolder = await createFolder(rootName, undefined);
                        const rootId = rootFolder.id || rootFolder._id;

                        // 2. Iterate Days
                        for (const [dayKey, dayContent] of Object.entries(cronograma)) {
                            // dayKey: "segunda_feira"
                            const dayName = dayKey.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

                            const dayFolder = await createFolder(dayName, rootId);
                            const dayId = dayFolder.id || dayFolder._id;

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

                                const title = vData.titulo || vData.title || `${dayName} - ${videoKey}`;
                                const desc = vData.hook_falado ? `Hook: ${vData.hook_falado}` : "";

                                const newProject: VideoProject = {
                                    id: crypto.randomUUID(),
                                    userId: user.id,
                                    createdAt: Date.now(),
                                    topic: title, // Use title as topic to simulate intent
                                    style,
                                    voiceName: voice,
                                    ttsProvider: provider,
                                    language,
                                    audioModel,
                                    referenceCharacters: references,
                                    scenes: newScenes,
                                    generatedTitle: title,
                                    generatedDescription: desc,
                                    durationConfig,
                                    includeMusic,
                                    bgMusicStatus: includeMusic ? 'pending' : undefined,
                                    bgMusicPrompt: includeMusic ? "Inspirational background music" : "",
                                    status: 'draft',
                                    folderId: dayId
                                };

                                await saveProject(newProject, true);
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
                });
                scenes = result.scenes;
                metadata = result.metadata;
            }

            let bgMusicPrompt = "";
            if (includeMusic) {
                // Safely try to extract bgMusicPrompt if pre-generated
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
                id: crypto.randomUUID(),
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
                durationConfig,
                includeMusic,
                bgMusicStatus: includeMusic ? 'pending' : undefined,
                bgMusicPrompt,
                status: 'draft',
                folderId
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
