import { en } from './en';
import { fr } from './fr';
import { es } from './es';
import { ru } from './ru';
import { zh, regions as zhRegions } from './zh';
import type {
    Language,
    PluralKey,
    Translate,
    TranslatePlural,
    TranslationKey,
    TranslationValues,
} from '../types/i18n';

const englishLanguage: Language = {
    id: 'en',
    name: 'English',
    nativeName: 'English',
    locale: 'en-US',
    script: 'latin',
    translations: en,
};

const frenchLanguage: Language = {
    id: 'fr',
    name: 'French',
    nativeName: 'Français',
    locale: 'fr',
    script: 'latin',
    translations: fr,
};

const spanishLanguage: Language = {
    id: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    // Spain's conventions (1,5 and a 24-hour clock), which Chile and Argentina share
    locale: 'es',
    script: 'latin',
    translations: es,
};

const russianLanguage: Language = {
    id: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    locale: 'ru',
    script: 'cyrillic',
    translations: ru,
};

// Every Chinese browser gets it, zh-TW and zh-HK included, until a Traditional Chinese
// (zh-Hant) is added: its id stays 'zh', so a saved pick always means Simplified
const chineseLanguage: Language = {
    id: 'zh',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    locale: 'zh-CN',
    htmlLang: 'zh-Hans',
    script: 'han',
    translations: zh,
    regionNames: zhRegions,
};

/**
 * All available languages. See CONTRIBUTING.md for adding one.
 */
export const languages: Language[] = [
    englishLanguage,
    frenchLanguage,
    spanishLanguage,
    russianLanguage,
    chineseLanguage,
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
 * Fill `{name}` placeholders in a translated string.
 * @example interpolate('{count} queued', { count: 3 }) // '3 queued'
 */
export function interpolate(template: string, values: TranslationValues): string {
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in values ? String(values[name]) : match
    );
}

// French sets a space before : ; ! ? and », after «, and between a number and °: a
// no-break one, so a line never starts with the mark. Spanish sets one only between a
// number and ° or %, Russian before a dash and °. Done here rather than in the strings,
// so they stay readable with ordinary spaces.
// Chinese sets a space between a character and a Latin letter or number. zh's strings
// have them already; this puts them beside what fills a placeholder, such as a Resort's
// name or a count.
const NO_BREAK_SPACE = '\u{00A0}';
const typesetters: Record<string, (text: string) => string> = {
    fr: text => text
        .replace(/ ([:;!?»°])/g, `${NO_BREAK_SPACE}$1`)
        .replace(/« /g, `«${NO_BREAK_SPACE}`),
    es: text => text.replace(/ ([°%])/g, `${NO_BREAK_SPACE}$1`),
    ru: text => text.replace(/ ([—°])/g, `${NO_BREAK_SPACE}$1`),
    zh: text => text
        .replace(/(\p{Script=Han})([A-Za-z0-9])/gu, '$1 $2')
        .replace(/([A-Za-z0-9%])(\p{Script=Han})/gu, '$1 $2'),
};

/** Where a visitor's pick is kept. Only a pick is: until there is one, the browser's language decides. */
const LANGUAGE_STORAGE_KEY = 'language';

/**
 * Before French, the browser's language was saved on every first visit under this key.
 * It was never a choice (English was the only one), so it is dropped, not carried over.
 */
const DETECTED_LANGUAGE_STORAGE_KEY = 'languageId';

/** The first of the browser's preferred languages that monkeysnow has, else English */
export function detectBrowserLanguage(): Language {
    if (typeof navigator === 'undefined') return englishLanguage;
    const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const tag of preferred) {
        const language = tag ? getLanguageById(tag.split('-')[0].toLowerCase()) : undefined;
        if (language) return language;
    }
    return englishLanguage;
}

function pickedLanguage(): Language | undefined {
    try {
        const id = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        return id ? getLanguageById(id) : undefined;
    } catch {
        return undefined;
    }
}

