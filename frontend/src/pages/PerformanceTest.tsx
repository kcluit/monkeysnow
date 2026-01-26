/**
 * Performance Test Page
 *
 * A dedicated page for testing ECharts performance with mock data.
 * Uses all available weather variables to stress test the charts.
 * Enable FPS counter via command palette (Ctrl+K) to monitor performance.
 */

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { DetailChartGrid } from '../components/detail/DetailChartGrid';
import type { WeatherModel, WeatherVariable, HourlyDataPoint, AggregationType } from '../types/openMeteo';
import type { UnitSystem } from '../types';
import { DEFAULT_MODELS } from '../utils/chartConfigurations';

// All available weather variables for maximum stress testing
const ALL_VARIABLES: WeatherVariable[] = [
    'temperature_2m',
    'apparent_temperature',
    'precipitation',
    'rain',
    'snowfall',
    'snow_depth',
    'wind_speed_10m',
    'wind_gusts_10m',
    'wind_direction_10m',
    'relative_humidity_2m',
    'surface_pressure',
    'cloud_cover',
    'cloud_cover_low',
    'cloud_cover_mid',
    'cloud_cover_high',
    'visibility',
    'freezing_level_height',
    'weather_code',
];

// All weather models to include (use many for stress test)
const STRESS_TEST_MODELS: WeatherModel[] = [
    'ecmwf_ifs',
    'icon_global',
    'gfs_global',
    'gem_global',
    'meteofrance_arpege_world',
    'metno_nordic',
    'jma_gsm',
    'ukmo_global_deterministic_10km',
];

// Default aggregation colors
const DEFAULT_AGGREGATION_COLORS: Record<AggregationType, string> = {
    median: '#a855f7',
    mean: '#ec4899',
};

/**
 * Generate realistic mock weather data for testing.
 * Creates hourly data points for 14 days (336 hours).
 */
function generateMockData(
    models: WeatherModel[],
    variables: WeatherVariable[],
    hourCount: number = 336
): Map<WeatherModel, HourlyDataPoint[]> {
    const data = new Map<WeatherModel, HourlyDataPoint[]>();
    const now = new Date();

    for (const model of models) {
        const hourlyData: HourlyDataPoint[] = [];
        // Add slight model-specific variation
        const modelOffset = models.indexOf(model) * 0.5;

        for (let h = 0; h < hourCount; h++) {
            const time = new Date(now.getTime() + h * 60 * 60 * 1000);
            const dayFraction = h / 24;

            // Create realistic varying data for each variable
            const point: HourlyDataPoint = {
                time,
                timestamp: time.getTime(),
            };

            // Temperature: oscillates between -5 and 10 with daily cycle
            point.temperature_2m = 2 + 8 * Math.sin(dayFraction * Math.PI * 2) + Math.random() * 3 + modelOffset;
            point.apparent_temperature = (point.temperature_2m as number) - 3 - Math.random() * 2;

            // Precipitation (spiky, mostly 0)
            const precipChance = Math.random();
            point.precipitation = precipChance > 0.7 ? Math.random() * 5 : 0;
            point.rain = (point.temperature_2m as number) > 2 ? (point.precipitation as number) * 0.8 : 0;
            point.snowfall = (point.temperature_2m as number) <= 2 ? (point.precipitation as number) * 1.5 : 0;
            point.snow_depth = Math.max(0, 50 + (point.snowfall as number) * 0.5 - Math.random() * 2);

            // Wind
            point.wind_speed_10m = 10 + Math.random() * 30 + modelOffset;
            point.wind_gusts_10m = (point.wind_speed_10m as number) * (1.2 + Math.random() * 0.5);
            point.wind_direction_10m = Math.random() * 360;

            // Humidity and pressure
            point.relative_humidity_2m = 60 + Math.random() * 30;
            point.surface_pressure = 1013 + Math.sin(dayFraction * Math.PI) * 10 + Math.random() * 5;

            // Cloud cover
            point.cloud_cover = Math.random() * 100;
            point.cloud_cover_low = Math.random() * 80;
            point.cloud_cover_mid = Math.random() * 70;
            point.cloud_cover_high = Math.random() * 60;

            // Visibility (in meters)
            point.visibility = 5000 + Math.random() * 15000;

            // Freezing level (in meters)
            point.freezing_level_height = 1500 + Math.sin(dayFraction * Math.PI * 2) * 500 + Math.random() * 200 + modelOffset * 100;

            // Weather code (0-100 range)
            point.weather_code = Math.floor(Math.random() * 100);

            hourlyData.push(point);
        }

        data.set(model, hourlyData);
    }

    return data;
}

