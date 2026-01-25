import { useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface UseHideBordersReturn {
  isHideBordersEnabled: boolean;
  toggleHideBorders: () => void;
  setHideBordersEnabled: (enabled: boolean) => void;
}

export function useHideBorders(): UseHideBordersReturn {
  const [isHideBordersEnabled, setIsHideBordersEnabled] = useLocalStorage('hideBordersEnabled', false);

  // Apply no-borders class to document when state changes
  useEffect(() => {
    const root = document.documentElement;
    if (isHideBordersEnabled) {
      root.classList.add('no-borders');
    } else {
      root.classList.remove('no-borders');
    }
  }, [isHideBordersEnabled]);

  const toggleHideBorders = useCallback(() => {
    setIsHideBordersEnabled((prev) => !prev);
  }, [setIsHideBordersEnabled]);

  const setHideBordersEnabled = useCallback((enabled: boolean) => {
    setIsHideBordersEnabled(enabled);
  }, [setIsHideBordersEnabled]);

  return {
    isHideBordersEnabled,
    toggleHideBorders,
    setHideBordersEnabled,
  };
}
