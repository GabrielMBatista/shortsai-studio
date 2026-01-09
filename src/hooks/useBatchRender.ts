import { useState, useCallback, useRef, useEffect } from 'react';
import { BatchRenderQueue, BatchRenderJob, BatchRenderConfig } from '../types/batch-render';
import { VideoProject } from '../types';

const STORAGE_KEY = 'shortsai_batch_render_queue';

interface UseBatchRenderProps {
    onJobComplete?: (job: BatchRenderJob) => void;
    onJobError?: (job: BatchRenderJob, error: string) => void;
    onQueueComplete?: () => void;
}

/**
 * Hook para gerenciar fila de renderização em lote
 * Persiste estado no localStorage e processa jobs sequencialmente
 */
export function useBatchRender({ onJobComplete, onJobError, onQueueComplete }: UseBatchRenderProps = {}) {
    const [queue, setQueue] = useState<BatchRenderQueue>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('[Batch Render] Failed to load queue from storage', e);
        }
        return {
            jobs: [],
            currentJobIndex: -1,
            isActive: false,
            isPaused: false,
        };
    });

    const isProcessingRef = useRef(false);

    // Persiste no localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
        } catch (e) {
            console.error('[Batch Render] Failed to save queue to storage', e);
        }
    }, [queue]);

    /**
     * Adiciona jobs à fila
     */
    const addJobs = useCallback((projects: VideoProject[], config: BatchRenderConfig) => {
        const newJobs: BatchRenderJob[] = projects.map(project => ({
            id: `${project.id}-${Date.now()}`,
            projectId: project.id,
            projectTitle: typeof project.generatedTitle === 'string'
                ? project.generatedTitle
                : project.topic,
            thumbnailUrl: project.scenes[0]?.imageUrl,
            config,
            status: 'pending',
            progress: 0,
            createdAt: Date.now(),
        }));

        setQueue(prev => ({
            ...prev,
            jobs: [...prev.jobs, ...newJobs],
        }));

        return newJobs.length;
    }, []);

    /**
     * Remove job da fila
     */
    const removeJob = useCallback((jobId: string) => {
        setQueue(prev => {
            const jobIndex = prev.jobs.findIndex(j => j.id === jobId);
            if (jobIndex === -1) return prev;

            // Não pode remover job em andamento
            if (prev.currentJobIndex === jobIndex && prev.jobs[jobIndex].status === 'rendering') {
                return prev;
            }

            const newJobs = prev.jobs.filter(j => j.id !== jobId);
            let newCurrentIndex = prev.currentJobIndex;

            // Ajusta índice se necessário
            if (jobIndex < prev.currentJobIndex) {
                newCurrentIndex--;
            } else if (jobIndex === prev.currentJobIndex) {
                newCurrentIndex = -1;
            }

            return {
                ...prev,
                jobs: newJobs,
                currentJobIndex: newCurrentIndex,
            };
        });
    }, []);

    /**
     * Limpa jobs completados ou com erro
     */
    const clearCompleted = useCallback(() => {
        setQueue(prev => ({
            ...prev,
            jobs: prev.jobs.filter(j => j.status === 'pending' || j.status === 'rendering'),
            currentJobIndex: -1,
        }));
    }, []);

    /**
     * Limpa toda a fila
     */
    const clearAll = useCallback(() => {
        setQueue({
            jobs: [],
            currentJobIndex: -1,
            isActive: false,
            isPaused: false,
        });
    }, []);

    /**
     * Pausa a fila
     */
    const pause = useCallback(() => {
        setQueue(prev => ({ ...prev, isPaused: true }));
    }, []);

    /**
     * Retoma a fila
     */
    const resume = useCallback(() => {
        setQueue(prev => ({ ...prev, isPaused: false, isActive: true }));
    }, []);

    /**
     * Inicia processamento da fila
     */
    const start = useCallback(() => {
        setQueue(prev => {
            if (prev.jobs.length === 0) return prev;

            return {
                ...prev,
                isActive: true,
                isPaused: false,
                currentJobIndex: prev.currentJobIndex === -1 ? 0 : prev.currentJobIndex,
            };
        });
    }, []);

    /**
     * Para a fila
     */
    const stop = useCallback(() => {
        setQueue(prev => ({
            ...prev,
            isActive: false,
            isPaused: false,
        }));
    }, []);

    /**
     * Atualiza progresso de um job
     */
    const updateJobProgress = useCallback((jobId: string, progress: number) => {
        setQueue(prev => ({
            ...prev,
            jobs: prev.jobs.map(job =>
                job.id === jobId ? { ...job, progress } : job
            ),
        }));
    }, []);

    /**
     * Marca job como completado
     */
    const completeJob = useCallback((jobId: string, downloadUrl: string) => {
        setQueue(prev => {
            const updatedJobs = prev.jobs.map(job =>
                job.id === jobId
                    ? { ...job, status: 'completed' as const, progress: 100, downloadUrl, completedAt: Date.now() }
                    : job
            );

            const job = updatedJobs.find(j => j.id === jobId);
            if (job && onJobComplete) {
                onJobComplete(job);
            }

            // Move para próximo job
            const nextIndex = prev.currentJobIndex + 1;
            const hasMoreJobs = nextIndex < updatedJobs.length;

            if (!hasMoreJobs && onQueueComplete) {
                setTimeout(() => onQueueComplete(), 100);
            }

            return {
                ...prev,
                jobs: updatedJobs,
                currentJobIndex: hasMoreJobs ? nextIndex : -1,
                isActive: hasMoreJobs && !prev.isPaused,
            };
        });
    }, [onJobComplete, onQueueComplete]);

    /**
     * Marca job como falho
     */
    const failJob = useCallback((jobId: string, error: string) => {
        setQueue(prev => {
            const updatedJobs = prev.jobs.map(job =>
                job.id === jobId
                    ? { ...job, status: 'failed' as const, error, completedAt: Date.now() }
                    : job
            );

            const job = updatedJobs.find(j => j.id === jobId);
            if (job && onJobError) {
                onJobError(job, error);
            }

            // Move para próximo job
            const nextIndex = prev.currentJobIndex + 1;
            const hasMoreJobs = nextIndex < updatedJobs.length;

            if (!hasMoreJobs && onQueueComplete) {
                setTimeout(() => onQueueComplete(), 100);
            }

            return {
                ...prev,
                jobs: updatedJobs,
                currentJobIndex: hasMoreJobs ? nextIndex : -1,
                isActive: hasMoreJobs && !prev.isPaused,
            };
        });
    }, [onJobError, onQueueComplete]);

    /**
     * Marca job atual como renderizando
     */
    const markJobAsRendering = useCallback((jobId: string) => {
        setQueue(prev => ({
            ...prev,
            jobs: prev.jobs.map(job =>
                job.id === jobId ? { ...job, status: 'rendering' as const } : job
            ),
        }));
    }, []);

    // Estatísticas
    const stats = {
        total: queue.jobs.length,
        pending: queue.jobs.filter(j => j.status === 'pending').length,
        rendering: queue.jobs.filter(j => j.status === 'rendering').length,
        completed: queue.jobs.filter(j => j.status === 'completed').length,
        failed: queue.jobs.filter(j => j.status === 'failed').length,
    };

    const currentJob = queue.currentJobIndex >= 0 ? queue.jobs[queue.currentJobIndex] : null;

    return {
        queue,
        currentJob,
        stats,
        addJobs,
        removeJob,
        clearCompleted,
        clearAll,
        start,
        stop,
        pause,
        resume,
        updateJobProgress,
        completeJob,
        failJob,
        markJobAsRendering,
    };
}
