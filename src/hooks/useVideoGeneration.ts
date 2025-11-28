import { useState, useEffect } from 'react';
import { AppStep, User, VideoProject, ReferenceCharacter, TTSProvider, Scene } from '../types';
import { workflowClient, WorkflowState } from '../services/workflowClient';
import { generateScript, generateMusicPrompt } from '../services/geminiService';
import { saveProject, deleteScene } from '../services/storageService';
import { useQueryClient } from '@tanstack/react-query';

interface UseVideoGenerationProps {
  user: User | null;
  onError: (msg: string) => void;
  onStepChange: (step: AppStep) => void;
}

export const useVideoGeneration = ({ user, onError, onStepChange }: UseVideoGenerationProps) => {
  const [project, setProject] = useState<VideoProject | null>(null);
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const queryClient = useQueryClient();

  // 1. Connect to Backend via Client
  useEffect(() => {
    if (!project?.id) return;

    workflowClient.connect(project.id, (state) => {
      setWorkflowState(state);

      // Sync project state
      setProject(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: state.projectStatus,
          scenes: state.scenes,
          bgMusicStatus: state.music_status as any,
          bgMusicUrl: state.music_url
        };
      });
    });

    return () => {
      workflowClient.disconnect();
    };
  }, [project?.id]);

  // --- WORKFLOW COMMANDS (Pass-through to Backend) ---

  const generateAssets = () => {
    if (!project || !user) return;
    onStepChange(AppStep.GENERATING_IMAGES);
    workflowClient.sendCommand('generate_all', project.id, user.id, undefined, { apiKeys: user.apiKeys });
  };

  const generateImagesOnly = () => {
    if (!project || !user) return;
    onStepChange(AppStep.GENERATING_IMAGES);
    workflowClient.sendCommand('generate_all_images', project.id, user.id, undefined, { apiKeys: user.apiKeys });
  };

  const generateAudioOnly = () => {
    if (!project || !user) return;
    onStepChange(AppStep.GENERATING_IMAGES);
    workflowClient.sendCommand('generate_all_audio', project.id, user.id, undefined, { apiKeys: user.apiKeys });
  };

  const cancelGeneration = () => {
    if (!project || !user) return;
    workflowClient.sendCommand('cancel', project.id, user.id);
  };

  const resumeGeneration = () => {
    if (!project || !user) return;
    workflowClient.sendCommand('resume', project.id, user.id, undefined, { apiKeys: user.apiKeys });
  };

  const regenerateSceneAsset = (sceneId: string, type: 'image' | 'audio', force: boolean) => {
    if (!project || !user) return;
    const action = type === 'image' ? 'regenerate_image' : 'regenerate_audio';
    workflowClient.sendCommand(action, project.id, user.id, sceneId, { force, apiKeys: user.apiKeys });
  };

  // --- CREATION ACTIONS (Initial Scripting) ---

  const generateNewProject = async (
    topic: string,
    style: string,
    voice: string,
    provider: TTSProvider,
    language: string,
    references: ReferenceCharacter[],
    includeMusic: boolean,
    durationConfig: { min: number; max: number; targetScenes?: number } = { min: 55, max: 65 }
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
      queryClient.invalidateQueries({ queryKey: ['projects', user.id] });

      onStepChange(AppStep.SCRIPTING);
    } catch (e: any) {
      console.error(e);
      onError(e.message || "Failed to generate script.");
      throw e;
    }
  };

  const regenerateAllAudio = async (voice: string, provider: TTSProvider, language: string) => {
    if (!project || !user) return;

    // Update settings in DB
    const updated = { ...project, voiceName: voice, ttsProvider: provider, language };
    await saveProject(updated);
    setProject(updated);

    // Send command to regenerate
    onStepChange(AppStep.GENERATING_IMAGES);
    workflowClient.sendCommand('generate_all_audio', project.id, user.id, undefined, { force: true, apiKeys: user.apiKeys });
  };

  const regenerateMusic = async () => {
    if (!project || !user) return;
    workflowClient.sendCommand('generate_music', project.id, user.id, undefined, { force: true, apiKeys: user.apiKeys });
  };

  return {
    project,
    setProject,
    // State from Backend
    isGenerating: workflowState?.projectStatus === 'generating',
    generationMessage: workflowState?.generationMessage || '',
    isPaused: workflowState?.projectStatus === 'paused',
    fatalError: workflowState?.fatalError,

    // Actions
    generateNewProject,
    generateAssets,
    generateImagesOnly,
    generateAudioOnly,
    cancelGeneration,
    resumeGeneration,

    // Asset Command Wrappers
    regenerateSceneImage: (idx: number, force: boolean) => {
      const s = project?.scenes[idx];
      if (s?.id) {
        // Optimistic Update
        setProject(prev => {
          if (!prev) return null;
          const newScenes = [...prev.scenes];
          newScenes[idx] = { ...newScenes[idx], imageStatus: 'loading' };
          return { ...prev, scenes: newScenes };
        });
        regenerateSceneAsset(s.id, 'image', force);
      }
    },
    regenerateSceneAudio: async (idx: number, force: boolean, overrides?: { voice?: string, provider?: TTSProvider, language?: string }) => {
      const s = project?.scenes[idx];
      if (s?.id) {
        // Update Project if overrides exist
        if (overrides && project) {
          const updated = {
            ...project,
            voiceName: overrides.voice || project.voiceName,
            ttsProvider: overrides.provider || project.ttsProvider,
            language: overrides.language || project.language
          };
          // We await the save to ensure backend sees new values
          await saveProject(updated);
          setProject(updated);
        }

        // Optimistic Update
        setProject(prev => {
          if (!prev) return null;
          const newScenes = [...prev.scenes];
          newScenes[idx] = { ...newScenes[idx], audioStatus: 'loading' };
          return { ...prev, scenes: newScenes };
        });
        regenerateSceneAsset(s.id, 'audio', force);
      }
    },
    regenerateAllAudio,
    regenerateMusic,

    // Helpers
    updateScene: async (index: number, updates: Partial<Scene>) => {
      if (!project) return;
      const scene = project.scenes[index];
      if (!scene) return;

      // Optimistic Update
      const newScenes = [...project.scenes];
      newScenes[index] = { ...scene, ...updates };
      setProject({ ...project, scenes: newScenes });

      // Persist to Backend
      if (scene.id) {
        try {
          // We use patchScene which handles the API call
          // It expects sceneNumber to identify the scene if ID isn't passed directly, 
          // but our patchScene implementation looks up by sceneNumber.
          // Let's make sure we pass sceneNumber.
          await import('../services/storageService').then(m =>
            m.patchScene(project.id, { sceneNumber: scene.sceneNumber, ...updates })
          );
        } catch (e) {
          console.error("Failed to update scene", e);
          onError("Failed to save changes.");
        }
      }
    },
    removeScene: async (index: number) => {
      if (!project) return;

      const sceneToRemove = project.scenes[index];
      const newScenes = project.scenes
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, sceneNumber: i + 1 })); // Reorder

      const updatedProject = { ...project, scenes: newScenes };

      // Optimistic update
      setProject(updatedProject);

      try {
        if (sceneToRemove.id) {
          await deleteScene(sceneToRemove.id);
        }
        // Save project to update scene numbers of remaining scenes
        await saveProject(updatedProject);
      } catch (e) {
        console.error("Failed to remove scene", e);
        onError("Failed to remove scene");
      }
    },
    skipCurrentScene: () => project && user && workflowClient.sendCommand('skip_scene', project.id, user.id)
  };
};
