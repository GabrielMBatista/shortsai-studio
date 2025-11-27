import { WorkflowAction, BackendProjectStatus, Scene } from '../types';

export interface WorkflowState {
    projectStatus: BackendProjectStatus;
    scenes: Scene[];
    music_status?: string;
    music_url?: string;
    generationMessage?: string;
    fatalError?: string | null;
}

class WorkflowClient {
    private pollingInterval: number | null = null;
    private listeners: ((state: WorkflowState) => void)[] = [];
    private currentProjectId: string | null = null;
    private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    connect(projectId: string, onStateChange: (state: WorkflowState) => void) {
        this.disconnect();
        this.currentProjectId = projectId;
        this.listeners.push(onStateChange);

        // Check state once. The pollState method will decide if it needs to start the polling loop.
        this.pollState();

        console.log(`[WorkflowClient] Connected to project ${projectId}`);
    }

    disconnect() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.listeners = [];
        this.currentProjectId = null;
    }

    private async pollState() {
        if (!this.currentProjectId) return;

        try {
            const res = await fetch(`${this.baseUrl}/api/workflow/state/${this.currentProjectId}`);
            if (!res.ok) return;

            const data = await res.json();

            // Transform backend state to frontend expected format if needed
            // Transform backend state to frontend expected format
            const mappedScenes = (data.scenes || []).map((s: any) => ({
                id: s.id || s._id,
                sceneNumber: s.scene_number || s.sceneNumber,
                visualDescription: s.visual_description || s.visualDescription,
                narration: s.narration,
                durationSeconds: Number(s.duration_seconds) || Number(s.durationSeconds) || 5,
                imageUrl: s.image_url || s.imageUrl,
                audioUrl: s.audio_url || s.audioUrl,
                sfxUrl: s.sfx_url || s.sfxUrl,
                imageStatus: s.image_status || s.imageStatus || (s.image_url ? 'completed' : 'pending'),
                audioStatus: s.audio_status || s.audioStatus || (s.audio_url ? 'completed' : 'pending'),
                sfxStatus: s.sfx_status || s.sfxStatus || (s.sfx_url ? 'completed' : 'pending'),
                imageAttempts: s.image_attempts || s.imageAttempts || 0,
                audioAttempts: s.audio_attempts || s.audioAttempts || 0,
                errorMessage: s.error_message || s.errorMessage
            }));

            const state: WorkflowState = {
                projectStatus: data.projectStatus,
                scenes: mappedScenes,
                music_status: data.music_status,
                music_url: data.music_url,
                generationMessage: data.projectStatus === 'generating' ? 'Generating assets...' : '',
                fatalError: data.projectStatus === 'failed' ? 'Generation failed' : null
            };

            this.listeners.forEach(l => l(state));

            // Intelligent Polling: Only poll if something is happening
            const isProjectActive = state.projectStatus === 'generating' || state.projectStatus === 'processing' || state.projectStatus === 'pending';
            const isMusicActive = state.music_status === 'pending' || state.music_status === 'loading';

            if (isProjectActive || isMusicActive) {
                if (!this.pollingInterval) {
                    this.pollingInterval = window.setInterval(() => this.pollState(), 2000);
                }
            } else {
                if (this.pollingInterval) {
                    clearInterval(this.pollingInterval);
                    this.pollingInterval = null;
                }
            }

        } catch (e) {
            console.error("Polling error", e);
        }
    }

    async sendCommand(action: WorkflowAction, projectId: string, userId: string, sceneId?: string, options?: { force?: boolean; apiKeys?: any }) {
        try {
            const payload = {
                projectId,
                sceneId,
                action,
                force: options?.force,
                apiKeys: options?.apiKeys
            };

            const res = await fetch(`${this.baseUrl}/api/workflow/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Command failed');
            }

            // Trigger immediate poll
            this.pollState();

            return await res.json();
        } catch (e) {
            console.error("Command error", e);
            throw e;
        }
    }
}

export const workflowClient = new WorkflowClient();
