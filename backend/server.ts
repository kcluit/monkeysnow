import express from 'express';
import cors from 'cors';
import { fetchWeatherApi } from 'openmeteo';
import fs from 'fs';
import path from 'path';

// --- Types ---
interface LocationData {
    displayName: string;
    bot: number;
    mid: number;
    top: number;
    loc?: [number, number];
    country?: string;
}

// Hierarchy types for /hierarchy endpoint
interface ResortInfo {
    id: string;
    displayName: string;
}

interface ProvinceData {
    id: string;
    name: string;
    resorts: ResortInfo[];
}

interface CountryData {
    id: string;
    name: string;
    provinces: ProvinceData[];
}

interface ContinentData {
    id: string;
    name: string;
    countries: CountryData[];
}

interface LocationsMap {
    [key: string]: LocationData;
}

// --- Configuration ---
const PORT = 1234;
const UPDATE_INTERVAL_MS = 5 * 60 * 60 * 1000; // 5 Hours
const LOCATIONS_FILE = path.join(__dirname, 'locations.json');

// --- Global State ---
let weatherCache: Record<string, any> | null = null;
let lastSuccessfulUpdate: Date | null = null;

const app = express();

// Enable CORS for all origins (for local development)
app.use(cors());

// --- Helpers ---

/**
 * Converts a name to a URL-friendly slug ID.
 * E.g., "British Columbia" -> "british-columbia"
 */
const toSlugId = (name: string): string => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

/**
 * Builds the resort hierarchy from locations.json for the /hierarchy endpoint.
 * Transforms the nested structure into the frontend-expected format.
 */
const buildHierarchyFromLocations = (): ContinentData[] => {
    try {
        const rawData = fs.readFileSync(LOCATIONS_FILE, 'utf-8');
        const json = JSON.parse(rawData);
        const hierarchy: ContinentData[] = [];

        for (const [continentName, continentData] of Object.entries(json)) {
            const continent: ContinentData = {
                id: toSlugId(continentName),
                name: continentName,
                countries: []
            };

            for (const [countryName, countryData] of Object.entries(continentData as Record<string, any>)) {
                const country: CountryData = {
                    id: toSlugId(countryName),
                    name: countryName,
                    provinces: []
                };

                for (const [provinceName, provinceData] of Object.entries(countryData as Record<string, any>)) {
                    const province: ProvinceData = {
                        id: toSlugId(provinceName),
                        name: provinceName,
                        resorts: []
                    };

                    for (const [resortId, resortData] of Object.entries(provinceData as Record<string, any>)) {
                        // Check if this is actually a resort (has elevation data)
                        if (resortData && typeof resortData === 'object' && resortData.bot !== undefined) {
                            province.resorts.push({
                                id: resortId,
                                displayName: resortData.displayName || resortId.replace(/-/g, ' ')
                            });
                        }
                    }

                    if (province.resorts.length > 0) {
                        country.provinces.push(province);
                    }
                }

                if (country.provinces.length > 0) {
                    continent.countries.push(country);
                }
            }

            if (continent.countries.length > 0) {
                hierarchy.push(continent);
            }
        }

        return hierarchy;
    } catch (error) {
        console.error("Error building hierarchy from locations.json:", error);
        return [];
    }
};

const loadLocations = (): LocationsMap => {
    try {
        const rawData = fs.readFileSync(LOCATIONS_FILE, 'utf-8');
        const json = JSON.parse(rawData);
        const flattened: LocationsMap = {};

        // Traverse the hierarchy: Continent -> Country -> Province -> Resort
        for (const continentName in json) {
            const continentData = json[continentName];
            for (const countryName in continentData) {
                const countryData = continentData[countryName];
                for (const provinceName in countryData) {
                    const provinceData = countryData[provinceName];
                    for (const resortId in provinceData) {
                        const resortData = provinceData[resortId];
                        // Identify resort by presence of 'bot' (elevation) or 'loc'
                        if (resortData.bot !== undefined || resortData.loc) {
                            flattened[resortId] = {
                                ...resortData,
                                country: countryName
                            };
                        }
                    }
                }
            }
        }

        return flattened;
    } catch (error) {
        console.error("Error loading locations.json:", error);
        return {};
    }
};

