import { describe, expect, it, vi } from 'vitest';

// cardModels.ts and savedLocations.ts listen for other tabs' storage changes as they load
vi.hoisted(() => {
    (globalThis as { window?: unknown }).window ??= { addEventListener: () => {} };
});

import { historyFetchDays, lastDaysOf } from './resortForecast';
import { historySortDayWithin } from './sortDayHelpers';
import { callWeight } from './openMeteoBudget';
import { calculateSnowTotals, daysFromToday } from './weather';
import { lastDaysOfHistory } from './openMeteoClient';
import type { DayData, DayForecast, ElevationForecast, HourlyForecast, ProcessedResortData, ResortData } from '../types';
import type { HourlyDataPoint, WeatherModel } from '../types/openMeteo';

const HOUR = 3600;
const at = (iso: string): number => Date.parse(iso) / 1000;

/** A band whose hours start at `start` and run `hours` long, one forecast day per date */
function band(dates: string[], start: number, hours: number): ElevationForecast {
    const series = (): Float32Array => Float32Array.from({ length: hours }, (_, i) => i);
    const forecastHours: HourlyForecast = {
        start,
        interval: HOUR,
        temperature: series(),
        snowfall: series(),
        wetBulb: series(),
        precipitation: series(),
        windSpeed: series(),
        windDirection: series(),
        weatherCode: new Uint8Array(hours),
    };
    return {
        metadata: { elevation: 2000, lat: 46, lon: 7 },
        forecast: Object.fromEntries(dates.map(date => [date, {} as DayData])),
        hours: forecastHours,
    };
}

function history(dates: string[], start: number, hours: number, timeZone: string): ResortData {
    return { bot: band(dates, start, hours), mid: band(dates, start, hours), top: band(dates, start, hours), timeZone, historyDays: dates.length };
}

describe('lastDaysOf', () => {
    it('keeps the last days, their hours from the first one\'s local midnight', () => {
        // Zurich is UTC+2 in summer time: 10 October starts at 22:00 UTC the day before
        const data = history(['2026-10-10', '2026-10-11', '2026-10-12'], at('2026-10-09T22:00Z'), 60, 'Europe/Zurich');
        const cut = lastDaysOf(data, 2);
        expect(Object.keys(cut.mid.forecast)).toEqual(['2026-10-11', '2026-10-12']);
        expect(cut.mid.hours!.start).toBe(at('2026-10-10T22:00Z'));
        expect(cut.mid.hours!.temperature.length).toBe(36);
        expect(cut.mid.hours!.temperature[0]).toBe(24);
        expect(cut.mid.hours!.weatherCode!.length).toBe(36);
    });

    it('finds local midnight across a daylight-saving switch', () => {
        // Zurich leaves summer time at 03:00 on 25 October 2026, so the 25th has 25 hours
        const data = history(['2026-10-24', '2026-10-25', '2026-10-26'], at('2026-10-23T22:00Z'), 70, 'Europe/Zurich');
        const cut = lastDaysOf(data, 1);
        expect(cut.bot.hours!.start).toBe(at('2026-10-25T23:00Z'));
        expect(cut.bot.hours!.temperature[0]).toBe(49);
    });

    it('works west of Greenwich, where local midnight is the same day in UTC', () => {
        const data = history(['2026-10-10', '2026-10-11'], at('2026-10-10T07:00Z'), 40, 'America/Vancouver');
        expect(lastDaysOf(data, 1).top.hours!.start).toBe(at('2026-10-11T07:00Z'));
    });

    it('leaves History with no more days than asked for as it is', () => {
        const data = history(['2026-10-10', '2026-10-11'], at('2026-10-09T15:00Z'), 40, 'Asia/Tokyo');
        const cut = lastDaysOf(data, 14);
        expect(cut.mid).toBe(data.mid);
    });
});

/** A Detailed view model's hours from `start` (epoch seconds), `hours` long */
function modelHours(start: number, hours: number): HourlyDataPoint[] {
    return Array.from({ length: hours }, (_, i) => {
        const timestamp = (start + i * HOUR) * 1000;
        return { time: new Date(timestamp), timestamp, temperature_2m: i };
    });
}

