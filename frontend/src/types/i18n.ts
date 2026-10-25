import type { en } from '../locales/en';

/**
 * Every translatable UI string, keyed by a namespaced id. The English file
 * (`locales/en`) is the source: a key added there is required in every other language.
 */
export type Translations = { [K in keyof typeof en]: string };

/**
 * Type-safe translation key.
 * Using this type ensures only valid keys can be passed to t().
 */
export type TranslationKey = keyof Translations;

/** A key whose plural forms are `<key>.one` and `<key>.other`, for tPlural() */
export type PluralKey = {
    [K in TranslationKey]: K extends `${infer Base}.other` ? (`${Base}.one` extends TranslationKey ? Base : never) : never
}[TranslationKey];

/** The plural forms a language's rule picks from (Intl.PluralRules), beyond English's one and other */
export type ExtraPluralForm = 'zero' | 'two' | 'few' | 'many';

/**
 * One area's strings in another language: the same keys as the English area, every one
 * translated, plus each plural key's `Extra` forms where its rule has more than English's
 * (Russian's few and many: 2 курорта, 5 курортов)
 */
export type Translated<T, Extra extends ExtraPluralForm = never> = { [K in keyof T]: string } & {
    [K in keyof T as K extends `${infer Base}.other` ? `${Base}.${Extra}` : never]: string
};

/** The scripts monkeysnow's languages are written in, which a font may or may not have letters for */
export type Script = 'latin' | 'cyrillic' | 'han';

/** Values for a string's `{placeholders}` */
export type TranslationValues = Record<string, string | number>;

/** Look up a string in the current language, filling its `{placeholders}` */
export type Translate = (key: TranslationKey, values?: TranslationValues) => string;

/** Look up `<key>.one`, `<key>.other` or another form the language has, by its plural rule for `count`; `{count}` is filled in */
export type TranslatePlural = (key: PluralKey, count: number, values?: TranslationValues) => string;

/**
 * Language definition with metadata and translations.
 */
export interface Language {
    /** Unique identifier (e.g., 'en', 'fr', 'zh') */
    id: string;
    /** English name (e.g., 'French') */
    name: string;
    /** Native name (e.g., 'Français'), what the language pickers show */
    nativeName: string;
    /** BCP 47 tag that dates, times and numbers are formatted in (e.g., 'en-US', 'fr') */
    locale: string;
    /**
     * The page's lang attribute, where it isn't the id: 'zh-Hans', so that a browser
     * with no Chinese font named draws the Simplified Chinese forms, not Japanese ones
     */
    htmlLang?: string;
    /** The alphabet it is written in, which the font pickers check each font for */
    script: Script;
    /** All translated strings */
    translations: Translations;
    /**
     * Regions named in this language, by country code and then by resorts.json's name;
     * every other Region keeps resorts.json's name
     */
    regionNames?: Record<string, Record<string, string>>;
}

/**
 * Return type for the useLanguage hook.
 */
export interface UseLanguageReturn {
    /** Current language */
    language: Language;
    /** Pick a language by ID, remembered in this browser */
    setLanguage: (languageId: string) => void;
    /** Translation function - returns translated string for key */
    t: Translate;
    /** Plural-aware translation function */
    tPlural: TranslatePlural;
    /** All available languages */
    availableLanguages: Language[];
}