/**
 * FPS monitoring hook for more accurate measurement
 */
function useAccurateFPS() {
    const [fps, setFps] = useState(0);
    const [avgFps, setAvgFps] = useState(0);
    const [minFps, setMinFps] = useState(Infinity);
    const fpsHistory = useRef<number[]>([]);
    const frameCount = useRef(0);
    const lastTime = useRef(performance.now());

    useEffect(() => {
        let animationId: number;

        const measureFps = (currentTime: number) => {
            frameCount.current++;
            const elapsed = currentTime - lastTime.current;

            // Update every 100ms for smoother display
            if (elapsed >= 100) {
                const currentFps = Math.round((frameCount.current / elapsed) * 1000);
                setFps(currentFps);

                // Track history for stats
                fpsHistory.current.push(currentFps);
                if (fpsHistory.current.length > 100) {
                    fpsHistory.current.shift();
                }

                // Calculate average
                const avg = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length;
                setAvgFps(Math.round(avg));

                // Track minimum
                setMinFps(prev => Math.min(prev, currentFps));

                frameCount.current = 0;
                lastTime.current = currentTime;
            }

            animationId = requestAnimationFrame(measureFps);
        };

        animationId = requestAnimationFrame(measureFps);

        return () => cancelAnimationFrame(animationId);
    }, []);

    const resetStats = useCallback(() => {
        fpsHistory.current = [];
        setMinFps(Infinity);
        setAvgFps(0);
    }, []);

    return { fps, avgFps, minFps: minFps === Infinity ? 0 : minFps, resetStats };
}

