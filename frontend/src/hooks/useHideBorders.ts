import { useState, useEffect, useCallback } from 'react';

export interface UseHideBordersReturn {
  isHideBordersEnabled: boolean;
  toggleHideBorders: () => void;
  setHideBordersEnabled: (enabled: boolean) => void;
}

const STORAGE_KEY = 'hideBordersEnabled';

export function useHideBorders(): UseHideBordersReturn {
  const [isHideBordersEnabled, setIsHideBordersEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Apply no-borders class to document
  const applyHideBorders = useCallback((enabled: boolean) => {
    const root = document.documentElement;
    if (enabled) {
      root.classList.add('no-borders');
    } else {
      root.classList.remove('no-borders');
    }
  }, []);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const enabled = saved === 'true';
        setIsHideBordersEnabled(enabled);
        applyHideBorders(enabled);
      }
    } catch (error) {
      console.warn('Error accessing localStorage:', error);
    }
    setIsInitialized(true);
  }, [applyHideBorders]);

  // Update DOM and localStorage when state changes (after init)
  useEffect(() => {
    if (!isInitialized) return;

    applyHideBorders(isHideBordersEnabled);

    try {
      localStorage.setItem(STORAGE_KEY, String(isHideBordersEnabled));
    } catch (error) {
      console.warn('Error saving hide borders state to localStorage:', error);
    }
  }, [isHideBordersEnabled, isInitialized, applyHideBorders]);

  const toggleHideBorders = useCallback(() => {
    setIsHideBordersEnabled((prev) => !prev);
  }, []);

  const setHideBordersEnabled = useCallback((enabled: boolean) => {
    setIsHideBordersEnabled(enabled);
  }, []);

  return {
    isHideBordersEnabled,
    toggleHideBorders,
    setHideBordersEnabled,
  };
}