describe('lastDaysOfHistory', () => {
    it('cuts every model at the same local midnight across a daylight-saving switch', () => {
        // Zurich leaves summer time on 25 October 2026: the 25th starts at 22:00 UTC the day before, the 26th at 23:00 UTC
        const data = new Map<WeatherModel, HourlyDataPoint[]>([
            ['ecmwf_ifs', modelHours(at('2026-10-23T22:00Z'), 70)],
            // One hour short, which still starts from the same midnight
            ['ncep_gfs_seamless', modelHours(at('2026-10-23T22:00Z'), 69)],
        ]);
        const twoDays = lastDaysOfHistory(data, 2, 'Europe/Zurich');
        expect(twoDays.get('ecmwf_ifs')![0].timestamp).toBe(at('2026-10-24T22:00Z') * 1000);
        expect(twoDays.get('ecmwf_ifs')!.length).toBe(46);
        expect(twoDays.get('ncep_gfs_seamless')![0].temperature_2m).toBe(24);
        expect(lastDaysOfHistory(data, 1, 'Europe/Zurich').get('ecmwf_ifs')![0].timestamp).toBe(at('2026-10-25T23:00Z') * 1000);
    });

    it('leaves History with no more days than the History length as it is', () => {
        const data = new Map<WeatherModel, HourlyDataPoint[]>([['ecmwf_ifs', modelHours(at('2026-10-23T22:00Z'), 70)]]);
        expect(lastDaysOfHistory(data, 3, 'Europe/Zurich')).toBe(data);
        expect(lastDaysOfHistory(data, 7, 'Europe/Zurich')).toBe(data);
    });
});

describe('historyFetchDays', () => {
    it('fetches 14 days for every History length up to 14, which costs no more', () => {
        expect([3, 7, 14].map(historyFetchDays)).toEqual([14, 14, 14]);
        expect(historyFetchDays(30)).toBe(30);
    });
});

describe('callWeight', () => {
    it('counts past days with the days ahead', () => {
        expect(callWeight({ latitude: [1, 2, 3], hourly: ['a'], past_days: 13, forecast_days: 1 })).toBe(3);
        expect(callWeight({ latitude: 1, hourly: ['a'], past_days: 29, forecast_days: 1 })).toBeCloseTo(30 / 14);
    });
});

describe('historySortDayWithin', () => {
    it('keeps a sort day the History length offers', () => {
        expect(historySortDayWithin('next3days', 3)).toBe('next3days');
        expect(historySortDayWithin('next7days', 7)).toBe('next7days');
        expect(historySortDayWithin('allDays', 14)).toBe('allDays');
        expect(historySortDayWithin(2, 3)).toBe(2);
    });

    it('falls back to the latest 3 days for one it doesn\'t', () => {
        expect(historySortDayWithin('next7days', 3)).toBe('next3days');
        expect(historySortDayWithin('allDays', 7)).toBe('next3days');
        expect(historySortDayWithin(3, 3)).toBe('next3days');
    });
});

describe('History\'s days', () => {
    const day = (snowCm: number): DayForecast => ({ periods: [{ snowCm }] } as unknown as DayForecast);
    const resort = (isHistory: boolean): ProcessedResortData => ({
        id: 'x', name: 'x', elevation: '', model: '', isHistory,
        // Oldest first for History, today first for the forecast
        days: [1, 2, 4, 8, 16, 32, 64, 128].map(day),
    });

    it('count from today back', () => {
        expect(daysFromToday(resort(true))[0]).toEqual(day(128));
        expect(daysFromToday(resort(false))[0]).toEqual(day(1));
    });

    it('total the latest days', () => {
        expect(calculateSnowTotals(resort(true))).toEqual({ threeDays: 224, sevenDays: 254 });
        expect(calculateSnowTotals(resort(false))).toEqual({ threeDays: 7, sevenDays: 127 });
    });
});
