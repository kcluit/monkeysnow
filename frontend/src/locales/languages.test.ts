import { describe, expect, it, vi } from 'vitest';
import resortData from '../data/resorts/resorts.json';
import { languages, regionName, setLanguage, translate } from '.';

const resorts = Object.values(resortData.resorts as unknown as Record<string, { country: string; region?: string }>);

/** The Regions resorts.json groups a country's Resorts by */
function regionsOf(country: string): Set<string> {
    return new Set(resorts.flatMap(resort => resort.country === country && resort.region ? [resort.region] : []));
}

describe('a language that names Regions', () => {
    for (const language of languages) {
        for (const [country, names] of Object.entries(language.regionNames ?? {})) {
            it(`names every one of ${country}'s Regions in ${language.name}, and only those`, () => {
                expect(Object.keys(names).sort()).toEqual([...regionsOf(country)].sort());
            });
        }
    }
});

describe('Chinese', () => {
    it('sets a space between a character and what fills a placeholder in Latin letters or numbers, and names Regions', () => {
        // setLanguage() warns that it can't save the pick, as Node has no localStorage
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            setLanguage('zh');
            expect(translate('savedLocation.near', { resort: 'Niseko' })).toBe('Niseko 附近');
            expect(translate('savedLocation.near', { resort: '八达岭滑雪场' })).toBe('八达岭滑雪场附近');
            expect(translate('app.meta.resortTitle', { name: 'Hakuba 47' })).toBe('Hakuba 47 降雪预报 — monkeysnow');
            expect(translate('fetchStatus.limitReached', { count: 3, things: '滑雪场', eta: '约 2 分钟' }))
                .toBe('已达上限 · 3 个滑雪场将在约 2 分钟后加载');
            expect(regionName('JP', 'Hokkaido Prefecture')).toBe('北海道');
            expect(regionName('AT', 'Tyrol')).toBe('Tyrol');
            setLanguage('en');
            expect(translate('savedLocation.near', { resort: 'Niseko' })).toBe('Near Niseko');
            expect(regionName('JP', 'Hokkaido Prefecture')).toBe('Hokkaido Prefecture');
        } finally {
            setLanguage('en');
            warn.mockRestore();
        }
    });
});
