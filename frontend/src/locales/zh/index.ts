import type { Translations } from '../../types/i18n';
import { common } from './common';
import { main } from './main';
import { settings } from './settings';
import { commands } from './commands';
import { detail } from './detail';
import { charts } from './charts';
import { map } from './map';
import { pages } from './pages';

export { regions } from './regions';

/** Simplified Chinese: 你, full-width punctuation, a space beside Latin letters and numbers (see CONTRIBUTING.md's glossary) */
export const zh: Translations = {
    ...common,
    ...main,
    ...settings,
    ...commands,
    ...detail,
    ...charts,
    ...map,
    ...pages,
};
