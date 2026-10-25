import { describe, expect, it, vi } from 'vitest';
import { getLanguageById, setLanguage, translatorFor, unitSymbol, withUnit } from '.';

const russian = translatorFor(getLanguageById('ru')!);
const NO_BREAK_SPACE = '\u{00A0}';

describe('Russian', () => {
    it('picks among its plural forms by how the number ends', () => {
        expect([1, 2, 5, 11, 21, 22, 25].map((n) => russian.tPlural('command.days', n))).toEqual([
            '1 день', '2 дня', '5 дней', '11 дней', '21 день', '22 дня', '25 дней',
        ]);
    });

    it('keeps a dash and a degree sign on the line of the word before them', () => {
        expect(russian.t('fetchStatus.limitReachedTomorrow', { count: 5, things: 'курортов' }))
            .toBe(`Лимит исчерпан · 5 курортов${NO_BREAK_SPACE}— загрузка завтра`);
        expect(russian.t('chart.freezingLevelHeight.description')).toBe(`Высота уровня 0${NO_BREAK_SPACE}°C над уровнем моря`);
    });

    it('writes units in Cyrillic, spaced from the number even where English writes them tight', () => {
        // setLanguage() warns that it can't save the pick, as Node has no localStorage
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            expect([unitSymbol('km/h'), withUnit(1500, 'm', true), withUnit('1,5', 'cm')]).toEqual(['km/h', '1500m', '1,5 cm']);
            setLanguage('ru');
            expect([unitSymbol('km/h'), withUnit(1500, 'm', true), withUnit('1,5', 'cm')]).toEqual(['км/ч', '1500 м', '1,5 см']);
            expect(unitSymbol('%')).toBe('%');
        } finally {
            setLanguage('en');
            warn.mockRestore();
        }
    });
});
