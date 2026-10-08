import { useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface UseBoldTextReturn {
  isBoldTextEnabled: boolean;
  toggleBoldText: () => void;
  setBoldTextEnabled: (enabled: boolean) => void;
}

export function useBoldText(): UseBoldTextReturn {
  const [isBoldTextEnabled, setIsBoldTextEnabled] = useLocalStorage('boldTextEnabled', false);

  // Apply bold-text class to document when state changes (style.css shifts every font weight a step heavier)
  useEffect(() => {
    const root = document.documentElement;
    if (isBoldTextEnabled) {
      root.classList.add('bold-text');
    } else {
      root.classList.remove('bold-text');
    }
  }, [isBoldTextEnabled]);

  const toggleBoldText = useCallback(() => {
    setIsBoldTextEnabled((prev) => !prev);
  }, [setIsBoldTextEnabled]);

  const setBoldTextEnabled = useCallback((enabled: boolean) => {
    setIsBoldTextEnabled(enabled);
  }, [setIsBoldTextEnabled]);

  return {
    isBoldTextEnabled,
    toggleBoldText,
    setBoldTextEnabled,
  };
}
