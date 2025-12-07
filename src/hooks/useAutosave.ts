import { useEffect, useRef } from 'react';
import { VideoProject, User, AppStep } from '../types';
import { saveProject } from '../services/storageService';

export const useAutosave = (
    project: VideoProject | null,
    setProject: React.Dispatch<React.SetStateAction<VideoProject | null>>,
    currentUser: User | null,
    step: AppStep
) => {
    const lastSavedProjectJson = useRef<string>("");

    useEffect(() => {
        if (project && currentUser && step !== AppStep.DASHBOARD) {
            if (project.id.startsWith('__mock__')) return;

            const currentJson = JSON.stringify(project);
            if (currentJson === lastSavedProjectJson.current) {
                return;
            }

            const timeout = setTimeout(async () => {
                try {
                    const savedProject = await saveProject(project);
                    lastSavedProjectJson.current = JSON.stringify(savedProject);

                    const needsUpdate = savedProject.id !== project.id ||
                        (Array.isArray(savedProject.scenes) &&
                            Array.isArray(project.scenes) &&
                            savedProject.scenes.some((s, i) => s.id !== project.scenes[i]?.id));

                    if (needsUpdate) {
                        setProject(prev => {
                            if (prev && prev.createdAt === savedProject.createdAt) {
                                return savedProject;
                            }
                            return prev;
                        });
                    }
                } catch (e) {
                    console.error("Autosave failed", e);
                }
            }, 2000);
            return () => clearTimeout(timeout);
        }
    }, [project, currentUser, step, setProject]);

    const resetAutosave = () => {
        lastSavedProjectJson.current = "";
    };

    return { resetAutosave, lastSavedProjectJson };
};
