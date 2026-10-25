import { describe, expect, it } from 'vitest';
import { countryNamesInEveryLanguage, matchesSearchWords, normalizeForSearch, toSearchWords } from './resortSearch';

describe('the resort picker\'s search', () => {
    // As the picker builds it: a Resort's name, then its country's names in every language
    const verbier = normalizeForSearch(['Verbier', ...countryNamesInEveryLanguage('CH', 'Switzerland')].join(' '));

    it('finds a country by its name in any language monkeysnow has, whichever is showing', () => {
        expect(matchesSearchWords(verbier, toSearchWords('Switzerland'))).toBe(true);
        expect(matchesSearchWords(verbier, toSearchWords('suisse verbier'))).toBe(true);
        expect(matchesSearchWords(verbier, toSearchWords('Österreich'))).toBe(false);
    });

    it('matches a French name without its accents', () => {
        const unitedStates = normalizeForSearch(countryNamesInEveryLanguage('US', 'United States').join(' '));
        expect(matchesSearchWords(unitedStates, toSearchWords('etats-unis'))).toBe(true);
    });
});
