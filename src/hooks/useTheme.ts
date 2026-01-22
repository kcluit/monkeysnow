import { useState, useEffect, useCallback } from 'react';
import type { UseThemeReturn } from '../types';

type Theme = 'light' | 'dark';

export function useTheme(): UseThemeReturn {
  const [theme, setTheme] = useState<Theme>('light');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    try {
      // Check localStorage for saved theme preference
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      }
      // If no saved preference, use default 'light' theme
    } catch (error) {
      console.warn('Error accessing localStorage:', error);
    }
    setIsInitialized(true);
  }, []);

  // Update DOM and localStorage when theme changes (but only after initialization)
  useEffect(() => {
    if (!isInitialized) return;

    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    try {
      localStorage.setItem('theme', theme);
    } catch (error) {
      console.warn('Error saving theme to localStorage:', error);
    }
  }, [theme, isInitialized]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  }, []);

  return {
    theme,
    toggleTheme,
    isDark: theme === 'dark'
  };
}
