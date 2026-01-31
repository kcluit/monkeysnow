import { useState, useEffect, useCallback } from 'react';

export interface UseHideIconsReturn {
  isHideIconsEnabled: boolean;
  toggleHideIcons: () => void;
  setHideIconsEnabled: (enabled: boolean) => void;
}

const STORAGE_KEY = 'hideIconsEnabled';
const OLD_STORAGE_KEY = 'hideEmojiEnabled'; // For migration

export function useHideIcons(): UseHideIconsReturn {
  const [isHideIconsEnabled, setIsHideIconsEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage (with migration from old key)
  useEffect(() => {
    try {
      let saved = localStorage.getItem(STORAGE_KEY);

      // Migrate from old key if new key doesn't exist
      if (saved === null) {
        const oldSaved = localStorage.getItem(OLD_STORAGE_KEY);
        if (oldSaved !== null) {
          saved = oldSaved;
          localStorage.setItem(STORAGE_KEY, oldSaved);
          localStorage.removeItem(OLD_STORAGE_KEY);
        }
      }

      if (saved !== null) {
        const enabled = saved === 'true';
        setIsHideIconsEnabled(enabled);
      }
    } catch (error) {
      console.warn('Error accessing localStorage:', error);
    }
    setIsInitialized(true);
  }, []);

  // Update localStorage when state changes (after init)
  useEffect(() => {
    if (!isInitialized) return;

    try {
      localStorage.setItem(STORAGE_KEY, String(isHideIconsEnabled));
    } catch (error) {
      console.warn('Error saving hide icons state to localStorage:', error);
    }
  }, [isHideIconsEnabled, isInitialized]);

  const toggleHideIcons = useCallback(() => {
    setIsHideIconsEnabled((prev) => !prev);
  }, []);

  const setHideIconsEnabled = useCallback((enabled: boolean) => {
    setIsHideIconsEnabled(enabled);
  }, []);

  return {
    isHideIconsEnabled,
    toggleHideIcons,
    setHideIconsEnabled,
  };
}
