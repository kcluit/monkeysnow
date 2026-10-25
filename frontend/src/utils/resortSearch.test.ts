import { describe, expect, it } from 'vitest';
import { countryNamesInEveryLanguage, matchesSearchWords, normalizeForSearch, regionNamesInEveryLanguage, toSearchWords } from './resortSearch';

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

    it('finds a country, and a Region a language names, by its Chinese name', () => {
        const niseko = normalizeForSearch([
            'Niseko United',
            ...countryNamesInEveryLanguage('JP', 'Japan'),
            ...regionNamesInEveryLanguage('JP', 'Hokkaido Prefecture'),
        ].join(' '));
        expect(matchesSearchWords(niseko, toSearchWords('日本'))).toBe(true);
        expect(matchesSearchWords(niseko, toSearchWords('北海道'))).toBe(true);
        expect(matchesSearchWords(niseko, toSearchWords('Hokkaido niseko'))).toBe(true);
        expect(matchesSearchWords(niseko, toSearchWords('长野县'))).toBe(false);
    });

    it('leaves a Region no language names with its own name only', () => {
        expect(regionNamesInEveryLanguage('AT', 'Tyrol')).toEqual(['Tyrol']);
    });
});
