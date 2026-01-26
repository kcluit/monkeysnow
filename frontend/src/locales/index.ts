import { en } from './en';
import type { Language, Translations } from '../types/i18n';

/**
 * English language definition.
 */
const englishLanguage: Language = {
    id: 'en',
    name: 'English',
    nativeName: 'English',
    translations: en,
};

/**
 * All available languages.
 *
 * Community-contributed languages should be added here.
 * See CONTRIBUTING.md for instructions on adding a new language.
 *
 * Example:
 * ```
 * import { fr } from './fr';
 *
 * const frenchLanguage: Language = {
 *     id: 'fr',
 *     name: 'French',
 *     nativeName: 'Français',
 *     translations: fr,
 * };
 *
 * export const languages: Language[] = [
 *     englishLanguage,
 *     frenchLanguage,
 * ];
 * ```
 */
export const languages: Language[] = [
    englishLanguage,
];

/**
 * Get a language by its ID.
 * @param id - Language ID (e.g., 'en', 'fr')
 * @returns Language definition or undefined if not found
 */
export function getLanguageById(id: string): Language | undefined {
    return languages.find(lang => lang.id === id);
}

/**
 * Get the default language (English).
 * @returns English language definition
 */
export function getDefaultLanguage(): Language {
    return englishLanguage;
}

/**
 * Get English translations for fallback.
 * @returns English translations object
 */
export function getEnglishTranslations(): Translations {
    return en;
}

/**
 * Detect the user's preferred language from browser settings.
 * Falls back to English if browser language is not supported.
 *
 * @returns Language ID of detected or fallback language
 */
export function detectBrowserLanguage(): string {
    // Get browser language (e.g., 'en-US' -> 'en')
    const browserLang = navigator.language.split('-')[0];

    // Check if we support this language
    const supported = languages.find(lang => lang.id === browserLang);

    return supported ? supported.id : 'en';
}
