import { useState, useLayoutEffect, useEffect, useCallback } from 'react';
import { fonts, getFontById, getDefaultFont } from '../types/fonts';
import type { Font } from '../types/fonts';

export interface UseFontReturn {
  font: Font;
  setFont: (fontId: string) => void;
  availableFonts: Font[];
}

export function useFont(): UseFontReturn {
  const [font, setFontState] = useState<Font>(() => {
    try {
      const savedId = localStorage.getItem('fontId');
      if (savedId) {
        const saved = getFontById(savedId);
        if (saved) return saved;
      }
    } catch { /* ignore */ }
    return getDefaultFont();
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Apply font CSS variable to document
  const applyFont = useCallback((fontToApply: Font) => {
    const root = document.documentElement;
    root.style.setProperty('--fontFamily', fontToApply.family);
  }, []);

  // Apply font CSS before first paint (font already loaded in useState init)
  useLayoutEffect(() => {
    applyFont(font);
    setIsInitialized(true);
  }, [applyFont]);

  // Update DOM and localStorage when font changes (after initialization)
  useEffect(() => {
    if (!isInitialized) return;

    applyFont(font);

    try {
      localStorage.setItem('fontId', font.id);
    } catch (error) {
      console.warn('Error saving font to localStorage:', error);
    }
  }, [font, isInitialized, applyFont]);

  const setFont = useCallback((fontId: string) => {
    const newFont = getFontById(fontId);
    if (newFont) {
      setFontState(newFont);
    }
  }, []);

  return {
    font,
    setFont,
    availableFonts: fonts,
  };
}
