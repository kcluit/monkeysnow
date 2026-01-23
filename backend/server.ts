import express from 'express';
import cors from 'cors';
import { fetchWeatherApi } from 'openmeteo';
import fs from 'fs';
import path from 'path';

// --- Types ---
interface LocationData {
    bot: number;
    mid: number;
    top: number;
    loc?: [number, number];
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
const loadLocations = (): LocationsMap => {
    try {
        const rawData = fs.readFileSync(LOCATIONS_FILE, 'utf-8');
        const json = JSON.parse(rawData);
        const flattened: LocationsMap = {};

        const traverse = (node: any) => {
            for (const key in node) {
                const value = node[key];
                // Identify resort by presence of 'bot' (elevation) or 'loc'
                if (value.bot !== undefined || value.loc) {
                    flattened[key] = value;
                } else if (typeof value === 'object' && value !== null) {
                    traverse(value);
                }
            }
        };

        traverse(json);
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

// --- Core Logic ---

const updateWeatherData = async () => {
    console.log(`[${new Date().toISOString()}] Starting optimized weather update (2-Call Strategy)...`);
    const locations = loadLocations();

    // 1. Prepare Lists
    // We will flatten Bot, Mid, Top into a single list for the Main API call
    const mainLats: number[] = [];
    const mainLons: number[] = [];
    const mainElevs: number[] = [];

    // We maintain a map to know which result belongs to which resort/level
    const resultMap: { name: string, level: 'bot' | 'mid' | 'top' }[] = [];

    // For Freezing levels, we only need 1 call per resort (using Bot coords)
    const freezingLats: number[] = [];
    const freezingLons: number[] = [];

    for (const [name, data] of Object.entries(locations)) {
        if (!data.loc || data.loc.length < 2) continue;
        const [lat, lon] = data.loc;

        // -- Prepare Main Call (3 indices per resort) --

        // Bot
        mainLats.push(lat); mainLons.push(lon); mainElevs.push(data.bot);
        resultMap.push({ name, level: 'bot' });

        // Mid
        mainLats.push(lat); mainLons.push(lon); mainElevs.push(data.mid);
        resultMap.push({ name, level: 'mid' });

        // Top
        mainLats.push(lat); mainLons.push(lon); mainElevs.push(data.top);
        resultMap.push({ name, level: 'top' });

        // -- Prepare Freezing Call (1 index per resort) --
        freezingLats.push(lat); freezingLons.push(lon);
    }

    if (mainLats.length === 0) return;

    const url = "https://api.open-meteo.com/v1/forecast";

    // 2. Define Parameters

    // Call 1: Main Data (Wind, Temp, Humidity, Precip, Code, Pressure)
    // Note: Order matches the user's snippet requirement for processing indices
    const mainParams = {
        latitude: mainLats,
        longitude: mainLons,
        elevation: mainElevs,
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
        models: "best_match",
        forecast_days: 14,
        timezone: "auto"
    };

    // Call 2: Freezing Levels (No elevation needed, atmospheric property)
    const freezingParams = {
        latitude: freezingLats,
        longitude: freezingLons,
        models: "best_match",
        minutely_15: "freezing_level_height",
        forecast_days: 14,
        timezone: "auto"
    };

    console.log(`Fetching Main data for ${mainLats.length} points...`);
    const mainResponses = await fetchWeatherApi(url, mainParams);

    console.log(`Fetching Freezing levels for ${freezingLats.length} resorts...`);
    const freezingResponses = await fetchWeatherApi(url, freezingParams);

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

        // Extract freezing levels
        let freezingLevels: Float32Array | number[] = [];
        let freezingTimeStart = 0;
        let freezingInterval = 0;

        if (freezingResp) {
            const min15 = freezingResp.minutely15();
            if (min15) {
                freezingLevels = min15.variables(0)!.valuesArray()!;
                freezingTimeStart = Number(min15.time());
                freezingInterval = min15.interval();
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
                    AM: { hourly: [], minutely: [] },
                    PM: { hourly: [], minutely: [] },
                    NIGHT: { hourly: [], minutely: [] }
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

        // Group Freezing Data (Minutely)
        if (freezingLevels.length > 0) {
            for (let i = 0; i < freezingLevels.length; i++) {
                const timestamp = (freezingTimeStart + i * freezingInterval + utcOffset) * 1000;
                const dateObj = new Date(timestamp);
                const dateKey = dateObj.toISOString().split('T')[0];
                const hour = dateObj.getUTCHours();
                let chunk = hour < 12 ? 'AM' : (hour < 18 ? 'PM' : 'NIGHT');

                if (dailyChunks[dateKey]) {
                    dailyChunks[dateKey][chunk].minutely.push(freezingLevels[i]);
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
                const mData = data.minutely;

                if (!hData.length) {
                    forecast[date][chunkName] = null;
                    return;
                }

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
                    freezing_level: mData.length > 0 ? parseFloat(getMax(mData).toFixed(2)) : null
                };
            });
        }

        return forecast;
    };

    // --- Main Loop ---
    // We iterate by resort. There are N resorts.
    // mainResponses has N * 3 items.
    // freezingResponses has N items.

    // We assume the order matches the insertion order (Bot, Mid, Top for each resort)
    const resorts = Object.keys(locations);

    for (let i = 0; i < resorts.length; i++) {
        const resortName = resorts[i];
        const freezingResp = freezingResponses[i];

        // Indices in mainResponses
        const idxBot = i * 3;
        const idxMid = i * 3 + 1;
        const idxTop = i * 3 + 2;

        const respBot = mainResponses[idxBot];
        const respMid = mainResponses[idxMid];
        const respTop = mainResponses[idxTop];

        // Process each level
        const forecastBot = processLocation(respBot, freezingResp);
        const forecastMid = processLocation(respMid, freezingResp);
        const forecastTop = processLocation(respTop, freezingResp);

        structuredData[resortName] = {
            bot: {
                metadata: { elevation: respBot.elevation(), lat: respBot.latitude(), lon: respBot.longitude() },
                forecast: forecastBot
            },
            mid: {
                metadata: { elevation: respMid.elevation(), lat: respMid.latitude(), lon: respMid.longitude() },
                forecast: forecastMid
            },
            top: {
                metadata: { elevation: respTop.elevation(), lat: respTop.latitude(), lon: respTop.longitude() },
                forecast: forecastTop
            }
        };
    }

    weatherCache = structuredData;
    lastSuccessfulUpdate = new Date();
    console.log(`[${lastSuccessfulUpdate.toISOString()}] Weather update complete.`);
};

// --- Routes/Start ---
const startWeatherUpdates = async () => {
    try { await updateWeatherData(); } catch (e) { console.error("Init failed", e); }
    setInterval(async () => {
        try { await updateWeatherData(); } catch (e) { console.error("Update failed", e); }
    }, UPDATE_INTERVAL_MS);
};

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