import { useCallback } from 'react';
import { AppStep, User, VideoProject, TTSProvider } from '../../types';
import { workflowClient } from '../../services/workflowClient';
import { saveProject, patchScene } from '../../services/storageService';
import { generateScript } from '../../services/geminiService';

export const useGenerationCommands = (
    project: VideoProject | null,
    setProject: React.Dispatch<React.SetStateAction<VideoProject | null>>,
    user: User | null,
    onError: (msg: string) => void,
    onStepChange: (step: AppStep) => void
) => {
    const isMock = project?.id === 'mock-project-tour';

    const handleCommandError = useCallback((err: any) => {
        console.error("Command failed", err);
        if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota')) {
            onError("Quota limit reached (429). Please check your API keys or upgrade your plan.");
        } else {
            onError(err.message || "Failed to start generation.");
        }
        setProject(prev => prev ? { ...prev, status: 'failed' } : null);
    }, [onError, setProject]);

    const simulateProcessing = (callback: () => void, delayMs = 2000) => {
        setTimeout(callback, delayMs);
    };

    const generateAssets = async () => {
        if (!project || !user) return;

        setProject(prev => prev ? { ...prev, status: 'generating' } : null);
        onStepChange(AppStep.GENERATING_IMAGES);

        if (isMock) {
            setProject(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    scenes: prev.scenes.map(s => ({ ...s, imageStatus: 'loading', audioStatus: 'loading' }))
                };
            });
            simulateProcessing(() => {
                setProject(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        status: 'completed',
                        scenes: prev.scenes.map(s => ({ ...s, imageStatus: 'completed', audioStatus: 'completed' }))
                    };
                });
            }, 3000);
            return;
        }

        try {
            await workflowClient.sendCommand('generate_all', project.id, user.id, undefined, { apiKeys: user.apiKeys });
        } catch (e) {
            handleCommandError(e);
        }
    };

    const generateImagesOnly = async () => {
        if (!project || !user) return;
        setProject(prev => prev ? { ...prev, status: 'generating' } : null);
        onStepChange(AppStep.GENERATING_IMAGES);

        if (isMock) {
            setProject(prev => {
                if (!prev) return null;
                return { ...prev, scenes: prev.scenes.map(s => ({ ...s, imageStatus: 'loading' })) };
            });
            simulateProcessing(() => {
                setProject(prev => {
                    if (!prev) return null;
                    return {
                        ...prev, status: 'completed',
                        scenes: prev.scenes.map(s => ({ ...s, imageStatus: 'completed' }))
                    };
                });
            });
            return;
        }

        try {
            await workflowClient.sendCommand('generate_all_images', project.id, user.id, undefined, { apiKeys: user.apiKeys });
        } catch (e) {
            handleCommandError(e);
        }
    };

    const generateAudioOnly = async () => {
        if (!project || !user) return;
        setProject(prev => prev ? { ...prev, status: 'generating' } : null);
        onStepChange(AppStep.GENERATING_IMAGES);

        if (isMock) {
            setProject(prev => {
                if (!prev) return null;
                return { ...prev, scenes: prev.scenes.map(s => ({ ...s, audioStatus: 'loading' })) };
            });
            simulateProcessing(() => {
                setProject(prev => {
                    if (!prev) return null;
                    return {
                        ...prev, status: 'completed',
                        scenes: prev.scenes.map(s => ({ ...s, audioStatus: 'completed' }))
                    };
                });
            });
            return;
        }

        try {
            await workflowClient.sendCommand('generate_all_audio', project.id, user.id, undefined, { apiKeys: user.apiKeys });
        } catch (e) {
            handleCommandError(e);
        }
    };

    const cancelGeneration = () => {
        if (!project || !user) return;
        if (isMock) {
            setProject(prev => prev ? { ...prev, status: 'draft' } : null);
            return;
        }
        workflowClient.sendCommand('cancel', project.id, user.id);
    };

    const resumeGeneration = async () => {
        if (!project || !user) return;
        setProject(prev => prev ? { ...prev, status: 'generating' } : null);

        if (isMock) {
            simulateProcessing(() => {
                setProject(prev => prev ? { ...prev, status: 'completed' } : null);
            });
            return;
        }

        try {
            await workflowClient.sendCommand('resume', project.id, user.id, undefined, { apiKeys: user.apiKeys });
        } catch (e) {
            handleCommandError(e);
        }
    };

    const regenerateSceneAssetInternal = async (sceneId: string, type: 'image' | 'audio' | 'video', force: boolean) => {
        if (!project || !user) return;

        if (isMock) {
            simulateProcessing(() => {
                setProject(prev => {
                    if (!prev) return null;
                    const idx = prev.scenes.findIndex(s => s.id === sceneId);
                    if (idx === -1) return prev;
                    const newScenes = [...prev.scenes];
                    const statusKey = type === 'image' ? 'imageStatus' : type === 'audio' ? 'audioStatus' : 'videoStatus';
                    // @ts-ignore
                    newScenes[idx] = { ...newScenes[idx], [statusKey]: 'completed' };
                    return { ...prev, scenes: newScenes };
                });
            }, 1500);
            return;
        }

        const action = type === 'image' ? 'regenerate_image' : type === 'audio' ? 'regenerate_audio' : 'regenerate_video';
        try {
            await workflowClient.sendCommand(action, project.id, user.id, sceneId, { force, apiKeys: user.apiKeys });
        } catch (e) {
            handleCommandError(e);
        }
    };

    const regenerateSceneImage = (idx: number, force: boolean) => {
        const s = project?.scenes[idx];
        if (s?.id) {
            setProject(prev => {
                if (!prev) return null;
                const newScenes = [...prev.scenes];
                newScenes[idx] = { ...newScenes[idx], imageStatus: 'loading' };
                return { ...prev, scenes: newScenes };
            });
            regenerateSceneAssetInternal(s.id, 'image', force);
        }
    };

    const regenerateSceneVideo = (idx: number, force: boolean) => {
        const s = project?.scenes[idx];
        if (s?.id) {
            setProject(prev => {
                if (!prev) return null;
                const newScenes = [...prev.scenes];
                newScenes[idx] = { ...newScenes[idx], videoStatus: 'loading' };
                return { ...prev, scenes: newScenes };
            });
            regenerateSceneAssetInternal(s.id, 'video', force);
        }
    };

    const regenerateSceneAudio = async (idx: number, force: boolean, overrides?: { voice?: string, provider?: TTSProvider, language?: string }) => {
        const s = project?.scenes[idx];
        if (s?.id) {
            if (overrides && project) {
                const updated = {
                    ...project,
                    voiceName: overrides.voice || project.voiceName,
                    ttsProvider: overrides.provider || project.ttsProvider,
                    language: overrides.language || project.language
                };
                if (!isMock) {
                    await saveProject(updated);
                }
                setProject(updated);
            }

            setProject(prev => {
                if (!prev) return null;
                const newScenes = [...prev.scenes];
                newScenes[idx] = { ...newScenes[idx], audioStatus: 'loading' };
                return { ...prev, scenes: newScenes };
            });
            regenerateSceneAssetInternal(s.id, 'audio', force);
        }
    };

    const regenerateAllAudio = async (voice: string, provider: TTSProvider, language: string, audioModel?: string) => {
        if (!project || !user) return;

        const updated = { ...project, voiceName: voice, ttsProvider: provider, language, audioModel };
        if (!isMock) await saveProject(updated);
        setProject(updated);

        onStepChange(AppStep.GENERATING_IMAGES);
        setProject(prev => prev ? { ...prev, status: 'generating' } : null);

        if (isMock) {
            simulateProcessing(() => {
                setProject(prev => {
                    if (!prev) return null;
                    return {
                        ...prev, status: 'completed',
                        scenes: prev.scenes.map(s => ({ ...s, audioStatus: 'completed' }))
                    };
                });
            });
            return;
        }

        try {
            await workflowClient.sendCommand('generate_all_audio', project.id, user.id, undefined, { force: true, apiKeys: user.apiKeys });
        } catch (e) {
            handleCommandError(e);
        }
    };

    const regenerateMusic = async () => {
        if (!project || !user) return;
        setProject(prev => prev ? { ...prev, bgMusicStatus: 'loading' } : null);

        if (isMock) {
            simulateProcessing(() => {
                setProject(prev => prev ? { ...prev, bgMusicStatus: 'completed' } : null);
            });
            return;
        }

        try {
            await workflowClient.sendCommand('generate_music', project.id, user.id, undefined, { force: true, apiKeys: user.apiKeys });
        } catch (e) {
            handleCommandError(e);
            setProject(prev => prev ? { ...prev, bgMusicStatus: 'failed' } : null);
        }
    };

    const regenerateScript = async () => {
        if (!project || !user) return;
        setProject(prev => prev ? { ...prev, status: 'generating' } : null);

        if (isMock) {
            simulateProcessing(() => {
                setProject(prev => prev ? { ...prev, status: 'draft' } : null);
            });
            return;
        }

        try {
            const { scenes, metadata } = await generateScript(
                project.topic, project.style, project.language,
                {
                    minDuration: project.durationConfig?.min || 55,
                    maxDuration: project.durationConfig?.max || 65,
                    targetScenes: project.durationConfig?.targetScenes
                }
            );

            const updatedProject: VideoProject = {
                ...project,
                scenes: scenes,
                generatedTitle: metadata.title,
                generatedDescription: metadata.description,
                status: 'draft'
            };

            await saveProject(updatedProject);
            setProject(updatedProject);
        } catch (e: any) {
            console.error("Failed to regenerate script", e);
            handleCommandError(e);
            setProject(prev => prev ? { ...prev, status: 'draft' } : null);
        }
    };

    return {
        generateAssets,
        generateImagesOnly,
        generateAudioOnly,
        cancelGeneration,
        resumeGeneration,
        regenerateSceneImage,
        regenerateSceneAudio,
        regenerateSceneVideo,
        regenerateAllAudio,
        regenerateMusic,
        regenerateScript
    };
};
