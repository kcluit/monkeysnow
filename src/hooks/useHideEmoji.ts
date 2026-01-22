import { useState, useEffect, useCallback } from 'react';

export interface UseHideEmojiReturn {
  isHideEmojiEnabled: boolean;
  toggleHideEmoji: () => void;
  setHideEmojiEnabled: (enabled: boolean) => void;
}

const STORAGE_KEY = 'hideEmojiEnabled';

export function useHideEmoji(): UseHideEmojiReturn {
  const [isHideEmojiEnabled, setIsHideEmojiEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const enabled = saved === 'true';
        setIsHideEmojiEnabled(enabled);
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
      localStorage.setItem(STORAGE_KEY, String(isHideEmojiEnabled));
    } catch (error) {
      console.warn('Error saving hide emoji state to localStorage:', error);
    }
  }, [isHideEmojiEnabled, isInitialized]);

  const toggleHideEmoji = useCallback(() => {
    setIsHideEmojiEnabled((prev) => !prev);
  }, []);

  const setHideEmojiEnabled = useCallback((enabled: boolean) => {
    setIsHideEmojiEnabled(enabled);
  }, []);

  return {
    isHideEmojiEnabled,
    toggleHideEmoji,
    setHideEmojiEnabled,
  };
}
