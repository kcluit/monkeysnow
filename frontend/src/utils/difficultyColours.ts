/**
 * Difficulty colours: what colour a downhill Run is drawn in on the Ski map.
 *
 * OpenStreetMap tags difficulty as a word (piste:difficulty), not a colour, and the
 * same word means different colours in different places: an intermediate Run is blue
 * in Canada and red in France. So the colours follow the convention of the Resort's
 * country, the way its own trail map does.
 */

import { continentOfCountry } from '../data/resortLocations';

/** Which colour a Run is, which the Ski map names as a skier would say it, e.g. "blue run" or "double black run" */
export type DifficultyName = 'green' | 'blue' | 'red' | 'black' | 'doubleBlack' | 'freeride' | 'ungraded';

export interface DifficultyColour {
    colour: string;
    name: DifficultyName;
    /** Off-piste and freeride routes are dashed, as on European trail maps */
    dashed?: boolean;
}

export type DifficultyConvention = 'northAmerica' | 'europe' | 'japan';

const GREEN: DifficultyColour = { colour: '#16a34a', name: 'green' };
const BLUE: DifficultyColour = { colour: '#2563eb', name: 'blue' };
const RED: DifficultyColour = { colour: '#dc2626', name: 'red' };
const BLACK: DifficultyColour = { colour: '#111111', name: 'black' };
const DOUBLE_BLACK: DifficultyColour = { colour: '#111111', name: 'doubleBlack' };
const FREERIDE: DifficultyColour = { colour: '#f59e0b', name: 'freeride', dashed: true };
const UNGRADED: DifficultyColour = { colour: '#6b7280', name: 'ungraded' };

const CONVENTIONS: Record<DifficultyConvention, Record<string, DifficultyColour>> = {
    // Also Australia, New Zealand, South America and anywhere without a convention of its own
    northAmerica: {
        novice: GREEN, easy: GREEN, intermediate: BLUE, advanced: BLACK, expert: DOUBLE_BLACK,
        freeride: FREERIDE, extreme: FREERIDE,
    },
    // France and Spain mark novice Runs green; elsewhere in Europe the easiest are blue
    europe: {
        novice: GREEN, easy: BLUE, intermediate: RED, advanced: BLACK, expert: BLACK,
        freeride: FREERIDE, extreme: FREERIDE,
    },
    japan: {
        novice: GREEN, easy: GREEN, intermediate: RED, advanced: BLACK, expert: BLACK,
        freeride: FREERIDE, extreme: FREERIDE,
    },
};

/** The convention of a country, by its ISO code, e.g. "FR" -> europe. */
export function difficultyConvention(country: string | undefined): DifficultyConvention {
    if (country === 'JP') return 'japan';
    if (country && continentOfCountry(country) === 'Europe') return 'europe';
    return 'northAmerica';
}

/** The colour of a downhill Run with this piste:difficulty, or grey when it has none we know. */
export function difficultyColour(difficulty: string | undefined, convention: DifficultyConvention): DifficultyColour {
    return (difficulty && CONVENTIONS[convention][difficulty]) || UNGRADED;
}
