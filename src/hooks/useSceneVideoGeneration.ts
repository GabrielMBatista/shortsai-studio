import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

export function useSceneVideoGeneration() {
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    // 1. Mutation para iniciar (Apenas pega o ID)
    const generateMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await fetch(`/api/scenes/${payload.sceneId}/generate`, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to start generation');
            }
            return res.json();
        },
        onSuccess: (data) => {
            setActiveJobId(data.jobId); // Começa a escutar este Job
        }
    });

    // 2. Query de Polling (Só roda se tiver activeJobId)
    const jobStatusQuery = useQuery({
        queryKey: ['job-status', activeJobId],
        queryFn: async () => {
            const res = await fetch(`/api/jobs/${activeJobId}`);
            if (!res.ok) throw new Error('Failed to fetch job status');
            return res.json();
        },
        enabled: !!activeJobId,
        refetchInterval: (query) => {
            const data = query.state.data;
            // Para de consultar se acabou ou falhou
            if (data?.status === 'COMPLETED' || data?.status === 'FAILED') {
                return false;
            }
            return 2000; // Consulta a cada 2 segundos
        },
    });

    // 3. Efeito colateral: Quando completa, atualiza a lista de cenas e limpa o job
    useEffect(() => {
        if (jobStatusQuery.data?.status === 'COMPLETED' || jobStatusQuery.data?.status === 'FAILED') {
            queryClient.invalidateQueries({ queryKey: ['project-scenes'] });
            // Clear activeJobId after a short delay to allow UI to update
            const timer = setTimeout(() => {
                setActiveJobId(null);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [jobStatusQuery.data?.status, queryClient]);

    return {
        generate: generateMutation.mutate,
        isPending: generateMutation.isPending || (!!activeJobId && jobStatusQuery.data?.status === 'PROCESSING') || (!!activeJobId && jobStatusQuery.data?.status === 'QUEUED'),
        status: jobStatusQuery.data?.status,
        job: jobStatusQuery.data
    };
}
