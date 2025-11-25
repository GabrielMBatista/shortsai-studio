import { useState, useEffect, useCallback } from 'react';
import { SavedCharacter, User } from '../types';
import { getUserCharacters, saveCharacter, deleteCharacter } from '../services/storageService';
import { optimizeReferenceImage } from '../services/geminiService';

export const useCharacterLibrary = (user: User | null) => {
  const [characters, setCharacters] = useState<SavedCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCharacters = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const chars = await getUserCharacters(user.id);
      setCharacters(chars);
    } catch (e) {
      console.error("Failed to load characters", e);
      setError("Failed to load character library.");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]); // Changed from [user] to [user?.id] to prevent infinite loops

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  const addCharacter = async (name: string, description: string, images: string[], shouldOptimize = false) => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      let finalImages = images;

      // Optimization Logic
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
      await loadCharacters();
      return newChar;
    } catch (e) {
      console.error("Failed to save character", e);
      setError("Failed to save character.");
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const removeCharacter = async (id: string) => {
    try {
      await deleteCharacter(id);
      setCharacters(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      setError("Failed to delete character.");
    }
  };

  return {
    characters,
    isLoading,
    error,
    addCharacter,
    removeCharacter,
    refreshLibrary: loadCharacters
  };
};