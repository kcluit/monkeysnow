import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface UseFPSCounterReturn {
  fps: number;
  isEnabled: boolean;
  toggleFPS: () => void;
  setEnabled: (enabled: boolean) => void;
}

export function useFPSCounter(): UseFPSCounterReturn {
  const [fps, setFps] = useState(0);
  const [isEnabled, setIsEnabled] = useLocalStorage('fpsCounterEnabled', false);

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEnabled) {
      setFps(0);
      return;
    }

    const calculateFPS = (currentTime: number) => {
      frameCountRef.current++;

      const elapsed = currentTime - lastTimeRef.current;

      // Update FPS every 500ms for smoother display
      if (elapsed >= 500) {
        const calculatedFps = Math.round((frameCountRef.current / elapsed) * 1000);
        setFps(calculatedFps);
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }

      rafIdRef.current = requestAnimationFrame(calculateFPS);
    };

    rafIdRef.current = requestAnimationFrame(calculateFPS);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isEnabled]);

  const toggleFPS = useCallback(() => {
    setIsEnabled(!isEnabled);
  }, [isEnabled, setIsEnabled]);

  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
  }, [setIsEnabled]);

  return {
    fps,
    isEnabled,
    toggleFPS,
    setEnabled,
  };
}
