import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SavedCharacter, User } from '../types';
import { getUserCharacters, saveCharacter, deleteCharacter } from '../services/storageService';
import { optimizeReferenceImage } from '../services/geminiService';

export const useCharacterLibrary = (user: User | null) => {
  const queryClient = useQueryClient();

  // Query: Fetch Characters
  const { 
    data: characters = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['characters', user?.id],
    queryFn: () => getUserCharacters(user!.id),
    enabled: !!user?.id,
  });

  // Mutation: Add Character
  const addMutation = useMutation({
    mutationFn: async ({ name, description, images, shouldOptimize }: { name: string, description: string, images: string[], shouldOptimize: boolean }) => {
      if (!user) throw new Error("No user");
      
      let finalImages = images;

      if (shouldOptimize && images.length === 1) {
          try {
             const optimized = await optimizeReferenceImage(images[0]);
             finalImages = [optimized];
          } catch (e) {
             console.warn("Optimization failed, using original", e);
          }
      }

      const newChar: SavedCharacter = {
        id: crypto.randomUUID(),
        userId: user.id,
        name: name.trim(),
        description: description.trim(),
        images: finalImages,
        createdAt: Date.now()
      };

      await saveCharacter(newChar);
      return newChar;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters', user?.id] });
    }
  });

  // Mutation: Delete Character
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteCharacter(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(['characters', user?.id], (old: SavedCharacter[] | undefined) => 
        old ? old.filter(c => c.id !== deletedId) : []
      );
    }
  });

  return {
    characters,
    isLoading: isLoading || addMutation.isPending || deleteMutation.isPending,
    error: error ? (error as Error).message : (addMutation.error || deleteMutation.error ? "Operation failed" : null),
    addCharacter: (name: string, desc: string, imgs: string[], optimize = false) => 
      addMutation.mutateAsync({ name, description: desc, images: imgs, shouldOptimize: optimize }),
    removeCharacter: deleteMutation.mutateAsync,
    refreshLibrary: refetch
  };
};