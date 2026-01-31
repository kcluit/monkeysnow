import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    languages,
    getLanguageById,
    getDefaultLanguage,
    detectBrowserLanguage,
    getEnglishTranslations,
} from '../locales';
import type { Language, TranslationKey, UseLanguageReturn } from '../types/i18n';

/**
 * Hook for managing application language and translations.
 *
 * Features:
 * - Persists language selection to localStorage
 * - Auto-detects browser language on first visit
 * - Provides type-safe translation function t()
 * - Falls back to English for missing translations
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *     const { t, language, setLanguage, availableLanguages } = useLanguage();
 *
 *     return (
 *         <div>
 *             <h1>{t('common.loading')}</h1>
 *             <p>Current: {language.name}</p>
 *             <select onChange={e => setLanguage(e.target.value)}>
 *                 {availableLanguages.map(lang => (
 *                     <option key={lang.id} value={lang.id}>
 *                         {lang.nativeName}
 *                     </option>
 *                 ))}
 *             </select>
 *         </div>
 *     );
 * }
 * ```
 */
export function useLanguage(): UseLanguageReturn {
    const [language, setLanguageState] = useState<Language>(getDefaultLanguage());
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize language on mount
    useEffect(() => {
        try {
            const savedLanguageId = localStorage.getItem('languageId');

            if (savedLanguageId) {
                // User has a saved preference
                const savedLanguage = getLanguageById(savedLanguageId);
                if (savedLanguage) {
                    setLanguageState(savedLanguage);
                } else {
                    // Saved language no longer available, use default
                    setLanguageState(getDefaultLanguage());
                }
            } else {
                // First visit: auto-detect browser language
                const detectedLanguageId = detectBrowserLanguage();
                const detectedLanguage = getLanguageById(detectedLanguageId) || getDefaultLanguage();
                setLanguageState(detectedLanguage);
                // Save detected language
                localStorage.setItem('languageId', detectedLanguage.id);
            }
        } catch (error) {
            console.warn('Error accessing localStorage for language:', error);
            setLanguageState(getDefaultLanguage());
        }

        setIsInitialized(true);
    }, []);

    // Persist language changes after initialization
    useEffect(() => {
        if (!isInitialized) return;

        try {
            localStorage.setItem('languageId', language.id);
        } catch (error) {
            console.warn('Error saving language to localStorage:', error);
        }
    }, [language, isInitialized]);

    /**
     * Set the current language by ID.
     * Does nothing if the language ID is not found.
     */
    const setLanguage = useCallback((languageId: string) => {
        const newLanguage = getLanguageById(languageId);
        if (newLanguage) {
            setLanguageState(newLanguage);
        }
    }, []);

    /**
     * Translation function with English fallback.
     * Returns the translated string for the given key.
     * If translation is missing, returns English and logs a warning in dev mode.
     */
    const t = useCallback((key: TranslationKey): string => {
        const translation = language.translations[key];

        if (translation === undefined) {
            // Log warning in development
            if (import.meta.env.DEV) {
                console.warn(`Missing translation for key: "${key}" in language: "${language.id}"`);
            }
            // Fallback to English
            return getEnglishTranslations()[key];
        }

        return translation;
    }, [language]);

    // Memoize available languages to prevent unnecessary re-renders
    const availableLanguages = useMemo(() => languages, []);

    return {
        language,
        setLanguage,
        t,
        availableLanguages,
    };
}
