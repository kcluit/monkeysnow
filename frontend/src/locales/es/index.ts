import type { Translations } from '../../types/i18n';
import { common } from './common';
import { main } from './main';
import { settings } from './settings';
import { commands } from './commands';
import { detail } from './detail';
import { charts } from './charts';
import { map } from './map';
import { pages } from './pages';

/** Spanish: tú, in words that read naturally in both Spain and Latin America (see CONTRIBUTING.md's glossary) */
export const es: Translations = {
    ...common,
    ...main,
    ...settings,
    ...commands,
    ...detail,
    ...charts,
    ...map,
    ...pages,
};
