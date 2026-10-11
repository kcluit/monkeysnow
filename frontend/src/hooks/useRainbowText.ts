import { useLayoutEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { startRainbowText } from '../utils/rainbowText';

export interface UseRainbowTextReturn {
  isRainbowEnabled: boolean;
  setRainbowEnabled: (enabled: boolean) => void;
}

export function useRainbowText(): UseRainbowTextReturn {
  const [isRainbowEnabled, setRainbowEnabled] = useLocalStorage('rainbowTextEnabled', false);

  // Before paint, so a page loaded with it on never shows plain text first
  useLayoutEffect(() => {
    if (!isRainbowEnabled) return;
    const root = document.documentElement;
    root.classList.add('rainbow-mode');
    const stop = startRainbowText();
    return () => {
      stop();
      root.classList.remove('rainbow-mode');
    };
  }, [isRainbowEnabled]);

  return { isRainbowEnabled, setRainbowEnabled };
}