// Math Helpers for Aggregation
const getAverage = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const getSum = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) : 0;
const getMax = (arr: number[]) => arr.length ? Math.max(...arr) : 0;
const getMin = (arr: number[]) => arr.length ? Math.min(...arr) : 0;
const getMedian = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const getMode = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const counts: Record<number, number> = {};
    let maxFreq = 0;
    let mode = arr[0];
    for (const num of arr) {
        counts[num] = (counts[num] || 0) + 1;
        if (counts[num] > maxFreq) { maxFreq = counts[num]; mode = num; }
        else if (counts[num] === maxFreq && num > mode) { mode = num; }
    }
    return mode;
};

// --- Snow Estimation (Crystal Habit-Based with Kuchera Ratios) ---
type SnowQuality = 'rain' | 'sleet/mix' | 'wet_snow' | 'powder' | 'dry_snow';

interface HourlySnowEstimate {
    snowCm: number;
    ratio: number;
    snowFraction: number;
    quality: SnowQuality;
}

/**
 * Calculates the Wet Bulb Temperature using the Stull (2011) approximation.
 */
function calculateWetBulb(tempC: number, rh: number): number {
    const safeRh = Math.max(0, Math.min(100, rh));
    const term1 = tempC * Math.atan(0.151977 * Math.pow(safeRh + 8.313659, 0.5));
    const term2 = Math.atan(tempC + safeRh);
    const term3 = Math.atan(safeRh - 1.676331);
    const term4 = 0.00391838 * Math.pow(safeRh, 1.5) * Math.atan(0.023101 * safeRh);
    const term5 = 4.686035;
    return term1 + term2 - term3 + term4 - term5;
}

/**
 * Calculates what percentage of precipitation actually contributes to accumulation.
 * - Warm (> 0.5C WB): 0% Snow (All rain)
 * - Transition (-2.0C to 0.5C WB): 10% - 100% Snow (Slush/Mix)
 * - Cold (< -2.0C WB): 100% Snow
 */
function calculateSnowFraction(wetBulbC: number): number {
    // Warm Zone: Pure Rain
    if (wetBulbC >= 0.5) return 0.0;
    // Slush Zone: Mostly rain, very little sticking
    if (wetBulbC >= -0.5) return 0.1;
    // Transition Zone (-2.0C to -0.5C): Linear interpolation 20% to 100%
    if (wetBulbC > -2.0) {
        const slope = (1.0 - 0.2) / (-2.0 - (-0.5));
        const fraction = 0.2 + slope * (wetBulbC - (-0.5));
        return Math.min(1.0, Math.max(0.0, fraction));
    }
    // Cold Zone: All Snow
    return 1.0;
}

/**
 * Determines the Snow-to-Liquid Ratio (SLR) based on Wet Bulb Temperature.
 * Uses Kuchera method with crystal habit-based ratios:
 * - 0 to -4: Thin Plates (Wet) -> 3:1
 * - -4 to -10: Needles/Columns (Avg) -> 7:1
 * - -10 to -12: Transition -> 10:1
 * - -12 to -18: Dendrites (DGZ - Fluffy) -> 15:1
 * - < -18: Plates/Columns (Dense) -> 12:1
 */
function getKucheraRatio(wetBulbC: number): number {
    // Warm/Rain Zone
    if (wetBulbC > 0) return 3;
    // Thin Plates / Dendritic fragments (0 to -4)
    if (wetBulbC > -4) return 3;
    // Needles / Columns (-4 to -10)
    if (wetBulbC > -10) return 7;
    // Transition Zone (-10 to -12)
    if (wetBulbC > -12) return 10;
    // Dendritic Growth Zone / Stellar Dendrites (-12 to -18)
    if (wetBulbC > -18) return 15;
    // Cold / Plates & Columns (< -18)
    return 12;
}

/**
 * Determines snow quality based on wet bulb temp and snow fraction.
 */
function getSnowQuality(wetBulbC: number, snowFraction: number): SnowQuality {
    if (snowFraction === 0) return 'rain';
    if (snowFraction < 0.5) return 'sleet/mix';
    if (wetBulbC > -4) return 'wet_snow';        // 0 to -4: Thin Plates/Wet
    if (wetBulbC <= -12 && wetBulbC >= -18) return 'powder'; // -12 to -18: DGZ/Fluffy
    return 'dry_snow'; // -4 to -12 and < -18
}

function estimateHourlySnow(tempC: number, humidity: number, precipMm: number): HourlySnowEstimate {
    const wetBulb = calculateWetBulb(tempC, humidity);
    const snowFraction = calculateSnowFraction(wetBulb);
    const ratio = getKucheraRatio(wetBulb);

    // Only multiply the "snow fraction" of precip by the ratio
    const effectiveSnowPrecipMm = precipMm * snowFraction;
    const snowMm = effectiveSnowPrecipMm * ratio;
    const snowCm = snowMm / 10;

    return {
        snowCm,
        ratio,
        snowFraction,
        quality: getSnowQuality(wetBulb, snowFraction)
    };
}

