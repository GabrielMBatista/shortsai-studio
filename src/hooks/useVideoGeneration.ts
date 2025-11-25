import { useState, useRef, useCallback } from 'react';
import { VideoProject, Scene, ReferenceCharacter, TTSProvider, AppStep, User } from '../types';
import { generateScript, generateSceneImage, generateNarrationAudio, getAudioDuration, generateMusicPrompt } from '../services/geminiService';
import { generateElevenLabsAudio } from '../services/elevenLabsService';
import { generateMusic } from '../services/sunoService';
import { saveProject } from '../services/storageService';

interface UseVideoGenerationProps {
  user: User | null;
  onError: (msg: string) => void;
  onStepChange: (step: AppStep) => void;
}

export const useVideoGeneration = ({ user, onError, onStepChange }: UseVideoGenerationProps) => {
  const [project, setProject] = useState<VideoProject | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState('');
  
  // Abort Controller Pattern
  const abortRef = useRef(false);

  // --- Helpers ---
  const updateScene = (index: number, updates: Partial<Scene>) => {
    setProject(prev => {
      if (!prev) return null;
      const newScenes = [...prev.scenes];
      newScenes[index] = { ...newScenes[index], ...updates };
      return { ...prev, scenes: newScenes };
    });
  };

  const cancelGeneration = () => {
    abortRef.current = true;
    setIsGenerating(false);
    setGenerationMessage('Cancelled');
  };

  // --- Step 1: Script ---
  const generateNewProject = async (
    topic: string, 
    style: string, 
    voice: string, 
    provider: TTSProvider,
    language: string, 
    references: ReferenceCharacter[],
    includeMusic: boolean
  ) => {
    // Gemini API key is handled via process.env.API_KEY.
    // Assuming user is logged in if this function is called.
    if (!user) {
        onError("User not authenticated.");
        return;
    }

    setIsGenerating(true);
    setGenerationMessage('Crafting Script & Metadata...');
    abortRef.current = false;

    try {
      const { scenes, metadata } = await generateScript(topic, style, language);
      
      const newProject: VideoProject = {
        id: crypto.randomUUID(),
        userId: user.id,
        createdAt: Date.now(),
        topic: metadata.title || topic,
        style,
        voiceName: voice,
        ttsProvider: provider,
        language,
        referenceCharacters: references,
        scenes,
        generatedTitle: metadata.title,
        generatedDescription: metadata.description,
        includeMusic,
        bgMusicStatus: includeMusic ? 'pending' : undefined
      };

      // CRITICAL: Save immediately to DB/Backend to get real IDs and ensure persistence
      const savedProject = await saveProject(newProject);
      
      // Use the returned project from saveProject as it might have backend IDs
      setProject(savedProject);
      
      onStepChange(AppStep.SCRIPTING);
    } catch (e: any) {
      onError(e.message || "Failed to generate script.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Step 2: Assets ---
  const generateAssets = async () => {
    if (!project) return;

    setIsGenerating(true);
    onStepChange(AppStep.GENERATING_IMAGES);
    abortRef.current = false;

    // Music (Parallel)
    if (project.includeMusic && (!project.bgMusicUrl || project.bgMusicStatus === 'error')) {
        handleMusicGeneration(project);
    }

    // Scenes (Sequential)
    try {
        // We work with a local copy of scenes to ensure we have the latest data
        // But we MUST update the React State AND the Database incrementally
        let currentProjectState = { ...project };
        let scenes = [...currentProjectState.scenes];
        let previousImageRef: string | undefined = undefined;

        // Determine master character references
        let activeCharacters = project.referenceCharacters || [];
        if (activeCharacters.length === 0 && project.referenceCharacter) {
             activeCharacters = [project.referenceCharacter];
        }

        for (let i = 0; i < scenes.length; i++) {
            if (abortRef.current) break;

            const scene = scenes[i];
            
            // Skip completed
            if (scene.imageStatus === 'completed' && scene.audioStatus === 'completed') {
                if (scene.imageUrl) previousImageRef = scene.imageUrl;
                continue;
            }

            // Update status to loading locally
            scenes[i] = { 
                ...scene,
                imageStatus: scene.imageStatus === 'completed' ? 'completed' : 'loading',
                audioStatus: scene.audioStatus === 'completed' ? 'completed' : 'loading'
            };
            updateScene(i, scenes[i]);

            // 1. Image Generation
            let imageUrl = scene.imageUrl;
            if (scene.imageStatus !== 'completed') {
                let currentRefs = activeCharacters;
                // Continuity fallback
                if (currentRefs.length === 0 && previousImageRef) {
                    currentRefs = [{ name: 'Previous Scene', images: [previousImageRef] }];
                }
                
                try {
                    imageUrl = await generateSceneImage(scene, project.style, currentRefs);
                    scenes[i] = { ...scenes[i], imageStatus: 'completed', imageUrl };
                    
                    // Update State
                    updateScene(i, scenes[i]);
                    
                    if (activeCharacters.length === 0) previousImageRef = imageUrl;
                } catch (e) {
                    console.error(`Scene ${i} Image Error`, e);
                    scenes[i] = { ...scenes[i], imageStatus: 'error' };
                    updateScene(i, scenes[i]);
                }
            }

            if (abortRef.current) break;

            // 2. Audio Generation
            let audioUrl = scene.audioUrl;
            let duration = scene.durationSeconds;

            if (scene.audioStatus !== 'completed') {
                try {
                    if (project.ttsProvider === 'elevenlabs') {
                        try {
                            audioUrl = await generateElevenLabsAudio(scene.narration, project.voiceName, project.language);
                        } catch (e) {
                            console.warn("ElevenLabs failed, using Gemini fallback");
                            audioUrl = await generateNarrationAudio(scene.narration, 'Kore');
                        }
                    } else {
                        audioUrl = await generateNarrationAudio(scene.narration, project.voiceName);
                    }

                    if (audioUrl) {
                        const d = await getAudioDuration(audioUrl);
                        if (d > 0) duration = parseFloat((d + 0.5).toFixed(2));
                    }
                    
                    scenes[i] = { ...scenes[i], audioStatus: 'completed', audioUrl, durationSeconds: duration };
                    updateScene(i, scenes[i]);

                } catch (e) {
                     console.error(`Scene ${i} Audio Error`, e);
                     scenes[i] = { ...scenes[i], audioStatus: 'error' };
                     updateScene(i, scenes[i]);
                }
            }

            // INCREMENTAL SAVE: Force save to backend after every scene is processed
            // This ensures if user refreshes, they don't lose the generated Base64 assets
            try {
                currentProjectState = { ...currentProjectState, scenes };
                // We await this silently so it doesn't block the UI too much, but ensures persistence
                saveProject(currentProjectState).catch(err => console.warn("Incremental save failed", err));
            } catch (e) { console.warn("Save error", e); }


            // Throttling to be kind to the API
            if (i < scenes.length - 1 && !abortRef.current) {
                await new Promise(r => setTimeout(r, 6000));
            }
        }
    } catch (e) {
        onError("Asset generation process encountered an error.");
    } finally {
        setIsGenerating(false);
        onStepChange(AppStep.SCRIPTING);
    }
  };

  const handleMusicGeneration = async (currentProject: VideoProject) => {
      try {
          setProject(p => p ? { ...p, bgMusicStatus: 'loading' } : null);
          const prompt = await generateMusicPrompt(currentProject.topic, currentProject.style);
          setProject(p => p ? { ...p, bgMusicPrompt: prompt } : null);
          
          const musicUrl = await generateMusic(prompt);
          setProject(p => {
              const updated = p ? { ...p, bgMusicUrl: musicUrl, bgMusicStatus: 'completed' } : null;
              if (updated) saveProject(updated as VideoProject); // Auto-save music
              return updated as any;
          });
      } catch (e) {
          console.error("Music gen failed", e);
          setProject(p => p ? { ...p, bgMusicStatus: 'error' } : null);
      }
  };

  // --- Regenerators ---
  
  const regenerateSceneImage = async (index: number) => {
      if (!project) return;
      updateScene(index, { imageStatus: 'loading' });
      
      try {
        const scene = project.scenes[index];
        let refs = project.referenceCharacters || [];
        if (refs.length === 0 && index > 0) {
            const prev = project.scenes[index - 1];
            if (prev.imageUrl) refs = [{ name: 'Previous', images: [prev.imageUrl] }];
        }

        const url = await generateSceneImage(scene, project.style, refs);
        
        // Update local state
        const updatedScene = { ...scene, imageStatus: 'completed', imageUrl: url } as Scene;
        
        setProject(prev => {
            if (!prev) return null;
            const newScenes = [...prev.scenes];
            newScenes[index] = updatedScene;
            const newProject = { ...prev, scenes: newScenes };
            // Save immediately
            saveProject(newProject);
            return newProject;
        });

      } catch (e) {
        updateScene(index, { imageStatus: 'error' });
      }
  };

  const regenerateAllAudio = async (voice: string, provider: TTSProvider, language: string) => {
      if (!project) return;
      setIsGenerating(true);
      onStepChange(AppStep.GENERATING_IMAGES); 
      
      // Update Settings locally
      let currentProject = { ...project, voiceName: voice, ttsProvider: provider, language };
      setProject(currentProject);

      for (let i = 0; i < currentProject.scenes.length; i++) {
          if (abortRef.current) break;
          
          // Set status loading
          currentProject.scenes[i] = { ...currentProject.scenes[i], audioStatus: 'loading' };
          setProject({ ...currentProject });

          try {
             let url;
             if (provider === 'elevenlabs') {
                 url = await generateElevenLabsAudio(currentProject.scenes[i].narration, voice, language);
             } else {
                 url = await generateNarrationAudio(currentProject.scenes[i].narration, voice);
             }
             
             let duration = currentProject.scenes[i].durationSeconds;
             if (url) {
                 const d = await getAudioDuration(url);
                 if (d > 0) duration = parseFloat((d + 0.5).toFixed(2));
             }
             
             // Update scene
             currentProject.scenes[i] = { 
                 ...currentProject.scenes[i], 
                 audioStatus: 'completed', 
                 audioUrl: url, 
                 durationSeconds: duration 
             };
             setProject({ ...currentProject });

             await new Promise(r => setTimeout(r, 1000));
          } catch(e) {
             currentProject.scenes[i] = { ...currentProject.scenes[i], audioStatus: 'error' };
             setProject({ ...currentProject });
          }
      }
      
      // Final save
      await saveProject(currentProject);

      setIsGenerating(false);
      onStepChange(AppStep.SCRIPTING);
  };

  return {
    project,
    setProject,
    isGenerating,
    generationMessage,
    generateNewProject,
    generateAssets,
    cancelGeneration,
    regenerateSceneImage,
    regenerateAllAudio,
    regenerateMusic: () => project && handleMusicGeneration(project)
  };
};