# Contributing Translations

Thank you for helping translate MonkeySnow! This guide explains how to add a new language to the application.

## Quick Start

1. Copy `en.ts` to a new file with your language code (e.g., `fr.ts` for French, `zh.ts` for Chinese)
2. Translate all the values (not the keys!) in your new file
3. Register your language in `index.ts`
4. Submit a pull request

## Step-by-Step Guide

### 1. Create Your Language File

Copy `en.ts` and rename it using the [ISO 639-1 language code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes):

- `fr.ts` - French
- `de.ts` - German
- `es.ts` - Spanish
- `zh.ts` - Chinese (Simplified)
- `ja.ts` - Japanese
- `ko.ts` - Korean

### 2. Translate the Strings

Open your new file and translate each value. For example:

```typescript
// en.ts (original)
'common.loading': 'Loading...',
'utilityBar.baseForecast': 'Base Forecast',

// fr.ts (French translation)
'common.loading': 'Chargement...',
'utilityBar.baseForecast': 'Prévisions de base',
```

**Important:**
- Only translate the **values** (right side), never change the **keys** (left side)
- Keep placeholders like `°C`, `°F`, `km/h` as appropriate for your locale
- Resort names should NOT be translated - they are proper nouns

### 3. Register Your Language

Open `index.ts` and add your language:

```typescript
import { en } from './en';
import { fr } from './fr';  // Add this import
import type { Language, Translations } from '../types/i18n';

const englishLanguage: Language = {
    id: 'en',
    name: 'English',
    nativeName: 'English',
    translations: en,
};

// Add this block
const frenchLanguage: Language = {
    id: 'fr',
    name: 'French',
    nativeName: 'Français',
    translations: fr,
};

export const languages: Language[] = [
    englishLanguage,
    frenchLanguage,  // Add to the array
];
```

### 4. Verify Your Translation

TypeScript will automatically check that your translation file has all required keys. If you see type errors, it means you're missing some translations.

Run the dev server to test:

```bash
npm run dev
```

Then:
1. Open the app in your browser
2. Press `Escape` or `Tab` to open the command palette
3. Search for "Language" and select your new language
4. Verify the UI displays correctly

### 5. Submit a Pull Request

Once everything looks good:
1. Commit your changes
2. Push to your fork
3. Open a pull request with the title: `Add [Language Name] translation`

## Translation Guidelines

### Be Natural

Translate for meaning, not word-for-word. The translation should sound natural to native speakers.

### Context Matters

Some strings are used in specific UI contexts:
- **Commands** appear in the command palette (accessed via Escape/Tab)
- **UtilityBar** strings appear in dropdown menus
- **Card** strings appear on weather forecast cards

### Keep Consistency

Use consistent terminology throughout. For example, if you translate "forecast" as "prévisions" in one place, use the same term everywhere.

### Units

The `units.metric` and `units.imperial` strings show unit examples. Adapt these to be clear in your language:

```typescript
// French example
'units.metric': 'Métrique (°C, cm, km/h)',
'units.imperial': 'Impérial (°F, po, mph)',
```

## Questions?

If you have questions about translating specific strings or need context, please open an issue on GitHub before starting your translation.

Thank you for contributing! 🎿❄️
