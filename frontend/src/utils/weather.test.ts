import { describe, expect, it, vi } from 'vitest';

// cardModels.ts and savedLocations.ts listen for other tabs' storage changes as they load
vi.hoisted(() => {
    (globalThis as { window?: unknown }).window ??= { addEventListener: () => {} };
});

import { processResortData } from './weather';
import { SNOW_CAUTIONS } from './snowQuality';
import type { AllWeatherData, DayData, ElevationForecast, PeriodData, PeriodEstimate, SnowCaution, SnowfallEstimateMode } from '../types';

/** A Period that 4 mm fell in, the model making 3 cm of snow of it */
function period(estimates: Partial<PeriodData>): PeriodData {
    return {
        temperature_max: 1, temperature_min: -1, temperature_avg: 0, temperature_median: 0,
        wind_speed: 10, wind_direction: 270, relative_humidity: 95,
        precipitation_total: 4, rain_total: 0, snowfall_total: 3,
        weather_code: 73, surface_pressure: 800, freezing_level: 1800,
        ...estimates,
    };
}

/** All 4 mm under one Snow quality, as snow or as rain */
const ESTIMATES: Record<SnowCaution, PeriodEstimate> = {
    extraCautious: { snowfall_estimate: 0, rain_estimate: 4, precipitation_by_quality: [4, 0, 0, 0, 0], snow_quality: 'rain' },
    cautious: { snowfall_estimate: 1.6, rain_estimate: 2, precipitation_by_quality: [0, 4, 0, 0, 0], snow_quality: 'sleet/mix' },
    realistic: { snowfall_estimate: 3.2, rain_estimate: 0, precipitation_by_quality: [0, 0, 4, 0, 0], snow_quality: 'wet_snow' },
};

function weatherOf(data: PeriodData): AllWeatherData {
    const day: DayData = { AM: data, PM: null, NIGHT: null };
    const band: ElevationForecast = { metadata: { elevation: 2000, lat: 46, lon: 7 }, forecast: { '2026-10-24': day } };
    return { updatedAt: '', data: { test: { bot: band, mid: band, top: band, model: 'ecmwf_ifs' } } };
}

const amPeriodOf = (data: PeriodData, mode: SnowfallEstimateMode, caution: SnowCaution) =>
    processResortData(weatherOf(data), 'test', 'mid', 'max', mode, 'metric', caution)!.days[0];

describe('a card under each Snow caution', () => {
    it('shows that caution\'s monkeysnow estimate and Snow quality', () => {
        const data = period({ estimates: ESTIMATES });
        for (const caution of SNOW_CAUTIONS) {
            const day = amPeriodOf(data, 'totalPrecip', caution);
            expect(day.periods[0].snowCm).toBe(ESTIMATES[caution].snowfall_estimate);
            expect(day.periods[0].rainMm).toBe(ESTIMATES[caution].rain_estimate);
            expect(day.periods[0].snowQuality).toBe(ESTIMATES[caution].snow_quality);
        }
        expect(amPeriodOf(data, 'totalPrecip', 'realistic').snowCondition.text).toBe('Wet Snow');
        expect(amPeriodOf(data, 'totalPrecip', 'extraCautious').snowCondition.text).toBe('Rain');
    });

    it('keeps the Model estimate\'s amounts but takes the caution\'s Snow quality, a Rain Period the model gives snow being a mix', () => {
        const data = period({ estimates: ESTIMATES });
        const realistic = amPeriodOf(data, 'model', 'realistic').periods[0];
        expect(realistic.snowCm).toBe(3);
        expect(realistic.snowQuality).toBe('wet_snow');
        const extraCautious = amPeriodOf(data, 'model', 'extraCautious');
        expect(extraCautious.periods[0].snowCm).toBe(3);
        expect(extraCautious.periods[0].snowQuality).toBe('sleet/mix');
        expect(extraCautious.snowCondition.text).toBe('Sleet/Mix');
    });

    it('shows a forecast cached before there were three cautions as it was under every caution, until it is refetched', () => {
        const old = period({ snowfall_estimate: 1.6, rain_estimate: 2, precipitation_by_quality: [0, 4, 0, 0, 0], snow_quality: 'sleet/mix' });
        for (const caution of SNOW_CAUTIONS) {
            const day = amPeriodOf(old, 'totalPrecip', caution);
            expect(day.periods[0].snowCm).toBe(1.6);
            expect(day.periods[0].snowQuality).toBe('sleet/mix');
            expect(day.snowCondition.text).toBe('Sleet/Mix');
        }
    });

    it('counts all of an older forecast\'s precipitation under its label where it has no tally by Snow quality', () => {
        const older = period({ snowfall_estimate: 3, snow_quality: 'dry_snow' });
        expect(amPeriodOf(older, 'totalPrecip', 'cautious').snowCondition.text).toBe('Dry Snow');
    });
});
