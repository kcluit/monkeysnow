Task: Implement Detailed Resort View with Multi-Model Open-Meteo Integration

Create a new "Resort Detail View" component/components that activates when a user clicks a resort card. This view must fetch data directly from the Open-Meteo API and display high-granularity weather charts.

1. Navigation & UI Integration:

Entry: Clicking any resort card should transition the app state to the "Individual Resort View."

Exit: Add a clickable snowflake icon to the right of the Monkeysnow logo (using secondary text styling) that returns the user to the main list view.

2. Utility Bar Transformations (Contextual UI): When in the Detailed View, modify the existing Utility Bar:

Resort Selection -> Model Selection: Replace "Select Resorts" with a "Choose Weather Models" dropdown. Include all models supported by Open-Meteo (ECMWF, ICON, GEM, etc.) plus "Median" and "Average" calculations.

View Presets -> Elevation Input: Replace Default/Full/Compact view buttons with a custom numeric input for Elevation.

Time Range -> Variable Selection: Replace the 3-day/7-day toggle with a "Weather Variables" selector.

3. Data Fetching & Visualization:

API Integration: Implement the fetchWeatherApi from the openmeteo package. Use the provided sample logic to handle timezone offsets and model indices.

Charting: Create a dynamic charting component (using the project's existing chart library) that renders Line/Bar graphs.

X-Axis: Hourly intervals.

Y-Axis: Variable values.

Formatting: Implement a strategy/config object to handle custom graph formatting (units, colors, chart types) for different variables like temperature_2m, snowfall, and wind_speed_10m.

4. Command Line & State:

Ensure the command line interface remains visible but gracefully handles/disables options that are non-functional in this specific view.

Technical Reference for API call:

TypeScript

// Use these params as the baseline for the fetch logic
import { fetchWeatherApi } from "openmeteo";



const params = {

latitude: 54.49092,

longitude: -128.96205,

hourly: ["temperature_2m", "precipitation", "rain", "snowfall", "snow_depth", "apparent_temperature", "surface_pressure", "cloud_cover_mid", "cloud_cover_high", "cloud_cover_low", "cloud_cover", "visibility", "evapotranspiration", "wind_speed_10m", "soil_temperature_0cm", "soil_moisture_0_to_1cm", "et0_fao_evapotranspiration"],

models: ["best_match", "ecmwf_ifs", "ecmwf_ifs025", "icon_eu", "metno_seamless", "metno_nordic", "knmi_seamless", "gem_hrdps_continental", "ncep_nbm_conus", "meteofrance_arpege_europe", "meteoswiss_icon_ch2", "kma_gdps"],

timezone: "Canada/Pacific",

forecast_days: 14,

elevation: 671,

};

const url = "https://api.open-meteo.com/v1/forecast";

const responses = await fetchWeatherApi(url, params);



// Process 1 location and 12 models

for (const response of responses) {

// Attributes for timezone and location

const latitude = response.latitude();

const longitude = response.longitude();

const elevation = response.elevation();

const timezone = response.timezone();

const timezoneAbbreviation = response.timezoneAbbreviation();

const utcOffsetSeconds = response.utcOffsetSeconds();

console.log(

`\nCoordinates: ${latitude}°N ${longitude}°E`,

`\nElevation: ${elevation}m asl`,

`\nTimezone: ${timezone} ${timezoneAbbreviation}`,

`\nTimezone difference to GMT+0: ${utcOffsetSeconds}s`,

`\nModel Nº: ${response.model()}`,

);

const hourly = response.hourly()!;

// Note: The order of weather variables in the URL query and the indices below need to match!

const weatherData = {

hourly: {

time: Array.from(

{ length: (Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval() }, 

(_, i) => new Date((Number(hourly.time()) + i * hourly.interval() + utcOffsetSeconds) * 1000)

),

temperature_2m: hourly.variables(0)!.valuesArray(),

precipitation: hourly.variables(1)!.valuesArray(),

rain: hourly.variables(2)!.valuesArray(),

snowfall: hourly.variables(3)!.valuesArray(),

snow_depth: hourly.variables(4)!.valuesArray(),

apparent_temperature: hourly.variables(5)!.valuesArray(),

surface_pressure: hourly.variables(6)!.valuesArray(),

cloud_cover_mid: hourly.variables(7)!.valuesArray(),

cloud_cover_high: hourly.variables(8)!.valuesArray(),

cloud_cover_low: hourly.variables(9)!.valuesArray(),

cloud_cover: hourly.variables(10)!.valuesArray(),

visibility: hourly.variables(11)!.valuesArray(),

evapotranspiration: hourly.variables(12)!.valuesArray(),

wind_speed_10m: hourly.variables(13)!.valuesArray(),

soil_temperature_0cm: hourly.variables(14)!.valuesArray(),

soil_moisture_0_to_1cm: hourly.variables(15)!.valuesArray(),

et0_fao_evapotranspiration: hourly.variables(16)!.valuesArray(),

},

};

// The 'weatherData' object now contains a simple structure, with arrays of datetimes and weather information

console.log("\nHourly data:\n", weatherData.hourly)

}

Please analyze the current folder structure to decide where to place the new components and how to update the global state to manage the view toggle.

Charting Library: I propose adding recharts to the project to handle the Line and Bar graphs. It is a standard, lightweight React charting library. Dependency Install: I will need to run npm install recharts (or npm install recharts @types/recharts if strictly typed).