let current: Language | undefined;
const listeners = new Set<() => void>();

/** The language the site is shown in: the visitor's pick, else their browser's */
export function getLanguage(): Language {
    current ??= pickedLanguage() ?? detectBrowserLanguage();
    return current;
}

function show(language: Language): void {
    current = language;
    if (typeof document !== 'undefined') document.documentElement.lang = language.htmlLang ?? language.id;
    listeners.forEach(listener => listener());
}

/** Pick a language, remembered in this browser; everything showing switches at once */
export function setLanguage(languageId: string): void {
    const language = getLanguageById(languageId);
    if (!language) return;
    try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, language.id);
    } catch (error) {
        // Storage blocked or full: the pick still applies, for this visit only
        console.warn('Error saving language to localStorage:', error);
    }
    show(language);
}

/** Be told of every change of language, for useSyncExternalStore */
export function subscribeToLanguage(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/** Run once before rendering: drop the old saved browser language and mark the page with the language shown */
export function initLanguage(): void {
    try {
        localStorage.removeItem(DETECTED_LANGUAGE_STORAGE_KEY);
    } catch {
        // Storage blocked: nothing was saved there either
    }
    show(getLanguage());
}

// A pick made in another tab, or cleared there
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event: StorageEvent) => {
        if (event.key !== null && event.key !== LANGUAGE_STORAGE_KEY) return;
        const language = pickedLanguage() ?? detectBrowserLanguage();
        if (language !== current) show(language);
    });
}

interface Translator {
    t: Translate;
    tPlural: TranslatePlural;
}

const translators = new Map<Language, Translator>();

/** One language's t() and tPlural(), the same functions every time, so they can sit in hook dependencies */
export function translatorFor(language: Language): Translator {
    let translator = translators.get(language);
    if (translator) return translator;

    const typeset = typesetters[language.id] ?? ((text: string) => text);
    const pluralRules = new Intl.PluralRules(language.locale);
    const t: Translate = (key, values) => {
        // A key every language has, by its type; English covers one left out at runtime anyway
        const template = language.translations[key] ?? en[key] ?? key;
        return typeset(values ? interpolate(template, values) : template);
    };
    const tPlural: TranslatePlural = (key, count, values) => {
        const form = `${key}.${pluralRules.select(count)}`;
        const formKey = (form in language.translations ? form : `${key}.other`) as TranslationKey;
        return t(formKey, { count, ...values });
    };
    translator = { t, tPlural };
    translators.set(language, translator);
    return translator;
}

/**
 * t() in the current language, for code outside React. Call it when the words are
 * needed, never once when a module loads, and have the component showing them call
 * useLanguage() so it redraws when the language changes.
 */
export const translate: Translate = (key, values) => translatorFor(getLanguage()).t(key, values);

/** tPlural() in the current language, for code outside React (see translate()) */
export const translatePlural: TranslatePlural = (key: PluralKey, count, values) =>
    translatorFor(getLanguage()).tPlural(key, count, values);

/** The BCP 47 tag that dates and times are formatted in: 'en-US' for English, so it reads as it always has */
export function formatLocale(): string {
    return getLanguage().locale;
}

/** A formatter's one method, which hourFormat() keeps */
export type DateFormat = Pick<Intl.DateTimeFormat, 'format'>;

// Intl writes a French hour "14 h" by itself, but a Spanish or Russian one as a bare "14",
// which reads like a stray number after a date: Spanish gets the hour symbol ("14 h", as
// the RAE writes it) added, after a no-break space so the two never part, and Russian the
// minutes a clock shows ("14:00", as Russian forecasts write an hour).
const hourSymbols: Record<string, string> = {
    es: `${NO_BREAK_SPACE}h`,
    ru: ':00',
};