export function PerformanceTest(): JSX.Element {
    // State
    const [selectedModels, setSelectedModels] = useState<WeatherModel[]>(STRESS_TEST_MODELS);
    const [selectedVariables, setSelectedVariables] = useState<WeatherVariable[]>(ALL_VARIABLES);
    const [selectedAggregations] = useState<AggregationType[]>(['median']);
    const [unitSystem] = useState<UnitSystem>('metric');
    const [isChartLocked] = useState(true);
    const [hourCount, setHourCount] = useState(336);

    // FPS monitoring
    const { fps, avgFps, minFps, resetStats } = useAccurateFPS();

    // Generate mock data
    const mockData = useMemo(
        () => generateMockData(selectedModels, selectedVariables, hourCount),
        [selectedModels, selectedVariables, hourCount]
    );

    // Mock location
    const location = useMemo(() => ({
        baseElevation: 1500,
        midElevation: 2000,
        topElevation: 2500,
    }), []);

    // Mock timezone info
    const timezoneInfo = useMemo(() => ({
        timezone: 'America/Vancouver',
        timezoneAbbreviation: 'PST',
    }), []);

    // Toggle variable
    const toggleVariable = useCallback((variable: WeatherVariable) => {
        setSelectedVariables(prev => {
            if (prev.includes(variable)) {
                return prev.filter(v => v !== variable);
            }
            return [...prev, variable];
        });
    }, []);

    // Get FPS color based on value
    const getFpsColor = (value: number) => {
        if (value >= 55) return 'text-green-500';
        if (value >= 40) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="min-h-screen p-6 bg-theme-background">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-theme-textPrimary">ECharts Performance Test</h1>
                    <p className="text-theme-textSecondary mt-1">
                        Stress test with {selectedModels.length} models, {selectedVariables.length} variables, {hourCount} data points each
                    </p>
                </div>

                {/* FPS Monitor - Fixed position */}
                <div className="fixed top-4 right-4 z-50 bg-black/80 text-white p-4 rounded-lg shadow-xl font-mono">
                    <div className="text-sm mb-2">Performance Monitor</div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className={`text-3xl font-bold ${getFpsColor(fps)}`}>{fps}</div>
                            <div className="text-xs text-gray-400">Current FPS</div>
                        </div>
                        <div>
                            <div className={`text-3xl font-bold ${getFpsColor(avgFps)}`}>{avgFps}</div>
                            <div className="text-xs text-gray-400">Avg FPS</div>
                        </div>
                        <div>
                            <div className={`text-3xl font-bold ${getFpsColor(minFps)}`}>{minFps}</div>
                            <div className="text-xs text-gray-400">Min FPS</div>
                        </div>
                    </div>
                    <button
                        onClick={resetStats}
                        className="mt-3 w-full text-xs bg-gray-700 hover:bg-gray-600 py-1 px-2 rounded"
                    >
                        Reset Stats
                    </button>
                </div>

                {/* Controls */}
                <div className="mb-6 p-4 resort-card rounded-xl">
                    <div className="flex flex-wrap gap-4 items-center">
                        {/* Model count */}
                        <div>
                            <label className="text-sm text-theme-textSecondary block mb-1">Models</label>
                            <select
                                value={selectedModels.length}
                                onChange={(e) => {
                                    const count = parseInt(e.target.value);
                                    setSelectedModels(STRESS_TEST_MODELS.slice(0, count));
                                    resetStats();
                                }}
                                className="bg-theme-cardBg border border-theme-border rounded px-3 py-1.5 text-theme-textPrimary"
                            >
                                {[1, 2, 4, 6, 8].map(n => (
                                    <option key={n} value={n}>{n} models</option>
                                ))}
                            </select>
                        </div>

                        {/* Variable count */}
                        <div>
                            <label className="text-sm text-theme-textSecondary block mb-1">Variables</label>
                            <select
                                value={selectedVariables.length}
                                onChange={(e) => {
                                    const count = parseInt(e.target.value);
                                    setSelectedVariables(ALL_VARIABLES.slice(0, count));
                                    resetStats();
                                }}
                                className="bg-theme-cardBg border border-theme-border rounded px-3 py-1.5 text-theme-textPrimary"
                            >
                                {[1, 3, 5, 7, 10, 14, 18].map(n => (
                                    <option key={n} value={n}>{n} variables</option>
                                ))}
                            </select>
                        </div>

                        {/* Data points */}
                        <div>
                            <label className="text-sm text-theme-textSecondary block mb-1">Hours</label>
                            <select
                                value={hourCount}
                                onChange={(e) => {
                                    setHourCount(parseInt(e.target.value));
                                    resetStats();
                                }}
                                className="bg-theme-cardBg border border-theme-border rounded px-3 py-1.5 text-theme-textPrimary"
                            >
                                {[72, 168, 336, 504, 672].map(n => (
                                    <option key={n} value={n}>{n} hours ({Math.round(n/24)} days)</option>
                                ))}
                            </select>
                        </div>

                        {/* Instructions */}
                        <div className="ml-auto text-sm text-theme-textSecondary">
                            <p>Move mouse vigorously over charts to test hover performance.</p>
                            <p>Target: consistent 50-60 FPS during interaction.</p>
                        </div>
                    </div>
                </div>

                {/* Chart Grid */}
                <DetailChartGrid
                    data={mockData}
                    selectedModels={selectedModels}
                    selectedVariables={selectedVariables}
                    selectedAggregations={selectedAggregations}
                    aggregationColors={DEFAULT_AGGREGATION_COLORS}
                    unitSystem={unitSystem}
                    timezoneInfo={timezoneInfo}
                    isChartLocked={isChartLocked}
                    onToggleVariable={toggleVariable}
                    location={location}
                    currentElevation={2000}
                />
            </div>
        </div>
    );
}
