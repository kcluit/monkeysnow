import type { Translations } from '../../types/i18n';
import { common } from './common';
import { main } from './main';
import { settings } from './settings';
import { commands } from './commands';
import { detail } from './detail';
import { charts } from './charts';
import { map } from './map';
import { pages } from './pages';

/** French: vous, in words that read naturally in both France and Quebec (see CONTRIBUTING.md's glossary) */
export const fr: Translations = {
    ...common,
    ...main,
    ...settings,
    ...commands,
    ...detail,
    ...charts,
    ...map,
    ...pages,
};
