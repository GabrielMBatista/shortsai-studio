import { useState, useEffect, useRef } from 'react';
import { VideoProject } from '../../types';
import { workflowClient, WorkflowState } from '../../services/workflowClient';

export const useProjectSync = (
    project: VideoProject | null,
    setProject: React.Dispatch<React.SetStateAction<VideoProject | null>>,
    onError: (msg: string) => void
) => {
    const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
    const deletedSceneIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!project?.id || project.id === 'mock-project-tour') return;

        workflowClient.connect(project.id, (state) => {
            setWorkflowState(state);

            if (state.fatalError) {
                onError(state.fatalError);
            }

            setProject(prev => {
                if (!prev) return null;

                const localScenesMap = new Map(prev.scenes.map(s => [s.id, s]));

                const mergedScenes = state.scenes
                    .filter(s => !s.id || !deletedSceneIds.current.has(s.id))
                    .map((backendScene) => {
                        const localScene = backendScene.id ? localScenesMap.get(backendScene.id) : undefined;

                        if (!localScene) return backendScene;

                        return {
                            ...backendScene,
                            narration: localScene.narration,
                            visualDescription: localScene.visualDescription,
                            sceneNumber: localScene.sceneNumber,
                            mediaType: backendScene.mediaType || localScene.mediaType,
                        };
                    });

                const optimisticScenes = prev.scenes.filter(s => !s.id);

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
    }, [project?.id, onError, setProject]);

    return { workflowState, deletedSceneIds };
};
