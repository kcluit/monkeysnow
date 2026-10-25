/**
 * What one Graph draws, in the visitor's units: each hour's precipitation as a bar in
 * its Snow quality colour, the temperature at the picked Elevation band, and the
 * Freezing level against the heights being forecast; and for its tooltip, the wind and
 * the Card model's weather.
 */

import { SNOW_QUALITIES, splitHour } from '../../utils/snowQuality';
import { getWeatherDescription, getWeatherEmoji } from '../../utils/weather';
import type { ElevationLevel, HourlyForecast, ResortData, SnowCaution, SnowfallEstimateMode, SnowQuality, UnitSystem } from '../../types';

const CM_TO_INCHES = 0.393701;
const MM_TO_INCHES = 0.0393701;
const M_TO_FT = 3.28084;
const KMH_TO_MPH = 0.621371;

/** The eight compass points a wind blows from */
const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export interface Weather {
    /** e.g. "Partly cloudy", in the words the cards use */
    text: string;
    emoji: string;
}

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
    /** km/h or mph; these three are all null on forecasts cached before they were kept */
    windSpeed: (number | null)[];
    /** The compass point the wind blows from, e.g. "SW" */
    windFrom: (string | null)[];
    /** The Card model's own weather, which can disagree with monkeysnow's Snow quality */
    weather: (Weather | null)[];
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

/**
 * An hour's Snow quality, null when nothing falls, and the monkeysnow estimate's snow under a Snow
 * caution. A forecast cached under an earlier SNOW_ESTIMATE_VERSION has only Cautious's, shown
 * under every caution until it is refetched.
 */
function hourEstimateOf(hours: HourlyForecast, i: number, caution: SnowCaution): { quality: SnowQuality | null; snowCm: number } {
    if (!hours.wetBulb) {
        const index = hours.quality?.[i] ?? -1;
        return { quality: index >= 0 ? SNOW_QUALITIES[index] : null, snowCm: hours.snowEstimate?.[i] ?? 0 };
    }
    const wetBulb = hours.wetBulb[i];
    if (!Number.isFinite(wetBulb) || !(hours.precipitation[i] > 0)) return { quality: null, snowCm: 0 };
    return splitHour(wetBulb, hours.precipitation[i], caution);
}

/** A Graph's data, or null for a forecast cached before hours were kept. */
export function graphDataOf(
    data: ResortData,
    elevation: ElevationLevel,
    snowfallMode: SnowfallEstimateMode,
    snowCaution: SnowCaution,
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
        windSpeed: [],
        windFrom: [],
        weather: [],
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

        const speed = hours.windSpeed?.[i] ?? NaN;
        const direction = hours.windDirection?.[i] ?? NaN;
        result.windSpeed.push(Number.isFinite(speed) ? (imperial ? speed * KMH_TO_MPH : speed) : null);
        result.windFrom.push(Number.isFinite(direction) ? COMPASS_POINTS[Math.round(direction / 45) % 8] : null);
        const code = hours.weatherCode?.[i] ?? 255;
        const text = code === 255 ? null : getWeatherDescription(code);
        result.weather.push(text ? { text, emoji: getWeatherEmoji(text) } : null);

        // Snow or rain, decided as the cards decide a Period's
        const estimate = hourEstimateOf(hours, i, snowCaution);
        let quality = estimate.quality;
        let snowCm = 0;
        let rainMm = 0;
        if (quality !== null) {
            if (snowfallMode === 'model') {
                if (hours.snowfall[i] > 0) snowCm = hours.snowfall[i];
                else rainMm = hours.precipitation[i];
            } else if (quality === 'rain' || quality === 'sleet/mix') {
                // A Sleet/Mix hour is drawn as all the water that fell, since one bar can't be part cm and part mm
                rainMm = hours.precipitation[i];
            } else {
                snowCm = estimate.snowCm;
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
