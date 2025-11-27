import { Scene, BackendProjectStatus } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface WorkflowState {
    projectStatus: BackendProjectStatus;
    scenes: Scene[];
    generationMessage?: string;
    fatalError?: string;
    music_status?: string;
    music_url?: string;
}

class WorkflowClient {
    private eventSource: EventSource | null = null;
    private currentProjectId: string | null = null;
    private onStateChange: ((state: WorkflowState) => void) | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    connect(projectId: string, callback: (state: WorkflowState) => void) {
        // If already connected to same project, just update callback
        if (this.currentProjectId === projectId && this.eventSource) {
            this.onStateChange = callback;
            return;
        }

        // Disconnect existing connection
        this.disconnect();

        this.currentProjectId = projectId;
        this.onStateChange = callback;
        this.reconnectAttempts = 0;

        console.log('[WorkflowClient] Connecting to project', projectId);

        this.setupEventSource();
    }

    private setupEventSource() {
        if (!this.currentProjectId) return;

        this.eventSource = new EventSource(`${API_URL}/api/events/${this.currentProjectId}`);

        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[WorkflowClient] Received update:', data);

                if (data.type === 'init') {
                    // Initial state from server
                    this.onStateChange?.({
                        projectStatus: data.projectStatus,
                        scenes: data.scenes,
                        music_status: data.bgMusicStatus,
                        music_url: data.bgMusicUrl
                    });
                } else if (data.type === 'scene_update') {
                    // Scene status update - trigger a refresh
                    this.fetchState();
                } else if (data.type === 'music_update') {
                    // Music status update
                    this.fetchState();
                }
            } catch (err) {
                console.error('[WorkflowClient] Failed to parse SSE message:', err);
            }
        };

        this.eventSource.onerror = (err) => {
            console.error('[WorkflowClient] SSE error:', err);

            // Try to reconnect with exponential backoff
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
                console.log(`[WorkflowClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

                setTimeout(() => {
                    if (this.currentProjectId) {
                        this.setupEventSource();
                    }
                }, delay);
            }
        };

        this.eventSource.onopen = () => {
            console.log('[WorkflowClient] SSE connection established');
            this.reconnectAttempts = 0;
        };
    }

    private async fetchState() {
        if (!this.currentProjectId) return;

        try {
            const res = await fetch(`${API_URL}/api/workflow/state/${this.currentProjectId}`);
            if (!res.ok) return;

            const data = await res.json();

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
                imageAttempts: s.image_attempts || 0,
                audioAttempts: s.audio_attempts || 0,
                errorMessage: s.error_message
            }));

            this.onStateChange?.({
                projectStatus: data.projectStatus as BackendProjectStatus,
                scenes: mappedScenes,
                generationMessage: data.generationMessage,
                fatalError: data.fatalError,
                music_status: data.music_status,
                music_url: data.music_url
            });
        } catch (err) {
            console.error('[WorkflowClient] Failed to fetch state:', err);
        }
    }

    disconnect() {
        if (this.eventSource) {
            console.log('[WorkflowClient] Disconnecting SSE');
            this.eventSource.close();
            this.eventSource = null;
        }
        this.currentProjectId = null;
        this.onStateChange = null;
        this.reconnectAttempts = 0;
    }

    async sendCommand(action: string, projectId: string, userId: string, sceneId?: string, extras?: any) {
        const payload = {
            projectId,
            userId,
            sceneId,
            action,
            ...(extras || {})
        };

        try {
            const res = await fetch(`${API_URL}/api/workflow/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Command failed');
            }

            return await res.json();
        } catch (err: any) {
            console.error('[WorkflowClient] Command failed:', err);
            throw err;
        }
    }
}

export const workflowClient = new WorkflowClient();
export { WorkflowClient };
