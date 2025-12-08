import { Scene, VideoProject, User, TTSProvider } from '../../types';
import { saveProject, deleteScene, patchScene } from '../../services/storageService';
import { workflowClient } from '../../services/workflowClient';

export const useProjectActions = (
    project: VideoProject | null,
    setProject: React.Dispatch<React.SetStateAction<VideoProject | null>>,
    user: User | null,
    onError: (msg: string) => void,
    deletedSceneIds: React.MutableRefObject<Set<string>>
) => {
    const isMock = project?.id === 'mock-project-tour';

    const updateScene = async (index: number, updates: Partial<Scene>) => {
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
                await patchScene(project.id, { sceneNumber: scene.sceneNumber, ...updates });
            } catch (e) {
                console.error("Failed to update scene", e);
                onError("Failed to save changes.");
            }
        }
    };

    const removeScene = async (index: number) => {
        if (!project) return;

        const sceneToRemove = project.scenes[index];
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
            const newScenes = project.scenes
                .filter(s => s.id ? s.id !== sceneToRemove.id : s !== sceneToRemove)
                .map((s, i) => ({ ...s, sceneNumber: i + 1 }));

            const updatedProject = { ...project, scenes: newScenes };
            await saveProject(updatedProject);
        } catch (e) {
            console.error("Failed to remove scene", e);
            onError("Failed to remove scene");
        }
    };

    const addScene = async () => {
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
            imageStatus: 'completed',
            audioStatus: 'completed',
            videoStatus: 'completed',
            sfxStatus: 'completed',
            mediaType: 'image',
            id: isMock ? `mock-scene-${Date.now()}` : undefined
        };

        const updatedProject = {
            ...project,
            scenes: [...project.scenes, newScene]
        };

        setProject(updatedProject);

        if (isMock) return;

        try {
            await saveProject(updatedProject);
        } catch (e) {
            console.error("Failed to add scene", e);
            onError("Failed to add scene.");
        }
    };

    const reorderScenes = async (oldIndex: number, newIndex: number) => {
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

        setProject(updatedProject);

        if (isMock) return;

        try {
            await saveProject(updatedProject);
        } catch (e) {
            console.error("Failed to reorder scenes", e);
            onError("Failed to save new order.");
        }
    };

    const updateProjectSettings = async (settings: { voiceName?: string; ttsProvider?: TTSProvider; language?: string; videoModel?: string; audioModel?: string }) => {
        if (!project) return;
        const updated = { ...project, ...settings };
        setProject(updated);

        if (isMock) return;

        try {
            await saveProject(updated);
        } catch (e) {
            console.error("Failed to save project settings", e);
            onError("Failed to save settings.");
        }
    };

    const skipCurrentScene = () => !isMock && project && user && workflowClient.sendCommand('skip_scene', project.id, user.id);

    return {
        updateScene,
        removeScene,
        addScene,
        reorderScenes,
        updateProjectSettings,
        skipCurrentScene
    };
};
