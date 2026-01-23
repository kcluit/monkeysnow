import { useState, useEffect, useCallback } from 'react';

export interface UseRainbowTextReturn {
  isRainbowEnabled: boolean;
  toggleRainbow: () => void;
  setRainbowEnabled: (enabled: boolean) => void;
}

const STORAGE_KEY = 'rainbowTextEnabled';

export function useRainbowText(): UseRainbowTextReturn {
  const [isRainbowEnabled, setIsRainbowEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Apply rainbow class to document
  const applyRainbow = useCallback((enabled: boolean) => {
    const root = document.documentElement;
    if (enabled) {
      root.classList.add('rainbow-mode');
    } else {
      root.classList.remove('rainbow-mode');
    }
  }, []);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const enabled = saved === 'true';
        setIsRainbowEnabled(enabled);
        applyRainbow(enabled);
      }
    } catch (error) {
      console.warn('Error accessing localStorage:', error);
    }
    setIsInitialized(true);
  }, [applyRainbow]);

  // Update DOM and localStorage when state changes (after init)
  useEffect(() => {
    if (!isInitialized) return;

    applyRainbow(isRainbowEnabled);

    try {
      localStorage.setItem(STORAGE_KEY, String(isRainbowEnabled));
    } catch (error) {
      console.warn('Error saving rainbow state to localStorage:', error);
    }
  }, [isRainbowEnabled, isInitialized, applyRainbow]);

  const toggleRainbow = useCallback(() => {
    setIsRainbowEnabled((prev) => !prev);
  }, []);

  const setRainbowEnabled = useCallback((enabled: boolean) => {
    setIsRainbowEnabled(enabled);
  }, []);

  return {
    isRainbowEnabled,
    toggleRainbow,
    setRainbowEnabled,
  };
}
