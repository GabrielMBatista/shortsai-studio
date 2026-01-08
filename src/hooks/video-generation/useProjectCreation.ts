import { useQueryClient } from '@tanstack/react-query';
import { AppStep, User, VideoProject, ReferenceCharacter, TTSProvider } from '../../types';
import { generateScript, generateMusicPrompt } from '../../services/geminiService';
import { saveProject } from '../../services/.';
import { apiFetch } from '../../services/api';

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

                        // Helper: Robust folder creation with idempotency
                        const safeCreateFolder = async (name: string, parentId?: string): Promise<string> => {
                            const targetParent = parentId || null;
                            console.log(`🔍 Checking folder "${name}" (parent: ${targetParent || 'root'})...`);

                            // ALWAYS check first
                            try {
                                const { folders } = await getFolders(false);
                                const existing = folders.find((f: any) =>
                                    f.name === name && f.parent_id === targetParent
                                );

                                if (existing) {
                                    console.log(`✓ Folder "${name}" exists, ID: ${existing.id}`);
                                    return existing.id;
                                }
                            } catch (fetchErr) {
                                console.warn(`⚠ Could not fetch folders:`, fetchErr);
                            }

                            // Create only if not found
                            console.log(`📁 Creating folder "${name}"...`);
                            try {
                                const res = await createFolder(name, parentId);
                                const newId = res.id || res._id;
                                console.log(`✅ Created folder "${name}", ID: ${newId}`);
                                return newId;
                            } catch (createErr: any) {
                                // Race condition: someone else created it
                                if (createErr.status === 409 || createErr.message?.includes('exists')) {
                                    console.warn(`⚠ Folder "${name}" was just created by another process, fetching...`);
                                    const { folders } = await getFolders(true); // Force refresh
                                    const match = folders.find((f: any) =>
                                        f.name === name && f.parent_id === targetParent
                                    );
                                    if (match) {
                                        console.log(`✓ Found folder "${name}", ID: ${match.id}`);
                                        return match.id;
                                    }
                                }
                                console.error(`❌ Failed to create folder "${name}":`, createErr);
                                throw createErr;
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

                                // Process scenes with correct duration
                                const newScenes = vData.scenes.map((s: any, idx: number) => {
                                    // Use duration from JSON if available, otherwise calculate from narration
                                    let duration = s.duration || s.durationSeconds || 5;

                                    // If duration is still default and we have narration, calculate based on word count
                                    if (duration === 5 && s.narration) {
                                        const wordCount = s.narration.split(/\s+/).length;
                                        duration = Math.ceil(wordCount / 3.5); // 3.5 words per second as per persona
                                        duration = Math.min(duration, 8); // Max 8s per scene for Veo
                                    }

                                    return {
                                        ...s,
                                        visualDescription: s.visual || s.visualDescription || "Scene",
                                        narration: s.narration || "",
                                        sceneNumber: s.scene || s.sceneNumber || (idx + 1),
                                        durationSeconds: duration
                                    };
                                });

                                // 1. TÍTULO E CONTEÚDO: Extrair do roteiro da persona
                                const baseTitle = vData.titulo || vData.title || `${dayName} - ${videoKey}`;
                                const hook = vData.hook_falado || "";
                                const narrations = newScenes.map(s => s.narration).join(' ');
                                const videoContent = `${hook}\n\n${narrations}`;

                                // 🚀 SOLUÇÃO ASSÍNCRONA: Criar projeto IMEDIATAMENTE, otimizar DEPOIS
                                // Fallback metadata (SEMPRE válido)
                                const fallbackTitle = baseTitle;
                                let fallbackDesc = "";
                                const descParts = [];

                                // Adiciona hook se existir
                                if (hook && hook.trim()) {
                                    descParts.push(hook.trim());
                                }

                                // Adiciona resumo das cenas
                                if (newScenes && newScenes.length > 0) {
                                    const essenceScenes = newScenes.slice(0, Math.min(3, newScenes.length));
                                    const essence = essenceScenes.map(s => s.narration).filter(n => n && n.trim()).join(' ').trim();

                                    if (essence && essence !== hook) {
                                        const truncated = essence.length > 200 ? essence.substring(0, 200) + '...' : essence;
                                        descParts.push(truncated);
                                    }
                                }

                                // Se ainda não temos descrição, usa o baseTitle
                                if (descParts.length === 0) {
                                    descParts.push(baseTitle);
                                }

                                // CTA padrão
                                descParts.push("💬 Comente 'Amém' e compartilhe com quem precisa ouvir isso!");
                                fallbackDesc = descParts.join('\n\n');

                                // Gera hashtags básicas
                                const fallbackHashtags: string[] = [];
                                const stopwords = ['o', 'a', 'de', 'da', 'do', 'os', 'as', 'em', 'e', 'para', 'com', 'que', 'é', 'se', 'não'];
                                const titleWords = baseTitle.toLowerCase().replace(/[^\w\sáéíóúâêôãõç]/g, '').split(/\s+/).filter(w => w.length > 3 && !stopwords.includes(w)).slice(0, 5);
                                fallbackHashtags.push('#shorts', '#viral', '#fe', '#jesus', '#deus');
                                titleWords.forEach(word => {
                                    const tag = `#${word.replace(/\s+/g, '')}`;
                                    if (!fallbackHashtags.includes(tag)) fallbackHashtags.push(tag);
                                });
                                const content = (baseTitle + ' ' + narrations).toLowerCase();
                                if (content.includes('bíbli') || content.includes('verso') || content.includes('salmo')) fallbackHashtags.push('#biblia');
                                if (content.includes('oração') || content.includes('ora')) fallbackHashtags.push('#oracao');
                                if (content.includes('amor')) fallbackHashtags.push('#amor');
                                if (content.includes('paz')) fallbackHashtags.push('#paz');
                                if (content.includes('esperança') || content.includes('espera')) fallbackHashtags.push('#esperanca');
                                const finalFallbackHashtags = [...new Set(fallbackHashtags)].slice(0, 12);


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
                                    // TÍTULOS TEMPORÁRIOS: Usuário vê IMEDIATAMENTE
                                    generatedTitle: `⏳ ${fallbackTitle}`,
                                    generatedDescription: "Gerando descrição otimizada...",
                                    generatedShortsHashtags: ['#shorts'],
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

                                console.log(`📄 Creating project "${fallbackTitle}" in folder ${dayId} (${dayName})`);
                                const saved = await saveProject(newProject, true);

                                // Robustness: Explicitly patch folder_id in case creation dropped it (stale API)
                                if (dayId) {
                                    try {
                                        // Dynamically import to ensure availability
                                        const { patchProjectMetadata } = await import('../../services/projects');
                                        await patchProjectMetadata(saved.id, { folder_id: dayId });
                                        console.log(`✅ Project "${fallbackTitle}" linked to folder ${dayId}`);
                                    } catch (patchErr) {
                                        console.error(`❌ Failed to patch folder_id for "${fallbackTitle}"`, patchErr);
                                    }
                                }

                                // 🔥 BACKGROUND ASYNC: MOVED TO BACKEND
                                // O servidor agora gerencia a geração de metadados automaticamente após a criação.
                                queryClient.invalidateQueries({ queryKey: ['projects', user.id] });
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



            // Check if parsing result is a pre-generated script
            // Use backend normalization to handle ANY persona format variation
            try {
                console.log("[DEBUG] Attempting to normalize JSON using backend normalizer...");
                console.log("[DEBUG] Parsed JSON keys:", Object.keys(parsed));

                // CRITICAL: Check if already normalized by frontend
                if (parsed._isNormalized && parsed.scenes && Array.isArray(parsed.scenes)) {
                    console.log("✅ [DEBUG] JSON already normalized by frontend, using directly");
                    isPreGenerated = true;
                    scenes = parsed.scenes;

                    metadata = {
                        title: parsed.title || parsed.videoTitle || (parsed.meta && parsed.meta.titulo_otimizado) || "Untitled Project",
                        description: parsed.description || parsed.videoDescription || (parsed.meta && parsed.meta.mensagem_nuclear) || "",
                        shortsHashtags: parsed.shortsHashtags || [],
                        tiktokText: parsed.tiktokText || "",
                        tiktokHashtags: parsed.tiktokHashtags || [],
                        fullMetadata: parsed.metadata || parsed
                    };

                    console.log("[DEBUG] Using pre-normalized metadata:", metadata);
                } else {
                    // Not pre-normalized, call backend

                    // Defensive: ensure we're sending an object, not a string
                    let scriptJsonToSend = parsed;
                    if (typeof scriptJsonToSend === 'string') {
                        try {
                            scriptJsonToSend = JSON.parse(scriptJsonToSend);
                        } catch (e) {
                            console.error('[useProjectCreation] Failed to parse scriptJson string:', e);
                        }
                    }

                    const normalizeResponse = await fetch('/api/scripts/normalize', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            scriptJson: scriptJsonToSend,
                            fallbackTopic: topic
                        })
                    });

                    console.log("[DEBUG] Normalize response status:", normalizeResponse.status, normalizeResponse.ok);

                    if (normalizeResponse.ok) {
                        const responseData = await normalizeResponse.json();
                        console.log("[DEBUG] Normalize response data:", JSON.stringify(responseData, null, 2));

                        const { success, normalized } = responseData;

                        if (success && normalized && normalized.scenes && normalized.scenes.length > 0) {
                            console.log(`✅ [DEBUG] Backend normalized successfully: ${normalized.scenes.length} scenes detected`);
                            console.log(`[DEBUG] Normalized videoTitle:`, normalized.videoTitle);
                            console.log(`[DEBUG] Normalized videoDescription:`, normalized.videoDescription);
                            console.log(`[DEBUG] Normalized metadata:`, normalized.metadata);

                            isPreGenerated = true;
                            scenes = normalized.scenes;

                            metadata = {
                                title: normalized.videoTitle || (normalized.metadata && normalized.metadata.titulo_otimizado) || "Untitled Project",
                                description: normalized.videoDescription || (normalized.metadata && normalized.metadata.mensagem_nuclear) || "",
                                shortsHashtags: normalized.shortsHashtags || [],
                                tiktokText: normalized.tiktokText || "",
                                tiktokHashtags: normalized.tiktokHashtags || [],
                                fullMetadata: normalized.metadata
                            };

                            console.log("[DEBUG] Final metadata object:", metadata);
                            // Keep original JSON in topic - don't overwrite with just the title
                        } else {
                            console.warn("[DEBUG] Normalization returned invalid data:", { success, hasNormalized: !!normalized, hasScenes: normalized?.scenes?.length });
                        }
                    } else {
                        const errorText = await normalizeResponse.text();
                        console.warn("[DEBUG] Backend normalization HTTP error:", normalizeResponse.status, errorText);
                    }
                } // end of else block for _isNormalized check
            } catch (normErr) {
                console.error("[DEBUG] Failed to normalize with backend:", normErr);
                // Fall through to AI generation
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
