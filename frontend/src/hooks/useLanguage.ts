import { useSyncExternalStore } from 'react';
import {
    languages,
    getLanguage,
    setLanguage,
    subscribeToLanguage,
    translatorFor,
} from '../locales';
import type { UseLanguageReturn } from '../types/i18n';

/**
 * The language the site is shown in, one for the whole tab: a pick made anywhere (the
 * Settings page, the command palette, the footer, another tab) redraws every component
 * using this hook at once.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *     const { t, tPlural } = useLanguage();
 *     return <p>{t('common.loading')} {tPlural('fetchStatus.resorts', 3)}</p>;
 * }
 * ```
 */
export function useLanguage(): UseLanguageReturn {
    const language = useSyncExternalStore(subscribeToLanguage, getLanguage);
    const { t, tPlural } = translatorFor(language);

    return {
        language,
        setLanguage,
        t,
        tPlural,
        availableLanguages: languages,
    };
}
