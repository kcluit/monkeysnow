import { useState, useEffect, useCallback } from 'react';

export interface UseShowDateReturn {
  isShowDateEnabled: boolean;
  toggleShowDate: () => void;
  setShowDateEnabled: (enabled: boolean) => void;
}

const STORAGE_KEY = 'showDateEnabled';

export function useShowDate(): UseShowDateReturn {
  const [isShowDateEnabled, setIsShowDateEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const enabled = saved === 'true';
        setIsShowDateEnabled(enabled);
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
      localStorage.setItem(STORAGE_KEY, String(isShowDateEnabled));
    } catch (error) {
      console.warn('Error saving show date state to localStorage:', error);
    }
  }, [isShowDateEnabled, isInitialized]);

  const toggleShowDate = useCallback(() => {
    setIsShowDateEnabled((prev) => !prev);
  }, []);

  const setShowDateEnabled = useCallback((enabled: boolean) => {
    setIsShowDateEnabled(enabled);
  }, []);

  return {
    isShowDateEnabled,
    toggleShowDate,
    setShowDateEnabled,
  };
}
