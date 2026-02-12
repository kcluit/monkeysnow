import { useState, useEffect, useCallback } from 'react';
import { themes, getThemeById, getDefaultTheme } from '../types/themes';
import type { Theme } from '../types/themes';
import type { UseThemeReturn } from '../types';

export function useTheme(): UseThemeReturn {
    const [theme, setThemeState] = useState<Theme>(getDefaultTheme());
    const [isInitialized, setIsInitialized] = useState(false);

    // Apply theme CSS variables to document
    const applyTheme = useCallback((themeToApply: Theme) => {
        const root = document.documentElement;
        const { colors, isDark } = themeToApply;

        // Set CSS variables from theme (8 core variables)
        root.style.setProperty('--background', colors.background);
        root.style.setProperty('--cardBg', colors.cardBg);
        root.style.setProperty('--textPrimary', colors.textPrimary);
        root.style.setProperty('--textSecondary', colors.textSecondary);
        root.style.setProperty('--accent', colors.accent);
        root.style.setProperty('--secondary', colors.secondary);
        root.style.setProperty('--titleColor', colors.titleColor);
        root.style.setProperty('--specialColor', colors.specialColor);

        // Derived CSS variables
        root.style.setProperty('--border', isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)');
        // Grid line color for charts - not affected by 'hide borders' setting
        root.style.setProperty('--gridLine', isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)');

        // Toggle dark class for Tailwind compatibility
        if (isDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, []);

    // Initialize theme on mount
    useEffect(() => {
        try {
            const savedThemeId = localStorage.getItem('themeId');
            if (savedThemeId) {
                const savedTheme = getThemeById(savedThemeId);
                if (savedTheme) {
                    setThemeState(savedTheme);
                    applyTheme(savedTheme);
                } else {
                    applyTheme(getDefaultTheme());
                }
            } else {
                applyTheme(getDefaultTheme());
            }
        } catch (error) {
            console.warn('Error accessing localStorage:', error);
            applyTheme(getDefaultTheme());
        }
        setIsInitialized(true);
    }, [applyTheme]);

    // Update DOM and localStorage when theme changes (after initialization)
    useEffect(() => {
        if (!isInitialized) return;

        applyTheme(theme);

        try {
            localStorage.setItem('themeId', theme.id);
        } catch (error) {
            console.warn('Error saving theme to localStorage:', error);
        }
    }, [theme, isInitialized, applyTheme]);

    const setTheme = useCallback((themeId: string) => {
        const newTheme = getThemeById(themeId);
        if (newTheme) {
            setThemeState(newTheme);
        }
    }, []);

    const resetPreview = useCallback(() => {
        if (theme) {
            applyTheme(theme);
        }
    }, [theme, applyTheme]);

    return {
        theme,
        setTheme,
        isDark: theme.isDark,
        availableThemes: themes,
        applyTheme,
        resetPreview,
    };
};
