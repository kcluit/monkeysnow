import { common } from './common';
import { main } from './main';
import { settings } from './settings';
import { commands } from './commands';
import { detail } from './detail';
import { charts } from './charts';
import { map } from './map';
import { pages } from './pages';

/**
 * English, the source of every UI string. One file per part of the site; a key added
 * to any of them is required in every other language, which TypeScript checks.
 */
export const en = {
    ...common,
    ...main,
    ...settings,
    ...commands,
    ...detail,
    ...charts,
    ...map,
    ...pages,
};
