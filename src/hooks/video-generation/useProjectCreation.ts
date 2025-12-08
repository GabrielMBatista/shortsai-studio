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
        skipNavigation: boolean = false
    ): Promise<void> => {
        if (!user) { onError("User not authenticated."); return; }

        try {
            const { scenes, metadata } = await generateScript(topic, style, language, {
                minDuration: durationConfig.min,
                maxDuration: durationConfig.max,
                targetScenes: durationConfig.targetScenes
            });

            let bgMusicPrompt = "";
            if (includeMusic) {
                try {
                    // Note: generateMusicPrompt might fail if quota exceeded, we catch it
                    bgMusicPrompt = await generateMusicPrompt(topic, style);
                } catch (e) {
                    console.warn("Music prompt gen failed", e);
                    bgMusicPrompt = "cinematic instrumental background music";
                }
            }

            const newProject: VideoProject = {
                id: crypto.randomUUID(),
                userId: user.id,
                createdAt: Date.now(),
                topic, style, voiceName: voice, ttsProvider: provider, language,
                audioModel,
                referenceCharacters: references,
                scenes,
                generatedTitle: metadata.title,
                generatedDescription: metadata.description,
                durationConfig,
                includeMusic,
                bgMusicStatus: includeMusic ? 'pending' : undefined,
                bgMusicPrompt,
                status: 'draft'
            };

            const savedProject = await saveProject(newProject);
            setProject(savedProject);
            localStorage.setItem('shortsai_last_project_id', savedProject.id);
            queryClient.invalidateQueries({ queryKey: ['projects', user.id] });

            if (!skipNavigation) {
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
