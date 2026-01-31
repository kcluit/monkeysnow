import { fetchWeatherApi } from 'openmeteo';

const run = async () => {
    // Revelstoke Configuration
    const lat = 50.969393;
    const lon = -118.126436;
    
    // API Parameters
    const params = {
        latitude: [lat],
        longitude: [lon],
        models: "best_match",
        minutely_15: "freezing_level_height",
        forecast_days: 7, // Just get today/tomorrow for a quick check
        timezone: "auto"
    };

    const url = "https://api.open-meteo.com/v1/forecast";

    try {
        console.log(`Fetching 15-minute freezing levels for Revelstoke (${lat}, ${lon})...`);
        const responses = await fetchWeatherApi(url, params);
        
        // Process the first (and only) location response
        const response = responses[0];
        const utcOffsetSeconds = response.utcOffsetSeconds();
        const minutely15 = response.minutely15();

        if (!minutely15) {
            console.error("No 15-minute data found!");
            return;
        }

        // Helper to retrieve data arrays
        const times = minutely15.time();
        const timeInterval = minutely15.interval();
        const freezingLevels = minutely15.variables(0)!.valuesArray()!;

        console.log("\n--- Revelstoke Freezing Levels (15 min intervals) ---");
        console.log("Time (Local)          | Freezing Level (m)");
        console.log("------------------------------------------");

        // Loop through data
        for (let i = 0; i < freezingLevels.length; i++) {
            const t = Number(times) + i * timeInterval + utcOffsetSeconds;
            const date = new Date(t * 1000);
            
            // Format date nicely (YYYY-MM-DD HH:MM)
            const timeString = date.toISOString().replace('T', ' ').substring(0, 16);
            const level = freezingLevels[i].toFixed(1);

            console.log(`${timeString}   | ${level} m`);
        }

    } catch (error) {
        console.error("Error fetching data:", error);
    }
};

run();