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

      // Sync project state with smart merge
      setProject(prev => {
        if (!prev) return null;

        // Merge backend scene updates with local edits
        const mergedScenes = state.scenes.map((backendScene, idx) => {
          const localScene = prev.scenes[idx];
          if (!localScene) return backendScene;

          // Preserve local edits for narration and visualDescription
          // Only update status fields and URLs from backend
          return {
            ...backendScene,
            narration: localScene.narration, // Keep local edit
            visualDescription: localScene.visualDescription, // Keep local edit
            mediaType: localScene.mediaType || backendScene.mediaType, // Prefer local edit if exists (for optimistic UI), else backend
          };
        });

        return {
          ...prev,
          status: state.projectStatus,
          scenes: mergedScenes,
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

  const handleCommandError = (err: any) => {
    console.error("Command failed", err);
    if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota')) {
      onError("Quota limit reached (429). Please check your API keys or upgrade your plan.");
    } else {
      onError(err.message || "Failed to start generation.");
    }
    // Revert status if needed, though usually the backend sync will handle it
    setProject(prev => prev ? { ...prev, status: 'failed' } : null);
  };

  const generateAssets = async () => {
    if (!project || !user) return;

    // Optimistic update to prevent immediate fallback
    setProject(prev => prev ? { ...prev, status: 'generating' } : null);
    onStepChange(AppStep.GENERATING_IMAGES);

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

    try {
      await workflowClient.sendCommand('generate_all_audio', project.id, user.id, undefined, { apiKeys: user.apiKeys });
    } catch (e) {
      handleCommandError(e);
    }
  };

  const cancelGeneration = () => {
    if (!project || !user) return;
    workflowClient.sendCommand('cancel', project.id, user.id);
  };

  const resumeGeneration = async () => {
    if (!project || !user) return;

    // Optimistic update
    setProject(prev => prev ? { ...prev, status: 'generating' } : null);

    try {
      await workflowClient.sendCommand('resume', project.id, user.id, undefined, { apiKeys: user.apiKeys });
    } catch (e) {
      handleCommandError(e);
    }
  };

  const regenerateSceneAsset = async (sceneId: string, type: 'image' | 'audio' | 'video', force: boolean) => {
    if (!project || !user) return;
    const action = type === 'image' ? 'regenerate_image' : type === 'audio' ? 'regenerate_audio' : 'regenerate_video';
    try {
      await workflowClient.sendCommand(action, project.id, user.id, sceneId, { force, apiKeys: user.apiKeys });
    } catch (e) {
      handleCommandError(e);
    }
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
      if (e.message && (e.message.includes('403') || e.message.includes('429'))) {
        onError("Quota limit reached! Please check your plan or API keys.");
      } else {
        onError(e.message || "Failed to generate script.");
      }
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

    // Optimistic update
    setProject(prev => prev ? { ...prev, status: 'generating' } : null);

    try {
      await workflowClient.sendCommand('generate_all_audio', project.id, user.id, undefined, { force: true, apiKeys: user.apiKeys });
    } catch (e) {
      handleCommandError(e);
    }
  };

  const regenerateMusic = async () => {
    if (!project || !user) return;

    // Optimistic update
    setProject(prev => prev ? { ...prev, bgMusicStatus: 'loading' } : null);

    try {
      await workflowClient.sendCommand('generate_music', project.id, user.id, undefined, { force: true, apiKeys: user.apiKeys });
    } catch (e) {
      handleCommandError(e);
      setProject(prev => prev ? { ...prev, bgMusicStatus: 'failed' } : null);
    }
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
    regenerateSceneVideo: (idx: number, force: boolean) => {
      const s = project?.scenes[idx];
      if (s?.id) {
        // Optimistic Update
        setProject(prev => {
          if (!prev) return null;
          const newScenes = [...prev.scenes];
          newScenes[idx] = { ...newScenes[idx], videoStatus: 'loading' };
          return { ...prev, scenes: newScenes };
        });
        regenerateSceneAsset(s.id, 'video', force);
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
    updateProjectSettings: async (settings: { voiceName?: string; ttsProvider?: TTSProvider; language?: string }) => {
      if (!project) return;
      const updated = { ...project, ...settings };
      setProject(updated); // Optimistic
      try {
        await saveProject(updated);
      } catch (e) {
        console.error("Failed to save project settings", e);
        onError("Failed to save settings.");
      }
    },
    skipCurrentScene: () => project && user && workflowClient.sendCommand('skip_scene', project.id, user.id),
    addScene: async () => {
      if (!project) return;

      const newSceneNumber = project.scenes.length + 1;
      const newScene: Scene = {
        sceneNumber: newSceneNumber,
        visualDescription: "Describe the visual for this scene...",
        narration: "Enter narration text here...",
        durationSeconds: 5,
        imageStatus: 'pending',
        audioStatus: 'pending',
        videoStatus: 'pending',
        sfxStatus: 'pending',
        mediaType: 'image'
      };

      const updatedProject = {
        ...project,
        scenes: [...project.scenes, newScene]
      };

      setProject(updatedProject); // Optimistic

      try {
        await saveProject(updatedProject);
      } catch (e) {
        console.error("Failed to add scene", e);
        onError("Failed to add scene.");
      }
    }
  };
};
