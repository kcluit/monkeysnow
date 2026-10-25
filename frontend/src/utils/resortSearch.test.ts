import { describe, expect, it } from 'vitest';
import { countryNamesInEveryLanguage, matchesSearchWords, normalizeForSearch, toSearchWords } from './resortSearch';

describe('the resort picker\'s search', () => {
    // As the picker builds it: a Resort's name, then its country's names in every language
    const verbier = normalizeForSearch(['Verbier', ...countryNamesInEveryLanguage('CH', 'Switzerland')].join(' '));

    it('finds a country by its name in any language monkeysnow has, whichever is showing', () => {
        expect(matchesSearchWords(verbier, toSearchWords('Switzerland'))).toBe(true);
        expect(matchesSearchWords(verbier, toSearchWords('suisse verbier'))).toBe(true);
        expect(matchesSearchWords(verbier, toSearchWords('Suiza'))).toBe(true);
        expect(matchesSearchWords(verbier, toSearchWords('Österreich'))).toBe(false);
    });

    it('matches a French or Spanish name without its accents', () => {
        const unitedStates = normalizeForSearch(countryNamesInEveryLanguage('US', 'United States').join(' '));
        expect(matchesSearchWords(unitedStates, toSearchWords('etats-unis'))).toBe(true);
        const spain = normalizeForSearch(countryNamesInEveryLanguage('ES', 'Spain').join(' '));
        expect(matchesSearchWords(spain, toSearchWords('espana'))).toBe(true);
    });

    it('finds a Resort and its country in Cyrillic, by its Russian name in resorts.json', () => {
        const arhyz = normalizeForSearch(['Arhyz', 'Архыз', ...countryNamesInEveryLanguage('RU', 'Russia')].join(' '));
        expect(matchesSearchWords(arhyz, toSearchWords('Архыз'))).toBe(true);
        expect(matchesSearchWords(arhyz, toSearchWords('россия архыз'))).toBe(true);
        expect(matchesSearchWords(verbier, toSearchWords('Швейцария'))).toBe(true);
    });

    it('finds ё by е, as Russians often type it', () => {
        expect(matchesSearchWords(normalizeForSearch('Озёрный'), toSearchWords('озерный'))).toBe(true);
    });
});
