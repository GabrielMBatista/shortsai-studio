import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserProjects, deleteProject } from '../services/storageService';
import { VideoProject } from '../types';

export const useProjects = (userId?: string) => {
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ['projects', userId],
    queryFn: () => getUserProjects(userId!),
    enabled: !!userId,
    // Optimization: Keep data fresh for 30s to prevent rapid re-fetches
    staleTime: 30 * 1000, 
    // Optimization: Background polling to keep sync active
    refetchInterval: 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['projects', userId] });
    },
  });

  return {
    projects: projectsQuery.data || [],
    isLoading: projectsQuery.isLoading,
    isError: projectsQuery.isError,
    deleteProject: deleteMutation.mutateAsync,
    refreshProjects: projectsQuery.refetch,
    isDeleting: deleteMutation.isPending
  };
};