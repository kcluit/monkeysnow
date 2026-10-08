import { useState, useEffect, useCallback } from 'react';

export interface UseHideIconsReturn {
  isHideIconsEnabled: boolean;
  toggleHideIcons: () => void;
  setHideIconsEnabled: (enabled: boolean) => void;
}

const STORAGE_KEY = 'hideIconsEnabled';

export function useHideIcons(): UseHideIconsReturn {
  const [isHideIconsEnabled, setIsHideIconsEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
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