/**
 * An Intl.DateTimeFormat with `options` that show an hour, alone or ending a date, writing
 * the hour the locale's language does: "5 PM", "17 h" in French, "17 h" in Spanish too, and
 * "17:00" in Russian.
 */
export function hourFormat(locale: string, options: Intl.DateTimeFormatOptions): DateFormat {
    const formatter = new Intl.DateTimeFormat(locale, options);
    const symbol = hourSymbols[locale];
    if (!symbol) return formatter;
    return {
        format: (date) => formatter.formatToParts(date)
            .map(part => (part.type === 'hour' ? part.value + symbol : part.value))
            .join(''),
    };
}

const decimalMarks = new Map<string, string>();

/**
 * A number with exactly `digits` decimals, written the language's way: 1.5 in English, 1,5
 * in French. It rounds as toFixed() does, which Intl.NumberFormat doesn't at exact halves
 * (6.05 is 6.0 to one, 6.1 to the other), so English reads as it always has.
 */
export function formatDecimal(value: number, digits = 1): string {
    const locale = formatLocale();
    let mark = decimalMarks.get(locale);
    if (mark === undefined) {
        mark = new Intl.NumberFormat(locale).formatToParts(1.5).find(part => part.type === 'decimal')?.value ?? '.';
        decimalMarks.set(locale, mark);
    }
    const fixed = value.toFixed(digits);
    return mark === '.' ? fixed : fixed.replace('.', mark);
}

// The unit symbols code writes, each with the key its symbol in the language showing is under
const UNIT_KEYS: Record<string, TranslationKey> = {
    cm: 'unit.cm', mm: 'unit.mm', m: 'unit.m', ft: 'unit.ft', in: 'unit.in',
    'km/h': 'unit.kmh', mph: 'unit.mph', 'm/s': 'unit.ms',
    hPa: 'unit.hPa', kPa: 'unit.kPa', inHg: 'unit.inHg', psi: 'unit.psi', min: 'unit.min',
    'J/kg': 'unit.Jkg', 'W/m²': 'unit.Wm2', 'kg/m²': 'unit.kgm2', 'kg/m³': 'unit.kgm3', 'm³/m³': 'unit.m3m3',
};

/**
 * A unit symbol as the language showing writes it: Russian's are Cyrillic (см, км/ч). Any
 * other, such as °C, % or one already translated, comes back as it is.
 */
export function unitSymbol(symbol: string): string {
    const key = UNIT_KEYS[symbol];
    return key ? translate(key) : symbol;
}

/**
 * A number and its unit, as the language showing writes them: "1.5 cm", "1,5 см". `tight`
 * keeps English's "1500m" in a language that writes the symbol as English does; one with a
 * symbol of its own, such as Russian's м, always sets the space ("1500 м").
 */
export function withUnit(value: string | number, symbol: string, tight = false): string {
    const local = unitSymbol(symbol);
    return tight && local === symbol ? `${value}${local}` : `${value} ${local}`;
}

const regionNames = new Map<string, Intl.DisplayNames | null>();

/**
 * A country's name in the current language, from its ISO code. English keeps the name
 * resorts.json gives (OpenSkiData's), as it always has; another language falls back to
 * it where the browser has no name for the code.
 */
export function countryName(code: string, englishName: string): string {
    const { id, locale } = getLanguage();
    if (id === 'en') return englishName;
    let names = regionNames.get(locale);
    if (names === undefined) {
        try {
            names = new Intl.DisplayNames([locale], { type: 'region', fallback: 'none' });
        } catch {
            names = null;
        }
        regionNames.set(locale, names);
    }
    return names?.of(code.toUpperCase()) ?? englishName;
}

/**
 * A Region's name in the current language, where the language names that country's
 * Regions (Chinese does China's and Japan's); otherwise resorts.json's, as OpenSkiData has it.
 */
export function regionName(countryCode: string, name: string): string {
    return getLanguage().regionNames?.[countryCode]?.[name] ?? name;
}