// --- Core Logic ---

// Country-to-model mapping
const COUNTRY_MODELS: Record<string, string> = {
    'Canada': 'gem_seamless',
    'USA': 'gfs_seamless'
};
const DEFAULT_MODEL = 'best_match';

const updateWeatherData = async () => {
    console.log(`[${new Date().toISOString()}] Starting optimized weather update (Country-Based Model Strategy)...`);
    const locations = loadLocations();

    // 1. Group resorts by country for separate API calls
    interface CountryBatch {
        mainLats: number[];
        mainLons: number[];
        mainElevs: number[];
        freezingLats: number[];
        freezingLons: number[];
        resortNames: string[];
    }

    const countryBatches: Record<string, CountryBatch> = {};

    for (const [name, data] of Object.entries(locations)) {
        if (!data.loc || data.loc.length < 2) continue;
        const [lat, lon] = data.loc;
        const country = data.country || 'Unknown';

        // Initialize batch for this country if needed
        if (!countryBatches[country]) {
            countryBatches[country] = {
                mainLats: [],
                mainLons: [],
                mainElevs: [],
                freezingLats: [],
                freezingLons: [],
                resortNames: []
            };
        }

        const batch = countryBatches[country];

        // Main data: 3 points per resort (Bot, Mid, Top)
        batch.mainLats.push(lat, lat, lat);
        batch.mainLons.push(lon, lon, lon);
        batch.mainElevs.push(data.bot, data.mid, data.top);

        // Freezing levels: 1 point per resort
        batch.freezingLats.push(lat);
        batch.freezingLons.push(lon);

        batch.resortNames.push(name);
    }

    const countries = Object.keys(countryBatches);
    if (countries.length === 0) return;

    const url = "https://api.open-meteo.com/v1/forecast";

    // 2. Fetch data for each country with appropriate model
    const countryResponses: Record<string, { main: any[], freezing: any[] }> = {};

    for (const country of countries) {
        const batch = countryBatches[country];
        const model = COUNTRY_MODELS[country] || DEFAULT_MODEL;

        console.log(`Fetching data for ${country} (${batch.resortNames.length} resorts) using model: ${model}...`);

        // Main data call
        const mainParams = {
            latitude: batch.mainLats,
            longitude: batch.mainLons,
            elevation: batch.mainElevs,
            hourly: [
                "wind_speed_10m",       // 0
                "wind_direction_10m",   // 1
                "temperature_2m",       // 2
                "relative_humidity_2m", // 3
                "precipitation",        // 4
                "weather_code",         // 5
                "surface_pressure",     // 6
                "rain",                 // 7
                "snowfall"              // 8
            ],
            models: model,
            forecast_days: 14,
            timezone: "auto"
        };

        // Freezing levels call
        const freezingParams = {
            latitude: batch.freezingLats,
            longitude: batch.freezingLons,
            models: 'gfs_seamless',
            hourly: ["freezing_level_height"],
            forecast_days: 14,
            timezone: "auto"
        };

        const mainResponses = await fetchWeatherApi(url, mainParams);
        const freezingResponses = await fetchWeatherApi(url, freezingParams);

        countryResponses[country] = {
            main: mainResponses,
            freezing: freezingResponses
        };
    }

    // 3. Processing Logic
    const structuredData: Record<string, any> = {};

    // Helper to process a single location's data into AM/PM/NIGHT chunks
    const processLocation = (
        mainResp: any,
        freezingResp: any
    ) => {
        const utcOffset = mainResp.utcOffsetSeconds();
        const hourly = mainResp.hourly()!;

        // Extract variables using the fixed order from mainParams
        // 0: ws, 1: wd, 2: temp, 3: rh, 4: precip, 5: code, 6: pressure
        const windSpeed = hourly.variables(0)!.valuesArray()!;
        const windDir = hourly.variables(1)!.valuesArray()!;
        const temp = hourly.variables(2)!.valuesArray()!;
        const hum = hourly.variables(3)!.valuesArray()!;
        const precip = hourly.variables(4)!.valuesArray()!;
        const code = hourly.variables(5)!.valuesArray()!;
        const pressure = hourly.variables(6)!.valuesArray()!;
        const rain = hourly.variables(7)!.valuesArray()!;
        const snowfall = hourly.variables(8)!.valuesArray()!;

        // Extract freezing levels from hourly data
        let freezingLevels: Float32Array | number[] = [];
        let freezingTimeStart = 0;
        let freezingInterval = 0;

        if (freezingResp) {
            const freezingHourly = freezingResp.hourly();
            if (freezingHourly) {
                freezingLevels = freezingHourly.variables(0)!.valuesArray()!;
                freezingTimeStart = Number(freezingHourly.time());
                freezingInterval = freezingHourly.interval();
            }
        }

        // --- Aggregation Loop ---
        const dailyChunks: Record<string, any> = {};
        const startTime = Number(hourly.time());
        const interval = hourly.interval();
        const length = (Number(hourly.timeEnd()) - Number(hourly.time())) / interval;

        // Group Hourly Data
        for (let i = 0; i < length; i++) {
            const timestamp = (startTime + i * interval + utcOffset) * 1000;
            const dateObj = new Date(timestamp);
            const dateKey = dateObj.toISOString().split('T')[0];
            const hour = dateObj.getUTCHours();

            let chunk = hour < 12 ? 'AM' : (hour < 18 ? 'PM' : 'NIGHT');

            if (!dailyChunks[dateKey]) {
                dailyChunks[dateKey] = {
                    AM: { hourly: [], freezingData: [] },
                    PM: { hourly: [], freezingData: [] },
                    NIGHT: { hourly: [], freezingData: [] }
                };
            }

            dailyChunks[dateKey][chunk].hourly.push({
                wind_speed: windSpeed[i],
                wind_direction: windDir[i],
                temperature: temp[i],
                humidity: hum[i],
                precipitation: precip[i],
                weather_code: code[i],
                surface_pressure: pressure[i],
                rain: rain[i],
                snowfall: snowfall[i]
            });
        }

        // Group Freezing Data (Hourly)
        if (freezingLevels.length > 0) {
            for (let i = 0; i < freezingLevels.length; i++) {
                const timestamp = (freezingTimeStart + i * freezingInterval + utcOffset) * 1000;
                const dateObj = new Date(timestamp);
                const dateKey = dateObj.toISOString().split('T')[0];
                const hour = dateObj.getUTCHours();
                let chunk = hour < 12 ? 'AM' : (hour < 18 ? 'PM' : 'NIGHT');

                if (dailyChunks[dateKey]) {
                    dailyChunks[dateKey][chunk].freezingData.push(freezingLevels[i]);
                }
            }
        }

        // Final Forecast Object
        const forecast: Record<string, any> = {};

        for (const [date, chunks] of Object.entries(dailyChunks)) {
            forecast[date] = {};
            ['AM', 'PM', 'NIGHT'].forEach(chunkName => {
                const data = chunks[chunkName];
                const hData = data.hourly;
                const fData = data.freezingData;

                if (!hData.length) {
                    forecast[date][chunkName] = null;
                    return;
                }

                // Calculate snow estimates from hourly data
                let totalSnowEstimateCm = 0;
                const ratios: number[] = [];
                const qualities: SnowQuality[] = [];

                for (const hourData of hData) {
                    const estimate = estimateHourlySnow(
                        hourData.temperature,
                        hourData.humidity,
                        hourData.precipitation
                    );
                    totalSnowEstimateCm += estimate.snowCm;
                    if (estimate.ratio > 0) {
                        ratios.push(estimate.ratio);
                    }
                    // Only track quality for hours with precipitation
                    if (hourData.precipitation > 0) {
                        qualities.push(estimate.quality);
                    }
                }

                // Determine worst snow quality for the period (from hours with precip)
                // Ranking from worst to best: rain -> sleet/mix -> wet_snow -> dry_snow -> powder
                const qualityRank: Record<SnowQuality, number> = {
                    'rain': 0, 'sleet/mix': 1, 'wet_snow': 2, 'dry_snow': 3, 'powder': 4
                };
                let worstQuality: SnowQuality | null = null;
                for (const q of qualities) {
                    if (worstQuality === null || qualityRank[q] < qualityRank[worstQuality]) {
                        worstQuality = q;
                    }
                }

                // Average ratio (only from hours with snow)
                const avgRatio = ratios.length > 0 ? getAverage(ratios) : 0;

                // Aggregate values for the UI
                // REMOVED Math.round() to preserve decimal precision
                forecast[date][chunkName] = {
                    temperature_max: parseFloat(getMax(hData.map((d: any) => d.temperature)).toFixed(2)),
                    temperature_min: parseFloat(getMin(hData.map((d: any) => d.temperature)).toFixed(2)),
                    temperature_avg: parseFloat(getAverage(hData.map((d: any) => d.temperature)).toFixed(2)),
                    temperature_median: parseFloat(getMedian(hData.map((d: any) => d.temperature)).toFixed(2)),
                    wind_speed: parseFloat(getAverage(hData.map((d: any) => d.wind_speed)).toFixed(2)),
                    wind_direction: Math.round(getMode(hData.map((d: any) => d.wind_direction))), // Direction stays integer (degrees)
                    relative_humidity: parseFloat(getAverage(hData.map((d: any) => d.humidity)).toFixed(2)),
                    precipitation_total: parseFloat(getSum(hData.map((d: any) => d.precipitation)).toFixed(4)), // Increased precision
                    rain_total: parseFloat(getSum(hData.map((d: any) => d.rain)).toFixed(4)),
                    snowfall_total: parseFloat(getSum(hData.map((d: any) => d.snowfall)).toFixed(4)),
                    weather_code: getMode(hData.map((d: any) => d.weather_code)),
                    surface_pressure: parseFloat(getAverage(hData.map((d: any) => d.surface_pressure)).toFixed(2)),
                    freezing_level: fData.length > 0 ? parseFloat(getMax(fData).toFixed(2)) : null,
                    // Snow estimation fields
                    snowfall_estimate: parseFloat(totalSnowEstimateCm.toFixed(4)),
                    snow_to_liquid_ratio: parseFloat(avgRatio.toFixed(2)),
                    snow_quality: worstQuality
                };
            });
        }

        return forecast;
    };

    // --- Main Loop ---
    // Process each country's responses
    for (const country of countries) {
        const batch = countryBatches[country];
        const responses = countryResponses[country];

        for (let i = 0; i < batch.resortNames.length; i++) {
            const resortName = batch.resortNames[i];
            const resortData = locations[resortName];
            const [lat, lon] = resortData.loc!;

            // Freezing response: 1 per resort
            const freezingResp = responses.freezing[i];

            // Main responses: 3 per resort (Bot, Mid, Top)
            const idxBot = i * 3;
            const idxMid = i * 3 + 1;
            const idxTop = i * 3 + 2;

            const respBot = responses.main[idxBot];
            const respMid = responses.main[idxMid];
            const respTop = responses.main[idxTop];

            // Process each level
            const forecastBot = processLocation(respBot, freezingResp);
            const forecastMid = processLocation(respMid, freezingResp);
            const forecastTop = processLocation(respTop, freezingResp);

            structuredData[resortName] = {
                bot: {
                    metadata: { elevation: resortData.bot, lat, lon },
                    forecast: forecastBot
                },
                mid: {
                    metadata: { elevation: resortData.mid, lat, lon },
                    forecast: forecastMid
                },
                top: {
                    metadata: { elevation: resortData.top, lat, lon },
                    forecast: forecastTop
                }
            };
        }
    }

    weatherCache = structuredData;
    lastSuccessfulUpdate = new Date();
    console.log(`[${lastSuccessfulUpdate.toISOString()}] Weather update complete.`);
};

