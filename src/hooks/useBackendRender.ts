import { useState, useCallback, useEffect } from 'react';
import { Scene } from '../types';
import { apiFetch } from '../services/api';
import { RenderJobInput, RenderOptions } from '../../../shortsai-api/lib/rendering/types';

interface UseBackendRenderProps {
    projectId: string;
    scenes: Scene[];
    bgMusicUrl?: string;
    endingVideoFile?: File | null;
    title?: string;
}

interface RenderProgress {
    phase: 'downloading' | 'processing' | 'uploading' | 'complete';
    progress: number;
    message: string;
}

/**
 * Hook for backend video rendering using FFmpeg
 * Replaces frontend canvas-based rendering with high-quality server-side processing
 */
export function useBackendRender({ projectId, scenes, bgMusicUrl, endingVideoFile, title }: UseBackendRenderProps) {
    const [isRendering, setIsRendering] = useState(false);
    const [progress, setProgress] = useState<RenderProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [jobId, setJobId] = useState<string | null>(null);

    /**
     * Start render process
     */
    const startRender = useCallback(async (options: RenderOptions) => {
        try {
            setIsRendering(true);
            setError(null);
            setProgress({ phase: 'downloading', progress: 0, message: 'Preparing render...' });

            // Upload ending video if provided
            let endingVideoUrl: string | undefined;
            if (endingVideoFile) {
                const formData = new FormData();
                formData.append('file', endingVideoFile);
                const uploadRes = await apiFetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                endingVideoUrl = uploadRes.url;
            }

            // Map Scene type to RenderScene type
            const renderScenes = scenes.map(scene => ({
                sceneNumber: scene.sceneNumber,
                imageUrl: scene.imageUrl,
                videoUrl: scene.videoUrl,
                videoDuration: undefined, // TODO: Track video duration in Scene type
                videoCropConfig: scene.videoCropConfig?.x !== undefined
                    ? { x: scene.videoCropConfig.x }
                    : undefined,
                audioUrl: scene.audioUrl || '',
                durationSeconds: scene.durationSeconds,
                narration: scene.narration,
                wordTimings: scene.wordTimings?.map(wt => ({
                    word: wt.word,
                    start: wt.start,
                    end: wt.end
                })),
                effectConfig: scene.effectConfig,
                hookText: scene.hookText,
                textStyle: scene.textStyle,
                particleOverlay: scene.particleOverlay
            }));

            // Create render job
            const renderInput: RenderJobInput = {
                projectId,
                userId: 'current-user', // TODO: Get from auth context
                scenes: renderScenes,
                options,
                endingVideoUrl,
                bgMusicUrl
            };

            const response = await apiFetch('/render/create', {
                method: 'POST',
                body: JSON.stringify(renderInput)
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to create render job');
            }

            setJobId(response.jobId);
            console.log('[Backend Render] Job created:', response.jobId);

            // Progress will be updated via SSE (handled by parent component)

        } catch (err: any) {
            console.error('[Backend Render] Error:', err);
            setError(err.message);
            setIsRendering(false);
        }
    }, [projectId, scenes, bgMusicUrl, endingVideoFile]);

    /**
     * Cancel render
     */
    const cancelRender = useCallback(() => {
        setIsRendering(false);
        setProgress(null);
        setJobId(null);
    }, []);

    /**
     * Handle SSE progress updates
     * This should be called from parent component when SSE event is received
     */
    const handleProgressUpdate = useCallback((update: any) => {
        if (update.type === 'render_progress' && update.jobId === jobId) {
            setProgress({
                phase: update.phase,
                progress: update.progress,
                message: update.message
            });
        } else if (update.type === 'render_complete' && update.jobId === jobId) {
            setProgress({ phase: 'complete', progress: 100, message: 'Render complete!' });
            setDownloadUrl(update.videoUrl);
            setIsRendering(false);

            // Auto-download
            if (update.videoUrl) {
                const link = document.createElement('a');
                link.href = update.videoUrl;
                link.download = `${title || 'video'}.mp4`;
                link.click();
            }
        } else if (update.type === 'render_failed' && update.jobId === jobId) {
            setError(update.error || 'Render failed');
            setIsRendering(false);
        }
    }, [jobId, title]);

    return {
        startRender,
        cancelRender,
        handleProgressUpdate,
        isRendering,
        progress,
        error,
        downloadUrl,
        jobId
    };
}
