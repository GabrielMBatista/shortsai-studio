import { useState } from 'react';
import { AppStep, User, VideoProject } from '../types';

import { useProjectSync } from './video-generation/useProjectSync';
import { useProjectCreation } from './video-generation/useProjectCreation';
import { useGenerationCommands } from './video-generation/useGenerationCommands';
import { useProjectActions } from './video-generation/useProjectActions';

interface UseVideoGenerationProps {
  user: User | null;
  onError: (msg: string) => void;
  onStepChange: (step: AppStep) => void;
}

export const useVideoGeneration = ({ user, onError, onStepChange }: UseVideoGenerationProps) => {
  const [project, setProject] = useState<VideoProject | null>(null);

  // 1. Sync Logic (Backend Connection)
  const { workflowState, deletedSceneIds } = useProjectSync(project, setProject, onError);

  // 2. Creation Logic (New Project)
  const { generateNewProject } = useProjectCreation(user, setProject, onError, onStepChange);

  // 3. Command Logic (Assets & Workflow)
  const commands = useGenerationCommands(project, setProject, user, onError, onStepChange);

  // 4. Action Logic (CRUD)
  const actions = useProjectActions(project, setProject, user, onError, deletedSceneIds);

  return {
    project,
    setProject,

    // State from Backend or Local Mock
    isGenerating: workflowState?.projectStatus === 'generating' || project?.status === 'generating',
    generationMessage: workflowState?.generationMessage || (project?.status === 'generating' ? 'Generating assets...' : ''),
    isPaused: workflowState?.projectStatus === 'paused',
    fatalError: workflowState?.fatalError,

    // Exposed Functions
    generateNewProject,
    ...commands,
    ...actions
  };
};
