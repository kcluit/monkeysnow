import { describe, expect, it, vi } from 'vitest';
import { buildTimeAxis } from './timeAxis';
import { GraphTimeAxis } from '../components/graph/graphTimeAxis';
import { setLanguage } from '../locales';

const NO_BREAK_SPACE = '\u{00A0}';
const HOUR_MS = 3_600_000;

describe('an hour on the time axes', () => {
    // 1 PM to 3 PM UTC on Saturday 24 October 2026
    const start = Date.UTC(2026, 9, 24, 13);

    it('reads "14 h" in Spanish, as French does, and "14:00" in Russian, where Intl writes a bare "14"', () => {
        // setLanguage() warns that it can't save the pick, as Node has no localStorage
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const axis = buildTimeAxis(start, start + 2 * HOUR_MS, 'UTC');
        try {
            expect([axis.labels[1], axis.tooltipLabels[1]]).toEqual(['2 PM', 'Sat, Oct 24, 2 PM']);
            setLanguage('fr');
            expect([axis.labels[1], axis.tooltipLabels[1]]).toEqual(['14 h', 'sam. 24 oct., 14 h']);
            setLanguage('es');
            expect([axis.labels[1], axis.tooltipLabels[1]]).toEqual([`14${NO_BREAK_SPACE}h`, `sáb, 24 oct, 14${NO_BREAK_SPACE}h`]);
            setLanguage('ru');
            expect([axis.labels[1], axis.tooltipLabels[1]]).toEqual(['14:00', 'сб, 24 окт., 14:00']);
        } finally {
            setLanguage('en');
            warn.mockRestore();
        }
    });

    it('names a Graph\'s hour by where it starts and ends, the "h" once', () => {
        const t = start / 1000;
        const graph = (locale: string) => new GraphTimeAxis(t, t + 7200, t, 'UTC', locale).hourBefore(t + 7200);
        expect(graph('fr')).toBe('sam. 24 oct., 14 – 15 h');
        expect(graph('es')).toBe(`sáb, 24 oct, 14 – 15${NO_BREAK_SPACE}h`);
        expect(graph('ru')).toBe('сб, 24 окт., 14:00 – 15:00');
    });
});