// --- Routes/Start ---
let isUpdating = false;

const startWeatherUpdates = async () => {
    try { await updateWeatherData(); } catch (e) { console.error("Init failed", e); }
    setInterval(async () => {
        if (isUpdating) {
            console.warn('Previous update still in progress, skipping...');
            return;
        }
        isUpdating = true;
        try {
            await updateWeatherData();
        } catch (e) {
            console.error("Update failed", e);
        } finally {
            isUpdating = false;
        }
    }, UPDATE_INTERVAL_MS);
};

app.get('/hierarchy', (req, res) => {
    const hierarchy = buildHierarchyFromLocations();
    res.json({ continents: hierarchy });
});

app.get('/all', (req, res) => {
    if (!weatherCache) return res.status(503).json({ error: "Initializing..." });
    res.json({ updatedAt: lastSuccessfulUpdate, data: weatherCache });
});

app.get('/:resortName', (req, res) => {
    if (!weatherCache) return res.status(503).json({ error: "Initializing..." });
    const data = weatherCache[req.params.resortName];
    if (!data) return res.status(404).json({ error: "Resort not found" });
    res.json({ updatedAt: lastSuccessfulUpdate, data });
});

app.listen(PORT, () => {
    console.log(`monkeysnow Backend running on http://localhost:${PORT}`);
    startWeatherUpdates();
});