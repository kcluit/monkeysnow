/**
 * What one Graph draws, in the visitor's units: each hour's precipitation as a bar in
 * its Snow quality colour, the temperature at the picked Elevation band, and the
 * Freezing level against the heights being forecast.
 */

import { SNOW_QUALITIES } from '../../utils/resortForecast';
import type { ElevationLevel, ResortData, SnowfallEstimateMode, SnowQuality, UnitSystem } from '../../types';

const CM_TO_INCHES = 0.393701;
const MM_TO_INCHES = 0.0393701;
const M_TO_FT = 3.28084;

/** A dashed line at one of the heights being forecast */
export interface HeightLine {
    label: string;
    /** In m or ft */
    height: number;
    /** The picked Elevation band's, drawn bold */
    picked: boolean;
}

export interface GraphData {
    /** Epoch seconds of each hour; precipitation at an hour fell in the hour before it */
    times: number[];
    /** One series per Snow quality, in SNOW_QUALITIES order: each hour's amount where it is that quality */
    bars: (number | null)[][];
    /** Each hour's amount, snow in cm or in, rain in mm or in, and what it is */
    amounts: number[];
    qualities: (SnowQuality | null)[];
    isSnow: boolean[];
    /** °C or °F */
    temperature: (number | null)[];
    /** m or ft; all null where the forecast has none */
    freezingLevel: (number | null)[];
    heightLines: HeightLine[];
    lat: number;
    lon: number;
    timeZone?: string;
}

/** The precipitation axis reaches at least this, so drizzle looks small on every Graph: about 2 cm or 2 mm an hour */
export function precipitationFloor(units: UnitSystem): number {
    return units === 'imperial' ? 0.8 : 2;
}

const BAND_NAMES: Record<ElevationLevel, string> = { bot: 'Base', mid: 'Mid', top: 'Top' };

/** A Graph's data, or null for a forecast cached before hours were kept. */
export function graphDataOf(
    data: ResortData,
    elevation: ElevationLevel,
    snowfallMode: SnowfallEstimateMode,
    units: UnitSystem
): GraphData | null {
    const band = data[elevation];
    const hours = band.hours;
    if (!hours) return null;

    const imperial = units === 'imperial';
    const length = hours.temperature.length;
    const result: GraphData = {
        times: [],
        bars: SNOW_QUALITIES.map(() => []),
        amounts: [],
        qualities: [],
        isSnow: [],
        temperature: [],
        freezingLevel: [],
        heightLines: heightLinesOf(data, elevation, units),
        lat: band.metadata.lat,
        lon: band.metadata.lon,
        timeZone: data.timeZone,
    };

    const freezing = data.freezingLevel;
    for (let i = 0; i < length; i++) {
        const time = hours.start + i * hours.interval;
        result.times.push(time);

        const temperature = hours.temperature[i];
        result.temperature.push(Number.isFinite(temperature) ? (imperial ? (temperature * 9) / 5 + 32 : temperature) : null);

        const j = freezing ? Math.round((time - freezing.start) / freezing.interval) : -1;
        const level = freezing && j >= 0 && j < freezing.values.length ? freezing.values[j] : NaN;
        result.freezingLevel.push(Number.isFinite(level) ? (imperial ? level * M_TO_FT : level) : null);

        // Snow or rain, decided as the cards decide a Period's
        let quality: SnowQuality | null = hours.quality[i] >= 0 ? SNOW_QUALITIES[hours.quality[i]] : null;
        let snowCm = 0;
        let rainMm = 0;
        if (quality !== null) {
            if (snowfallMode === 'model') {
                if (hours.snowfall[i] > 0) snowCm = hours.snowfall[i];
                else rainMm = hours.precipitation[i];
            } else if (quality === 'rain') {
                rainMm = hours.precipitation[i];
            } else {
                snowCm = hours.snowEstimate[i];
            }
            // The model's snow in an hour monkeysnow reckons is rain is a mix
            if (snowfallMode === 'model' && quality === 'rain' && snowCm > 0) quality = 'sleet/mix';
        }
        const isSnow = snowCm > 0;
        const amount = isSnow ? snowCm * (imperial ? CM_TO_INCHES : 1) : rainMm * (imperial ? MM_TO_INCHES : 1);
        const shown = quality !== null && amount > 0 ? quality : null;

        result.amounts.push(shown ? amount : 0);
        result.qualities.push(shown);
        result.isSnow.push(isSnow);
        SNOW_QUALITIES.forEach((q, k) => result.bars[k].push(q === shown ? amount : null));
    }
    return result;
}

function heightLinesOf(data: ResortData, elevation: ElevationLevel, units: UnitSystem): HeightLine[] {
    const toUnits = (m: number) => Math.round(units === 'imperial' ? m * M_TO_FT : m);
    const unit = units === 'imperial' ? 'ft' : 'm';
    // A Saved location has one elevation, standing in for all three bands
    if (data.bot.metadata.elevation === data.top.metadata.elevation) {
        const height = toUnits(data.mid.metadata.elevation);
        return [{ label: `${height} ${unit}`, height, picked: true }];
    }
    return (['bot', 'mid', 'top'] as const).map((level) => {
        const height = toUnits(data[level].metadata.elevation);
        return { label: `${BAND_NAMES[level]} ${height} ${unit}`, height, picked: level === elevation };
    });
}
