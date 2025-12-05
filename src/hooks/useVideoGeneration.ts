import { useState, useEffect, useRef } from 'react';
import { AppStep, User, VideoProject, ReferenceCharacter, TTSProvider, Scene } from '../types';
import { workflowClient, WorkflowState } from '../services/workflowClient';
import { generateScript, generateMusicPrompt } from '../services/geminiService';
import { saveProject, deleteScene, patchScene } from '../services/storageService';
import { useQueryClient } from '@tanstack/react-query';

interface UseVideoGenerationProps {
  user: User | null;
  onError: (msg: string) => void;
  onStepChange: (step: AppStep) => void;
}

export const useVideoGeneration = ({ user, onError, onStepChange }: UseVideoGenerationProps) => {
  const [project, setProject] = useState<VideoProject | null>(null);
  const projectRef = useRef<VideoProject | null>(null);
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);
  const queryClient = useQueryClient();
  const deletedSceneIds = useRef<Set<string>>(new Set());

  const isMock = project?.id === 'mock-project-tour';

  // 1. Connect to Backend via Client
  useEffect(() => {
    if (!project?.id || project.id === 'mock-project-tour') return;

    workflowClient.connect(project.id, (state) => {
      setWorkflowState(state);

      // Check for fatal errors immediately
      if (state.fatalError) {
        onError(state.fatalError);
      }

      // Sync project state with smart merge
      setProject(prev => {
        if (!prev) return null;

        // Create a map of local scenes for easier lookup
        const localScenesMap = new Map(prev.scenes.map(s => [s.id, s]));

        // Merge backend scene updates with local edits
        // We iterate over backend scenes to get the latest status/urls
        // But we match by ID to ensure we are updating the correct scene
        const mergedScenes = state.scenes
          .filter(s => !s.id || !deletedSceneIds.current.has(s.id))
          .map((backendScene) => {
            const localScene = backendScene.id ? localScenesMap.get(backendScene.id) : undefined;

            if (!localScene) return backendScene;

            // Preserve local edits for narration, visualDescription, AND sceneNumber (for reordering)
            return {
              ...backendScene,
              narration: localScene.narration, // Keep local edit
              visualDescription: localScene.visualDescription, // Keep local edit
              sceneNumber: localScene.sceneNumber, // Keep local order preference
              mediaType: backendScene.mediaType || localScene.mediaType, // Prefer backend for media type
            };
          });

        // Keep optimistic scenes (those without ID yet)
        const optimisticScenes = prev.scenes.filter(s => !s.id);

        // Combine and sort by sceneNumber
        const finalScenes = [...mergedScenes, ...optimisticScenes].sort((a, b) => a.sceneNumber - b.sceneNumber);

        return {
          ...prev,
          status: state.projectStatus,
          scenes: finalScenes,
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

  const simulateProcessing = (() => {
    return (callback: () => void, delayMs = 2000) => {
        setTimeout(callback, delayMs);
    };
  })();

  const generateAssets = async () => {
    if (!project || !user) return;

    // Optimistic update to prevent immediate fallback
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
                    scenes: prev.scenes.map(s => ({
                         ...s,
                         imageStatus: 'completed',
                         audioStatus: 'completed'
                    }))
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
           return {
               ...prev,
               scenes: prev.scenes.map(s => ({ ...s, imageStatus: 'loading' }))
           };
        });
        simulateProcessing(() => {
             setProject(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    status: 'completed',
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
           return {
               ...prev,
               scenes: prev.scenes.map(s => ({ ...s, audioStatus: 'loading' }))
           };
        });
        simulateProcessing(() => {
             setProject(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    status: 'completed',
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

    // Optimistic update
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

  const regenerateSceneAsset = async (sceneId: string, type: 'image' | 'audio' | 'video', force: boolean) => {
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

  // --- CREATION ACTIONS (Initial Scripting) ---

  const generateNewProject = async (
    topic: string,
    style: string,
    voice: string,
    provider: TTSProvider,
    language: string,
    references: ReferenceCharacter[],
    includeMusic: boolean,
    durationConfig: { min: number; max: number; targetScenes?: number } = { min: 55, max: 65 },
    audioModel?: string
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
      localStorage.setItem('shortsai_last_project_id', savedProject.id); // Persist ID for reload
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

  const regenerateAllAudio = async (voice: string, provider: TTSProvider, language: string, audioModel?: string) => {
    if (!project || !user) return;

    // Update settings in DB
    const updated = { ...project, voiceName: voice, ttsProvider: provider, language, audioModel };
    if (!isMock) {
        await saveProject(updated);
    }
    setProject(updated);

    // Send command to regenerate
    onStepChange(AppStep.GENERATING_IMAGES);

    // Optimistic update
    setProject(prev => prev ? { ...prev, status: 'generating' } : null);

    if (isMock) {
        simulateProcessing(() => {
             setProject(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    status: 'completed',
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

    // Optimistic update
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

  return {
    project,
    setProject,
    // State from Backend or Local Mock
    isGenerating: workflowState?.projectStatus === 'generating' || project?.status === 'generating',
    generationMessage: workflowState?.generationMessage || (project?.status === 'generating' ? 'Generating assets...' : ''),
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
          if (!isMock) {
            // We await the save to ensure backend sees new values
            await saveProject(updated);
          }
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

      if (isMock) return;

      // Persist to Backend
      if (scene.id) {
        try {
          // We use patchScene which handles the API call
          await patchScene(project.id, { sceneNumber: scene.sceneNumber, ...updates });
        } catch (e) {
          console.error("Failed to update scene", e);
          onError("Failed to save changes.");
        }
      }
    },
    removeScene: async (index: number) => {
      const currentProject = projectRef.current;
      if (!currentProject) return;

      const sceneToRemove = currentProject.scenes[index];
      if (!sceneToRemove) return;

      // Track deletion immediately
      if (sceneToRemove.id) {
        deletedSceneIds.current.add(sceneToRemove.id);
      }

      // Optimistic update
      setProject(prev => {
        if (!prev) return null;
        const newScenes = prev.scenes
          .filter(s => s.id ? s.id !== sceneToRemove.id : s !== sceneToRemove)
          .map((s, i) => ({ ...s, sceneNumber: i + 1 }));
        return { ...prev, scenes: newScenes };
      });

      if (isMock) return;

      try {
        if (sceneToRemove.id) {
          await deleteScene(sceneToRemove.id);
        }

        // Save project to update scene numbers of remaining scenes
        const newScenes = currentProject.scenes
          .filter(s => s.id ? s.id !== sceneToRemove.id : s !== sceneToRemove)
          .map((s, i) => ({ ...s, sceneNumber: i + 1 }));

        const updatedProject = { ...currentProject, scenes: newScenes };
        await saveProject(updatedProject);
      } catch (e) {
        console.error("Failed to remove scene", e);
        onError("Failed to remove scene");
      }
    },
    updateProjectSettings: async (settings: { voiceName?: string; ttsProvider?: TTSProvider; language?: string; videoModel?: string; audioModel?: string }) => {
      if (!project) return;
      const updated = { ...project, ...settings };
      setProject(updated); // Optimistic
      
      if (isMock) return;

      try {
        await saveProject(updated);
      } catch (e) {
        console.error("Failed to save project settings", e);
        onError("Failed to save settings.");
      }
    },
    skipCurrentScene: () => !isMock && project && user && workflowClient.sendCommand('skip_scene', project.id, user.id),
    addScene: async () => {
      if (!project) return;

      const maxSceneNumber = project.scenes.length > 0
        ? Math.max(...project.scenes.map(s => s.sceneNumber))
        : 0;
      const newSceneNumber = maxSceneNumber + 1;

      const newScene: Scene = {
        sceneNumber: newSceneNumber,
        visualDescription: "Describe the visual for this scene...",
        narration: "Enter narration text here...",
        durationSeconds: 5,
        imageStatus: 'completed', // Set to completed to show placeholder instead of loader
        audioStatus: 'completed',
        videoStatus: 'completed',
        sfxStatus: 'completed',
        mediaType: 'image',
        id: isMock ? `mock-scene-${Date.now()}` : undefined // Give a mock ID
      };

      const updatedProject = {
        ...project,
        scenes: [...project.scenes, newScene]
      };

      setProject(updatedProject); // Optimistic

      if (isMock) return;

      try {
        await saveProject(updatedProject);
      } catch (e) {
        console.error("Failed to add scene", e);
        onError("Failed to add scene.");
      }
    },
    reorderScenes: async (oldIndex: number, newIndex: number) => {
      if (!project) return;

      const newScenes = [...project.scenes];
      const [movedScene] = newScenes.splice(oldIndex, 1);
      newScenes.splice(newIndex, 0, movedScene);

      // Recalculate scene numbers
      const reorderedScenes = newScenes.map((scene, index) => ({
        ...scene,
        sceneNumber: index + 1
      }));

      const updatedProject = {
        ...project,
        scenes: reorderedScenes
      };

      setProject(updatedProject); // Optimistic

      if (isMock) return;

      try {
        await saveProject(updatedProject);
      } catch (e) {
        console.error("Failed to reorder scenes", e);
        onError("Failed to save new order.");
      }
    }
  };
};
