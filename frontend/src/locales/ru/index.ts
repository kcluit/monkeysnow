import type { Translations } from '../../types/i18n';
import { common } from './common';
import { main } from './main';
import { settings } from './settings';
import { commands } from './commands';
import { detail } from './detail';
import { charts } from './charts';
import { map } from './map';
import { pages } from './pages';

/** Russian: lowercase вы, infinitive buttons, and every plural key's few and many forms too (see CONTRIBUTING.md's glossary) */
export const ru: Translations = {
    ...common,
    ...main,
    ...settings,
    ...commands,
    ...detail,
    ...charts,
    ...map,
    ...pages,
};
