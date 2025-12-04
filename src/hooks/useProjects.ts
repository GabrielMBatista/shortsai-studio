import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserProjects, deleteProject } from '../services/storageService';
import { useState } from 'react';

export const useProjects = (userId?: string, folderId?: string | null, isArchived?: boolean) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12); // Default to 12 items per page

  const projectsQuery = useQuery({
    queryKey: ['projects', userId, page, limit, folderId, isArchived],
    queryFn: () => getUserProjects(userId!, limit, page, folderId, isArchived),
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', userId] });
    },
  });

  const data = projectsQuery.data || { projects: [], total: 0 };

  return {
    projects: data.projects,
    total: data.total,
    totalPages: Math.ceil(data.total / limit),
    page,
    setPage,
    limit,
    setLimit,
    isLoading: projectsQuery.isLoading,
    isError: projectsQuery.isError,
    deleteProject: deleteMutation.mutateAsync,
    refreshProjects: projectsQuery.refetch,
    isDeleting: deleteMutation.isPending
  };
};