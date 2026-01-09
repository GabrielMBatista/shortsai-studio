/**
 * Batch Render Types
 * Sistema de renderização em lote de múltiplos projetos
 */

export interface BatchRenderConfig {
    fps: 30 | 60;
    resolution: '1080p' | '720p';
    format: 'mp4' | 'webm';
    showSubtitles: boolean;
    bgMusicFile?: File | null;
    bgMusicVolume?: number;
    endingVideoFile?: File | null;
}

export interface BatchRenderJob {
    id: string;
    projectId: string;
    projectTitle: string;
    thumbnailUrl?: string;
    config: BatchRenderConfig;
    status: 'pending' | 'rendering' | 'completed' | 'failed';
    progress: number;
    error?: string;
    downloadUrl?: string;
    createdAt: number;
    completedAt?: number;
}

export interface BatchRenderQueue {
    jobs: BatchRenderJob[];
    currentJobIndex: number;
    isActive: boolean;
    isPaused: boolean;
}

export const DEFAULT_BATCH_RENDER_CONFIG: BatchRenderConfig = {
    fps: 60,
    resolution: '1080p',
    format: 'mp4',
    showSubtitles: true,
    bgMusicVolume: 50,
};
