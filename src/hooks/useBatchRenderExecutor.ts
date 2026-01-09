import { useEffect, useRef, useState } from 'react';
import { BatchRenderQueue, BatchRenderJob } from '../types/batch-render';
import { useBackendRender } from './useBackendRender';
import { VideoProject } from '../types';
import { getProject } from '../services/.';
import { apiFetch } from '../services/api';

interface UseBatchRenderExecutorProps {
    queue: BatchRenderQueue;
    currentJob: BatchRenderJob | null;
    projects: VideoProject[];
    markJobAsRendering: (jobId: string) => void;
    updateJobProgress: (jobId: string, progress: number) => void;
    completeJob: (jobId: string, downloadUrl: string) => void;
    failJob: (jobId: string, error: string) => void;
}

/**
 * Hook que executa os jobs da fila de batch render
 * Integra com useBackendRender para processar cada projeto
 */
export function useBatchRenderExecutor({
    queue,
    currentJob,
    projects,
    markJobAsRendering,
    updateJobProgress,
    completeJob,
    failJob
}: UseBatchRenderExecutorProps) {
    const activeJobRef = useRef<string | null>(null);
    const renderInProgressRef = useRef(false);
    const [bgMusicUrl, setBgMusicUrl] = useState<string | undefined>();

    // Busca o projeto completo para o job atual
    const currentProject = currentJob
        ? projects.find(p => p.id === currentJob.projectId)
        : null;

    // Upload da música de fundo se houver arquivo
    useEffect(() => {
        if (!currentJob?.config.bgMusicFile) {
            setBgMusicUrl(undefined);
            return;
        }

        const uploadMusic = async () => {
            try {
                const formData = new FormData();
                formData.append('file', currentJob.config.bgMusicFile!);

                const response = await apiFetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!response.url) throw new Error('Failed to get upload URL');

                setBgMusicUrl(response.url);
            } catch (error) {
                console.error('[Batch Render] Failed to upload music:', error);
                // Continua sem música se falhar
                setBgMusicUrl(undefined);
            }
        };

        uploadMusic();
    }, [currentJob?.config.bgMusicFile]);

    // Hook de render backend para o projeto atual
    const backendRender = useBackendRender({
        projectId: currentJob?.projectId || '',
        scenes: currentProject?.scenes || [],
        bgMusicUrl,
        endingVideoFile: currentJob?.config.endingVideoFile || null,
        title: currentJob?.projectTitle
    });

    // Efeito para monitorar progresso do render backend
    useEffect(() => {
        if (!backendRender.progress) return;

        if (currentJob && backendRender.jobId) {
            // Mapear fase para progresso (0-100)
            const phaseProgress = {
                'downloading': 10,
                'processing': 50,
                'uploading': 90,
                'complete': 100
            };

            const progress = phaseProgress[backendRender.progress.phase] || backendRender.progress.progress || 0;
            updateJobProgress(currentJob.id, progress);
        }
    }, [backendRender.progress, currentJob, updateJobProgress, backendRender.jobId]);

    // Efeito para monitorar conclusão/erro
    useEffect(() => {
        if (!currentJob) return;

        // Render concluído com sucesso
        if (backendRender.downloadUrl && !renderInProgressRef.current) {
            completeJob(currentJob.id, backendRender.downloadUrl);
            activeJobRef.current = null;
            renderInProgressRef.current = false;
        }

        // Render falhou
        if (backendRender.error && !renderInProgressRef.current) {
            failJob(currentJob.id, backendRender.error);
            activeJobRef.current = null;
            renderInProgressRef.current = false;
        }
    }, [backendRender.downloadUrl, backendRender.error, currentJob, completeJob, failJob]);

    // Efeito principal: processa job da fila
    useEffect(() => {
        // Se não há fila ativa ou não há job atual, não faz nada
        if (!queue.isActive || !currentJob || queue.isPaused) {
            return;
        }

        // Se já estamos processando este job, não inicia novamente
        if (activeJobRef.current === currentJob.id || renderInProgressRef.current) {
            return;
        }

        // Se o job já está renderizando ou concluído, pula
        if (currentJob.status !== 'pending') {
            return;
        }

        // Inicia o render deste job
        const startRender = async () => {
            try {
                console.log(`[Batch Render] Starting job: ${currentJob.projectTitle}`);

                activeJobRef.current = currentJob.id;
                renderInProgressRef.current = true;
                markJobAsRendering(currentJob.id);

                // Busca projeto completo se necessário
                let fullProject = projects.find(p => p.id === currentJob.projectId);

                if (!fullProject || !fullProject.scenes || fullProject.scenes.length === 0) {
                    console.log(`[Batch Render] Fetching full project data for ${currentJob.projectId}`);
                    fullProject = await getProject(currentJob.projectId);
                }

                if (!fullProject || !fullProject.scenes || fullProject.scenes.length === 0) {
                    throw new Error('Project has no scenes to render');
                }

                // Configura opções de render baseado na config do job
                const renderOptions = {
                    fps: currentJob.config.fps,
                    resolution: currentJob.config.resolution,
                    format: currentJob.config.format,
                    showSubtitles: currentJob.config.showSubtitles,
                    bgMusicVolume: currentJob.config.bgMusicVolume
                };

                console.log(`[Batch Render] Render options:`, renderOptions);

                // NOTA: O hook useBackendRender precisa ser chamado no nível superior
                // então aqui apenas marcamos como "renderizando" e o useBackendRender
                // que está no componente pai vai pegar isso e iniciar o render

                // Esta é uma limitação do React Hooks - não podemos chamar hooks
                // condicionalmente ou dentro de callbacks assíncronos.

                // A solução é usar um efeito separado que monitora quando o job
                // está "rendering" e chama startRender do useBackendRender

            } catch (error: any) {
                console.error(`[Batch Render] Error starting job:`, error);
                failJob(currentJob.id, error.message || 'Failed to start render');
                activeJobRef.current = null;
                renderInProgressRef.current = false;
            }
        };

        startRender();
    }, [queue.isActive, queue.isPaused, currentJob, projects, markJobAsRendering, failJob]);

    // Efeito separado: quando job está "rendering", inicia o render backend
    useEffect(() => {
        if (!currentJob || currentJob.status !== 'rendering') return;
        if (backendRender.isRendering || activeJobRef.current !== currentJob.id) return;

        const options = {
            fps: currentJob.config.fps,
            resolution: currentJob.config.resolution,
            format: currentJob.config.format as 'mp4' | 'webm',
            showSubtitles: currentJob.config.showSubtitles,
            bgMusicVolume: currentJob.config.bgMusicVolume || 50
        };

        console.log(`[Batch Render] Calling backend render for job ${currentJob.id}`);
        backendRender.startRender(options);
    }, [currentJob, backendRender]);

    return {
        isProcessing: renderInProgressRef.current,
        currentRenderProgress: backendRender.progress,
        currentRenderError: backendRender.error
    };
}
